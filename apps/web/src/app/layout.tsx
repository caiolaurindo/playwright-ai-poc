import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@uigovpe/styles";
import "primeicons/primeicons.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: {
    default: "AgendaLab | Reserva de ambientes e equipamentos",
    template: "%s | AgendaLab",
  },
  description:
    "Reserve ambientes e equipamentos compartilhados. Projeto de estudo com o UI Kit do Governo de Pernambuco.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
