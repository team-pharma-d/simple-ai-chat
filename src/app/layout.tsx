import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "シンプル AI チャット",
  description: "Next.js + Vercel AI SDK + Claude API で作ったストリーミングチャット",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
