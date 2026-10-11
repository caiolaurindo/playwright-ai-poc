import { Module } from "@nestjs/common";
import { DatabaseService } from "./database/database.service";
import { ResourcesController } from "./resources/resources.controller";
import { ReservationsController } from "./reservations/reservations.controller";
import { ReservationsService } from "./reservations/reservations.service";
import { AppController } from "./app.controller";

@Module({
  controllers: [AppController, ResourcesController, ReservationsController],
  providers: [DatabaseService, ReservationsService],
})
export class AppModule {}
