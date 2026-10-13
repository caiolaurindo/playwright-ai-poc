import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DatabaseService, ReservationRow } from "../database/database.service";
import { CreateReservationDto } from "./reservation.dto";
import { validatePeriod } from "./period";
import { DEMO_COLLABORATOR } from "../demo-collaborator";

@Injectable()
export class ReservationsService {
  constructor(private readonly database: DatabaseService) {}

  mine() {
    const rows = this.database.db
      .prepare(
        "SELECT * FROM reservations WHERE collaboratorId = ? ORDER BY startAt DESC, createdAt DESC",
      )
      .all(DEMO_COLLABORATOR.id) as unknown as ReservationRow[];
    return rows.map((row) => this.database.hydrate(row));
  }

  create(dto: CreateReservationDto) {
    if (dto.requestType !== "Reunião interna" && !dto.requestDetail?.trim())
      throw new BadRequestException("Informe o detalhe solicitado para este tipo de solicitação.");
    const resource = this.database.resource(dto.resourceId);
    if (!resource) throw new NotFoundException("Recurso não encontrado.");
    if (dto.participants > resource.capacity)
      throw new BadRequestException(
        resource.type === "room"
          ? `Esta sala comporta até ${resource.capacity} pessoas.`
          : "Reserve um equipamento para um responsável.",
      );
    const period = validatePeriod(dto.startAt, dto.endAt, true);
    const reservation: ReservationRow = {
      id: randomUUID(),
      resourceId: dto.resourceId,
      collaboratorId: DEMO_COLLABORATOR.id,
      title: dto.title,
      organization: dto.organization,
      requestType: dto.requestType,
      requestDetail: dto.requestDetail?.trim() ?? "",
      notes: dto.notes?.trim() ?? "",
      participants: dto.participants,
      ...period,
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    // Consulta e inserção na mesma transação: duas solicitações não podem ocupar o mesmo período.
    this.database.db.exec("BEGIN IMMEDIATE");
    try {
      if (
        this.database.hasConflict(dto.resourceId, period.startAt, period.endAt)
      )
        throw new ConflictException(
          "Este recurso já está reservado nesse período. Escolha outro horário.",
        );
      this.database.db
        .prepare(
          "INSERT INTO reservations (id, resourceId, collaboratorId, title, notes, participants, startAt, endAt, status, createdAt, organization, requestType, requestDetail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          reservation.id,
          reservation.resourceId,
          reservation.collaboratorId,
          reservation.title,
          reservation.notes,
          reservation.participants,
          reservation.startAt,
          reservation.endAt,
          reservation.status,
          reservation.createdAt,
          reservation.organization,
          reservation.requestType,
          reservation.requestDetail,
        );
      this.database.db.exec("COMMIT");
    } catch (error) {
      this.database.db.exec("ROLLBACK");
      throw error;
    }
    return this.database.hydrate(reservation);
  }

  cancel(id: string) {
    const row = this.database.db
      .prepare("SELECT * FROM reservations WHERE id = ? AND collaboratorId = ?")
      .get(id, DEMO_COLLABORATOR.id) as unknown as ReservationRow | undefined;
    if (!row) throw new NotFoundException("Reserva não encontrada.");
    if (row.status === "cancelled") return this.database.hydrate(row);
    if (new Date(row.startAt).getTime() <= Date.now())
      throw new BadRequestException(
        "Só é possível cancelar reservas que ainda não começaram.",
      );
    this.database.db
      .prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?")
      .run(id);
    return this.database.hydrate({ ...row, status: "cancelled" });
  }
}
