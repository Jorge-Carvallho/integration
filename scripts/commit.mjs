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

/** Extrai a chave da branch (ex.: feature/SCRUM-1-descricao → SCRUM-1) */
const JIRA_KEY_NA_BRANCH = /[A-Z]{2,10}-[0-9]+/i;

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

  const respostas = await inquirer.prompt([
    { type: "list", name: "tipo", message: "Tipo da alteracao:", choices: TIPOS },
    {
      type: "input",
      name: "escopo",
      message: "Escopo (ex: checkout, auth):",
      validate: (v) => v.trim().length > 0 || "Informe o escopo da mudanca",
    },
    {
      type: "input",
      name: "descricao",
      message: "Descricao curta da mudanca:",
      validate: (v) => v.trim().length > 0 || "Informe a descricao da mudanca",
    },
    {
      type: "confirm",
      name: "breaking",
      message: "Essa mudanca quebra compatibilidade?",
      default: false,
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

  const prefixo = respostas.breaking ? `${respostas.tipo}!` : respostas.tipo;
  const mensagem = `${prefixo}(${respostas.escopo.trim()}): ${jira} ${respostas.descricao.trim()}`;

  console.log(chalk.yellow(`\nMensagem gerada: ${mensagem}`));

  try {
    execFileSync("git", ["commit", "-m", mensagem], { stdio: "inherit" });
  } catch {
    console.log(chalk.red("\nCommit cancelado: o Git nao conseguiu criar o commit."));
    console.log(chalk.yellow("Verifique se ainda existem arquivos em staging e tente de novo."));
    process.exit(1);
  }

  console.log(chalk.green(`\nCommit criado: ${mensagem}`));
}

main().catch((erro) => {
  console.log(chalk.red("\nCommit cancelado por um erro inesperado."));
  if (erro instanceof Error && erro.message) {
    console.log(chalk.red(erro.message));
  }
  process.exit(1);
});
