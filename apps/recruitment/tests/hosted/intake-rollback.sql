-- Dedicated development project only. Synthetic claims, never provider-session evidence.
-- Owner-reviewed probe: all settings, draft, history and receipt changes roll back.
begin;
set local statement_timeout='20s';
set local lock_timeout='3s';
do $$
declare administrator uuid; applicant uuid; draft public.applicant_drafts;
  original public.recruitment_settings; s jsonb; req jsonb; receipt jsonb; close_req jsonb;
  initial_events integer; now_events integer;
begin
  select * into strict original from public.recruitment_settings where id;
  select user_id into strict administrator from public.staff_memberships where role='administrator' and status='active';
  select d.* into strict draft from public.applicant_drafts d where not exists(select 1 from public.staff_memberships m where m.user_id=d.owner_id)
    and not exists(select 1 from public.applications a where a.owner_id=d.owner_id);
  applicant:=draft.owner_id;
  select count(*) into initial_events from public.intake_history;
  perform set_config('request.jwt.claim.sub',administrator::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',administrator,'aal','aal2')::text,true);
  set local role authenticated;
  s:=public.intake_state();
  if s->>'state'<>'open' or (s->>'accepting')::boolean then raise exception 'Expected original scheduled November state'; end if;
  begin perform 1 from public.recruitment_settings; raise exception 'Direct settings read unexpectedly allowed'; exception when insufficient_privilege then null; end;
  req:=jsonb_build_object('action','pause','expectedVersion',(s->>'version')::integer,'reason','Synthetic rollback-only intake check','mutationId',gen_random_uuid());
  receipt:=public.manage_intake(req);
  if public.manage_intake(req)<>receipt then raise exception 'Retry mismatch'; end if;
  begin perform public.manage_intake(req||jsonb_build_object('mutationId',gen_random_uuid())); raise exception 'Stale intake command unexpectedly allowed'; exception when sqlstate 'PT409' then null; end;
  begin perform public.manage_intake(req||jsonb_build_object('reason','Altered reason')); raise exception 'Changed retry unexpectedly allowed'; exception when invalid_parameter_value then null; end;
  perform set_config('request.jwt.claim.sub',applicant::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',applicant,'aal','aal1')::text,true);
  begin perform public.intake_history_page(); raise exception 'Applicant history unexpectedly allowed'; exception when insufficient_privilege then null; end;
  begin perform public.submit_applicant_application(draft.version,gen_random_uuid()); raise exception 'Paused submission unexpectedly allowed'; exception when sqlstate 'PT423' then null; end;
  perform public.save_applicant_draft(draft.data,draft.version,gen_random_uuid());
  s:=public.get_application_state();
  if s->'intake' ? 'reason' or s->'intake' ? 'version' or s->'intake' ? 'actor' then raise exception 'Applicant privacy failure'; end if;
  perform set_config('request.jwt.claim.sub',administrator::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',administrator,'aal','aal2')::text,true);
  s:=public.intake_state();
  perform public.manage_intake(jsonb_build_object('action','resume','expectedVersion',(s->>'version')::integer,'reason','Synthetic scheduled resume','mutationId',gen_random_uuid()));
  s:=public.intake_state();
  if (s->>'accepting')::boolean then raise exception 'Resume accepted before November'; end if;
  close_req:=jsonb_build_object('action','close','expectedVersion',(s->>'version')::integer,'reason','Synthetic final close','mutationId',gen_random_uuid());
  perform public.manage_intake(close_req);
  if public.manage_intake(req)<>receipt then raise exception 'Old retry changed after closure'; end if;
  s:=public.intake_state();
  if s->>'state'<>'closed' or (s->>'canResume')::boolean or (s->>'canPause')::boolean or (s->>'canClose')::boolean then raise exception 'Final closure flags incorrect'; end if;
  begin perform public.manage_intake(jsonb_build_object('action','resume','expectedVersion',(s->>'version')::integer,'reason','Should fail','mutationId',gen_random_uuid())); raise exception 'Reopening unexpectedly allowed'; exception when sqlstate 'PT409' then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',administrator,'aal','aal1')::text,true);
  begin perform public.manage_intake(req); raise exception 'AAL1 retry unexpectedly allowed'; exception when insufficient_privilege then null; end;
  reset role;
  if exists(select 1 from public.recruitment_settings where opens_at is distinct from original.opens_at or closes_at is distinct from original.closes_at or finalized_at is distinct from original.finalized_at) then raise exception 'Fixed dates changed'; end if;
  select count(*) into now_events from public.intake_history;
  if now_events<>initial_events+3 then raise exception 'Unexpected history count'; end if;
end;
$$;
select 'intake rollback-only assertions passed' as result;
rollback;
