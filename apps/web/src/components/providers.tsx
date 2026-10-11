"use client";

import { LayoutProvider, UiProvider } from "@uigovpe/components";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider template="landingpage">
      <UiProvider>{children}</UiProvider>
    </LayoutProvider>
  );
}
