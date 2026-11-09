-- Required resume links apply only to fresh submissions. No existing rows change.
create or replace function public.submit_applicant_application(p_expected_version integer,p_mutation_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid; draft public.applicant_drafts; a public.applications; settings public.recruitment_settings;
  errors jsonb; constraint_name text; attempt integer;
begin
  actor := private.require_applicant();
  if p_expected_version is null or p_expected_version<1 or p_mutation_id is null then raise exception using errcode='22023',message='Invalid submission request'; end if;
  select * into a from public.applications where owner_id=actor for update;
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
  errors := private.submission_errors(draft.data);
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
        (select email from auth.users where id=actor),draft.data,draft.privacy_version,draft.consented_at,draft.version,p_mutation_id) returning * into a;
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
