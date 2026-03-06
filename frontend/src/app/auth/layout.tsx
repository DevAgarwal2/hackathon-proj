import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "@/app/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Restaurant Portal - Sign In",
  description: "Restaurant management portal",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${geistSans.variable} antialiased bg-background`}>
      {children}
    </div>
  );
}
