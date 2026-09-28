import type { Metadata } from "next";
import { createThemeBootstrapScript } from "@/lib/workstation-theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Studio",
  description: "Resume Studio",
};

// Runs before hydration so the workstation uses the saved or system theme on first paint.
const themeBootstrap = createThemeBootstrapScript();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
