/**
 * POST /api/chat
 * ブラウザから会話履歴を受け取り、Claude に投げて、返答を「ストリーミング」で返す。
 *
 * ポイント:
 *   - APIキーはここ(サーバー側)だけで使う。ブラウザには絶対に渡さない。
 *   - ログイン済みでなければ 401 を返す。
 *   - 入力文字数・履歴件数・出力トークン数に上限を設けて、暴走を防ぐ。
 */
import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, smoothStream, streamText, type UIMessage } from "ai";
import {
  MAX_HISTORY_MESSAGES,
  MAX_INPUT_CHARS,
  MAX_OUTPUT_TOKENS,
  SMOOTH_DELAY_MS,
  SYSTEM_PROMPT,
} from "@/lib/config";
import { isLoggedIn } from "@/lib/session";

// Vercel などで、ストリーミングを最大60秒まで続けられるようにする
export const maxDuration = 60;

const DEFAULT_MODEL = "claude-sonnet-5-5";

/** 内部エラーを、ユーザーに見せても安全な日本語メッセージに変換する */
function toFriendlyMessage(error: unknown): string {
  const status = (error as { statusCode?: number } | null)?.statusCode;
  if (status === 401 || status === 403) {
    return "AIサービスの認証に失敗しました。APIキーを確認してください。";
  }
  if (status === 429) {
    return "リクエストが多すぎます。しばらく待ってからもう一度お試しください。";
  }
  if (status !== undefined && status >= 500) {
    return "AIサービス側で一時的な問題が起きています。時間をおいて再度お試しください。";
  }
  return "エラーが発生しました。もう一度お試しください。";
}

/** UIMessage から本文テキストだけを取り出す */
function textOf(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export async function POST(req: Request) {
  // ① ログイン確認
  if (!(await isLoggedIn())) {
    return Response.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  // ② APIキー確認
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "サーバーにAPIキーが設定されていません（.env.local の ANTHROPIC_API_KEY）。" },
      { status: 500 },
    );
  }

  // ③ リクエストの中身を取り出して検証
  let messages: UIMessage[];
  try {
    const body = await req.json();
    if (!Array.isArray(body?.messages)) throw new Error("messages is not an array");
    messages = body.messages as UIMessage[];
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return Response.json({ error: "最後のメッセージはユーザーの発言である必要があります。" }, { status: 400 });
  }
  if (textOf(last).length > MAX_INPUT_CHARS) {
    return Response.json(
      { error: `入力は${MAX_INPUT_CHARS}文字以内にしてください。` },
      { status: 400 },
    );
  }

  // ④ 履歴を直近N件に絞る（トークン＝料金の節約）
  //    Claude は先頭が「user」の発言でないとエラーになるため、先頭が assistant なら取り除く
  let trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
  while (trimmed.length > 0 && trimmed[0].role !== "user") {
    trimmed = trimmed.slice(1);
  }

  // ⑤ Claude に投げて、ストリーミングで返す
  const result = streamText({
    model: anthropic(process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(trimmed),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    // 「1文字ずつ」滑らかに流すための整形（/./su = 1文字にマッチする正規表現）
    experimental_transform: smoothStream({ delayInMs: SMOOTH_DELAY_MS, chunking: /./su }),
  });

  return result.toUIMessageStreamResponse({
    // ストリームの途中でエラーが起きたとき、ブラウザに渡すメッセージ
    onError: (error) => {
      console.error("[chat] stream error:", error);
      return toFriendlyMessage(error);
    },
  });
}
