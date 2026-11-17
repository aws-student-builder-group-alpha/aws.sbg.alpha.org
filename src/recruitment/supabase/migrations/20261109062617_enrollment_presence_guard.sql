-- Registration metadata alone is not sufficient: the private object must still exist.
create or replace function private.alpha_require_enrollment() returns trigger language plpgsql security definer set search_path='' as $$
declare document public.enrollment_documents;
begin
 select * into document from public.enrollment_documents where owner_id=new.owner_id and application_id is null for update;
 if not found or not exists(select 1 from storage.objects where bucket_id='alpha-enrollment' and name=document.path
   and (metadata->>'size')::bigint=document.size_bytes and metadata->>'mimetype'=document.mime_type) then
  raise exception using errcode='PT422',message='Proof of enrollment is required',detail='{"proofOfEnrollment":"Upload your current registration form or official enrollment certificate before submitting."}';
 end if;
 return new;
end; $$;
revoke all on function private.alpha_require_enrollment() from public,anon,authenticated;
drop policy alpha_enrollment_delete on storage.objects;
create policy alpha_enrollment_delete on storage.objects for delete to authenticated using(
 bucket_id='alpha-enrollment' and (storage.foldername(name))[1]=auth.uid()::text
 and not exists(select 1 from public.enrollment_documents d where d.path=name)
);
