import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/login",
});

export const config = {
  matcher: [
    /*
     * Protect app pages & word APIs. Leave auth + lookup public.
     */
    "/",
    "/api/words/:path*",
  ],
};
