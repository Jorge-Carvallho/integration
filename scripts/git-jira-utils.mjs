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
 * Remove acentos para nomes/titulos mais seguros no GitHub/CI/DevContainer.
 * @param {string} texto
 * @returns {string}
 */
export function removerAcentos(texto) {
  return texto.normalize("NFD").replace(/\p{M}/gu, "");
}

/**
 * Titulo de PR no padrao do CI: CHAVE descricao legivel.
 * GitHub sugere "Scrum 3 ..." a partir da branch — este formato corrige para SCRUM-3.
 * Sempre usa a chave em MAIUSCULAS com hifen (ex.: SCRUM-3), que e o que o workflow exige.
 *
 * @param {string} jira
 * @param {string} branch
 * @returns {string}
 */
export function montarTituloPrSugerido(jira, branch) {
  const chave = jira.toUpperCase();
  const semTipo = branch.replace(PREFIXO_TIPO_BRANCH, "");
  const prefixoJira = new RegExp(`^${chave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-?`, "i");
  let descricao = semTipo.replace(prefixoJira, "").replace(/^-+/, "");
  descricao = removerAcentos(descricao).replace(/-/g, " ").replace(/\s+/g, " ").trim();

  return descricao ? `${chave} ${descricao}` : chave;
}
