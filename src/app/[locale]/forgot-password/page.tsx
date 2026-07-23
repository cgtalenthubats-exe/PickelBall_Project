import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { ForgotPasswordForm } from "@/components/password-forms";

export default async function ForgotPasswordPage({
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
        <h1 className="font-display text-3xl font-bold text-pine">ลืมรหัสผ่าน</h1>
        <p className="text-sm text-taupe mt-1 mb-6">
          สำหรับบัญชีที่ใช้อีเมล+รหัสผ่าน — ถ้าเข้าด้วย Google/LINE/เบอร์โทร
          ไม่ต้องใช้หน้านี้ ล็อกอินผ่านช่องทางเดิมได้เลย
        </p>
        <ForgotPasswordForm />
      </main>
    </div>
  );
}
