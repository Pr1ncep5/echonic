import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// /monitoring is the Sentry tunnel: browser errors on the sign-in pages must get through.
// /api/cron authenticates with its own bearer token.
const publicRoutes = ["/auth", "/api/auth", "/api/cron", "/monitoring"];

const isMatch = (pathname: string, routes: string[]) => {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isMatch(pathname, publicRoutes)) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Specify the routes the middleware applies to
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
