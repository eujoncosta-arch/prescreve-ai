# RM-106 — Auditoria, classificação e revisão da matriz de interações medicamentosas

> Aprovação técnica NÃO equivale a homologação clínica. Nenhuma interação cadastrada possui fonte oficial registrada; todas permanecem **pendentes de validação clínica**.
> Estado: alterações **não commitadas**. HEAD continua `b36c639`. Sem push, sem deploy. RM-107 **não iniciado**.

## 1. Estado inicial
Branch `main`, HEAD `b36c639`, árvore já com alterações não commitadas das RM-104 a RM-105.2.2. A matriz é o campo `interactions {with, severity, description}` de cada entidade (pharma-core) e `interacoes_importantes {com, severidade, descricao}` (QuickDrug). Não há fonte, mecanismo nem status por interação; `with` é texto livre (491 textos distintos). As regras fixas (CRITICAL_PAIRS ×22, ARM, montelucaste) já usavam alvos explícitos desde a RM-105.1. A seção 1 do `runSafetyCheck` casava o `with` por **substring bidirecional** (`b.molecula.includes(inter.com) || inter.com.includes(b.molecula)`).

## 2. Inventário
Dados completos em `evidencias/inv.json` e `evidencias/atomos.json`.
- 491 textos `with` distintos; 87 sem entidade no catálogo; 283 interações não recíprocas.
- Nenhuma interação com fonte registrada, mecanismo estruturado ou conduta estruturada (apenas `description` livre).
- Alvos não medicamentosos (álcool, tabagismo, grapefruit etc.) agora são reconhecidos e nunca casam com itens prescritos.

## 3. Arquivos alterados
Novos: `lib/interaction-targets.ts` (resolvedor), `lib/interaction-contract.ts` (contrato), `tests/rm106-matriz-de-interacoes.test.ts`.
Modificados: `lib/safety-rules.ts` (seção 1 reescrita, dedup, rastreio/resumo), `lib/safety-coverage.ts`, `lib/safety-annex.ts`, `components/modules/SafetyCoverageNotice.tsx`, `AlergiasNotice.tsx`, `app/prescricao-rapida/page.tsx`.
Testes antigos adaptados (mudanças intencionais comentadas no código): `rm105-…`, `rm1051-…`, `rm1052-…`.
Nenhum dado clínico (doses, posologias, calculadoras, contraindicações, catálogo, gravidades) foi alterado.

## 4. Correspondências textuais encontradas
- `safety-rules.ts` (seção 1): substring bidirecional sobre `inter.com` — **substituída** pelo resolvedor.
- Fixas: já explícitas (RM-105.1).
- Ainda com substring, fora da tela de prescrição: `therapeutic-class-expansion.ts`, `therapeutic-prioritization.ts`, `validate-integrity-22-5.ts` (consulta isolada). **Não alterados nesta RM; pendentes.**
- Teste-guarda impede reintroduzir `.includes` sobre `inter.com`/`molecula` em `safety-rules.ts`.

## 5. Classificação dos padrões
Cada átomo de `with` (separado por `/`, `+`, `,`, ` e `, ` ou ` fora de parênteses) é resolvido por: A molécula exata; B componente de combinação (e nome-base do ativo em sal); C classe farmacológica e D grupo aprovado (apenas lista controlada `GRUPOS_CONTROLADOS`, com códigos ATC, sem fragmentos); E sinônimo/alias autorizado (mecanismo da RM-105.1; sinônimo que aponta para moléculas diferentes é ambíguo); F ambíguo/não resolvido → nunca confirmado. Não houve substituição cega por igualdade: a união de caminhos explícitos preserva acertos legítimos. Descritores de grupo aberto (ex.: "Inibidores CYP3A4") só casam com membros enumerados e são sinalizados.
Grupos vazios (sem membros no catálogo): betabloqueadores não seletivos, suplementos de K, aminoglicosídeos, triptanos, antiarrítmicos IA, sequestrantes de ácidos biliares.

## 6. Interações mantidas, corrigidas, adicionadas, removidas
- **Mantidas**: todas as cadastradas, com a gravidade registrada.
- **Corrigidas**: um alerta por par (direção mais grave; divergência exposta — lítio+ibuprofeno e atorvastatina+claritromicina passam de warning para danger); deduplicação com regra fixa por especificidade.
- **Adicionadas ao alcance (não ao cadastro)**: ~2.088 pares entidade-entidade passam a casar por classe/grupo/enumeração, todos pendentes de validação, com a gravidade já registrada.
- **Removidas (falsos positivos, justificados)**: "Apomorfina"→morfina, "Norepinefrina"→epinefrina, "Álcool (paracetamol)" e "Carvão ativado (paracetamol IV)"→paracetamol. Regras genéricas duplicadas "ISRS+tramadol", "IECA+espironolactona" e "IECA+BRA" (base) deixam de duplicar a específica.
- **Não adicionadas**: nenhuma interação nova foi cadastrada (ver seção 11).

## 7. Fontes × regras
`REGISTRO_DE_FUNDAMENTACAO` permanece **vazio**. Fontes oficiais localizadas por busca (rótulos FDA/DailyMed: Xarelto, Eliquis, carbonato de lítio, tramadol, claritromicina, ondansetrona, azitromicina, fenobarbital; comunicação FDA 2016 opioide+benzodiazepínico) foram vistas apenas como trechos de busca, **sem seção e trecho literal verificados**; por isso não foram registradas. Candidatas a verificação, não fundamentação.

## 8. Comparação dos 67 pares (RM-103 × RM-106)
`evidencias/pares67-antes-depois.json`.
| Métrica | RM-103 | RM-106 |
|---|---|---|
| Pares com alerta | 34 | 44 |
| Alertas confirmados por fonte | 0 | 0 |
| Alertas pendentes/por classe/por grupo | — | 45 |
| Pares reconhecidos sem regra | — | 4 |
| Entradas não reconhecidas | — | 23 |
| Moléculas com ambiguidade sinalizada | — | 26 |

Lacunas fechadas (11): rivaroxabana+AAS, apixabana+ibuprofeno, ondansetrona+sertralina, ondansetrona+haloperidol, citalopram+ondansetrona, midazolam+fentanil, diazepam+morfina, lorazepam+tramadol, gabapentina+morfina, clonazepam+codeína, lítio+enalapril.
Lacunas que permanecem (4, moléculas reconhecidas, sem regra e sem fonte verificada): azitromicina+ondansetrona, claritromicina+amiodarona, fenobarbital+morfina, bupropiona+tramadol. Aparecem em "pares sem regra encontrada", nunca como ausência de interação.

## 9. Testes
`rm106-matriz-de-interacoes.test.ts` (23): resolução de todos os `with`, falsos positivos de substring, não medicamentosos, grupos, molécula exata, classe, não identificado, par sem regra, 3+ medicamentos, simultâneas, consistência do resumo, nenhuma confirmação sem fonte, 7 pares prioritários, 4 lacunas, guarda contra substring. Suíte antiga preservada; alterações intencionais documentadas.
**Não cobertos explicitamente**: marcas comerciais e severidades divergentes além de lítio+ibuprofeno (cobertos indiretamente pelas regressões RM-105/105.1).

## 10. Gates
- `tsc --noEmit`: 0 erros. `eslint src`: 0 problemas.
- Vitest completo: **90 arquivos, 1.754 testes, todos passando**.
- `next build`: concluído com sucesso.
- Relatórios da raiz (`DATABASE_SYNC_REPORT.md`, `RM23_DRUG_CONSISTENCY_REPORT.md`) restaurados via `git checkout --`.
- **Validação visual no navegador da tela de prescrição: não executada nesta etapa**; a UI foi validada só por testes de componente (cartão com classificação, ausência de verde, seção "sem regra" no anexo). Pendente.

## 11. Pendências de validação clínica
1. Todas as interações (nenhuma com fonte registrada).
2. Definições ATC dos grupos controlados.
3. Quatro lacunas: azitromicina+ondansetrona, claritromicina+amiodarona, fenobarbital+morfina, bupropiona+tramadol.
4. Pares prioritários solicitados (benzodiazepínicos+opioides, QT, rivaroxabana+AAS, apixabana+ibuprofeno, lítio+IECA, bupropiona+tramadol): reconhecidos pela matriz, porém sem fonte verificada.
5. Divergências de gravidade entre direções (lítio+ibuprofeno, atorvastatina+claritromicina, cimetidina↔teofilina).

## 12. Riscos residuais
- A matriz ignora via/formulação (ex.: cetoconazol+betametasona tópico casa por componente).
- Alvos abertos cobrem apenas membros enumerados; 87 `with` sem entidade; 283 não recíprocos.
- Alertas por classe/grupo aumentam o volume (pendentes); risco de fadiga de alerta.
- Módulos de consulta isolados ainda usam substring.
- Ausência de regra ≠ ausência de interação (nota exibida na UI e no anexo).

## 13. Interface
Cartão de alerta mostra classificação (rótulo), regra cadastrada, tipo de correspondência, fonte ("sem fonte registrada") e divergência. Avisos "ok" passaram a tom neutro (slate) com ícone informativo; sem verde, sem selo de aprovação. Nenhum bloqueio automático de prescrição. Anexo técnico ganhou a seção "Pares sem regra de interação encontrada" (10 seções).

## 14. Confirmações
- **RM-107 não foi iniciado.**
- **Nenhum commit, push ou deploy foi feito.**
- Evidências em `docs/auditorias/RM-106/evidencias/`.

Aguardando aprovação.

## Errata (RM-106.1, 2026-11-07)
Correções **apenas documentais**; nenhum código clínico mudou. Detalhes e denominadores em `../RM-106.1/RELATORIO-RM-106.1.md` (seção 4).
1. Seção 6: "~2.088 pares adicionais" são **2.088 relações direcionais regra→entidade** ganhas (580 → 2.662; 574 mantidas; 6 perdidas). Em **pares únicos não ordenados** o salto é 532 → 2.335 (1.809 ganhos, 6 perdidos). Na interface, 2.363 de 72.771 pares possíveis (3,25%) geram alerta de interação.
2. Seção 8: "45 alertas pendentes/por classe/por grupo" estava mal rotulado. Os 45 alertas dos 67 pares são 43 de interação + 2 do ARM, em 44 pares; por classificação: 26 `pendente_validacao`, 16 `por_classe`, 0 `por_grupo`, 3 `medicamento_nao_identificado`, 0 `confirmada`. "23 não reconhecidas" e "26 ambíguas" são entradas (em 22 e 21 pares).
3. `evidencias/diff2.json` foi gerado antes do ajuste de alias do valproato e ficou desatualizado (2.650/562/18/sinônimo 61); valores corretos: 2.662/574/6/73.
4. Seção 2: a afirmação "nenhuma interação com fonte, mecanismo ou conduta **estruturados**" é correta; os números "31/655/258" de `inv.json` eram heurísticas de regex sobre texto livre, sem valor de fonte.
