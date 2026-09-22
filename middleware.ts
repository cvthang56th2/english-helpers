import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/login",
});

export const config = {
  matcher: [
    /*
     * Protect app pages. Word APIs return JSON 401 via getAuthedUser
     * so the Chrome extension is not redirected to HTML login.
     */
    "/",
  ],
};
