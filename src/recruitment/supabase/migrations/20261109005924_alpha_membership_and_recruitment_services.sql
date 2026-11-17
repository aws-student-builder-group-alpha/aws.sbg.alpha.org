-- Additive services. Existing roles, immutable applications and exact submission receipts stay intact.
create table public.alpha_audit_events (
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id),
 action text not null, object_id text not null, created_at timestamptz not null default clock_timestamp()
);
create index alpha_audit_actor on public.alpha_audit_events(actor_id);
create table public.enrollment_documents (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null unique references auth.users(id),
 application_id uuid unique references public.applications(id), path text not null unique,
 filename text not null check(char_length(filename) between 1 and 160),
 mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png')),
 size_bytes integer not null check(size_bytes between 1 and 3145728), created_at timestamptz not null default clock_timestamp()
);
create table public.applicant_notifications (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 application_id uuid not null references public.applications(id) on delete cascade,
 kind text not null, title text not null, body text not null, link text,
 event_key text not null unique, created_at timestamptz not null default clock_timestamp(), read_at timestamptz
);
create index applicant_notification_owner on public.applicant_notifications(owner_id,created_at desc);
create table public.alpha_members (
 id text primary key default 'ALPHA-'||extract(year from current_date)::text||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 owner_id uuid not null unique references auth.users(id), application_id uuid unique references public.applications(id),
 full_name text not null check(char_length(btrim(full_name)) between 1 and 120),
 position text not null check(char_length(btrim(position)) between 1 and 100), joined_on date not null check(joined_on between '2024-01-01' and '2100-01-01'),
 photo_path text, status text not null default 'active' check(status in ('active','revoked')),
 version integer not null default 1, created_at timestamptz not null default clock_timestamp()
);
create table public.applicant_messages (
 id uuid primary key, application_id uuid not null references public.applications(id), actor_id uuid not null references auth.users(id),
 recipient text not null, kind text not null check(kind in ('interview','accepted','rejected','update')),
 subject text not null check(char_length(subject) between 1 and 160), body text not null check(char_length(body) between 1 and 5000), calendly_url text,
 request jsonb not null, state text not null default 'prepared' check(state in ('prepared','sending','sent','failed','uncertain')),
 created_at timestamptz not null default clock_timestamp(), completed_at timestamptz
);
create index applicant_message_application on public.applicant_messages(application_id,created_at desc);
create index applicant_message_actor on public.applicant_messages(actor_id,created_at desc);
alter table public.alpha_audit_events enable row level security;
alter table public.enrollment_documents enable row level security;
alter table public.applicant_notifications enable row level security;
alter table public.alpha_members enable row level security;
alter table public.applicant_messages enable row level security;
revoke all on public.alpha_audit_events,public.enrollment_documents,public.applicant_notifications,public.alpha_members,public.applicant_messages from public,anon,authenticated;

create function private.alpha_audit(p_action text,p_object text) returns void language sql security definer set search_path='' as $$
 insert into public.alpha_audit_events(actor_id,action,object_id) values(auth.uid(),p_action,p_object);
$$;
create function public.alpha_can_review(p_application uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 perform private.evaluation_access(p_application); return true;
exception when insufficient_privilege or no_data_found then return false;
end; $$;
revoke all on function public.alpha_can_review(uuid) from public,anon;
grant execute on function public.alpha_can_review(uuid) to authenticated;
grant select on public.enrollment_documents,public.alpha_members to authenticated;
create policy alpha_document_metadata on public.enrollment_documents for select to authenticated using(owner_id=(select auth.uid()) or public.alpha_can_review(application_id));
create policy alpha_own_membership on public.alpha_members for select to authenticated using(owner_id=(select auth.uid()) and status='active');

create function public.alpha_save_enrollment(p_path text,p_filename text,p_type text,p_size integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_applicant(); d public.enrollment_documents;
begin
 -- The same draft row lock used by submission serializes replacement against finalization.
 perform 1 from public.applicant_drafts where owner_id=actor for update;
 if not found or exists(select 1 from public.applications where owner_id=actor) then raise exception using errcode='42501',message='An editable application draft is required'; end if;
 if p_path !~ ('^'||actor::text||'/[0-9a-f-]{36}\.(pdf|jpg|png)$') or p_filename is null or char_length(p_filename) not between 1 and 160
   or p_type not in ('application/pdf','image/jpeg','image/png') or p_size not between 1 and 3145728 then raise exception using errcode='22023',message='Invalid enrollment document'; end if;
 if not exists(select 1 from storage.objects where bucket_id='alpha-enrollment' and name=p_path and (metadata->>'size')::bigint=p_size and metadata->>'mimetype'=p_type) then
  raise exception using errcode='22023',message='Upload the document before saving'; end if;
 insert into public.enrollment_documents(owner_id,path,filename,mime_type,size_bytes) values(actor,p_path,p_filename,p_type,p_size)
 on conflict(owner_id) do update set path=excluded.path,filename=excluded.filename,mime_type=excluded.mime_type,size_bytes=excluded.size_bytes,created_at=clock_timestamp()
 where enrollment_documents.application_id is null returning * into d;
 if not found then raise exception using errcode='42501',message='Submitted documents are locked'; end if;
 perform private.alpha_audit('enrollment.saved',d.id::text);
 return jsonb_build_object('id',d.id,'filename',d.filename,'size',d.size_bytes,'createdAt',d.created_at);
end; $$;

create function private.alpha_require_enrollment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.enrollment_documents where owner_id=new.owner_id and application_id is null for update;
 if not found then raise exception using errcode='PT422',message='Proof of enrollment is required',detail='{"proofOfEnrollment":"Upload your proof of enrollment before submitting."}'; end if;
 return new;
end; $$;
create trigger alpha_enrollment_before_submission before insert on public.applications for each row execute function private.alpha_require_enrollment();
create function private.alpha_application_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then update public.enrollment_documents set application_id=new.id where owner_id=new.owner_id and application_id is null; end if;
 if tg_op='INSERT' or new.status is distinct from old.status then
  insert into public.applicant_notifications(owner_id,application_id,kind,title,body,event_key)
  values(new.owner_id,new.id,'status','Application '||new.status,'Your application '||new.reference||' is now '||new.status||'. Open My application to review its status and next steps.',new.id::text||':'||new.version)
  on conflict(event_key) do nothing;
  perform private.alpha_audit('application.'||lower(replace(new.status,' ','_')),new.id::text);
  if new.status<>'Accepted' then
   update public.alpha_members set status='revoked',version=version+1 where application_id=new.id and status='active';
  end if;
 end if;
 return new;
end; $$;
create trigger alpha_application_notification after insert or update of status on public.applications for each row execute function private.alpha_application_event();

create function public.alpha_enrollment(p_application uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.enrollment_documents;
begin
 if not private.verified_google_user() then raise exception using errcode='42501',message='Sign in required'; end if;
 if p_application is null then select * into d from public.enrollment_documents where owner_id=auth.uid();
 else
  if not public.alpha_can_review(p_application) and not exists(select 1 from public.applications where id=p_application and owner_id=auth.uid()) then raise exception using errcode='42501',message='Document access denied'; end if;
  select * into d from public.enrollment_documents where application_id=p_application;
 end if;
 if d.id is null then return null; end if;
 perform private.alpha_audit('enrollment.accessed',d.id::text);
 return jsonb_build_object('id',d.id,'filename',d.filename,'size',d.size_bytes,'path',d.path,'createdAt',d.created_at);
end; $$;
create function public.alpha_notifications(p_read uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_applicant();
begin
 if p_read is not null then update public.applicant_notifications set read_at=coalesce(read_at,clock_timestamp()) where id=p_read and owner_id=actor; end if;
 return coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from (select id,kind,title,body,link,created_at,read_at from public.applicant_notifications where owner_id=actor order by created_at desc limit 50)n),'[]'::jsonb);
end; $$;

create function public.alpha_member(p_id text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.alpha_members;
begin
 if not private.verified_google_user() then raise exception using errcode='42501',message='Sign in required'; end if;
 select * into m from public.alpha_members where owner_id=auth.uid() and status='active' and (p_id is null or id=upper(btrim(p_id)));
 if m.id is null then return null; end if;
 return to_jsonb(m)-'owner_id'-'application_id';
end; $$;
create function public.alpha_issue_member(p_email text,p_name text,p_position text,p_joined date,p_reason text,p_status text default 'active') returns jsonb
language plpgsql security definer set search_path='' as $$
declare target uuid; a uuid; m public.alpha_members;
begin
 perform private.require_staff_admin();
 if char_length(btrim(p_reason)) not between 1 and 500 or p_status not in ('active','revoked') or char_length(btrim(p_name)) not between 1 and 120 or char_length(btrim(p_position)) not between 1 and 100 or p_joined>current_date then raise exception using errcode='22023',message='Check membership details and reason'; end if;
 select id into target from auth.users where lower(email)=lower(btrim(p_email)) and email_confirmed_at is not null;
 if target is null then raise exception using errcode='P0002',message='The member must sign in with their verified Google account first'; end if;
 select id into a from public.applications where owner_id=target and status='Accepted';
 if exists(select 1 from public.applications where owner_id=target) and a is null and p_status='active' then raise exception using errcode='42501',message='Publish acceptance before issuing membership'; end if;
 insert into public.alpha_members(owner_id,application_id,full_name,position,joined_on,status) values(target,a,btrim(p_name),btrim(p_position),p_joined,p_status)
 on conflict(owner_id) do update set position=excluded.position,joined_on=excluded.joined_on,status=excluded.status,version=alpha_members.version+1 returning * into m;
 -- Private reason is retained separately from the applicant-visible membership record.
 perform private.alpha_audit('membership.'||p_status,m.id);
 insert into public.alpha_membership_history(member_id,actor_id,reason,position,joined_on,status) values(m.id,auth.uid(),btrim(p_reason),m.position,m.joined_on,m.status);
 return to_jsonb(m)-'photo_path';
end; $$;
create table public.alpha_membership_history (
 id uuid primary key default gen_random_uuid(), member_id text not null references public.alpha_members(id), actor_id uuid not null references auth.users(id),
 reason text not null, position text not null, joined_on date not null, status text not null, created_at timestamptz not null default clock_timestamp()
);
alter table public.alpha_membership_history enable row level security;
revoke all on public.alpha_membership_history from public,anon,authenticated;
create function public.alpha_update_member(p_name text,p_photo text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.alpha_members;
begin
 if not private.verified_google_user() or char_length(btrim(p_name)) not between 1 and 120 then raise exception using errcode='42501',message='Active membership required'; end if;
 if p_photo is not null and (p_photo !~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}\.(jpg|png)$') or not exists(select 1 from storage.objects where bucket_id='alpha-member-photos' and name=p_photo)) then raise exception using errcode='22023',message='Invalid member photo'; end if;
 update public.alpha_members set full_name=btrim(p_name),photo_path=coalesce(p_photo,photo_path),version=version+1 where owner_id=auth.uid() and status='active' returning * into m;
 if not found then raise exception using errcode='42501',message='Active membership required'; end if;
 perform private.alpha_audit('membership.profile_updated',m.id);
 return to_jsonb(m)-'owner_id'-'application_id';
end; $$;

create function public.alpha_messages(p_application uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.evaluation_access(p_application);
 return coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc) from (select id,kind,subject,body,calendly_url,state,created_at,completed_at from public.applicant_messages where application_id=p_application order by created_at desc limit 30)m),'[]'::jsonb);
end; $$;
create function public.alpha_prepare_message(p_id uuid,p_application uuid,p_version integer,p_kind text,p_subject text,p_body text,p_calendly text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare a public.applications; m public.applicant_messages; payload jsonb;
begin
 perform private.evaluation_access(p_application);
 select * into a from public.applications where id=p_application for update;
 payload:=jsonb_build_object('application',p_application,'version',p_version,'kind',p_kind,'subject',p_subject,'body',p_body,'calendly',p_calendly);
 select * into m from public.applicant_messages where id=p_id;
 if found then
  if m.actor_id<>auth.uid() or m.request<>payload then raise exception using errcode='PT409',message='Message identifier already used'; end if;
  return to_jsonb(m);
 end if;
 perform pg_advisory_xact_lock(hashtext('alpha_email_daily_budget'));
 if a.version<>p_version then raise exception using errcode='PT409',message='Reload the latest application before sending'; end if;
 if a.status='Withdrawn' or p_kind not in ('interview','accepted','rejected','update') or char_length(btrim(p_subject)) not between 1 and 160 or p_subject ~ E'[\r\n]' or char_length(btrim(p_body)) not between 1 and 5000 then raise exception using errcode='22023',message='Invalid message'; end if;
 if (p_kind='accepted' and a.status<>'Accepted') or (p_kind='rejected' and a.status<>'Not Selected') or (p_kind='interview' and a.status<>'Under Review') then raise exception using errcode='PT409',message='Message must match the published application status'; end if;
 if (p_kind='interview' and p_calendly is null) or (p_calendly is not null and p_calendly !~ '^https://calendly\.com/[A-Za-z0-9/_?=&%.+-]+$') then raise exception using errcode='22023',message='Use an HTTPS calendly.com scheduling link'; end if;
 if (select count(*) from public.applicant_messages where created_at>clock_timestamp()-interval '24 hours')>=100 or (select count(*) from public.applicant_messages where application_id=a.id and created_at>clock_timestamp()-interval '24 hours')>=3 then raise exception using errcode='PT429',message='Daily email limit reached'; end if;
 insert into public.applicant_messages(id,application_id,actor_id,recipient,kind,subject,body,calendly_url,request) values(p_id,a.id,auth.uid(),a.email,p_kind,btrim(p_subject),btrim(p_body),p_calendly,payload) returning * into m;
 insert into public.applicant_notifications(owner_id,application_id,kind,title,body,link,event_key) values(a.owner_id,a.id,p_kind,btrim(p_subject),btrim(p_body),p_calendly,'message:'||m.id);
 perform private.alpha_audit('message.prepared',m.id::text);
 return to_jsonb(m);
end; $$;
create function public.alpha_claim_message(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare m public.applicant_messages;
begin
 select * into m from public.applicant_messages where id=p_id and actor_id=auth.uid() for update;
 if not found then raise exception using errcode='42501',message='Message access denied'; end if;
 perform private.evaluation_access(m.application_id);
 if m.state<>'prepared' then return false; end if;
 if not exists(select 1 from public.applications a where a.id=m.application_id and a.version=(m.request->>'version')::integer and a.status<>'Withdrawn') then raise exception using errcode='PT409',message='Application changed before sending'; end if;
 update public.applicant_messages set state='sending' where id=p_id;
 perform private.alpha_audit('message.sending',p_id::text); return true;
end; $$;
-- Completion is server-only: an authenticated browser cannot forge a sent receipt.
create function public.alpha_finish_message(p_id uuid,p_state text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_state not in ('sent','failed','uncertain') then raise exception using errcode='22023',message='Invalid delivery state'; end if;
 update public.applicant_messages set state=p_state,completed_at=clock_timestamp() where id=p_id and state='sending';
 if found then perform private.alpha_audit('message.'||p_state,p_id::text); end if;
end; $$;
revoke all on function public.alpha_finish_message(uuid,text) from public,anon,authenticated;
grant execute on function public.alpha_finish_message(uuid,text) to service_role;
create function public.alpha_security_log() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.require_staff_admin();
 return coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc) from (select id,actor_id,action,object_id,created_at from public.alpha_audit_events order by created_at desc limit 100)e),'[]'::jsonb);
end; $$;

revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.alpha_save_enrollment(text,text,text,integer),public.alpha_enrollment(uuid),public.alpha_notifications(uuid),public.alpha_member(text),public.alpha_issue_member(text,text,text,date,text,text),public.alpha_update_member(text,text),public.alpha_messages(uuid),public.alpha_prepare_message(uuid,uuid,integer,text,text,text,text),public.alpha_claim_message(uuid),public.alpha_security_log() from public,anon;
grant execute on function public.alpha_save_enrollment(text,text,text,integer),public.alpha_enrollment(uuid),public.alpha_notifications(uuid),public.alpha_member(text),public.alpha_issue_member(text,text,text,date,text,text),public.alpha_update_member(text,text),public.alpha_messages(uuid),public.alpha_prepare_message(uuid,uuid,integer,text,text,text,text),public.alpha_claim_message(uuid),public.alpha_security_log() to authenticated;

create function public.alpha_upload_budget(p_bucket text) returns boolean language sql stable security definer set search_path='' as $$
 select private.verified_google_user() and p_bucket in ('alpha-enrollment','alpha-member-photos') and
 (select count(*)<3 from storage.objects where bucket_id=p_bucket and split_part(name,'/',1)=auth.uid()::text);
$$;
revoke all on function public.alpha_upload_budget(text) from public,anon;
grant execute on function public.alpha_upload_budget(text) to authenticated;

-- Bucket setup runs only on Supabase; local SQL tests use a storage metadata fixture.
do $$ begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
   ('alpha-enrollment','alpha-enrollment',false,3145728,array['application/pdf','image/jpeg','image/png']),
   ('alpha-member-photos','alpha-member-photos',false,2097152,array['image/jpeg','image/png']);
  execute $policy$create policy alpha_enrollment_upload on storage.objects for insert to authenticated with check(bucket_id='alpha-enrollment' and public.alpha_upload_budget(bucket_id) and (storage.foldername(name))[1]=auth.uid()::text and public.is_applicant_account() and exists(select 1 from public.applicant_drafts where owner_id=auth.uid()) and not exists(select 1 from public.applications where owner_id=auth.uid()))$policy$;
  execute $policy$create policy alpha_enrollment_read on storage.objects for select to authenticated using(bucket_id='alpha-enrollment' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.enrollment_documents d where d.path=name and public.alpha_can_review(d.application_id))))$policy$;
  execute $policy$create policy alpha_enrollment_delete on storage.objects for delete to authenticated using(bucket_id='alpha-enrollment' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.enrollment_documents d where d.path=name and d.application_id is not null))$policy$;
  execute $policy$create policy alpha_member_photo_insert on storage.objects for insert to authenticated with check(bucket_id='alpha-member-photos' and public.alpha_upload_budget(bucket_id) and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.alpha_members where owner_id=auth.uid() and status='active'))$policy$;
  execute $policy$create policy alpha_member_photo_read on storage.objects for select to authenticated using(bucket_id='alpha-member-photos' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.alpha_members m where m.owner_id=auth.uid() and m.status='active'))$policy$;
  execute $policy$create policy alpha_member_photo_delete on storage.objects for delete to authenticated using(bucket_id='alpha-member-photos' and (storage.foldername(name))[1]=auth.uid()::text)$policy$;
 end if;
end; $$;
