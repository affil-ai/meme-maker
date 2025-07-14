"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

// Enhanced ThemeProvider for clean monochrome theming
export function ThemeProvider({
  children,
  ...props
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={true}
      themes={["light", "dark"]}
      value={{
        light: "light",
        dark: "dark",
      }}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export function useTheme() {
  return useNextTheme();
}
