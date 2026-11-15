import http from "node:http";
import httpProxy from "next/dist/compiled/http-proxy/index.js";

/** Keep each app's development protocol, including HMR, on its own server. */
export function createCombinedDevProxy({ mainPort = 4302, recruitmentPort = 4301 } = {}) {
  const proxy = httpProxy.createProxyServer({ ws: true });
  const target = request => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const font = /^\/brand\/(geist-latin\.woff2|urban-starblues\.ttf)$/.test(pathname);
    if (font) request.url = "/recruitment" + request.url;
    const recruitment = pathname === "/recruitment" || pathname.startsWith("/recruitment/") || font;
    return `http://127.0.0.1:${recruitment ? recruitmentPort : mainPort}`;
  };
  const server = http.createServer((request, response) => {
    const port = server.address().port;
    const host = request.headers.host?.toLowerCase();
    const destination = request.headers["sec-fetch-dest"];
    const document = destination ? destination === "document" : request.headers.accept?.includes("text/html");
    if (["GET", "HEAD"].includes(request.method) && document && [
      `localhost:${port}`, `[::1]:${port}`,
    ].includes(host)) {
      const url = new URL(request.url, "http://local.invalid");
      response.writeHead(307, {
        Location: `http://127.0.0.1:${port}${url.pathname}${url.search}`,
        "Cache-Control": "no-store",
      });
      response.end();
      return;
    }
    proxy.web(request, response, { target: target(request) });
  });
  server.on("upgrade", (request, socket, head) => proxy.ws(request, socket, head, { target: target(request) }));
  proxy.on("error", (_error, _request, response) => {
    if (response instanceof http.ServerResponse) {
      if (!response.headersSent) response.writeHead(502, { "Content-Type": "text/plain" });
      response.end("Local preview server unavailable. Please retry shortly.");
    } else response?.destroy();
  });
  server.on("close", () => proxy.close());
  return server;
}
