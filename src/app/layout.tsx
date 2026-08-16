import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fifth Five Attendance Portal | IUB BS IT",
  description: "Online attendance management portal for BS IT Fifth Five, The Islamia University of Bahawalpur.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
