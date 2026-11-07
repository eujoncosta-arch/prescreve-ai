# RM-107.3 — Análise de prontidão (shadow mode)

> **Somente análise de prontidão. Nada foi implementado.** Conforme as pré-condições da RM-107.3, quando qualquer condição não é atendida só se faz a análise e se aguarda. Nenhum código, dado, regra, tela ou motor foi alterado; sem commit, push ou deploy.

## 1. Pré-condições
| # | Pré-condição | Situação verificada | Atendida? |
|---|---|---|---|
| 1 | RM-107.1 encerrada | Auditoria e documentação concluídas (relatório, matrizes, inventário, fontes, lacunas, registro, errata, índice) | Sim (documental) |
| 2 | Decisões profissionais aplicáveis registradas | `REGISTRO-DE-DECISOES-PENDENTES.md`: **0 aprovadas, 14 pendentes** (D1–D14) | **Não** |
| 3 | RM-107.1.1 revisada e contenções aprovadas | Existe só `PLANO-DE-CONTENCAO.md`; contenção **não implementada nem aprovada** | **Não** |
| 4 | RM-107.2 implementada e tecnicamente aprovada | Implementada (`src/lib/dose-contract/`, 56 testes, tsc/lint/build/Vitest verdes); **você ainda não registrou a aprovação técnica** | **Pendente de sua aprovação** |
| 5 | Contratos e adaptadores testados | Sim (cobertura de linhas 95,3% do módulo) | Sim |
| 6 | Estratégia de rollback documentada | Rollback do contrato (remover pasta aditiva) documentado; **rollback do shadow mode por configuração ainda não existe/documentado** | Parcial |
Fontes primárias consultadas: **0**; regras validadas: **0**.

## 2. Por que a comparação paralela não deve começar agora
- Sem as decisões, **não há critério aprovado** para classificar uma divergência como esperada ou problemática, nem para definir o que "equivalente" significa (ex.: D3 faixas etárias, D5 doses, D6 frequência, D7 máximos, D8 SMZ-TMP, D10 apresentação). A matriz de comparação ficaria correta tecnicamente, mas **sem referência clínica** para explicar divergências.
- Sem a contenção aprovada (D1/D2), o motor C continua com os comportamentos de risco já documentados (fallback adulto, regras pediátricas ignoradas, apresentação ignorada); o shadow compararia contra um motor que **ainda pode mudar**, invalidando a linha de base.
- Sem a aprovação técnica da RM-107.2, não há contrato congelado para servir de referência.

## 3. O que já está pronto e pode ser reaproveitado
- Corpus e sondas da RM-107.1/107.1.1 (70 execuções padrão; catálogo × 5 pacientes; 488 regras), arquivados em `docs/auditorias/RM-107.1/evidencias/`.
- Contrato, adaptadores, `compararRegras`, `detectarSobreposicoes` e `avaliarDose` (RM-107.2), sem consumidores nas telas.
- Importação por motor: 488 regras (A 54, B 32, C 402), 0 validadas.

## 4. Lacunas técnicas a resolver antes de implementar o shadow mode (sem efeitos nas telas)
1. **Registro isolado:** definir o destino do registro (arquivo/log local ou armazenamento próprio) sem tocar `rxItems`, `localStorage` de protocolos nem o backend.
2. **Chave de rollback por configuração** (ex.: flag desligada por padrão) e teste de que desligada o shadow não executa nada.
3. **Isolamento:** execução fora do caminho de renderização/estado da tela; erros do shadow capturados sem afetar a prescrição; sem mutação de dados dos motores.
4. **Taxonomia de divergências** (14 classes pedidas) mapeada para campos já existentes (`compararRegras`) e para resultados calculados (dose, dia, frequência, limites).
5. **Comparação de resultados calculados** (não só regras): ainda inexistente; exige um executor padronizado dos motores A, B, C e do contrato por caso do corpus.
6. **Equivalência:** definir formalmente que valores iguais não bastam (mesma unidade, base temporal, população, indicação, apresentação, estado da regra).
7. **Cenários sem dado clínico:** prematuros, função renal/hepática alterada e apresentações — os motores não têm esses insumos (IG/pós-menstrual, ajustes estruturados), então devem ser registrados como **"resultado não comparável"/"ausência de regra"**, sem inventar valores.

## 5. O que preciso de você
- Confirmação da **aprovação técnica da RM-107.2** (ou ajustes).
- Posição sobre a **RM-107.1.1**: autorizar a implementação da contenção (e quais decisões D1/D2/D3/D4/D10/D13 foram ou serão aprovadas formalmente) **ou** autorizar explicitamente o shadow mode **antes** da contenção, aceitando que a linha de base do motor C poderá mudar (nesse caso, as divergências seriam registradas como "motor C sem contenção").
- Autorização expressa para iniciar a RM-107.3.

## 6. Confirmações
Nenhum shadow mode foi implementado · nenhum motor/tela alterado · nenhuma dose alterada · nenhuma regra promovida a validada · nenhum commit, push ou deploy.
