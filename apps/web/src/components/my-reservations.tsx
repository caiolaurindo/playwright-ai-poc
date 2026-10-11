"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, InputText, Tag } from "@uigovpe/components";
import type { Reservation } from "@agendalab/contracts";
import { api } from "@/lib/api";
import { formatDate, formatTime } from "@/lib/dates";
import { EmptyState, Feedback } from "./feedback";

type Tab = "upcoming" | "history" | "cancelled";
export function MyReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api<Reservation[]>("/reservations/mine", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setReservations(data);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Não foi possível consultar suas reservas.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);
  const counts = useMemo(
    () => ({
      upcoming: reservations.filter(
        (item) =>
          item.status === "confirmed" && new Date(item.endAt).getTime() > now,
      ).length,
      history: reservations.filter(
        (item) =>
          item.status === "confirmed" && new Date(item.endAt).getTime() <= now,
      ).length,
      cancelled: reservations.filter((item) => item.status === "cancelled")
        .length,
    }),
    [reservations, now],
  );
  const filtered = useMemo(
    () =>
      reservations
        .filter((item) => {
          const match =
            tab === "cancelled"
              ? item.status === "cancelled"
              : item.status === "confirmed" &&
                (tab === "upcoming"
                  ? new Date(item.endAt).getTime() > now
                  : new Date(item.endAt).getTime() <= now);
          return (
            match &&
            `${item.title} ${item.resource.name}`
              .toLocaleLowerCase("pt-BR")
              .includes(search.toLocaleLowerCase("pt-BR").trim())
          );
        })
        .sort((a, b) =>
          tab === "upcoming"
            ? a.startAt.localeCompare(b.startAt)
            : b.startAt.localeCompare(a.startAt),
        ),
    [reservations, tab, search, now],
  );

  async function cancel() {
    if (!selected || busy) return;
    setBusy(true);
    setCancelError("");
    try {
      const result = await api<Reservation>(
        `/reservations/${selected.id}/cancel`,
        { method: "PATCH" },
      );
      setReservations((items) =>
        items.map((item) => (item.id === result.id ? result : item)),
      );
      setSuccess(
        `A reserva de ${selected.resource.name} foi cancelada. O recurso está disponível novamente.`,
      );
      setSelected(null);
    } catch (failure) {
      setCancelError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível cancelar a reserva.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="breadcrumb">
        <i className="pi pi-home" aria-hidden="true" />
        <span>/</span> AgendaLab <span>/</span>
        <strong>Minhas reservas</strong>
      </div>
      <section className="page-intro">
        <div>
          <span className="eyebrow">SUA AGENDA, ORGANIZADA</span>
          <h1>Minhas reservas</h1>
          <p>
            Acompanhe seus próximos encontros e gerencie os recursos reservados.
          </p>
        </div>
        <Link href="/" className="primary-link">
          <i className="pi pi-plus" aria-hidden="true" /> Nova reserva
        </Link>
      </section>
      <div className="reservation-stats">
        <div>
          <span className="stat-icon">
            <i className="pi pi-calendar" aria-hidden="true" />
          </span>
          <span>
            <strong>{loading || error ? "—" : counts.upcoming}</strong>
            <small>Próximas e em andamento</small>
          </span>
        </div>
        <div>
          <span className="stat-icon stat-muted">
            <i className="pi pi-check-circle" aria-hidden="true" />
          </span>
          <span>
            <strong>{loading || error ? "—" : counts.history}</strong>
            <small>Concluídas</small>
          </span>
        </div>
        <div>
          <span className="stat-icon stat-muted">
            <i className="pi pi-times-circle" aria-hidden="true" />
          </span>
          <span>
            <strong>{loading || error ? "—" : counts.cancelled}</strong>
            <small>Canceladas</small>
          </span>
        </div>
      </div>
      {success && <Feedback tone="success">{success}</Feedback>}
      <section
        className="reservations-panel"
        aria-label="Lista de minhas reservas"
      >
        <div className="reservations-toolbar">
          <div
            className="reservation-tabs"
            role="group"
            aria-label="Situação das reservas"
          >
            {(
              [
                { value: "upcoming", label: "Próximas" },
                { value: "history", label: "Concluídas" },
                { value: "cancelled", label: "Canceladas" },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                aria-pressed={tab === item.value}
                className={tab === item.value ? "active" : ""}
                onClick={() => setTab(item.value)}
              >
                {item.label}
                <span>{loading || error ? "—" : counts[item.value]}</span>
              </button>
            ))}
          </div>
          <InputText
            inputId="busca-reservas"
            aria-label="Buscar minhas reservas"
            placeholder="Buscar reserva…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {error ? (
          <div className="load-error">
            <Feedback>{error}</Feedback>
            <Button
              label="Tentar novamente"
              outlined
              onClick={() => setRefresh((value) => value + 1)}
            />
          </div>
        ) : loading ? (
          <p className="loading-reservations" role="status">
            <i className="pi pi-spin pi-spinner" aria-hidden="true" />{" "}
            Carregando suas reservas…
          </p>
        ) : filtered.length === 0 ? (
          <>
            <EmptyState
              title={
                search
                  ? "Nenhuma reserva encontrada"
                  : tab === "upcoming"
                    ? "Sua próxima reserva começa aqui"
                    : tab === "history"
                      ? "Nenhuma reserva concluída"
                      : "Nenhuma reserva cancelada"
              }
              description={
                search
                  ? "Experimente buscar pelo título ou pelo nome do recurso."
                  : tab === "upcoming"
                    ? "Escolha uma sala ou equipamento e organize seu próximo encontro."
                    : "As reservas desta categoria aparecerão aqui."
              }
            />
            {tab === "upcoming" && !search && (
              <div className="empty-action">
                <Link className="primary-link" href="/">
                  Explorar ambientes{" "}
                  <i className="pi pi-arrow-right" aria-hidden="true" />
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="reservation-list">
            {filtered.map((item) => {
              const running =
                item.status === "confirmed" &&
                new Date(item.startAt).getTime() <= now &&
                new Date(item.endAt).getTime() > now;
              const canCancel =
                item.status === "confirmed" &&
                new Date(item.startAt).getTime() > now;
              return (
                <article key={item.id} className="reservation-row">
                  <div className="reservation-date">
                    <i className="pi pi-calendar" aria-hidden="true" />
                    <strong>{formatDate(item.startAt)}</strong>
                    <span>
                      {formatTime(item.startAt)} – {formatTime(item.endAt)}
                    </span>
                  </div>
                  <div className="reservation-detail">
                    <div className="reservation-heading">
                      <h2>{item.title}</h2>
                      <Tag
                        severity={
                          item.status === "cancelled"
                            ? "danger"
                            : running
                              ? "info"
                              : tab === "history"
                                ? "secondary"
                                : "success"
                        }
                        value={
                          item.status === "cancelled"
                            ? "Cancelada"
                            : running
                              ? "Em andamento"
                              : tab === "history"
                                ? "Concluída"
                                : "Confirmada"
                        }
                      />
                    </div>
                    <p>
                      <i
                        className={`pi ${item.resource.type === "room" ? "pi-building" : "pi-desktop"}`}
                        aria-hidden="true"
                      />
                      {item.resource.name}
                      <span className="detail-separator">·</span>
                      {item.resource.type === "room"
                        ? `${item.participants} ${item.participants === 1 ? "participante" : "participantes"}`
                        : "Equipamento"}
                    </p>
                    <small>{item.resource.location}</small>
                    {item.notes && (
                      <p className="reservation-notes">{item.notes}</p>
                    )}
                  </div>
                  <div className="reservation-action">
                    {canCancel && (
                      <Button
                        label="Cancelar reserva"
                        severity="danger"
                        outlined
                        icon="pi pi-times"
                        onClick={() => {
                          setSelected(item);
                          setCancelError("");
                          setSuccess("");
                        }}
                        aria-label={`Cancelar reserva ${item.title}`}
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <p className="form-hint">
        <i className="pi pi-info-circle" aria-hidden="true" /> Você pode
        cancelar reservas que ainda não começaram. Todos os horários seguem o
        horário de Brasília.
      </p>
      <Dialog
        visible={!!selected}
        header="Cancelar reserva?"
        onHide={() => {
          if (!busy) setSelected(null);
        }}
        closable={!busy}
        closeOnEscape={!busy}
        dismissableMask={false}
        modal
        blockScroll
        style={{ width: "480px" }}
        breakpoints={{ "640px": "95vw" }}
      >
        {selected && (
          <>
            <p className="dialog-description">
              Ao cancelar, o recurso ficará disponível para outros
              colaboradores.
            </p>
            <div className="cancel-summary">
              <strong>{selected.title}</strong>
              <span>{selected.resource.name}</span>
              <small>
                {formatDate(selected.startAt)} · {formatTime(selected.startAt)}{" "}
                às {formatTime(selected.endAt)}
              </small>
            </div>
            {cancelError && <Feedback>{cancelError}</Feedback>}
            <div className="dialog-actions">
              <Button
                label="Manter reserva"
                outlined
                disabled={busy}
                onClick={() => setSelected(null)}
              />
              <Button
                label="Sim, cancelar reserva"
                severity="danger"
                loading={busy}
                disabled={busy}
                onClick={() => void cancel()}
              />
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
