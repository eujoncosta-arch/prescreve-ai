# RM-106.1 — Fechamento de evidências, consistência das métricas e validação visual da matriz de interações

> **Aprovação técnica ≠ validação clínica ≠ homologação regulatória.** Esta RM é técnica. Nenhuma interação cadastrada possui fonte oficial registrada; todas permanecem **pendentes de validação clínica**. Nenhuma foi declarada confirmada.
> Estado: alterações **não commitadas** (HEAD `b36c639`, branch `main`). Sem commit, push ou deploy. **RM-107 não iniciada.**

## 1. Estado inicial e commit
- Branch `main`, HEAD `b36c639`; alterações locais das RM-104 a RM-106 preservadas (árvore suja, nada commitado).
- Ponto de partida: 90 arquivos / 1.754 testes, `tsc`, ESLint e build aprovados (RM-106).

## 2. Arquivos analisados
`docs/auditorias/RM-106/evidencias/{inv,atomos,diff2,pares67-antes-depois}.json`; `lib/interaction-targets.ts`, `lib/interaction-contract.ts`, `lib/safety-rules.ts`, `lib/safety-coverage.ts`, `lib/safety-annex.ts`, `lib/safety-limitations.ts`; `pharma-core/types.ts` (Interaction, Brand, Presentation); `app/prescricao-rapida/page.tsx` (RxItem e chamada a `runSafetyCheck`); catálogo completo (382 entidades, 870 regras).

## 3. Alterações realizadas (nenhuma clínica)
| Arquivo | Alteração | Natureza |
|---|---|---|
| `lib/safety-limitations.ts` | +1 item em `VERIFICACOES_FORA_DO_ESCOPO`: via, forma farmacêutica, concentração e apresentação não são consideradas | descrição factual de limitação (nenhuma regra) |
| `lib/interaction-contract.ts` | `FonteInteracao` ganhou instituição, documento, versão do documento, par relacionado, limitações da fonte e estado de revisão; novo `camposFaltantesDaFonte`; `classificarInteracao` só devolve `confirmada` com fonte **completa e verificada**; `metadadosDaInteracao` rebaixa a pendente uma entrada com fonte incompleta | endurecimento do contrato (registro continua **vazio**; resultado atual inalterado) |
| `lib/safety-rules.ts` | comentário em `interacao_confirmada` esclarecendo que significa só "identidade molecular confirmada" | somente comentário |
| `tests/rm1061-fechamento-matriz-interacoes.test.ts` | 37 testes novos | testes |
Nenhuma gravidade, dose, posologia, contraindicação, regra fixa, sinônimo/alias, grupo controlado, catálogo, calculadora ou engine foi alterado. Nenhuma interação adicionada ou removida.

## 4. Reconciliação das métricas
Cada número abaixo tem **unidade e denominador explícitos**. Medição reproduzível (`evidencias/sonda-medicao-metricas.test.ts.txt` → `evidencias/metricas-matriz.json`).

**Base cadastral**: 382 entidades · 870 regras (`entidade`×`with`) · 491 textos `with` distintos. Nenhuma regra tem campo além de `with/severity/description` (0 com fonte, mecanismo ou conduta **estruturados**).

**4.1 Por que "44 pares com alerta" e "45 alertas pendentes"?** São unidades diferentes sobre os 67 pares clássicos da RM-103 (45 alertas distribuídos em 44 pares):
- 45 alertas = **43 alertas de interação** + **2 alertas do ARM** (regra fixa de espironolactona sem K⁺).
- 44 pares = 43 pares com alerta de interação + 1 par (espironolactona + cloreto de potássio) que só tem o alerta ARM.
- `enalapril + espironolactona` tem **2 alertas** (interação cadastral + ARM); é o único par com mais de um alerta.
- O rótulo do relatório RM-106 ("45 pendentes/por classe/por grupo") estava **errado**: a decomposição correta dos 45 é 26 `pendente_validacao` + 16 `por_classe` + 0 `por_grupo` + **3 `medicamento_nao_identificado`** (alertas de regra fixa acionados por entrada não verificada: sertralina+tramadol, sildenafila+nitroglicerina, metformina+contraste iodado) + 0 `confirmada`. Os 2 do ARM estão entre os 26 pendentes.
- Outros números do RM-106 também mudam de unidade: "23 entradas não reconhecidas" são **entradas** (em 22 pares); "26 ambíguas" são **entradas** (em 21 pares).

**4.2 O que são os "~2.088"?** Não são pares. São **relações direcionais regra→entidade** (uma por regra cadastrada × entidade-alvo reconhecida) **ganhas** em relação à substring. O relatório RM-106 os chamou de "pares". Correto:

| Unidade | Substring (antes) | Resolvedor (agora) | Mantidas | Ganhas | Perdidas |
|---|---|---|---|---|---|
| Relações direcionais regra→entidade | 580 | **2.662** | 574 | **2.088** | 6 |
| Pares **únicos não ordenados** de entidades com ≥1 relação | 532 | **2.335** | — | 1.809 | 6 |

As 6 perdidas são os falsos positivos já documentados (álcool/carvão→paracetamol; apomorfina ×3→morfina; norepinefrina→epinefrina). Composição das 2.662 por tipo: classe 1.183 · grupo 628 · molécula exata 401 · enumeração explícita 176 · nome-base do ativo 138 · sinônimo autorizado 73 · componente de combinação 63.
Erro de evidência identificado e corrigido **só na documentação**: `diff2.json` (RM-106) foi gerado **antes** do ajuste de alias do valproato e nunca regenerado (mostrava 2.650/562/18/sinônimo 61); os números válidos são os acima (2.662/574/6/73). Errata registrada em `RM-106/RELATORIO-RM-106.md`.

**4.3 Quantos pares produzem alerta na interface?** Execução do motor, com `entidade_ids`, para **todos os 72.771 pares** possíveis de 382 entidades:
- **2.363 pares (3,25%)** produzem alerta de interação; **70.408 (96,75%)** ficam "sem regra encontrada" (≠ ausência de interação).
- 0 pares com mais de um alerta de interação; 0 IDs de alerta duplicados; 0 pares ambíguos/não verificados (IDs resolvem tudo).
- 2.335 pares têm relação cadastral; os 28 restantes (2.363−2.335) vêm só de regras fixas.
- 87 pares exibem divergência de gravidade entre direções (vale a mais grave).

**4.4 Correspondência dos 2.363 alertas** (unidade: par de entidades): classe farmacológica 914 · grupo 567 · molécula exata 349 · enumeração explícita 154 · regra fixa de par 137 · nome-base 130 · componente 58 · sinônimo 54. **Classificação**: `por_classe` 1.030 · `por_grupo` 567 · `pendente_validacao` 766 · **`confirmada` 0**. (As 137 regras fixas distribuem-se em 116 `por_classe` e 21 `pendente`, por derivação dos totais.)

**4.5 Estados dos 67 pares clássicos** (unidade: par): 44 com algum alerta · 4 reconhecidos sem regra (azitromicina+ondansetrona, claritromicina+amiodarona, fenobarbital+morfina, bupropiona+tramadol) · 22 com ao menos uma entrada não reconhecida · 21 com entrada ambígua · 0 com `confirmada`. **Resultado idêntico ao da RM-106 (0 divergências nos 67)**: `evidencias/pares67-rm106.1.json`.

**4.6 Deduplicação** (verificada por teste nos 2.335 pares): um único alerta de interação por par. Entre direções A→B/B→A vale a mais grave; empate de gravidade → correspondência mais forte (molécula exata < sinônimo < componente < nome-base < enumeração < classe < grupo). Regra fixa × base cadastral: a fixa substitui a base se for mais grave ou, em gravidade igual, mais específica (especificidade molecular=2, classe/grupo/enumeração=1). Divergência fica registrada em `divergencia_de_gravidade`.

**4.7 Contagens textuais do inventário antigo.** `inv.json` registrava "31 com fonte / 655 com mecanismo / 258 com conduta"; eram **heurísticas de regex sobre texto livre**, não campos. A sonda atual reporta 0 campos estruturados; a heurística textual (não prova de nada) acusa 15 descrições que mencionam termo de fonte, 178 de conduta e 491 de mecanismo (regex muito permissivo). **Nenhuma conta como fonte registrada.** Há também `references` por **entidade** (360 de 382), que não estão ligadas a nenhuma interação e não são exibidas como fonte de interação.

## 5. Auditoria de marcas comerciais
Catálogo: 710 marcas em 382 entidades (4 nomes compartilhados entre variantes: Gardenal, Dormicum, "midazolam (genérico)", Narcan; 37 marcas de combinações).
**Fluxo real da tela**: o item da receita guarda `nome_comercial` mas envia ao motor apenas `molecula` + `entidade_id`. Com ID, **as 710 marcas resolvem com identidade confirmada e sem ambiguidade** (testado nas 710). Marca com ID divergente (ex.: marca de valsartana com ID de losartana) → `id_diverge_do_texto`, identidade **não** confirmada.
**Caminho por texto, sem ID** (protocolos antigos, integrações): resultado dos 710 nomes: 577 (81,3%) não reconhecidos · 118 reconhecidos como sinônimo `nome_comercial_nao_verificado` (identidade não confirmada) · 13 ambíguos (variantes sem ID) · 1 reconhecido como nome do ativo · 1 como marca verificada.
**Lacuna real (L-MARCA-1)**: no caminho por texto o motor consulta `activeIngredient.name`, `fullName` e `sinonimos`, **não `brands`**. Das 118 marcas com `verified:true`, **116 não são reconhecidas** por texto (ex.: "Sinot Clav®", "Dualgi®"); das 592 com `verified:false`, 118 são reconhecidas só porque a marca consta em `sinonimos`. Ou seja, a verificação da marca não influencia a identidade. Não corrigida (alterar reconhecimento de marca/sinônimo é vedado nesta RM); documentada com teste.
Bateria de regressão (11 testes): molécula única; associação (amoxicilina+clavulanato); combinação com sal (losartana potássica+HCTZ); entidade com várias apresentações; marcas semelhantes de moléculas diferentes; marca não cadastrada ("MarcaNaoCadastradaZZ9"); marca ambígua (Dormicum sem ID × com ID da variante); ID divergente; sinônimo não verificado; lacuna L-MARCA-1; interação resultante sempre `pendente_validacao` com 2 entradas rastreadas. Só marcas/entidades do catálogo foram usadas (exceto a string de controle de marca inexistente).

## 6. Auditoria de via e formulação
1. **O resolvedor recebe via/forma/concentração?** **Não.** `SafetyCheckInput` só tem identidade (`moleculas`, `entidade_ids`), contexto do paciente e alergias. O item da tela (`RxItem`) tem `via`, `forma_farmaceutica`, `concentracao`, `dose`, mas nada disso chega ao motor.
2. **O contrato distingue apresentações?** **Não.** `RegistroInteracaoAvaliada` não tem campos de via/forma/concentração; duas marcas/apresentações da mesma entidade geram alertas idênticos (testado).
3. **Alerta sem considerar via/formulação?** **Sim.** Caso de teste: `cetoconazol + betametasona` (entidade só tópica: creme/pomada; rota "Tópico") + zolpidem → alerta `inter-zolpidem-cetoconazol_betametasona` por **componente de combinação**, aplicando a regra cadastrada para "Cetoconazol" (descrição: "CYP3A4 — aumenta nível de zolpidem") sem considerar a via. **Não se afirma que a interação seja ou não relevante para a via tópica.** Do total de rotas das regras de dose do catálogo, 1.596 de 1.978 regras de dose do catálogo não declaram rota (campo opcional).
4. **O sistema identifica a falta de dados contextuais?** **Não para via/forma** (não há contexto "via" na cobertura contextual). Antes desta RM a limitação não era declarada; agora consta em "Verificações fora do escopo" e no anexo técnico (visto no navegador).
5. **Limitação e alteração futura**: o motor é por identidade molecular. Futuro: aceitar `{entidade_id, via, forma, concentração, apresentação}` por item; marcar nas regras cadastradas o escopo (sistêmica/tópica/…); registrar no contrato "regra aplicada com via/forma desconhecida ou não correspondente"; novo contexto "via/forma não avaliadas". Requer decisão clínica sobre quais regras têm restrição de via — **não feito**.

## 7. Rastreabilidade
Para os cinco tipos exercitados (exata, componente, classe, grupo, sinônimo) o teste reconstrói: entradas, entidades, tipo de correspondência, texto cadastrado que gerou o alerta, gravidade cadastrada, ausência de fonte, divergência e estado de validação. Garantias testadas: classe não aparece como "molécula exata"; grupo não aparece como confirmação; regra cadastrada ≠ validada (`status_validacao='pendente_validacao_clinica'`); ausência de fonte explícita; "sem regra" acompanhado da nota; ambiguidade nunca resolvida em silêncio.
**Caminhos com risco de certeza excessiva identificados** (nenhum corrigido além do já indicado):
- (a) `interacao_confirmada` (RM-105) significa só identidade molecular; o nome induz erro. **Mitigado** por comentário; renomear quebraria contrato/testes. O anexo imprime "baseado em moléculas identificadas" (não "confirmado") e logo depois a classificação pendente.
- (b) Rótulo `confirmada` ("Interação identificada e confirmada (fonte oficial registrada)") hoje inatingível. **Mitigado**: exige fonte completa e verificada (teste).
- (c) Cabeçalho "Verificação concluída para todas as moléculas informadas" (RM-104/105) pode soar conclusivo mesmo com pares sem regra. O corpo e o tom cinza qualificam. **Não alterado** (recomendação futura).
- (d) `descricao` e conduta das regras cadastradas aparecem ao lado do rótulo "validação pendente", mas são texto livre sem fonte; o rótulo cumpre a função de aviso.

## 8. Fontes
Ver `evidencias/fontes-verificadas-e-candidatas.md`. **Registro de fundamentação: vazio.**
- **Verificadas tecnicamente** (documento aberto, seção e trecho literal conferidos; revisão clínica pendente): ELIQUIS 7.3/5.2 (rev. 4/2025); XARELTO 7.4 (rev. 3/2026); FDA — Boxed Warning de benzodiazepínicos (23/09/2020) com cautela benzodiazepínico + opioide. Todas com limitações (leitura por ferramenta, não validam a gravidade cadastrada).
- **Candidatas, não verificadas**: FDA 2016 opioide+benzodiazepínico (HTTP 404; só cópia arquivada), tramadol/bupropiona (citação só em resumo da ferramenta), claritromicina, ondansetrona, azitromicina, lítio, fenobarbital.
- Estrutura de rastreabilidade entregue (seção 3); nada foi preenchido automaticamente.

## 9. Evidências da validação visual
Executada no navegador, fluxo completo da tela (`evidencias/visual/VALIDACAO-VISUAL.md` + 9 capturas): 8 cenários aprovados (exata, classe, grupo, não reconhecida, sem regra/avaliação incompleta, 6 medicamentos/8 alertas, divergência de gravidade, anexo técnico com "Pares sem regra" e a nova limitação). Sem selo verde ou indicação de segurança (os 2 elementos verdes de 8 px são rótulos "EURO" da navegação). **Limitação**: layout móvel não responsivo, **pré-existente** (barra lateral fixa de 224 px e `grid-cols-12` sem breakpoints; igual em `/calculadoras`); em 375 px o painel de segurança fica estreito (~160 px). Os blocos do RM-106 não estouram a largura, mas a **legibilidade móvel é insuficiente por causa do layout geral** (captura 09 com a barra lateral ocultada só para diagnóstico).

## 10. Resultado dos testes e gates
| Gate | Resultado |
|---|---|
| `tsc --noEmit` | 0 erros |
| `eslint src` | 0 problemas |
| Vitest completo | **91 arquivos, 1.791 testes aprovados** (antes: 90 / 1.754; +37 novos); regressões RM-104, 105, 105.1, 105.2, 105.2.1, 105.2.2 e RM-106 todas verdes |
| Bateria dos 67 pares | 0 divergências em relação à RM-106 |
| `next build` | sucesso, 50/50 páginas |
| Relatórios da raiz | `DATABASE_SYNC_REPORT.md` e `RM23_DRUG_CONSISTENCY_REPORT.md` restaurados (`git checkout --`) |
Cobertura dos itens pedidos: marcas, ambiguidade, classe/grupo, ausência de fonte, deduplicação (2.335 pares) e preservação de gravidades (amostra de 100+ pares: gravidade do alerta = mais grave entre regras que casam) estão em `rm1061-…` e nos testes anteriores.

## 11. Pendências técnicas
1. L-MARCA-1: reconhecimento de marca por texto não usa `brands` (116 marcas verificadas não reconhecidas).
2. Via/forma/concentração/apresentação não chegam ao motor nem ao contrato.
3. Layout móvel não responsivo (shell + página).
4. Cabeçalho "Verificação concluída…" pode ser lido como conclusão; reformular com revisão de testes RM-104.
5. Campo legado `interacao_confirmada` com nome enganoso.
6. 87 textos `with` sem entidade no catálogo; 283 regras não recíprocas; grupos sem membros no catálogo (betabloqueadores não seletivos, suplementos de K⁺, aminoglicosídeos, triptanos, antiarrítmicos IA, sequestrantes de ácidos biliares).
7. Módulos de consulta isolados (`therapeutic-class-expansion.ts`, `therapeutic-prioritization.ts`, `validate-integrity-22-5.ts`) ainda usam substring.
8. Título "Prednisona + ibuprofeno" com minúscula (dado do catálogo).

## 12. Pendências de validação clínica
- **Todas as 870 regras** (e os 2.363 alertas possíveis): gravidade, descrição, conduta e fonte.
- Definições ATC dos grupos/classes controlados.
- Alertas por classe/grupo: decidir se o volume é clinicamente aceitável.
- Divergências de gravidade (87 pares; p.ex. cimetidina↔teofilina, lítio+ibuprofeno, atorvastatina+claritromicina).
- Interações e regras com restrição de via (ex.: cetoconazol/betametasona tópicos).
- 4 lacunas sem regra: azitromicina+ondansetrona, claritromicina+amiodarona, fenobarbital+morfina, bupropiona+tramadol.
- Fontes A1–A3 e candidatas da seção 8, a serem revisadas e, se aprovadas, registradas com o contrato completo.

## 13. Riscos residuais
Volume de alertas pendentes por classe/grupo (fadiga); possibilidade de leitura conclusiva do cabeçalho; matriz parcial (96,75% dos pares sem regra, o que **não** prova ausência de interação); texto livre das regras exibido sem fonte; identidade por marca por texto frágil (L-MARCA-1); nenhum contexto de via/forma; uso móvel prejudicado.

## 14. Recomendação sobre o encerramento da RM-106
- **Aprovação técnica**: recomendo **encerrar a RM-106 como tecnicamente concluída**, com as correções documentais desta RM (métricas e errata) e a ressalva de que a validação visual móvel ficou limitada pelo layout pré-existente. Critérios atendidos: métricas reconciliadas; marcas testadas e lacuna documentada; limitação de via/forma demonstrada e agora declarada; rastreabilidade preservada; validação visual real executada; nenhuma interação sem fonte apresentada como confirmada; todos os gates verdes; nenhuma alteração clínica.
- **Validação clínica**: **não realizada e não concluída.** Exige médico e farmacêutico clínico, fontes verificadas e critérios aprovados (seção 12).
- **Homologação regulatória**: etapa independente, não abrangida.
Aguardando sua aprovação antes de qualquer outra RM.
