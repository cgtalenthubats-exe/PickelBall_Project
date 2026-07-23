import { setRequestLocale } from "next-intl/server";
import { requireAdminPage } from "@/lib/authz";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requireAdminPage("staff");
  return <AdminShell role={ctx.role}>{children}</AdminShell>;
}
