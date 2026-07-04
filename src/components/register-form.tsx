"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { signup } from "@/lib/auth-actions";

const inputCls =
  "mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brass placeholder:text-taupe/60";

export function RegisterForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(signup, null);

  return (
    <>
      <form action={action} className="space-y-3">
        <label className="block">
          <span className="text-sm text-taupe">{t("auth.register.name")}</span>
          <input type="text" name="name" placeholder="สมชาย ใจดี" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-taupe">{t("auth.register.phone")}</span>
          <input type="tel" name="phone" placeholder="08x-xxx-xxxx" className={inputCls} />
        </label>
        <label className="block">
          <span className="text-sm text-taupe">{t("auth.register.email")}</span>
          <input
            type="email"
            name="email"
            required
            placeholder="name@email.com"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-sm text-taupe">
            {t("auth.register.password")}
          </span>
          <input
            type="password"
            name="password"
            required
            minLength={6}
            placeholder="••••••••"
            className={inputCls}
          />
        </label>

        <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
          <input type="checkbox" required className="mt-0.5 w-4 h-4 accent-[#21463a]" />
          <span className="text-xs text-taupe leading-relaxed">
            {t("auth.register.consent")}
          </span>
        </label>

        {state?.error && <p className="text-sm text-clay">{state.error}</p>}
        {state?.info && <p className="text-sm text-pine">{state.info}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-pine text-bone rounded-xl py-3 font-medium hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60"
        >
          {t("auth.register.submit")}
        </button>
      </form>

      <p className="text-sm text-taupe text-center mt-6">
        {t("auth.register.haveAccount")}{" "}
        <Link href="/login" className="text-pine font-medium">
          {t("auth.register.login")}
        </Link>
      </p>
    </>
  );
}
