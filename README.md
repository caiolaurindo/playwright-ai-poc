# AgendaLab

POC para estudar futuramente testes automatizados com Playwright. Nesta primeira etapa, o projeto contém somente a aplicação: Next.js, NestJS e SQLite, sem configuração, dependências ou arquivos de testes.

O frontend utiliza os componentes reais de `@uigovpe/components`, os estilos de `@uigovpe/styles`, `LayoutProvider`, `UiProvider`, `GovBar` e a fonte Inter distribuída localmente pelo Fontsource. A interface é inspirada no Governo de Pernambuco; este é um projeto de estudo com dados fictícios, sem vínculo institucional.

## Requisitos e execução

- Node.js **22.13 ou superior** (Node 22 LTS recomendado).
- npm 10 ou superior.

Na raiz do projeto:

```powershell
npm install
npm run dev
```

Abra **http://localhost:3000**. O mesmo comando inicia o frontend na porta 3000 e a API na porta 3001. Use `Ctrl+C` para encerrar os dois processos.

O banco é criado e recebe nove recursos fictícios automaticamente na primeira inicialização. Nenhuma instalação de banco, chave externa ou login é necessária. As reservas persistem após reiniciar a aplicação.

As configurações padrão funcionam sem arquivos `.env`. Para alterar as portas ou o caminho do banco, copie `apps/api/.env.example` para `apps/api/.env` e `apps/web/.env.example` para `apps/web/.env.local`. Se mudar a porta da API, atualize também `API_URL` no frontend.

## Funcionalidades

1. **Visualizar salas disponíveis:** catálogo com busca, tipo de recurso, capacidade, data e horário. Ao editar o período, clique em **Consultar disponibilidade** para aplicar. O período inicial é amanhã, das 09h às 10h.
2. **Criar uma reserva:** escolha um recurso, título, data, horários e participantes. Observações são opcionais. Há seis salas, um projetor e dois notebooks.
3. **Consultar minhas reservas:** acompanhe reservas próximas/em andamento, concluídas e canceladas, com busca pelo título ou recurso.
4. **Cancelar uma reserva:** a confirmação preserva o histórico e libera o período para uma nova reserva.

O colaborador é fixo: **Ana Silva**. A API define essa identidade e não aceita um identificador arbitrário no formulário. Esta POC não implementa autenticação nem múltiplos usuários.

## Regras de reserva

- Horários em **America/Sao_Paulo (Brasília, UTC−03)**, independentemente do fuso configurado na máquina.
- Períodos entre **08h e 18h**, no mesmo dia, inclusive fins de semana.
- O início precisa estar no futuro; o término deve ser posterior ao início.
- Título de 3 a 120 caracteres; observações de até 500 caracteres.
- Participantes entre 1 e a capacidade da sala; equipamento fica vinculado a um responsável.
- Reservas confirmadas do mesmo recurso não podem se sobrepor. Uma reserva pode começar exatamente quando a anterior termina.
- A consulta do catálogo é uma fotografia da disponibilidade: a API verifica o conflito novamente ao confirmar, dentro de uma transação SQLite.
- Apenas reservas que ainda não começaram podem ser canceladas. Repetir o cancelamento de uma reserva já cancelada retorna o mesmo resultado.

## Estrutura

```text
apps/
  api/
    src/
      database/      # SQLite, esquema e recursos iniciais
      resources/     # Consulta de disponibilidade
      reservations/  # DTOs, regras e criação/cancelamento
    data/            # Banco local gerado e ignorado pelo Git
  web/
    src/
      app/           # Rotas Next.js e estilos globais
      components/    # Catálogo, formulário e minhas reservas
      lib/           # Cliente da API e datas
packages/
  contracts/         # Tipos compartilhados, sem código de execução
```

O navegador acessa `/api` no Next.js; um rewrite encaminha as requisições para o NestJS. As regras ficam no backend e os DTOs validam os dados recebidos. O SQLite nativo do Node evita dependências de compilação de banco no Windows. O Node 22 pode exibir um aviso sobre o caráter experimental de `node:sqlite`.

## Comandos

```powershell
npm run dev        # Desenvolvimento dos dois aplicativos
npm run typecheck  # Verificação de tipos TypeScript
npm run build      # Compilação da API e do frontend
npm start          # Executar as versões compiladas
```

Também é possível executar separadamente com `npm run dev -w @agendalab/api` e `npm run dev -w @agendalab/web`.

## API

Base local: `http://127.0.0.1:3001/api`.

| Método | Caminho                            | Ação                                        |
| ------ | ---------------------------------- | ------------------------------------------- |
| GET    | `/health`                          | Estado da API                               |
| GET    | `/me`                              | Colaborador de demonstração                 |
| GET    | `/resources?startAt=...&endAt=...` | Recursos com disponibilidade para o período |
| GET    | `/reservations/mine`               | Reservas do colaborador atual               |
| POST   | `/reservations`                    | Criar reserva                               |
| PATCH  | `/reservations/:id/cancel`         | Cancelar reserva                            |

`GET /resources` sem período mostra a disponibilidade no instante atual. Na consulta com período, informe ambos os parâmetros como datas ISO 8601 com fuso explícito; use `URLSearchParams` para codificar os valores.

Exemplo de corpo de criação (substitua a data por uma data futura):

```json
{
  "resourceId": "sala-capibaribe",
  "title": "Alinhamento da equipe",
  "participants": 4,
  "startAt": "2027-01-12T09:00:00-03:00",
  "endAt": "2027-01-12T10:00:00-03:00",
  "notes": "Apresentação do planejamento"
}
```

Respostas: `201` na criação, `200` nas consultas/cancelamento, `400` para dados inválidos, `404` para recurso/reserva inexistente e `409` para conflito de horário.

Para recomeçar com o catálogo inicial e sem reservas, encerre a API, faça uma cópia do banco se quiser preservar os dados e remova somente os arquivos de banco em `apps/api/data/`. Eles serão recriados na próxima execução.

## Próxima etapa

A integração com Playwright fica para uma próxima etapa, após conhecer os fluxos da aplicação. Ainda não existe suíte de testes nem comando de testes neste projeto.

Referências: [Next.js](https://nextjs.org/docs), [NestJS](https://docs.nestjs.com), [UI GovPE components](https://www.npmjs.com/package/@uigovpe/components), [UI GovPE styles](https://www.npmjs.com/package/@uigovpe/styles).
