/**
 * CONFIGURACAO PADRAO DA EMPRESA
 * Cria ou corrige o titulo do Pull Request no padrao do CI (CHAVE + descricao).
 *
 * Uso: pnpm pr
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import { extrairJiraKeyDaBranch, montarTituloPrSugerido } from "./git-jira-utils.mjs";

/**
 * @returns {string}
 */
function obterBranchAtual() {
  return execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
}

/**
 * @returns {boolean}
 */
function ghDisponivel() {
  try {
    execFileSync("gh", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * So considera PR aberto. PR fechado nao bloqueia criacao de um novo.
 * @returns {boolean}
 */
function pullRequestAbertoDaBranchAtualExiste() {
  try {
    const state = execFileSync("gh", ["pr", "view", "--json", "state", "--jq", ".state"], {
      encoding: "utf8",
    }).trim();
    return state === "OPEN";
  } catch {
    return false;
  }
}

/**
 * Cria PR novo ou corrige titulo se o GitHub montou errado (ex.: "Scrum 3" em vez de SCRUM-3).
 * @param {string} [branchParam]
 * @returns {{ titulo: string, acao: "criado" | "atualizado" | "ignorado" }}
 */
export function sincronizarPullRequest(branchParam) {
  const branch = branchParam ?? obterBranchAtual();
  const jira = extrairJiraKeyDaBranch(branch);

  if (!jira) {
    console.log(chalk.red("\nBranch sem chave do Jira — PR nao sincronizado."));
    console.log(chalk.cyan("  Exemplo: feature/SCRUM-3-organizacao-da-documentacao\n"));
    return { titulo: "", acao: "ignorado" };
  }

  if (!ghDisponivel()) {
    console.log(chalk.yellow("\nGitHub CLI (gh) nao encontrado — titulo do PR nao foi ajustado."));
    console.log(chalk.gray("  Instale: https://cli.github.com/"));
    console.log(chalk.gray(`  Titulo sugerido: ${montarTituloPrSugerido(jira, branch)}\n`));
    return { titulo: montarTituloPrSugerido(jira, branch), acao: "ignorado" };
  }

  const titulo = montarTituloPrSugerido(jira, branch);

  if (/[^\x00-\x7F]/.test(branch)) {
    console.log(
      chalk.yellow(
        "\nAviso: a branch tem acentos/caracteres especiais. Prefira ASCII no padrao da empresa:",
      ),
    );
    console.log(chalk.cyan("  docs/SCRUM-3-organizacao-da-documentacao\n"));
  }

  if (pullRequestAbertoDaBranchAtualExiste()) {
    execFileSync("gh", ["pr", "edit", "--title", titulo], { stdio: "inherit" });
    console.log(chalk.green(`\nTitulo do PR atualizado: ${titulo}`));
    return { titulo, acao: "atualizado" };
  }

  execFileSync("gh", ["pr", "create", "--base", "main", "--title", titulo, "--body", ""], {
    stdio: "inherit",
  });
  console.log(chalk.green(`\nPull Request criado: ${titulo}`));
  return { titulo, acao: "criado" };
}

function main() {
  sincronizarPullRequest();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
