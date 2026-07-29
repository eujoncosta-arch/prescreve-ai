# RM-52 — Relatório Definitivo de Remediação

## 1. Escopo e metodologia

Sequência seguida: INVENTÁRIO → REPRODUÇÃO → CAUSA-RAIZ → CORREÇÃO → TESTE
DIRETO → REGRESSÃO → VALIDAÇÃO FINAL, sobre o estado herdado da RM-51 (0
críticos, 7 altos, 12 moderados/baixos abertos, 28→25 erros de lint frontend).

Nenhuma expansão de conteúdo clínico (doenças, protocolos, medicações,
recomendações, especialidades, calculadoras, regras farmacológicas) foi feita
ou autorizada nesta rodada — todas as alterações são de correção de
comportamento, correção de dados de cadastro (ex.: vínculo ANVISA) ou
qualidade de código (lint/testes).

## 2. Riscos ALTOS — resultado

| ID | Resultado |
|---|---|
| RM41-012 | **CORRIGIDO E VERIFICADO** |
| RM41-013 | **CORRIGIDO E VERIFICADO** |
| RM41-022 | **CORRIGIDO E VERIFICADO** |
| RM41-036 (lint) | **CORRIGIDO E VERIFICADO** |
| RM41-023 | **NÃO CORRIGIDO** — gap estrutural de persistência de risco/diagnóstico; requer refatoração do motor de sync central, fora do apetite de risco desta rodada |
| RM41-026 | **NÃO CORRIGIDO** — sandbox sem Docker/Postgres; suíte e2e roda só contra `fake-prisma` |
| RM41-029 | **NÃO CORRIGIDO** — distinto do corte de neonato já corrigido em RM41-007; não recebeu auditoria dedicada nesta rodada |

Detalhe completo em [`RM-52-OPEN-RISK-WORKING-MATRIX.md`](RM-52-OPEN-RISK-WORKING-MATRIX.md).

## 3. Riscos MODERADOS/BAIXOS — resultado

10 de 11 itens identificados: **CORRIGIDO E VERIFICADO** (RM41-006, 007, 008,
009, 010, 014, 015, 018/019, 034, 035). 1 item: **NÃO REPRODUZIDO COM
EVIDÊNCIA** (RM41-024 — guarda `IS_DEMO_MODE` já impede o efeito colateral
descrito). Detalhe completo na mesma matriz.

## 4. Lint do frontend (RM41-036)

Estado inicial: 25 erros `react-hooks/*`. Estado final: **0 erros**
(`npx eslint .` → `0 errors, 252 warnings` — os warnings são
`@typescript-eslint/no-unused-vars` pré-existentes, fora do escopo desta
rodada). Tabela completa arquivo-por-arquivo em
[`RM-52-FRONTEND-LINT-REMEDIATION.md`](RM-52-FRONTEND-LINT-REMEDIATION.md).

## 5. Achados novos descobertos durante a correção

Dois bugs reais, pré-existentes, foram descobertos como efeito colateral da
correção do lint e da validação em navegador — nenhum foi inventado, ambos
confirmados no código-fonte e corrigidos:

1. `getServerSnapshot` não memoizado em `protocols.ts`/`digital-twin/page.tsx`
   (retornava array literal novo a cada chamada — React acusa risco de loop).
2. Colisão de IDs em `scientific-update-engine.ts` (`genId()` só com
   `Date.now()`, sem componente de unicidade dentro do mesmo milissegundo),
   causando chaves React duplicadas na lista de alertas científicos.

## 6. Gates — números reais desta execução

### Frontend
```
npx eslint .        → 0 errors, 252 warnings
npx tsc --noEmit     → limpo, 0 erros
npx vitest run       → 46 arquivos de teste, 868/868 passando
npm run build        → prebuild (RM-23/RM-24/RM-49) + build Next.js, ambos limpos
  RM-23: 358 entidades, 0 inconsistências
  RM-24: total=368 compatíveis=106 divergentes=26 críticos=0
  RM-49: 263 arquivos, 0 sequências suspeitas
  Next.js build: 50 páginas estáticas geradas, compilação limpa
```

### Backend
```
npm run lint          → limpo (0 erros)
npx tsc --noEmit       → limpo
npm run test (unit)    → 15 suítes, 144/144 passando
npm run test:e2e       → 10 de 11 suítes executadas, 135/139 testes passando, 4 skipped
                          (1 suíte skipped — depende de Postgres real, RM41-026)
```

## 7. Validação em navegador

Fluxos validados nesta rodada, em abas limpas (sem log de console acumulado
de navegações anteriores), com zero erros de console em cada um:

Dashboard · Nova Consulta (etapa Paciente) · Comparador · Timeline (+criação
de evento) · Comitê Científico · Governança Científica · Protocolos (lista +
reabertura do editor) · Gêmeo Digital (lista + criação de demo + comparação
de estratégias) · Medical Audit Engine · Clinical Insights · Regulatory
Readiness (compliance 64%, teste de criptografia assíncrono resolvido) ·
Knowledge Graph · Meu Perfil · Prescrição Rápida (busca de molécula) · Casos
Demo · Atualizações Científicas (4 alertas, IDs únicos confirmados) ·
Eurofarma Dashboard · Analytics Farmacêutico · Qualidade Hospitalar — **19
fluxos**.

Fluxos do prompt original que dependem de backend real (login, sessão,
sincronização servidor, histórico paginado contra API, prescrição persistida,
troca de usuário, logout com resposta tardia) **não puderam ser exercidos**
— não há Postgres/backend real rodando neste sandbox (mesma limitação
documentada desde RM-47).

## 8. Veredito

> ## 🔴 CORREÇÕES NÃO CONCLUÍDAS

**Motivo:** RM41-023 (persistência de risco/diagnóstico), RM41-026 (execução
e2e real contra Postgres) e RM41-029 (fronteiras pediátricas, auditoria
dedicada) permanecem **NÃO CORRIGIDOS**. Por instrução explícita do prompt
RM-52, nenhum veredito "🟡 apto com limitações" é aceitável — como nem todos
os itens foram fechados, o veredito correto é 🔴, não 🟢, independentemente de
0 erros de lint e 100% dos testes/gates automatizados estarem verdes.

O que **está** pronto: 0 riscos críticos, 4 de 7 riscos altos fechados, 10 de
11 riscos moderados/baixos fechados, 0 erros de lint (25→0), 868/868 testes
frontend, 144/144 unit + 135/139 e2e backend, build limpo, 19 fluxos validados
em navegador sem erro de console, 2 bugs reais adicionais encontrados e
corrigidos durante a validação.

O que falta para virar 🟢: fechar RM41-023 (requer decisão de arquitetura
sobre onde/como persistir risco calculado — não é um fix pontual), rodar a
suíte e2e contra Postgres real fora do sandbox (RM41-026), e auditar
isoladamente RM41-029.

## 9. Próxima ação obrigatória fora do sandbox

Este bloco é **informativo** — não foi executado pelo assistente.

```bash
git add -A
git commit -m "RM-52: fecha lint (25→0 erros react-hooks), 4 riscos altos, 10 moderados/baixos; corrige 2 bugs achados na validação"
git push origin main
```

Depois do push, verificar manualmente:
1. Abrir a aba **Actions** do repositório no GitHub e confirmar que o
   workflow de CI dispara e roda **em um runner real** (isto nunca foi
   confirmado em nenhuma rodada anterior — RM-49/50/51/52 documentam a
   suíte como validada apenas localmente/no sandbox).
2. Se o CI falhar em qualquer gate que passou localmente aqui, **não
   assumir que é falha de infraestrutura** — investigar antes de re-rodar.
3. Rodar a suíte e2e do backend contra um Postgres real (`docker compose up`
   ou equivalente) para finalmente fechar RM41-026.
4. Não iniciar expansão clínica até RM41-023/026/029 estarem formalmente
   fechados com evidência, ou até uma decisão explícita do time de aceitar
   o risco residual documentado.
