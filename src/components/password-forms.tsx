"use client";

import { useActionState } from "react";
import { requestPasswordReset, updatePassword } from "@/lib/auth-actions";

const inputCls =
  "mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-brass placeholder:text-taupe/60";
const buttonCls =
  "w-full bg-pine text-bone rounded-xl py-3 font-medium hover:bg-pine-deep transition-colors cursor-pointer disabled:opacity-60";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="text-sm text-taupe">อีเมลที่ใช้สมัคร</span>
        <input
          type="email"
          name="email"
          required
          placeholder="name@email.com"
          className={inputCls}
        />
      </label>
      {state?.error && <p className="text-sm text-clay">{state.error}</p>}
      {state?.info && <p className="text-sm text-pine">{state.info}</p>}
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "กำลังส่ง..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, null);
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="text-sm text-taupe">รหัสผ่านใหม่</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          placeholder="••••••••"
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="text-sm text-taupe">ยืนยันรหัสผ่านใหม่</span>
        <input
          type="password"
          name="confirm"
          required
          minLength={8}
          placeholder="••••••••"
          className={inputCls}
        />
      </label>
      {state?.error && <p className="text-sm text-clay">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonCls}>
        {pending ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
      </button>
    </form>
  );
}
