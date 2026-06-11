import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Aera Asset Manager",
  description: "Track service contracts, maintenance, repairs, and downtime",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userRole = (user?.user_metadata?.role as string) ?? null

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AppShell userRole={userRole}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
