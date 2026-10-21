#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const E2E_DIR = path.join(ROOT_DIR, "e2e");

/**
 * Mapa de conexão entre arquivos de código-fonte da aplicação (Web/API) e tags de testes E2E.
 */
const SOURCE_TO_TAGS_MAP = [
  {
    pattern: /^apps\/web\/src\/components\/resource-catalog\.tsx$/,
    tags: ["@catalogo"],
    reason: "Componente de catálogo, busca e filtros de recursos",
  },
  {
    pattern: /^apps\/web\/src\/components\/reservation-dialog\.tsx$/,
    tags: ["@reservas", "@validacoes"],
    reason: "Modal e formulário de criação/validação de reserva",
  },
  {
    pattern: /^apps\/web\/src\/components\/my-reservations\.tsx$/,
    tags: ["@minhas-reservas", "@reservas"],
    reason: "Listagem e cancelamento em Minhas Reservas",
  },
  {
    pattern: /^apps\/web\/src\/components\/shell\.tsx$/,
    tags: ["@usuario", "@catalogo", "@reservas"],
    reason: "Cabeçalho, navegação principal e identificação do usuário",
  },
  {
    pattern: /^apps\/web\/src\/app\/page\.tsx$/,
    tags: ["@catalogo"],
    reason: "Página inicial do catálogo de ambientes e equipamentos",
  },
  {
    pattern: /^apps\/web\/src\/app\/minhas-reservas\//,
    tags: ["@minhas-reservas", "@reservas"],
    reason: "Página de consulta de reservas do usuário",
  },
  {
    pattern: /^apps\/web\/src\/lib\/(api|dates)\.ts$/,
    tags: ["@catalogo", "@reservas", "@validacoes"],
    reason: "Utilitários de cliente HTTP e formatação de datas",
  },
  {
    pattern: /^apps\/api\/src\/resources\//,
    tags: ["@catalogo"],
    reason: "Endpoints de recursos e disponibilidade na API",
  },
  {
    pattern: /^apps\/api\/src\/reservations\/(period|reservation\.dto)\.ts$/,
    tags: ["@reservas", "@validacoes"],
    reason: "Regras de período e validações de DTO de reserva na API",
  },
  {
    pattern: /^apps\/api\/src\/reservations\//,
    tags: ["@reservas", "@validacoes", "@minhas-reservas"],
    reason: "Controller e serviço de reservas na API",
  },
  {
    pattern: /^apps\/api\/src\/demo-collaborator\.ts$/,
    tags: ["@usuario", "@reservas"],
    reason: "Dados do colaborador/usuário autenticado",
  },
  {
    pattern: /^packages\/contracts\//,
    tags: ["@catalogo", "@reservas", "@validacoes"],
    reason: "Contratos e tipagens compartilhadas entre Web e API",
  },
];

/**
 * Mapa de equivalência/conexão direta entre tags.
 */
const TAG_CONNECTIONS = {
  "@validacao": ["@validacoes"],
  "@validacoes": ["@validacao"],
  "@reserva": ["@reservas"],
  "@recurso": ["@catalogo", "@recursos"],
  "@recursos": ["@catalogo"],
};

/**
 * Escopos de pacotes npm que começam com "@" mas NÃO são tags de teste.
 */
const IGNORED_TAG_PREFIXES = new Set([
  "@playwright",
  "@faker-js",
  "@uigovpe",
  "@agendalab",
  "@nestjs",
  "@types",
]);

const TAG_TOKEN_REGEX = /(?:^|[\s'"`[,])(@[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ0-9_-]*)(?![a-zA-Z0-9_./-])/gm;
const HUNK_LINE_REGEX = /@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/g;
const TAG_COMMENT_REGEX = /\/\/\s*@tags\s*:\s*([^\r\n]+)/i;
const DESCRIBE_START_REGEX = /^\s*test\.describe\s*\(/;
const TEST_START_REGEX = /^\s*test\s*\(/;
const TITLE_LITERAL_REGEX = /\(\s*(['"`])([^'"`]+)\1/;

/**
 * Resolve o caminho absoluto do binário do Git em diretórios fixos do sistema.
 */
function resolveGitBinary() {
  const candidates =
    process.platform === "win32"
      ? [
          String.raw`C:\Program Files\Git\cmd\git.exe`,
          String.raw`C:\Program Files\Git\bin\git.exe`,
          String.raw`C:\Program Files (x86)\Git\cmd\git.exe`,
        ]
      : ["/usr/bin/git", "/usr/local/bin/git", "/opt/homebrew/bin/git"];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  return found ?? "git";
}

const GIT_BIN = resolveGitBinary();

/**
 * Executa um comando Git de forma segura sem invocar shell.
 */
function runGitCommand(args) {
  try {
    return execFileSync(GIT_BIN, args, {
      cwd: ROOT_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Normaliza separadores de caminho para barras ("/").
 */
function normalizePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

/**
 * Extrai todas as tags (@tag) válidas de um trecho de texto.
 */
function extractTagsFromText(text) {
  const tags = new Set();
  const regex = new RegExp(TAG_TOKEN_REGEX.source, "gm");
  let match = regex.exec(text);
  while (match !== null) {
    const tag = match[1];
    if (!IGNORED_TAG_PREFIXES.has(tag)) {
      tags.add(tag);
    }
    match = regex.exec(text);
  }
  return [...tags];
}

/**
 * Conta o saldo de chaves `{` e `}` em uma linha, ignorando comentários de linha `//`.
 */
function countBraces(line) {
  const commentIndex = line.indexOf("//");
  const clean = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
  let delta = 0;
  for (const ch of clean) {
    if (ch === "{") delta++;
    else if (ch === "}") delta--;
  }
  return delta;
}

/**
 * Lê o cabeçalho de uma chamada `test(...)` ou `test.describe(...)` até encontrar `=>`.
 */
function readBlockHeader(lines, startIndex, maxLines) {
  const limit = Math.min(lines.length, startIndex + maxLines);
  let chunk = "";
  for (let i = startIndex; i < limit; i++) {
    chunk += `${lines[i]}\n`;
    if (lines[i].includes("=>")) break;
  }
  return chunk;
}

/**
 * Encontra a linha de fechamento de um bloco delimitado por chaves `{ ... }`.
 */
function findBlockEndLine(lines, startIndex) {
  let depth = 0;
  let started = false;
  for (let i = startIndex; i < lines.length; i++) {
    const delta = countBraces(lines[i]);
    if (delta > 0) started = true;
    depth += delta;
    if (started && depth <= 0) {
      return i + 1;
    }
  }
  return lines.length;
}

/**
 * Extrai o título de um bloco `test` ou `test.describe`.
 */
function extractBlockTitle(headerChunk, fallbackTitle) {
  const match = TITLE_LITERAL_REGEX.exec(headerChunk);
  if (!match) return fallbackTitle;
  return match[2].replaceAll(/\s+/g, " ").trim();
}

/**
 * Extrai tags declaradas em comentários de topo do arquivo.
 */
function extractTopFileTags(lines) {
  const tags = new Set();
  const limit = Math.min(lines.length, 15);
  for (let i = 0; i < limit; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("//") && trimmed.includes("@")) {
      for (const tag of extractTagsFromText(trimmed)) {
        tags.add(tag);
      }
    }
  }
  return tags;
}

/**
 * Localiza todos os blocos `test.describe(...)` em uma lista de linhas.
 */
function extractDescribeBlocks(lines) {
  const describes = [];
  for (let i = 0; i < lines.length; i++) {
    if (!DESCRIBE_START_REGEX.test(lines[i])) continue;
    const startLine = i + 1;
    const headerChunk = readBlockHeader(lines, i, 8);
    const endLine = findBlockEndLine(lines, i);
    const title = extractBlockTitle(headerChunk, `describe L${startLine}`);
    const tags = extractTagsFromText(headerChunk);
    describes.push({ title, startLine, endLine, tags });
  }
  return describes;
}

/**
 * Localiza todos os blocos `test(...)` e herda tags de seus `test.describe` pais.
 */
function extractTestBlocks(lines, describes, fileLevelTags) {
  const tests = [];
  for (let i = 0; i < lines.length; i++) {
    if (!TEST_START_REGEX.test(lines[i])) continue;
    const startLine = i + 1;
    const headerChunk = readBlockHeader(lines, i, 10);
    const endLine = findBlockEndLine(lines, i);
    const title = extractBlockTitle(headerChunk, `Teste na linha ${startLine}`);

    const inheritedTags = describes
      .filter((d) => startLine >= d.startLine && startLine <= d.endLine)
      .flatMap((d) => d.tags);
    const ownTags = extractTagsFromText(headerChunk);
    const combinedTags = new Set([...fileLevelTags, ...inheritedTags, ...ownTags]);

    tests.push({
      title,
      startLine,
      endLine,
      tags: [...combinedTags],
    });
  }
  return tests;
}

/**
 * Analisa um arquivo .spec.ts e retorna seus blocos `test.describe`, `test` e tags.
 */
function parseSpecFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);

  const fileLevelTags = extractTopFileTags(lines);
  const describes = extractDescribeBlocks(lines);
  const tests = extractTestBlocks(lines, describes, fileLevelTags);

  const allFileTags = new Set(fileLevelTags);
  for (const d of describes) {
    for (const tag of d.tags) allFileTags.add(tag);
  }
  for (const t of tests) {
    for (const tag of t.tags) allFileTags.add(tag);
  }

  return {
    filePath,
    relativePath: normalizePath(path.relative(ROOT_DIR, filePath)),
    allTags: [...allFileTags],
    describes,
    tests,
  };
}

/**
 * Obtém os números das linhas alteradas no git diff de um arquivo específico.
 */
function getChangedLineNumbers(relativeFilePath, stagedOnly) {
  const args = stagedOnly
    ? ["diff", "--cached", "-U0", "--", relativeFilePath]
    : ["diff", "HEAD", "-U0", "--", relativeFilePath];
  const output = runGitCommand(args);
  if (!output) return [];

  const changedLines = new Set();
  const regex = new RegExp(HUNK_LINE_REGEX.source, "g");
  let match = regex.exec(output);
  while (match !== null) {
    const start = Number.parseInt(match[1], 10);
    const count = match[2] === undefined ? 1 : Number.parseInt(match[2], 10);
    const total = Math.max(count, 1);
    for (let l = start; l < start + total; l++) {
      changedLines.add(l);
    }
    match = regex.exec(output);
  }
  return [...changedLines];
}

/**
 * Converte a saída de linhas do Git em uma lista de caminhos normalizados.
 */
function splitGitLines(output) {
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean).map(normalizePath);
}

/**
 * Obtém a lista de arquivos alterados no Git (staged no pre-commit ou modificados no workspace).
 */
function getChangedFiles(options) {
  if (options.files.length > 0) {
    return options.files.map(normalizePath);
  }

  const stagedFiles = splitGitLines(
    runGitCommand(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]),
  );
  if (stagedFiles.length > 0 || options.stagedOnly) {
    return stagedFiles;
  }

  const unstagedFiles = splitGitLines(
    runGitCommand(["diff", "--name-only", "--diff-filter=ACMR"]),
  );
  const untrackedFiles = splitGitLines(
    runGitCommand(["ls-files", "--others", "--exclude-standard"]),
  );

  return [...new Set([...unstagedFiles, ...untrackedFiles])];
}

/**
 * Lista todos os arquivos .spec.ts dentro do diretório e2e/.
 */
function getAllSpecFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllSpecFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".spec.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Converte uma string de arquivos separados por vírgula em array limpo.
 */
function parseFileListArg(rawValue) {
  if (!rawValue) return [];
  return rawValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Faz o parse dos argumentos de linha de comando.
 */
function parseCliArgs(argv) {
  const options = {
    stagedOnly: false,
    dryRun: false,
    files: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--staged") {
      options.stagedOnly = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--files") {
      options.files.push(...parseFileListArg(argv[i + 1]));
      i++;
    } else if (arg.startsWith("--files=")) {
      options.files.push(...parseFileListArg(arg.slice("--files=".length)));
    }
  }

  return options;
}

/**
 * Registra uma tag acionada e o motivo correspondente no mapa `triggeredTags`.
 */
function addTriggeredTag(triggeredTags, tag, reason) {
  if (!triggeredTags.has(tag)) {
    triggeredTags.set(tag, new Set());
  }
  triggeredTags.get(tag).add(reason);
}

/**
 * Processa um arquivo de teste E2E (.spec.ts) alterado e registra suas tags acionadas.
 */
function collectTagsFromChangedSpec(file, absPath, stagedOnly, triggeredTags, untaggedSpecs) {
  const parsed = parseSpecFile(absPath);
  const changedLines = getChangedLineNumbers(file, stagedOnly);
  const matchedTests =
    changedLines.length > 0
      ? parsed.tests.filter((t) =>
          changedLines.some((line) => line >= t.startLine && line <= t.endLine),
        )
      : [];

  const matchedTags = matchedTests.flatMap((t) =>
    t.tags.map((tag) => ({ tag, reason: `Alteração no teste "${t.title}" (${file})` })),
  );

  if (matchedTags.length > 0) {
    for (const item of matchedTags) {
      addTriggeredTag(triggeredTags, item.tag, item.reason);
    }
    return;
  }

  if (parsed.allTags.length > 0) {
    for (const tag of parsed.allTags) {
      addTriggeredTag(triggeredTags, tag, `Alteração no arquivo de teste ${file}`);
    }
    return;
  }

  untaggedSpecs.add(file);
}

/**
 * Processa um arquivo de código-fonte alterado e registra tags por mapeamento ou comentário `@tags`.
 */
function collectTagsFromSourceFile(file, absPath, triggeredTags) {
  for (const mapping of SOURCE_TO_TAGS_MAP) {
    if (mapping.pattern.test(file)) {
      for (const tag of mapping.tags) {
        addTriggeredTag(triggeredTags, tag, `Conexão de código: ${file} (${mapping.reason})`);
      }
    }
  }

  if (!fs.existsSync(absPath) || !/\.(ts|tsx|js|mjs)$/.test(file)) return;

  const content = fs.readFileSync(absPath, "utf-8");
  const commentMatch = TAG_COMMENT_REGEX.exec(content);
  if (!commentMatch) return;

  for (const tag of extractTagsFromText(commentMatch[1])) {
    addTriggeredTag(triggeredTags, tag, `Anotação @tags explícita em ${file}`);
  }
}

/**
 * Expande as tags acionadas com suas tags equivalentes/conectadas em `TAG_CONNECTIONS`.
 */
function expandConnectedTags(triggeredTags) {
  const initialTags = Array.from(triggeredTags.keys());
  for (const tag of initialTags) {
    const connected = TAG_CONNECTIONS[tag] ?? [];
    for (const relatedTag of connected) {
      addTriggeredTag(triggeredTags, relatedTag, `Conexão equivalente com a tag ${tag}`);
    }
  }
}

/**
 * Seleciona os arquivos .spec.ts e blocos de teste que possuem qualquer uma das tags ativas.
 */
function selectInvolvedSpecs(allSpecFiles, activeTags, untaggedSpecs) {
  const involvedSpecs = [];
  let totalTestsInSuite = 0;
  let totalInvolvedTests = 0;

  for (const spec of allSpecFiles) {
    totalTestsInSuite += spec.tests.length;
    const matchingTests = spec.tests.filter(
      (t) =>
        t.tags.some((tag) => activeTags.includes(tag)) || untaggedSpecs.has(spec.relativePath),
    );
    if (matchingTests.length > 0) {
      involvedSpecs.push({ ...spec, matchingTests });
      totalInvolvedTests += matchingTests.length;
    }
  }

  return { involvedSpecs, totalTestsInSuite, totalInvolvedTests };
}

/**
 * Exibe no terminal as tags identificadas e os motivos de acionamento.
 */
function printTriggeredTags(triggeredTags) {
  if (triggeredTags.size === 0) return;
  console.log("\n🏷️  Tags identificadas para execução:");
  for (const [tag, reasons] of triggeredTags) {
    console.log(`   • ${tag}`);
    for (const reason of reasons) {
      console.log(`      └─ ${reason}`);
    }
  }
}

/**
 * Monta os argumentos do Playwright CLI para os arquivos e tags selecionados.
 */
function buildPlaywrightArgs(involvedSpecs, activeTags, untaggedSpecs) {
  const targetFiles = involvedSpecs.map((s) => s.relativePath);
  const playwrightArgs = ["test", ...targetFiles];

  if (activeTags.length > 0 && untaggedSpecs.size === 0) {
    const grepPattern = activeTags
      .map((t) => t.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`))
      .join("|");
    playwrightArgs.push("--grep", grepPattern);
    console.log(
      `\n🚀 Comando: npx playwright test ${targetFiles.join(" ")} --grep "${grepPattern}"\n`,
    );
  } else {
    console.log(`\n🚀 Comando: npx playwright test ${targetFiles.join(" ")}\n`);
  }

  return playwrightArgs;
}

/**
 * Analisa a lista de arquivos alterados e retorna as tags acionadas e specs sem tags.
 */
function analyzeChangedFiles(changedFiles, stagedOnly) {
  const triggeredTags = new Map();
  const untaggedSpecs = new Set();

  for (const file of changedFiles) {
    const absPath = path.join(ROOT_DIR, file);
    if (file.startsWith("e2e/") && file.endsWith(".spec.ts") && fs.existsSync(absPath)) {
      collectTagsFromChangedSpec(file, absPath, stagedOnly, triggeredTags, untaggedSpecs);
    } else {
      collectTagsFromSourceFile(file, absPath, triggeredTags);
    }
  }

  expandConnectedTags(triggeredTags);
  return { triggeredTags, untaggedSpecs };
}

/**
 * Adiciona todas as tags da suíte quando a configuração global do Playwright é alterada.
 */
function applyGlobalConfigFallback(allSpecFiles, triggeredTags) {
  console.log("\n⚠️  Configuração global do Playwright alterada. Todos os testes serão executados.");
  for (const spec of allSpecFiles) {
    for (const tag of spec.allTags) {
      addTriggeredTag(triggeredTags, tag, "Alteração em playwright.config.ts");
    }
  }
}

/**
 * Executa o processo do Playwright CLI e encerra com o código de saída apropriado.
 */
function executePlaywright(playwrightArgs) {
  const playwrightCli = path.join(ROOT_DIR, "node_modules", "@playwright", "test", "cli.js");
  const result = spawnSync(process.execPath, [playwrightCli, ...playwrightArgs], {
    stdio: "inherit",
    cwd: ROOT_DIR,
  });

  if (result.status !== 0) {
    console.error("\n❌ Falha nos testes E2E relacionados às tags alteradas. Commit abortado.\n");
    process.exit(result.status ?? 1);
  }

  console.log("\n✅ Todos os testes E2E relacionados às tags alteradas passaram com sucesso!\n");
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const changedFiles = getChangedFiles(options);

  console.log("\n================================================================");
  console.log("🎯 AgendaLab — Seletor Inteligente de Testes E2E por Tags");
  console.log("================================================================");

  if (changedFiles.length === 0) {
    console.log("ℹ️  Nenhum arquivo alterado detectado. Nenhum teste E2E precisa ser executado.");
    process.exit(0);
  }

  console.log("\n📂 Arquivos alterados no commit:");
  for (const file of changedFiles) {
    console.log(`   • ${file}`);
  }

  const touchedGlobalConfig = changedFiles.includes("playwright.config.ts");
  const allSpecFiles = getAllSpecFiles(E2E_DIR).map(parseSpecFile);
  const { triggeredTags, untaggedSpecs } = analyzeChangedFiles(changedFiles, options.stagedOnly);

  if (triggeredTags.size === 0 && untaggedSpecs.size === 0 && !touchedGlobalConfig) {
    console.log(
      "\n✅ As alterações não afetam fluxos cobertos por tags E2E (ex.: documentação/config).",
    );
    console.log("⏩ Pulando execução dos testes E2E neste commit.\n");
    process.exit(0);
  }

  if (touchedGlobalConfig && triggeredTags.size === 0) {
    applyGlobalConfigFallback(allSpecFiles, triggeredTags);
  }

  printTriggeredTags(triggeredTags);

  const activeTags = Array.from(triggeredTags.keys());
  const { involvedSpecs, totalTestsInSuite, totalInvolvedTests } = selectInvolvedSpecs(
    allSpecFiles,
    activeTags,
    untaggedSpecs,
  );

  const skippedCount = totalTestsInSuite - totalInvolvedTests;
  console.log(
    `\n📊 Resumo: selecionados ${totalInvolvedTests} de ${totalTestsInSuite} blocos de teste (${skippedCount} fora do escopo foram poupados).`,
  );

  const playwrightArgs = buildPlaywrightArgs(involvedSpecs, activeTags, untaggedSpecs);

  if (options.dryRun) {
    console.log("🧪 Modo --dry-run concluído com sucesso (execução real omitida).\n");
    process.exit(0);
  }

  executePlaywright(playwrightArgs);
}

main();
