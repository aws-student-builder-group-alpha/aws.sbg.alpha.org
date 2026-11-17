-- Dedicated development project: no raw applicant fields leave this transaction.
-- Constructed claims verify SQL access only, not real Google/MFA sessions.
begin read only;
set local statement_timeout='15s';
do $$
declare administrator uuid; nonstaff uuid; snapshot jsonb; queue jsonb;
begin
  select user_id into strict administrator from public.staff_memberships where role='administrator' and status='active';
  select id into nonstaff from auth.users u where not exists(select 1 from public.staff_memberships m where m.user_id=u.id) limit 1;
  perform set_config('request.jwt.claim.sub',administrator::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',administrator,'aal','aal2')::text,true);
  set local role authenticated;
  snapshot:=public.admin_application_export(); queue:=public.admin_application_queue();
  if (snapshot->>'total')::integer<>(queue->'queue'->>'total')::integer or jsonb_array_length(snapshot->'rows')<>(snapshot->>'total')::integer then raise exception 'Export/queue counts differ'; end if;
  if exists(select 1 from jsonb_array_elements(snapshot->'rows') r,jsonb_object_keys(r) k where k not in ('reference','email','status','submittedAt','withdrawnAt','profile','track','opportunityId','answers','accuracy','processingConsent','updatesConsent')) then raise exception 'Private export fields'; end if;
  if (public.admin_application_export('{"search":"synthetic-no-match-export-probe"}')->>'total')::integer<>0 then raise exception 'Expected empty search'; end if;
  begin perform public.admin_application_export('{"status":"Draft"}'); raise exception 'Draft filter allowed'; exception when invalid_parameter_value then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',administrator,'aal','aal1')::text,true);
  begin perform public.admin_application_export(); raise exception 'AAL1 allowed'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub',nonstaff::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',nonstaff,'aal','aal2')::text,true);
  begin perform public.admin_application_export(); raise exception 'Nonstaff allowed'; exception when insufficient_privilege then null; end;
  reset role;
  set local role anon;
  begin perform public.admin_application_export(); raise exception 'Anonymous allowed'; exception when insufficient_privilege then null; end;
end;
$$;
select 'export read-only assertions passed' as result;
rollback;
