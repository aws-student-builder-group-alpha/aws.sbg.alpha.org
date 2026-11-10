-- Email-bound invitations do not create Auth users or grant staff roles.
create table public.alpha_member_invitations (
 id uuid primary key, email text not null, full_name text not null, position text not null,
 joined_on date not null, reason text not null, actor_id uuid not null references auth.users(id),
 state text not null default 'pending' check(state in ('pending','accepted','canceled')),
 delivery text not null default 'not_sent' check(delivery in ('not_sent','sending','sent','failed','uncertain')),
 created_at timestamptz not null default clock_timestamp(), claimed_at timestamptz, accepted_at timestamptz,
 member_id text references public.alpha_members(id)
);
create unique index alpha_pending_member_email on public.alpha_member_invitations(email) where state='pending';
create index alpha_member_invitation_actor on public.alpha_member_invitations(actor_id);
create index alpha_member_invitation_member on public.alpha_member_invitations(member_id);
alter table public.alpha_member_invitations enable row level security;
revoke all on public.alpha_member_invitations from public,anon,authenticated;

create function public.alpha_invite_member(p_id uuid,p_email text,p_name text,p_position text,p_joined date,p_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.alpha_member_invitations; e text:=lower(btrim(p_email));
begin
 perform private.require_staff_admin();
 if p_id is null or e is null or char_length(e)>254 or e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or char_length(btrim(p_name)) not between 1 and 120 or p_name is null
 or char_length(btrim(p_position)) not between 1 and 100 or p_position is null
 or char_length(btrim(p_reason)) not between 1 and 500 or p_reason is null
 or p_joined is null or p_joined not between '2024-01-01'::date and current_date then
 raise exception using errcode='22023',message='Check invitation details and reason'; end if;
 perform pg_advisory_xact_lock(hashtextextended('alpha-member-invite:'||e,0));
 select * into i from public.alpha_member_invitations where id=p_id;
 if found then
  if i.actor_id<>auth.uid() or i.email<>e or i.full_name<>btrim(p_name) or i.position<>btrim(p_position) or i.joined_on<>p_joined or i.reason<>btrim(p_reason) then
   raise exception using errcode='PT409',message='This invitation request has changed'; end if;
  return to_jsonb(i)-'reason'-'actor_id';
 end if;
 if exists(select 1 from public.alpha_member_invitations where email=e and state='pending') then
 raise exception using errcode='PT409',message='A pending invitation already exists. Open invitation history to use or cancel it.'; end if;
 insert into public.alpha_member_invitations(id,email,full_name,position,joined_on,reason,actor_id)
 values(p_id,e,btrim(p_name),btrim(p_position),p_joined,btrim(p_reason),auth.uid()) returning * into i;
 perform private.alpha_audit('membership.invited',i.id::text);
 return to_jsonb(i)-'reason'-'actor_id';
end; $$;

create function public.alpha_member_invitations(p_admin boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e text;
begin
 if p_admin then
  perform private.require_staff_admin();
  return coalesce((select jsonb_agg(to_jsonb(i)-'reason'-'actor_id' order by i.created_at desc) from
  (select * from public.alpha_member_invitations order by created_at desc limit 50)i),'[]'::jsonb);
 end if;
 if not private.verified_google_user() then raise exception using errcode='42501',message='Sign in required'; end if;
 select lower(email) into e from auth.users where id=auth.uid();
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'full_name',full_name,'position',position,'joined_on',joined_on,'created_at',created_at))
 from public.alpha_member_invitations where email=e and state='pending'),'[]'::jsonb);
end; $$;

create function public.alpha_accept_membership(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.alpha_member_invitations; m public.alpha_members; a uuid; e text;
begin
 if not private.verified_google_user() then raise exception using errcode='42501',message='Sign in required'; end if;
 select lower(email) into e from auth.users where id=auth.uid();
 select * into i from public.alpha_member_invitations where id=p_id and email=e for update;
 if not found or i.state='canceled' then raise exception using errcode='42501',message='No invitation for this Google account. Ask Alpha to check the invited email.'; end if;
 if i.state='accepted' then return public.alpha_member(); end if;
 -- Use the same account lock as applicant submission to serialize acceptance with it.
 perform 1 from auth.users where id=auth.uid() for update;
 select id into a from public.applications where owner_id=auth.uid() and status='Accepted';
 if exists(select 1 from public.applications where owner_id=auth.uid()) and a is null then
 raise exception using errcode='42501',message='Your submitted application must be accepted before membership is issued'; end if;
 insert into public.alpha_members(owner_id,application_id,full_name,position,joined_on)
 values(auth.uid(),a,i.full_name,i.position,i.joined_on)
 on conflict(owner_id) do update set position=excluded.position,joined_on=excluded.joined_on,status='active',version=alpha_members.version+1 returning * into m;
 update public.alpha_member_invitations set state='accepted',accepted_at=clock_timestamp(),member_id=m.id where id=i.id;
 insert into public.alpha_membership_history(member_id,actor_id,reason,position,joined_on,status)
 values(m.id,i.actor_id,i.reason,m.position,m.joined_on,'active');
 perform private.alpha_audit('membership.invitation_accepted',m.id);
 return public.alpha_member();
end; $$;

create function public.alpha_cancel_member_invitation(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_staff_admin();
 update public.alpha_member_invitations set state='canceled' where id=p_id and state='pending';
 if not found then raise exception using errcode='PT409',message='This invitation is no longer pending'; end if;
 perform private.alpha_audit('membership.invitation_canceled',p_id::text);
end; $$;

create function public.alpha_claim_member_invitation(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i public.alpha_member_invitations;
begin
 perform private.require_staff_admin();
 perform pg_advisory_xact_lock(hashtextextended('alpha-membership-mail',0));
 select * into i from public.alpha_member_invitations where id=p_id and state='pending' for update;
 if not found then raise exception using errcode='PT409',message='This invitation is no longer pending'; end if;
 if i.delivery<>'not_sent' then return null; end if;
 if (select count(*) from public.alpha_member_invitations where delivery<>'not_sent' and claimed_at>clock_timestamp()-interval '24 hours')>=100 then
 raise exception using errcode='PT429',message='The daily membership invitation email limit has been reached'; end if;
 update public.alpha_member_invitations set delivery='sending',claimed_at=clock_timestamp() where id=p_id;
 perform private.alpha_audit('membership.invitation_email_claimed',p_id::text);
 return to_jsonb(i)-'reason'-'actor_id';
end; $$;

create function public.alpha_finish_member_invitation(p_id uuid,p_state text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_state not in ('sent','failed','uncertain') or p_state is null then raise exception using errcode='22023',message='Invalid delivery state'; end if;
 update public.alpha_member_invitations set delivery=p_state where id=p_id and delivery='sending';
 perform private.alpha_audit('membership.invitation_email_'||p_state,p_id::text);
end; $$;

create function private.alpha_cancel_revoked_invitations() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='revoked' then
 update public.alpha_member_invitations set state='canceled' where state='pending' and email=(select lower(email) from auth.users where id=new.owner_id);
 end if; return new;
end; $$;
create trigger alpha_cancel_revoked_invitations after update of status on public.alpha_members for each row execute function private.alpha_cancel_revoked_invitations();
revoke all on function private.alpha_cancel_revoked_invitations() from public,anon,authenticated;
revoke all on function public.alpha_invite_member(uuid,text,text,text,date,text),public.alpha_member_invitations(boolean),public.alpha_accept_membership(uuid),public.alpha_cancel_member_invitation(uuid),public.alpha_claim_member_invitation(uuid),public.alpha_finish_member_invitation(uuid,text) from public,anon,authenticated;
grant execute on function public.alpha_invite_member(uuid,text,text,text,date,text),public.alpha_member_invitations(boolean),public.alpha_accept_membership(uuid),public.alpha_cancel_member_invitation(uuid),public.alpha_claim_member_invitation(uuid) to authenticated;
grant execute on function public.alpha_finish_member_invitation(uuid,text) to service_role;
