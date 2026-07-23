"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string } | null;

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}`);
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    options: {
      data: {
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
      },
    },
  });
  if (error) return { error: error.message };
  // If "Confirm email" is enabled in Supabase, there is no session yet.
  if (!data.session) {
    return { info: "ส่งลิงก์ยืนยันไปที่อีเมลแล้ว — ยืนยันก่อนเข้าสู่ระบบ" };
  }
  redirect(`/${await getLocale()}`);
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${await getLocale()}`);
}

// Password reset is for email/password accounts (mainly staff — customers on
// Google/LINE/OTP have no password to forget). Sends Supabase's built-in
// recovery email; the link lands on /reset-password with a recovery session.
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "กรุณากรอกอีเมล" };
  const locale = await getLocale();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/${locale}/reset-password`,
  });
  if (error) return { error: error.message };
  return { info: "ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลแล้ว (ถ้ามีบัญชีนี้อยู่)" };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" };
  if (password !== String(formData.get("confirm") ?? ""))
    return { error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect(`/${await getLocale()}/login`);
}
