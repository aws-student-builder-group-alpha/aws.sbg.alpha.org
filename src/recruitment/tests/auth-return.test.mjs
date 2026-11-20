import assert from "node:assert/strict";
import test from "node:test";
import { authReturnPath } from "../lib/auth-return.ts";
import { createAuthCallback, createMainAuthCallback } from "./fixtures/staff-http-runtime.mjs";

test("OAuth return keeps the selected role through success, failure and unavailable setup", () => {
  assert.equal(authReturnPath("apply", "core-finance"), "/recruitment/opportunities?opportunity=core-finance");
  assert.equal(authReturnPath("apply", "core-finance", "failed"), "/recruitment/opportunities?opportunity=core-finance&auth=failed");
  assert.equal(authReturnPath("apply", "core-finance", "unconfigured"), "/recruitment/opportunities?opportunity=core-finance&auth=unconfigured");
});

test("OAuth return drops unknown role IDs and keeps the staff route separate", () => {
  assert.equal(authReturnPath("apply", "//other.example", "failed"), "/recruitment/opportunities?auth=failed");
  assert.equal(authReturnPath("apply", ["core-finance"]), "/recruitment/opportunities");
  assert.equal(authReturnPath("staff", "core-finance"), "/recruitment/staff");
  assert.equal(authReturnPath("staff", "core-finance", "failed"), "/recruitment/staff?auth=failed");
  assert.equal(authReturnPath("membership", "core-finance"), "/recruitment/membership");
  assert.equal(authReturnPath("membership", "//other.example", "failed"), "/recruitment/membership?auth=failed");
});

test("failed code exchange returns to the selected role and consumes the callback context", async () => {
  const origin = "https://recruitment.example.test";
  const context = new Map([["alpha-opportunity", "core-finance"], ["alpha-auth-destination", "apply"]]);
  let exchangedCode;
  const { GET } = await createAuthCallback({
    origin,
    cookieStore: { get: key => ({ value: context.get(key) }), delete: key => context.delete(key) },
    client: { auth: { exchangeCodeForSession: async code => {
      exchangedCode = code;
      return { error: new Error("Exchange rejected") };
    } } },
  });
  const result = await GET(new Request("https://untrusted.example/recruitment/auth/callback?code=synthetic-code"));
  assert.equal(exchangedCode, "synthetic-code");
  assert.equal(result.status, 307);
  assert.equal(result.headers.get("location"), origin + "/recruitment/opportunities?opportunity=core-finance&auth=failed");
  assert.equal(result.headers.get("cache-control"), "private, no-store");
  assert.equal(context.size, 0);
});


test('a successful Google return routes an existing member to membership instead of an application',async()=>{
 const context=new Map([['alpha-auth-destination','apply'],['alpha-opportunity','core-finance']]);
 const {GET}=await createAuthCallback({origin:'https://recruitment.example.test',cookieStore:{get:key=>({value:context.get(key)}),delete:key=>context.delete(key)},client:{auth:{exchangeCodeForSession:async()=>({error:null})},rpc:async()=>({data:{id:'ALPHA-2026-000000000001',full_name:'Builder',position:'Member',joined_on:'2026-11-01',photo_path:null,status:'active',version:1},error:null})}});
 const response=await GET(new Request('https://recruitment.example.test/recruitment/auth/callback?code=synthetic'));
 assert.equal(response.headers.get('location'),'https://recruitment.example.test/recruitment/membership');assert.equal(context.size,0);
});

test("Recruitment callback reports missing Recruitment configuration on the selected route", async () => {
  const context = new Map([["alpha-auth-destination", "staff"]]);
  const cookieStore = { get: key => ({ value: context.get(key) }), delete: key => context.delete(key) };
  const origin = "https://alpha.example.test";
  const { GET } = await createAuthCallback({ origin, cookieStore, client: null });
  const result = await GET(new Request(origin + "/recruitment/auth/callback?code=synthetic"));
  assert.equal(result.headers.get("location"), origin + "/recruitment/staff?auth=unconfigured");
  assert.equal(context.size, 0);
});

test('Skillbuilder callback preserves an internal return destination and rejects external redirects', async () => {
 const client={auth:{exchangeCodeForSession:async()=>({error:null})}};
 const {GET}=await createMainAuthCallback({origin:'https://alpha.example.test',client});
 const internal=await GET(new Request('https://alpha.example.test/auth/callback?code=synthetic&next=%2Frecruitment%2Fstaff'));
 assert.equal(internal.headers.get('location'),'https://alpha.example.test/recruitment/staff');
 const external=await GET(new Request('https://alpha.example.test/auth/callback?code=synthetic&next=https%3A%2F%2Fother.example'));
 assert.equal(external.headers.get('location'),'https://alpha.example.test/skillbuilder/dashboard');
});
