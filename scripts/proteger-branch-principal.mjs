/**
 * CONFIGURACAO PADRAO DA EMPRESA
 * Mantida pela equipe DevOps.
 * Nao alterar sem alinhamento.
 *
 * Script base: protege a branch principal (main ou master) no GitHub.
 * Referencia: INT-011 — Configurar protecao da branch main
 *
 * Uso:
 *   pnpm proteger-branch
 *   node scripts/proteger-branch-principal.mjs
 *
 * Dependencias (documentar na doc oficial / DevContainer):
 *   - Node.js (mesmo runtime da base)
 *   - pnpm
 *   - chalk (devDependency do package.json)
 *   - GitHub CLI (`gh`) instalado no PATH  ← dependencia EXTERNA (nao vem do npm)
 *   - `gh auth login` com escopos: repo, admin:repo_hook, workflow
 *   - Permissao de admin no repositorio
 *   - Plano GitHub que permita branch protection (repo publico, Pro ou Organization)
 *
 * Limitacao conhecida:
 *   - Repo privado em conta free: GitHub retorna 403 e nao aplica a protecao
 *
 * Evolucao futura:
 *   - Integrar ao fluxo de criacao de projeto / DevContainer
 *   - Garantir `gh` no DevContainer (apt/feature)
 *   - Parametrizar nome do status check por projeto
 */
import { execFileSync } from "node:child_process";
import chalk from "chalk";

/** Nome do job do workflow .github/workflows/validar-jira-key.yml */
const STATUS_CHECK_PADRAO = "Validar commits e PR";

/**
 * @param {string[]} args
 * @returns {string}
 */
function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" }).trim();
}

/**
 * @returns {{ owner: string, repo: string }}
 */
function obterOwnerRepo() {
  const url = execFileSync("git", ["remote", "get-url", "origin"], {
    encoding: "utf8",
  }).trim();

  // git@github.com:Owner/repo.git  |  https://github.com/Owner/repo.git
  const match = url.match(/github\.com[:/](?<owner>[^/]+)\/(?<repo>[^/.]+)(?:\.git)?$/i);
  if (!match?.groups) {
    throw new Error(`Nao foi possivel extrair owner/repo do remote origin: ${url}`);
  }

  return { owner: match.groups.owner, repo: match.groups.repo };
}

/**
 * Prefere main; se nao existir, usa master; senao a default do GitHub.
 * @param {string} owner
 * @param {string} repo
 * @returns {string}
 */
function obterBranchPrincipal(owner, repo) {
  const branches = gh(["api", `repos/${owner}/${repo}/branches`, "--jq", ".[].name"])
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);

  if (branches.includes("main")) {
    return "main";
  }
  if (branches.includes("master")) {
    return "master";
  }

  return gh(["api", `repos/${owner}/${repo}`, "--jq", ".default_branch"]);
}

/**
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {string} statusCheck
 */
function aplicarProtecao(owner, repo, branch, statusCheck) {
  const body = {
    required_status_checks: {
      strict: true,
      contexts: [statusCheck],
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      required_approving_review_count: 0,
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
    },
    restrictions: null,
    required_linear_history: false,
    allow_force_pushes: false,
    allow_deletions: false,
    block_creations: false,
    required_conversation_resolution: false,
  };

  execFileSync(
    "gh",
    [
      "api",
      "--method",
      "PUT",
      `repos/${owner}/${repo}/branches/${branch}/protection`,
      "--input",
      "-",
    ],
    {
      encoding: "utf8",
      input: JSON.stringify(body),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
}

function main() {
  console.log(chalk.blue("\n> Protegendo branch principal no GitHub...\n"));

  try {
    gh(["auth", "status"]);
  } catch {
    console.log(chalk.red("GitHub CLI nao autenticado."));
    console.log("Execute:");
    console.log(chalk.cyan("  gh auth login"));
    console.log("");
    console.log("Depois rode novamente:");
    console.log(chalk.cyan("  pnpm proteger-branch\n"));
    process.exit(1);
  }

  const { owner, repo } = obterOwnerRepo();
  const branch = obterBranchPrincipal(owner, repo);
  const statusCheck = process.env.STATUS_CHECK?.trim() || STATUS_CHECK_PADRAO;

  console.log(chalk.gray(`Repositorio: ${owner}/${repo}`));
  console.log(chalk.gray(`Branch:      ${branch}`));
  console.log(chalk.gray(`Check:       ${statusCheck}`));
  console.log("");

  try {
    aplicarProtecao(owner, repo, branch, statusCheck);
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    console.log(chalk.red("Falha ao aplicar protecao de branch."));
    console.log(chalk.red(detalhe));
    console.log("");

    if (/Upgrade to GitHub Pro or make this repository public/i.test(detalhe)) {
      console.log(chalk.yellow("Limitacao do GitHub (conta free + repo privado):"));
      console.log("- Branch protection / rulesets nao estao disponiveis.");
      console.log("- Opcoes: tornar o repositorio publico OU usar GitHub Pro/Organization.");
      console.log("- Em projetos da empresa (org/plano pago) este script deve funcionar.");
      console.log("");
      console.log("O script permanece na base para uso quando o repo permitir.");
      process.exit(1);
    }

    console.log(chalk.yellow("Possiveis causas:"));
    console.log("- Conta/plano sem branch protection (repo privado free, etc.)");
    console.log("- Token sem permissao admin no repositorio");
    console.log("- Nome do status check ainda nao existe (rode o workflow em um PR antes)");
    console.log("");
    console.log("Ajuste manual: GitHub → Settings → Branches → Add branch protection rule");
    process.exit(1);
  }

  console.log(chalk.green("Protecao aplicada com sucesso."));
  console.log("");
  console.log("Regras ativas:");
  console.log(chalk.cyan("  - Exige Pull Request (sem push direto)"));
  console.log(chalk.cyan(`  - Exige status check: ${statusCheck}`));
  console.log(chalk.cyan("  - Bloqueia force push e exclusao da branch"));
  console.log(chalk.cyan("  - Vale tambem para administradores (enforce_admins)"));
  console.log("");
  console.log(
    chalk.gray(
      "Nota: script base para evoluir com DevContainer / provisionamento de novos projetos.\n",
    ),
  );
}

main();
