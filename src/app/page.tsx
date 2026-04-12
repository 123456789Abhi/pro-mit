import { redirect } from "next/navigation";

/**
 * Root page — middleware handles redirect based on auth state.
 * If authenticated: redirects to role-specific panel.
 * If not: redirects to /auth/login.
 */
export default function RootPage() {
  redirect("/auth/login");
}
