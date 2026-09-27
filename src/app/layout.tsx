import type { Metadata, Viewport } from "next";
import "./globals.css";
import SplashScreen from "@/components/pwa/SplashScreen";
import InstallGuide from "@/components/pwa/InstallGuide";
import ClientLayoutWrapper from "@/components/layout/ClientLayoutWrapper";

export const metadata: Metadata = {
  title: "Kagoshima Super League",
  description: "鹿児島ポーカーチームリーグ公式アプリ",
  // VERCEL_URL（デプロイごとの URL）は Vercel の認証で保護されていて、
  // LINE などのクローラーが共有画像を取得できないため本番ドメインを基準にする
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kagoshimasuperleague.com",
  ),
  openGraph: {
    title: "Kagoshima Super League",
    description: "鹿児島ポーカーチームリーグ公式アプリ",
    images: [
      {
        url: "/og-image.png",
        width: 1040,
        height: 1040,
        alt: "Kagoshima Super League",
      },
    ],
  },
  // 正方形のロゴなので、X でも切り抜かれない summary カードにする
  twitter: {
    card: "summary",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KSL",
  },
};

export const viewport: Viewport = {
  themeColor: "#2b70ef",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            var saved = localStorage.getItem('ksl-theme');
            if (saved === 'dark') document.documentElement.classList.add('dark');
          })();
        `,
          }}
        />
      </head>
      <body
        className="min-h-screen font-sans"
        style={{ backgroundColor: "#f5f3ee" }}
      >
        <InstallGuide />
        <SplashScreen />
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}
