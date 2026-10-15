import { expect, test } from "@playwright/test";
import { fakerPT_BR as faker } from "@faker-js/faker";

test("preenche e confirma uma nova reserva", async ({ page }) => {
  const startHour = faker.number.int({ min: 8, max: 16 });
  const period = {
    date: faker.date.future({ years: 1 }).toISOString().slice(0, 10),
    start: `${String(startHour).padStart(2, "0")}:00`,
    end: `${String(startHour + 1).padStart(2, "0")}:00`,
  };
  const reservationData = {
    ...period,
    title: `Reserva de teste ${faker.string.uuid()}`,
    notes: faker.lorem.sentence(),
  };

  await page.goto("http://localhost:3000/");

  await page.getByRole("textbox", { name: "Data" }).fill(period.date);
  await page
    .getByRole("textbox", { name: "Horário de início" })
    .fill(period.start);
  await page
    .getByRole("textbox", { name: "Horário de término" })
    .fill(period.end);
  const resourcesResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/resources" &&
      response.request().method() === "GET" &&
      response.ok(),
  );
  await page
    .getByRole("button", { name: "Consultar disponibilidade" })
    .click();
  await resourcesResponse;
  await expect(page.getByRole("button", { name: "Nova reserva" })).toBeEnabled();

  const resourceButtons = page.getByRole("button", { name: /^Reservar / });
  let openedReservation = false;
  for (let index = 0; index < (await resourceButtons.count()); index += 1) {
    const resourceButton = resourceButtons.nth(index);
    if (await resourceButton.isEnabled()) {
      await resourceButton.click();
      openedReservation = true;
      break;
    }
  }
  expect(openedReservation, "deve haver uma sala livre no período gerado").toBe(
    true,
  );

  const form = page.getByRole("dialog", { name: "Nova reserva" });
  const participantField = form.getByRole("spinbutton", {
    name: "Participantes *",
  });
  const capacity = Number(await participantField.getAttribute("max"));
  const reservationCase = {
    organization: await form
      .getByRole("textbox", { name: "Organização *" })
      .inputValue(),
    requestType: await form
      .getByRole("textbox", { name: "Tipo de solicitação *" })
      .inputValue(),
    resource: await form
      .getByRole("textbox", { name: "Ambiente ou equipamento *" })
      .inputValue(),
    ...reservationData,
    participants: String(faker.number.int({ min: 1, max: capacity })),
  };

  await form
    .getByRole("textbox", { name: "Título da reserva *" })
    .fill(reservationCase.title);
  await form
    .getByRole("textbox", { name: "Data *" })
    .fill(reservationCase.date);
  await form
    .getByRole("textbox", { name: "Início *" })
    .fill(reservationCase.start);
  await form
    .getByRole("textbox", { name: "Término *" })
    .fill(reservationCase.end);
  await participantField.fill(reservationCase.participants);
  await form
    .getByRole("textbox", { name: "Observações" })
    .fill(reservationCase.notes);

  await expect(
    form.getByRole("textbox", { name: "Organização *" }),
  ).toHaveValue(reservationCase.organization);
  await expect(
    form.getByRole("textbox", { name: "Tipo de solicitação *" }),
  ).toHaveValue(reservationCase.requestType);
  await expect(
    form.getByRole("textbox", { name: "Ambiente ou equipamento *" }),
  ).toHaveValue(reservationCase.resource);
  await expect(
    form.getByRole("textbox", { name: "Título da reserva *" }),
  ).toHaveValue(reservationCase.title);
  await expect(form.getByRole("textbox", { name: "Data *" })).toHaveValue(
    reservationCase.date,
  );
  await expect(form.getByRole("textbox", { name: "Início *" })).toHaveValue(
    reservationCase.start,
  );
  await expect(form.getByRole("textbox", { name: "Término *" })).toHaveValue(
    reservationCase.end,
  );
  await expect(
    form.getByRole("spinbutton", { name: "Participantes *" }),
  ).toHaveValue(reservationCase.participants);
  await expect(form.getByRole("textbox", { name: "Observações" })).toHaveValue(
    reservationCase.notes,
  );

  await form.getByRole("button", { name: "Confirmar reserva" }).click();

  await expect(
    page
      .getByRole("status")
      .filter({
        hasText: `Reserva de ${reservationCase.resource} confirmada com sucesso.`,
      }),
  ).toBeVisible();
});
