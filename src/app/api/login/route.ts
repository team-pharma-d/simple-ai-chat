/**
 * POST /api/login
 * パスコードを受け取り、正しければ「通行証」をCookieに保存する。
 */
import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  createSessionToken,
  isPasscodeValid,
} from "@/lib/auth";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  if (!process.env.APP_PASSCODE || !process.env.SESSION_SECRET) {
    return NextResponse.json(
      { error: "サーバー設定が未完了です（.env.local の APP_PASSCODE / SESSION_SECRET）。" },
      { status: 500 },
    );
  }

  let passcode = "";
  try {
    const body = await req.json();
    passcode = typeof body?.passcode === "string" ? body.passcode : "";
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  if (!isPasscodeValid(passcode)) {
    // 総当たり攻撃を遅らせるため、失敗時はわざと待たせる
    await sleep(800);
    return NextResponse.json({ error: "パスコードが違います。" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true, // JavaScriptからCookieを読めなくする（XSS対策）
    sameSite: "lax", // 他サイトからの勝手な送信を制限（CSRF対策）
    secure: process.env.NODE_ENV === "production", // 本番ではHTTPS限定
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
}
