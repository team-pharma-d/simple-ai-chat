/**
 * Next.js の Cookie 機能とつなぐ部分。
 * 「いまリクエストしてきた人はログイン済みか？」を答える。
 */
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

export async function isLoggedIn(): Promise<boolean> {
  // Next.js 15 以降、cookies() は await が必要
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
