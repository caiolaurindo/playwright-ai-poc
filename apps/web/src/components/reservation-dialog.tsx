"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  Dropdown,
  InputNumber,
  InputText,
  InputTextarea,
} from "@uigovpe/components";
import type {
  CreateReservation,
  Reservation,
  Resource,
} from "@agendalab/contracts";
import { api } from "@/lib/api";
import { localDate, periodError, toTimestamp } from "@/lib/dates";
import { Feedback } from "./feedback";

export interface Period {
  date: string;
  start: string;
  end: string;
}

export function ReservationDialog({
  resources,
  selected,
  initial,
  onClose,
  onCreated,
}: {
  resources: Resource[];
  selected: Resource | null;
  initial: Period;
  onClose: () => void;
  onCreated: (reservation: Reservation) => void;
}) {
  const [resourceId, setResourceId] = useState(
    selected?.id ??
      resources.find((item) => item.available)?.id ??
      resources[0]?.id ??
      "",
  );
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [participants, setParticipants] = useState<number | null>(1);
  const [period, setPeriod] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const resource = resources.find((item) => item.id === resourceId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const invalidPeriod = periodError(period.date, period.start, period.end);
    if (invalidPeriod) {
      setError(invalidPeriod);
      return;
    }
    if (!resource) {
      setError("Selecione um ambiente ou equipamento.");
      return;
    }
    if (title.trim().length < 3) {
      setError("Informe um título com pelo menos 3 caracteres.");
      return;
    }
    if (
      participants === null ||
      participants < 1 ||
      participants > resource.capacity
    ) {
      setError(`Informe de 1 a ${resource.capacity} participantes.`);
      return;
    }
    setBusy(true);
    setError("");
    const payload: CreateReservation = {
      resourceId,
      title: title.trim(),
      notes: notes.trim(),
      participants,
      startAt: toTimestamp(period.date, period.start),
      endAt: toTimestamp(period.date, period.end),
    };
    try {
      const reservation = await api<Reservation>("/reservations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onCreated(reservation);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível criar a reserva.",
      );
      setBusy(false);
    }
  }

  return (
    <Dialog
      visible
      header="Nova reserva"
      onHide={() => {
        if (!busy) onClose();
      }}
      modal
      closable={!busy}
      dismissableMask={false}
      closeOnEscape={!busy}
      blockScroll
      className="reservation-dialog"
      style={{ width: "600px" }}
      breakpoints={{ "640px": "95vw" }}
    >
      <p className="dialog-description">
        Escolha o recurso e o período. Sua reserva será confirmada na hora.
      </p>
      <form onSubmit={submit} className="reservation-form">
        <Dropdown
          inputId="reserva-recurso"
          label="Ambiente ou equipamento *"
          value={resourceId}
          options={resources}
          optionLabel="name"
          optionValue="id"
          onChange={(event) => {
            setResourceId(event.value as string);
            setParticipants(1);
          }}
          disabled={busy}
          placeholder="Selecione um recurso"
        />
        {resource && (
          <div className="selected-resource">
            <i
              className={`pi ${resource.type === "room" ? "pi-building" : resource.type === "projector" ? "pi-video" : "pi-desktop"}`}
              aria-hidden="true"
            />
            <span>
              <strong>{resource.name}</strong>
              <small>
                {resource.location}
                {resource.type === "room"
                  ? ` · Até ${resource.capacity} pessoas`
                  : ""}
              </small>
            </span>
          </div>
        )}
        <InputText
          inputId="reserva-titulo"
          label="Título da reserva *"
          placeholder="Ex.: Alinhamento da equipe"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          required
          minLength={3}
          disabled={busy}
          autoFocus
        />
        <div className="form-period">
          <InputText
            inputId="reserva-data"
            label="Data *"
            type="date"
            value={period.date}
            onChange={(event) =>
              setPeriod({ ...period, date: event.target.value })
            }
            min={localDate()}
            required
            disabled={busy}
          />
          <InputText
            inputId="reserva-inicio"
            label="Início *"
            type="time"
            value={period.start}
            onChange={(event) =>
              setPeriod({ ...period, start: event.target.value })
            }
            min="08:00"
            max="17:59"
            step={60}
            required
            disabled={busy}
          />
          <InputText
            inputId="reserva-fim"
            label="Término *"
            type="time"
            value={period.end}
            onChange={(event) =>
              setPeriod({ ...period, end: event.target.value })
            }
            min="08:01"
            max="18:00"
            step={60}
            required
            disabled={busy}
          />
        </div>
        {resource?.type === "room" && (
          <InputNumber
            inputId="reserva-participantes"
            label="Participantes *"
            value={participants}
            onValueChange={(event) => setParticipants(event.value ?? null)}
            min={1}
            max={resource.capacity}
            useGrouping={false}
            maxFractionDigits={0}
            required
            disabled={busy}
            supportText={`Capacidade máxima: ${resource.capacity} pessoas.`}
          />
        )}
        <InputTextarea
          inputId="reserva-observacoes"
          label="Observações"
          placeholder="Alguma informação adicional?"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          maxLength={500}
          disabled={busy}
          supportText={`${notes.length}/500 caracteres · Opcional`}
        />
        <p className="form-hint">
          <i className="pi pi-info-circle" aria-hidden="true" /> Reservas entre
          08h e 18h, no horário de Brasília. Campos com * são obrigatórios.
        </p>
        {error && <Feedback>{error}</Feedback>}
        <div className="dialog-actions">
          <Button
            type="button"
            label="Voltar"
            outlined
            onClick={onClose}
            disabled={busy}
          />
          <Button
            type="submit"
            label="Confirmar reserva"
            icon="pi pi-check"
            loading={busy}
            disabled={busy || !resource}
          />
        </div>
      </form>
    </Dialog>
  );
}
