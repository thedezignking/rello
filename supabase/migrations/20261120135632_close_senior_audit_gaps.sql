-- Atomic review writes and server-owned resource reservations.
alter table public.tailor_sessions add column revision integer not null default 1;

create or replace function public.bump_resume_revision()
returns trigger language plpgsql set search_path='' as $$
begin
  if (new.content,new.title,new.template_id) is distinct from (old.content,old.title,old.template_id) then
    new.revision := old.revision + 1;
  end if;
  new.updated_at := now();
  return new;
end $$;

create function public.save_resume_review(p_resume_id uuid,p_session_id uuid,p_revision integer,p_session_revision integer,p_content jsonb,p_choices jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.resumes%rowtype; s public.tailor_sessions%rowtype;
begin
  select * into r from public.resumes where id=p_resume_id and user_id=(select auth.uid()) for update;
  if not found then return jsonb_build_object('ok',false,'reason','conflict'); end if;
  select * into s from public.tailor_sessions where id=p_session_id and resume_id=r.id and user_id=r.user_id for update;
  if not found or r.revision<>p_revision or s.revision<>p_session_revision then
    return jsonb_build_object('ok',false,'reason','conflict');
  end if;
  if jsonb_typeof(p_content)<>'object' or jsonb_typeof(p_choices)<>'object' then raise exception 'invalid_content'; end if;
  update public.resumes set content=p_content where id=r.id returning * into r;
  update public.tailor_sessions set suggestions=p_choices,revision=revision+1 where id=s.id returning * into s;
  return jsonb_build_object('ok',true,'revision',r.revision,'sessionRevision',s.revision,'updatedAt',r.updated_at);
end $$;
revoke all on function public.save_resume_review(uuid,uuid,integer,integer,jsonb,jsonb) from public,anon;
grant execute on function public.save_resume_review(uuid,uuid,integer,integer,jsonb,jsonb) to authenticated;

-- Only the server may call this, after verifying both live auth identities.
create function public.transfer_guest_work(p_guest_id uuid,p_user_id uuid)
returns integer language plpgsql security invoker set search_path='' as $$
declare g auth.users%rowtype; u auth.users%rowtype; moved integer;
begin
  if p_guest_id=p_user_id then return 0; end if;
  perform 1 from auth.users where id in(p_guest_id,p_user_id) order by id for update;
  select * into g from auth.users where id=p_guest_id;
  select * into u from auth.users where id=p_user_id;
  if g.id is null or not coalesce(g.is_anonymous,false) or u.id is null or coalesce(u.is_anonymous,true) or u.email_confirmed_at is null then
    raise exception 'invalid_transfer' using errcode='42501';
  end if;
  update public.jobs set user_id=p_user_id where user_id=p_guest_id;
  update public.resumes set user_id=p_user_id where user_id=p_guest_id;
  get diagnostics moved = row_count;
  update public.tailor_sessions set user_id=p_user_id where user_id=p_guest_id;
  update public.ai_usage set user_id=p_user_id where user_id=p_guest_id;
  return moved;
end $$;
revoke all on function public.transfer_guest_work(uuid,uuid) from public,anon,authenticated;
grant execute on function public.transfer_guest_work(uuid,uuid) to service_role;

-- Auth row locks require privileges deliberately absent from service_role.
-- Keep that privilege in a private, service-only function, never a table grant.
alter function public.transfer_guest_work(uuid,uuid) set schema private;
alter function private.transfer_guest_work(uuid,uuid) security definer;
revoke all on function private.transfer_guest_work(uuid,uuid) from public,anon,authenticated;
grant execute on function private.transfer_guest_work(uuid,uuid) to service_role;
create function public.transfer_guest_work(p_guest_id uuid,p_user_id uuid)
returns integer language sql security invoker set search_path='' as $$
  select private.transfer_guest_work(p_guest_id,p_user_id);
$$;
revoke all on function public.transfer_guest_work(uuid,uuid) from public,anon,authenticated;
grant execute on function public.transfer_guest_work(uuid,uuid) to service_role;

create table private.resource_attempts(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  op text not null check(op in('import','improve','pdf')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '2 minutes',
  finished_at timestamptz,
  ok boolean
);
create index resource_attempts_user_op_idx on private.resource_attempts(user_id,op,created_at desc);
revoke all on private.resource_attempts from public,anon,authenticated;
grant all on private.resource_attempts to service_role;

create function public.reserve_resource(p_user_id uuid,p_op text,p_cap integer default 40)
returns uuid language plpgsql security invoker set search_path='' as $$
declare reservation uuid;
begin
  if p_op not in('import','improve','pdf') then raise exception 'invalid_operation'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  delete from private.resource_attempts where user_id=p_user_id and created_at<now()-interval '30 days';
  if (select count(*) from private.resource_attempts where user_id=p_user_id and finished_at is null and expires_at>now())>=2 then raise exception 'resource_busy'; end if;
  if (select count(*) from private.resource_attempts where user_id=p_user_id and created_at>now()-interval '1 minute')>=10 then raise exception 'resource_rate_limit'; end if;
  if (select count(*) from private.resource_attempts where user_id=p_user_id and (op=p_op or p_op<>'pdf' and op<>'pdf') and created_at>now()-interval '24 hours') >= least(200,greatest(1,p_cap)) then raise exception 'resource_daily_limit'; end if;
  insert into private.resource_attempts(user_id,op) values(p_user_id,p_op) returning id into reservation;
  return reservation;
end $$;
create function public.finish_resource(p_user_id uuid,p_id uuid,p_ok boolean)
returns void language sql security invoker set search_path='' as $$
  update private.resource_attempts set finished_at=coalesce(finished_at,now()),ok=coalesce(ok,p_ok) where id=p_id and user_id=p_user_id;
$$;
revoke all on function public.reserve_resource(uuid,text,integer),public.finish_resource(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.reserve_resource(uuid,text,integer),public.finish_resource(uuid,uuid,boolean) to service_role;
