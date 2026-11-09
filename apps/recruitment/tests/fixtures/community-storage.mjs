// Synthetic Storage metadata only. No hosted objects or Storage API calls.
export async function communityStorage(db) {
  await db.exec(`create role service_role bypassrls; create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(bucket_id text,name text,metadata jsonb);
    create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:cardinality(string_to_array(name,'/'))-1]$$;
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated; grant select,insert,delete on storage.objects to authenticated;`);
}
export async function enrollmentFixture(db, owner) {
  const path=owner+'/'+crypto.randomUUID()+'.pdf';
  await db.query("insert into storage.objects values('alpha-enrollment',$1,'{\"size\":100,\"mimetype\":\"application/pdf\"}')",[path]);
  await db.query("insert into public.enrollment_documents(owner_id,path,filename,mime_type,size_bytes) values($1,$2,'Synthetic enrollment.pdf','application/pdf',100)",[owner,path]);
}
