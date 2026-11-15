/**
 * 認証ロジック(src/lib/auth.ts)の自動テスト。
 * 実行: npm test （Node.js 組み込みのテスト機能を使用。追加インストール不要）
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  SESSION_MAX_AGE_SEC,
  createSessionToken,
  isPasscodeValid,
  verifySessionToken,
} from "../src/lib/auth.ts";

beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret-test-secret-1234";
  process.env.APP_PASSCODE = "correct-passcode";
});

describe("isPasscodeValid", () => {
  it("正しいパスコードは true", () => {
    assert.equal(isPasscodeValid("correct-passcode"), true);
  });
  it("違うパスコードは false", () => {
    assert.equal(isPasscodeValid("wrong"), false);
    assert.equal(isPasscodeValid(""), false);
  });
  it("APP_PASSCODE が未設定なら常に false", () => {
    delete process.env.APP_PASSCODE;
    assert.equal(isPasscodeValid("anything"), false);
  });
});

describe("session token", () => {
  it("作ったトークンは検証を通る", () => {
    assert.equal(verifySessionToken(createSessionToken()), true);
  });
  it("期限が切れたトークンは false", () => {
    const past = Date.now() - (SESSION_MAX_AGE_SEC + 10) * 1000;
    assert.equal(verifySessionToken(createSessionToken(past)), false);
  });
  it("署名を書き換えたら false", () => {
    const [payload] = createSessionToken().split(".");
    assert.equal(verifySessionToken(`${payload}.forged-signature`), false);
  });
  it("期限だけ延ばして書き換えても false（改ざん検知）", () => {
    const [payload, sig] = createSessionToken().split(".");
    const extended = String(Number(payload) + 99999);
    assert.equal(verifySessionToken(`${extended}.${sig}`), false);
  });
  it("空・不正な形式は false", () => {
    assert.equal(verifySessionToken(undefined), false);
    assert.equal(verifySessionToken(""), false);
    assert.equal(verifySessionToken("abc"), false);
  });
  it("別の SESSION_SECRET で作ったトークンは false", () => {
    const token = createSessionToken();
    process.env.SESSION_SECRET = "another-secret-another-secret";
    assert.equal(verifySessionToken(token), false);
  });
});
