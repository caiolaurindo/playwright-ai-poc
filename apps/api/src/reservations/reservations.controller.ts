import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ReservationsService } from "./reservations.service";
import { CreateReservationDto } from "./reservation.dto";

@Controller("reservations")
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}
  @Get("mine") mine() {
    return this.reservations.mine();
  }
  @Post() create(@Body() dto: CreateReservationDto) {
    return this.reservations.create(dto);
  }
  @Patch(":id/cancel") cancel(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.reservations.cancel(id);
  }
}
