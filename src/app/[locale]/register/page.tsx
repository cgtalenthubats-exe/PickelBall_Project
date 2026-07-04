import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main className="max-w-sm mx-auto w-full px-5 py-10">
        <h1 className="font-display text-3xl font-bold text-pine">
          {t("auth.register.title")}
        </h1>
        <p className="text-sm text-taupe mt-1 mb-6">
          {t("auth.register.subtitle")}
        </p>
        <RegisterForm />
      </main>
    </div>
  );
}
