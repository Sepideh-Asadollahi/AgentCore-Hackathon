import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentCore Change Society",
  description: "A governed society of Qwen agents for evidence-backed software change decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-svh bg-background text-foreground">{children}</body>
    </html>
  );
}
