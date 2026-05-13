export type UserRole = "Admin" | "User";

const ADMIN_DOMAINS = ["@plannavigator.com", "@plannavigator.app"];

export function getUserEmail(email?: string): string {
  return (email || "").trim();
}

export function isAdminEmail(email?: string): boolean {
  if (typeof email !== "string") return false;
  const lowerEmail = email.toLowerCase();
  return ADMIN_DOMAINS.some(domain => lowerEmail.endsWith(domain));
}

export function getUserRole(email?: string): UserRole {
  return isAdminEmail(email) ? "Admin" : "User";
}
