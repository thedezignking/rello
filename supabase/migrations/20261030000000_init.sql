-- Rello — initial schema (Phase 1)
-- Every table is owned by a user and locked down with RLS.
-- Guests are Supabase anonymous users, so they get the same rows and rules.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- jobs — a pasted job description, kept with the tailored copy it produced
-- ---------------------------------------------------------------------------
create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text,
  company     text,
  description text not null check (char_length(description) between 1 and 20000),
  analysis    jsonb,
  created_at  timestamptz not null default now()
);
create index jobs_user_idx on public.jobs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- resumes — many per user; tailored copies point back at their source
-- ---------------------------------------------------------------------------
create table public.resumes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text not null default 'Untitled resume' check (char_length(title) <= 200),
  template_id      text not null default 'classic',
  content          jsonb not null default '{}'::jsonb,
  schema_version   integer not null default 1,
  revision         integer not null default 1,
  source_resume_id uuid references public.resumes (id) on delete set null,
  job_id           uuid references public.jobs (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index resumes_user_updated_idx on public.resumes (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- tailor_sessions — the line-by-line suggestions for one tailored copy
-- ---------------------------------------------------------------------------
create table public.tailor_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  resume_id   uuid not null references public.resumes (id) on delete cascade,
  job_id      uuid not null references public.jobs (id) on delete cascade,
  status      text not null default 'processing'
              check (status in ('processing', 'ready', 'failed')),
  suggestions jsonb not null default '[]'::jsonb,
  match       jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index tailor_sessions_resume_idx on public.tailor_sessions (resume_id);

-- ---------------------------------------------------------------------------
-- ai_usage — one row per AI call; backs the daily free cap
-- ---------------------------------------------------------------------------
create table public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  op            text not null,
  model         text,
  input_tokens  integer,
  output_tokens integer,
  ok            boolean not null default true,
  created_at    timestamptz not null default now()
);
create index ai_usage_user_day_idx on public.ai_usage (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at + revision bookkeeping
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.bump_resume_revision()
returns trigger language plpgsql as $$
begin
  if new.content is distinct from old.content then
    new.revision := old.revision + 1;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger tailor_sessions_touch before update on public.tailor_sessions
  for each row execute function public.touch_updated_at();
create trigger resumes_revision before update on public.resumes
  for each row execute function public.bump_resume_revision();

-- ---------------------------------------------------------------------------
-- Create a profile for every new auth user (guest or real)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email/name in sync when a guest links a real identity.
create or replace function public.handle_user_updated()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set email = new.email,
         display_name = coalesce(
           display_name,
           new.raw_user_meta_data ->> 'full_name',
           new.raw_user_meta_data ->> 'name'
         )
   where id = new.id;
  return new;
end $$;

create trigger on_auth_user_updated after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_user_updated();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.jobs            enable row level security;
alter table public.resumes         enable row level security;
alter table public.tailor_sessions enable row level security;
alter table public.ai_usage        enable row level security;

create policy "own profile" on public.profiles
  for select using (id = (select auth.uid()));
create policy "update own profile" on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own jobs" on public.jobs
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own resumes" on public.resumes
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own tailor sessions" on public.tailor_sessions
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Usage rows are written by the server; users may only read their own.
create policy "read own usage" on public.ai_usage
  for select using (user_id = (select auth.uid()));
