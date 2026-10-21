import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Resource, Reservation } from "../contracts";
import { SEED_RESOURCES } from "./seed";

interface ResourceRow extends Omit<Resource, "features" | "available"> {
  features: string;
}
export type ReservationRow = Omit<Reservation, "resource">;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly db: DatabaseSync;

  constructor() {
    const defaultDbPath = process.env.VERCEL
      ? "/tmp/agendalab.sqlite"
      : "./data/agendalab.sqlite";
    const path = resolve(process.env.DATABASE_PATH ?? defaultDbPath);
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
        location TEXT NOT NULL, description TEXT NOT NULL,
        capacity INTEGER NOT NULL, features TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY, resourceId TEXT NOT NULL REFERENCES resources(id),
        collaboratorId TEXT NOT NULL, title TEXT NOT NULL, notes TEXT NOT NULL,
        participants INTEGER NOT NULL, startAt TEXT NOT NULL, endAt TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('confirmed', 'cancelled')), createdAt TEXT NOT NULL,
        organization TEXT NOT NULL DEFAULT 'Perpart',
        requestType TEXT NOT NULL DEFAULT 'Reunião interna', requestDetail TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX IF NOT EXISTS reservations_period ON reservations(resourceId, status, startAt, endAt);
    `);
    const reservationColumns = this.db
      .prepare("PRAGMA table_info(reservations)")
      .all() as { name: string }[];
    if (!reservationColumns.some((column) => column.name === "organization"))
      this.db.exec("ALTER TABLE reservations ADD COLUMN organization TEXT NOT NULL DEFAULT 'Perpart'");
    if (!reservationColumns.some((column) => column.name === "requestType"))
      this.db.exec("ALTER TABLE reservations ADD COLUMN requestType TEXT NOT NULL DEFAULT 'Reunião interna'");
    if (!reservationColumns.some((column) => column.name === "requestDetail"))
      this.db.exec("ALTER TABLE reservations ADD COLUMN requestDetail TEXT NOT NULL DEFAULT ''");
    const insert = this.db.prepare(
      "INSERT OR IGNORE INTO resources VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    for (const resource of SEED_RESOURCES) {
      insert.run(
        resource.id,
        resource.name,
        resource.type,
        resource.location,
        resource.description,
        resource.capacity,
        JSON.stringify(resource.features),
      );
    }
  }

  resources(): Resource[] {
    const rows = this.db
      .prepare("SELECT * FROM resources ORDER BY rowid")
      .all() as unknown as ResourceRow[];
    return rows.map((row) => ({
      ...row,
      features: JSON.parse(row.features) as string[],
      available: true,
    }));
  }

  resource(id: string): Resource | undefined {
    return this.resources().find((resource) => resource.id === id);
  }

  hasConflict(resourceId: string, startAt: string, endAt: string): boolean {
    return Boolean(
      this.db
        .prepare(
          `SELECT id FROM reservations
      WHERE resourceId = ? AND status = 'confirmed' AND startAt < ? AND endAt > ? LIMIT 1`,
        )
        .get(resourceId, endAt, startAt),
    );
  }

  hydrate(row: ReservationRow): Reservation {
    return { ...row, resource: this.resource(row.resourceId)! };
  }

  onModuleDestroy() {
    this.db.close();
  }
}
