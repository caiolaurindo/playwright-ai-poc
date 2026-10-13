import { expect, test } from "@playwright/test";

test("preenche e confirma uma nova reserva", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  await page.getByRole("button", { name: "Nova reserva" }).click();

  const form = page.getByRole("dialog");
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
    title: "Teste automatizado de reserva",
    date: await form.getByRole("textbox", { name: "Data *" }).inputValue(),
    start: await form.getByRole("textbox", { name: "Início *" }).inputValue(),
    end: await form.getByRole("textbox", { name: "Término *" }).inputValue(),
    participants: "2",
    notes: "Reserva criada pelo teste automatizado Playwright.",
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
  await form
    .getByRole("spinbutton", { name: "Participantes *" })
    .fill(reservationCase.participants);
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
