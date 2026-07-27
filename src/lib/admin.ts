import type { User } from "firebase/auth";

/** כתובות האדמין — חייבות להתאים ל-isAdmin() שבחוקי Firestore/Storage. */
export const ADMIN_EMAILS = ["dvirsb@gmail.com"];

export function isAdminUser(user: User | null): boolean {
  return !!user?.email && ADMIN_EMAILS.includes(user.email);
}
