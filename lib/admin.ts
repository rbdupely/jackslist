// Admin gate. Emails listed in ADMIN_EMAILS (comma-separated) may reach /admin
// and mutate request status. Checked server-side in every admin action.

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && adminEmails().includes(email.toLowerCase());
}
