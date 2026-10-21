import { expect, test } from "@playwright/test";
import { fakerPT_BR as faker } from "@faker-js/faker";

test.setTimeout(90_000);

async function openCatalog(page: import("@playwright/test").Page) {
  await page.goto("http://localhost:3000/");
  await expect(
    page.getByRole("heading", { name: "Ambientes e equipamentos", level: 2 }),
  ).toBeVisible({ timeout: 30_000 });

  const retryButton = page.getByRole("button", { name: "Tentar novamente" });
  await expect(async () => {
    if (await retryButton.isVisible()) {
      await retryButton.click();
    }
    await expect(page.getByRole("status", { name: "Carregando recursos" })).not.toBeVisible();
    await expect(page.locator(".load-error")).not.toBeVisible();
    await expect(page.locator(".resource-card").first()).toBeVisible();
  }).toPass({ timeout: 30_000 });
}

test.describe("Catálogo: busca e filtros @catalogo", () => {
  test("busca sala por nome com correspondência exata ou parcial", async ({ page }) => {
    await openCatalog(page);

    const searchInput = page.getByRole("textbox", { name: "Buscar ambiente ou equipamento" });
    await expect(searchInput).toBeVisible();

    // Busca pela Sala Capibaribe
    await searchInput.fill("Capibaribe");

    // Verifica que o card da Sala Capibaribe está visível e os outros não aparecem
    await expect(page.locator(".resource-card", { hasText: "Sala Capibaribe" })).toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Sala Beberibe" })).not.toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Sala Frevo" })).not.toBeVisible();

    // Verifica o contador de resultados
    await expect(page.getByText("1 resultado", { exact: true })).toBeVisible();
  });

  test("busca sala por característica e localização de forma insensível a maiúsculas/minúsculas", async ({ page }) => {
    await openCatalog(page);

    const searchInput = page.getByRole("textbox", { name: "Buscar ambiente ou equipamento" });

    // Busca por característica em minúsculas
    await searchInput.fill("videoconferência");
    await expect(page.locator(".resource-card", { hasText: "Sala Beberibe" })).toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Sala Atlântico" })).toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Sala Capibaribe" })).not.toBeVisible();

    // Busca por localização em maiúsculas
    await searchInput.fill("ANEXO ADMINISTRATIVO");
    await expect(page.locator(".resource-card", { hasText: "Sala Frevo" })).toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Sala Boa Vista" })).toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Sala Capibaribe" })).not.toBeVisible();
  });

  test("exibe estado vazio e permite limpar filtros quando nenhum recurso é encontrado", async ({ page }) => {
    await openCatalog(page);

    const randomQuery = faker.string.alphanumeric(14);
    const searchInput = page.getByRole("textbox", { name: "Buscar ambiente ou equipamento" });

    await searchInput.fill(randomQuery);

    // Valida exibição do EmptyState
    const emptyStateHeading = page.getByRole("heading", { name: "Nenhum recurso encontrado", level: 2 });
    await expect(emptyStateHeading).toBeVisible();
    await expect(
      page.getByText("Experimente ajustar a busca, a capacidade ou o filtro de disponibilidade."),
    ).toBeVisible();

    // Clica no botão para limpar filtros
    const clearButton = page.getByRole("button", { name: "Limpar filtros" });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Valida que o campo de busca foi limpo e os cards foram restaurados
    await expect(searchInput).toHaveValue("");
    await expect(emptyStateHeading).not.toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Sala Capibaribe" })).toBeVisible();
  });

  test("filtra por notebooks e valida desativação do filtro de capacidade", async ({ page }) => {
    await openCatalog(page);

    const typeDropdown = page.locator(".catalog-filters").locator(".p-dropdown").first();
    const capacityDropdown = page.locator(".catalog-filters").locator(".p-dropdown").nth(1);

    await typeDropdown.click();
    await page.getByRole("option", { name: "Notebooks" }).click();

    // Valida que apenas os notebooks são exibidos
    await expect(page.locator(".resource-card", { hasText: "Notebook Dell 01" })).toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Notebook Dell 02" })).toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Sala Capibaribe" })).not.toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Projetor Epson 01" })).not.toBeVisible();

    // Capacidade deve ficar desabilitada para tipos diferentes de sala
    await expect(capacityDropdown).toHaveClass(/p-disabled/);
  });

  test("filtra por projetores e valida desativação do filtro de capacidade", async ({ page }) => {
    await openCatalog(page);

    const typeDropdown = page.locator(".catalog-filters").locator(".p-dropdown").first();
    const capacityDropdown = page.locator(".catalog-filters").locator(".p-dropdown").nth(1);

    await typeDropdown.click();
    await page.getByRole("option", { name: "Projetores" }).click();

    await expect(page.locator(".resource-card", { hasText: "Projetor Epson 01" })).toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Notebook Dell 01" })).not.toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Sala Capibaribe" })).not.toBeVisible();
    await expect(capacityDropdown).toHaveClass(/p-disabled/);
  });

  test("filtra por todos os recursos exibindo salas, notebooks e projetores", async ({ page }) => {
    await openCatalog(page);

    const typeDropdown = page.locator(".catalog-filters").locator(".p-dropdown").first();

    await typeDropdown.click();
    await page.getByRole("option", { name: "Todos os recursos" }).click();

    await expect(page.locator(".resource-card", { hasText: "Sala Capibaribe" })).toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Notebook Dell 01" })).toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Projetor Epson 01" })).toBeVisible();
    await expect(page.getByText("9 resultados", { exact: true })).toBeVisible();
  });

  test("filtra salas por capacidade mínima", async ({ page }) => {
    await openCatalog(page);

    const capacityDropdown = page.locator(".catalog-filters").locator(".p-dropdown").nth(1);

    // Seleciona "8 ou mais pessoas"
    await capacityDropdown.click();
    await page.getByRole("option", { name: "8 ou mais pessoas" }).click();

    // Salas com capacidade >= 8 devem aparecer
    await expect(page.locator(".resource-card", { hasText: "Sala Capibaribe" })).toBeVisible(); // 8
    await expect(page.locator(".resource-card", { hasText: "Sala Frevo" })).toBeVisible(); // 10
    await expect(page.locator(".resource-card", { hasText: "Sala Beberibe" })).toBeVisible(); // 12
    await expect(page.locator(".resource-card", { hasText: "Sala Atlântico" })).toBeVisible(); // 20

    // Salas com capacidade < 8 NÃO devem aparecer
    await expect(page.locator(".resource-card", { hasText: "Sala Boa Vista" })).not.toBeVisible(); // 4
    await expect(page.locator(".resource-card", { hasText: "Sala Araripe" })).not.toBeVisible(); // 6

    // Seleciona "20 ou mais pessoas"
    await capacityDropdown.click();
    await page.getByRole("option", { name: "20 ou mais pessoas" }).click();

    await expect(page.locator(".resource-card", { hasText: "Sala Atlântico" })).toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Sala Capibaribe" })).not.toBeVisible();
    await expect(page.getByText("1 resultado", { exact: true })).toBeVisible();
  });

  test("combina busca por texto com filtro de tipo de recurso", async ({ page }) => {
    await openCatalog(page);

    const typeDropdown = page.locator(".catalog-filters").locator(".p-dropdown").first();
    const searchInput = page.getByRole("textbox", { name: "Buscar ambiente ou equipamento" });

    // Seleciona Notebooks
    await typeDropdown.click();
    await page.getByRole("option", { name: "Notebooks" }).click();

    // Refina a busca por termo específico do Notebook 02 (localizado no Anexo)
    await searchInput.fill("Anexo");

    await expect(page.locator(".resource-card", { hasText: "Notebook Dell 02" })).toBeVisible();
    await expect(page.locator(".resource-card", { hasText: "Notebook Dell 01" })).not.toBeVisible();
    await expect(page.getByText("1 resultado", { exact: true })).toBeVisible();
  });

  test("filtra por status de disponibilidade usando o controle segmentado", async ({ page }) => {
    // Usando page.route para simular uma lista controlada com salas disponíveis e ocupadas
    const mockResources = [
      {
        id: "sala-disponivel-1",
        name: `Sala Disponível ${faker.string.alphanumeric(4)}`,
        type: "room",
        location: "Edifício Sede · 1º andar",
        capacity: 10,
        description: "Espaço disponível para reuniões.",
        features: ["Wi-Fi", "Ar-condicionado"],
        available: true,
      },
      {
        id: "sala-ocupada-1",
        name: `Sala Ocupada ${faker.string.alphanumeric(4)}`,
        type: "room",
        location: "Edifício Sede · 2º andar",
        capacity: 12,
        description: "Espaço reservado para diretoria.",
        features: ["Projetor", "Wi-Fi"],
        available: false,
      },
    ];

    await page.route("**/resources*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockResources),
      });
    });

    await openCatalog(page);

    const availableRoomCard = page.locator(".resource-card", { hasText: mockResources[0].name });
    const busyRoomCard = page.locator(".resource-card", { hasText: mockResources[1].name });

    // No estado inicial ("Todos"), ambos aparecem
    await expect(availableRoomCard).toBeVisible();
    await expect(busyRoomCard).toBeVisible();
    await expect(busyRoomCard.getByText("Reservado", { exact: true })).toBeVisible();
    await expect(busyRoomCard.getByRole("button", { name: `Reservar ${mockResources[1].name}` })).toBeDisabled();
    await expect(page.getByText("2 resultados", { exact: true })).toBeVisible();

    // Clica no filtro "Disponíveis"
    const availableFilterButton = page.getByRole("button", { name: "Disponíveis" });
    await availableFilterButton.click();

    // Apenas a sala disponível deve permanecer
    await expect(availableRoomCard).toBeVisible();
    await expect(busyRoomCard).not.toBeVisible();
    await expect(page.getByText("1 resultado", { exact: true })).toBeVisible();

    // Alterna de volta para "Todos"
    const allFilterButton = page.getByRole("button", { name: "Todos" });
    await allFilterButton.click();

    await expect(availableRoomCard).toBeVisible();
    await expect(busyRoomCard).toBeVisible();
    await expect(page.getByText("2 resultados", { exact: true })).toBeVisible();
  });
});

