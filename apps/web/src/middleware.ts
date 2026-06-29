import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isManagerRoute = createRouteMatcher(["/manager(.*)"]);
const isProtectedRoute = createRouteMatcher(["/account(.*)"]);

const STAFF_ROLES = [
  "super_admin",
  "pharmacist",
  "inventory_manager",
  "finance",
  "customer_support",
];

export default clerkMiddleware(async (auth, req) => {
  // Staff-only routes: /admin and /manager
  if (isAdminRoute(req) || isManagerRoute(req)) {
    const session = await auth.protect();
    const metadata = session.sessionClaims?.metadata as
      | { role?: string }
      | undefined;
    const role = metadata?.role;

    if (!role || !STAFF_ROLES.includes(role)) {
      // Not a staff user — redirect to storefront
      const url = new URL("/", req.url);
      url.searchParams.set("error", "unauthorized");
      return Response.redirect(url);
    }
    return;
  }

  // Customer account pages: require sign-in
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
