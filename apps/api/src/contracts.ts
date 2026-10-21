export type ResourceType = "room" | "projector" | "notebook";

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  department: string;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  location: string;
  description: string;
  capacity: number;
  features: string[];
  available: boolean;
}

export interface Reservation {
  id: string;
  resourceId: string;
  collaboratorId: string;
  title: string;
  organization: "Perpart" | "Seduh";
  requestType: "Reunião interna" | "Atendimento externo" | "Capacitação";
  requestDetail: string;
  notes: string;
  participants: number;
  startAt: string;
  endAt: string;
  status: "confirmed" | "cancelled";
  createdAt: string;
  resource: Resource;
}

export interface CreateReservation {
  resourceId: string;
  title: string;
  organization: "Perpart" | "Seduh";
  requestType: "Reunião interna" | "Atendimento externo" | "Capacitação";
  requestDetail?: string;
  notes?: string;
  participants: number;
  startAt: string;
  endAt: string;
}

