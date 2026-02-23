import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isAuth = !!token;
        const isAdmin = token?.role === "ADMIN";
        const pathname = req.nextUrl.pathname;

        if (pathname.startsWith("/admin") && !isAdmin) {
            if (isAuth) {
                return NextResponse.redirect(new URL("/user", req.url));
            }
            return NextResponse.redirect(new URL("/login", req.url));
        }

        if (pathname.startsWith("/user") && !isAuth) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: () => true, // We handle authorization in the middleware function above so it executes for all matching paths
        },
    }
);

export const config = {
    matcher: ["/admin/:path*", "/user/:path*"],
};
