# Integration — Template padrão de commits (GitHub + Jira)

Documentação para **novos desenvolvedores**.

Este repositório é o **template padrão da empresa** para:

- padronizar commits e branches;
- exigir chave do Jira em cada commit;
- validar qualidade localmente (lint, format, typecheck);
- validar de novo no GitHub Actions (CI).

Specs oficiais (PDFs):

- [`docs/integracao-github-jira-validacao-de-commits.pdf`](docs/integracao-github-jira-validacao-de-commits.pdf)
- [`docs/pnpm-commit-script-interativo-lint-typecheck.pdf`](docs/pnpm-commit-script-interativo-lint-typecheck.pdf)

Explicação das ferramentas:

- [`docs/ENTENDIMENTO.md`](docs/ENTENDIMENTO.md)

---

## Começar rápido

```bash
git clone <url-do-repo>
cd integration
pnpm install
```

Requisitos: **Node.js**, **pnpm** e **Git**.

Comandos úteis:

| Comando          | O que faz                                  |
| ---------------- | ------------------------------------------ |
| `pnpm commit`    | Fluxo guiado de commit (padrão da empresa) |
| `pnpm lint`      | ESLint no projeto                          |
| `pnpm typecheck` | Checagem de tipos TypeScript               |
| `pnpm format`    | Prettier no projeto                        |

**Não use** `git commit -m "..."` no dia a dia. Use `pnpm commit`.

---

## Fluxo Jira

A tarefa **sempre começa no Jira**.

1. Crie (ou pegue) uma **issue** no Jira.
2. Anote a **chave** (ex.: `SCRUM-3`, `INT-013`).
3. Só depois crie a branch e os commits com essa chave.

Sem a chave, o GitHub for Jira **não vincula** branch/commit/PR à issue (fica “órfão” no board).

```text
Issue no Jira (SCRUM-3)
        │
        ▼
Branch com a chave
        │
        ▼
Commits com a chave
        │
        ▼
Pull Request com a chave
        │
        ▼
Painel Development da issue mostra tudo
```

### Smart Commits (opcional)

Na mensagem de commit, dá para comentar, apontar tempo ou fechar a issue:

```text
SCRUM-3 #comment ajuste feito #time 1h #close
```

---

## Fluxo Git (branches)

Padrão de branch:

```text
tipo/CHAVE-descricao-curta
```

Exemplos:

```text
feature/SCRUM-3-documentar-fluxo
fix/INT-013-corrigir-readme
chore/SCRUM-1-ajustar-deps
```

Regras práticas:

1. Issue no Jira **antes** da branch.
2. A chave da issue **deve aparecer** no nome da branch.
3. Trabalhe na branch da tarefa (não diretamente em `main`).
4. Abra Pull Request para `main`.
5. O CI valida commits e título do PR.

---

## Fluxo Commit (`pnpm commit`)

### Passo a passo

```bash
# 1) Altere os arquivos
# 2) Adicione ao staging (pode ser um ou vários)
git add <arquivo>
# ou
git add .

# 3) Commit guiado
pnpm commit
```

O script:

1. Confere se há arquivos em staging.
2. **Detecta a chave do Jira pela branch** (não digita na mão).
3. Pergunta: tipo, escopo, descrição, breaking change.
4. Roda lint-staged + typecheck.
5. Cria o commit no formato:

```text
tipo(escopo): CHAVE descricao
```

Exemplo:

```text
docs(docs): SCRUM-3 documentar fluxo tecnico para onboarding
```

### O que roda por baixo

```text
pnpm commit
    │
    ├─ staging? (senão, mensagem amigável e para)
    ├─ chave da branch? (senão, cancela)
    ├─ perguntas
    ├─ lint-staged (eslint + prettier nos arquivos staged)
    ├─ typecheck (tsc --noEmit)
    └─ git commit
           │
           ├─ Husky pre-commit  → lint-staged
           └─ Husky commit-msg  → commitlint (+ Jira key)
```

### Formato da mensagem

| Parte      | Exemplo                         | Obrigatório         |
| ---------- | ------------------------------- | ------------------- |
| tipo       | `feat`, `fix`, `docs`, `chore`… | sim                 |
| escopo     | `docs`, `setup`, `ci`           | sim                 |
| chave Jira | `SCRUM-3`                       | sim (vem da branch) |
| descrição  | texto curto                     | sim                 |

---

## CI — GitHub Actions

Arquivo: `.github/workflows/validar-jira-key.yml`

Em todo Pull Request para `main`, o CI valida:

- título do PR com chave Jira;
- mensagens de commit do PR com chave Jira.

Se falhar, o check fica vermelho (e pode bloquear o merge se a branch protection estiver ativa).

---

## Troubleshooting

### `Nenhum arquivo foi adicionado ao commit`

Você rodou `pnpm commit` sem `git add`.

```bash
git add <arquivo>
pnpm commit
```

### Branch sem chave do Jira

O script cancela se a branch não tiver algo como `SCRUM-3`.

Renomeie ou crie de novo:

```bash
git checkout -b feature/SCRUM-3-minha-tarefa
```

### Digitei a chave errada no passado (`SCRUN-1` em vez de `SCRUM-1`)

Hoje a chave **não é digitada**: vem da branch.  
Se um commit antigo ficou com typo, corrija a mensagem (amend/rebase) **antes do push**, ou faça um novo commit correto e alinhe com o time.

### Commitlint / mensagem rejeitada

A mensagem precisa seguir Conventional Commits **e** conter a Jira key.  
Use sempre `pnpm commit` para montar no formato certo.

### Lint ou typecheck falhou

Corrija os erros mostrados no terminal e rode de novo:

```bash
pnpm typecheck
pnpm lint
pnpm commit
```

### PR sem chave no título

O GitHub Actions falha. Coloque a chave no título, ex.:

```text
docs(docs): SCRUM-3 documentar fluxo tecnico
```

### Nada aparece no Jira (Development)

Verifique:

1. Issue existe e a chave está certa.
2. Branch / commit / PR usam essa chave.
3. App **GitHub for Jira** está instalado e o repo `integration` conectado.
4. Aguarde alguns minutos para sincronizar.

### `git commit` direto vs `pnpm commit`

`git commit -m` ainda passa pelos hooks Husky, mas **não** monta a mensagem guiada nem roda typecheck do script.  
Padrão da empresa: **`pnpm commit`**.

---

## Estrutura principal do projeto

```text
integration/
├── package.json                 # scripts e lint-staged
├── scripts/commit.mjs           # pnpm commit
├── commitlint.config.js         # regras da mensagem
├── .husky/                      # hooks locais
├── .github/workflows/           # CI
├── docs/                        # PDFs + ENTENDIMENTO.md
└── README.md                    # este arquivo
```

---

## Resumo para o dia a dia

1. Crie a issue no Jira e anote a chave.
2. Crie a branch `tipo/CHAVE-descricao`.
3. Altere o código → `git add` → `pnpm commit`.
4. Push → abra o PR com a chave no título.
5. Confira o CI e o painel Development da issue no Jira.
