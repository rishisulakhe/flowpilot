import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const { pathname } = request.nextUrl;
  const isPublicPath = pathname === "/sign-in" || pathname === "/sign-up";
  const isApiAuth = pathname.startsWith("/api/auth");
  const isApi = pathname.startsWith("/api/");

  if (isApiAuth) {
    return NextResponse.next();
  }

  if (isApi && !session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (isApi) {
    return NextResponse.next();
  }

  if (!session && !isPublicPath) {
    const signInUrl = new URL("/sign-in", request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (session && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
