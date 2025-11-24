import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { AuthContextProvider } from "./context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lovable",
  description: "A modern development environment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
        style={{
          backgroundImage: 'url("https://lovable.dev/img/background/gradient-optimized.webp")',
          backgroundSize: '170% auto',
          backgroundPosition: 'center -1%',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
          width: '100vw',
          minHeight: '100vh',
          margin: 0,
          padding: 0,
          overflowX: 'hidden'
        }}
      >
        <div className="min-h-screen flex flex-col ">
          <main className="flex-1">
            <AuthContextProvider>
              {children}
            </AuthContextProvider>
          </main>
        </div>
      </body>
    </html>
  );
}
