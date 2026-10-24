import { NextResponse, type NextRequest } from "next/server";
import { readSessionToken, SESSION_COOKIE } from "@/lib/session";

export function proxy(request: NextRequest) {
  const userId = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };
