/** Extrai a chave da branch (ex.: feature/SCRUM-1-descricao → SCRUM-1) */
export const JIRA_KEY_NA_BRANCH = /[A-Z]{2,10}-[0-9]+/i;

/** Prefixos opcionais de branch (tipo/CHAVE-descricao). */
const PREFIXO_TIPO_BRANCH = /^(feat|fix|refactor|docs|test|chore|perf|build|ci)\//i;

/**
 * @param {string} branch
 * @returns {string | null}
 */
export function extrairJiraKeyDaBranch(branch) {
  const match = branch.match(JIRA_KEY_NA_BRANCH);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Titulo de PR no padrao do CI: CHAVE descricao legivel.
 * GitHub sugere "Scrum 3 ..." a partir da branch — este formato corrige para SCRUM-3.
 *
 * @param {string} jira
 * @param {string} branch
 * @returns {string}
 */
export function montarTituloPrSugerido(jira, branch) {
  const semTipo = branch.replace(PREFIXO_TIPO_BRANCH, "");
  const prefixoJira = new RegExp(`^${jira.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-?`, "i");
  let descricao = semTipo.replace(prefixoJira, "").replace(/^-+/, "");
  descricao = descricao.replace(/-/g, " ").trim();

  return descricao ? `${jira} ${descricao}` : jira;
}
