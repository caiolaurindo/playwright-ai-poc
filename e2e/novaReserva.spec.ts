import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  await page.getByRole("button", { name: "Nova reserva" }).click();
  await page.getByRole("button", { name: "Selecione um recurso" }).click();
  await page.getByRole("option", { name: "Sala Araripe" }).click();
  await page.getByRole("textbox", { name: "Título da reserva *" }).click();
  await page
    .getByRole("textbox", { name: "Título da reserva *" })
    .press("CapsLock");
  await page.getByRole("textbox", { name: "Título da reserva *" }).fill("A");
  await page
    .getByRole("textbox", { name: "Título da reserva *" })
    .press("CapsLock");
  await page
    .getByRole("textbox", { name: "Título da reserva *" })
    .fill("Alinhamento da equipe");
  await page.getByRole("textbox", { name: "Data *" }).fill("2026-10-17");
  await page.getByRole("textbox", { name: "Início *" }).fill("13:00");
  await page.getByRole("textbox", { name: "Término *" }).fill("15:00");
  await page.getByRole("spinbutton", { name: "Participantes *" }).click();
  await page.getByRole("textbox", { name: "Observações" }).click();
  await page.getByRole("textbox", { name: "Observações" }).press("CapsLock");
  await page.getByRole("textbox", { name: "Observações" }).fill("V");
  await page.getByRole("textbox", { name: "Observações" }).press("CapsLock");
  await page
    .getByRole("textbox", { name: "Observações" })
    .fill("Vai ser uma reunião da gpi");
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
});
