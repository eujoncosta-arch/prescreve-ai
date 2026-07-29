# RM-55 — Relatório de Validação Independente

**Papel:** auditor independente, sem relação com o desenvolvimento do
sistema. Nenhuma afirmação do RM-54 (ou de qualquer RM anterior) foi
aceita como verdadeira antes de verificação direta no código-fonte e
reexecução de todos os gates nesta sessão, do zero, sem reaproveitar
nenhum número de relatório anterior.

## Resumo Executivo

O RM-54 afirma: 0 críticos, 0 altos, 0 médios, 0 baixos, 1.205 testes
verdes, lint zero, build zero, typecheck zero, veredito 🟢. Esta auditoria
**reconfirmou de forma independente todos os números de execução** (gates,
testes, builds) — eles são reais, não fabricados. Porém, a varredura
adversarial desta rodada, focada especificamente em achar o que o RM-54
não viu, **encontrou 1 risco MÉDIO genuíno que o RM-54 não reportou**:
metas de cobertura de teste configuradas especificamente para proteger os
motores clínicos mais críticos do sistema (`safety-rules.ts`,
`dose-calculator.ts`, `dosing-engine.ts`, `icu-engine.ts`,
`pediatric-engine.ts`, `clinical-risk-engine.ts`, `pharma-core/**`) **nunca
são executadas em nenhum gate automatizado** — nem no CI, nem no comando
de teste padrão — apesar de um comentário no próprio código afirmar que
são "gate de regressão, não meta aspiracional". Também foram encontrados
3 achados BAIXO/INFORMATIVO de higiene de repositório. Nenhum risco
CRÍTICO ou ALTO foi encontrado. Veredito: 🟡 **APROVADO COM RESSALVAS**.

## 1. Metodologia

Todos os números abaixo foram obtidos por execução direta nesta sessão:
`npx tsc --noEmit`, `npx eslint . --format json` (frontend e backend,
parseado programaticamente, não por inspeção visual), `npx vitest run`,
`npx jest`, `npm run test:e2e:postgres:local` (Postgres real via `prisma
dev`, sem Docker, servidor novo e migrations reais aplicadas do zero),
`npm run build` (frontend e backend). Em paralelo, foi feita varredura
direta de código por `grep`/leitura de arquivo para: `TODO`/`FIXME`,
`eslint-disable`, `@ts-ignore`/`@ts-expect-error`, `as any`/`: any`,
testes vazios/pulados (`.skip`, `xit`, `xdescribe`), configuração de
cobertura vs. o que o CI realmente executa, regras de `onDelete` no
schema Prisma, e a cadeia de verificação de ownership em
`consulta.service.ts`.

## 2. Matriz de Gates (reexecutados nesta sessão)

| Gate | Resultado | Evidência |
|---|---|---|
| Typecheck Frontend | ✅ 0 erros | `npx tsc --noEmit` |
| Lint Frontend | ✅ 0 erros / 0 warnings | `npx eslint . --format json`, contagem somada programaticamente |
| Vitest (Frontend) | ✅ 916/916, 48/48 arquivos | `npx vitest run` |
| Build Frontend (+ RM-23/24/49) | ✅ compilado, 50 páginas | `npm run build` |
| RM-23 (consistência de drogas) | ✅ 367 entidades, 0 inconsistências | saída do prebuild |
| RM-24 (cross-database) | ✅ divergentes=0, aceitos=14, críticos=0 | saída do prebuild |
| RM-49 (integridade textual) | ✅ 266 arquivos, 0 sequências suspeitas | saída do prebuild |
| Typecheck Backend | ✅ 0 erros | `npx tsc --noEmit` |
| Lint Backend | ✅ 0 erros | `npx eslint "{src,apps,libs,test}/**/*.ts"` (invocação real do CI, sem `--fix`) |
| Jest unitário (Backend) | ✅ 146/146, 15/15 suítes | `npx jest --silent` |
| E2E Backend contra Postgres real | ✅ 143/143, 11/11 suítes, 0 puladas | `npm run test:e2e:postgres:local`, servidor novo |
| Build Backend | ✅ compilado | `npm run build` |

**Todos os números do RM-54 foram reproduzidos de forma independente.**
Nenhuma divergência entre o que o RM-54 reportou e o que esta sessão
observou nos gates de execução.

## 3. Achados

### RM-55-01 — MÉDIO — Metas de cobertura de motores clínicos críticos configuradas mas nunca aplicadas por nenhum gate automatizado

- **Arquivo:** [frontend/vitest.config.ts:17-31](../frontend/vitest.config.ts)
- **Evidência:** o bloco `coverage.thresholds` define metas mínimas de
  cobertura especificamente para `src/lib/pharma-core/**`,
  `src/lib/safety-rules.ts`, `src/validation/**`,
  `src/lib/dose-calculator.ts`, `src/lib/dosing-engine.ts`,
  `src/lib/icu-engine.ts`, `src/lib/pediatric-engine.ts` e
  `src/lib/clinical-risk-engine.ts` — exatamente os motores que decidem
  dose, segurança e risco clínico. O comentário no próprio arquivo (linha
  21-25) afirma explicitamente: *"Valores fixados logo abaixo da
  cobertura real medida nesta rodada (gate de regressão, não meta
  aspiracional)"*.
- **O problema:** thresholds do Vitest só são avaliados quando a flag
  `--coverage` é passada. O comando `"test": "vitest run"` em
  [frontend/package.json:16](../frontend/package.json) **não** passa essa
  flag; o comando que passa é `"test:coverage": "vitest run --coverage"`
  ([frontend/package.json:18](../frontend/package.json)). Verificado
  diretamente em [.github/workflows/ci.yml](../.github/workflows/ci.yml):
  o job `frontend` executa `npm test` (linha do step "Unit tests
  (vitest)") — nunca `npm run test:coverage`. Não existe nenhum outro
  script (`prebuild`, hook de git, etc.) que invoque `test:coverage` — 
  confirmado por busca em todo o repositório (excluindo `node_modules`).
- **Impacto:** um desenvolvedor pode remover cobertura de testes de
  `safety-rules.ts` (ex.: deletar um teste de um dos 22 pares de
  `CRITICAL_PAIRS`) e **nenhum gate automatizado acusaria a regressão** —
  nem localmente (`npm test` não mede cobertura), nem no CI (mesmo
  comando). O mecanismo existe no papel, foi comentado como proteção
  deliberada contra regressão, mas está desconectado de qualquer execução
  real. Isso é exatamente o tipo de "proteção que não protege" que uma
  auditoria deve capturar — o código dá a impressão de estar guardado,
  mas o guarda nunca é chamado.
- **Classificação:** **MÉDIO** — não é um bug de comportamento clínico
  (a cobertura atual pode estar de fato acima das metas hoje), mas é uma
  falha real de processo de qualidade em um sistema de suporte à decisão
  clínica, silenciosa e não documentada como limitação em nenhum RM
  anterior.

### RM-55-02 — BAIXO — Três módulos de "relatório final" órfãos contêm achados desatualizados/falsos, apresentados como fato

- **Arquivos:** `frontend/src/lib/final-report-etapa14.ts`,
  `frontend/src/lib/final-report-etapa22-6e.ts`,
  `frontend/src/lib/final-report-etapa22-6e-v3.ts`
- **Evidência de que são código morto:** busca por
  `final-report-etapa14`/`final-report-etapa22-6e` em todo `src/` não
  retorna nenhum arquivo que os importe — não são renderizados em nenhuma
  página, não são chamados por nenhum script `package.json`, não são
  referenciados por nenhum teste.
- **Evidência de que o conteúdo é falso/desatualizado:**
  - `final-report-etapa14.ts:273-279` afirma que
    `lab-adapters/ache.ts` e `lab-adapters/ems.ts` contêm um comentário
    `// TODO: importar portfólio`. Leitura direta de ambos os arquivos
    (14-16 linhas cada) confirma que esse comentário **não existe** no
    código atual.
  - `final-report-etapa14.ts:222-231` afirma existir um
    `eslint-disable` para `no-require-imports` e uso de `require()` em
    `pharma-database.ts`. Busca direta no arquivo (`require(`,
    `eslint-disable`) retorna zero ocorrências.
  - `final-report-etapa14.ts:207-216` afirma "13 ocorrências de `as
    any` em módulos de produção". Busca em todo `frontend/src` e
    `backend/src` por `as any\b` encontra **zero** ocorrências em código
    de produção — as únicas 3 ocorrências do repositório inteiro (fora
    deste arquivo de relatório) estão em
    `backend/.../consulta.service.atomicidade-rm49.spec.ts`, um arquivo
    de teste, mockando dependências deliberadamente.
- **Impacto:** como os três arquivos são código morto (nunca executam,
  nunca renderizam, nunca são lidos por nenhum humano ou processo em
  produção), o impacto funcional é nulo. O risco é de **higiene/
  integridade de documentação-como-código**: se algum revisor humano
  encontrar esses arquivos e assumir que descrevem o estado atual (o
  próprio nome do arquivo — "final-report" — convida a esse erro), ele
  seria levado a crer que o sistema tem problemas que já não existem.
- **Classificação:** **BAIXO** (impacto real nulo por serem código
  morto; risco é de confusão futura, não de comportamento em produção).

### RM-55-03 — INFORMATIVO — Script `lint` local do backend usa `--fix`; CI usa uma invocação diferente, sem `--fix`

- **Arquivo:** [backend/package.json:17](../backend/package.json)
  (`"lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"`) vs.
  [.github/workflows/ci.yml](../.github/workflows/ci.yml) (step "Lint
  (bloqueante — sem --fix)": `npx eslint "{src,apps,libs,test}/**/*.ts"`).
- **Observação:** isto **não é um bug** — o CI de fato usa a invocação
  correta, bloqueante, sem `--fix`, e é ela que decide o resultado real
  do gate (confirmado nesta sessão: `npx eslint` sem `--fix` no backend
  retorna 0 erros). Mas o script `npm run lint` que um desenvolvedor
  roda localmente **muta arquivos-fonte silenciosamente** como efeito
  colateral de uma tarefa nomeada "lint" — um nome que sugere verificação,
  não escrita. Um desenvolvedor que rode `npm run lint` e depois `git
  add -A && git commit` sem revisar o diff pode commitar mudanças que não
  pretendia.
- **Classificação:** **INFORMATIVO** — divergência de nomenclatura entre
  script local e gate de CI real; sem impacto verificado nesta sessão
  (nenhuma mutação de arquivo ocorreu ao rodar `npm run lint` nesta
  auditoria — confirmado por timestamp de arquivo inalterado).

### RM-55-04 — INFORMATIVO — Suíte e2e do backend contra Postgres real reporta handle/timer não finalizado

- **Evidência:** a execução de `npm run test:e2e:postgres:local` nesta
  sessão (rodada 2 vezes, de forma independente) produziu, em ambas as
  vezes, a mensagem do Jest: *"A worker process has failed to exit
  gracefully and has been force exited. This is likely caused by tests
  leaking due to improper teardown. Try running with --detectOpenHandles
  to find leaks. Active timers can also cause this, ensure that .unref()
  was called on them."* — mesmo com todos os 143 testes passando.
- **Impacto:** não causa falha do gate (Jest força o encerramento e
  reporta sucesso dos testes), mas é evidência concreta e reproduzível de
  um recurso (timer ou handle) não limpo corretamente em algum ponto do
  bootstrap da aplicação Nest ou da suíte de teste — não foi investigada
  a fundo a origem exata nesta rodada (exigiria `--detectOpenHandles`,
  fora do escopo desta verificação específica).
- **Classificação:** **INFORMATIVO** — não bloqueia nenhum gate, mas é um
  sintoma real de teardown incompleto que merece investigação futura.

### RM-55-05 — INFORMATIVO — Diretório de worktree Git órfão dentro do repositório

- **Evidência:** existe `.claude/worktrees/laughing-herschel-4c4577/`
  contendo uma cópia completa de `frontend/node_modules` — artefato de
  ferramenta de agente de uma sessão anterior, não faz parte do código da
  aplicação.
- **Impacto:** confirmado que não afeta nenhum gate (não é varrido por
  lint/build/scripts do projeto, que operam a partir de `frontend/` e
  `backend/` na raiz). Apenas ocupa espaço em disco e polui buscas amplas
  no repositório.
- **Classificação:** **INFORMATIVO**.

## 4. Verificações que NÃO encontraram problema (confirmação independente, não aceitação do RM-54)

- **Ownership/IDOR em `consulta.service.ts`:** verificado diretamente
  (não apenas citado) que `criarPrescricao` checa `consulta.usuario_id`
  antes de qualquer escrita (linha 445-448) e, quando
  `dto.diagnostico_id` é enviado, verifica que o diagnóstico pertence à
  MESMA `consulta_id` já validada (linha 472-480) — a correção do
  achado histórico OWN-01 está de fato presente no código atual, não é
  apenas uma alegação de relatório.
- **Cascade delete (Prisma):** lido `schema.prisma` diretamente — 
  `Consulta`/`Diagnostico`/`Prescricao`/`RiskScore` usam `onDelete:
  Restrict` entre si (impedindo deleção de uma consulta com filhos), e
  `onDelete: Cascade` apenas na relação com `Usuario` (esperado para
  remoção de conta). Consistente com a alegação do RM-52/RM-54.
- **JWT secret hardening:** `getRequiredSecret` (testado em
  `jwt-secrets.util.spec.ts`) rejeita segredo vazio, curto, de baixa
  entropia e valores de exemplo/placeholder — confirmado por leitura dos
  testes e não apenas por contagem de "testes passando".
- **`as any` / `: any` em produção:** zero ocorrências em
  `frontend/src` e `backend/src` fora de arquivos de teste.
- **`@ts-ignore`/`@ts-expect-error`:** zero ocorrências em todo o
  repositório (fora de `node_modules`).
- **Testes pulados/vazios:** zero `it.skip`/`xit`/`xdescribe`/
  `it.todo` em código do projeto (as únicas ocorrências encontradas são
  em `node_modules`, irrelevantes).
- **Assertivas vazias (`expect(true).toBe(true)`):** zero ocorrências.

## 5. Regressões

Nenhuma regressão encontrada nesta rodada de validação independente. Os
1.205 testes automatizados (916 frontend + 146 unitários backend + 143
e2e contra Postgres real) passam de forma consistente em execuções
independentes desta sessão.

## 6. Reavaliação de Arquitetura

| Dimensão | Avaliação |
|---|---|
| Escalabilidade | Padrão de motor por especialidade (`pharma-database-*.ts`) e validador cross-database com sistema de aliases (`pharmaAliasKeys`) demonstram capacidade de absorver crescimento de catálogo sem redesenho |
| Manutenibilidade | Boa — comentários de contexto histórico (RM-XX) presentes nos pontos certos, mas o achado RM-55-02 mostra que documentação-como-código pode ficar desatualizada sem detecção automática |
| Acoplamento | Guarda de import (`RM-06`, `no-restricted-imports` no `eslint.config.mjs`) previne acoplamento direto a bases farmacológicas legadas fora da allowlist — mecanismo de arquitetura genuíno, verificado no arquivo de configuração |
| Coesão | Alta — separação clara entre motores de cálculo, camada de repositório (`pharma-core`), e camada de validação (`cross-database`, `data-integrity`) |
| SOLID/Clean Architecture | Backend segue padrão NestJS convencional (Controller → Service → Prisma); ownership e transação atômica centralizados em `escreverComAuditoriaAtomica`, um ponto único de responsabilidade para escrita+auditoria |

## 7. Capacidade de Expansão (100 doenças / 500 medicamentos / 50 protocolos / 30 calculadoras / 20 especialidades / 100k consultas / 50k prescrições / concorrência real)

O sistema suporta a expansão de **catálogo de dados** (medicamentos,
protocolos) sem redesenho — o gate RM-24 já demonstrou nesta sessão que
absorve 367 entidades de 5 fontes com alias-matching. A ressalva
encontrada nesta auditoria (RM-55-01) implica que, à medida que os
motores clínicos crescem em complexidade para suportar mais
especialidades, **a proteção de cobertura mínima que deveria acompanhar
esse crescimento não está de fato ativa** — um risco que se agrava, não
diminui, com a escala. Quanto a 100k consultas / 50k prescrições e
concorrência real: esta auditoria não teve acesso a um ambiente de carga
real para medir; a suíte e2e contra Postgres real cobre corretude
transacional em volume de teste (não volume de produção), então nenhuma
afirmação sobre performance em escala de produção pode ser feita com
evidência de código apenas.

## 8. Pontuação

| Dimensão | Nota |
|---|---|
| Arquitetura | 9 |
| Frontend | 9 |
| Backend | 9 |
| Persistência | 9 |
| Segurança | 8 |
| Farmacologia | 8 |
| Clínica | 8 |
| Performance | 7 |
| Testes | 7 *(rebaixado de 9 pelo RM-55-01 — cobertura configurada mas não aplicada)* |
| CI/CD | 7 |
| Governança | 7 *(rebaixado pelo RM-55-02 — documentação-como-código órfã e desatualizada)* |
| Escalabilidade | 8 |

**Nota final: 8,0/10**

## 9. Veredito Final

> ## 🟡 APROVADO COM RESSALVAS

**Justificativa:** todos os números de execução do RM-54 foram
reproduzidos de forma independente e são genuínos — não há evidência de
fabricação de resultado de gate, teste ou build. Nenhum risco CRÍTICO ou
ALTO foi encontrado nesta auditoria independente. Entretanto, esta rodada
encontrou **1 risco MÉDIO real e não reportado pelo RM-54** (RM-55-01:
gate de cobertura de motores clínicos críticos configurado mas nunca
executado por nenhuma automação) e **1 risco BAIXO** (RM-55-02: três
módulos de relatório órfãos com conteúdo desatualizado/falso). Pela
mesma regra que o RM-54 se auto-impôs — qualquer risco médio ou baixo
aberto impede o veredito máximo — o veredito correto para esta rodada
não é 🟢, mas também não é 🔴, pois nenhum crítico/alto existe, todos os
gates de execução são genuinamente verdes e nenhuma regressão foi
encontrada.

**Para virar 🟢 na próxima rodada:**
1. Adicionar `--coverage` ao gate de CI (ou criar um step dedicado
   `npm run test:coverage`) para que os thresholds de
   `vitest.config.ts` realmente bloqueiem regressão de cobertura nos
   motores clínicos críticos.
2. Remover os três arquivos `final-report-etapa14.ts`,
   `final-report-etapa22-6e.ts` e `final-report-etapa22-6e-v3.ts` (código
   morto com conteúdo já falso), ou movê-los para fora de `src/`
   (ex.: `docs/historico/`) com uma nota explícita de que são artefatos
   históricos, não relatórios vivos.
