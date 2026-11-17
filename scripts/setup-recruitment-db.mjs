import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const directory = new URL('../src/recruitment/supabase/migrations/', import.meta.url);
const files = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
// Run as one transaction. Refuse collisions before any DDL is applied.
const guard = `do $$ begin
 if exists(select 1 from information_schema.tables where table_schema='public' and table_name in ('applicant_drafts','staff_memberships','applications','alpha_members')) then
 raise exception 'Recruitment objects already exist. Reconcile the live migration ledger before setup.'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private') then
 raise exception 'Existing private functions require manual grant review before recruitment setup.'; end if;
 end $$;`;
const sql = 'begin;\n' + guard + '\n' + (await Promise.all(files.map(file => readFile(new URL(file, directory), 'utf8')))).join('\n') + '\ncommit;\n';
if (!process.argv.includes('--apply')) {
 process.stdout.write(sql);
} else {
 if (!process.env.RECRUITMENT_SETUP_DATABASE_URL || !process.env.RECRUITMENT_SETUP_PROJECT_REF) throw new Error('Set RECRUITMENT_SETUP_DATABASE_URL and the verified main-site RECRUITMENT_SETUP_PROJECT_REF.');
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
 if (!url || new URL(url).hostname !== process.env.RECRUITMENT_SETUP_PROJECT_REF + '.supabase.co') throw new Error('Main-site Supabase project identity does not match the setup target.');
 const connection = new URL(process.env.RECRUITMENT_SETUP_DATABASE_URL);
 if (![connection.hostname, decodeURIComponent(connection.username)].some(value => value.includes(process.env.RECRUITMENT_SETUP_PROJECT_REF))) throw new Error('Database connection does not identify the selected main-site project.');
 const result = spawnSync('psql', ['--no-psqlrc', '--set=ON_ERROR_STOP=1'], {input: sql, env:{...process.env, PGDATABASE:process.env.RECRUITMENT_SETUP_DATABASE_URL}, encoding:'utf8', stdio:['pipe','inherit','inherit']});
 if (result.error) throw result.error;
 process.exitCode = result.status ?? 1;
}
