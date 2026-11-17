import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {loadBindings,transform}=require('next/dist/build/swc');
test('removing a Skillbuilder member preserves the shared Auth identity and recruitment data',async()=>{
 await loadBindings();
 const {code}=await transform(await readFile(new URL('../src/actions/delete-member.ts',import.meta.url),'utf8'),{filename:'delete-member.ts',jsc:{parser:{syntax:'typescript'}},module:{type:'commonjs'}});
 const mutations=[];
 const client={from:table=>({delete:()=>({eq:async(column,id)=>{mutations.push({table,column,id});return {error:null};}})}),auth:{admin:{deleteUser:()=>{throw Error('Shared identity must survive');}}}};
 const dependencies={zod:require('zod'),'@/actions/_auth-guards':{requireSuperAdminUserId:async()=> 'admin'},'@/services/supabase-admin.service':{getSupabaseAdminClient:()=>client}};
 const compiled={exports:{}};
 new Function('require','module','exports',code)(name=>dependencies[name],compiled,compiled.exports);
 const id=crypto.randomUUID();
 assert.equal((await compiled.exports.deleteMemberAction(id)).ok,true);
 assert.deepEqual(mutations.map(({table,column})=>[table,column]),[['module_submissions','user_id'],['module_progress','user_id'],['member_enrollments','user_id'],['profiles','id']]);
 assert.ok(mutations.every(row=>row.id===id));
});
