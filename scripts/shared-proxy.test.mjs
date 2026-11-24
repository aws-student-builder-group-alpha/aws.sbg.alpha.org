import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {getMainSupabaseConfig,getSupabaseConfig,recruitmentAuthCookies} from '../src/recruitment/lib/supabase/config.ts';
const require=createRequire(import.meta.url);
const {loadBindings,transform}=require('next/dist/build/swc');
test('the proxy selects separate project sessions and applies recruitment role checks only to recruitment routes',async()=>{
 await loadBindings();
 const {code}=await transform(await readFile(new URL('../src/proxy.ts',import.meta.url),'utf8'),{filename:'proxy.ts',jsc:{parser:{syntax:'typescript'}},module:{type:'commonjs'}});
 let reads=0, recruitmentConfigured=true;
 const main={url:'https://main.example.test',key:'sb_publishable_main'};
 const recruitment={url:'https://recruitment.example.test',key:'sb_publishable_recruitment'};
 const connections=[];
 const client={auth:{getClaims:async()=>({}),getUser:async()=>({data:{user:{id:'synthetic',email_confirmed_at:'2026-01-01',identities:[{provider:'google'}]}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>{reads++;return {data:{role:'evaluator',status:'active'}};}})})})};
 const deps={'@supabase/ssr':{createServerClient:(url,key,options)=>{connections.push({url,key,cookies:options.cookieOptions});return client}},'next/server':require('next/server'),'@/recruitment/lib/supabase/config':{getMainSupabaseConfig:()=>main,getSupabaseConfig:()=>recruitmentConfigured?recruitment:null,recruitmentAuthCookies,getAppOrigin:()=> 'https://alpha.example.test'},'@/recruitment/lib/site-paths':{recruitmentBasePath:'/recruitment',recruitmentPath:p=>p}};
 const compiled={exports:{}};new Function('require','module','exports',code)(name=>deps[name],compiled,compiled.exports);
 const {NextRequest}=require('next/server');
 const {unstable_doesMiddlewareMatch}=require('next/experimental/testing/server');
 for (const url of ['/media/scd-hero.mp4','/media/scd-hero-mobile.mp4']) {
  assert.equal(unstable_doesMiddlewareMatch({config:compiled.exports.config,url}),false);
 }
 for (const url of ['/recruitment/admin','/recruitment/api/community/file','/media/other.mp4']) {
  assert.equal(unstable_doesMiddlewareMatch({config:compiled.exports.config,url}),true);
 }
 assert.equal((await compiled.exports.proxy(new NextRequest('https://alpha.example.test/recruitment/admin'))).status,404);
 assert.equal(reads,1);
 assert.equal((await compiled.exports.proxy(new NextRequest('https://alpha.example.test/admin'))).status,200);
 assert.equal(reads,1);
 await compiled.exports.proxy(new NextRequest('https://alpha.example.test/recruitment'));
 await compiled.exports.proxy(new NextRequest('https://alpha.example.test/recruitment/auth/callback'));
 recruitmentConfigured=false;
 await compiled.exports.proxy(new NextRequest('https://alpha.example.test/recruitment/api/opportunities'));
 assert.deepEqual(connections,[{...recruitment,cookies:recruitmentAuthCookies},{...main,cookies:undefined},{...recruitment,cookies:recruitmentAuthCookies},{...recruitment,cookies:recruitmentAuthCookies}]);
});

test('main credentials never substitute for missing or rejected recruitment credentials',()=>{
 const original=process.env;
 try {
  process.env={NEXT_PUBLIC_SUPABASE_URL:'https://main.example.test',NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_main'};
  assert.equal(getMainSupabaseConfig()?.url,'https://main.example.test');
  assert.equal(getSupabaseConfig(),null);
  process.env.RECRUITMENT_SUPABASE_URL='https://recruitment.example.test';
  process.env.RECRUITMENT_SUPABASE_PUBLISHABLE_KEY='sb_secret_example';
  assert.equal(getSupabaseConfig(),null);
  process.env.RECRUITMENT_SUPABASE_PUBLISHABLE_KEY='sb_publishable_recruitment';
  assert.equal(getSupabaseConfig()?.url,'https://recruitment.example.test');
 } finally { process.env=original; }
});
