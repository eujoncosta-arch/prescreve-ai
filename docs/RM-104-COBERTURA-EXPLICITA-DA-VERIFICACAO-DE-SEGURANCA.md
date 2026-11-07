# RM-104 — Cobertura explícita da verificação de segurança (achado C1)

**Origem:** auditoria de 04/11/2026 (commit `b36c639`), achado C1. `runSafetyCheck` descartava moléculas não reconhecidas com
`.filter(Boolean)`: `molecula_inexistente + varfarina` devolvia lista vazia, e a tela de prescrição lia lista vazia como o selo verde
**"Nenhum alerta de segurança / Prescrição verificada"**.

**Escopo respeitado:** nenhuma dose, interação, sinônimo ou regra clínica foi alterada; nenhum alerta existente foi removido. Sem commit, push ou deploy.

## 1. Onde estava o problema

| Ponto | Situação anterior |
|---|---|
| `safety-rules.ts` · `runSafetyCheck` | `.map(resolveSafeDrug).filter(Boolean)`: descarte silencioso; retorno era só `QuickSafetyAlert[]` |
| `app/prescricao-rapida/page.tsx` | `safetyAlerts.length === 0` → selo verde "Nenhum alerta de segurança" + "Prescrição verificada" |
| `clinical-tests/framework.ts` | `expectNoAlert(alerts)` passava com lista vazia, sem saber se a verificação foi completa (hoje sem uso nos casos, risco latente) |
| Demais importadores de `safety-rules` | só `stripAccents` (`clinical-risk-engine`); nenhum outro usa o resultado |
| Receita impressa | não carrega nenhuma informação de segurança (anterior a esta RM) |

## 2. Contrato de retorno (novo)

`runSafetyCheck(input): SafetyCheckResult` (antes: `QuickSafetyAlert[]`; o compilador TypeScript apontou todos os consumidores).

```ts
interface SafetyCheckResult {
  status: 'completa' | 'parcial' | 'molecula_nao_reconhecida' | 'dados_insuficientes' | 'erro';
  alertas: QuickSafetyAlert[];                 // alertas válidos (podem ser vazios mesmo com cobertura incompleta)
  moleculas_verificadas: { entrada; id; molecula; via: 'nome'|'sinonimo'; ambigua: boolean; candidatos: string[] }[];
  moleculas_nao_verificadas: { entrada; motivo: 'nao_reconhecida'|'entrada_vazia'|'entrada_invalida' }[];
  combinacoes_nao_avaliadas: { a; b; motivo: 'molecula_nao_verificada'|'identidade_ambigua' }[];
  verificacao_completa: boolean;               // true SOMENTE quando status === 'completa'
  mensagem: string;
  erro?: string;                               // só em status 'erro'
}
```

| Estado | Quando |
|---|---|
| `completa` | todas as entradas reconhecidas com identidade não ambígua |
| `parcial` | há entradas verificadas **e** entradas não verificadas ou de identidade ambígua |
| `molecula_nao_reconhecida` | nenhuma entrada foi reconhecida (nada verificado na base) |
| `dados_insuficientes` | nenhuma entrada utilizável (lista vazia, só vazios ou só inválidos) |
| `erro` | `moleculas` não é lista, input nulo, ou exceção interna (nunca devolve "vazio e seguro") |

Garantias: a identificação **original** de cada entrada é preservada (caixa e espaços); nenhuma entrada desaparece; combinações com entrada não verificada são listadas; **lista vazia de alertas nunca significa "seguro" sozinha**.

## 3. Comportamento anterior × posterior

| Caso | Antes | Depois |
|---|---|---|
| `molecula_inexistente + varfarina` | `[]` (silêncio) | `parcial`; não verificada listada; combinação não avaliada; `verificacao_completa=false` |
| Duas desconhecidas | `[]` | `molecula_nao_reconhecida` |
| Lista vazia / entrada vazia | `[]` | `dados_insuficientes` |
| `moleculas = null`/texto | exceção | `erro` com mensagem; sem exceção |
| Exceção interna | exceção | `erro`; "Não considere a prescrição verificada" |
| `varfarina + ibuprofeno` | alerta crítico | **igual** (alertas preservados) |
| Tela com cobertura incompleta | selo verde "Nenhum alerta de segurança" | aviso âmbar/vermelho com o que não foi verificado; selo "!" na aba; **nenhum** selo verde |
| Tela com verificação completa e sem alerta | "Nenhum alerta de segurança / Prescrição verificada" | "Nenhum alerta nas regras cadastradas" + "a ausência de alerta não garante segurança" |
| Pré-visualização da receita | sem aviso | aviso na tela (fora da área impressa) quando a cobertura é incompleta |

## 4. Achado adicional: identidade por sinônimo ambíguo

Medido nesta RM (sem alterar dados):

- Rótulos de **classe e de indicação** estão cadastrados como `sinonimos` de moléculas específicas: `ieca`→enalapril, `isrs`→sertralina, `bra`→olmesartana, `estatina`→atorvastatina, `nitrato`→nitroglicerina, `aine`→cetorolaco, `analgesico`, `febre`, `enxaqueca`… **89 nomes/sinônimos apontam para mais de uma entidade.** O resolvedor sempre pegou a **primeira** e a verificação saía "completa".
- Isso é confirmação de identidade por correspondência frouxa, o que a regra desta rodada proíbe. **Correção sem alterar dados:** o resolvedor continua devolvendo a primeira correspondência (alertas inalterados), mas informa `ambigua=true` e os `candidatos` quando o texto casa com **moléculas de nome ativo diferente**; nesse caso o status é `parcial` e a combinação é listada como `identidade_ambigua`. Variantes de contexto da **mesma** molécula (`azitromicina`/`azitromicina_dpoc`) não contam como ambiguidade.
- Impacto medido na base: das **382** moléculas, **0** deixam de ser reconhecidas e só **2** passam a `parcial`, ambas por ambiguidade real: `desogestrel` (resolve para a combinação `etinilestradiol + desogestrel`) e `bicarbonato de sódio` (variante PCR × oral).

## 5. Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `frontend/src/lib/safety-rules.ts` | corpo original preservado em `coletarAlertas`; novo resolvedor com ambiguidade; novo `runSafetyCheck` com cobertura; tipos do contrato |
| `frontend/src/lib/safety-coverage.ts` *(novo)* | lógica pura do que a interface pode afirmar (`describeSafetyCoverage`, `coberturaIncompleta`) |
| `frontend/src/components/modules/SafetyCoverageNotice.tsx` *(novo)* | aviso de cobertura (nunca mostra o selo negativo com cobertura incompleta) |
| `frontend/src/app/prescricao-rapida/page.tsx` | guarda o resultado; usa o aviso; selo "!" na aba; aviso na pré-visualização da receita; remove o selo verde incondicional |
| `frontend/src/clinical-tests/framework.ts` | `safety()` devolve `.alertas`; novos `safetyResult` e `expectNoAlertCompleto` (ausência esperada só passa com verificação completa) |
| 7 testes existentes | adaptador local (`runSafetyCheck(...).alertas`); todas as asserções originais preservadas |
| `frontend/src/tests/rm104-cobertura-verificacao-seguranca.test.tsx` *(novo)* | 42 testes |

## 6. Testes criados (42) — mapeados aos 10 obrigatórios

1. conhecida + conhecida · 2. desconhecida + conhecida (identificação original, combinação não avaliada, alertas inalterados) · 3. duas desconhecidas ·
4. nome comercial não reconhecido e nomes parecidos (sem aproximação) · 5. sinônimo validado (cadastrado) · 6. nome vazio / lista vazia ·
7. entrada inválida (não lista, nulo, itens não texto, exceção interna) · 8. prescrição com vários medicamentos e um não reconhecido ·
9. resultado parcial com alertas válidos **e** itens não verificados · 10. interface: com cobertura parcial/não reconhecida/insuficiente/erro **nunca** mostra "Nenhum alerta" nem o selo negativo (renderização real do componente + guarda no código-fonte da tela).
Extras: ambiguidade de classe (`ieca`, `isrs`), variantes da mesma molécula, as 382 moléculas da base, regra fixa ARM ao lado de desconhecida, `expectNoAlertCompleto`.

## 7. Resultados

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ limpo |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` | ✅ **84 arquivos / 1.460 testes** (antes 83 / 1.418; +1 arquivo, +42 testes; nenhum teste antigo falhou) |
| `npm run build` | ✅ exit 0, 50/50 páginas; consistência, cross-db e auditoria de marcas passam |
| Tela `/prescricao-rapida` (servidor local) | `desogestrel` → status `parcial`, aviso de identidade ambígua, selo "!" na aba, sem "Nenhum alerta"; `paracetamol` → `completa`, "Nenhum alerta nas regras cadastradas" com ressalva |

## 8. Riscos residuais

1. **Sinônimos de classe/indicação com um único candidato** (ex.: `aine`→cetorolaco, `estatina`→atorvastatina): não são detectáveis como ambíguos e ainda resolvem como "completa" para uma molécula que o médico não digitou. Exige revisão clínica da lista de sinônimos.
2. **Regras fixas por texto** (`CRITICAL_PAIRS`, ARM, montelucaste) continuam casando por texto bruto também para entradas não reconhecidas; só as verificações baseadas na base (interação cadastrada, duplicidade, gestação, lactação, geriatria, renal) deixam de ocorrer para elas. O status fica `parcial`, mas o contrato não diz qual regra fixa cobriu qual entrada.
3. **Dados de contexto ausentes** (função renal, gestação/lactação não informadas) continuam sem aviso próprio: a verificação renal só ocorre se `crclValue` existe, e `gestante`/`lactante` ausentes valem como falso. "Completa" significa **moléculas** reconhecidas, não contexto completo.
4. **Receita impressa** não traz a situação de segurança (anterior a esta RM); o aviso fica só na tela, de propósito, para não alterar um documento clínico sem decisão.
5. **Cobertura não é segurança:** mesmo `completa`, a base de interações é limitada (a auditoria mediu 33% de pares clássicos sem alerta). Isso é o achado de matriz, tratado fora desta RM.
6. Marcas comerciais fora dos sinônimos cadastrados são corretamente "não reconhecidas", mas isso pode gerar `parcial` frequente para nomes comerciais legítimos até que haja sinônimos verificados.

## 9. Pendências que exigem validação clínica (não alteradas)

- **Revisão dos sinônimos:** retirar ou separar rótulos de classe/indicação (`ieca`, `isrs`, `aine`, `estatina`, `analgesico`, `febre`, `enxaqueca`, `ansiedade`…) da lista de sinônimos de moléculas; adicionar marcas e sinônimos só com equivalência verificável.
- **Identidade das 18 variantes** que resolvem para outro id (`desogestrel-75mcg`→`etinilestradiol-desogestrel`, `fentanil-transdermico`→`fentanil-uti`, `bicarbonato-sodio-pcr`→`bicarbonato-sodio-oral`…): decidir quais variantes de contexto devem ser entidades distintas na verificação.
- **Dados de contexto** (renal, gestação, lactação, idade): definir se "não informado" deve gerar estado próprio, como o ARM já faz para o potássio.
- **Receita impressa:** decidir se deve registrar a situação de verificação.
- **Matriz de interações** (benzodiazepínico + opioide, QT, anticoagulantes): ampliar com revisão farmacêutica (achado C1/auditoria, outra RM).

---

Sem commit, push ou deploy nesta RM. Não avancei para a RM-105.
