import { NextResponse } from "next/server";
export function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = "/auth/callback";
  return NextResponse.redirect(url, { headers: { "Cache-Control": "private, no-store" } });
}
