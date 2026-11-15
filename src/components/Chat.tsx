"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { MAX_INPUT_CHARS } from "@/lib/config";

/** サーバーが返したエラー(JSON文字列のことがある)から、表示用の文章を取り出す */
function extractErrorMessage(error: Error): string {
  try {
    const parsed = JSON.parse(error.message);
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {
    // JSONではない = そのままメッセージとして使える
  }
  return error.message || "エラーが発生しました。";
}

export function Chat() {
  const router = useRouter();

  // ---- ① 会話の状態管理：useChat がほぼ全部やってくれる ----
  // messages : 会話履歴（同じ画面を開いている間は保持。リロードで消える）
  // status   : "ready"(待機) / "submitted"(送信直後) / "streaming"(受信中) / "error"
  const { messages, sendMessage, status, error, stop, regenerate, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isBusy = status === "submitted" || status === "streaming";
  const isTooLong = input.length > MAX_INPUT_CHARS;
  const canSend = !isBusy && input.trim() !== "" && !isTooLong;

  // ---- ② 新しい文字が来るたびに、いちばん下までスクロール ----
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  // ---- ③ 入力欄の高さを、文字量に合わせて自動で伸ばす ----
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // ---- ④ 送信処理 ----
  function submit() {
    if (!canSend) return;
    sendMessage({ text: input }); // 履歴に追加して /api/chat へ送信 → ストリーミング開始
    setInput("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  // ---- ⑤ キー操作：Enterで送信 / Shift+Enterで改行 ----
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    // 日本語入力の「変換を確定するEnter」では送信しない（重要！）
    // keyCode 229 は Safari 対策
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    if (e.shiftKey) return; // Shift+Enter は何もしない = 通常の改行
    e.preventDefault(); // Enterだけのとき、改行を止めて…
    submit(); // 送信する
  }

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col">
      {/* ===== ヘッダー ===== */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold">シンプル AI チャット</h1>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setMessages([])}
            disabled={isBusy || messages.length === 0}
            className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50 disabled:opacity-40"
          >
            会話をクリア
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-50"
          >
            ログアウト
          </button>
        </div>
      </header>

      {/* ===== メッセージ一覧 ===== */}
      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <p className="mt-20 text-center text-slate-400">
            メッセージを入力してみましょう。
            <br />
            Enterで送信 / Shift+Enterで改行
          </p>
        )}

        {messages.map((message) => {
          const isUser = message.role === "user";
          // 1つのメッセージは複数の「part」でできている。文章(text)だけをつなげて表示
          const text = message.parts
            .map((part) => (part.type === "text" ? part.text : ""))
            .join("");
          return (
            <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 ${
                  isUser
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-900"
                }`}
              >
                {text}
              </div>
            </div>
          );
        })}

        {/* 送信直後、最初の文字が届くまでの「考え中」表示 */}
        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-400">
              考え中…
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <p>{extractErrorMessage(error)}</p>
            <button
              type="button"
              onClick={() => regenerate()}
              className="mt-2 rounded-md border border-red-300 px-3 py-1 hover:bg-red-100"
            >
              もう一度試す
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* ===== 入力フォーム ===== */}
      <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="メッセージを入力…"
            className="max-h-40 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={() => stop()}
              className="rounded-lg bg-slate-700 px-4 py-2 font-medium text-white hover:bg-slate-800"
            >
              停止
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              送信
            </button>
          )}
        </div>
        <p className={`mt-1 text-right text-xs ${isTooLong ? "text-red-600" : "text-slate-400"}`}>
          {input.length} / {MAX_INPUT_CHARS}
        </p>
      </form>
    </div>
  );
}
