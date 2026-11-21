-- One immutable submission per account and role; keep one monotonically versioned working draft.
-- Existing identities, submissions, evidence, status/history and role capacities are retained.
begin;
alter table public.applications drop constraint applications_owner_id_key;
create unique index applications_owner_opportunity_key on public.applications(owner_id,(data->>'opportunityId'));
create unique index applications_owner_source_version_key on public.applications(owner_id,source_draft_version);
create unique index applications_owner_submit_mutation_key on public.applications(owner_id,submit_mutation_id);
alter table public.enrollment_documents drop constraint enrollment_documents_owner_id_key;
create unique index enrollment_documents_active_owner_key on public.enrollment_documents(owner_id) where application_id is null;


create or replace function private.application_json(a public.applications) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id',a.id,'reference',a.reference,'email',a.email,'data',a.data,'status',a.status,'version',a.version,
    'sourceDraftVersion',a.source_draft_version,'submittedAt',a.submitted_at,'withdrawnAt',a.withdrawn_at,'history',coalesce((
      select jsonb_agg(jsonb_build_object('status',h.status,'createdAt',h.created_at) order by h.version)
      from public.application_public_history h where h.application_id=a.id),'[]'::jsonb));
$$;

create or replace function public.get_application_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare a public.applications; settings public.recruitment_settings; server_time timestamptz := clock_timestamp();
begin
  if not public.is_applicant_account() then raise exception using errcode='42501',message='Applicant access required'; end if;
  select * into strict settings from public.recruitment_settings where id;
  select * into a from public.applications where owner_id=auth.uid() order by submitted_at desc,id desc limit 1;
  return jsonb_build_object('application',case when a.id is null then null else private.application_json(a) end,
    'applications',coalesce((select jsonb_agg(private.application_json(x) order by x.submitted_at desc,x.id desc) from public.applications x where x.owner_id=auth.uid()),'[]'::jsonb),
    'draftSubmitted',exists(select 1 from public.applications x join public.applicant_drafts d on d.owner_id=x.owner_id and d.version=x.source_draft_version where x.owner_id=auth.uid()),
    'intake',jsonb_build_object('opensAt',settings.opens_at,'closesAt',settings.closes_at,'state',settings.intake_state,'serverNow',server_time,
      'accepting',settings.intake_state='open' and server_time>=settings.opens_at and server_time<settings.closes_at));
end;
$$;

create or replace function public.save_applicant_draft(p_data jsonb, p_expected_version integer, p_mutation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_email text;
  draft public.applicant_drafts;
begin
  if actor is null or not private.verified_google_user() then
    raise exception using errcode = '42501', message = 'Verified Google identity required';
  end if;
  select email into actor_email from auth.users where id = actor for update;
  if public.is_staff_account() then raise exception using errcode = '42501', message = 'Staff accounts cannot use applicant drafts'; end if;
  if exists(select 1 from public.applications where owner_id=actor and data->>'opportunityId'=p_data->>'opportunityId') then raise exception using errcode='PT410',message='You already applied for this role'; end if;
  if p_data is null or p_expected_version is null or p_expected_version < 0 or p_expected_version = 2147483647 or p_mutation_id is null or not public.valid_draft_payload(p_data) then
    raise exception using errcode = '22023', message = 'Invalid draft';
  end if;
  if p_expected_version = 0 then
    insert into public.applicant_drafts(owner_id,email,data,last_mutation_id)
      values(actor,actor_email,p_data,p_mutation_id) on conflict(owner_id) do nothing;
  end if;
  select * into draft from public.applicant_drafts where owner_id = actor for update;
  if not found then raise exception using errcode = 'PT409', message = 'Draft changed'; end if;
  if draft.last_mutation_id = p_mutation_id then
    if draft.data <> p_data then raise exception using errcode = '22023', message = 'Mutation identifier reused'; end if;
    return to_jsonb(draft);
  end if;
  if draft.version <> p_expected_version then raise exception using errcode = 'PT409', message = 'Draft changed'; end if;
  if draft.data->>'formVersion'='2' and p_data->>'formVersion' is distinct from '2' then
    raise exception using errcode='PT409',message='Reload the updated application form';
  end if;
  update public.applicant_drafts set data=p_data, email=actor_email, version=version+1, last_mutation_id=p_mutation_id, updated_at=clock_timestamp()
    where owner_id=actor returning * into draft;
  return to_jsonb(draft);
end;
$$;

create or replace function public.submit_applicant_application(p_expected_version integer,p_mutation_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid; draft public.applicant_drafts; a public.applications; settings public.recruitment_settings;
  snapshot jsonb; errors jsonb; constraint_name text; attempt integer;
begin
  actor := private.require_applicant();
  if p_expected_version is null or p_expected_version<1 or p_mutation_id is null then raise exception using errcode='22023',message='Invalid submission request'; end if;
  select * into a from public.applications where owner_id=actor and (submit_mutation_id=p_mutation_id or source_draft_version=p_expected_version) order by (submit_mutation_id=p_mutation_id) desc limit 1 for update;
  if found then
    if a.submit_mutation_id=p_mutation_id and a.source_draft_version<>p_expected_version then raise exception using errcode='22023',message='Operation identifier reused'; end if;
    return private.application_json(a);
  end if;
  -- Share locks permit concurrent applicants, while owner intake changes wait.
  select * into strict settings from public.recruitment_settings where id for share;
  if settings.intake_state<>'open' or clock_timestamp()<settings.opens_at or clock_timestamp()>=settings.closes_at then
    raise exception using errcode='PT423',message='Submissions are not open';
  end if;
  select * into draft from public.applicant_drafts where owner_id=actor for update;
  if not found or draft.version<>p_expected_version then raise exception using errcode='PT409',message='Draft changed before submission'; end if;
  if exists(select 1 from public.applications where owner_id=actor and data->>'opportunityId'=draft.data->>'opportunityId') then raise exception using errcode='PT409',message='You already applied for this role'; end if;
  snapshot := draft.data;
  if snapshot->>'formVersion'='2' then
    -- Retired text remains in the draft for copying, never in a new submission.
    snapshot := jsonb_set(jsonb_set(jsonb_set(snapshot,'{profile,experience}','""'),'{answers,availability}','""'),'{answers,pathway}','""');
  end if;
  errors := private.submission_errors(snapshot);
  -- New submissions require a resume; legacy CHECK validation and receipts stay valid.
  if coalesce(btrim(draft.data->>'resumeUrl'),'')='' then
    errors := errors || jsonb_build_object('resumeUrl','Add a resume link before submitting.');
  end if;
  if errors<>'{}'::jsonb then raise exception using errcode='PT422',message='Complete your application before submitting',detail=errors::text; end if;
  for attempt in 1..5 loop
    if clock_timestamp()>=settings.closes_at then raise exception using errcode='PT423',message='Submissions are not open'; end if;
    begin
      insert into public.applications(owner_id,reference,email,data,privacy_version,consented_at,source_draft_version,submit_mutation_id)
      values(actor,'ALPHA-2026-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
        (select email from auth.users where id=actor),snapshot,draft.privacy_version,draft.consented_at,draft.version,p_mutation_id) returning * into a;
      exit;
    exception when unique_violation then
      get stacked diagnostics constraint_name = CONSTRAINT_NAME;
      if constraint_name<>'applications_reference_key' or attempt=5 then raise; end if;
    end;
  end loop;
  insert into public.application_public_history(application_id,version,status,created_at) values(a.id,a.version,a.status,a.submitted_at);
  return private.application_json(a);
end;
$$;

create or replace function public.alpha_save_enrollment(p_path text,p_filename text,p_type text,p_size integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_applicant(); d public.enrollment_documents;
begin
 -- The same draft row lock used by submission serializes replacement against finalization.
 perform 1 from public.applicant_drafts where owner_id=actor for update;
 if not found or exists(select 1 from public.applications a join public.applicant_drafts working_draft on working_draft.owner_id=a.owner_id and working_draft.version=a.source_draft_version where a.owner_id=actor) then raise exception using errcode='42501',message='An editable application draft is required'; end if;
 if p_path !~ ('^'||actor::text||'/[0-9a-f-]{36}\.(pdf|jpg|png)$') or p_filename is null or char_length(p_filename) not between 1 and 160
   or p_type not in ('application/pdf','image/jpeg','image/png') or p_size not between 1 and 3145728 then raise exception using errcode='22023',message='Invalid enrollment document'; end if;
 if not exists(select 1 from storage.objects where bucket_id='alpha-enrollment' and name=p_path and (metadata->>'size')::bigint=p_size and metadata->>'mimetype'=p_type) then
  raise exception using errcode='22023',message='Upload the document before saving'; end if;
 insert into public.enrollment_documents(owner_id,path,filename,mime_type,size_bytes) values(actor,p_path,p_filename,p_type,p_size)
 on conflict(owner_id) where application_id is null do update set path=excluded.path,filename=excluded.filename,mime_type=excluded.mime_type,size_bytes=excluded.size_bytes,created_at=clock_timestamp()
 where enrollment_documents.application_id is null returning * into d;
 if not found then raise exception using errcode='42501',message='Submitted documents are locked'; end if;
 perform private.alpha_audit('enrollment.saved',d.id::text);
 return jsonb_build_object('id',d.id,'filename',d.filename,'size',d.size_bytes,'createdAt',d.created_at);
end; $$;

create or replace function public.alpha_enrollment(p_application uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.enrollment_documents;
begin
 if not private.verified_google_user() then raise exception using errcode='42501',message='Sign in required'; end if;
 if p_application is null then select * into d from public.enrollment_documents where owner_id=auth.uid() and application_id is null;
 else
  if not public.alpha_can_review(p_application) and not exists(select 1 from public.applications where id=p_application and owner_id=auth.uid()) then raise exception using errcode='42501',message='Document access denied'; end if;
  select * into d from public.enrollment_documents where application_id=p_application;
 end if;
 if d.id is null then return null; end if;
 perform private.alpha_audit('enrollment.accessed',d.id::text);
 return jsonb_build_object('id',d.id,'filename',d.filename,'size',d.size_bytes,'path',d.path,'createdAt',d.created_at);
end; $$;

create or replace function public.withdraw_applicant_application(p_expected_version integer,p_mutation_id uuid,p_application uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_applicant(); a public.applications;
begin
  if p_expected_version is null or p_expected_version<1 or p_mutation_id is null then raise exception using errcode='22023',message='Invalid withdrawal request'; end if;
  select * into a from public.applications where id=p_application and owner_id=actor for update;
  if not found then raise exception using errcode='P0002',message='No submitted application'; end if;
  if a.status='Withdrawn' then return private.application_json(a); end if;
  if a.version<>p_expected_version then raise exception using errcode='PT409',message='Application changed'; end if;
  perform 1 from public.opportunity_capacities where opportunity_id=a.data->>'opportunityId' for update;
  update public.applications set status='Withdrawn',version=version+1,withdrawn_at=clock_timestamp(),withdraw_mutation_id=p_mutation_id where id=a.id returning * into a;
  insert into public.application_public_history(application_id,version,status,created_at) values(a.id,a.version,a.status,a.withdrawn_at);
  return private.application_json(a);
end;
$$;

-- Older clients may withdraw only an unambiguous single application.
create or replace function public.withdraw_applicant_application(p_expected_version integer,p_mutation_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_applicant(); target uuid;
begin
 if (select count(*) from public.applications where owner_id=actor)>1 then raise exception using errcode='PT409',message='Select the application to withdraw'; end if;
 select id into target from public.applications where owner_id=actor;
 return public.withdraw_applicant_application(p_expected_version,p_mutation_id,target);
end;
$$;
revoke all on function public.withdraw_applicant_application(integer,uuid,uuid) from public,anon;
grant execute on function public.withdraw_applicant_application(integer,uuid,uuid) to authenticated;


drop policy alpha_enrollment_upload on storage.objects;
create policy alpha_enrollment_upload on storage.objects for insert to authenticated with check(
 bucket_id='alpha-enrollment' and public.alpha_upload_budget(bucket_id)
 and (storage.foldername(name))[1]=auth.uid()::text and public.is_applicant_account()
 and exists(select 1 from public.applicant_drafts d where d.owner_id=auth.uid()
   and not exists(select 1 from public.applications a where a.owner_id=d.owner_id and a.source_draft_version=d.version))
);
create or replace function public.alpha_notifications(p_read uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_applicant();
begin
 if p_read is not null then update public.applicant_notifications set read_at=coalesce(read_at,clock_timestamp()) where id=p_read and owner_id=actor; end if;
 return coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from (select id,application_id,kind,title,body,link,created_at,read_at from public.applicant_notifications where owner_id=actor order by created_at desc limit 50)n),'[]'::jsonb);
end; $$;

commit;
