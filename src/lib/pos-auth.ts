import { NextRequest, NextResponse } from "next/server";

// Shared auth check for all POS-facing API routes (POS2U or any future
// front-desk terminal). All of them are trusted server-to-server callers
// authenticated by this single shared secret — not tied to a user session.
export function checkPosAuth(req: NextRequest): NextResponse | null {
  const auth = req.headers.get("authorization") ?? "";
  const key = auth.replace(/^Bearer\s+/i, "");
  if (!key || key !== process.env.POS_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
