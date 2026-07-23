import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { ResetPasswordForm } from "@/components/password-forms";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="max-w-sm mx-auto w-full px-5 py-10">
        <h1 className="font-display text-3xl font-bold text-pine">
          ตั้งรหัสผ่านใหม่
        </h1>
        <p className="text-sm text-taupe mt-1 mb-6">
          เปิดหน้านี้จากลิงก์ในอีเมลเท่านั้น ไม่งั้นระบบจะไม่รู้ว่าเป็นบัญชีไหน
        </p>
        <ResetPasswordForm />
      </main>
    </div>
  );
}
