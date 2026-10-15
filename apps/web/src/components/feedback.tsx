"use client";

import { Button, Typography } from "@uigovpe/components";

export function Feedback({
  children,
  tone = "error",
}: {
  children: React.ReactNode;
  tone?: "error" | "success" | "info";
}) {
  return (
    <div
      className={`feedback feedback-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <i
        className={`pi ${tone === "error" ? "pi-exclamation-circle" : tone === "success" ? "pi-check-circle" : "pi-info-circle"}`}
        aria-hidden="true"
      />
      <div>{children}</div>
    </div>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <i className="pi pi-calendar" aria-hidden="true" />
      </span>
      <Typography variant="h2">{title}</Typography>
      <p>{description}</p>
      {action && <Button label="Limpar filtros" outlined onClick={action} />}
    </div>
  );
}
