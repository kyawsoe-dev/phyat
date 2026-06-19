import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Phyat",
    template: "%s — Phyat",
  },
  description: "Fast URL shortening for smart links.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeScript = `
    (() => {
      const mode = localStorage.getItem('phyat-theme') || 'system';
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldUseDark = mode === 'dark' || (mode === 'system' && prefersDark);
      document.documentElement.classList.toggle('dark', shouldUseDark);
      document.documentElement.dataset.theme = mode;
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
