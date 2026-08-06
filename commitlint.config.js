/**
 * CONFIGURACAO PADRAO DA EMPRESA
 * Mantida pela equipe DevOps.
 * Nao alterar sem alinhamento.
 *
 * Valida Conventional Commits + chave da issue do Jira.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 100],
    "scope-max-length": [2, "always", 30],
    "subject-case": [0],
    "jira-key-presente": [2, "always"],
  },
  plugins: [
    {
      rules: {
        "jira-key-presente": (parsed) => {
          // Mesma regra do PDF: PREFIXO (2-10 letras) + hifen + numero
          const regex = /[A-Z]{2,10}-[0-9]+/;
          const ok = regex.test(parsed.raw ?? "");
          return [
            ok,
            [
              "Commit rejeitado: a mensagem precisa conter uma chave valida do Jira.",
              "Formato esperado: PREFIXO-NUMERO (ex: INT-001, MBX-123).",
              "Exemplo valido: feat(setup): INT-006 implementar validacao da jira key",
            ].join(" "),
          ];
        },
      },
    },
  ],
};
