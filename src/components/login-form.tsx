"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { login } from "@/lib/auth-actions";
import { OAuthButtons } from "./oauth-buttons";
import { PhoneOtpForm } from "./phone-otp-form";

const inputCls =
  "mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brass placeholder:text-taupe/60";

export function LoginForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(login, null);

  return (
    <>
      <form action={action} className="space-y-3">
        <label className="block">
          <span className="text-sm text-taupe">{t("auth.login.email")}</span>
          <input
            type="email"
            name="email"
            required
            placeholder="name@email.com"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-sm text-taupe">{t("auth.login.password")}</span>
          <input
            type="password"
            name="password"
            required
            placeholder="••••••••"
            className={inputCls}
          />
        </label>
        {state?.error && <p className="text-sm text-clay">{state.error}</p>}
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-brass">
            {t("auth.login.forgot")}
          </Link>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full bg-pine text-bone rounded-xl py-3 font-medium hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60"
        >
          {t("auth.login.submit")}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-line" />
        <span className="text-xs text-taupe">{t("auth.login.or")}</span>
        <div className="flex-1 h-px bg-line" />
      </div>

      <OAuthButtons />

      <div className="mt-2.5">
        <PhoneOtpForm />
      </div>

      <p className="text-sm text-taupe text-center mt-6">
        {t("auth.login.noAccount")}{" "}
        <Link href="/register" className="text-pine font-medium">
          {t("auth.login.register")}
        </Link>
      </p>
    </>
  );
}
