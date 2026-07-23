"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Smartphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const inp =
  "mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brass placeholder:text-taupe/60";

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("66")) return `+${digits}`;
  if (digits.startsWith("0")) return `+66${digits.slice(1)}`;
  return `+${digits}`;
}

// เข้าระบบด้วยเบอร์โทร (OTP ทาง SMS) — ไม่มีรหัสผ่านให้จำ/ลืม
// Needs the Supabase Phone provider configured (e.g. Twilio); until then the
// request will fail with a clear provider error we surface as-is.
export function PhoneOtpForm() {
  const locale = useLocale();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function requestOtp() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      phone: toE164(phone),
    });
    setBusy(false);
    if (error) {
      setError(
        /unsupported|not enabled|disabled/i.test(error.message)
          ? "ระบบ OTP ทาง SMS ยังไม่เปิดใช้งาน (ต้องตั้งค่า SMS provider ใน Supabase ก่อน)"
          : error.message,
      );
      return;
    }
    setStep("code");
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      phone: toE164(phone),
      token: code,
      type: "sms",
    });
    setBusy(false);
    if (error) {
      setError("รหัสไม่ถูกต้องหรือหมดอายุ ลองใหม่อีกครั้ง");
      return;
    }
    window.location.assign(`/${locale}`);
  }

  return (
    <div className="space-y-2.5">
      {step === "phone" ? (
        <>
          <label className="block">
            <span className="text-sm text-taupe">เบอร์โทรศัพท์</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081-234-5678"
              className={inp}
            />
          </label>
          <button
            type="button"
            onClick={requestOtp}
            disabled={busy || phone.replace(/\D/g, "").length < 9}
            className="w-full border border-line rounded-xl py-2.5 text-sm text-ink hover:border-brass transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Smartphone className="w-4 h-4 text-pine" />
            {busy ? "กำลังส่ง OTP..." : "รับรหัส OTP ทาง SMS"}
          </button>
        </>
      ) : (
        <>
          <label className="block">
            <span className="text-sm text-taupe">
              รหัส 6 หลัก ส่งไปที่ {toE164(phone)}
            </span>
            <input
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••"
              maxLength={6}
              className={`${inp} tracking-[0.4em] text-center`}
            />
          </label>
          <button
            type="button"
            onClick={verify}
            disabled={busy || code.length < 6}
            className="w-full bg-pine text-bone rounded-xl py-2.5 text-sm font-medium hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-50"
          >
            {busy ? "กำลังตรวจสอบ..." : "ยืนยันรหัส"}
          </button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="w-full text-xs text-taupe cursor-pointer"
          >
            ← เปลี่ยนเบอร์ / ส่งรหัสใหม่
          </button>
        </>
      )}
      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  );
}
