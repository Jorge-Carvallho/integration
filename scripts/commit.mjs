import { execFileSync, execSync } from "node:child_process";
import inquirer from "inquirer";
import chalk from "chalk";

const TIPOS = ["feat", "fix", "refactor", "docs", "test", "chore", "perf", "build", "ci"];
const JIRA_KEY_REGEX = /^[A-Z]{2,10}-[0-9]+$/;

/**
 * @param {string} comando
 * @param {string} descricao
 */
function run(comando, descricao) {
  console.log(chalk.blue(`\n> ${descricao}...`));
  execSync(comando, { stdio: "inherit" });
}

async function main() {
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
      name: "jira",
      message: "Chave da issue do Jira (ex: INT-001):",
      validate: (v) => JIRA_KEY_REGEX.test(v) || "Formato invalido, use algo como INT-001",
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
      chalk.red("\nCommit cancelado: corrija os erros acima e rode 'pnpm commit' de novo."),
    );
    process.exit(1);
  }

  const prefixo = respostas.breaking ? `${respostas.tipo}!` : respostas.tipo;
  const mensagem = `${prefixo}(${respostas.escopo.trim()}): ${respostas.jira} ${respostas.descricao.trim()}`;

  console.log(chalk.yellow(`\nMensagem gerada: ${mensagem}`));
  execFileSync("git", ["commit", "-m", mensagem], { stdio: "inherit" });
  console.log(chalk.green(`\nCommit criado: ${mensagem}`));
}

main();
