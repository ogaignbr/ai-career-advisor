import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "書類作成アシスタント",
  description: "キャリアアドバイザー向け 履歴書・職務経歴書 自動生成ツール",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
