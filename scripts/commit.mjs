/**
 * CONFIGURACAO PADRAO DA EMPRESA
 * Mantida pela equipe DevOps.
 * Nao alterar sem alinhamento.
 *
 * Script interativo: pnpm commit
 * Referencia: pnpm-commit-script-interativo-lint-typecheck.pdf
 */
import { execFileSync, execSync } from "node:child_process";
import inquirer from "inquirer";
import chalk from "chalk";

const TIPOS = ["feat", "fix", "refactor", "docs", "test", "chore", "perf", "build", "ci"];

/** Limite do header (commitlint header-max-length). */
const HEADER_MAX_LENGTH = 100;

/** Limite do escopo (parte entre parenteses no titulo). */
const ESCOPO_MAX_LENGTH = 30;

/** Limite por linha do corpo (commitlint body-max-line-length). */
const BODY_MAX_LINE_LENGTH = 100;

/** Extrai a chave da branch (ex.: feature/SCRUM-1-descricao → SCRUM-1) */
const JIRA_KEY_NA_BRANCH = /[A-Z]{2,10}-[0-9]+/i;

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
  const prefixo = breaking ? `${tipo}!` : tipo;
  return `${prefixo}(${escopo.trim()}): ${jira} ${descricao.trim()}`;
}

/**
 * Quebra o texto do corpo em linhas de no maximo maxLen caracteres.
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
        // Palavra isolada maior que o limite: corta mesmo assim
        if (palavra.length > maxLen) {
          for (let i = 0; i < palavra.length; i += maxLen) {
            linhas.push(palavra.slice(i, i + maxLen));
          }
          linhaAtual = "";
        } else {
          linhaAtual = palavra;
        }
        continue;
      }

      if (`${linhaAtual} ${palavra}`.length <= maxLen) {
        linhaAtual = `${linhaAtual} ${palavra}`;
      } else {
        linhas.push(linhaAtual);
        if (palavra.length > maxLen) {
          for (let i = 0; i < palavra.length; i += maxLen) {
            linhas.push(palavra.slice(i, i + maxLen));
          }
          linhaAtual = "";
        } else {
          linhaAtual = palavra;
        }
      }
    }

    if (linhaAtual) {
      linhas.push(linhaAtual);
    }
  }

  return linhas.join("\n");
}

/**
 * @returns {string}
 */
function obterBranchAtual() {
  return execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
}

/**
 * @param {string} branch
 * @returns {string | null}
 */
function extrairJiraKeyDaBranch(branch) {
  const match = branch.match(JIRA_KEY_NA_BRANCH);
  return match ? match[0].toUpperCase() : null;
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

  const respostas = await inquirer.prompt([
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
      type: "input",
      name: "detalhes",
      message: "Detalhes (opcional, Enter para pular):",
    },
    {
      type: "confirm",
      name: "breaking",
      message: "Essa mudanca quebra compatibilidade?",
      default: false,
    },
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
    console.log(chalk.yellow("Dica: rode 'pnpm typecheck' para ver os erros de tipagem."));
    process.exit(1);
  }

  const header = montarHeader(tipo, escopo, jira, respostas.descricao, respostas.breaking);
  const detalhesBrutos = respostas.detalhes.trim();
  const detalhes = detalhesBrutos ? quebrarLinhasDoCorpo(detalhesBrutos) : "";

  console.log(chalk.yellow(`\nMensagem gerada:\n${header}`));
  if (detalhes) {
    console.log(chalk.yellow(`\n${detalhes}`));
  }

  const commitArgs = ["commit", "-m", header];
  if (detalhes) {
    commitArgs.push("-m", detalhes);
  }

  try {
    execFileSync("git", commitArgs, { stdio: "inherit" });
  } catch {
    console.log(chalk.red("\nCommit cancelado: o Git nao conseguiu criar o commit."));
    console.log(chalk.yellow("Verifique se ainda existem arquivos em staging e tente de novo."));
    process.exit(1);
  }

  console.log(chalk.green(`\nCommit criado: ${header}`));

  if (respostas.push) {
    try {
      push();
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
