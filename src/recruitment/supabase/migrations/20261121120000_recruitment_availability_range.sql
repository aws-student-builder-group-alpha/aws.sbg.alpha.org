-- Allow a date range and daily time window in v2 drafts. Keep legacy weekday arrays and snapshots valid.
-- Shape validation allows incomplete ranges so autosave can retain work in progress.

begin;

create or replace function public.valid_draft_payload(p jsonb)
returns boolean language plpgsql stable set search_path = '' as $$
declare
  item record;
  expected text[] := array['profile','track','opportunityId','answers','resumeUrl','portfolioUrl','accuracy','processingConsent','updatesConsent','stage'];
  profile_keys text[] := array['fullName','preferredName','mobile','university','otherUniversity','campus','program','programLevel','year','yearExplanation','enrolled','availability','experience'];
  question_keys text[] := array['motivation','collaboration','availability','pathway','scenario'];
  limits jsonb := '{"fullName":120,"preferredName":60,"mobile":32,"university":160,"otherUniversity":160,"campus":120,"program":160,"programLevel":20,"year":10,"yearExplanation":160,"experience":2000}';
  k text;
  availability jsonb := p #> '{profile,availability}';
  has_range boolean := p->'formVersion' = '2'::jsonb and jsonb_typeof(availability) = 'object';
  availability_keys text[] := array['startDate','endDate','startTime','endTime'];
  field_value text;
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
  if has_range then
    if not availability ?& availability_keys
      or exists(select 1 from jsonb_object_keys(availability) x where not x = any(availability_keys)) then return false; end if;
    foreach k in array availability_keys loop
      if jsonb_typeof(availability->k) is distinct from 'string' then return false; end if;
      field_value := availability->>k;
      if field_value = '' then continue; end if;
      if k in ('startDate','endDate') then
        if field_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or left(field_value,4) = '0000' then return false; end if;
        begin
          if to_char(field_value::date,'YYYY-MM-DD') <> field_value then return false; end if;
        exception when datetime_field_overflow or invalid_datetime_format then
          return false;
        end;
      elsif field_value !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then return false;
      end if;
    end loop;
  else
    if jsonb_typeof(p->'profile'->'availability') is distinct from 'array' then return false; end if;
    if jsonb_array_length(p->'profile'->'availability') > 7 then return false; end if;
    if exists(select 1 from jsonb_array_elements(p->'profile'->'availability') d where jsonb_typeof(d) <> 'string' or d #>> '{}' not in ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')) then return false; end if;
    if (select count(*) from jsonb_array_elements(p->'profile'->'availability')) <> (select count(distinct d) from jsonb_array_elements(p->'profile'->'availability') d) then return false; end if;
  end if;
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

create or replace function private.submission_errors(p jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare errors jsonb := '{}'; profile jsonb := p->'profile'; q record; words integer; availability jsonb := profile->'availability';
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
  if jsonb_typeof(availability)='object' then
    if '' in (availability->>'startDate',availability->>'endDate',availability->>'startTime',availability->>'endTime') then
      errors := errors || '{"availabilityDays":"Choose a start and end date and time."}';
    elsif (availability->>'endDate')::date < (availability->>'startDate')::date then
      errors := errors || '{"availabilityDays":"Choose an end date on or after the start date."}';
    elsif (availability->>'endTime')::time <= (availability->>'startTime')::time then
      errors := errors || '{"availabilityDays":"Choose an end time after the start time."}';
    elsif availability->>'startTime' < '07:00' or availability->>'startTime' >= '22:00'
      or availability->>'endTime' <= '07:00' or availability->>'endTime' > '22:00' then
      errors := errors || '{"availabilityDays":"Choose hours between 7:00 AM and 10:00 PM."}';
    end if;
  elsif jsonb_array_length(availability)=0 then
    errors := errors || '{"availabilityDays":"Choose a start and end date and time."}';
  end if;
  for q in select * from (values ('motivation',1,150),('collaboration',1,150),('scenario',1,150)) as limits(id,minimum,maximum) loop
    words := private.application_word_count(p->'answers'->>q.id);
    if words<q.minimum or words>q.maximum then errors := errors || jsonb_build_object(q.id,format('Write %s–%s words. You currently have %s.',q.minimum,q.maximum,words)); end if;
  end loop;
  if p->>'scenarioReviewedOpportunityId' is distinct from p->>'opportunityId' then errors := errors || '{"scenarioReviewedOpportunityId":"Confirm that you reviewed your scenario response for this opportunity."}'; end if;
  if p->>'accuracy'<>'true' then errors := errors || '{"accuracy":"Confirm that your application is accurate."}'; end if;
  return errors;
end;
$$;

commit;
