# RM-51 — Saneamento Total e Liberação Condicional: Relatório Final

## 1. Veredito

# 🔴 EXPANSÃO CLÍNICA NÃO AUTORIZADA

Dois motivos, cada um suficiente isoladamente para este veredito, por regra explícita do próprio RM-51:

1. **28 erros reais de lint no frontend permanecem** (reduzidos de 103 para 28 nesta rodada — 73% de
   redução real e verificada, não zero).
2. **O CI/CD nunca foi executado de ponta a ponta em um runner real.** Este ambiente de sandbox não tem
   acesso a um runner do GitHub Actions. O próprio RM-51 já antecipa este cenário e prescreve o resultado:
   *"Se não houver acesso ao runner: não declarar que o CI foi validado de ponta a ponta... manter a
   limitação aberta; declarar a expansão não autorizada."* Isso é seguido à risca aqui — nenhuma execução
   de CI é fabricada ou simulada como aprovada.

## 2. Matriz completa

| ID | Severidade inicial | Severidade final | Status | Causa-raiz | Arquivos | Testes | Evidência |
|---|---|---|---|---|---|---|---|
| RM41-012 | 🟠 alto | 🟠 alto | **NÃO CORRIGIDO** | Não investigado nesta rodada (todo o esforço foi direcionado ao lint, ver seção 3) | — | — | — |
| RM41-013 | 🟠 alto | 🟠 alto | **NÃO CORRIGIDO** | idem | — | — | — |
| RM41-022 | 🟠 alto | 🟠 alto | **NÃO CORRIGIDO** | idem (migração de enum já existia do RM-49; auditoria completa de contrato não feita) | — | — | — |
| RM41-023 | 🟠 alto | 🟠 alto | **NÃO CORRIGIDO** | idem | — | — | — |
| RM41-026 | 🟠 alto | 🟠 alto | **NÃO CORRIGIDO** | Sem Docker/Postgres neste sandbox (limitação de ambiente, não de código) — suíte `postgres-real.e2e-spec.ts` (RM-49) segue escrita, nunca executada | `backend/test/postgres-real.e2e-spec.ts` | 4 testes escritos, 0 executados | Guard de skip confirma ausência de `DATABASE_URL` |
| RM41-029 | 🟠 alto | 🟠 alto | **NÃO CORRIGIDO** | idem RM41-012 | — | — | — |
| RM41-036 / RM49-NEW-001 | 🟠 alto | 🟠 alto | **CORRIGIDO PARCIALMENTE** | ~103 erros reais de lint (`react-hooks`) nunca haviam sido bloqueados por ausência de CI. Corrigidos 75 de 103 (73%) por causa-raiz real (não supressão): componentes React definidos dentro de outros componentes (`react-hooks/static-components`), `useMemo` usado para efeito colateral em vez de `useEffect`, `useState`+`useEffect` de carregamento inicial substituídos por `useSyncExternalStore` (API oficial para sincronização com sistemas externos como `localStorage`), padrão de reset de formulário via `key` de remontagem em vez de efeito | `frontend/src/app/comparador/page.tsx`, `frontend/src/app/timeline/page.tsx`, `frontend/src/lib/timeline.ts`, + 9 arquivos de correções pontuais (entidades HTML não escapadas, `prefer-const`) | 849/849 testes frontend continuam passando; verificação visual em navegador real para `/comparador` e `/timeline` (criar evento, ver lista atualizar) | `npx eslint .`: 103→28 erros |
| RM41-005 | 🟠 alto | — | **FECHADO** (RM-50) | — | — | — | Reconfirmado, sem regressão |
| RM41-027/028/031/032/033 | 🔴/🟠 | — | **FECHADOS** (RM-50) | — | — | — | Reconfirmado, sem regressão |
| RM41-011/016/017/025 | 🔴 crítico | — | **FECHADOS** (RM-49) | — | — | — | Reconfirmado, sem regressão |
| RM41-001–004/020/021 | 🔴/🟠 | — | **FECHADOS** (RM-46/48) | — | — | — | Reconfirmado, sem regressão |
| RM41-006–010, 014, 015, 018, 019, 024, 034, 035 | 🟡/🟢 | 🟡/🟢 | **NÃO REVISITADOS** | Nenhum esforço desta rodada foi direcionado a estes 11 itens | — | — | — |
| RM41-030 | 🟡 moderado | 🟡 moderado | **NÃO CORRIGIDO** (parcial desde RM-50: testado, não unificado) | 3 implementações paralelas de CrCl seguem existindo | — | — | Testes de consistência já existentes (RM-50) |
| RM50-NEW-001 | 🔴 crítico (achado no RM-50) | — | **FECHADO** (RM-50, mesma sessão) | — | — | — | Reconfirmado |

## 3. Correções realizadas

Toda a correção real desta rodada foi direcionada à eliminação do lint do frontend (RM41-036/RM49-NEW-001),
por ser o único item da lista de riscos abertos que era genuinamente tratável com segurança e verificação
completa nesta sessão (os demais itens altos — RM41-012/013/022/023/029 — exigem investigação e mudança de
arquitetura que não couberam no tempo desta rodada sem risco de correção apressada; RM41-026 depende de
infraestrutura ausente neste sandbox).

**Causa-raiz por classe de erro corrigida:**

1. **`react-hooks/static-components` (37 erros, 100% corrigidos):** `MolCard` e `Row`, em
   `comparador/page.tsx`, eram definidos DENTRO do corpo de outros componentes — React tratava isso como um
   tipo de componente novo a cada render, forçando desmontagem/remontagem completa da subárvore. Movidos
   para escopo de módulo, recebendo como prop o único dado que vinha do closure (`scoreMap`). Verificado
   visualmente no navegador: os dois modos de visualização (Cards e Tabela) renderizam idênticos ao
   comportamento anterior.
2. **`react-hooks/set-state-in-render` (16 erros, 100% corrigidos):** em `timeline/page.tsx`, um `useMemo`
   era usado para disparar 8 chamadas de `setState` (reset de formulário) — um antipadrão que o próprio
   React classifica como potencial loop infinito. Corrigido com `useEffect` real e, na correção final,
   substituído pelo padrão oficial de "reset de estado ao trocar prop" (`key` de remontagem +
   inicializadores preguiçosos de `useState`), eliminando o efeito por completo.
3. **`react-hooks/set-state-in-effect` (parcial — 1 de 23 corrigido, o mais concentrado):** em
   `lib/timeline.ts`, o hook `useTimeline()` carregava dados do `localStorage` via `useEffect` chamando
   `setState` diretamente — o antipadrão exato que a regra aponta. Reescrito com `useSyncExternalStore`, a
   API oficial do React para sincronizar com sistemas externos (a própria mensagem de erro da regra cita
   esse hook como a solução recomendada). Resultado: zero `useEffect` no hook, hidratação SSR-safe
   preservada (servidor usa `getServerSnapshot` = array vazio; cliente sincroniza com o valor real do
   localStorage sem efeito manual). Verificado em navegador: os 9 eventos seed carregam corretamente, um
   novo evento foi criado com sucesso e apareceu na lista, sem erros no console.
4. **`react/no-unescaped-entities` (17 erros, 100% corrigidos):** aspas e apóstrofos literais em texto JSX
   substituídos por `&quot;`/`&apos;` — mudança puramente textual, sem risco.
5. **`prefer-const` (3 erros, 100% corrigidos):** variáveis `let` nunca reatribuídas, confirmado por leitura
   do escopo completo antes de cada mudança.
6. **`react/jsx-no-comment-textnodes` (1 erro, corrigido):** texto que parecia comentário JS dentro de JSX
   envolvido em chaves, conforme a própria sugestão da regra.

**Não corrigidos nesta rodada (22 `react-hooks/set-state-in-effect` restantes, 2 `immutability`, 2 `refs`, 1
`purity`, 1 `error-boundaries`):** espalhados por ~20 arquivos, muitos envolvendo sincronização legítima com
sistemas externos reais (ex.: `theme.tsx` lê `matchMedia`/`localStorage` E manipula `document.documentElement.classList`
diretamente — uma mistura de leitura de estado E mutação de DOM que exigiria uma reformulação mais profunda,
possivelmente com script inline anti-flash, para eliminar completamente sem risco). Corrigir os 22 restantes
em bloco, sem verificação individual em navegador real por arquivo, seria exatamente o tipo de "correção às
cegas" que o próprio RM-51 proíbe.

## 4. Lint

```text
Backend  — antes: 0   | depois: 0
Frontend — antes: 103 | depois: 28
```

## 5. CI/CD

- Workflow: `.github/workflows/ci.yml` (criado no RM-49, revisado nesta rodada — sem alterações necessárias).
- Jobs: `frontend` (typecheck/lint/test/build) e `backend` (typecheck/lint/`prisma migrate deploy`/unit/e2e/build),
  com serviço `postgres:16` real.
- **Execução real: NÃO REALIZADA.** Este ambiente não tem acesso a um runner do GitHub Actions.
- Status: não pode ser declarado "aprovado" — permanece como limitação aberta, conforme a própria regra do RM-51.
- Ambiente: sandbox local, sem Docker/Postgres/runner de CI disponíveis (mesma limitação documentada desde o RM-47).

## 6. Gates

```text
Frontend:
- arquivos de teste: 43
- testes aprovados: 849
- testes falhos: 0
- testes pulados: 0
- lint: 28 erros (293 avisos, não bloqueantes)
- typecheck: limpo
- build: sucesso (RM-22/RM-23/RM-24/integridade textual todos verdes)

Backend:
- testes unitários: 144 aprovados, 0 falhos
- testes E2E: 135 aprovados, 0 falhos, 4 pulados (suíte Postgres real — sem infraestrutura)
- lint: 0 erros
- typecheck: limpo
- build: sucesso
```

## 7. Novos achados

Nenhum novo achado nesta rodada (RM-51 focou em fechar achados já conhecidos, não em nova varredura).

## 8. Riscos restantes

```text
ID: RM41-012
Severidade: alto
Descrição: evidência ausente aceita ATC como fonte clínica
Motivo: não investigado nesta rodada — esforço concentrado no lint
Impacto: recomendação pode aparecer como validada sem fonte clínica real
Evidência: nenhuma mudança de código; achado reconfirmado do RM-41
```
```text
ID: RM41-013
Severidade: alto
Descrição: provenance com epoch-placeholder não sinalizado
Motivo: idem acima
Impacto: dado de proveniência pode ser interpretado como data real
Evidência: nenhuma mudança de código
```
```text
ID: RM41-022
Severidade: alto
Descrição: contrato de enum do risk score sem auditoria completa (DTO↔Prisma↔frontend↔resposta)
Motivo: migração de enum já feita no RM-49; auditoria de contrato completa não realizada
Impacto: incompatibilidade de contrato pode surgir quando a persistência de risco for exercitada em produção real
Evidência: nenhuma mudança de código nesta rodada
```
```text
ID: RM41-023
Severidade: alto
Descrição: diagnóstico/risco clínico calculados no frontend nem sempre persistidos no fluxo real de backend
Motivo: não investigado nesta rodada
Impacto: dado clínico pode não estar disponível para recuperação futura
Evidência: nenhuma mudança de código
```
```text
ID: RM41-026
Severidade: alto
Descrição: suíte E2E contra Postgres real nunca executada com sucesso
Motivo: ambiente de sandbox sem Docker/Postgres/runner de CI
Impacto: comportamento de constraints/transações reais do Postgres segue não verificado por execução real
Evidência: test/postgres-real.e2e-spec.ts existe, guard de skip confirma ausência de DATABASE_URL
```
```text
ID: RM41-029
Severidade: alto
Descrição: fronteiras de idade pediátrica (28/29/59/60/89/90 dias) sem teste direto e específico
Motivo: não investigado nesta rodada
Impacto: transição entre faixas etárias pediátricas pode ter comportamento não testado numa fronteira específica
Evidência: nenhuma mudança de código
```
```text
ID: RM41-036 / RM49-NEW-001
Severidade: alto
Descrição: dívida de lint do frontend
Motivo: 22 erros react-hooks/set-state-in-effect + 2 immutability + 2 refs + 1 purity + 1 error-boundaries
        restantes envolvem, em vários casos, sincronização legítima com sistemas externos reais (DOM,
        matchMedia) que exigem mudança de arquitetura maior para eliminar com segurança, não uma correção
        mecânica de 5 minutos por arquivo
Impacto: job "frontend" do CI falhará até este número chegar a zero
Evidência: npx eslint . — 28 erros reais, listados por regra e arquivo nesta sessão
```
```text
ID: CI/CD — execução real
Severidade: alto (bloqueador formal do critério de aprovação)
Descrição: workflow criado e revisado, nunca executado em runner real
Motivo: sem acesso a GitHub Actions neste ambiente de sandbox
Impacto: nenhuma garantia real de que o pipeline, como escrito, de fato passa ponta a ponta
Evidência: .github/workflows/ci.yml existe; nenhum log de execução real pode ser produzido
```
```text
ID: RM41-030
Severidade: moderado
Descrição: 3 implementações paralelas de cálculo de CrCl (unidades divergentes: mg/dL × µmol/L)
Motivo: comportamento testado e confirmado consistente (RM-50), mas duplicação em si não unificada
Impacto: manutenção futura precisa lembrar de atualizar as 3 implementações em conjunto
Evidência: crcl-direct-rm50.test.ts prova consistência numérica entre as 3
```
```text
ID: RM41-006 a 010, 014, 015, 018, 019, 024, 034, 035
Severidade: moderado/baixo
Descrição: 11 itens do inventário original do RM-41 nunca revisitados desde então
Motivo: nenhuma rodada (RM-48 a RM-51) alocou tempo a eles
Impacto: desconhecido — não foram sequer reconfirmados como ainda existentes ou não
Evidência: nenhuma
```

## 9. Decisão

A expansão clínica não é autorizada porque:

1. O próprio RM-51 define, em texto explícito, que a ausência de execução real de CI resulta em veredito
   negativo — e este ambiente genuinamente não tem acesso a um runner do GitHub Actions. Não há como
   satisfazer este critério a partir daqui, honestamente, sem fabricar uma execução que não ocorreu.
2. 28 erros reais de lint no frontend permanecem (eram 103; 73% foram corrigidos por causa-raiz real e
   verificados em navegador, não suprimidos).
3. 6 riscos altos (RM41-012, 013, 022, 023, 026, 029) e 12 riscos moderados/baixos (RM41-006–010, 014, 015,
   018, 019, 024, 030, 034, 035) seguem sem correção — nenhum deles foi tocado nesta rodada.

O progresso real desta sessão — 75 erros de lint corrigidos por causa-raiz e verificados visualmente, zero
regressão em 849+144+135 testes — é genuíno e mensurável, mas não constitui o saneamento total de 100% que
o RM-51 exige para autorizar 🟢. Fingir o contrário seria exatamente a "declaração de sucesso antecipada"
que a seção 2 deste RM proíbe.

## Próximos passos

1. **RM-52** — Concluir a remediação de lint (22 `set-state-in-effect` restantes + 6 outros), priorizando
   os casos com mistura de estado React e mutação de DOM real (ex.: `theme.tsx`), com verificação visual
   individual por arquivo.
2. **RM-53** — Fechar RM41-012, 013, 022 (auditoria completa), 023, 029.
3. **RM-54** — Primeira execução real do CI/CD num ambiente com acesso a runner do GitHub Actions —
   condição que só pode ser satisfeita fora deste sandbox.
4. **RM-55** — Revisão individual dos 11 itens moderados/baixos nunca revisitados e decisão sobre unificar
   as 3 implementações de CrCl (RM41-030).
5. Reexecutar a auditoria de saneamento total somente após RM-52 a RM-55, e apenas em um ambiente onde a
   execução real do CI possa ser comprovada.

---

**RISCOS CRÍTICOS ABERTOS: 0**
**RISCOS ALTOS ABERTOS: 7** (RM41-012, 013, 022, 023, 026, 029, 036/RM49-NEW-001) **+ execução real de CI pendente**
**RISCOS MODERADOS/BAIXOS ABERTOS: 12**
**ERROS DE LINT: 28 (frontend) / 0 (backend)**

**DECISÃO: 🔴 EXPANSÃO CLÍNICA NÃO AUTORIZADA**
