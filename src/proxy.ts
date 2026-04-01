import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const publicRoutes = ["/auth", "/api/auth"];

const isMatch = (pathname: string, routes: string[]) => {
    return routes.some((route) => pathname.startsWith(route));
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
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};