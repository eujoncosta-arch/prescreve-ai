# RM-101 — Auditoria dos NNH sem fonte

**Origem:** item 2 do roadmap. O `EVIDENCIA_DB` e o `WHATIF_DB` de `explainable-ai-v2.ts` carregavam valores de NNH
(number needed to harm) que nunca foram auditados.

## O que encontrei

14 valores numéricos de NNH: 5 no `EVIDENCIA_DB` (empagliflozina 500, dapagliflozina 400, metformina 200,
sacubitril/valsartana 50, rosuvastatina 10000) e 9 nos cenários do `WHATIF_DB` (50, 80, 200, 500 e repetições).

- **Nenhum tem fonte.**
- **Nenhum diz de qual dano é o número.** Um NNH só existe para um desfecho adverso definido (infecção genital, hipotensão,
  tosse, miopatia…); "NNH 500" sem desfecho não é um dado.
- Tentei computá-los a partir dos ensaios pivotais (PARADIGM-HF, EMPA-REG OUTCOME, DAPA-HF, DAPA-CKD, UKPDS 34): os
  resumos no PubMed **não trazem taxas de eventos adversos**, e os textos completos são pagos. Sem taxa verificável não há NNH honesto.

## O que mudou

- **`explainable-ai-v2.ts`**: os 14 valores foram removidos. O campo `nnh?` continua opcional nas duas interfaces e o
  comentário no `EVIDENCIA_DB` registra o motivo e pede que, quando houver fonte, o **desfecho de dano** seja registrado junto do número.
- **NNT intocado** (39, 21, 14, 50…), pois vem dos ensaios.
- A tela `/explicabilidade` já exibia o cartão NNH só quando o valor existe (`why.beneficio_risco.nnh &&`), então some sem quebrar nada.

## O que NÃO mudei

- `trust_score` dos cenários do `WHATIF_DB` (92, 88, 90…): é nota editorial sem método publicado (mesma pendência da RM-97).
- Os NNT dos cenários que não conferi nesta RM.
- Os campos `nnh` de `evidence-engine.ts`/`/evidence`: não têm valor numérico fixo no código (só o tipo).

## Para restaurar um NNH no futuro

1. Pegar do texto completo do ensaio a taxa do evento adverso nos dois braços (n de eventos / n de pacientes).
2. NNH = 1 / (taxa no tratamento − taxa no controle). Convenção conservadora: arredondar **para baixo** (mais dano).
3. Registrar o desfecho de dano e o horizonte de tempo ao lado do número.

## Testes

- **Novo** `rm101-nnh-sem-fonte-removido.test.ts` (5 testes): nenhum `nnh: <número>` no arquivo, campo ainda opcional, NNT intacto,
  comentário presente e cartão condicionado na tela.

## Gates

Mesmos da [RM-100](RM-100-AMOXICILINA-CLAVULANATO-POSOLOGIA-POR-APRESENTACAO.md): tsc limpo, lint 0, **82 arquivos / 1379 testes**, build 50/50.

---

Não foi feito commit, push ou deploy nesta RM.
