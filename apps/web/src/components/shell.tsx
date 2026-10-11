"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GovBar } from "@uigovpe/components";
import type { Collaborator } from "@agendalab/contracts";
import { api } from "@/lib/api";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
  useEffect(() => {
    void api<Collaborator>("/me")
      .then(setCollaborator)
      .catch(() => {});
  }, []);

  return (
    <>
      <a href="#conteudo" className="skip-link">
        Ir para o conteúdo
      </a>
      <GovBar isFixed={false} showCookies={false} showThemeController={false} />
      <header className="app-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="AgendaLab, início">
            <span className="brand-mark">
              <i className="pi pi-calendar" aria-hidden="true" />
            </span>
            <span>
              Agenda<span className="brand-light">Lab</span>
              <small>Ambientes e equipamentos</small>
            </span>
          </Link>
          <div className="header-right">
            <span className="environment-label">AMBIENTE DE ESTUDO</span>
            <div className="user-profile">
              <span className="avatar">
                {collaborator
                  ? collaborator.name
                      .split(" ")
                      .map((name) => name[0])
                      .slice(0, 2)
                      .join("")
                  : "—"}
              </span>
              <span>
                <strong>
                  {collaborator?.name ?? "Colaborador de demonstração"}
                </strong>
                <small>
                  {collaborator?.department ?? "Carregando perfil…"}
                </small>
              </span>
            </div>
          </div>
        </div>
        <nav className="nav-inner" aria-label="Navegação principal">
          <Link
            href="/"
            className={pathname === "/" ? "nav-link active" : "nav-link"}
            aria-current={pathname === "/" ? "page" : undefined}
          >
            <i className="pi pi-th-large" aria-hidden="true" /> Ambientes e
            equipamentos
          </Link>
          <Link
            href="/minhas-reservas"
            className={
              pathname === "/minhas-reservas" ? "nav-link active" : "nav-link"
            }
            aria-current={pathname === "/minhas-reservas" ? "page" : undefined}
          >
            <i className="pi pi-calendar" aria-hidden="true" /> Minhas reservas
          </Link>
        </nav>
      </header>
      <main id="conteudo" className="main-container">
        {children}
      </main>
      <footer className="app-footer">
        <div>
          <strong>AgendaLab</strong>
          <span>Uso compartilhado. Trabalho conectado.</span>
        </div>
        <span>Projeto de estudo · Dados fictícios · Horário de Brasília</span>
      </footer>
    </>
  );
}
