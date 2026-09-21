import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Novel Agent",
  description: "AI-native novel writing workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
