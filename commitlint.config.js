export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 100],
    "subject-case": [0],
    "jira-key-presente": [2, "always"],
  },
  plugins: [
    {
      rules: {
        "jira-key-presente": (parsed) => {
          const regex = /[A-Z]{2,10}-[0-9]+/;
          return [
            regex.test(parsed.raw),
            "A mensagem de commit precisa conter uma chave do Jira, ex: INT-001",
          ];
        },
      },
    },
  ],
};
