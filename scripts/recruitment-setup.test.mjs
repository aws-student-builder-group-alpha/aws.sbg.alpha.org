import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {PGlite} from '@electric-sql/pglite';
import {communityStorage} from '../src/recruitment/tests/fixtures/community-storage.mjs';
test('fresh recruitment setup preserves existing main-site rows and refuses a second install',async()=>{
 const sql=execFileSync(process.execPath,['scripts/setup-recruitment-db.mjs'],{encoding:'utf8'});
 const db=new PGlite();
 try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
   create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
   create table auth.identities(user_id uuid,provider text);
   create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
   create function auth.jwt() returns jsonb language sql stable as $$select '{}'::jsonb$$;
   create table public.profiles(id uuid primary key,email text);
   insert into public.profiles values('00000000-0000-4000-8000-000000000001','preserved@example.test');`);
  await communityStorage(db);
  await db.exec(sql);
  assert.equal((await db.query('select email from public.profiles')).rows[0].email,'preserved@example.test');
  assert.equal((await db.query('select count(*)::int as total from public.applications')).rows[0].total,0);
  await assert.rejects(db.exec(sql),/Recruitment objects already exist/);
 } finally {await db.close();}
});
