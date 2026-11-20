import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "e-assessment — Latihan Psikotes Seleksi Kerja",
    template: "%s · e-assessment",
  },
  description:
    "Platform latihan psikotes seleksi kerja dan magang dengan timer akurat, penilaian server-side, dan pembahasan lengkap.",
};

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('e-assessment:theme');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full bg-canvas text-ink flex flex-col">{children}</body>
    </html>
  );
}
