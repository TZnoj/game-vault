import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

const DEFAULT_ADMIN_EMAIL = "tylerznoj1995@gmail.com";

export function getAdminEmails() {
  const configured = process.env.ADMIN_EMAILS
    ?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set(configured?.length ? configured : [DEFAULT_ADMIN_EMAIL]);
}

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && getAdminEmails().has(email.toLowerCase()));
}

export async function getIsAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}

export async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!isAdminEmail(session?.user?.email)) {
    throw new Error(`Unauthorized: ${session?.user?.email ?? "NO SESSION"}`);
  }

  return session;
}

export async function requireAdminPage(callbackUrl = "/admin") {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (!isAdminEmail(session.user.email)) {
    redirect("/");
  }

  return session;
}
