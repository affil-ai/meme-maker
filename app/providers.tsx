"use client";

import { ConvexProvider } from "convex/react";
import { Toaster } from "~/components/ui/sonner";
import { ThemeProvider } from "~/components/ui/ThemeProvider";
import { convex } from "~/lib/convex";
import "./styles/globals.css";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
        <ConvexProvider client={convex}>
          <ThemeProvider>
            <main className="h-screen w-full overflow-hidden">{children}</main>
            <Toaster position="top-right" expand={false} richColors closeButton />
          </ThemeProvider>
        </ConvexProvider>
  );
}