/**
 * 認証の「中身」を担当するファイル（Next.js に依存しない純粋なロジック）。
 *
 * ログインの仕組み:
 *   1. パスコードが合っていたら、期限付きの「通行証(トークン)」を作る
 *   2. 通行証をブラウザのCookieに保存する
 *   3. 以降のアクセスでは、Cookieの通行証が本物か・期限切れでないかを確認する
 *
 * 通行証は「期限.署名」という形式。署名は SESSION_SECRET を使った HMAC-SHA256。
 * 秘密の文字列を知らない人には正しい署名を作れないので、偽造できない。
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Cookieの名前 */
export const SESSION_COOKIE = "session";

/** ログインの有効期間（秒）。ここでは7日 */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET が未設定、または短すぎます（16文字以上）。.env.local を確認してください。",
    );
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** 2つの文字列を「同じ時間で」比較する（タイミング攻撃対策） */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** 入力されたパスコードが正しいか確認する */
export function isPasscodeValid(input: string): boolean {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return false;
  // 先にハッシュ化して長さを揃えてから比較する（長さの違いが漏れないように）
  const hash = (s: string) => createHash("sha256").update(s).digest("hex");
  return safeEqual(hash(input), hash(expected));
}

/** ログイン成功時に渡す通行証を作る */
export function createSessionToken(now: number = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SESSION_MAX_AGE_SEC;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

/** 通行証が本物で、期限内かを確認する */
export function verifySessionToken(
  token: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload))) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Math.floor(now / 1000);
}
