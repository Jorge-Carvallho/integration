# Entendimento das Ferramentas do Pipeline DevOps

## Por que a aplicação foi desenvolvida em JavaScript (Node.js)?

A escolha pelo **JavaScript (Node.js)** não aconteceu porque outras linguagens, como Python, não seriam capazes de fazer o mesmo trabalho. O principal motivo é que as ferramentas utilizadas no pipeline já fazem parte do ecossistema Node.js.

Ferramentas como **Husky**, **Commitlint**, **Lint-Staged**, **ESLint**, **Prettier**, **npm** e **pnpm** já executam naturalmente sobre o Node. Dessa forma, não é necessário instalar e manter outra linguagem apenas para executar scripts de automação.

Se fosse utilizado Python, seria preciso que todos os desenvolvedores também tivessem o Python instalado, além de gerenciar versões, bibliotecas e possíveis dependências adicionais. Utilizando JavaScript, todo o pipeline permanece integrado ao mesmo ambiente de execução, reduzindo a complexidade e a manutenção.

---

# Husky

O **Husky** é uma biblioteca do **Node.js** que integra os **Git Hooks** ao projeto.

Os Git Hooks são eventos executados automaticamente pelo Git, como por exemplo:

- Antes de um commit (`pre-commit`);
- Durante a validação da mensagem do commit (`commit-msg`);
- Antes de um push (`pre-push`);
- Após um merge, entre outros.

O Husky não faz nenhuma validação sozinho. Sua função é apenas **escutar esses eventos** e executar o script correspondente.

Exemplo do fluxo:

```text
git commit
      │
      ▼
Husky detecta o evento
      │
      ▼
Executa o arquivo .husky/commit-msg
      │
      ▼
As validações são realizadas
      │
      ▼
Commit aprovado ou rejeitado
```

Em outras palavras, o Husky funciona como um "porteiro": quando ocorre um evento do Git, ele chama as ferramentas responsáveis pelas verificações.

---

# Commitlint

O **Commitlint** é responsável por validar a mensagem do commit.

Ele verifica se a mensagem segue o padrão definido pela empresa, como por exemplo:

- presença da chave da Issue do Jira;
- formato obrigatório da mensagem;
- convenções estabelecidas pelo projeto.

Caso a mensagem esteja fora do padrão, o commit é bloqueado.

O fluxo é simples:

```text
Husky chama
        ↓
Commitlint verifica
        ↓
Commit aprovado ou rejeitado
```

---

# package.json

O **package.json** é o painel de controle do projeto.

Ele informa:

- quais dependências o projeto utiliza;
- quais ferramentas fazem parte da aplicação;
- quais comandos (scripts) podem ser executados.

Exemplo:

```json
"scripts": {
  "commit": "node scripts/commit.mjs",
  "prepare": "husky"
}
```

Quando um comando como `pnpm commit` é executado, é o `package.json` que informa qual script deverá ser chamado.

---

# commit.mjs

O **commit.mjs** é um script personalizado desenvolvido pela empresa.

Nele ficam as regras específicas do processo de commit, como por exemplo:

- validar informações adicionais;
- verificar padrões internos;
- montar mensagens automaticamente;
- realizar outras validações definidas pela equipe.

Diferente do Husky e do Commitlint, esse arquivo é totalmente customizável e pode conter qualquer lógica necessária ao projeto.

---

# Lint-Staged

O **Lint-Staged** executa verificações **somente nos arquivos que foram modificados**.

Essa abordagem existe porque seria muito lento analisar todo o projeto a cada commit.

Exemplo:

Se apenas dois arquivos foram alterados:

```text
src/login.ts
src/button.ts
```

O Lint-Staged executará as verificações apenas nesses arquivos.

Isso torna o processo muito mais rápido durante o desenvolvimento.

É importante destacar que essa é apenas uma validação inicial. Futuramente, no pipeline de integração contínua (CI), serão executadas verificações mais completas, como build, testes e outras ferramentas que ainda serão desenvolvidas e integradas ao projeto.

---

# GitHub Actions (.github/workflows/*.yml)

Os arquivos **YAML** localizados em:

```text
.github/workflows/
```

executam a validação novamente após o código ser enviado ao GitHub (`git push`).

Essa etapa garante que as regras sejam verificadas também no servidor, evitando que um commit inválido seja aceito caso alguma validação local tenha sido ignorada.

Além da validação de commits, futuramente esses workflows poderão executar:

- build da aplicação;
- testes automatizados;
- análise de qualidade;
- deploy;
- outras etapas do pipeline DevOps.

---

# Papel de cada ferramenta

| Ferramenta                        | Função                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------- |
| **package.json**                  | Diz quais comandos existem e quais ferramentas o projeto utiliza.                 |
| **commit.mjs**                    | Executa a lógica personalizada criada pela empresa para o processo de commit.     |
| **proteger-branch-principal.mjs** | Aplica proteção da branch principal (`main`/`master`) via GitHub CLI (`gh`).      |
| **.husky/commit-msg**             | Informa ao Git que, durante um commit, uma validação deve ser executada.          |
| **commitlint.config.js**          | Define as regras que o Commitlint utilizará para validar a mensagem do commit.    |
| **lint-staged**                   | Executa verificações apenas nos arquivos modificados, tornando o processo rápido. |
| **.github/workflows/\*.yml**      | Executa novamente as validações no GitHub e faz parte do pipeline de CI.          |
| **GitHub CLI (`gh`)**             | Dependência externa para `pnpm proteger-branch` (não vem do `package.json`).      |

---

# Fluxo completo

```text
Desenvolvedor escreve código
            │
            ▼
git commit
            │
            ▼
Husky detecta o evento
            │
            ▼
Executa .husky/commit-msg
            │
            ▼
Commitlint valida a mensagem
            │
            ▼
Lint-Staged verifica apenas os arquivos alterados
            │
            ▼
commit.mjs executa regras personalizadas
            │
            ▼
Commit criado
            │
            ▼
git push
            │
            ▼
GitHub Actions (.yml)
            │
            ▼
Validação completa do pipeline (CI)
```

# Resumo

O pipeline foi desenvolvido utilizando o ecossistema Node.js porque todas as ferramentas necessárias já fazem parte desse ambiente, evitando dependências adicionais.

Cada ferramenta possui uma responsabilidade específica:

- **Husky** intercepta os eventos do Git.
- **Commitlint** valida a mensagem do commit.
- **Lint-Staged** verifica apenas os arquivos alterados.
- **commit.mjs** executa regras personalizadas da empresa.
- **package.json** organiza dependências e comandos.
- **GitHub Actions** realiza novamente todas as validações no servidor, garantindo que apenas código dentro dos padrões seja aceito.

---

# Dependências da base (para documentação e DevContainer)

Usar esta lista ao escrever a documentação oficial e ao montar o DevContainer.

## Runtime / ferramentas de sistema

| Dependência           | Para quê                                                    | Obrigatória?                                         |
| --------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| **Node.js** (LTS)     | Rodar scripts (`pnpm commit`, typecheck, etc.)              | Sim                                                  |
| **pnpm**              | Instalar pacotes e executar scripts do `package.json`       | Sim                                                  |
| **Git**               | Branch, commit, push                                        | Sim                                                  |
| **GitHub CLI (`gh`)** | Script `pnpm proteger-branch` (proteção de `main`/`master`) | Só para quem for aplicar proteção de branch (DevOps) |

> Atenção: `gh` **não** é dependência npm. Precisa estar instalado no sistema (ou no DevContainer) e autenticado (`gh auth login`).

## Dependências npm (`package.json` / `devDependencies`)

| Pacote                                                | Para quê                                                |
| ----------------------------------------------------- | ------------------------------------------------------- |
| `husky`                                               | Hooks Git (pre-commit, commit-msg)                      |
| `lint-staged`                                         | Lint/format só nos arquivos do commit                   |
| `@commitlint/cli` + `@commitlint/config-conventional` | Validar mensagem de commit                              |
| `inquirer` + `chalk`                                  | Script interativo `pnpm commit` (e mensagens coloridas) |
| `eslint` + `prettier`                                 | Qualidade e formatação                                  |
| `typescript` + `@types/node`                          | Typecheck (`pnpm typecheck`)                            |

## Comandos da base

| Comando                | Script                                  |
| ---------------------- | --------------------------------------- |
| `pnpm commit`          | `scripts/commit.mjs`                    |
| `pnpm proteger-branch` | `scripts/proteger-branch-principal.mjs` |
| `pnpm typecheck`       | `tsc --noEmit`                          |

## Notas para o DevContainer (futuro)

- Incluir Node + pnpm + Git no container.
- Incluir `gh` se o ambiente DevOps for aplicar proteção de branch de dentro do container.
- Documentar `gh auth login` (token/escopos: `repo`, `admin:repo_hook`, `workflow`).
- Branch protection exige plano GitHub adequado (repo público, Pro ou Organization). Repo privado em conta free retorna 403.
