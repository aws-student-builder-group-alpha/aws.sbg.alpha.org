import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const program = `
try {
  const { default: config } = await import(${JSON.stringify(new URL("../next.config.ts", import.meta.url).href)});
  const site = await import(${JSON.stringify(new URL("../src/lib/recruitment.ts", import.meta.url).href)});
  const recruitment = await import(${JSON.stringify(new URL("../apps/recruitment/lib/site-paths.ts", import.meta.url).href)});
  console.log(JSON.stringify({
    preview: site.COMBINED_PREVIEW, combined: site.COMBINED_SITE, url: site.RECRUITMENT_URL,
    basePath: recruitment.recruitmentBasePath, home: recruitment.alphaSiteOrigin,
    distDir: config.distDir, rewrites: config.rewrites ? await config.rewrites() : null,
    redirects: config.redirects ? await config.redirects() : [],
  }));
} catch (error) { console.log(JSON.stringify({ error: error.message })); process.exitCode = 1; }
`;

function configuration(values = {}) {
  const result = spawnSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", program], {
    cwd: root, encoding: "utf8",
    env: {
      ...process.env, NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW: "", NEXT_PUBLIC_ALPHA_COMBINED_SITE: "",
      NEXT_PUBLIC_ENABLE_STATIC_EXPORT: "", ALPHA_RECRUITMENT_ORIGIN: "", ...values,
    },
  });
  assert.ok(result.stdout.trim(), result.stderr);
  return { status: result.status, ...JSON.parse(result.stdout.trim()) };
}

test("standalone sites retain their current routes until production integration is configured", () => {
  const result = configuration();
  assert.equal(result.status, 0);
  assert.equal(result.url, "https://aws-recruitment.vercel.app");
  assert.equal(result.basePath, "");
  assert.equal(result.rewrites, null);
});

test("local combined preview retains the localhost proxy and namespaced recruitment assets", () => {
  const result = configuration({ NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW: "1" });
  assert.equal(result.status, 0);
  assert.equal(result.preview, true);
  assert.equal(result.url, "/recruitment");
  assert.equal(result.basePath, "/recruitment");
  assert.equal(result.distDir, "build/combined");
  assert.deepEqual(result.redirects, []);
  assert.equal(result.rewrites.beforeFiles[0].destination, "http://127.0.0.1:4301/recruitment/:path*");
});

test("production shares Alpha's domain without enabling preview session shortcuts", () => {
  const result = configuration({ NEXT_PUBLIC_ALPHA_COMBINED_SITE: "1", ALPHA_RECRUITMENT_ORIGIN: "https://alpha-recruitment.example.test/" });
  assert.equal(result.status, 0);
  assert.equal(result.preview, false);
  assert.equal(result.combined, true);
  assert.equal(result.url, "/recruitment");
  assert.equal(result.basePath, "/recruitment");
  assert.equal(result.home, "");
  assert.equal(result.distDir, ".next");
  assert.deepEqual(result.redirects, [{
    source: "/recruitment/:path*", has: [{ type: "host", value: "(www\\.)?awsc-alpha\\.cloud" }],
    destination: "https://aws-sbg-alpha.vercel.app/recruitment/:path*", permanent: false,
  }]);
  assert.deepEqual(result.rewrites.beforeFiles, [
    { source: "/recruitment/:path*", destination: "https://alpha-recruitment.example.test/recruitment/:path*" },
    { source: "/brand/:font(geist-latin.woff2|urban-starblues.ttf)", destination: "https://alpha-recruitment.example.test/recruitment/brand/:font" },
  ]);
});

test("production refuses missing upstream configuration and incompatible static exports", () => {
  assert.match(configuration({ NEXT_PUBLIC_ALPHA_COMBINED_SITE: "1" }).error, /Set ALPHA_RECRUITMENT_ORIGIN/);
  const result = configuration({ NEXT_PUBLIC_ALPHA_COMBINED_SITE: "1", ALPHA_RECRUITMENT_ORIGIN: "https://alpha-recruitment.example.test", NEXT_PUBLIC_ENABLE_STATIC_EXPORT: "true" });
  assert.equal(result.status, 1);
  assert.match(result.error, /STATIC_EXPORT=false/);
});

test("Vercel build and runtime activate the same verified production routing", () => {
  const deployment = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(deployment.env, deployment.build.env);
  const result = configuration(deployment.build.env);
  assert.equal(result.status, 0);
  assert.equal(result.preview, false);
  assert.equal(result.url, "/recruitment");
  assert.equal(result.rewrites.beforeFiles[0].destination, "https://aws-alpha-recruitment.vercel.app/recruitment/:path*");
});

test("production rejects insecure, credential-bearing and recursive upstreams", () => {
  for (const origin of ["invalid", "http://alpha-recruitment.example.test", "https://user:password@alpha-recruitment.example.test", "https://alpha-recruitment.example.test/path", "https://alpha-recruitment.example.test?query=1", "https://alpha-recruitment.example.test#fragment", "https://127.0.0.1", "https://localhost", "https://www.awsc-alpha.cloud", "https://awsc-alpha.cloud", "https://aws-sbg-alpha.vercel.app"]) {
    const result = configuration({ NEXT_PUBLIC_ALPHA_COMBINED_SITE: "1", ALPHA_RECRUITMENT_ORIGIN: origin });
    assert.equal(result.status, 1, origin);
    assert.ok(result.error, origin);
  }
});
