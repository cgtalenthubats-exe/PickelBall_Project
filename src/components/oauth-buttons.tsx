"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function OAuthButtons() {
  const t = useTranslations();
  const locale = useLocale();
  const [lineNote, setLineNote] = useState(false);

  async function google() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/${locale}`,
      },
    });
  }

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={google}
        className="w-full border border-line rounded-xl py-2.5 text-sm text-ink hover:border-brass transition-colors flex items-center justify-center gap-2 cursor-pointer"
      >
        <span className="font-bold text-[#4285F4]">G</span>
        {t("auth.login.google")}
      </button>
      <button
        type="button"
        onClick={() => setLineNote(true)}
        className="w-full rounded-xl py-2.5 text-sm text-white flex items-center justify-center gap-2 cursor-pointer"
        style={{ background: "#06C755" }}
      >
        {t("auth.login.line")}
      </button>
      {lineNote && (
        <p className="text-[11px] text-taupe text-center">
          LINE login กำลังจะเปิดใช้งาน (ต้องตั้งค่า LINE Login channel ก่อน)
        </p>
      )}
    </div>
  );
}
