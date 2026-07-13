import type { Metadata } from "next";
import "./globals.css";
import "./glass.css";
import "./cinematic.css";

export const metadata: Metadata = {
  title: "AgentCore Change Society",
  description: "A governed society of Qwen agents for evidence-backed software change decisions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="glass-ui">{children}</body></html>;
}
