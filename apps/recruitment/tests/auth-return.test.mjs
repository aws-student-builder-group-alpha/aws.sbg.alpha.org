import assert from "node:assert/strict";
import test from "node:test";
import { authReturnPath } from "../lib/auth-return.ts";
import { createAuthCallback } from "./fixtures/staff-http-runtime.mjs";

test("OAuth return keeps the selected role through success, failure and unavailable setup", () => {
  assert.equal(authReturnPath("apply", "core-finance"), "/opportunities?opportunity=core-finance");
  assert.equal(authReturnPath("apply", "core-finance", "failed"), "/opportunities?opportunity=core-finance&auth=failed");
  assert.equal(authReturnPath("apply", "core-finance", "unconfigured"), "/opportunities?opportunity=core-finance&auth=unconfigured");
});

test("OAuth return drops unknown role IDs and keeps the staff route separate", () => {
  assert.equal(authReturnPath("apply", "//other.example", "failed"), "/opportunities?auth=failed");
  assert.equal(authReturnPath("apply", ["core-finance"]), "/opportunities");
  assert.equal(authReturnPath("staff", "core-finance"), "/staff");
  assert.equal(authReturnPath("staff", "core-finance", "failed"), "/staff?auth=failed");
  assert.equal(authReturnPath("membership", "core-finance"), "/membership");
  assert.equal(authReturnPath("membership", "//other.example", "failed"), "/membership?auth=failed");
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
  const result = await GET(new Request("https://untrusted.example/auth/callback?code=synthetic-code"));
  assert.equal(exchangedCode, "synthetic-code");
  assert.equal(result.status, 307);
  assert.equal(result.headers.get("location"), origin + "/opportunities?opportunity=core-finance&auth=failed");
  assert.equal(result.headers.get("cache-control"), "private, no-store");
  assert.equal(context.size, 0);
});


test('a successful Google return routes an existing member to membership instead of an application',async()=>{
 const context=new Map([['alpha-auth-destination','apply'],['alpha-opportunity','core-finance']]);
 const {GET}=await createAuthCallback({origin:'https://recruitment.example.test',cookieStore:{get:key=>({value:context.get(key)}),delete:key=>context.delete(key)},client:{auth:{exchangeCodeForSession:async()=>({error:null})},rpc:async()=>({data:{id:'ALPHA-2026-000000000001',full_name:'Builder',position:'Member',joined_on:'2026-11-01',photo_path:null,status:'active',version:1},error:null})}});
 const response=await GET(new Request('https://recruitment.example.test/auth/callback?code=synthetic'));
 assert.equal(response.headers.get('location'),'https://recruitment.example.test/membership');assert.equal(context.size,0);
});
