# AgendaLab: laboratório de testes automatizados com Playwright

Este repositório é um laboratório prático para aprender **testes automatizados com Playwright**. A aplicação usada nos estudos é o **AgendaLab**, um sistema de reserva de ambientes e equipamentos compartilhados: salas de reunião, projetores e notebooks.

A proposta é construir o aprendizado por etapas: conhecer os fluxos da aplicação, escrever os primeiros testes e evoluir a organização da suíte. Os cenários se aproximam de sistemas administrativos do setor público, para facilitar a aplicação dos conceitos no trabalho.

A aplicação utiliza **Next.js no frontend, NestJS na API e SQLite para persistência**, com a identidade visual do UI Kit do Governo de Pernambuco. Todos os dados são fictícios e o projeto não tem vínculo institucional.

**Ideia para o trabalho:** demonstrar como os fluxos importantes de um sistema podem ser descritos em linguagem simples, automatizados no navegador e executados de forma repetível. O AgendaLab serve como prova de conceito para discutir cobertura, manutenção e integração dos testes ao desenvolvimento.

**Estado atual:** a aplicação, o Swagger, os testes E2E iniciais e uma configuração de Playwright MCP estão implementados. O laboratório mostra duas maneiras de começar um teste com apoio do navegador: gravar ações com o Codegen ou explorar a aplicação com o MCP. Em ambos os casos, o código precisa ser revisado e receber asserções úteis.

---

## Sumário

1. [Objetivo e proposta](#1-objetivo-e-proposta)
2. [Como rodar a aplicação](#2-como-rodar-a-aplicação)
3. [Conheça os fluxos do AgendaLab](#3-conheça-os-fluxos-do-agendalab)
4. [Fundamentos do Playwright](#4-fundamentos-do-playwright)
5. [Tutorial: criar um teste com Codegen](#5-tutorial-criar-um-teste-com-codegen)
6. [Tutorial: explorar a aplicação com MCP](#6-tutorial-explorar-a-aplicação-com-mcp)
7. [MCP ou Codegen: quando usar cada um](#7-mcp-ou-codegen-quando-usar-cada-um)
8. [Executar e investigar os testes](#8-executar-e-investigar-os-testes)
9. [Testes E2E existentes](#9-testes-e2e-existentes)
10. [Como aplicar a ideia no trabalho](#10-como-aplicar-a-ideia-no-trabalho)
11. [Referências](#11-referências)

---

## 1. Objetivo e proposta

Aprender a verificar o comportamento de uma aplicação real usando seus fluxos de negócio. O ponto de partida são quatro funcionalidades:

| Funcionalidade | Comportamento esperado |
| --- | --- |
| Visualizar salas e equipamentos | Consultar os recursos disponíveis para uma data e um período |
| Criar uma reserva | Preencher o formulário e confirmar a reserva de um recurso |
| Consultar minhas reservas | Encontrar a reserva criada e acompanhar sua situação |
| Cancelar uma reserva | Confirmar o cancelamento e liberar o período para outra reserva |

O estudo inclui fluxos bem-sucedidos e situações como campos inválidos, conflitos de horário e listas sem resultados. A ideia é praticar automação com ferramentas conhecidas e discutir como adaptar os mesmos princípios a sistemas maiores.

### Arquitetura do laboratório

| Parte | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Interface | Next.js | Catálogo, formulário e gerenciamento de reservas |
| API | NestJS | Disponibilidade, criação e cancelamento de reservas |
| Persistência | SQLite | Dados demonstrativos locais |
| Automação | Playwright Test | Testes de ponta a ponta no navegador |
| Exploração assistida | Playwright MCP | Inspecionar e interagir com a interface a partir de um cliente MCP |

---

## 2. Como rodar a aplicação

**Pré-requisito:** Node.js 22.13 ou superior. Os comandos abaixo devem ser executados na raiz do repositório.

Instale as dependências e inicie a aplicação:

```powershell
npm install
npm run dev
```

O Playwright Test e o Faker já estão declarados como dependências de desenvolvimento. Se você estiver adicionando o Faker a outro projeto Playwright, instale-o com:

```powershell
npm install --save-dev @faker-js/faker
```

Abra [http://localhost:3000](http://localhost:3000). O comando de desenvolvimento inicia os dois aplicativos:

| Aplicativo | Endereço |
| --- | --- |
| Frontend Next.js | [http://localhost:3000](http://localhost:3000) |
| API NestJS | [http://localhost:3001/api/health](http://localhost:3001/api/health) |
| Swagger da API | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) |

O banco SQLite é criado automaticamente na primeira inicialização, com seis salas, um projetor e dois notebooks. Não é necessário instalar outro servidor de banco de dados ou configurar um login. Use `Ctrl+C` para encerrar os processos.

Para apagar todas as reservas do banco local sem parar a API, execute `npm run db:reset`. Os recursos cadastrados são mantidos.

Também é possível iniciar os aplicativos separadamente, em dois terminais:

```powershell
# Terminal 1: API
npm run dev -w @agendalab/api
```

```powershell
# Terminal 2: frontend
npm run dev -w @agendalab/web
```

---

## 3. Conheça os fluxos do AgendaLab

Antes de automatizar, percorra o fluxo manualmente:

1. Abra o catálogo. A consulta inicial considera amanhã, das 09h às 10h, e exibe salas de reunião.
2. Altere a data ou os horários e clique em **Consultar disponibilidade**. A alteração só é aplicada à consulta depois desse clique.
3. Busque uma sala pelo nome, filtre pela capacidade ou selecione projetores e notebooks no filtro de tipo.
4. Clique em **Reservar** em um recurso disponível. Preencha o formulário e confirme a reserva.
5. Abra **Minhas reservas** e localize a reserva pelo título ou pelo nome do recurso.
6. Se desejar, cancele a reserva e confirme o cancelamento.
7. Volte ao catálogo e consulte o mesmo período. O recurso deve estar disponível novamente se não houver outra reserva confirmada nesse intervalo.

O colaborador é **Ana Silva**, uma identidade fixa de demonstração. As reservas criadas pelo fluxo real permanecem salvas quando a aplicação é reiniciada. Por isso, considere os dados antes de repetir testes que enviam uma reserva.

---

## 4. Fundamentos do Playwright

O **Playwright Test** é um framework de testes de ponta a ponta para aplicações web. Ele automatiza ações no navegador e verifica os resultados, com suporte a Chromium, Firefox e WebKit. Consulte a [introdução oficial](https://playwright.dev/docs/intro).

Um teste de interface normalmente combina **navegação, localização de elementos, ações e asserções**. O exemplo abaixo abre a documentação do Playwright, clica em um link e verifica o resultado:

```typescript
import { expect, test } from "@playwright/test";

test("o link Get started leva à instalação", async ({ page }) => {
  await page.goto("https://playwright.dev/");

  await page.getByRole("link", { name: "Get started" }).click();

  await expect(
    page.getByRole("heading", { name: "Installation" }),
  ).toBeVisible();
});
```

O que acontece:

1. `test` declara um caso de teste com um nome que aparece no relatório.
2. `page.goto()` navega para o endereço informado.
3. `getByRole()` localiza o link pelo papel e pelo nome acessível.
4. `.click()` executa a ação.
5. `expect(...).toBeVisible()` confirma um resultado observável na página.

Os conceitos principais para desenvolver a suíte são:

- **Localizadores:** encontrar controles pelo papel e nome apresentados ao usuário.
- **Ações:** clicar, preencher, marcar opções e navegar.
- **Asserções:** verificar se o comportamento esperado ocorreu.
- **Isolamento:** preparar os dados para um teste não depender de outro.
- **Diagnóstico:** investigar traces e relatórios quando há falha.

Prefira localizadores por papel, label ou test ID estável. Evite depender da posição de um elemento ou de detalhes internos da implementação quando há uma alternativa acessível. Veja as [boas práticas do Playwright](https://playwright.dev/docs/best-practices), a [documentação de Locators](https://playwright.dev/docs/locators) e a [documentação de asserções](https://playwright.dev/docs/test-assertions).

### Ações e asserções comuns

| Código | O que faz |
| --- | --- |
| `locator.click()` | Clica no elemento |
| `locator.fill("texto")` | Preenche um campo |
| `locator.check()` / `locator.uncheck()` | Marca ou desmarca uma caixa |
| `locator.press("Enter")` | Pressiona uma tecla |
| `locator.selectOption("valor")` | Escolhe uma opção em um `<select>` HTML |
| `expect(locator).toBeVisible()` | Verifica que o elemento está visível |
| `expect(locator).toHaveText("texto")` | Verifica o texto exibido |
| `expect(locator).toHaveValue("valor")` | Verifica o valor de um campo |
| `expect(page).toHaveURL("url")` | Verifica o endereço atual |

Asserções de interface normalmente são assíncronas e devem usar `await`. Elas aguardam a condição até que seja satisfeita ou até atingir o timeout configurado.

---

## 5. Tutorial: criar um teste com Codegen

O **Codegen** abre o navegador e o Playwright Inspector enquanto você percorre a aplicação. As ações são transformadas em código Playwright. É um bom ponto de partida para aprender localizadores e capturar um fluxo conhecido.

### 5.1. Preparar o projeto

Se ainda não instalou as dependências e os navegadores, execute na raiz do repositório:

```powershell
npm install
npx playwright install
```

Em um terminal, inicie a aplicação e mantenha o processo aberto:

```powershell
npm run dev
```

### 5.2. Gravar uma reserva na Sala Frevo

Em outro terminal, na raiz do repositório, inicie o Codegen:

```powershell
npx playwright codegen http://localhost:3000
```

No navegador aberto pelo Codegen, siga este fluxo:

1. Abra **Ambientes e equipamentos**.
2. Localize a **Sala Frevo** e clique em **Reservar**.
3. Preencha o formulário de nova reserva.
4. Clique em **Confirmar reserva**.
5. Encerre a gravação e revise o código no Playwright Inspector.

### 5.3. Salvar, revisar e executar

Copie o código gerado para um novo arquivo em `e2e/`, por exemplo `e2e/reserva-frevo.spec.ts`. Antes de executar, revise as ações e acrescente uma asserção que verifique o resultado, como a mensagem de confirmação ou a reserva em **Minhas reservas**.

Execute somente esse arquivo em Chromium:

```powershell
npx playwright test e2e/reserva-frevo.spec.ts --project=chromium
```

O Codegen grava ações; não conhece sozinho todas as regras do negócio. Verifique se o teste realmente confirma o comportamento esperado, se os dados ainda são válidos e se há alguma ação desnecessária.

> **Atenção aos dados:** o fluxo real de confirmação grava uma reserva no SQLite. Repetir a mesma reserva pode causar conflito de horário. Use dados controlados de teste e não execute o comando de reset contra uma base que contenha dados importantes.

![Playwright Codegen gravando o fluxo de reserva do AgendaLab e mostrando os localizadores gerados no Inspector](image.png)

---

## 6. Tutorial: explorar a aplicação com MCP

O **Playwright MCP** expõe ferramentas de navegador através do Model Context Protocol. Um assistente compatível pode abrir páginas, ler snapshots de acessibilidade, interagir com controles e observar mensagens do console. No AgendaLab, o MCP ajuda a conhecer o fluxo antes de escrever o teste automatizado.

### 6.1. O que é necessário

- Node.js instalado e disponível no terminal.
- Um cliente que suporte servidores MCP, como um IDE ou assistente compatível.
- A aplicação AgendaLab iniciada em `http://localhost:3000`.
- Acesso à internet na primeira execução para o `npx` baixar o servidor MCP e o navegador Playwright, se ainda não estiverem disponíveis localmente.

Este repositório já contém `.mcp.json` com a configuração do servidor:

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

O arquivo usa o formato de configuração do servidor Playwright MCP. O modo de carregar a configuração varia conforme o cliente. Se o seu IDE não reconhecer `.mcp.json` automaticamente, adicione a mesma definição nas configurações MCP específicas do cliente e reinicie ou recarregue o servidor.

### 6.2. Iniciar e usar o MCP

1. No terminal do projeto, inicie a aplicação com `npm run dev` e deixe-a ativa.
2. No seu cliente MCP, confirme que o servidor `playwright` está conectado. Se acabou de adicioná-lo, reinicie ou recarregue os servidores MCP do cliente.
3. Peça ao assistente para abrir o endereço e investigar um cenário específico. Por exemplo:

   > Acesse `http://localhost:3000/` com o Playwright MCP. Explore o fluxo de nova reserva, identifique os campos e as validações e depois proponha um teste em `e2e/` com asserções para cada resultado.

4. O MCP navega, retorna o estado acessível da página e usa esses dados para localizar os controles. O assistente pode interagir e consultar o estado atualizado após cada ação.
5. Revise o fluxo observado e o teste escrito. Execute o teste com Playwright Test, como descrito na [seção 8](#8-executar-e-investigar-os-testes).

Se o MCP não iniciar, confira se o cliente aceita o formato do `.mcp.json`, se o Node está no `PATH`, se `npx` consegue baixar o pacote e se o cliente mostra erros de inicialização. Para o fluxo da aplicação, confira também se `npm run dev` continua ativo e se `http://localhost:3000` abre no navegador.

### 6.3. O que observar durante a exploração

- Quais campos aparecem e quais são obrigatórios.
- Como opções e condições mudam a interface.
- Que mensagem é mostrada depois do envio.
- Se há erros no console ou na comunicação com a API.
- Se a ação cria ou altera dados persistentes.

O MCP é uma sessão de exploração. As referências temporárias dos elementos e o estado do navegador não devem ser tratados como parte do teste final. O arquivo Playwright deve navegar até o endereço e preparar, por conta própria, os dados e a sessão de que precisa.

> **Atenção aos dados:** explorar uma página pode executar ações reais na aplicação. Confirmar uma reserva pelo MCP cria um registro no SQLite. Para apenas entender o formulário, não envie a reserva; se precisar testar o fluxo completo, use dados de teste e planeje a limpeza.

Consulte a [introdução oficial ao Playwright MCP](https://playwright.dev/mcp/introduction) e a [instalação e primeiros passos](https://playwright.dev/mcp/installation).

---

## 7. MCP ou Codegen: quando usar cada um

As ferramentas ajudam a começar; nenhuma substitui a revisão do teste e a execução com Playwright Test.

| Situação | Mais útil | Por quê |
| --- | --- | --- |
| Você ainda não conhece o fluxo ou os estados da tela | MCP | O assistente explora a interface e pode resumir campos, opções e mensagens |
| Você sabe o caminho e quer gravar as ações do navegador | Codegen | Você percorre o fluxo e vê os localizadores gerados no Inspector |
| Uma tela muda conforme escolhas do usuário | MCP ou Codegen | Explore primeiro com MCP ou grave as variantes; depois confirme cada comportamento com asserções |
| Você quer aprender o código Playwright passo a passo | Codegen | As ações aparecem como código que pode ser estudado e simplificado |
| Você precisa criar cenários com muitos dados, regras ou reutilização | Código Playwright revisado | Fixtures, funções auxiliares e testes orientados a dados ficam mais claros em código mantido manualmente |
| Você precisa rodar a regressão no CI | Playwright Test | A suíte automatizada é reproduzível e pode ser integrada ao fluxo de desenvolvimento |

Um fluxo de trabalho prático é:

1. **Explorar:** use MCP quando precisar entender a página ou descobrir variantes.
2. **Rascunhar:** use Codegen para registrar uma jornada conhecida, ou peça ao assistente que monte um primeiro teste a partir do cenário observado.
3. **Revisar:** escolha localizadores claros, remova passos desnecessários e acrescente asserções ligadas à regra de negócio.
4. **Preparar os dados:** decida se o teste usará uma API real, uma resposta simulada ou uma base de teste isolada.
5. **Executar:** rode o arquivo com Playwright Test e confira o resultado antes de considerar o cenário pronto.

Para testes confiáveis, prefira verificar resultados visíveis, isolar cada cenário, controlar os dados e evitar dependências externas. Consulte as [boas práticas oficiais](https://playwright.dev/docs/best-practices).

---

## 8. Executar e investigar os testes

A aplicação precisa estar rodando em outro terminal para executar os testes existentes, pois `webServer` e `baseURL` não estão habilitados na configuração atual.

Execute a suíte completa nos projetos configurados:

```powershell
npx playwright test
```

Execute somente em Chromium:

```powershell
npx playwright test --project=chromium
```

Execute um arquivo específico:

```powershell
npx playwright test e2e/new-reservation-variants.spec.ts --project=chromium
```

Abra a UI do Playwright para escolher testes e acompanhar a execução:

```powershell
npx playwright test --ui
```

Ao final, o Playwright exibe o resumo no terminal e gera o relatório HTML. Para abrir o relatório mais recente:

```powershell
npx playwright show-report
```

Os traces ajudam a investigar falhas com uma linha do tempo de ações, snapshots e informações do navegador. Nesta configuração, o trace é mantido quando um teste falha.

Se os navegadores Playwright ainda não estiverem instalados nessa máquina, execute `npx playwright install`. Consulte a [documentação da linha de comando](https://playwright.dev/docs/test-cli) e do [modo UI](https://playwright.dev/docs/test-ui-mode).

---

## 9. Testes E2E existentes

Os testes ficam em `e2e/`:

| Arquivo | Cenário | Dados e observações |
| --- | --- | --- |
| `e2e/reservation.spec.ts` | Gera uma data e um horário, consulta a disponibilidade, escolhe uma sala livre e confirma a reserva | Usa a API local; título, observações e participantes são gerados com Faker. A reserva é persistida no SQLite. |
| `e2e/new-reservation-variants.spec.ts` | Testa reunião interna, atendimento externo, capacitação e validações do formulário | Datas, horários e campos de texto variam com Faker. Os casos de sucesso simulam a resposta de criação; as validações negativas não criam reservas. |

Os casos de sucesso da spec de variantes verificam o comportamento da interface diante de uma resposta de sucesso simulada. Eles não verificam o salvamento na API ou no banco. A spec `reservation.spec.ts` cobre a confirmação com a API local e grava dados persistentes.

Esse arranjo permite estudar dois tipos de teste: fluxos de interface com dependências simuladas e um fluxo que passa pela API local. Em uma suíte de trabalho, deixe explícito o que cada teste valida e prepare uma estratégia para criar e remover dados de integração.

### Dados variáveis com Faker

O **Faker** é uma biblioteca JavaScript que gera dados fictícios no próprio teste. Apesar de às vezes ser chamado de “Faker API”, seu uso neste projeto não faz chamadas HTTP nem depende de um serviço externo: importamos a biblioteca e chamamos seus métodos no código.

Ele ajuda a evitar dados repetidos entre execuções, como títulos fixos que já existem no banco, nomes duplicados e datas sempre iguais. Isso deixa os testes mais flexíveis e reduz colisões acidentais. Faker não substitui uma estratégia de isolamento e limpeza: um teste integrado ainda grava dados no SQLite, e execuções concorrentes podem disputar o mesmo recurso e horário.

A abordagem deste projeto é direta: primeiro escreva o teste e entenda o cenário; depois, substitua manualmente os dados que podem variar por chamadas Faker no próprio arquivo. Não é necessário criar um helper ou uma camada adicional. O locale `fakerPT_BR` gera dados localizados em português quando há suporte para o método utilizado.

Importe o locale em cada spec que precisar gerar dados:

```ts
import { fakerPT_BR as faker } from "@faker-js/faker";
```

### Métodos mais usados

Não é necessário usar todos esses métodos em cada teste. Escolha o que corresponde ao campo e às regras do cenário:

| Método | Uso típico no teste | Exemplo |
| --- | --- | --- |
| `faker.string.uuid()` | Criar um identificador único para títulos e dados de teste | `` `Reserva ${faker.string.uuid()}` `` |
| `faker.date.future()` | Gerar uma data futura para agendamentos | `faker.date.future({ years: 1 })` |
| `faker.date.between()` | Gerar uma data dentro de limites escolhidos | `faker.date.between({ from, to })` |
| `faker.number.int()` | Gerar uma quantidade dentro de uma faixa válida | `faker.number.int({ min: 1, max: capacity })` |
| `faker.lorem.sentence()` | Gerar observações ou descrições fictícias | `faker.lorem.sentence()` |
| `faker.company.name()` | Gerar nome fictício de empresa ou entidade visitante | `faker.company.name()` |
| `faker.person.fullName()` | Gerar nome fictício de uma pessoa | `faker.person.fullName()` |
| `faker.internet.email()` | Gerar e-mail para campos de cadastro | `faker.internet.email()` |

Um exemplo semelhante ao que aparece nas specs deste projeto:

```ts
const title = `Reserva de teste ${faker.string.uuid()}`;
const notes = faker.lorem.sentence();
const visitorOrganization = faker.company.name();
const participants = faker.number.int({ min: 1, max: capacity });
const date = faker.date.future({ years: 1 }).toISOString().slice(0, 10);
```

`faker.date.future()` é a opção direta quando o sistema exige uma data futura. `faker.date.between({ from, to })` é útil quando o cenário exige limites específicos; `from` e `to` podem ser objetos `Date`, strings ou timestamps UNIX. Um intervalo como `2000-01-01` até agora pode gerar uma data passada, então só serve para cenários que aceitem datas históricas.

Para gerar um horário válido de uma hora dentro do expediente, o próprio teste pode escolher o início e calcular o término:

```ts
const startHour = faker.number.int({ min: 8, max: 16 });
const start = `${String(startHour).padStart(2, "0")}:00`;
const end = `${String(startHour + 1).padStart(2, "0")}:00`;
```

Na reserva integrada, o teste consulta a disponibilidade para a data e o horário gerados antes de escolher uma sala. Isso evita depender sempre da data padrão ou tentar reservar uma sala que já aparece ocupada. A reserva é persistida no SQLite; Faker reduz colisões por títulos e dados repetidos, mas não garante sozinho que nenhuma execução concorrente use o mesmo intervalo. Em uma suíte compartilhada, use também uma base isolada por execução ou uma estratégia para criar e limpar os dados.

Mantenha fixos os valores que definem o cenário, como os tipos de solicitação e organizações aceitos pelo sistema, além dos horários intencionalmente inválidos em testes de validação. Gere os campos variáveis: título, observações, entidade visitante, data e quantidade de participantes. Nos casos de capacidade máxima, use o limite da sala em vez de um número aleatório.

### Recomendações para os testes

1. **Gere dados que precisam ser únicos.** Use UUID em títulos, e-mails ou identificadores quando valores duplicados puderem conflitar com dados já persistidos.
2. **Respeite as regras do campo.** Limite números à faixa aceita, gere datas no passado ou futuro conforme o cenário e monte horários compatíveis com as regras do sistema.
3. **Mantenha explícitos os dados que definem o caso.** Tipos de solicitação, organizações aceitas e valores intencionalmente inválidos devem continuar fixos para o teste deixar claro o comportamento verificado.
4. **Não randomize limites de negócio.** Para testar capacidade máxima, use o limite informado pela sala; para testar um valor inválido específico, escreva esse valor diretamente.
5. **Investigue falhas com os dados reais da execução.** O trace do Playwright ajuda a ver o que foi preenchido. Fixar uma seed do Faker torna a sequência de valores reproduzível, mas também faz os dados se repetirem entre execuções que usam a mesma seed.

Veja também a seção de [referências](#11-referências), com links para o guia e para a documentação oficial dos métodos usados.

---

## 10. Como aplicar a ideia no trabalho

O AgendaLab ajuda a apresentar uma proposta de automação sem prometer que uma gravação rápida substitui o planejamento dos testes. Para adaptar a abordagem a um sistema real:

1. Escolha poucos fluxos críticos, como login, cadastro, aprovação ou consulta.
2. Defina o resultado esperado de cada fluxo antes de automatizar.
3. Explore a interface com MCP ou Codegen para reduzir o tempo de descoberta.
4. Transforme os rascunhos em testes legíveis com asserções de negócio.
5. Use dados e contas próprias para teste, em um ambiente controlado.
6. Integre uma seleção representativa da suíte ao CI e amplie a cobertura aos poucos.

Com o crescimento da suíte, organize preparação de dados e autenticação em fixtures reutilizáveis, mantenha cenários independentes e acompanhe falhas recorrentes. Os testes E2E são mais valiosos quando cobrem jornadas importantes; regras isoladas podem ser verificadas em testes de API ou unidade, mais rápidos e focados.

---

## 11. Referências

- [Playwright: instalação e introdução](https://playwright.dev/docs/intro)
- [Playwright: localizadores](https://playwright.dev/docs/locators)
- [Playwright: asserções](https://playwright.dev/docs/test-assertions)
- [Playwright: boas práticas](https://playwright.dev/docs/best-practices)
- [Playwright: Codegen](https://playwright.dev/docs/codegen)
- [Playwright: modo UI](https://playwright.dev/docs/test-ui-mode)
- [Playwright: linha de comando](https://playwright.dev/docs/test-cli)
- [Playwright MCP: introdução](https://playwright.dev/mcp/introduction)
- [Faker: guia de uso](https://fakerjs.dev/guide/usage.html)
- [Faker: locale Português do Brasil](https://fakerjs.dev/locales/pt_br)
- [Faker: datas futuras (`date.future`)](https://fakerjs.dev/api/date.html#future)
- [Faker: datas entre limites (`date.between`)](https://fakerjs.dev/api/date.html#between)
- [Faker: strings e UUID (`string.uuid`)](https://fakerjs.dev/api/string.html#uuid)
- [Faker: números (`number.int`)](https://fakerjs.dev/api/number.html#int)
- [Faker: textos (`lorem.sentence`)](https://fakerjs.dev/api/lorem.html#sentence)
- [Faker: empresas (`company.name`)](https://fakerjs.dev/api/company.html#name)
- [Faker: pessoas (`person.fullName`)](https://fakerjs.dev/api/person.html#fullname)
- [Faker: internet e e-mail (`internet.email`)](https://fakerjs.dev/api/internet.html#email)
- [Playwright MCP: instalação](https://playwright.dev/mcp/installation)
- [Next.js: documentação](https://nextjs.org/docs)
- [NestJS: documentação](https://docs.nestjs.com)
- [NestJS: Swagger e OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [UI GovPE: componentes](https://www.npmjs.com/package/@uigovpe/components)
- [UI GovPE: estilos](https://www.npmjs.com/package/@uigovpe/styles)
