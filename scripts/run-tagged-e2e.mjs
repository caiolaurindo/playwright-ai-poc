#!/usr/bin/env node

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const E2E_DIR = path.join(ROOT_DIR, "e2e");

/**
 * Mapa de conexão entre arquivos de código-fonte da aplicação (Web/API) e tags de testes E2E.
 * Quando um arquivo da aplicação é alterado no commit, o script identifica automaticamente
 * as tags conectadas a esse módulo e executa os testes correspondentes.
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
 * Permite que uma tag acione automaticamente outra tag conectada/equivalente.
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

/**
 * Extrai todas as tags (@tag) válidas de um trecho de texto.
 */
function extractTagsFromText(text) {
  const tags = new Set();
  const regex = /(?:^|[\s'"`[,])(@[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ0-9_-]*)(?![a-zA-Z0-9_./-])/gm;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const tag = match[1];
    if (!IGNORED_TAG_PREFIXES.has(tag)) {
      tags.add(tag);
    }
  }
  return [...tags];
}

/**
 * Conta chaves `{` e `}` em uma linha (ignorando comentários simples) para rastrear escopo de blocos.
 */
function countBraces(line) {
  const clean = line.replace(/\/\/.*$/, "");
  let delta = 0;
  for (const ch of clean) {
    if (ch === "{") delta++;
    else if (ch === "}") delta--;
  }
  return delta;
}

/**
 * Analisa um arquivo .spec.ts e retorna:
 * - Todas as tags presentes no arquivo
 * - Os blocos `test.describe` e `test` com suas linhas de início/fim e tags herdadas
 */
function parseSpecFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);

  const fileLevelTags = new Set();
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    if (lines[i].trim().startsWith("//") && lines[i].includes("@")) {
      for (const tag of extractTagsFromText(lines[i])) {
        fileLevelTags.add(tag);
      }
    }
  }

  // Primeiro localiza blocos test.describe(...) e seu intervalo de linhas
  const describes = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*test\.describe\s*\(/.test(lines[i])) {
      const startLine = i + 1;
      let headerChunk = "";
      let k = i;
      while (k < lines.length && k < i + 8) {
        headerChunk += lines[k] + "\n";
        if (lines[k].includes("=>")) break;
        k++;
      }

      let depth = 0;
      let started = false;
      let endLine = lines.length;
      for (let m = i; m < lines.length; m++) {
        const delta = countBraces(lines[m]);
        if (delta > 0) started = true;
        depth += delta;
        if (started && depth <= 0) {
          endLine = m + 1;
          break;
        }
      }

      const titleMatch = headerChunk.match(/test\.describe\s*\(\s*(['"`])([\s\S]*?)\1/);
      const title = titleMatch ? titleMatch[2].replace(/\s+/g, " ").trim() : `describe L${startLine}`;
      const tags = extractTagsFromText(headerChunk);

      describes.push({
        title,
        startLine,
        endLine,
        tags,
      });
    }
  }

  // Localiza blocos test(...) individuais e herda as tags do test.describe que os envolve
  const tests = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*test\s*\(/.test(lines[i])) {
      const startLine = i + 1;
      let headerChunk = "";
      let k = i;
      while (k < lines.length && k < i + 10) {
        headerChunk += lines[k] + "\n";
        if (lines[k].includes("=>")) break;
        k++;
      }

      let depth = 0;
      let started = false;
      let endLine = lines.length;
      for (let m = i; m < lines.length; m++) {
        const delta = countBraces(lines[m]);
        if (delta > 0) started = true;
        depth += delta;
        if (started && depth <= 0) {
          endLine = m + 1;
          break;
        }
      }

      const titleMatch = headerChunk.match(/test\s*\(\s*(['"`])([\s\S]*?)\1/);
      const title = titleMatch ? titleMatch[2].replace(/\s+/g, " ").trim() : `Teste na linha ${startLine}`;

      const enclosingDescribes = describes.filter(
        (d) => startLine >= d.startLine && startLine <= d.endLine,
      );
      const inheritedTags = enclosingDescribes.flatMap((d) => d.tags);
      const ownTags = extractTagsFromText(headerChunk);

      const combinedTags = new Set([...fileLevelTags, ...inheritedTags, ...ownTags]);
      tests.push({
        title,
        startLine,
        endLine,
        tags: [...combinedTags],
      });
    }
  }

  const allFileTags = new Set([...fileLevelTags]);
  for (const d of describes) {
    for (const tag of d.tags) allFileTags.add(tag);
  }
  for (const t of tests) {
    for (const tag of t.tags) allFileTags.add(tag);
  }

  return {
    filePath,
    relativePath: path.relative(ROOT_DIR, filePath).replace(/\\/g, "/"),
    allTags: [...allFileTags],
    describes,
    tests,
  };
}

/**
 * Obtém os números das linhas alteradas no git diff de um arquivo específico
 * para identificar exatamente qual teste ou bloco foi modificado.
 */
function getChangedLineNumbers(relativeFilePath, stagedOnly) {
  try {
    const diffCmd = stagedOnly
      ? `git diff --cached -U0 -- "${relativeFilePath}"`
      : `git diff HEAD -U0 -- "${relativeFilePath}"`;
    const output = execSync(diffCmd, {
      cwd: ROOT_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const changedLines = new Set();
    const hunkRegex = /@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/g;
    let match;
    while ((match = hunkRegex.exec(output)) !== null) {
      const start = parseInt(match[1], 10);
      const count = match[2] !== undefined ? parseInt(match[2], 10) : 1;
      for (let l = start; l < start + Math.max(count, 1); l++) {
        changedLines.add(l);
      }
    }
    return [...changedLines];
  } catch {
    return [];
  }
}

/**
 * Obtém a lista de arquivos alterados no Git (staged no pre-commit ou modificados no workspace).
 */
function getChangedFiles(options) {
  if (options.files.length > 0) {
    return options.files.map((f) => f.replace(/\\/g, "/"));
  }

  try {
    const stagedOutput = execSync("git diff --cached --name-only --diff-filter=ACMR", {
      cwd: ROOT_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    if (stagedOutput) {
      return stagedOutput
        .split(/\r?\n/)
        .filter(Boolean)
        .map((f) => f.replace(/\\/g, "/"));
    }

    if (options.stagedOnly) {
      return [];
    }

    const unstagedOutput = execSync("git diff --name-only --diff-filter=ACMR", {
      cwd: ROOT_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    const untrackedOutput = execSync("git ls-files --others --exclude-standard", {
      cwd: ROOT_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();

    const combined = new Set([
      ...(unstagedOutput ? unstagedOutput.split(/\r?\n/) : []),
      ...(untrackedOutput ? untrackedOutput.split(/\r?\n/) : []),
    ]);

    return [...combined].filter(Boolean).map((f) => f.replace(/\\/g, "/"));
  } catch {
    return [];
  }
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
      const next = argv[i + 1];
      if (next) {
        options.files.push(
          ...next
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        );
        i++;
      }
    } else if (arg.startsWith("--files=")) {
      options.files.push(
        ...arg
          .slice("--files=".length)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    }
  }

  return options;
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

  const touchedGlobalConfig = changedFiles.some((file) =>
    /^(playwright\.config\.ts)$/.test(file),
  );

  const allSpecFiles = getAllSpecFiles(E2E_DIR).map(parseSpecFile);
  const triggeredTags = new Map(); // tag -> Set<motivo>
  const untaggedSpecFilesToRun = new Set();

  const addTriggeredTag = (tag, reason) => {
    if (!triggeredTags.has(tag)) {
      triggeredTags.set(tag, new Set());
    }
    triggeredTags.get(tag).add(reason);
  };

  for (const file of changedFiles) {
    const absPath = path.join(ROOT_DIR, file);

    // 1. Se o arquivo alterado for um teste E2E (.spec.ts)
    if (file.startsWith("e2e/") && file.endsWith(".spec.ts") && fs.existsSync(absPath)) {
      const parsed = parseSpecFile(absPath);
      const changedLines = getChangedLineNumbers(file, options.stagedOnly);

      let matchedTests = [];
      if (changedLines.length > 0 && parsed.tests.length > 0) {
        matchedTests = parsed.tests.filter((t) =>
          changedLines.some((line) => line >= t.startLine && line <= t.endLine),
        );
      }

      if (matchedTests.length > 0) {
        let foundTagInMatchedTests = false;
        for (const t of matchedTests) {
          for (const tag of t.tags) {
            foundTagInMatchedTests = true;
            addTriggeredTag(tag, `Alteração no teste "${t.title}" (${file})`);
          }
        }
        if (!foundTagInMatchedTests) {
          for (const tag of parsed.allTags) {
            foundTagInMatchedTests = true;
            addTriggeredTag(tag, `Alteração no arquivo de teste ${file}`);
          }
        }
        if (!foundTagInMatchedTests) {
          untaggedSpecFilesToRun.add(file);
        }
      } else if (parsed.allTags.length > 0) {
        for (const tag of parsed.allTags) {
          addTriggeredTag(tag, `Alteração no arquivo de teste ${file}`);
        }
      } else {
        untaggedSpecFilesToRun.add(file);
      }
      continue;
    }

    // 2. Se for um arquivo de código-fonte mapeado em SOURCE_TO_TAGS_MAP
    for (const mapping of SOURCE_TO_TAGS_MAP) {
      if (mapping.pattern.test(file)) {
        for (const tag of mapping.tags) {
          addTriggeredTag(tag, `Conexão de código: ${file} (${mapping.reason})`);
        }
      }
    }

    // 3. Suporte a comentários "// @tags: @..." em qualquer arquivo do repositório
    if (fs.existsSync(absPath) && /\.(ts|tsx|js|mjs)$/.test(file)) {
      const content = fs.readFileSync(absPath, "utf-8");
      const tagCommentMatch = content.match(/\/\/\s*@tags\s*:\s*([^\r\n]+)/i);
      if (tagCommentMatch) {
        for (const tag of extractTagsFromText(tagCommentMatch[1])) {
          addTriggeredTag(tag, `Anotação @tags explícita em ${file}`);
        }
      }
    }
  }

  // 4. Expande conexões equivalentes entre tags (TAG_CONNECTIONS)
  for (const [tag] of [...triggeredTags.entries()]) {
    const connected = TAG_CONNECTIONS[tag] ?? [];
    for (const relatedTag of connected) {
      addTriggeredTag(relatedTag, `Conexão equivalente com a tag ${tag}`);
    }
  }

  if (triggeredTags.size === 0 && untaggedSpecFilesToRun.size === 0 && !touchedGlobalConfig) {
    console.log(
      "\n✅ As alterações não afetam fluxos cobertos por tags E2E (ex.: documentação/config).",
    );
    console.log("⏩ Pulando execução dos testes E2E neste commit.\n");
    process.exit(0);
  }

  if (touchedGlobalConfig && triggeredTags.size === 0) {
    console.log("\n⚠️  Configuração global do Playwright alterada. Todos os testes serão executados.");
    for (const spec of allSpecFiles) {
      for (const tag of spec.allTags) {
        addTriggeredTag(tag, "Alteração em playwright.config.ts");
      }
    }
  }

  const activeTags = [...triggeredTags.keys()];

  if (activeTags.length > 0) {
    console.log("\n🏷️  Tags identificadas para execução:");
    for (const [tag, reasons] of triggeredTags.entries()) {
      console.log(`   • ${tag}`);
      for (const reason of reasons) {
        console.log(`      └─ ${reason}`);
      }
    }
  }

  // 5. Localiza todos os arquivos e testes da suíte que possuem qualquer uma das tags ativas
  const involvedSpecs = [];
  let totalTestsInSuite = 0;
  let totalInvolvedTests = 0;

  for (const spec of allSpecFiles) {
    totalTestsInSuite += spec.tests.length;
    const matchingTests = spec.tests.filter(
      (t) =>
        t.tags.some((tag) => activeTags.includes(tag)) ||
        untaggedSpecFilesToRun.has(spec.relativePath),
    );
    if (matchingTests.length > 0) {
      involvedSpecs.push({
        ...spec,
        matchingTests,
      });
      totalInvolvedTests += matchingTests.length;
    }
  }

  const skippedCount = totalTestsInSuite - totalInvolvedTests;
  console.log(
    `\n📊 Resumo: selecionados ${totalInvolvedTests} de ${totalTestsInSuite} blocos de teste (${skippedCount} fora do escopo foram poupados).`,
  );

  const targetFiles = involvedSpecs.map((s) => s.relativePath);
  const playwrightArgs = ["test", ...targetFiles];

  if (activeTags.length > 0 && untaggedSpecFilesToRun.size === 0) {
    const grepPattern = activeTags.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    playwrightArgs.push("--grep", grepPattern);
    console.log(
      `\n🚀 Comando: npx playwright test ${targetFiles.join(" ")} --grep "${grepPattern}"\n`,
    );
  } else {
    console.log(`\n🚀 Comando: npx playwright test ${targetFiles.join(" ")}\n`);
  }

  if (options.dryRun) {
    console.log("🧪 Modo --dry-run concluído com sucesso (execução real omitida).\n");
    process.exit(0);
  }

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

main();

