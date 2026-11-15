import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { isLoggedIn } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // すでにログイン済みならチャット画面へ
  if (await isLoggedIn()) {
    redirect("/");
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
