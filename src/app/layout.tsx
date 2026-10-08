import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders, IBM_Plex_Mono } from "next/font/google";
import { authEnabled } from "@/lib/auth";
import "./globals.css";

const display = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
  adjustFontFallback: false,
});

const body = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  weight: "variable",
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: "500",
});

export const metadata: Metadata = {
  title: "Marquee Night",
  description: "A TV-studio trivia board for game nights.",
};

export const viewport: Viewport = {
  themeColor: "#050818",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-text">
        {authEnabled ? (
          <ClerkProvider appearance={{ theme: dark, variables: { colorPrimary: "#ffc53d", colorBackground: "#0b1438" } }}>
            {children}
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
