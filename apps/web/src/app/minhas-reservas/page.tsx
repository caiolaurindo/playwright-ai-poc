import type { Metadata } from "next";
import { MyReservations } from "@/components/my-reservations";

export const metadata: Metadata = { title: "Minhas reservas" };
export default function ReservationsPage() {
  return <MyReservations />;
}
