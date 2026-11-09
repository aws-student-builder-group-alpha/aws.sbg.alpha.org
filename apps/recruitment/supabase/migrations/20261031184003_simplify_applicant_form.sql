-- Versioned applicant form; no existing row, revision or retry identifier is rewritten.

-- Single-cycle draft milestone. Run once on a dedicated Supabase project.
create or replace function private.valid_draft_payload_v1(p jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare
  item record;
  expected text[] := array['profile','track','opportunityId','answers','resumeUrl','portfolioUrl','accuracy','processingConsent','updatesConsent','stage'];
  profile_keys text[] := array['fullName','preferredName','mobile','university','otherUniversity','campus','program','programLevel','year','yearExplanation','enrolled','availability','experience'];
  question_keys text[] := array['motivation','collaboration','availability','pathway','scenario'];
  limits jsonb := '{"fullName":120,"preferredName":60,"mobile":32,"university":160,"otherUniversity":160,"campus":120,"program":160,"programLevel":20,"year":10,"yearExplanation":160,"experience":2000}';
  k text;
begin
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text) > 65536 then return false; end if;
  if not p ?& expected or exists(select 1 from jsonb_object_keys(p) x where not x = any(expected)) then return false; end if;
  if jsonb_typeof(p->'profile') is distinct from 'object' or jsonb_typeof(p->'answers') is distinct from 'object' then return false; end if;
  if not (p->'profile') ?& profile_keys or exists(select 1 from jsonb_object_keys(p->'profile') x where not x = any(profile_keys)) then return false; end if;
  if not (p->'answers') ?& question_keys or exists(select 1 from jsonb_object_keys(p->'answers') x where not x = any(question_keys)) then return false; end if;
  for item in select * from jsonb_each_text(limits) loop
    if jsonb_typeof(p->'profile'->item.key) is distinct from 'string' or char_length(p->'profile'->>item.key) > item.value::int then return false; end if;
  end loop;
  if jsonb_typeof(p->'profile'->'enrolled') is distinct from 'boolean' then return false; end if;
  if (p->'profile'->>'programLevel') not in ('','undergraduate','postgraduate','other') or (p->'profile'->>'year') not in ('','1','2','3','4','5','6+','other') then return false; end if;
  if jsonb_typeof(p->'profile'->'availability') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p->'profile'->'availability') > 7 then return false; end if;
  if exists(select 1 from jsonb_array_elements(p->'profile'->'availability') d where jsonb_typeof(d) <> 'string' or d #>> '{}' not in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')) then return false; end if;
  if (select count(*) from jsonb_array_elements(p->'profile'->'availability')) <> (select count(distinct d) from jsonb_array_elements(p->'profile'->'availability') d) then return false; end if;
  foreach k in array question_keys loop
    if jsonb_typeof(p->'answers'->k) is distinct from 'string' or char_length(p->'answers'->>k) > 10000 then return false; end if;
  end loop;
  foreach k in array array['resumeUrl','portfolioUrl'] loop
    if jsonb_typeof(p->k) is distinct from 'string' or char_length(p->>k) > 2048 then return false; end if;
    if p->>k <> '' and ((p->>k) !~* '^https://[^/[:space:]@?#]+([/?#][^[:space:]]*)?$' or (p->>k) ~ '[\\]') then return false; end if;
  end loop;
  foreach k in array array['accuracy','processingConsent','updatesConsent'] loop
    if jsonb_typeof(p->k) is distinct from 'boolean' then return false; end if;
  end loop;
  if p->>'processingConsent' <> 'true' then return false; end if;
  if jsonb_typeof(p->'stage') is distinct from 'number' or p->>'stage' !~ '^[0-5]$' then return false; end if;
  if jsonb_typeof(p->'track') is distinct from 'string' or p->>'track' not in ('CORE_TEAM','COMMITTEE') or jsonb_typeof(p->'opportunityId') is distinct from 'string' then return false; end if;
  -- Catalog IDs are seeded from the approved repository catalog below.
  if p->>'opportunityId' <> '' and not exists(select 1 from public.draft_opportunities o where o.id = p->>'opportunityId' and o.track = p->>'track') then return false; end if;
  return true;
end;
$$;


-- Single-cycle draft milestone. Run once on a dedicated Supabase project.
create or replace function public.valid_draft_payload(p jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare
  item record;
  expected text[] := array['profile','track','opportunityId','answers','resumeUrl','portfolioUrl','accuracy','processingConsent','updatesConsent','stage'];
  profile_keys text[] := array['fullName','preferredName','mobile','university','otherUniversity','campus','program','programLevel','year','yearExplanation','enrolled','availability','experience'];
  question_keys text[] := array['motivation','collaboration','availability','pathway','scenario'];
  limits jsonb := '{"fullName":120,"preferredName":60,"mobile":32,"university":160,"otherUniversity":160,"campus":120,"program":160,"programLevel":20,"year":10,"yearExplanation":160,"experience":2000}';
  k text;
begin
  if p ? 'formVersion' then
    if p->'formVersion' is distinct from '2'::jsonb or octet_length(p::text)>65536
      or jsonb_typeof(p->'scenarioReviewedOpportunityId') is distinct from 'string' then return false; end if;
    if p->>'scenarioReviewedOpportunityId'<>'' and not exists(select 1 from public.draft_opportunities where id=p->>'scenarioReviewedOpportunityId') then return false; end if;
    p := p - 'formVersion' - 'scenarioReviewedOpportunityId';
  end if;
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text) > 65536 then return false; end if;
  if not p ?& expected or exists(select 1 from jsonb_object_keys(p) x where not x = any(expected)) then return false; end if;
  if jsonb_typeof(p->'profile') is distinct from 'object' or jsonb_typeof(p->'answers') is distinct from 'object' then return false; end if;
  if not (p->'profile') ?& profile_keys or exists(select 1 from jsonb_object_keys(p->'profile') x where not x = any(profile_keys)) then return false; end if;
  if not (p->'answers') ?& question_keys or exists(select 1 from jsonb_object_keys(p->'answers') x where not x = any(question_keys)) then return false; end if;
  for item in select * from jsonb_each_text(limits) loop
    if jsonb_typeof(p->'profile'->item.key) is distinct from 'string' or char_length(p->'profile'->>item.key) > item.value::int then return false; end if;
  end loop;
  if jsonb_typeof(p->'profile'->'enrolled') is distinct from 'boolean' then return false; end if;
  if (p->'profile'->>'programLevel') not in ('','undergraduate','postgraduate','other') or (p->'profile'->>'year') not in ('','1','2','3','4','5','6+','other') then return false; end if;
  if jsonb_typeof(p->'profile'->'availability') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p->'profile'->'availability') > 7 then return false; end if;
  if exists(select 1 from jsonb_array_elements(p->'profile'->'availability') d where jsonb_typeof(d) <> 'string' or d #>> '{}' not in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')) then return false; end if;
  if (select count(*) from jsonb_array_elements(p->'profile'->'availability')) <> (select count(distinct d) from jsonb_array_elements(p->'profile'->'availability') d) then return false; end if;
  foreach k in array question_keys loop
    if jsonb_typeof(p->'answers'->k) is distinct from 'string' or char_length(p->'answers'->>k) > 10000 then return false; end if;
  end loop;
  foreach k in array array['resumeUrl','portfolioUrl'] loop
    if jsonb_typeof(p->k) is distinct from 'string' or char_length(p->>k) > 2048 then return false; end if;
    if p->>k <> '' and ((p->>k) !~* '^https://[^/[:space:]@?#]+([/?#][^[:space:]]*)?$' or (p->>k) ~ '[\\]') then return false; end if;
  end loop;
  foreach k in array array['accuracy','processingConsent','updatesConsent'] loop
    if jsonb_typeof(p->k) is distinct from 'boolean' then return false; end if;
  end loop;
  if p->>'processingConsent' <> 'true' then return false; end if;
  if jsonb_typeof(p->'stage') is distinct from 'number' or p->>'stage' !~ '^[0-5]$' then return false; end if;
  if jsonb_typeof(p->'track') is distinct from 'string' or p->>'track' not in ('CORE_TEAM','COMMITTEE') or jsonb_typeof(p->'opportunityId') is distinct from 'string' then return false; end if;
  -- Catalog IDs are seeded from the approved repository catalog below.
  if p->>'opportunityId' <> '' and not exists(select 1 from public.draft_opportunities o where o.id = p->>'opportunityId' and o.track = p->>'track') then return false; end if;
  return true;
end;
$$;

create function private.submission_errors_v1(p jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare errors jsonb := '{}'; profile jsonb := p->'profile'; q record; words integer;
begin
  if not private.valid_draft_payload_v1(p) then return '{"form":"The saved draft contains invalid fields."}'::jsonb; end if;
  if char_length(private.application_trim(profile->>'fullName')) < 2 then errors := errors || '{"fullName":"Enter your full name (2–120 characters)."}'; end if;
  if profile->>'mobile' <> '' and regexp_replace(profile->>'mobile','['||chr(9)||'-'||chr(13)||' '||chr(160)||chr(5760)||chr(8192)||'-'||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)||'().-]','','g') !~ '^\+?[0-9]{7,15}$' then errors := errors || '{"mobile":"Use a phone number with 7–15 digits."}'; end if;
  if private.application_trim(profile->>'university')='' then errors := errors || '{"university":"Choose your university."}'; end if;
  if profile->>'university'='Other' and private.application_trim(profile->>'otherUniversity')='' then errors := errors || '{"otherUniversity":"Enter your university name."}'; end if;
  if private.application_trim(profile->>'program')='' then errors := errors || '{"program":"Enter your degree or program."}'; end if;
  if profile->>'programLevel' not in ('undergraduate','postgraduate','other') then errors := errors || '{"programLevel":"Choose your program level."}'; end if;
  if profile->>'year' not in ('1','2','3','4','5','6+','other') then errors := errors || '{"year":"Choose your current academic year."}'; end if;
  if profile->>'year'='other' and private.application_trim(profile->>'yearExplanation')='' then errors := errors || '{"yearExplanation":"Tell us your academic standing."}'; end if;
  if profile->>'enrolled'<>'true' then errors := errors || '{"enrolled":"Confirm that you are currently enrolled."}'; end if;
  if p->>'track'='CORE_TEAM' and (profile->>'enrolled'<>'true' or profile->>'programLevel'<>'undergraduate' or profile->>'year' not in ('1','2')) then errors := errors || '{"eligibility":"Core Team requires an enrolled first- or second-year undergraduate."}'; end if;
  if not exists(select 1 from public.draft_opportunities o where o.id=p->>'opportunityId' and o.track=p->>'track') then errors := errors || '{"opportunityId":"Choose an opportunity in your selected track."}'; end if;
  if jsonb_array_length(profile->'availability')=0 then errors := errors || '{"availabilityDays":"Choose at least one available day."}'; end if;
  if private.application_trim(profile->>'experience')='' then errors := errors || '{"experience":"Tell us about your experience or interests. Beginners are welcome."}'; end if;
  for q in select * from (values ('motivation',50,200),('collaboration',50,200),('availability',20,100),('pathway',50,250),('scenario',50,250)) as limits(id,minimum,maximum) loop
    words := private.application_word_count(p->'answers'->>q.id);
    if words<q.minimum or words>q.maximum then errors := errors || jsonb_build_object(q.id,format('Write %s–%s words. You currently have %s.',q.minimum,q.maximum,words)); end if;
  end loop;
  if p->>'accuracy'<>'true' then errors := errors || '{"accuracy":"Confirm that your application is accurate."}'; end if;
  return errors;
end;
$$;


create or replace function private.submission_errors(p jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare errors jsonb := '{}'; profile jsonb := p->'profile'; q record; words integer;
begin
  if not (p ? 'formVersion') then return private.submission_errors_v1(p); end if;
  if not public.valid_draft_payload(p) then return '{"form":"The saved draft contains invalid fields."}'::jsonb; end if;
  if char_length(private.application_trim(profile->>'fullName')) < 2 then errors := errors || '{"fullName":"Enter your full name (2–120 characters)."}'; end if;
  if profile->>'mobile' <> '' and regexp_replace(profile->>'mobile','['||chr(9)||'-'||chr(13)||' '||chr(160)||chr(5760)||chr(8192)||'-'||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)||'().-]','','g') !~ '^\+?[0-9]{7,15}$' then errors := errors || '{"mobile":"Use a phone number with 7–15 digits."}'; end if;
  if private.application_trim(profile->>'university')='' then errors := errors || '{"university":"Choose your university."}'; end if;
  if profile->>'university'='Other' and private.application_trim(profile->>'otherUniversity')='' then errors := errors || '{"otherUniversity":"Enter your university name."}'; end if;
  if private.application_trim(profile->>'program')='' then errors := errors || '{"program":"Enter your degree or program."}'; end if;
  if profile->>'programLevel' not in ('undergraduate','postgraduate','other') then errors := errors || '{"programLevel":"Choose your program level."}'; end if;
  if profile->>'year' not in ('1','2','3','4','5','6+','other') then errors := errors || '{"year":"Choose your current academic year."}'; end if;
  if profile->>'year'='other' and private.application_trim(profile->>'yearExplanation')='' then errors := errors || '{"yearExplanation":"Tell us your academic standing."}'; end if;
  if profile->>'enrolled'<>'true' then errors := errors || '{"enrolled":"Confirm that you are currently enrolled."}'; end if;
  if p->>'track'='CORE_TEAM' and (profile->>'enrolled'<>'true' or profile->>'programLevel'<>'undergraduate' or profile->>'year' not in ('1','2')) then errors := errors || '{"eligibility":"Core Team requires an enrolled first- or second-year undergraduate."}'; end if;
  if not exists(select 1 from public.draft_opportunities o where o.id=p->>'opportunityId' and o.track=p->>'track') then errors := errors || '{"opportunityId":"Choose an opportunity in your selected track."}'; end if;
  if jsonb_array_length(profile->'availability')=0 then errors := errors || '{"availabilityDays":"Choose at least one available day."}'; end if;
  for q in select * from (values ('motivation',1,150),('collaboration',1,150),('scenario',1,150)) as limits(id,minimum,maximum) loop
    words := private.application_word_count(p->'answers'->>q.id);
    if words<q.minimum or words>q.maximum then errors := errors || jsonb_build_object(q.id,format('Write %s–%s words. You currently have %s.',q.minimum,q.maximum,words)); end if;
  end loop;
  if p->>'scenarioReviewedOpportunityId' is distinct from p->>'opportunityId' then errors := errors || '{"scenarioReviewedOpportunityId":"Confirm that you reviewed your scenario response for this opportunity."}'; end if;
  if p->>'accuracy'<>'true' then errors := errors || '{"accuracy":"Confirm that your application is accurate."}'; end if;
  return errors;
end;
$$;


-- Required resume links apply only to fresh submissions. No existing rows change.
create or replace function public.submit_applicant_application(p_expected_version integer,p_mutation_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid; draft public.applicant_drafts; a public.applications; settings public.recruitment_settings;
  snapshot jsonb; errors jsonb; constraint_name text; attempt integer;
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

-- A single read snapshot supplies the complete filtered allowlisted export.
-- No table grants, stored files, applicant data or workflow settings change.
create or replace function public.admin_application_export(p_filters jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  search text; state text; filter_track text; opportunity text; assignment text; review text; filters jsonb; result jsonb;
begin
  perform private.require_staff_admin();
  if jsonb_typeof(p_filters) is distinct from 'object' or octet_length(p_filters::text)>2048 then
    raise exception using errcode='22023',message='Invalid application queue request'; end if;
  if exists(select 1 from jsonb_each(p_filters) f where f.key not in ('search','status','track','opportunityId','assignment','review') or jsonb_typeof(f.value)<>'string') then
    raise exception using errcode='22023',message='Invalid application queue filters'; end if;
  search:=coalesce(p_filters->>'search',''); state:=coalesce(p_filters->>'status','all'); filter_track:=coalesce(p_filters->>'track','all');
  opportunity:=coalesce(p_filters->>'opportunityId',''); assignment:=coalesce(p_filters->>'assignment','all'); review:=coalesce(p_filters->>'review','all');
  if char_length(search)>100 or state not in ('all','Submitted','Under Review','Accepted','Waitlisted','Not Selected','Withdrawn')
    or filter_track not in ('all','CORE_TEAM','COMMITTEE') or assignment not in ('all','assigned','unassigned') or review not in ('all','saved','missing')
    or (opportunity<>'' and not exists(select 1 from public.draft_opportunities d where d.id=opportunity and (filter_track='all' or d.track=filter_track))) then
    raise exception using errcode='22023',message='Invalid status, track, opportunity, assignment or review filter'; end if;
  filters:=jsonb_build_object('search',search,'status',state,'track',filter_track,'opportunityId',opportunity,'assignment',assignment,'review',review);
  with matching as materialized (
    select a.id,a.submitted_at,jsonb_build_object(
      'reference',a.reference,'email',a.email,'status',a.status,'submittedAt',a.submitted_at,'withdrawnAt',a.withdrawn_at,
      'formVersion',coalesce((a.data->>'formVersion')::int,1),'profile',a.data->'profile','track',a.data->>'track','opportunityId',a.data->>'opportunityId','answers',a.data->'answers',
      'accuracy',a.data->'accuracy','processingConsent',a.data->'processingConsent','updatesConsent',a.data->'updatesConsent') as row
    from public.applications a join public.draft_opportunities d on d.id=a.data->>'opportunityId'
    left join public.evaluation_assignments s on s.application_id=a.id and s.superseded_at is null
    left join public.evaluation_reviews r on r.assignment_id=s.id
    where (search='' or position(lower(search) in lower(a.reference||' '||a.email||' '||coalesce(a.data->'profile'->>'fullName','')))>0)
      and (state='all' or a.status=state) and (filter_track='all' or d.track=filter_track) and (opportunity='' or d.id=opportunity)
      and (assignment='all' or assignment='assigned' and s.id is not null or assignment='unassigned' and s.id is null)
      and (review='all' or review='saved' and r.assignment_id is not null or review='missing' and r.assignment_id is null)
  ), stats as (
    select count(*) as total,coalesce(sum(octet_length(row::text)+1),0) as bytes from matching
  )
  select case when stats.bytes>67108864 then null else jsonb_build_object(
    'filters',filters,'generatedAt',statement_timestamp(),'total',stats.total,
    'rows',(select coalesce(jsonb_agg(row order by submitted_at desc,id desc),'[]'::jsonb) from matching)) end into result from stats;
  if result is null then raise exception using errcode='PT413',message='Export is too large; narrow the queue filters'; end if;
  return result;
end;
$$;
revoke all on function public.admin_application_export(jsonb) from public,anon;
grant execute on function public.admin_application_export(jsonb) to authenticated;

revoke all on function private.valid_draft_payload_v1(jsonb),private.submission_errors_v1(jsonb) from public,anon,authenticated;

-- Monotonic upgrades: completed v1 receipts are still checked first.
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
  if exists(select 1 from public.applications where owner_id=actor) then raise exception using errcode='PT410',message='Application already submitted'; end if;
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
