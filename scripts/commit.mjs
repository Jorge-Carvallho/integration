/**
 * CONFIGURACAO PADRAO DA EMPRESA
 * Mantida pela equipe DevOps.
 * Nao alterar sem alinhamento.
 *
 * Script interativo: pnpm commit
 * Referencia: pnpm-commit-script-interativo-lint-typecheck.pdf
 */
import { execFileSync, execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import inquirer from "inquirer";
import chalk from "chalk";
import { extrairJiraKeyDaBranch, montarTituloPrSugerido } from "./git-jira-utils.mjs";

/** Branch principal usada no link de abertura de PR (fallback: main). */
const BRANCH_PRINCIPAL_PADRAO = "main";

const TIPOS = ["feat", "fix", "refactor", "docs", "test", "chore", "perf", "build", "ci"];

/** Limite do header (commitlint header-max-length). */
const HEADER_MAX_LENGTH = 100;

/** Limite do escopo (parte entre parenteses no titulo). */
const ESCOPO_MAX_LENGTH = 30;

/** Limite por linha do corpo (commitlint body-max-line-length). */
const BODY_MAX_LINE_LENGTH = 100;

/**
 * Garante um editor utilizavel para o campo de detalhes (DevContainer / local).
 * Respeita VISUAL/EDITOR se ja existirem.
 */
function garantirEditorParaDetalhes() {
  if (process.env.VISUAL || process.env.EDITOR) {
    return;
  }

  for (const candidato of ["nano", "vi"]) {
    try {
      execFileSync("sh", ["-c", `command -v ${candidato}`], { stdio: "ignore" });
      process.env.EDITOR = candidato;
      return;
    } catch {
      // tenta o proximo
    }
  }

  process.env.EDITOR = "vi";
}

/**
 * Valida o escopo informado pelo desenvolvedor.
 * @param {string} valor
 * @returns {true | string}
 */
function validarEscopo(valor) {
  const escopo = (valor ?? "").trim();

  if (!escopo) {
    return "Informe o escopo da mudanca";
  }

  if (escopo.length > ESCOPO_MAX_LENGTH) {
    return [
      `Escopo passou do tamanho permitido (${escopo.length}/${ESCOPO_MAX_LENGTH} caracteres).`,
      "Diminua o escopo e informe novamente (ex: docs, setup, ci).",
    ].join(" ");
  }

  return true;
}

/**
 * Monta a linha de titulo do commit (header).
 * @param {string} tipo
 * @param {string} escopo
 * @param {string} jira
 * @param {string} descricao
 * @param {boolean} [breaking]
 * @returns {string}
 */
function montarHeader(tipo, escopo, jira, descricao, breaking = false) {
  const escopoLimpo = escopo.trim();
  const base = `${tipo}(${escopoLimpo})`;
  const prefixo = breaking ? `${base}!` : base;
  return `${prefixo}: ${jira} ${descricao.trim()}`;
}

/**
 * Quebra o texto do corpo em linhas de no maximo maxLen caracteres,
 * preferindo espacos (nao corta palavra no meio).
 * @param {string} texto
 * @param {number} [maxLen]
 * @returns {string}
 */
function quebrarLinhasDoCorpo(texto, maxLen = BODY_MAX_LINE_LENGTH) {
  const paragrafos = texto.trim().split(/\n+/);
  /** @type {string[]} */
  const linhas = [];

  for (const paragrafo of paragrafos) {
    const palavras = paragrafo.trim().split(/\s+/).filter(Boolean);
    if (palavras.length === 0) {
      continue;
    }

    let linhaAtual = "";
    for (const palavra of palavras) {
      if (!linhaAtual) {
        linhaAtual = palavra;
        continue;
      }

      if (`${linhaAtual} ${palavra}`.length <= maxLen) {
        linhaAtual = `${linhaAtual} ${palavra}`;
      } else {
        linhas.push(linhaAtual);
        linhaAtual = palavra;
      }
    }

    if (linhaAtual) {
      linhas.push(linhaAtual);
    }
  }

  return linhas.join("\n");
}

/**
 * Garante que nenhuma "palavra" do corpo estoure o limite por linha do commitlint.
 * @param {string} valor
 * @returns {true | string}
 */
function validarDetalhes(valor) {
  const texto = (valor ?? "").trim();
  if (!texto) {
    return true;
  }

  const palavrasLongas = texto.split(/\s+/).filter((p) => p.length > BODY_MAX_LINE_LENGTH);
  if (palavrasLongas.length > 0) {
    return [
      `Uma sequencia sem espacos passou de ${BODY_MAX_LINE_LENGTH} caracteres.`,
      "Separe o texto com espacos (nao cole um bloco continuo).",
      "Assim a quebra de linha nao corta no meio e o commitlint aceita.",
    ].join(" ");
  }

  return true;
}

/**
 * @returns {string}
 */
function obterBranchAtual() {
  return execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
}

/**
 * @param {string} branch
 * @returns {never}
 */
function abortarSemJiraNaBranch(branch) {
  console.log(chalk.red("\nCommit cancelado."));
  console.log("A branch atual nao possui uma chave do Jira:");
  console.log(chalk.cyan(`  ${branch || "(sem nome)"}`));
  console.log("");
  console.log("Crie ou renomeie a branch seguindo o padrao:");
  console.log(chalk.cyan("  feature/SCRUM-1-integrar-github-jira"));
  console.log(chalk.cyan("  fix/INT-010-corrigir-validacao\n"));
  process.exit(1);
}

/**
 * @returns {boolean}
 */
function temArquivosEmStaging() {
  const saida = execFileSync("git", ["diff", "--cached", "--name-only"], {
    encoding: "utf8",
  }).trim();
  return saida.length > 0;
}

/**
 * @returns {never}
 */
function abortarSemStaging() {
  console.log(chalk.red("\nNenhum arquivo foi adicionado ao commit.\n"));
  console.log("Execute:");
  console.log(chalk.cyan("  git add ."));
  console.log("");
  console.log("ou adicione apenas os arquivos desejados:");
  console.log(chalk.cyan("  git add <arquivo>"));
  console.log("");
  console.log("Depois execute novamente:");
  console.log(chalk.cyan("  pnpm commit\n"));
  process.exit(1);
}

/**
 * @param {string} comando
 * @param {string} descricao
 */
function run(comando, descricao) {
  console.log(chalk.blue(`\n> ${descricao}...`));
  execSync(comando, { stdio: "inherit" });
}

function temUpstream() {
  try {
    execFileSync("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * URL base do Jira definida pelo DevOps ao provisionar o projeto.
 * @returns {string | null}
 */
function obterJiraBaseUrl() {
  try {
    const config = JSON.parse(readFileSync(join(process.cwd(), "config", "jira.json"), "utf8"));
    const base = config.baseUrl?.trim().replace(/\/+$/, "");
    return base || null;
  } catch {
    return null;
  }
}

/**
 * @returns {string}
 */
function obterRemoteOrigin() {
  return execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
}

/**
 * @param {string} remote
 * @returns {string | null}
 */
function parseGithubRepoWebUrl(remote) {
  const ssh = remote.match(/^git@github\.com:(.+?)(?:\.git)?$/i);
  if (ssh) {
    return `https://github.com/${ssh[1].replace(/\.git$/i, "")}`;
  }

  const https = remote.match(/^https?:\/\/github\.com\/(.+?)(?:\.git)?$/i);
  if (https) {
    return `https://github.com/${https[1].replace(/\.git$/i, "")}`;
  }

  return null;
}

/**
 * @returns {string}
 */
function obterBranchPrincipal() {
  try {
    const ref = execFileSync("git", ["symbolic-ref", "refs/remotes/origin/HEAD"], {
      encoding: "utf8",
    }).trim();
    const segmentos = ref.split("/");
    return segmentos[segmentos.length - 1] || BRANCH_PRINCIPAL_PADRAO;
  } catch {
    return BRANCH_PRINCIPAL_PADRAO;
  }
}

/**
 * @param {string} jira
 * @returns {string | null}
 */
function obterUrlIssueJira(jira) {
  const base = obterJiraBaseUrl();
  if (!base) {
    return null;
  }
  return `${base}/browse/${jira}`;
}

/**
 * @param {string} jira
 * @param {string} branch
 */
function mostrarLinksAposPush(jira, branch) {
  const tituloPr = montarTituloPrSugerido(jira, branch);

  console.log(chalk.cyan("\nLinks uteis (clique para abrir no navegador):"));

  const urlIssue = obterUrlIssueJira(jira);
  console.log(chalk.gray("\nIssue no Jira:"));
  if (urlIssue) {
    console.log(urlIssue);
  } else {
    console.log(chalk.yellow(`${jira} (sem link — configure config/jira.json)`));
    console.log(chalk.gray('  Exemplo: { "baseUrl": "https://sua-empresa.atlassian.net" }'));
  }

  try {
    const repo = parseGithubRepoWebUrl(obterRemoteOrigin());
    if (!repo) {
      console.log(chalk.gray("\nBranch no GitHub: remote origin nao e GitHub — link omitido."));
      return;
    }

    const branchCodificada = encodeURIComponent(branch);
    const base = obterBranchPrincipal();
    const baseCodificada = encodeURIComponent(base);
    const tituloCodificado = encodeURIComponent(tituloPr);

    console.log(chalk.gray("\nBranch no GitHub:"));
    console.log(`${repo}/tree/${branchCodificada}`);

    console.log(chalk.gray("\nAbrir Pull Request (titulo padrao ja preenchido):"));
    console.log(
      `${repo}/compare/${baseCodificada}...${branchCodificada}?expand=1&title=${tituloCodificado}`,
    );
  } catch {
    console.log(chalk.gray("\nBranch no GitHub: nao foi possivel montar o link."));
  }
}

function push() {
  console.log(chalk.blue("\n> Enviando commit para o remoto (git push)..."));
  if (temUpstream()) {
    execFileSync("git", ["push"], { stdio: "inherit" });
  } else {
    execFileSync("git", ["push", "-u", "origin", "HEAD"], { stdio: "inherit" });
  }
  console.log(chalk.green("\nPush concluido."));
}

async function main() {
  if (!temArquivosEmStaging()) {
    abortarSemStaging();
  }

  const branch = obterBranchAtual();
  const jira = extrairJiraKeyDaBranch(branch);

  if (!jira) {
    abortarSemJiraNaBranch(branch);
  }

  console.log(chalk.green(`\nChave detectada na branch: ${jira}`));
  console.log(chalk.gray(`Branch: ${branch}`));

  const { tipo, escopo } = await inquirer.prompt([
    { type: "list", name: "tipo", message: "Tipo da alteracao:", choices: TIPOS },
    {
      type: "input",
      name: "escopo",
      message: `Escopo (ex: checkout, auth, max ${ESCOPO_MAX_LENGTH} caracteres):`,
      validate: validarEscopo,
      /** @param {string} v */
      filter: (v) => (v ?? "").trim(),
    },
  ]);

  const { descricao, comDetalhes } = await inquirer.prompt([
    {
      type: "input",
      name: "descricao",
      message: "Descricao curta da mudanca (titulo):",
      validate: (v) => {
        const desc = v.trim();
        if (!desc) {
          return "Informe a descricao da mudanca";
        }
        // Pior caso (breaking) para nao estourar depois do confirm
        const header = montarHeader(tipo, escopo, jira, desc, true);
        if (header.length > HEADER_MAX_LENGTH) {
          return [
            `Muitos caracteres: o titulo ficaria com ${header.length} (maximo ${HEADER_MAX_LENGTH}).`,
            "Encurte a descricao sem sair deste passo.",
          ].join(" ");
        }
        return true;
      },
    },
    {
      type: "confirm",
      name: "comDetalhes",
      message: "Adicionar detalhes (corpo do commit)?",
      default: false,
    },
  ]);

  /** @type {string} */
  let detalhesInformados = "";
  if (comDetalhes) {
    garantirEditorParaDetalhes();
    let editarNovamente = true;

    while (editarNovamente) {
      console.log(
        chalk.gray("\nAbrindo editor para os detalhes. Escreva a vontade (varias linhas)."),
      );
      console.log(
        chalk.gray("Salve e feche o editor para continuar (nano: Ctrl+O, Enter, Ctrl+X).\n"),
      );

      const { detalhes } = await inquirer.prompt([
        {
          type: "editor",
          name: "detalhes",
          message: "Detalhes do commit",
          // Reabre com o texto atual, para nao perder o que ja digitou
          default: detalhesInformados,
          validate: validarDetalhes,
        },
      ]);
      detalhesInformados = (detalhes ?? "").trim();

      if (detalhesInformados) {
        console.log(chalk.cyan("\nDetalhes capturados:"));
        console.log(chalk.gray(detalhesInformados));
        console.log("");
      } else {
        console.log(chalk.yellow("\nNenhum detalhe informado (editor vazio).\n"));
      }

      const { acaoDetalhes } = await inquirer.prompt([
        {
          type: "list",
          name: "acaoDetalhes",
          message: "Os detalhes acima estao corretos?",
          choices: [
            { name: "Sim, pode seguir o commit", value: "continuar" },
            { name: "Nao, quero alterar o texto (abrir o editor de novo)", value: "editar" },
            { name: "Apagar os detalhes e seguir sem eles", value: "remover" },
          ],
        },
      ]);

      if (acaoDetalhes === "editar") {
        editarNovamente = true;
        continue;
      }

      if (acaoDetalhes === "remover") {
        detalhesInformados = "";
      }

      editarNovamente = false;
    }
  }

  console.log("");
  console.log(
    chalk.gray(
      "Breaking change = muda algo que ja existia e obriga outros a ajustar (ex.: removeu endpoint, mudou contrato da API).",
    ),
  );
  console.log(
    chalk.gray("Na duvida, responda No. Isso nao quebra a automacao — so marca o commit.\n"),
  );

  const { breaking } = await inquirer.prompt([
    {
      type: "confirm",
      name: "breaking",
      message: "Essa mudanca QUEBRA compatibilidade com o que ja existe?",
      default: false,
    },
  ]);

  /** @type {string} */
  let motivoBreaking = "";
  if (breaking) {
    const { motivo } = await inquirer.prompt([
      {
        type: "input",
        name: "motivo",
        message: "Descreva o que quebra (ex.: endpoint /v1/login removido; use /v2/auth):",
        validate: (v) => {
          const texto = (v ?? "").trim();
          if (!texto) {
            return "Informe o motivo da quebra de compatibilidade";
          }
          if (texto.length < 10) {
            return "Seja um pouco mais especifico (minimo ~10 caracteres)";
          }
          return true;
        },
        /** @param {string} v */
        filter: (v) => (v ?? "").trim(),
      },
    ]);
    motivoBreaking = motivo;
  }

  const { push: fazerPush } = await inquirer.prompt([
    {
      type: "confirm",
      name: "push",
      message: "Fazer push apos o commit?",
      default: true,
    },
  ]);

  try {
    run("pnpm lint-staged", "Rodando lint e formatacao nos arquivos alterados");
    run("pnpm typecheck", "Verificando tipos com o TypeScript");
  } catch {
    console.log(
      chalk.red(
        "\nCommit cancelado: lint ou typecheck falhou. Corrija os erros e rode 'pnpm commit' de novo.",
      ),
    );
    if (!temArquivosEmStaging()) {
      console.log(
        chalk.yellow(
          "Dica: nao ha arquivos em staging. O Prettier pode ter desfeito so mudanca de espaco em branco.",
        ),
      );
      console.log(chalk.yellow("Faca uma alteracao real, rode 'git add' e tente de novo."));
    } else {
      console.log(chalk.yellow("Dica: rode 'pnpm typecheck' para ver os erros de tipagem."));
    }
    process.exit(1);
  }

  const header = montarHeader(tipo, escopo, jira, descricao, breaking);
  /** @type {string[]} */
  const partesCorpo = [];
  if (detalhesInformados) {
    partesCorpo.push(quebrarLinhasDoCorpo(detalhesInformados));
  }
  if (motivoBreaking) {
    partesCorpo.push(quebrarLinhasDoCorpo(`BREAKING CHANGE: ${motivoBreaking}`));
  }
  const corpo = partesCorpo.join("\n\n");

  console.log(chalk.yellow(`\nMensagem gerada:\n${header}`));
  if (corpo) {
    console.log(chalk.yellow(`\n${corpo}`));
  }

  const commitArgs = ["commit", "-m", header];
  if (corpo) {
    commitArgs.push("-m", corpo);
  }

  try {
    execFileSync("git", commitArgs, { stdio: "inherit" });
  } catch {
    console.log(chalk.red("\nCommit cancelado: o Git nao conseguiu criar o commit."));
    console.log(chalk.yellow("Verifique se ainda existem arquivos em staging e tente de novo."));
    process.exit(1);
  }

  console.log(chalk.green(`\nCommit criado: ${header}`));

  if (fazerPush) {
    try {
      push();
      mostrarLinksAposPush(jira, branch);
    } catch {
      console.log(
        chalk.red(
          "\nCommit criado, mas o push falhou. Corrija o erro acima e rode 'git push' manualmente.",
        ),
      );
      process.exit(1);
    }
  } else {
    console.log(chalk.yellow("\nPush pulado. Quando quiser enviar: git push"));
  }
}

main().catch((erro) => {
  // Ctrl+C durante o questionario nao e erro: apenas encerra o fluxo
  if (erro instanceof Error && erro.name === "ExitPromptError") {
    console.log(chalk.yellow("\nCommit cancelado pelo usuario. Nenhum commit foi criado."));
    process.exit(1);
  }

  console.log(chalk.red("\nCommit cancelado por um erro inesperado."));
  if (erro instanceof Error && erro.message) {
    console.log(chalk.red(erro.message));
  }
  process.exit(1);
});
