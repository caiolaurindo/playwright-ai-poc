---
name: novo-teste-playwright
description: Transforma gravações do Playwright Codegen em testes E2E completos e alinhados às regras do AgendaLab.
---

# Criar testes Playwright a partir de uma gravação

Você é responsável pela qualidade dos testes end-to-end (E2E) do projeto AgendaLab.

Sua tarefa é analisar uma gravação feita pelo Playwright Codegen e transformá-la em testes automatizados completos, confiáveis, legíveis, reutilizáveis e alinhados às regras de negócio reais da aplicação.

Não se limite a reproduzir os cliques gravados. O objetivo é validar o comportamento da aplicação.

## 1. Entender a estrutura do projeto

Antes de criar ou modificar arquivos:

1. Leia o `package.json` da raiz e os `package.json` dos workspaces relevantes (`apps/web`, `apps/api`, `packages/contracts`).
2. Examine o `playwright.config.ts` e identifique a configuração dos testes (`testDir: "./e2e"`), os projetos (Chromium, Firefox, WebKit), timeouts e comandos disponíveis.
3. Analise a estrutura existente de testes E2E na pasta `e2e/`.
4. Identifique as rotas da aplicação (ex.: `/` para catálogo e `/minhas-reservas`), padrões de formulários (como os componentes do UI Kit GovPE), preparação de dados e mecanismos de isolamento.
5. Verifique como a aplicação e seus serviços são iniciados (`npm run dev` na raiz inicia API na porta 3001 e frontend Next.js na porta 3000).
6. Consulte as instruções do repositório (`README.md`, `AGENTS.md`) e os testes existentes relacionados à funcionalidade.
7. Verifique se `@playwright/test` e `@faker-js/faker` já estão instalados. Reutilize as dependências existentes e importe o locale brasileiro `import { fakerPT_BR as faker } from "@faker-js/faker"`.

Não presuma nomes de arquivos, rotas, seletores, tabelas, campos ou comandos que não existam no projeto.

## 2. Localizar e analisar a gravação do Codegen

Utilize o caminho informado pelo usuário.

Se o caminho não tiver sido informado, procure gravações em `e2e/` ou na pasta de gravações indicada pelo projeto. Se houver várias opções e não for possível identificar a correta, pergunte ao usuário.

Ao analisar a gravação:

1. Identifique o fluxo realizado pelo usuário (ex.: consulta de disponibilidade, abertura do modal de reserva, preenchimento e confirmação, cancelamento).
2. Identifique os formulários, modais, componentes e entidades envolvidas (recursos, períodos, organizações, tipos de solicitação).
3. Determine qual regra de negócio o fluxo pretende validar.
4. Identifique quais ações gravadas são necessárias e quais são apenas navegação redundante.
5. Identifique os resultados que precisam ser verificados por assertions (mensagens de sucesso/erro, fechamento de modais, tags de status, campos condicionais).
6. Consulte o código da aplicação (`apps/web/src/components/*`) e os testes existentes para compreender o comportamento real.

A gravação representa as ações executadas, não uma especificação completa do comportamento esperado.

Não invente requisitos nem resultados esperados. Se a regra de negócio não puder ser determinada a partir do código, dos testes ou da documentação, solicite esclarecimento ao usuário.

## 3. Criar testes completos, não apenas reproduzir ações

Transforme o fluxo gravado em testes Playwright bem estruturados.

### Requisitos obrigatórios

- Utilize `test` e `expect` de `@playwright/test`.
- Reutilize convenções e padrões já existentes no projeto.
- Prefira seletores acessíveis e resilientes, como `getByRole`, `getByLabel` e `getByText`, além de seletores estáveis de formulário (`#reserva-*`).
- Evite seletores frágeis baseados em classes utilitárias transitórias ou posições arbitrárias do DOM.
- Adicione assertions explícitas para os resultados esperados.
- Verifique o resultado da operação (ex.: banner de sucesso `role="status"`, alerta de erro `role="alert"`), e não apenas se o botão foi clicado.
- Utilize as assertions com repetição automática do Playwright (`await expect(...)`) sempre que apropriado.
- Evite `waitForTimeout` e outras esperas fixas quando houver alternativas baseadas em condições ou eventos de rede.
- Configure timeouts adequados (`test.setTimeout(60_000)`) para evitar falso negativo em máquinas concorrentes.
- Não duplique testes existentes sem necessidade.
- Mantenha os testes legíveis e com nomes que expressem o comportamento esperado.

### Cobertura de cenários

Para cada regra de negócio, avalie os cenários aplicáveis:

- Caminho positivo: a operação válida conclui com sucesso.
- Caminho negativo: a operação inválida é rejeitada com feedback visual adequado.
- Validações de formulário: períodos inválidos, capacidade excedida, campos obrigatórios condicionais.
- Estados alternativos do recurso: salas vs equipamentos (projetores/notebooks).
- Mensagens de sucesso e erro na interface.
- Persistência ou simulação coerente (usando `page.route` para mock de API quando apropriado).

Não crie todos esses cenários indiscriminadamente. Escolha os que fazem sentido para a funcionalidade e para os requisitos identificados.

### Exemplo de raciocínio

Se a gravação realizar uma reserva da **Sala Frevo**:

Não basta verificar que os campos foram preenchidos e que o botão "Confirmar reserva" foi clicado. O teste deve verificar, conforme o comportamento real do AgendaLab:

- Se o diálogo "Nova reserva" foi aberto e exibiu o recurso correto.
- Se os campos condicionais reagiram adequadamente ao tipo de solicitação (ex.: exigência de entidade visitante para atendimento externo).
- Se o envio resultou no fechamento do diálogo e na exibição da mensagem de confirmação (`Reserva de Sala Frevo confirmada com sucesso.`).
- Se os dados informados (título, período, participantes) aparecem como esperado.
- Se cenários inválidos (ex.: horário de término anterior ao início) são bloqueados com alerta claro.

## 4. Regra obrigatória: usar Faker para dados dinâmicos

Sempre que um teste precisar criar dados, utilize `@faker-js/faker` com o locale em português (`fakerPT_BR`) para gerar valores dinâmicos e reduzir colisões entre execuções:

```ts
import { fakerPT_BR as faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";
```

### Regras de geração de dados

1. Importe o Faker como `fakerPT_BR as faker`.
2. Gere dados novos para cada teste que precise de valores exclusivos.
3. Para campos com restrição de unicidade ou títulos de reserva, utilize `faker.string.uuid()` para evitar conflito (ex.: `` `Reserva de teste ${faker.string.uuid()}` ``).
4. Utilize métodos apropriados ao tipo de campo:
   - Títulos e identificadores: `` `Reserva ${faker.string.uuid()}` ``
   - Datas futuras no expediente: `faker.date.future({ years: 1 })`
   - Quantidade de participantes: `faker.number.int({ min: 1, max: capacity })`
   - Entidade ou órgão visitante: `faker.company.name()`
   - Observações opcionais: `faker.lorem.sentence()`
5. Não utilize valores fixos para campos únicos quando eles puderem conflitar com dados já persistidos no banco local.
6. Mantenha fixos os valores que definem as regras do negócio (ex.: opções `"Perpart"` e `"Seduh"`, tipos `"Reunião interna"`, `"Atendimento externo"` e `"Capacitação"`).
7. Gere os valores dinâmicos uma vez por teste e reutilize as mesmas variáveis nas ações e assertions daquele teste.
8. Não gere novos valores durante uma assertion, pois isso impediria a comparação com o dado preenchido.
9. Não altere a configuração global do Faker sem necessidade.
10. Não utilize dados aleatórios para contornar validações legítimas da aplicação.

### Exemplo ilustrativo

```ts
import { fakerPT_BR as faker } from "@faker-js/faker";
import { expect, test } from "@playwright/test";

test("preenche e valida formulário de nova reserva", async ({ page }) => {
  const title = `Reserva ${faker.string.uuid()}`;
  const date = faker.date.future({ years: 1 }).toISOString().slice(0, 10);

  await page.goto("http://localhost:3000/");
  await page.getByRole("button", { name: "Nova reserva" }).click();

  const dialog = page.getByRole("dialog", { name: "Nova reserva" });
  await expect(dialog).toBeVisible();

  await dialog.locator("#reserva-titulo").fill(title);
  await dialog.locator("#reserva-data").fill(date);
  await dialog.locator("#reserva-inicio").fill("09:00");
  await dialog.locator("#reserva-fim").fill("10:00");

  await expect(dialog.locator("#reserva-titulo")).toHaveValue(title);
});
```

Este exemplo é ilustrativo. Antes de utilizá-lo, verifique os campos, seletores e regras reais do AgendaLab.

## 5. Isolamento e segurança dos dados de teste

O Faker não substitui o isolamento dos testes.

A aplicação utiliza um banco de dados SQLite local (`apps/api/data/agendalab.sqlite`). Reservas criadas por fluxos integrados persistem no banco.

### Regras obrigatórias

- Distinga testes integrados (que persistem dados no SQLite) de testes de variações de interface.
- Para testes de variações e regras de interface, utilize interceptação com `page.route("**/reservations", ...)` para simular a resposta da API e evitar poluir o banco ou gerar concorrência entre testes paralelos.
- Nos testes integrados que gravam no banco real, gere datas futuras e horários livres consultando a disponibilidade.
- Utilize `npm run db:reset` apenas quando for necessário limpar todas as reservas locais; nunca execute reset sem autorização do usuário se houver dados importantes.
- Evite que a execução de um teste altere o resultado de outro.
- Considere execuções paralelas e possíveis conflitos de horário em um mesmo recurso.
- Respeite as regras de integridade do backend (fuso horário explícito de Brasília, horários entre 08h e 18h sem segundos).

## 6. Validar regras de negócio e restrições da aplicação

Ao testar as funcionalidades do AgendaLab, verifique o comportamento nas camadas relevantes:

Exemplos de cenários:

- **Expediente comercial:** horários devem estar entre 08h e 18h no fuso de Brasília.
- **Ordem cronológica:** o término deve ser posterior ao início (`end > start`).
- **Data futura:** não é permitido agendar reservas no passado.
- **Capacidade do recurso:** salas validam limite máximo de participantes; equipamentos (projetores e notebooks) não exibem campo de participantes.
- **Campos condicionais:** `Atendimento externo` exige entidade visitante; `Capacitação` exige tema; `Reunião interna` oculta esse campo.
- **Cancelamento:** só é permitido cancelar reservas que ainda não começaram.
- **Conflito de agendamento:** se a API retornar erro 409 (conflito), a interface deve exibir alerta amigável e manter o modal aberto.

Não considere suficiente apenas esconder elementos na interface: valide o comportamento do feedback visual e a resposta das requisições.

## 7. Organizar os arquivos corretamente

Os testes E2E do AgendaLab ficam localizados na pasta `e2e/`, conforme configurado em `playwright.config.ts`.

Estrutura padrão do repositório:

```text
agendalab/
├── .github/
│   └── prompts/
│       └── novo-teste-playwright.prompt.md
├── apps/
│   ├── api/             # Backend NestJS (SQLite)
│   └── web/             # Frontend Next.js
├── e2e/                 # Testes E2E oficiais do Playwright
│   ├── reservation.spec.ts
│   └── new-reservation-variants.spec.ts
├── playwright.config.ts # Configuração do Playwright
└── package.json         # Scripts de teste (test, test:ui)
```

- Mantenha gravações brutas do Codegen temporárias fora da suíte final executável.
- Salve os testes revisados com extensão `.spec.ts` dentro de `e2e/`.
- Agrupe testes por spec temática (ex.: `reservation.spec.ts`, `new-reservation-variants.spec.ts`).
- Não altere a configuração global do Playwright apenas para acomodar uma gravação isolada.

## 8. Tags e seleção dos testes

Examine como o projeto seleciona e categoriza os testes.

Se houver necessidade de agrupar cenários, utilize tags semânticas no título do teste ou do grupo:
- `@reservas` para fluxos de agendamento.
- `@validacoes` para testes de regras de validação e caminhos negativos.
- `@catalogo` para consulta de disponibilidade e filtros.

Lembre-se de que o hook de `pre-commit` (Husky) executa `node scripts/run-tagged-e2e.mjs --staged`, que identifica as tags dos arquivos alterados e executa apenas os testes em `e2e/` que compartilham a mesma tag ou conexão. Todos os testes relacionados devem passar sem falhas e sem timeouts para permitir que os commits sejam realizados.

## 9. Executar e validar os testes

Após criar ou modificar os testes:

1. Execute primeiro o arquivo de teste recém-criado em Chromium:
   ```powershell
   npx playwright test e2e/seu-teste.spec.ts --project=chromium
   ```
2. Utilize os scripts do `package.json` quando apropriado:
   - `npm test`: executa a suíte E2E completa.
   - `npm run test:ui`: abre o Playwright UI Mode para depuração visual.
3. Verifique falhas de seletores, assertions, requisições de rede e dados de teste.
4. Corrija os problemas identificados com base em evidências.
5. Não remova assertions nem enfraqueça as validações apenas para fazer os testes passarem.
6. Verifique se os testes passam repetidamente sem depender de ordem de execução ou de resíduos no banco.
7. Informe os testes executados e os resultados observados.

Não declare sucesso sem evidência de execução.

Se houver falha causada por ambiente indisponível, dados inconsistentes ou defeito na aplicação, descreva o problema claramente. Não o mascare alterando as expectativas do teste.

## 10. Limites de atuação

- Não faça commit automaticamente.
- Não execute `git commit`.
- Não altere o `pre-commit`, o Husky ou a configuração global dos testes sem necessidade e autorização.
- Não modifique a implementação da aplicação apenas para mascarar uma falha de teste.
- Não altere dependências sem justificativa.
- Não execute operações destrutivas no banco de dados sem autorização.
- Não invente regras de negócio não existentes no AgendaLab.
- Não exponha credenciais, segredos ou dados pessoais nos arquivos de teste.

Se for necessário modificar a aplicação para corrigir um defeito real, apresente a evidência e explique a alteração antes de realizar mudanças de escopo maior.

## 11. Relatório final obrigatório

Ao concluir, apresente:

1. Arquivos criados ou alterados.
2. Regra de negócio testada.
3. Cenários positivos e negativos cobertos.
4. Assertions relevantes adicionadas.
5. Estratégia de geração de dados com Faker (`fakerPT_BR`).
6. Estratégia de isolamento (mock via `page.route` ou preparação de dados).
7. Comandos executados e resultados observados.
8. Problemas encontrados e correções realizadas.
9. Limitações ou dúvidas que dependam do usuário.

Se não tiver sido possível validar algum requisito, indique isso explicitamente.

## Critério de qualidade

O trabalho só está concluído quando os testes verificam comportamentos reais da aplicação, utilizam dados de teste apropriados, respeitam o isolamento do ambiente e podem ser executados repetidamente sem depender de registros persistentes ou de uma ordem específica de execução.

A gravação do Codegen é o ponto de partida, não o resultado final.

Não faça commit. Entregue os testes revisados e o relatório para que o usuário possa validá-los e decidir quando realizar o commit.
