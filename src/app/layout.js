import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import PostHogPageview from "@/components/PostHogPageview";
import { PostHogProvider } from "@/components/providers/PostHogProvider";

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
        <PostHogProvider>
          {children}
          <PostHogPageview />
          <Toaster />
          <Analytics />
        </PostHogProvider>
      </body>
    </html>
  );
}
