# AgendaLab: laboratório de testes automatizados com Playwright

Este repositório é um laboratório prático para aprender e aplicar **testes automatizados com Playwright**. A aplicação utilizada nos estudos é o **AgendaLab**, um sistema de reserva de ambientes e equipamentos compartilhados: salas de reunião, projetores e notebooks.

A proposta é construir o aprendizado por etapas: conhecer os fluxos da aplicação, escrever testes E2E robustos, utilizar agentes de IA guiados por skills especializadas e seguir um fluxo consistente de validação e qualidade antes de cada commit. Os cenários se aproximam de sistemas administrativos do setor público, facilitando a aplicação dos conceitos no dia a dia.

A aplicação utiliza **Next.js no frontend, NestJS na API e SQLite para persistência**, com a identidade visual do UI Kit do Governo de Pernambuco. Todos os dados são fictícios e o projeto não tem vínculo institucional.

**Ideia para o trabalho:** demonstrar como os fluxos importantes de um sistema podem ser descritos em linguagem simples, automatizados no navegador e executados de forma repetível. O AgendaLab serve como prova de conceito para discutir cobertura, manutenção, isolamento de dados e integração dos testes ao desenvolvimento.

**Estado atual:** a aplicação, a documentação Swagger da API, a suíte de testes E2E com Playwright, o hook de `pre-commit` com Husky, o servidor Playwright MCP e a skill de IA `novo-teste-playwright` estão totalmente configurados. O laboratório apoia a criação de testes tanto por gravação com o Playwright Codegen quanto por exploração assistida via MCP ou refinamento via agentes de IA.

---

## Sumário

1. [Objetivo e arquitetura](#1-objetivo-e-arquitetura)
2. [Como rodar a aplicação](#2-como-rodar-a-aplicação)
3. [Estrutura do repositório](#3-estrutura-do-repositório)
4. [Conheça os fluxos do AgendaLab](#4-conheça-os-fluxos-do-agendalab)
5. [Fundamentos do Playwright](#5-fundamentos-do-playwright)
6. [Skill de IA: `novo-teste-playwright`](#6-skill-de-ia-novo-teste-playwright)
7. [Fluxo recomendado para criação de testes E2E](#7-fluxo-recomendado-para-criação-de-testes-e2e)
8. [Tutorial: criar um teste com Codegen](#8-tutorial-criar-um-teste-com-codegen)
9. [Tutorial: explorar a aplicação com MCP](#9-tutorial-explorar-a-aplicação-com-mcp)
10. [Codegen, MCP ou Skill de IA: quando usar cada um](#10-codegen-mcp-ou-skill-de-ia-quando-usar-cada-um)
11. [Executar e investigar os testes](#11-executar-e-investigar-os-testes)
12. [Testes E2E existentes](#12-testes-e2e-existentes)
13. [Dados variáveis com Faker](#13-dados-variáveis-com-faker)
14. [Validação e processo de commit (Husky)](#14-validação-e-processo-de-commit-husky)
15. [Referência rápida](#15-referência-rápida)
16. [Links para documentação interna](#16-links-para-documentação-interna)
17. [Como aplicar a ideia no trabalho](#17-como-aplicar-a-ideia-no-trabalho)
18. [Referências](#18-referências)

---

## 1. Objetivo e arquitetura

Aprender a verificar o comportamento de uma aplicação real usando seus fluxos de negócio. O ponto de partida são quatro funcionalidades centrais:

| Funcionalidade | Comportamento esperado |
| --- | --- |
| Visualizar salas e equipamentos | Consultar os recursos disponíveis para uma data e um período |
| Criar uma reserva | Preencher o formulário e confirmar a reserva de um recurso |
| Consultar minhas reservas | Encontrar a reserva criada e acompanhar sua situação |
| Cancelar uma reserva | Confirmar o cancelamento e liberar o período para outra reserva |

O estudo inclui fluxos bem-sucedidos e situações como campos inválidos, conflitos de horário e listas sem resultados. A ideia é praticar automação com ferramentas modernas e discutir como adaptar os mesmos princípios a sistemas corporativos maiores.

### Arquitetura do laboratório

| Parte | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Interface web | Next.js 16 + React 19 | Catálogo, formulário e gerenciamento de reservas com UI GovPE |
| API | NestJS 12 | Disponibilidade, criação e cancelamento de reservas com validação |
| Persistência | SQLite | Dados demonstrativos locais |
| Automação E2E | Playwright Test | Testes de ponta a ponta no navegador (Chromium, Firefox, WebKit) |
| Dados dinâmicos | @faker-js/faker | Geração de dados de teste localizados em português brasileiro |
| Garantia de qualidade | Husky | Hook de Git (`pre-commit`) para execução da suíte de testes |
| Assistência de IA | Skill `novo-teste-playwright` | Transformação de gravações brutas em testes robustos |
| Exploração assistida | Playwright MCP | Inspecionar e interagir com a interface via protocolo MCP |

---

## 2. Como rodar a aplicação

### Pré-requisitos

- **Node.js:** versão `22.13.0` ou superior (conforme declarado em `package.json`).
- **Navegadores do Playwright:** instalados via CLI do Playwright.

### Instalação das dependências

Na raiz do repositório, execute:

```powershell
npm install
npx playwright install
```

O comando `npm install` também configura automaticamente os hooks do Git via Husky (script `prepare`).

### Configuração de variáveis de ambiente

A aplicação já possui valores padrão funcionais para desenvolvimento local, não exigindo arquivos `.env` adicionais para execução padrão. Caso precise personalizar portas ou o caminho do banco, utilize os arquivos de exemplo:

- **API (`apps/api`):** consulte [apps/api/.env.example](apps/api/.env.example). Variáveis suportadas: `PORT=3001` e `DATABASE_PATH=./data/agendalab.sqlite`.
- **Frontend (`apps/web`):** consulte [apps/web/.env.example](apps/web/.env.example). Variável suportada: `API_URL=http://127.0.0.1:3001`.

### Iniciar a aplicação localmente

Para iniciar simultaneamente o backend e o frontend com recarregamento automático:

```powershell
npm run dev
```

Esse comando utiliza `concurrently` para orquestrar os dois workspaces e disponibiliza:

| Aplicativo | Endereço | Descrição |
| --- | --- | --- |
| Frontend Next.js | [http://localhost:3000](http://localhost:3000) | Catálogo e formulários do AgendaLab |
| API NestJS | [http://localhost:3001/api/health](http://localhost:3001/api/health) | Endpoint de verificação de integridade |
| Swagger da API | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) | Documentação interativa dos endpoints OpenAPI |

O banco SQLite é criado automaticamente na primeira inicialização da API em `apps/api/data/agendalab.sqlite`, populado com seis salas, um projetor e dois notebooks. Não é necessário instalar servidores de banco externos ou configurar credenciais.

Para apagar todas as reservas do banco local sem reiniciar a API, execute:

```powershell
npm run db:reset
```

> **Atenção:** `npm run db:reset` executa a limpeza dos registros da tabela de reservas, preservando o catálogo de salas e equipamentos cadastrados.

Também é possível iniciar os serviços separadamente em terminais distintos:

```powershell
# Terminal 1: API NestJS
npm run dev -w @agendalab/api
```

```powershell
# Terminal 2: Frontend Next.js
npm run dev -w @agendalab/web
```

---

## 3. Estrutura do repositório

O repositório é organizado no formato monorepo utilizando npm workspaces:

```text
agendalab/
├── .agent/
│   └── skills/
│       └── novo-teste-playwright/
│           └── SKILL.md             # Instruções da skill para agentes de IA
├── .husky/
│   └── pre-commit                   # Hook do Git que executa os testes antes do commit
├── apps/
│   ├── api/                         # Backend NestJS (porta 3001) com SQLite
│   │   ├── .env.example             # Exemplo de configuração da API
│   │   ├── data/                    # Banco SQLite local (agendalab.sqlite)
│   │   └── scripts/reset-db.mjs     # Script para resetar reservas locais
│   └── web/                         # Frontend Next.js (porta 3000) com UI GovPE
│       ├── .env.example             # Exemplo de configuração do frontend
│       └── .mcp.json                # Configuração do Playwright MCP
├── docs/
│   └── skills/
│       └── outros-agentes.md        # Guia para configurar a skill no Claude Code e outros agentes
├── e2e/                             # Suíte oficial de testes ponta a ponta Playwright
│   └── new-reservation-variants.spec.ts
├── packages/
│   └── contracts/                   # Tipos e contratos TypeScript compartilhados
├── package.json                     # Scripts e dependências raiz
└── playwright.config.ts             # Configuração geral do Playwright Test
```

---

## 4. Conheça os fluxos do AgendaLab

Antes de automatizar, recomenda-se percorrer o fluxo manualmente pela interface:

1. Abra o catálogo em [http://localhost:3000](http://localhost:3000). A consulta inicial considera amanhã, das 09h às 10h, e exibe salas de reunião.
2. Altere a data ou os horários e clique em **Consultar disponibilidade**. A alteração só é aplicada à consulta após esse clique.
3. Busque uma sala pelo nome, filtre pela capacidade ou selecione projetores e notebooks no filtro de tipo.
4. Clique em **Reservar** em um recurso disponível. Preencha o formulário e confirme a reserva.
5. Abra **Minhas reservas** e localize a reserva pelo título ou pelo nome do recurso.
6. Se desejar, cancele a reserva e confirme o cancelamento.
7. Volte ao catálogo e consulte o mesmo período: o recurso deve constar como disponível novamente se não houver outra reserva confirmada nesse intervalo.

O colaborador autenticado na demonstração é **Ana Silva**, uma identidade estática para fins de estudo. As reservas criadas através do fluxo com a API real persistem no banco SQLite local.

---

## 5. Fundamentos do Playwright

O **Playwright Test** é um framework para automação de testes de ponta a ponta em navegadores modernos (Chromium, Firefox e WebKit).

Um teste de interface combina **navegação, localização de elementos, ações do usuário e asserções**. Exemplo conceitual:

```typescript
import { expect, test } from "@playwright/test";

test("navega para nova reserva e verifica o modal", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  await page.getByRole("button", { name: "Nova reserva" }).click();

  await expect(
    page.getByRole("dialog", { name: "Nova reserva" }),
  ).toBeVisible();
});
```

### Ações e asserções comuns

| Código | Finalidade |
| --- | --- |
| `locator.click()` | Executa o clique em um elemento |
| `locator.fill("texto")` | Preenche um campo de entrada |
| `locator.check()` / `locator.uncheck()` | Marca ou desmarca caixa de seleção |
| `locator.press("Enter")` | Dispara o evento de pressionar uma tecla |
| `locator.selectOption("valor")` | Seleciona opção em elemento `<select>` nativo |
| `expect(locator).toBeVisible()` | Verifica se o elemento está visível no DOM |
| `expect(locator).toBeHidden()` | Verifica se o elemento foi ocultado ou removido |
| `expect(locator).toHaveText("texto")` | Verifica o conteúdo textual |
| `expect(locator).toHaveValue("valor")` | Verifica o valor atual de um campo de formulário |
| `expect(locator).toHaveAttribute("attr", "val")` | Verifica atributos do elemento (ex.: `required`) |
| `expect(page).toHaveURL("url")` | Verifica a URL corrente |

Asserções web no Playwright são assíncronas e devem usar `await`. Elas realizam tentativas sucessivas automáticas (*web-first assertions*) até que a condição seja atendida ou o timeout expire.

---

## 6. Skill de IA: `novo-teste-playwright`

O projeto conta com uma skill customizada para agentes de inteligência artificial: a **`novo-teste-playwright`**.

### Objetivo da skill

A skill foi concebida para receber gravações geradas pelo Playwright Codegen e transformá-las em especificações de teste E2E completas, legíveis, robustas e alinhadas aos padrões de código e regras de negócio do AgendaLab. Em vez de simplesmente reproduzir ações de clique, ela orienta o agente a:

- Analisar a estrutura do projeto antes de propor código.
- Identificar a real regra de negócio e os pontos de verificação essenciais.
- Aplicar localizadores resilientes (`getByRole`, `getByLabel`, `getByText`, seletores estáveis `#reserva-*`).
- Inserir asserções explícitas e automáticas com `expect`.
- Integrar dados dinâmicos com `@faker-js/faker` utilizando o locale brasileiro (`fakerPT_BR`).
- Cobrir cenários positivos, negativos e validações condicionais.
- Adotar estratégias adequadas de isolamento (mock com `page.route` vs. persistência no SQLite).
- Validar a execução dos testes antes de entregá-los ao desenvolvedor.
- Não mascarar erros e **nunca** realizar commits automáticos.

### Localização no repositório

- **Repositório oficial / Antigravity:** [.agent/skills/novo-teste-playwright/SKILL.md](.agent/skills/novo-teste-playwright/SKILL.md)

### Como utilizar no Antigravity

No Antigravity, caso a skill esteja carregada no ambiente de trabalho:
1. Digite `/novo-teste-playwright` no chat para invocar a skill diretamente.
2. Forneça o código gravado pelo Codegen (ou indique o caminho do arquivo temporário onde a gravação foi salva).
3. Informe o objetivo do teste caso a regra de negócio possua detalhes particulares.

> **Importante:** A disponibilidade do comando de barra `/novo-teste-playwright` depende do reconhecimento da pasta `.agent/skills/` pela versão do assistente. Caso o comando de barra não apareça imediatamente na listagem, você pode referenciar o arquivo diretamente no prompt (ex.: *"Siga as diretrizes de [.agent/skills/novo-teste-playwright/SKILL.md](.agent/skills/novo-teste-playwright/SKILL.md) para converter esta gravação em teste"*).

### Como configurar no Claude Code e outros agentes

Cada agente de IA possui suas próprias regras de descoberta e diretórios de skills. O Claude Code, por exemplo, reconhece skills alocadas no diretório `.claude/skills/`.

Para disponibilizar e sincronizar a skill com o Claude Code ou outros assistentes:
- Consulte o guia completo e passo a passo em [docs/skills/outros-agentes.md](docs/skills/outros-agentes.md).
- O guia explica como espelhar o arquivo `SKILL.md` em `.claude/skills/novo-teste-playwright/SKILL.md` mantendo o cabeçalho YAML obrigatório e garantindo que ambos os assistentes sigam exatamente as mesmas instruções.

---

## 7. Fluxo recomendado para criação de testes E2E

Para garantir a qualidade, padronização e manutenibilidade da suíte, adote o seguinte fluxo de 8 etapas ao criar novos testes:

### Etapa 1 — Gravar o fluxo

1. Inicie a aplicação no ambiente local: `npm run dev`.
2. Em outro terminal, abra o gravador do Playwright:
   ```powershell
   npx playwright codegen http://localhost:3000
   ```
3. Navegue pela funcionalidade e execute as ações que representam o cenário desejado.
4. Copie o código gerado no Playwright Inspector ou salve-o em um arquivo temporário de rascunho.

> **Lembre-se:** A gravação registra apenas cliques e digitações do usuário. Ela **não** é um teste pronto, pois não contém asserções suficientes de negócio nem trata isolamento ou dados dinâmicos.

### Etapa 2 — Solicitar a criação do teste

1. Abra o agente de IA configurado (Antigravity, Claude Code, etc.).
2. Invoque a skill `novo-teste-playwright` (ou aponte para o seu arquivo de instruções).
3. Cole o código TypeScript gerado pelo Codegen ou informe o caminho do arquivo de rascunho.
4. Esclareça o objetivo do teste e regras de negócio específicas que devem ser cobertas.
5. Peça ao agente que analise os testes já existentes em `e2e/` antes de gerar novos arquivos, garantindo reuso de convenções e evitando duplicidades.

### Etapa 3 — Transformar a gravação em um teste robusto

O teste final gerado deve:
- Utilizar `test` e `expect` importados de `@playwright/test`.
- Conter títulos claros e descritivos do comportamento verificado.
- Utilizar seletores acessíveis (`getByRole`, `getByLabel`, `getByText`) e IDs semânticos (`#reserva-*`).
- Conter asserções explícitas para resultados visuais (ex.: mensagens com `role="status"` para sucesso ou `role="alert"` para erros de validação).
- Cobrir cenários positivos (caminho feliz) e negativos pertinentes (validações de formulário, campos obrigatórios, bloqueios de horário).
- Evitar pausas estáticas arbitrárias (`waitForTimeout`) e seletores instáveis baseados em classes CSS transitórias.

### Etapa 4 — Utilizar Faker corretamente

O pacote `@faker-js/faker` já está incluído nas dependências de desenvolvimento do projeto.

Sempre que o teste necessitar de dados dinâmicos para prevenir conflitos de valores repetidos, importe o locale brasileiro conforme a convenção:

```typescript
import { fakerPT_BR as faker } from "@faker-js/faker";
```

Diretrizes de uso:
- **Dados únicos:** gere UUIDs (`faker.string.uuid()`) para compor títulos de reserva e evitar conflitos.
- **Datas e horários:** utilize `faker.date.future()` para agendamentos válidos e gere horários consistentes dentro da faixa permitida.
- **Consistência:** armazene os valores gerados em constantes no teste para reutilizá-los tanto no preenchimento quanto nas asserções de validação.
- **Regras fixas:** mantenha valores constantes quando eles definirem a regra de negócio (ex.: opções fixas do dropdown como `"Reunião interna"`, organizações `"Seduh"` ou `"Perpart"`, e valores intencionalmente inválidos em testes de validação).
- Não force o uso de Faker em testes que apenas validam estados visuais estáticos ou elementos pré-existentes.

### Etapa 5 — Garantir isolamento e segurança

Existem duas abordagens de teste no AgendaLab:

1. **Testes com simulação de API (`page.route`):**
   - Interceptam chamadas HTTP (como `POST **/reservations`) e retornam respostas simuladas (status 201 com payload mockado ou status 409 com mensagem de conflito).
   - Não tocam no banco de dados SQLite, executam rapidamente e são ideais para validar variações de interface e mensagens de erro sem gerar resíduos locais.
2. **Testes de integração com a API real:**
   - Enviam dados reais que são gravados no SQLite (`apps/api/data/agendalab.sqlite`).
   - Devem usar títulos únicos e períodos dinâmicos para não colidir com dados existentes.
   - Não devem depender da ordem de execução de outros testes.

Boas práticas essenciais:
- Nunca utilize credenciais ou dados pessoais reais.
- Não realize operações destrutivas sem autorização explícita.
- Utilize `npm run db:reset` conscientemente para redefinir o banco local de testes quando necessário.

### Etapa 6 — Salvar o teste no local correto

- Conforme definido no arquivo [playwright.config.ts](playwright.config.ts) (`testDir: "./e2e"`), todos os testes oficiais devem ser salvos na pasta [e2e/](e2e/).
- Nomeie os arquivos com a extensão `.spec.ts` e nomes semânticos (ex.: `e2e/cancelamento-reserva.spec.ts`).
- Gravações brutas ou anotações devem ficar fora da suíte oficial ou em diretórios temporários descartáveis.

### Etapa 7 — Executar e validar

Antes de aprovar o teste, execute-o localmente:
- Apenas o teste criado: `npx playwright test e2e/seu-teste.spec.ts`
- Com navegador visível ou Chromium específico: `npx playwright test e2e/seu-teste.spec.ts --project=chromium`
- Modo interativo com time-travel: `npm run test:ui`

Caso ocorram falhas, investigue os logs, traces e capturas de tela. Ajuste a implementação com base em evidências reais; **nunca enfraqueça ou remova asserções** apenas para forçar o teste a passar.

### Etapa 8 — Revisar e realizar o commit

1. Revise as alterações com `git diff` ou no editor.
2. Verifique se o código segue a formatação e convenções do repositório.
3. Ao executar `git commit`, o hook de `pre-commit` do Husky será disparado automaticamente rodando a suíte de testes E2E.
4. Como os testes acessam `http://localhost:3000`, certifique-se de que a aplicação esteja rodando (`npm run dev`) antes de efetuar o commit.
5. O commit deve ser feito manualmente pelo desenvolvedor quando tudo estiver validado. A skill de IA não realiza commits automaticamente.

---

## 8. Tutorial: criar um teste com Codegen

O **Codegen** abre o navegador e o Playwright Inspector enquanto você interage com a tela, gerando o rascunho dos comandos.

### 8.1. Preparar o ambiente

Certifique-se de que a aplicação esteja rodando na raiz:

```powershell
npm run dev
```

### 8.2. Gravar uma reserva na Sala Frevo

Em outro terminal na raiz do projeto, inicie o Codegen:

```powershell
npx playwright codegen http://localhost:3000
```

No navegador aberto:
1. Clique em **Ambientes e equipamentos**.
2. Localize o card da **Sala Frevo** e clique em **Reservar**.
3. Preencha os campos obrigatórios no diálogo de reserva.
4. Clique em **Confirmar reserva**.
5. Encerre o navegador ou pare o processo no terminal.

### 8.3. Refinar com a skill de IA

Copie o trecho de código gerado e acione o seu assistente de IA configurado com a skill `novo-teste-playwright`. O assistente substituirá campos literais por Faker, adicionará asserções de confirmação do banner de sucesso e estruturará o arquivo em `e2e/`.

![Playwright Codegen gravando o fluxo de reserva do AgendaLab e mostrando os localizadores gerados no Inspector](image.png)

---

## 9. Tutorial: explorar a aplicação com MCP

O **Playwright MCP** expõe recursos de automação de navegador através do Model Context Protocol. Um assistente com suporte a MCP pode abrir páginas, inspecionar árvores de acessibilidade, clicar em controles e observar o console do navegador diretamente.

A configuração do servidor MCP para o frontend do projeto já está presente em `apps/web/.mcp.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### Como explorar

1. Inicie a aplicação com `npm run dev`.
2. Certifique-se de que o seu cliente MCP (IDE ou ferramenta compatível) esteja conectado ao servidor `playwright`.
3. Solicite ao assistente que inspecione a tela:
   > *"Acesse http://localhost:3000 com o Playwright MCP, abra o modal de Nova Reserva e liste todos os campos visíveis e obrigatórios."*
4. O assistente navegará e relatará o comportamento dos componentes sem que você precise inspecionar manualmente o HTML.

> **Atenção aos dados:** Lembrar que ações no MCP que confirmem formulários reais gravam registros no banco local. Para apenas mapear a interface, não submeta dados persistentes.

---

## 10. Codegen, MCP ou Skill de IA: quando usar cada um

| Ferramenta / Abordagem | Quando usar | Vantagem principal |
| --- | --- | --- |
| **Playwright Codegen** | Para mapear rapidamente os seletores e cliques de uma jornada conhecida pelo usuário | Rapidez para capturar sequências de interação no navegador |
| **Playwright MCP** | Para permitir que o assistente explore dinamicamente telas e estados sem intervenção manual | Descoberta guiada por IA do comportamento da interface |
| **Skill `novo-teste-playwright`** | Para transformar o rascunho gravado em código final de produção para a suíte E2E | Aplicação de regras de negócio, asserções robustas, Faker e boas práticas |
| **Playwright Test CLI (`npm test`)** | Para validação contínua, regressão automatizada e hooks de CI / pré-commit | Execução reproduzível, paralela e sem intervenção humana |

---

## 11. Executar e investigar os testes

Para executar os testes locais, a aplicação precisa estar em execução (`npm run dev`), pois os testes apontam para `http://localhost:3000/`.

### Comandos de execução

Executar toda a suíte de testes E2E (via script npm configurado):

```powershell
npm test
```

Executar a suíte diretamente via Playwright CLI:

```powershell
npx playwright test
```

Executar apenas em um navegador específico (ex.: Chromium):

```powershell
npx playwright test --project=chromium
```

Executar um arquivo de teste específico:

```powershell
npx playwright test e2e/new-reservation-variants.spec.ts --project=chromium
```

Executar em modo interativo com interface gráfica (Playwright UI Mode):

```powershell
npm run test:ui
```

### Diagnóstico e relatórios

Após a execução, o relatório em HTML pode ser visualizado no navegador:

```powershell
npx playwright show-report
```

O projeto está configurado em [playwright.config.ts](playwright.config.ts) com `trace: "retain-on-failure"`. Quando um teste falha, um arquivo de trace detalhado é retido para depuração passo a passo com capturas de tela e snapshots de rede.

---

## 12. Testes E2E existentes

A suíte oficial fica localizada no diretório [e2e/](e2e/):

| Arquivo de teste | Cenários cobertos | Estratégia de dados e mocks |
| --- | --- | --- |
| [e2e/new-reservation-variants.spec.ts](e2e/new-reservation-variants.spec.ts) | - Variações válidas de reserva: reunião interna, atendimento externo (com órgão visitante obrigatório) e capacitação (com tema).<br>- Seleção de equipamento (projetor) e ocultação do campo de participantes.<br>- Validações negativas de formulário: horário de término anterior ao início, título em branco/inválido, obrigatoriedade de campos condicionais.<br>- Conflito de horário retornado pela API (HTTP 409). | Utiliza `fakerPT_BR` para títulos, datas futuras e textos.<br>Usa `page.route` para simular as respostas da API (`POST **/reservations`), garantindo testes rápidos, determinísticos e sem poluição do banco SQLite. |

---

## 13. Dados variáveis com Faker

O `@faker-js/faker` gera dados pseudo-aleatórios realistas diretamente no código do teste, dispensando serviços externos e evitando que execuções consecutivas colidam por valores repetidos.

### Importação padronizada

```typescript
import { fakerPT_BR as faker } from "@faker-js/faker";
```

### Métodos recomendados no projeto

| Método | Finalidade | Exemplo de uso |
| --- | --- | --- |
| `faker.string.uuid()` | Identificador único para títulos de reserva | `` `Reserva ${faker.string.uuid()}` `` |
| `faker.date.future()` | Data futura para agendamento | `faker.date.future({ years: 1 }).toISOString().slice(0, 10)` |
| `faker.number.int()` | Quantidade válida de participantes dentro do limite | `faker.number.int({ min: 1, max: resourceCapacity })` |
| `faker.lorem.sentence()` | Observações e justificativas | `faker.lorem.sentence()` |
| `faker.company.name()` | Nome de órgão ou entidade externa visitante | `faker.company.name()` |
| `faker.person.fullName()` | Nome de colaborador ou responsável | `faker.person.fullName()` |
| `faker.internet.email()` | E-mail corporativo de contato | `faker.internet.email()` |

---

## 14. Validação e processo de commit (Husky)

O repositório utiliza o **Husky** para garantir que nenhum código que quebre os testes seja introduzido na base principal.

### Comportamento do hook `pre-commit`

O arquivo [.husky/pre-commit](.husky/pre-commit) está configurado com:

```sh
#!/usr/bin/env sh
npx playwright test
```

Isso significa que, sempre que o comando `git commit` for executado:
1. O Git aciona o Husky.
2. O Husky executa a suíte de testes com `npx playwright test`.
3. Se todos os testes passarem (código de saída 0), o commit é concluído.
4. Se qualquer teste falhar, o commit é imediatamente abortado, exibindo as falhas no terminal.

> **Importante para o desenvolvedor:** Como os testes do Playwright necessitam se comunicar com a interface web em `http://localhost:3000`, mantenha o servidor ativo (`npm run dev`) antes de disparar o comando de commit.

---

## 15. Referência rápida

| Ação desejada | Comando / Procedimento |
| --- | --- |
| Iniciar frontend e backend | `npm run dev` |
| Iniciar apenas o backend | `npm run dev -w @agendalab/api` |
| Iniciar apenas o frontend | `npm run dev -w @agendalab/web` |
| Resetar reservas locais | `npm run db:reset` |
| Executar todos os testes E2E | `npm test` *(ou `npx playwright test`)* |
| Executar um teste específico | `npx playwright test e2e/new-reservation-variants.spec.ts --project=chromium` |
| Executar com interface gráfica | `npm run test:ui` |
| Visualizar relatório HTML | `npx playwright show-report` |
| Gravar novo fluxo no navegador | `npx playwright codegen http://localhost:3000` |
| Invocar skill no Antigravity | Comando `/novo-teste-playwright` ou referenciar `.agent/skills/novo-teste-playwright/SKILL.md` |
| Configurar skill no Claude Code | Seguir as instruções de [docs/skills/outros-agentes.md](docs/skills/outros-agentes.md) |

---

## 16. Links para documentação interna

Para navegar rapidamente pelos arquivos de configuração e diretrizes do repositório:

- [playwright.config.ts](playwright.config.ts) — Configuração do Playwright Test (diretórios, repórteres, timeouts, projetos).
- [e2e/](e2e/) — Pasta onde ficam centralizados todos os testes end-to-end do projeto.
- [.agent/skills/novo-teste-playwright/SKILL.md](.agent/skills/novo-teste-playwright/SKILL.md) — Instruções completas da skill de IA para geração e refatoração de testes.
- [docs/skills/outros-agentes.md](docs/skills/outros-agentes.md) — Guia de configuração e sincronização da skill no Claude Code e outros agentes.
- [.husky/pre-commit](.husky/pre-commit) — Script do hook de validação pré-commit.
- [apps/api/.env.example](apps/api/.env.example) — Variáveis de ambiente configuráveis para a API NestJS.
- [apps/web/.env.example](apps/web/.env.example) — Variáveis de ambiente configuráveis para o frontend Next.js.

---

## 17. Como aplicar a ideia no trabalho

O AgendaLab foi idealizado para demonstrar como modernizar o processo de testes em equipes de desenvolvimento:

1. **Comece pelos fluxos críticos:** selecione as jornadas essenciais (agendamento, cadastro, aprovação).
2. **Acelere o rascunho:** use o Codegen para capturar as interações e seletores básicos.
3. **Refine com IA e skills:** utilize agentes guiados por regras claras para adicionar asserções reais de negócio, tratamento de erros e dados dinâmicos com Faker.
4. **Isole responsabilidades:** combine testes com mock (`page.route`) para respostas instantâneas e testes integrados para validar a persistência.
5. **Proteja a base de código:** configure hooks de `pre-commit` e pipelines de CI para validar a suíte automaticamente.

---

## 18. Referências

- [Playwright: documentação oficial](https://playwright.dev/docs/intro)
- [Playwright: boas práticas de teste](https://playwright.dev/docs/best-practices)
- [Playwright: seletores e Locators](https://playwright.dev/docs/locators)
- [Playwright: asserções de teste](https://playwright.dev/docs/test-assertions)
- [Playwright: gravação com Codegen](https://playwright.dev/docs/codegen)
- [Playwright: modo UI](https://playwright.dev/docs/test-ui-mode)
- [Playwright: CLI e comandos](https://playwright.dev/docs/test-cli)
- [Playwright MCP: visão geral](https://playwright.dev/mcp/introduction)
- [Faker: documentação oficial](https://fakerjs.dev/guide/usage.html)
- [Faker: locale Português do Brasil](https://fakerjs.dev/locales/pt_br)
- [Husky: documentação oficial](https://typicode.github.io/husky/)
- [Next.js: documentação oficial](https://nextjs.org/docs)
- [NestJS: documentação oficial](https://docs.nestjs.com)
- [UI Kit GovPE: documentação de componentes](https://www.npmjs.com/package/@uigovpe/components)
