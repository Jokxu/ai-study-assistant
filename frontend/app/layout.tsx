import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Study Assistant",
  description: "AI 智能备考助手 - 基于 RAG 和大语言模型的智能学习平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
