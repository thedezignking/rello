import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie on every matched request so Server
// Components and route handlers always see a valid token.
// Guests are allowed everywhere; pages that need a real account check it
// themselves. The one redirect is landing → /resumes for returning visitors.
export async function updateSession(request: NextRequest) {
  // A sign-in email link can land on the homepage with ?code=… (when the
  // callback URL isn't on Supabase's redirect allow-list). Hand it to the
  // callback so the sign-in still completes.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && searchParams.has("code")) {
    const to = request.nextUrl.clone();
    to.pathname = "/auth/callback";
    to.search = "";
    to.searchParams.set("code", searchParams.get("code")!);
    to.searchParams.set("next", "/resumes");
    return NextResponse.redirect(to);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Must run before anything else touches the response.
  const { data } = await supabase.auth.getClaims();

  // The landing page is for new visitors. Anyone with a session — signed in,
  // or a guest who has already started — goes straight to their resumes.
  // ?home lets signed-in people open the landing page on purpose (footer link).
  const { searchParams: q } = request.nextUrl;
  if (data?.claims && request.nextUrl.pathname === "/" && !q.has("auth") && !q.has("home")) {
    const to = request.nextUrl.clone();
    to.pathname = "/resumes";
    const redirect = NextResponse.redirect(to);
    // Keep any refreshed session cookies.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}
