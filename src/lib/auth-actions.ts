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
