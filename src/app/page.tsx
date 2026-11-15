import { redirect } from "next/navigation";
import { Chat } from "@/components/Chat";
import { isLoggedIn } from "@/lib/session";

// ログイン状態はリクエストごとに変わるので、毎回サーバーで実行する
export const dynamic = "force-dynamic";

export default async function Home() {
  // 未ログインなら /login へ追い返す（チャット画面は見せない）
  if (!(await isLoggedIn())) {
    redirect("/login");
  }
  return <Chat />;
}
