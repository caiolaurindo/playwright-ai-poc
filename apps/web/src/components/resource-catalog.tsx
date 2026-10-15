"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dropdown,
  Icon,
  InputText,
  Tag,
  Typography,
} from "@uigovpe/components";
import type { Resource, ResourceType } from "@agendalab/contracts";
import { api } from "@/lib/api";
import {
  formatDate,
  initialPeriod,
  localDate,
  periodError,
  toTimestamp,
} from "@/lib/dates";
import { EmptyState, Feedback } from "./feedback";
import { ReservationDialog, type Period } from "./reservation-dialog";

const TYPES = [
  { label: "Todos os recursos", value: "all" },
  { label: "Salas de reunião", value: "room" },
  { label: "Projetores", value: "projector" },
  { label: "Notebooks", value: "notebook" },
];
const CAPACITIES = [
  { label: "Qualquer capacidade", value: 0 },
  { label: "4 ou mais pessoas", value: 4 },
  { label: "8 ou mais pessoas", value: 8 },
  { label: "12 ou mais pessoas", value: 12 },
  { label: "20 ou mais pessoas", value: 20 },
];
const ICONS: Record<ResourceType, string> = {
  room: "pi-building",
  projector: "pi-video",
  notebook: "pi-desktop",
};
const LABELS: Record<ResourceType, string> = {
  room: "Sala de reunião",
  projector: "Projetor",
  notebook: "Notebook",
};

export function ResourceCatalog() {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [draft, setDraft] = useState<Period>(initialPeriod);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ResourceType | "all">("room");
  const [capacity, setCapacity] = useState(0);
  const [availability, setAvailability] = useState<"all" | "available">("all");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [success, setSuccess] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [dialog, setDialog] = useState<{ selected: Resource | null } | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const query = new URLSearchParams({
      startAt: toTimestamp(period.date, period.start),
      endAt: toTimestamp(period.date, period.end),
    });
    void api<Resource[]>(`/resources?${query}`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResources(data);
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Não foi possível carregar os recursos.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [period, refresh]);

  const filtered = useMemo(
    () =>
      resources.filter(
        (resource) =>
          (type === "all" || resource.type === type) &&
          resource.capacity >= capacity &&
          (availability !== "available" || resource.available) &&
          `${resource.name} ${resource.location} ${resource.features.join(" ")}`
            .toLocaleLowerCase("pt-BR")
            .includes(search.toLocaleLowerCase("pt-BR").trim()),
      ),
    [resources, type, capacity, availability, search],
  );
  const available = filtered.filter((resource) => resource.available).length;
  function clearFilters() {
    setSearch("");
    setType("room");
    setCapacity(0);
    setAvailability("all");
    setFilterError("");
  }
  function applyPeriod(event: React.FormEvent) {
    event.preventDefault();
    const invalid = periodError(draft.date, draft.start, draft.end);
    setFilterError(invalid);
    if (!invalid) {
      setPeriod({ ...draft });
      setSuccess("");
    }
  }

  return (
    <>
      <div className="breadcrumb">
        <i className="pi pi-home" aria-hidden="true" />
        <span>/</span> AgendaLab <span>/</span>
        <strong>Ambientes e equipamentos</strong>
      </div>
      <section className="page-intro">
        <div>
          <span className="eyebrow">ESPAÇOS PARA COLABORAR</span>
          <Typography variant="h1">
            Seu próximo encontro começa aqui.
          </Typography>
          <p>
            Encontre o ambiente ideal e reserve os recursos que sua equipe
            precisa.
          </p>
        </div>
        <Button
          label="Nova reserva"
          icon={<Icon icon="add" outline />}
          onClick={() => {
            setSuccess("");
            setDialog({ selected: null });
          }}
          disabled={loading || !!error || !resources.length}
        />
      </section>
      <section
        className="availability-panel"
        aria-labelledby="availability-heading"
      >
        <div className="panel-title">
          <span className="panel-icon">
            <i className="pi pi-calendar" aria-hidden="true" />
          </span>
          <div id="availability-heading">
            <Typography variant="h2">
              Quando você precisa?
            </Typography>
            <p>Consulte a disponibilidade para o período desejado.</p>
          </div>
          <span className="business-hours">
            <i className="pi pi-clock" aria-hidden="true" /> 08h às 18h ·
            Brasília
          </span>
        </div>
        <form className="availability-form" onSubmit={applyPeriod}>
          <InputText
            inputId="filtro-data"
            label="Data"
            type="date"
            value={draft.date}
            onChange={(event) =>
              setDraft({ ...draft, date: event.target.value })
            }
            min={localDate()}
            required
          />
          <InputText
            inputId="filtro-inicio"
            label="Horário de início"
            type="time"
            value={draft.start}
            onChange={(event) =>
              setDraft({ ...draft, start: event.target.value })
            }
            min="08:00"
            max="17:59"
            step={60}
            required
          />
          <InputText
            inputId="filtro-fim"
            label="Horário de término"
            type="time"
            value={draft.end}
            onChange={(event) =>
              setDraft({ ...draft, end: event.target.value })
            }
            min="08:01"
            max="18:00"
            step={60}
            required
          />
          <Button
            type="submit"
            label="Consultar disponibilidade"
            icon={<Icon icon="search" outline />}
            loading={loading}
            disabled={loading}
          />
        </form>
        {filterError && <Feedback>{filterError}</Feedback>}
      </section>
      {success && (
        <Feedback tone="success">
          {success} <Link href="/minhas-reservas">Ver minhas reservas</Link>
        </Feedback>
      )}
      <section className="catalog-section" aria-labelledby="catalog-heading">
        <div className="catalog-title">
          <div id="catalog-heading">
            <Typography variant="h2">
              Ambientes e equipamentos
            </Typography>
            <p>
              Disponibilidade em {formatDate(toTimestamp(period.date, "12:00"))}
              , das {period.start} às {period.end}.
            </p>
          </div>
          <span className="available-summary">
            <span className="status-dot" />
            {loading
              ? "Consultando…"
              : error
                ? "Consulta indisponível"
                : `${available} ${available === 1 ? "recurso disponível" : "recursos disponíveis"}`}
          </span>
        </div>
        <div className="catalog-filters">
          <div className="search-field">
            <i className="pi pi-search" aria-hidden="true" />
            <InputText
              inputId="busca-recursos"
              aria-label="Buscar ambiente ou equipamento"
              placeholder="Buscar por nome, local ou recurso…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Dropdown
            inputId="filtro-tipo"
            aria-label="Tipo de recurso"
            value={type}
            options={TYPES}
            onChange={(event) => {
              setType(event.value as ResourceType | "all");
              setCapacity(0);
            }}
          />
          <Dropdown
            inputId="filtro-capacidade"
            aria-label="Capacidade mínima da sala"
            value={capacity}
            options={CAPACITIES}
            onChange={(event) => setCapacity(event.value as number)}
            disabled={type !== "room"}
          />
        </div>
        <div className="results-toolbar">
          <div
            className="segmented-control"
            role="group"
            aria-label="Filtrar disponibilidade"
          >
            <button
              onClick={() => setAvailability("all")}
              aria-pressed={availability === "all"}
              className={availability === "all" ? "selected" : ""}
            >
              Todos
            </button>
            <button
              onClick={() => setAvailability("available")}
              aria-pressed={availability === "available"}
              className={availability === "available" ? "selected" : ""}
            >
              Disponíveis
            </button>
          </div>
          <span>
            {!loading && !error
              ? `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`
              : " "}
          </span>
        </div>
        {error ? (
          <div className="load-error">
            <Feedback>{error}</Feedback>
            <Button
              label="Tentar novamente"
              outlined
              icon={<Icon icon="refresh" outline />}
              onClick={() => setRefresh((value) => value + 1)}
            />
          </div>
        ) : loading ? (
          <div
            className="resource-grid"
            aria-label="Carregando recursos"
            role="status"
          >
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="resource-skeleton">
                <div />
                <div />
                <div />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Nenhum recurso encontrado"
            description="Experimente ajustar a busca, a capacidade ou o filtro de disponibilidade."
            action={clearFilters}
          />
        ) : (
          <div className="resource-grid">
            {filtered.map((resource, index) => (
              <article className="resource-card" key={resource.id}>
                <div
                  className={`resource-illustration illustration-${index % 3} ${resource.type !== "room" ? "equipment-illustration" : ""}`}
                >
                  <span className="illustration-grid" />
                  {resource.type === "room" ? (
                    <div className="room-plan" aria-hidden="true">
                      <div className="meeting-table" />
                      <span className="chair chair-1" />
                      <span className="chair chair-2" />
                      <span className="chair chair-3" />
                      <span className="chair chair-4" />
                      <span className="chair chair-5" />
                      <span className="chair chair-6" />
                    </div>
                  ) : (
                    <i
                      className={`pi ${ICONS[resource.type]}`}
                      aria-hidden="true"
                    />
                  )}
                  <span className="resource-type">
                    <i
                      className={`pi ${ICONS[resource.type]}`}
                      aria-hidden="true"
                    />
                    {LABELS[resource.type]}
                  </span>
                </div>
                <div className="resource-card-body">
                  <div className="resource-heading">
                    <Typography variant="h3">{resource.name}</Typography>
                    <Tag
                      value={resource.available ? "Disponível" : "Reservado"}
                      severity={resource.available ? "success" : "warning"}
                    />
                  </div>
                  <p className="resource-location">
                    <i className="pi pi-map-marker" aria-hidden="true" />
                    {resource.location}
                  </p>
                  <p className="resource-description">{resource.description}</p>
                  <div className="feature-list">
                    {resource.features.slice(0, 3).map((feature) => (
                      <span key={feature}>{feature}</span>
                    ))}
                    {resource.features.length > 3 && (
                      <span title={resource.features.slice(3).join(", ")}>
                        +{resource.features.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="resource-card-footer">
                    <span>
                      <i
                        className={`pi ${resource.type === "room" ? "pi-users" : "pi-box"}`}
                        aria-hidden="true"
                      />
                      {resource.type === "room"
                        ? `Até ${resource.capacity} pessoas`
                        : "1 equipamento"}
                    </span>
                    <Button
                      label="Reservar"
                      outlined
                      icon={<Icon icon="arrow_forward" outline />}
                      iconPos="right"
                      aria-label={`Reservar ${resource.name}`}
                      disabled={!resource.available}
                      onClick={() => {
                        setSuccess("");
                        setDialog({ selected: resource });
                      }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <aside className="help-note">
        <span>
          <i className="pi pi-info-circle" aria-hidden="true" />
        </span>
        <div>
          <strong>Um espaço para todos, uma reserva por vez.</strong>
          <p>
            Não vai utilizar o recurso? Cancele sua reserva para que outra
            pessoa possa aproveitar.
          </p>
        </div>
        <Link href="/minhas-reservas">
          Gerenciar minhas reservas{" "}
          <i className="pi pi-arrow-right" aria-hidden="true" />
        </Link>
      </aside>
      {dialog && (
        <ReservationDialog
          resources={resources}
          selected={dialog.selected}
          initial={period}
          onClose={() => setDialog(null)}
          onCreated={(reservation) => {
            setDialog(null);
            setSuccess(
              `Reserva de ${reservation.resource.name} confirmada com sucesso.`,
            );
            setRefresh((value) => value + 1);
          }}
        />
      )}
    </>
  );
}
