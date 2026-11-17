import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {loadBindings,transform}=require('next/dist/build/swc');
test('recruitment role checks apply to namespaced routes and leave main administration independent',async()=>{
 await loadBindings();
 const {code}=await transform(await readFile(new URL('../src/proxy.ts',import.meta.url),'utf8'),{filename:'proxy.ts',jsc:{parser:{syntax:'typescript'}},module:{type:'commonjs'}});
 let reads=0;
 const client={auth:{getClaims:async()=>({}),getUser:async()=>({data:{user:{id:'synthetic',email_confirmed_at:'2026-01-01',identities:[{provider:'google'}]}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{reads++;return {data:{role:'evaluator',status:'active'}};}})})})};
 const deps={'@supabase/ssr':{createServerClient:()=>client},'next/server':require('next/server'),'@/recruitment/lib/supabase/config':{getSupabaseConfig:()=>({url:'https://example.test',key:'synthetic'}),getAppOrigin:()=> 'https://alpha.example.test'},'@/recruitment/lib/site-paths':{recruitmentBasePath:'/recruitment',recruitmentPath:p=>p}};
 const compiled={exports:{}};new Function('require','module','exports',code)(name=>deps[name],compiled,compiled.exports);
 const {NextRequest}=require('next/server');
 assert.equal((await compiled.exports.proxy(new NextRequest('https://alpha.example.test/recruitment/admin'))).status,404);
 assert.equal(reads,1);
 assert.equal((await compiled.exports.proxy(new NextRequest('https://alpha.example.test/admin'))).status,200);
 assert.equal(reads,1);
});
