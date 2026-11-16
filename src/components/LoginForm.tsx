"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // ページ全体がリロードされるのを防ぐ
    if (loading || passcode === "") return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        router.push("/"); // チャット画面へ
        router.refresh(); // サーバー側の表示を最新化
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "ログインに失敗しました。");
    } catch {
      setError("通信に失敗しました。ネットワークを確認してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h1 className="text-xl font-bold">ログイン</h1>
      <p className="text-sm text-slate-500">パスコードを入力してください。</p>

      <div>
        <label htmlFor="passcode" className="sr-only">
          パスコード
        </label>
        <div className="relative">
          <input
            id="passcode"
            type={showPassword ? "text" : "password"}
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            autoFocus
            autoComplete="current-password"
            placeholder="パスコード"
            className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-16 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "パスコードを隠す" : "パスコードを表示"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            {showPassword ? "隠す" : "表示"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || passcode === ""}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "確認中…" : "ログイン"}
      </button>
    </form>
  );
}
