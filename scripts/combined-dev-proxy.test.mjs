import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { combinedNextArgs } from "./combined-next-args.mjs";
import { test } from "node:test";
import { createCombinedDevProxy } from "./combined-dev-proxy.mjs";

async function listen(server) { server.listen(0, "127.0.0.1"); await once(server, "listening"); return server.address().port; }
test("combined preview isolates HTTP and HMR WebSockets for both apps", async () => {
  const upstream = name => {
    const server = http.createServer((request, response) => response.end(name + request.url));
    server.on("upgrade", (_request, socket) => socket.end(`HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nX-App: ${name}\r\n\r\n`));
    return server;
  };
  const main = upstream("main"), recruitment = upstream("recruitment");
  const mainPort = await listen(main), recruitmentPort = await listen(recruitment);
  const proxy = createCombinedDevProxy({ mainPort, recruitmentPort });
  const port = await listen(proxy);
  try {
    for (const [path, app] of [["/", "main"], ["/recruitment/application?resume=1", "recruitment"], ["/recruitment/admin", "recruitment"], ["/recruitment/_next/static/test.js", "recruitment"], ["/_next/static/test.js", "main"], ["/brand/geist-latin.woff2", "recruitment"], ["/brand/urban-starblues.ttf?v=1", "recruitment"], ["/recruitment-other", "main"]]) {
      assert.equal(await (await fetch(`http://127.0.0.1:${port}${path}`)).text(), app + (path.startsWith("/brand/") ? "/recruitment" + path : path));
    }
    for (const [path, app] of [["/_next/webpack-hmr", "main"], ["/recruitment/_next/hmr?id=test", "recruitment"]]) {
      const result = await new Promise((resolve, reject) => {
        const request = http.request({ hostname: "127.0.0.1", port, path, headers: { Connection: "Upgrade", Upgrade: "websocket" } });
        request.on("upgrade", (response, socket) => { socket.destroy(); resolve(response.headers["x-app"]); });
        request.on("error", reject); request.end();
      });
      assert.equal(result, app);
    }
  } finally {
    for (const server of [proxy, main, recruitment]) { server.closeAllConnections(); server.close(); }
  }
});

test("combined launcher selects Webpack only for recruitment development", () => {
  assert.deepEqual(combinedNextArgs("dev", 4301, true), ["dev", "--webpack", "-H", "127.0.0.1", "-p", "4301"]);
  assert.deepEqual(combinedNextArgs("dev", 4302, false), ["dev", "-H", "127.0.0.1", "-p", "4302"]);
  for (const recruitment of [true, false]) {
    assert.deepEqual(combinedNextArgs("build", undefined, recruitment), ["build", "--webpack"]);
    assert.deepEqual(combinedNextArgs("start", 4301, recruitment), ["start", "-H", "127.0.0.1", "-p", "4301"]);
  }
});

test("combined preview canonicalizes document aliases without redirecting mutations or assets", async () => {
  let forwarded = 0;
  const upstream = http.createServer((request, response) => {
    forwarded++;
    response.end(JSON.stringify({ method: request.method, origin: request.headers.origin }));
  });
  const upstreamPort = await listen(upstream);
  const proxy = createCombinedDevProxy({ mainPort: upstreamPort, recruitmentPort: upstreamPort });
  const port = await listen(proxy);
  const request = (host, method = "GET", headers = {}, pathname = "/recruitment/apply?opportunity=core-finance&entry=1") => new Promise((resolve, reject) => {
    const call = http.request({ hostname: "127.0.0.1", port, path: pathname, method, headers: { host, ...headers } }, response => {
      let body = "";
      response.on("data", part => { body += part; });
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body }));
    });
    call.on("error", reject);call.end();
  });
  try {
    for (const alias of [`localhost:${port}`, `[::1]:${port}`]) for (const method of ["GET", "HEAD"]) {
      const response = await request(alias, method, { accept: "text/html" });
      assert.equal(response.status, 307);
      assert.equal(response.headers.location, `http://127.0.0.1:${port}/recruitment/apply?opportunity=core-finance&entry=1`);
      assert.equal(response.headers["cache-control"], "no-store");
    }
    assert.equal(forwarded, 0, "Alias documents redirect before reaching either app");
    assert.equal((await request(`localhost:${port}`, "GET", { "sec-fetch-dest": "document" }, "/")).status, 307);
    assert.equal((await request(`127.0.0.1:${port}`, "GET", { accept: "text/html" })).status, 200);
    assert.equal((await request(`untrusted.example:${port}`, "GET", { accept: "text/html" })).headers.location, undefined);
    assert.equal((await request(`localhost:${port}`, "GET", { "sec-fetch-dest": "script", accept: "text/html" }, "/recruitment/_next/static/test.js")).status, 200);
    assert.equal((await request(`localhost:${port}`, "GET", { "sec-fetch-dest": "empty", accept: "text/html" }, "/recruitment/api/application")).status, 200);
    const mutation = await request(`localhost:${port}`, "POST", { origin: `http://localhost:${port}`, accept: "text/html" });
    assert.equal(mutation.status, 200);
    assert.deepEqual(JSON.parse(mutation.body), { method: "POST", origin: `http://localhost:${port}` });
  } finally {
    for (const server of [proxy, upstream]) { server.closeAllConnections();server.close(); }
  }
});
