import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QA Copilot",
  description:
    "An AI Test Design Agent that analyzes requirements, bugs, enhancements, and technical changes to generate QA strategies, risk assessments, automation candidates, and Playwright test skeletons.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
