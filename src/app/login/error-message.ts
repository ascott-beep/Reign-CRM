/** Maps a `?error=` query param (from a redirect in auth.ts, or NextAuth's own) to section 9.2 copy. */
export function loginErrorMessage(error: string | undefined): string | null {
  if (!error) return null;
  if (error === "NotSetUp") return "This account isn't set up yet. Ask an administrator to invite you.";
  return "Sign in failed. Please try again.";
}
