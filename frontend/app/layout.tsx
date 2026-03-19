import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// This object handles your manifest and Apple-specific tags
export const metadata: Metadata = {
  title: "Aeternum Hub GPU",
  description: "GPU-Accelerated AI Security System",
  manifest: "/manifest.json", // This creates the <link rel="manifest"> tag
  appleWebApp: {
    capable: true, // This creates the "apple-mobile-web-app-capable" tag
    statusBarStyle: "black-translucent", // This creates the status bar tag
    title: "Aeternum Hub",
  },
};

// This object handles the theme color and mobile scaling
export const viewport: Viewport = {
  themeColor: "#000000", // This creates the <meta name="theme-color"> tag
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // This makes it feel like a real app by stopping "zoom"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black antialiased`}>
        {children}
      </body>
    </html>
  );
}