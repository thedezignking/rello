-- Server-owned accounting. Clients can read their own records, never mint or spend credits.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.credit_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  reserved integer not null default 0 check (reserved >= 0),
  signup_granted_at timestamptz,
  updated_at timestamptz not null default now()
);
-- A negative balance is possible only after reversal of an already-spent purchase.
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (reason in ('signup','purchase','tailor','reversal')),
  reference text not null,
  created_at timestamptz not null default now(),
  unique(user_id, reference)
);
create index credit_ledger_user_created_idx on public.credit_ledger(user_id, created_at desc);

create table public.credit_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  reference text not null unique,
  pack_id text not null check (pack_id in ('starter','job_search')),
  amount integer not null check (amount > 0),
  currency text not null check (currency in ('USD','NGN')),
  credits integer not null check ((pack_id='starter' and credits=5) or (pack_id='job_search' and credits=20)),
  status text not null default 'pending' check (status in ('pending','paid','failed','reversed')),
  provider_transaction_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index credit_orders_user_created_idx on public.credit_orders(user_id, created_at desc);

create table public.credit_tailoring_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_resume_id uuid references public.resumes(id) on delete set null,
  source_content jsonb not null,
  template_id text not null,
  input_hash text not null,
  description text not null,
  title text not null default '',
  company text not null default '',
  status text not null default 'running' check (status in ('running','ready','failed')),
  credit_held boolean not null default true,
  charged boolean not null default false,
  result_resume_id uuid references public.resumes(id) on delete set null,
  result jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 minutes',
  finished_at timestamptz
);
create unique index credit_tailoring_live_hash_idx on public.credit_tailoring_runs(user_id,input_hash) where status in ('running','ready');
create index credit_tailoring_user_created_idx on public.credit_tailoring_runs(user_id,created_at desc);
create index credit_tailoring_result_idx on public.credit_tailoring_runs(result_resume_id);
create index credit_tailoring_source_idx on public.credit_tailoring_runs(source_resume_id);

create table public.credit_retry_allowances (
  resume_id uuid primary key references public.resumes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  used integer not null default 0 check (used >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  check (used + reserved <= 10)
);
create index credit_retry_allowances_user_idx on public.credit_retry_allowances(user_id);
create table public.credit_retries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.credit_retry_allowances(resume_id) on delete cascade,
  input_hash text not null,
  status text not null default 'running' check (status in ('running','ready','failed')),
  result jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 minutes'
);
create index credit_retries_user_created_idx on public.credit_retries(user_id,created_at desc);
create index credit_retries_resume_idx on public.credit_retries(resume_id);

alter table public.credit_accounts enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.credit_orders enable row level security;
alter table public.credit_tailoring_runs enable row level security;
alter table public.credit_retry_allowances enable row level security;
alter table public.credit_retries enable row level security;
revoke all on public.credit_accounts, public.credit_ledger, public.credit_orders, public.credit_tailoring_runs, public.credit_retry_allowances, public.credit_retries from public, anon, authenticated;
grant select on public.credit_accounts, public.credit_ledger, public.credit_orders, public.credit_tailoring_runs, public.credit_retry_allowances, public.credit_retries to authenticated;
grant all on public.credit_accounts, public.credit_ledger, public.credit_orders, public.credit_tailoring_runs, public.credit_retry_allowances, public.credit_retries to service_role;
create policy "read own credits" on public.credit_accounts for select to authenticated using (user_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') is distinct from 'true');
create policy "read own credit history" on public.credit_ledger for select to authenticated using (user_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') is distinct from 'true');
create policy "read own purchases" on public.credit_orders for select to authenticated using (user_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') is distinct from 'true');
create policy "read own generation runs" on public.credit_tailoring_runs for select to authenticated using (user_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') is distinct from 'true');
create policy "read own retry allowance" on public.credit_retry_allowances for select to authenticated using (user_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') is distinct from 'true');
create policy "read own retries" on public.credit_retries for select to authenticated using (user_id = (select auth.uid()) and (select auth.jwt()->>'is_anonymous') is distinct from 'true');

-- Auth fields, not editable user_metadata, determine eligibility. The row lock
-- and unique ledger reference make the grant safe under simultaneous sign-ins.
create function private.ensure_credit_account(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user auth.users%rowtype; v_account public.credit_accounts%rowtype; v_expired integer;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then raise exception 'forbidden' using errcode='42501'; end if;
  select * into v_user from auth.users where id = p_user_id;
  if not found or coalesce(v_user.is_anonymous,false) or v_user.email_confirmed_at is null then raise exception 'account_required'; end if;
  insert into public.credit_accounts(user_id) values(p_user_id) on conflict do nothing;
  select * into v_account from public.credit_accounts where user_id=p_user_id for update;
  if v_account.signup_granted_at is null then
    insert into public.credit_ledger(user_id,amount,reason,reference) values(p_user_id,10,'signup','signup:v1');
    update public.credit_accounts set balance=balance+10, signup_granted_at=now(), updated_at=now() where user_id=p_user_id;
  end if;
  with expired as (
    update public.credit_tailoring_runs set status='failed', credit_held=false, finished_at=now()
    where user_id=p_user_id and status='running' and credit_held and expires_at <= now() returning id
  ) select count(*) into v_expired from expired;
  if v_expired > 0 then update public.credit_accounts set reserved=greatest(0,reserved-v_expired), updated_at=now() where user_id=p_user_id; end if;
end $$;
revoke all on function private.ensure_credit_account(uuid) from public, anon, authenticated;
grant execute on function private.ensure_credit_account(uuid) to service_role;

create function private.credit_signup_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(new.is_anonymous,false) and new.email_confirmed_at is not null then perform private.ensure_credit_account(new.id); end if;
  return new;
end $$;
revoke all on function private.credit_signup_trigger() from public, anon, authenticated;
create trigger credit_signup after insert or update of is_anonymous,email_confirmed_at on auth.users
for each row execute function private.credit_signup_trigger();

create function public.billing_account(p_user_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare a public.credit_accounts%rowtype;
begin
  perform private.ensure_credit_account(p_user_id);
  select * into a from public.credit_accounts where user_id=p_user_id;
  return jsonb_build_object('available',greatest(0,a.balance-a.reserved),'reserved',a.reserved,'debt',greatest(0,-a.balance));
end $$;

create function public.billing_start_tailoring(p_user_id uuid,p_request_id uuid,p_source_id uuid,p_revision integer,p_hash text,p_description text,p_title text,p_company text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare a public.credit_accounts%rowtype; r public.credit_tailoring_runs%rowtype; s public.resumes%rowtype;
begin
  perform private.ensure_credit_account(p_user_id);
  select * into a from public.credit_accounts where user_id=p_user_id for update;
  update public.credit_tailoring_runs set status='failed' where user_id=p_user_id and status='ready' and result_resume_id is null;
  select * into r from public.credit_tailoring_runs where id=p_request_id;
  if found then
    if r.user_id<>p_user_id or r.input_hash<>p_hash then raise exception 'request_mismatch'; end if;
    if r.status='failed' then raise exception 'request_failed'; end if;
    return jsonb_build_object('kind',r.status,'run_id',r.id,'resume_id',r.result_resume_id,'result',r.result,'charged',r.charged);
  end if;
  select * into r from public.credit_tailoring_runs where user_id=p_user_id and input_hash=p_hash and status in ('running','ready');
  if found then return jsonb_build_object('kind',r.status,'run_id',r.id,'resume_id',r.result_resume_id,'result',r.result,'charged',r.charged); end if;
  if exists(select 1 from public.credit_tailoring_runs where user_id=p_user_id and status='running') then raise exception 'run_busy'; end if;
  if (select count(*) from public.credit_tailoring_runs where user_id=p_user_id and created_at>now()-interval '1 minute') >= 6 then raise exception 'run_rate_limit'; end if;
  if (select count(*) from public.credit_tailoring_runs where user_id=p_user_id and created_at>now()-interval '24 hours' and (status='failed' or status='ready' and not charged)) >= 10 then raise exception 'run_safety_limit'; end if;
  if a.balance-a.reserved < 1 then raise exception 'no_credits'; end if;
  select * into s from public.resumes where id=p_source_id and user_id=p_user_id for share;
  if not found then raise exception 'resume_not_found'; end if;
  if s.revision<>p_revision then raise exception 'resume_changed'; end if;
  insert into public.credit_tailoring_runs(id,user_id,source_resume_id,source_content,template_id,input_hash,description,title,company)
    values(p_request_id,p_user_id,s.id,s.content,s.template_id,p_hash,p_description,coalesce(p_title,''),coalesce(p_company,''));
  update public.credit_accounts set reserved=reserved+1,updated_at=now() where user_id=p_user_id;
  return jsonb_build_object('kind','started','run_id',p_request_id,'content',s.content);
end $$;

create function public.billing_finish_tailoring(p_user_id uuid,p_run_id uuid,p_result jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare r public.credit_tailoring_runs%rowtype; a public.credit_accounts%rowtype; v_job uuid; v_resume uuid; v_charge boolean; v_name text;
begin
  select * into a from public.credit_accounts where user_id=p_user_id for update;
  select * into r from public.credit_tailoring_runs where id=p_run_id and user_id=p_user_id for update;
  if not found then raise exception 'run_not_found'; end if;
  if r.status='ready' then return jsonb_build_object('resume_id',r.result_resume_id,'charged',r.charged); end if;
  if r.status<>'running' or not r.credit_held or r.expires_at<=now() or a.balance<a.reserved then raise exception 'run_expired'; end if;
  if p_result is null then
    update public.credit_accounts set reserved=reserved-1,updated_at=now() where user_id=p_user_id;
    update public.credit_tailoring_runs set status='failed',credit_held=false,finished_at=now() where id=r.id;
    return jsonb_build_object('released',true);
  end if;
  if coalesce((p_result->>'sample')::boolean,false) or jsonb_typeof(p_result->'suggestions') is distinct from 'array' then raise exception 'invalid_result'; end if;
  if r.source_resume_id is null then raise exception 'resume_not_found'; end if;
  v_charge := jsonb_array_length(p_result->'suggestions')>0 or jsonb_array_length(coalesce(p_result->'skills'->'add','[]'::jsonb))>0 or jsonb_typeof(p_result->'skills'->'order')='array';
  v_charge := coalesce(v_charge,false);
  v_name := coalesce(nullif(p_result->'job'->>'title',''),'Tailored resume') || case when coalesce(p_result->'job'->>'company','')<>'' then ' at '||(p_result->'job'->>'company') else '' end;
  insert into public.jobs(user_id,title,company,description) values(p_user_id,p_result->'job'->>'title',p_result->'job'->>'company',r.description) returning id into v_job;
  insert into public.resumes(user_id,title,template_id,content,source_resume_id,job_id) values(p_user_id,left(v_name,200),r.template_id,r.source_content,r.source_resume_id,v_job) returning id into v_resume;
  insert into public.tailor_sessions(user_id,resume_id,job_id,status,suggestions,match)
    values(p_user_id,v_resume,v_job,'ready',jsonb_build_object('suggestions',p_result->'suggestions','skills',p_result->'skills'),jsonb_build_object('requirements',p_result->'requirements','job',p_result->'job','sample',false));
  insert into public.credit_retry_allowances(resume_id,user_id) values(v_resume,p_user_id);
  if v_charge then insert into public.credit_ledger(user_id,amount,reason,reference) values(p_user_id,-1,'tailor','tailor:'||r.id); end if;
  update public.credit_accounts set balance=balance-case when v_charge then 1 else 0 end,reserved=reserved-1,updated_at=now() where user_id=p_user_id;
  update public.credit_tailoring_runs set status='ready',credit_held=false,charged=v_charge,result_resume_id=v_resume,result=p_result,finished_at=now() where id=r.id;
  return jsonb_build_object('resume_id',v_resume,'charged',v_charge);
end $$;

create function public.billing_release_tailoring(p_user_id uuid,p_run_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
declare r public.credit_tailoring_runs%rowtype;
begin
  perform 1 from public.credit_accounts where user_id=p_user_id for update;
  select * into r from public.credit_tailoring_runs where id=p_run_id and user_id=p_user_id for update;
  if found and r.status='running' and r.credit_held then
    update public.credit_accounts set reserved=reserved-1,updated_at=now() where user_id=p_user_id;
    update public.credit_tailoring_runs set status='failed',credit_held=false,finished_at=now() where id=r.id;
  end if;
end $$;

create function public.billing_start_retry(p_user_id uuid,p_request_id uuid,p_resume_id uuid,p_hash text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare a public.credit_retry_allowances%rowtype; r public.credit_retries%rowtype; v_expired integer;
begin
  select * into a from public.credit_retry_allowances where resume_id=p_resume_id and user_id=p_user_id for update;
  if not found then raise exception 'retry_not_available'; end if;
  with expired as (update public.credit_retries set status='failed' where resume_id=p_resume_id and status='running' and expires_at<=now() returning id) select count(*) into v_expired from expired;
  if v_expired>0 then update public.credit_retry_allowances set reserved=greatest(0,reserved-v_expired) where resume_id=p_resume_id returning * into a; end if;
  select * into r from public.credit_retries where id=p_request_id;
  if found then
    if r.user_id<>p_user_id or r.resume_id<>p_resume_id or r.input_hash<>p_hash then raise exception 'request_mismatch'; end if;
    if r.status='failed' then raise exception 'request_failed'; end if;
    return jsonb_build_object('kind',r.status,'result',r.result);
  end if;
  if a.used+a.reserved>=10 then raise exception 'retry_limit'; end if;
  if (select count(*) from public.credit_retries where user_id=p_user_id and created_at>now()-interval '1 minute')>=20 then raise exception 'run_rate_limit'; end if;
  insert into public.credit_retries(id,user_id,resume_id,input_hash) values(p_request_id,p_user_id,p_resume_id,p_hash);
  update public.credit_retry_allowances set reserved=reserved+1 where resume_id=p_resume_id;
  return jsonb_build_object('kind','started');
end $$;

create function public.billing_finish_retry(p_user_id uuid,p_request_id uuid,p_result jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare r public.credit_retries%rowtype;
begin
  select * into r from public.credit_retries where id=p_request_id and user_id=p_user_id;
  if not found then raise exception 'retry_not_available'; end if;
  perform 1 from public.credit_retry_allowances where resume_id=r.resume_id for update;
  select * into r from public.credit_retries where id=p_request_id and user_id=p_user_id for update;
  if r.status='ready' then return r.result; end if;
  if r.status<>'running' then raise exception 'request_failed'; end if;
  if r.expires_at<=now() then p_result:=null; end if;
  if p_result is not null and (jsonb_typeof(p_result->'text') is distinct from 'string' or length(p_result->>'text')=0) then raise exception 'invalid_result'; end if;
  update public.credit_retry_allowances set reserved=reserved-1,used=used+case when p_result is null then 0 else 1 end where resume_id=r.resume_id;
  update public.credit_retries set status=case when p_result is null then 'failed' else 'ready' end,result=p_result where id=r.id;
  return p_result;
end $$;

create function public.billing_fulfill_order(p_reference text,p_amount integer,p_currency text,p_transaction_id text,p_reversed boolean default false) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare o public.credit_orders%rowtype;
begin
  select * into o from public.credit_orders where reference=p_reference for update;
  if not found then raise exception 'order_not_found'; end if;
  if o.amount<>p_amount or o.currency<>p_currency then raise exception 'payment_mismatch'; end if;
  if o.provider_transaction_id is not null and o.provider_transaction_id<>p_transaction_id then raise exception 'payment_mismatch'; end if;
  if o.user_id is null then return jsonb_build_object('status','account_deleted'); end if;
  perform private.ensure_credit_account(o.user_id);
  if p_reversed then
    if o.status='paid' then
      insert into public.credit_ledger(user_id,amount,reason,reference) values(o.user_id,-o.credits,'reversal','reverse:'||o.reference);
      update public.credit_accounts set balance=balance-o.credits,updated_at=now() where user_id=o.user_id;
    end if;
    update public.credit_orders set status='reversed',provider_transaction_id=p_transaction_id where id=o.id;
  elsif o.status not in ('paid','reversed') then
    insert into public.credit_ledger(user_id,amount,reason,reference) values(o.user_id,o.credits,'purchase','purchase:'||o.reference);
    update public.credit_accounts set balance=balance+o.credits,updated_at=now() where user_id=o.user_id;
    update public.credit_orders set status='paid',provider_transaction_id=p_transaction_id,paid_at=now() where id=o.id;
  end if;
  return jsonb_build_object('status',case when p_reversed or o.status='reversed' then 'reversed' else 'paid' end);
end $$;

-- Deny all direct client execution, including signed-in anonymous sessions.
revoke all on function public.billing_account(uuid), public.billing_start_tailoring(uuid,uuid,uuid,integer,text,text,text,text), public.billing_finish_tailoring(uuid,uuid,jsonb), public.billing_release_tailoring(uuid,uuid), public.billing_start_retry(uuid,uuid,uuid,text), public.billing_finish_retry(uuid,uuid,jsonb), public.billing_fulfill_order(text,integer,text,text,boolean) from public, anon, authenticated;
grant execute on function public.billing_account(uuid), public.billing_start_tailoring(uuid,uuid,uuid,integer,text,text,text,text), public.billing_finish_tailoring(uuid,uuid,jsonb), public.billing_release_tailoring(uuid,uuid), public.billing_start_retry(uuid,uuid,uuid,text), public.billing_finish_retry(uuid,uuid,jsonb), public.billing_fulfill_order(text,integer,text,text,boolean) to service_role;

-- Existing verified accounts receive the same one-time grant. Existing tailored
-- copies keep their retry allowance; future copies are enrolled only by the server.
do $$ declare u record; begin
  for u in select id from auth.users where not coalesce(is_anonymous,false) and email_confirmed_at is not null loop perform private.ensure_credit_account(u.id); end loop;
end $$;
insert into public.credit_retry_allowances(resume_id,user_id) select distinct resume_id,user_id from public.tailor_sessions on conflict do nothing;

-- Existing auth helpers are trigger-only and must not be callable over RPC.
revoke execute on function public.handle_new_user(),public.handle_user_updated() from public, anon, authenticated;
alter function public.touch_updated_at() set search_path='';
alter function public.bump_resume_revision() set search_path='';
notify pgrst, 'reload schema';
