import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Página não encontrada</h1>
      <p>Volte ao catálogo para encontrar um ambiente ou equipamento.</p>
      <Link href="/" className="primary-link">
        Ir para o catálogo
      </Link>
    </div>
  );
}
