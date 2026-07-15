import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/adminAuth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPage("/admin");
  return children;
}
