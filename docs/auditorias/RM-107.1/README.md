# RM-107.1 — Índice da documentação

> **Esta documentação NÃO representa aprovação clínica.** É auditoria e apoio à deliberação. **Todas as decisões D1–D14 estão PENDENTES.** Nenhuma regra, dose, motor, catálogo, calculadora ou tela foi alterado. Aprovação técnica ≠ validação clínica ≠ homologação regulatória.

## Documentos concluídos
| Arquivo | Finalidade |
|---|---|
| [RELATORIO-RM-107.1.md](RELATORIO-RM-107.1.md) | Relatório de auditoria dos 3 motores, contrato unificado proposto, migração, testes, riscos; inclui errata ao final |
| [MATRIZ-DELIBERACAO-D1-D14.md](MATRIZ-DELIBERACAO-D1-D14.md) | Levantamento por decisão (problema, afetados, comportamento, divergências, risco, ausências, fonte, testes) |
| [INVENTARIO-MEDICAMENTOS-AFETADOS.md](INVENTARIO-MEDICAMENTOS-AFETADOS.md) | Medicamentos afetados por decisão (demonstrado × NÃO CONFIRMADO) |
| [COMPARATIVO-TRES-MOTORES.md](COMPARATIVO-TRES-MOTORES.md) | Valores cadastrados nos motores A, B, C para 10 medicamentos (sem indicar dose correta) |
| [MATRIZ-DE-TESTES.md](MATRIZ-DE-TESTES.md) | Testes propostos por decisão (nenhum criado) |
| [MATRIZ-DE-FONTES-E-EVIDENCIAS.md](MATRIZ-DE-FONTES-E-EVIDENCIAS.md) | Estado das fontes por regra/divergência (0 consultadas, 0 validadas) |
| [LACUNAS-PARA-AVALIACAO-PROFISSIONAL.md](LACUNAS-PARA-AVALIACAO-PROFISSIONAL.md) | Lacunas por D1–D14 e tipo de decisão; riscos atuais de D1/D2 |
| [REGISTRO-DE-DECISOES-PENDENTES.md](REGISTRO-DE-DECISOES-PENDENTES.md) | Registro formal D1–D14, todos PENDENTE, campos de aprovação em branco |

## Documentos complementares (evidências em `evidencias/`)
- [contrato-unificado-proposto.md](evidencias/contrato-unificado-proposto.md) — especificação do contrato (não implementada).
- [divergencias-por-medicamento.md](evidencias/divergencias-por-medicamento.md) — divergências dos 8+2 medicamentos (com errata).
- [verificacoes-pontuais.json](evidencias/verificacoes-pontuais.json), [classificacao-etaria-comparada.json](evidencias/classificacao-etaria-comparada.json), [cobertura-engines.json](evidencias/cobertura-engines.json), [resultados-comparados-pacientes-padrao.json](evidencias/resultados-comparados-pacientes-padrao.json), [catalogo-dose-calculator-resumo.json](evidencias/catalogo-dose-calculator-resumo.json), [catalogo-uso-pediatrico-vs-calculo.json](evidencias/catalogo-uso-pediatrico-vs-calculo.json).
- Sondas de leitura arquivadas (`*.test.ts.txt`): `sonda-matriz`, `sonda-resultados-pacientes-padrao`, `sonda-catalogo-por-paciente`, `sonda-uso-pediatrico`, `sonda-inventario-D1`.
- Gates: `gate-tsc.txt`, `gate-lint.txt`, `gate-vitest.txt` (execução da auditoria anterior, antes desta etapa documental).

## Evidências CSV
- [matriz-regras-dose.csv](evidencias/matriz-regras-dose.csv) — 488 regras dos 3 motores (24+ campos).
- [catalogo-dose-calculator-por-paciente.csv](evidencias/catalogo-dose-calculator-por-paciente.csv) — 382 medicamentos × 5 pacientes-padrão no `dose-calculator`.
- [inventario-D1-por-medicamento.csv](evidencias/inventario-D1-por-medicamento.csv) — grupo D1 por medicamento (207/125/30/15/5).

## Relatórios de auditoria
RELATORIO-RM-107.1.md (técnico) · MATRIZ-DELIBERACAO-D1-D14.md (por decisão) · MATRIZ-DE-FONTES-E-EVIDENCIAS.md (fontes).

## Registro de decisões
REGISTRO-DE-DECISOES-PENDENTES.md — **D1–D14 PENDENTES**; responsável, data e justificativa em branco.

## Pendências documentais
1. Deliberação e preenchimento do registro de decisões (profissionais competentes).
2. Verificação de fontes primárias (nenhuma consultada nesta RM).
3. Itens marcados **NÃO CONFIRMADO** nas matrizes (ex.: uso pediátrico por medicamento, relevância clínica de 19 + 98 casos de base temporal/faixa, comparação numérica de BSA/TFG, motores especializados).

## Próxima etapa autorizável
Nenhuma é iniciada automaticamente. Dependem de **autorização expressa**: (a) deliberação clínica D1–D14; (b) RM-107.1.1 (contenção) **somente após** aprovação formal de D1/D2 e correlatos; (c) RM-107.2 (contrato) **somente após** autorização. Nada disso foi iniciado.
