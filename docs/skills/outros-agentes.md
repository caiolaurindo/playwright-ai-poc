# Como configurar a skill `novo-teste-playwright` no Claude Code

## Objetivo

Este guia explica como disponibilizar no Claude Code a skill `novo-teste-playwright`, criada originalmente para o Antigravity.

A skill transforma gravações do Playwright Codegen em testes E2E completos para o AgendaLab, aplicando Faker, assertions, regras de negócio, isolamento de dados e validação dos testes.

**Importante:** o objetivo é reutilizar as mesmas instruções nos dois agentes, evitando divergências de comportamento.

## 1. Pré-requisitos

Antes de começar, confirme que:

- O Claude Code está instalado e funcionando.
- O repositório do AgendaLab está aberto no ambiente de trabalho.
- A skill original existe no projeto.
- O arquivo `SKILL.md` contém as instruções completas da skill.

A implementação original do Antigravity fica em:

```text
.agents/
└── skills/
    └── novo-teste-playwright/
        └── SKILL.md
```

Se o seu projeto ainda utiliza `.agent/skills/`, localize a pasta correspondente antes de continuar.

## 2. Criar a skill no Claude Code

O Claude Code reconhece skills de projeto dentro de `.claude/skills/`.

Na raiz do AgendaLab, crie a seguinte estrutura:

```text
.claude/
└── skills/
    └── novo-teste-playwright/
        └── SKILL.md
```

Você pode fazer isso pelo Explorer do VS Code ou pelo terminal.

No PowerShell, execute na raiz do projeto:

```powershell
New-Item -ItemType Directory -Force `
  ".claude/skills/novo-teste-playwright"
```

Em seguida, copie o arquivo original para o diretório do Claude Code:

```powershell
Copy-Item `
  ".agents/skills/novo-teste-playwright/SKILL.md" `
  ".claude/skills/novo-teste-playwright/SKILL.md"
```

Se a skill original estiver em `.agent/skills/`, ajuste o caminho de origem no comando.

**Atenção:** a cópia acima pressupõe que a pasta original esteja em `.agents/skills/`. Confira o caminho antes de executar.

## 3. Conferir o cabeçalho do arquivo

O início do arquivo `.claude/skills/novo-teste-playwright/SKILL.md` deve conter os metadados da skill:

```yaml
---
name: novo-teste-playwright
description: Transforma gravações do Playwright Codegen em testes E2E completos e alinhados às regras do AgendaLab.
---
```

Abaixo desse cabeçalho, mantenha todas as instruções originais.

Não substitua o conteúdo completo da skill por apenas esse exemplo de cabeçalho.

## 4. O que deve ser preservado

A versão do Claude Code deve manter as mesmas regras da versão original:

- Analisar a estrutura do AgendaLab antes de criar testes.
- Interpretar o código gerado pelo Playwright Codegen como ponto de partida, não como teste final.
- Utilizar `@faker-js/faker`, com locale brasileiro, para dados dinâmicos quando necessário.
- Adicionar assertions explícitas com `expect`.
- Cobrir cenários positivos, negativos e regras de negócio aplicáveis.
- Utilizar seletores resilientes e evitar esperas fixas desnecessárias.
- Isolar os testes e evitar poluir o banco SQLite.
- Validar autenticação, autorização e acesso a dados privados quando aplicável.
- Executar os testes pertinentes e relatar os resultados reais.
- Não mascarar falhas, executar operações destrutivas sem autorização ou realizar commits automaticamente.

A skill deve continuar seguindo a configuração real do Playwright do projeto, incluindo os diretórios e comandos existentes.

## 5. Como utilizar no Claude Code

Abra o Claude Code na raiz do AgendaLab.

Em uma nova conversa, invoque:

```text
/novo-teste-playwright
```

Se a skill tiver sido reconhecida, forneça o código TypeScript gerado pelo Playwright Codegen ou indique o caminho do arquivo.

Exemplo de solicitação:

> Analise esta gravação do Playwright Codegen e transforme-a em testes E2E completos para o AgendaLab. Siga a skill novo-teste-playwright, utilize Faker quando necessário, adicione assertions para validar o comportamento real e execute os testes apropriados. Não faça commit automaticamente.

O Claude Code pode solicitar contexto adicional se a gravação não permitir determinar uma regra de negócio.

## 6. Como validar a instalação

Depois de criar o arquivo:

1. Salve todas as alterações.
2. Abra ou reinicie uma sessão do Claude Code na raiz do projeto, se necessário.
3. Digite `/` e procure `novo-teste-playwright`.
4. Se aparecer, invoque a skill.
5. Peça ao agente para resumir as regras principais da skill sem modificar arquivos.
6. Confirme que o resumo corresponde ao conteúdo do `SKILL.md`.

Se a skill não aparecer, confira o caminho, o nome da pasta e o cabeçalho YAML. Consulte também a documentação oficial para verificar os requisitos da versão instalada.

## 7. Evitar divergências entre os agentes

Neste modelo, a versão do Antigravity é a fonte original e a versão do Claude Code é uma cópia.

Sempre que alterar as instruções originais, sincronize a cópia do Claude Code. Caso contrário, os agentes poderão gerar testes com comportamentos diferentes.

Para reduzir esse risco, mantenha as alterações da skill documentadas e revise as duas versões após cada atualização.

Não copie apenas partes das instruções sem verificar se as regras de segurança, isolamento, execução e relatório final continuam presentes.

## 8. Estrutura final esperada

```text
agendalab/
├── .agents/
│   └── skills/
│       └── novo-teste-playwright/
│           └── SKILL.md
├── .claude/
│   └── skills/
│       └── novo-teste-playwright/
│           └── SKILL.md
├── docs/
│   └── skills/
│       └── instalar-skill-no-claude.md
├── e2e/
└── playwright.config.ts
```

A estrutura acima pressupõe que os diretórios originais existam e que o projeto mantenha os testes E2E em `e2e/`.

## Documentação oficial

- [Claude Code — Agent Skills](https://code.claude.com/docs/en/skills)

Consulte a documentação para verificar os detalhes de descoberta, invocação e suporte a skills na versão utilizada.

---

**Resultado esperado:** o Antigravity e o Claude Code conseguem utilizar a skill `novo-teste-playwright` e seguir as mesmas instruções para criar e validar testes E2E do AgendaLab.