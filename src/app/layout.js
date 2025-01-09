import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { PHProvider } from "@/lib/posthog";
import PostHogPageview from "@/components/PostHogPageview";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "DocWiz AI Dashboard",
  description: "Create, edit, sign and manage your documents with DocWiz AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PHProvider>
          {children}
          <PostHogPageview />
          <Toaster />
          <Analytics />
        </PHProvider>
      </body>
    </html>
  );
}
