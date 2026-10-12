# AgendaLab: laboratório de testes automatizados com Playwright

Este repositório é um laboratório prático para aprender **testes automatizados com Playwright**. A aplicação usada nos estudos é o **AgendaLab**, um sistema de reserva de ambientes e equipamentos compartilhados: salas de reunião, projetores e notebooks.

A proposta é construir o aprendizado por etapas: conhecer os fluxos da aplicação, escrever os primeiros testes e evoluir a organização da suíte. Os cenários se aproximam de sistemas administrativos do setor público, para facilitar a aplicação dos conceitos no trabalho.

A aplicação utiliza **Next.js no frontend, NestJS na API e SQLite para persistência**, com a identidade visual do UI Kit do Governo de Pernambuco. Todos os dados são fictícios e o projeto não tem vínculo institucional.

**Estado atual:** a aplicação, o Swagger e a integração inicial com Playwright estão implementados. O projeto já conta com arquivos de testes E2E, configuração dos navegadores e workflow no GitHub Actions.

---

## Sumário

1. [Objetivo do laboratório](#1-objetivo-do-laboratório)
2. [O que é Playwright](#2-o-que-é-playwright)
3. [Como rodar a aplicação e a suíte](#3-como-rodar-a-aplicação-e-a-suíte)
4. [Experimente a aplicação](#4-experimente-a-aplicação)
5. [Detalhes do Playwright](#5-detalhes-do-playwright)
   - [5.1. Como instalar](#51-como-instalar)
   - [5.2. Navegação e localizadores](#52-navegação-e-localizadores)
   - [5.3. Ações básicas](#53-ações-básicas)
   - [5.4. Asserções](#54-asserções)
   - [5.5. Exemplo de teste explicado](#55-exemplo-de-teste-explicado)
   - [5.6. Gravar interações com o Codegen](#56-gravar-interações-com-o-codegen)
   - [5.7. Executar testes na UI](#57-executar-testes-na-ui)
   - [5.8. Preparar dados para repetir os testes](#58-preparar-dados-para-repetir-os-testes)
6. [Testes E2E existentes](#6-testes-e2e-existentes)
7. [Configuração do Playwright](#7-configuração-do-playwright)
8. [Workflow do GitHub Actions](#8-workflow-do-github-actions)
9. [Próximos ajustes](#9-próximos-ajustes)
10. [Referências](#10-referências)

---

## 1. Objetivo do laboratório

Aprender a verificar o comportamento de uma aplicação real usando seus fluxos de negócio. O ponto de partida são quatro funcionalidades:

| Funcionalidade                  | Comportamento esperado                                          |
| ------------------------------- | --------------------------------------------------------------- |
| Visualizar salas e equipamentos | Consultar os recursos disponíveis para uma data e um período    |
| Criar uma reserva               | Preencher o formulário e confirmar a reserva de um recurso      |
| Consultar minhas reservas       | Encontrar a reserva criada e acompanhar sua situação            |
| Cancelar uma reserva            | Confirmar o cancelamento e liberar o período para outra reserva |

O estudo vai incluir tanto os fluxos bem-sucedidos quanto situações como campos inválidos, conflitos de horário e listas sem resultados.

---

## 2. Fundamentos do Playwright

O **Playwright Test** é um framework de testes de ponta a ponta para aplicações web. Ele permite automatizar ações no navegador e verificar seus resultados, com suporte a Chromium, Firefox e WebKit. Veja a [introdução oficial](https://playwright.dev/docs/intro).

No AgendaLab, o arquivo `e2e/novaReserva.spec.ts` já preenche e envia uma reserva pelo formulário. Um próximo passo é acrescentar a asserção que confira o resultado em **Minhas reservas**.

Os conceitos principais para desenvolver essa suíte são:

- **Localizadores:** encontrar botões, campos e mensagens pela função e pelo nome apresentados ao usuário.
- **Asserções:** verificar se a aplicação chegou ao resultado esperado.
- **Isolamento:** preparar dados para que um teste não dependa da execução de outro.
- **Diagnóstico de falhas:** investigar os passos da execução e os relatórios.

A referência para essas escolhas será o guia de [boas práticas do Playwright](https://playwright.dev/docs/best-practices). A ferramenta já está instalada como dependência de desenvolvimento. Os testes E2E presentes no projeto estão descritos na [seção 4](#4-testes-e2e-existentes).

---

## 3. Como rodar a aplicação e a suíte

**Pré-requisitos da aplicação:** Node.js 22.13 ou superior e npm 10 ou superior.

Na raiz do repositório:

```powershell
npm install
npm run dev
```

Depois, abra [http://localhost:3000](http://localhost:3000).

O comando inicia os dois aplicativos:

| Aplicativo       | Porta | Endereço                                                             |
| ---------------- | ----- | -------------------------------------------------------------------- |
| Frontend Next.js | 3000  | [http://localhost:3000](http://localhost:3000)                       |
| API NestJS       | 3001  | [http://localhost:3001/api/health](http://localhost:3001/api/health) |
| Swagger da API   | 3001  | [http://localhost:3001/api/docs](http://localhost:3001/api/docs)     |

O banco é criado automaticamente na primeira inicialização, com **seis salas, um projetor e dois notebooks**. Não é necessário instalar um servidor de banco de dados ou configurar um login. Use `Ctrl+C` para encerrar os processos.

Também é possível iniciar os aplicativos separadamente, em dois terminais, a partir da raiz:

```powershell
# Terminal 1: API
npm run dev -w @agendalab/api
```

```powershell
# Terminal 2: frontend
npm run dev -w @agendalab/web
```

---

## 4. Experimente a aplicação

Antes de automatizar, percorra o fluxo manualmente:

1. Abra o catálogo. A consulta inicial considera **amanhã, das 09h às 10h**, e exibe salas de reunião.
2. Altere a data ou os horários e clique em **Consultar disponibilidade**. A alteração dos campos só é aplicada à consulta depois desse clique.
3. Busque uma sala pelo nome, filtre pela capacidade ou selecione projetores e notebooks no filtro de tipo.
4. Clique em **Reservar** em um recurso disponível. Preencha o título, os participantes quando for uma sala e, se desejar, as observações. Confirme a reserva.
5. Abra **Minhas reservas**. Localize a reserva pelo título ou pelo nome do recurso. A página separa reservas próximas/em andamento, concluídas e canceladas.
6. Clique em **Cancelar reserva** e confirme. A reserva passa para a categoria **Canceladas**.
7. Volte ao catálogo e consulte o mesmo período. O recurso deve estar disponível novamente, desde que não exista outra reserva confirmada nesse intervalo.

O colaborador utilizado é **Ana Silva**, uma identidade fixa de demonstração. As reservas permanecem salvas quando a aplicação é reiniciada.

---

## 5. Detalhes do Playwright

Esta seção reúne os exemplos e as ferramentas usados para criar, executar e revisar testes E2E no AgendaLab.

### 5.1. Como instalar

No AgendaLab, a dependência já está instalada. Para começar com Playwright em outro projeto, use:

```powershell
npm init playwright@latest
```

### 5.2. Navegação e localizadores

Um teste de interface normalmente combina **navegação, localização de elementos, ações e asserções**.

Primeiro, navegamos até a página que queremos testar:

```typescript
await page.goto("https://playwright.dev/");
```

Depois, localizamos os elementos com a API de **Locators**. Um localizador descreve como encontrar um elemento na página; neste exemplo, buscamos um link pelo seu papel e pelo nome acessível **Get started**:

```typescript
const getStarted = page.getByRole("link", { name: "Get started" });
```

Com o localizador, podemos executar uma ação, como clicar no link:

```typescript
await getStarted.click();
```

Também podemos localizar e interagir em uma única linha:

```typescript
await page.getByRole("link", { name: "Get started" }).click();
```

Após a interação, verificamos o resultado com uma asserção. Clicar em um link, por si só, não confirma que chegamos à página esperada.

Para conhecer os tipos de localizadores disponíveis, consulte a [documentação de Locators](https://playwright.dev/docs/locators).

### 5.3. Ações básicas

As ações permitem interagir com os elementos localizados. Algumas das mais utilizadas são:

| Ação                      | Descrição                                                   |
| ------------------------- | ----------------------------------------------------------- |
| `locator.check()`         | Marcar uma caixa de seleção ou selecionar um botão de opção |
| `locator.click()`         | Clicar no elemento                                          |
| `locator.uncheck()`       | Desmarcar uma caixa de seleção                              |
| `locator.hover()`         | Posicionar o cursor sobre o elemento                        |
| `locator.fill()`          | Preencher um campo de formulário                            |
| `locator.focus()`         | Colocar o foco no elemento                                  |
| `locator.press()`         | Pressionar uma tecla                                        |
| `locator.setInputFiles()` | Selecionar arquivos em um campo de upload                   |
| `locator.selectOption()`  | Selecionar uma opção em um elemento HTML `<select>`         |

A tabela apresenta os nomes dos métodos. Alguns precisam de argumentos, como o texto a preencher ou a tecla a pressionar:

```typescript
await page.getByLabel("Nome").fill("Ana Silva");
await page.getByLabel("Nome").press("Tab");
```

Para a lista completa, consulte a [API de Locator](https://playwright.dev/docs/api/class-locator).

### 5.4. Asserções

As **asserções** verificam se o resultado corresponde ao comportamento esperado. No Playwright Test, usamos `expect(valor)` seguido de um método que expressa essa expectativa.

As asserções de página e de elementos mostradas abaixo são assíncronas: elas repetem a verificação até que a condição seja atendida ou o tempo limite seja atingido. Isso ajuda a lidar com atualizações da interface que não acontecem imediatamente.

Por exemplo, esta asserção aguarda até que o título da página contenha **Playwright**:

```typescript
await expect(page).toHaveTitle(/Playwright/);
```

Algumas das asserções mais utilizadas são:

| Asserção                                                      | O que verifica                                            |
| ------------------------------------------------------------- | --------------------------------------------------------- |
| `expect(locator).toBeChecked()`                               | A caixa de seleção ou o botão de opção está marcado       |
| `expect(locator).toBeEnabled()`                               | O controle está habilitado                                |
| `expect(locator).toBeVisible()`                               | O elemento está visível                                   |
| `expect(locator).toContainText('Texto')`                      | O elemento contém o texto informado                       |
| `expect(locator).toHaveAttribute('type', 'text')`             | O elemento possui o atributo com o valor informado        |
| `expect(locator).toHaveCount(3)`                              | O localizador encontra a quantidade esperada de elementos |
| `expect(locator).toHaveText('Texto esperado')`                | O conteúdo textual corresponde ao esperado                |
| `expect(locator).toHaveValue('Ana Silva')`                    | O campo possui o valor informado                          |
| `expect(page).toHaveTitle(/Playwright/)`                      | O título da página corresponde à expectativa              |
| `expect(page).toHaveURL('https://playwright.dev/docs/intro')` | A página está na URL esperada                             |

Os valores nos exemplos da tabela devem ser ajustados ao cenário do teste. Nas chamadas assíncronas, use `await`:

```typescript
await expect(page.getByLabel("Nome")).toHaveValue("Ana Silva");
```

Também existem asserções genéricas, como `toEqual`, `toContain` e `toBeTruthy`. Elas verificam valores já disponíveis de forma síncrona e não precisam de `await`:

```typescript
const success = true;
expect(success).toBeTruthy();
```

Diferentemente das asserções de elementos, essa verificação não aguarda uma mudança de estado: ela verifica o valor que `success` possui naquele momento.

Consulte a [documentação de asserções](https://playwright.dev/docs/test-assertions) para conhecer outras opções.

### 5.5. Exemplo de teste explicado

Os exemplos abaixo usam o site da documentação do Playwright para demonstrar a estrutura de dois testes independentes:

```typescript
import { test, expect } from "@playwright/test";

test("a página tem o título esperado", async ({ page }) => {
  await page.goto("https://playwright.dev/");

  // Verifica se o título da página contém Playwright.
  await expect(page).toHaveTitle(/Playwright/);
});

test("o link Get started leva à instalação", async ({ page }) => {
  await page.goto("https://playwright.dev/");

  // Localiza o link pelo papel e pelo nome acessível e clica nele.
  await page.getByRole("link", { name: "Get started" }).click();

  // Verifica se o título Installation está visível na página de destino.
  await expect(
    page.getByRole("heading", { name: "Installation" }),
  ).toBeVisible();
});
```

**O que as duas funções têm em comum:**

- `test` declara um caso de teste; o primeiro argumento é o nome exibido nos resultados.
- `expect` é usado para verificar o resultado esperado.
- `async ({ page })` recebe a página fornecida pelo Playwright. Essa página permite navegar e interagir com o navegador durante o teste.
- `await` aguarda a conclusão de cada navegação, ação ou asserção assíncrona antes de continuar.

**Primeiro teste: verificar o título da página.**

1. `page.goto()` abre a página inicial da documentação.
2. `expect(page).toHaveTitle(/Playwright/)` verifica o título da aba do navegador. A expressão regular `/Playwright/` aceita um título que contenha esse termo; não exige que ele seja o texto inteiro.

**Segundo teste: verificar a navegação pelo link.**

1. O teste abre a página inicial novamente, sem depender da execução do primeiro teste.
2. `getByRole('link', { name: 'Get started' })` localiza o link pelo papel e pelo nome acessível.
3. `.click()` executa o clique.
4. `getByRole('heading', { name: 'Installation' })` localiza o título na página de destino.
5. `toBeVisible()` verifica se esse título está visível. Assim, o teste confirma o resultado da navegação.

`toHaveTitle()` verifica o título da aba do navegador; `getByRole('heading')` encontra um título no conteúdo da página. São verificações diferentes.

### 5.6. Gravar interações com o Codegen

O **Codegen** registra interações realizadas no navegador e gera código Playwright com os localizadores correspondentes. Para gravar um fluxo no AgendaLab, inicie a aplicação com `npm run dev` e execute este comando em outro terminal na raiz do repositório:

```powershell
npx playwright codegen http://localhost:3000
```

O navegador e o **Playwright Inspector** serão abertos. Percorra o fluxo que deseja automatizar e copie o código gerado para um arquivo em `e2e/`. Revise o resultado: gravações também podem incluir cliques e preenchimentos que não fazem parte do cenário esperado.

![Playwright Codegen gravando o fluxo de reserva do AgendaLab e mostrando os localizadores gerados no Inspector](image.png)

### 5.7. Executar testes na UI

Para abrir a interface de execução, inicie a aplicação em um terminal e execute, na raiz do projeto:

```powershell
npx playwright test --ui
```

A UI permite selecionar e executar cenários, acompanhar as ações e consultar os detalhes de uma falha. Também é possível executar os testes diretamente no terminal:

```powershell
npx playwright test
```

A configuração atual executa os testes nos projetos Chromium, Firefox e WebKit. Para selecionar somente o Chromium:

```powershell
npx playwright test --project=chromium
```

Se os navegadores Playwright ainda não estiverem instalados nessa máquina:

```powershell
npx playwright install
```

### 5.8. Preparar dados para repetir os testes

O fluxo de reserva grava dados de verdade no SQLite. Como o banco persiste entre execuções, repetir a reserva no mesmo recurso e período pode causar um conflito. O teste também usa uma data fixa; atualize-a quando passar ou se o horário já estiver ocupado.

Uma estratégia de preparação e limpeza dos dados, com um banco separado para a suíte, permitirá repetir o cenário com mais facilidade.

---

## 6. Testes E2E existentes

Os testes ficam no diretório `e2e/`:

| Arquivo                   | Cenário                                                                                  | Observação                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `e2e/example.spec.ts`     | Abre a documentação do Playwright, verifica o título e acompanha o link **Get started**. | Depende de acesso à internet; não depende do AgendaLab.                                                         |
| `e2e/novaReserva.spec.ts` | Abre o AgendaLab, seleciona uma sala, preenche o formulário e envia a reserva.           | Exemplo inicial gerado a partir de interações gravadas. Ainda não contém uma asserção que confirme o resultado. |

O teste `novaReserva.spec.ts` reserva a **Sala Araripe** em **17 de outubro de 2026, das 13h às 15h**. Essa data está fixa no arquivo. A reserva também permanece no banco após a execução, então altere o período antes de repetir o cenário se a data já tiver passado ou se aquele horário estiver ocupado.

---

## 7. Configuração do Playwright

O arquivo `playwright.config.ts` concentra as opções da suíte:

| Opção           | Valor atual                                                   |
| --------------- | ------------------------------------------------------------- |
| `testDir`       | `./e2e`                                                       |
| `fullyParallel` | `true`; os testes podem rodar em paralelo localmente.         |
| `forbidOnly`    | Impede testes marcados com `test.only` no CI.                 |
| `retries`       | 2 repetições no CI e nenhuma localmente.                      |
| `workers`       | Um worker no CI; padrão do Playwright localmente.             |
| `reporter`      | `html`, para gerar o relatório HTML.                          |
| `trace`         | `on-first-retry`, para coletar o trace na primeira repetição. |
| Projetos        | Chromium, Firefox e WebKit.                                   |

As opções `baseURL` e `webServer` continuam comentadas. Por isso, o teste de reserva usa a URL completa `http://localhost:3000/`, e a aplicação precisa estar em execução antes dos testes E2E locais.

---

## 8. Workflow do GitHub Actions

O workflow em `.github/workflows/playwright.yml` executa em `push` e `pull_request` direcionados às branches `main` e `master`. As etapas configuradas são:

1. Preparar um runner Ubuntu e instalar a versão LTS do Node.js.
2. Instalar as dependências do projeto com `npm ci`.
3. Instalar os navegadores e suas dependências de sistema com `npx playwright install --with-deps`.
4. Executar a suíte com `npx playwright test`.
5. Enviar o relatório HTML como artefato, com retenção de 30 dias.

---

## 9. Próximos ajustes

- **Iniciar a aplicação no CI:** o workflow não inicia o frontend nem a API, e a configuração `webServer` está comentada. Como `novaReserva.spec.ts` acessa `localhost:3000`, é preciso iniciar os dois aplicativos no workflow antes de executar esse cenário.
- **Verificar a reserva criada:** `novaReserva.spec.ts` preenche e envia o formulário, mas ainda não confere o resultado com uma asserção.
- **Deixar os dados repetíveis:** substituir a data fixa e preparar um banco isolado evita conflitos entre execuções.
- **Revisar a execução paralela:** `fullyParallel` está ativado localmente. Ao adicionar cenários que reservem os mesmos recursos, prepare dados isolados para cada execução.

---

## 10. Referências

- [Playwright: instalação](https://playwright.dev/docs/intro)
- [Playwright: localizadores](https://playwright.dev/docs/locators)
- [Playwright: API de Locator](https://playwright.dev/docs/api/class-locator)
- [Playwright: asserções](https://playwright.dev/docs/test-assertions)
- [Playwright: Codegen](https://playwright.dev/docs/codegen)
- [Playwright: modo UI](https://playwright.dev/docs/test-ui-mode)
- [Playwright: configuração](https://playwright.dev/docs/test-configuration)
- [Next.js: documentação](https://nextjs.org/docs)
- [NestJS: documentação](https://docs.nestjs.com)
- [NestJS: Swagger e OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [UI GovPE: componentes](https://www.npmjs.com/package/@uigovpe/components)
- [UI GovPE: estilos](https://www.npmjs.com/package/@uigovpe/styles)
