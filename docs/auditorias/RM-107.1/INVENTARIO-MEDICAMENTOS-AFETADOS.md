# RM-107.1 — Inventário de medicamentos afetados por decisão

> Documental. **Só entram medicamentos cuja relação com a decisão foi demonstrada** por execução em modo leitura (`[EXEC]`), leitura de código (`[COD]`) ou dados cadastrados (`[DADO]`). Quando não foi possível demonstrar, consta **NÃO CONFIRMADO**. Nenhum medicamento foi inventado; nenhuma conclusão clínica é feita. Todas as decisões D1–D14 estão **PENDENTES**.

## 1. Índice cruzado (10 medicamentos com divergência documentada × decisões)
Marca "●" = relação demonstrada (ver `MATRIZ-DELIBERACAO-D1-D14.md`); "○" = presente nos dados mas **sem divergência demonstrada** nesta etapa; "—" = não aplicável / **NÃO CONFIRMADO**.

| Medicamento | Entidade | D1 | D2 | D3 | D4 | D5 | D6 | D7 | D8 | D9 | D10 | D12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cefalexina | `cefalexina` | ● | ● | ○ | ● | ● | ○ | ● | — | — | ○ | ● (A idoso; C texto) |
| Amoxicilina | `amoxicilina` | — | ● | ○ | ● (neonato) | ● | ● | ○ | — | ● (A neonato) | ● | ● |
| Amoxicilina + clavulanato | `amoxicilina_clavulanato` | — | ● | ○ | ○ (A e B ≈ 2 m) | ● | ● | ● | — | — | ● | ● |
| Ibuprofeno | `ibuprofeno` | — | ● | ○ | ● | ● | ● | ● | — | ● (PDA/neonato) | ○ | ● |
| Omeprazol | `omeprazol` | — | ● | ○ | ● | ● | ○ | ● | — | ○ | ○ | ○ |
| Dipirona | `dipirona` | — | ● | ○ | ● | ● | ● | ● | — | ● (< 90 d) | ○ | ○ |
| Sulfametoxazol + trimetoprima | `smz_tmp` (A `sulfametoxazol-trimetoprim`, B `smz-tmp`) | ● | ● | ○ | ○ (A e B ≈ 2 m) | ● | ○ | ○ | ● | ● (alerta B) | ○ | ● |
| Metformina | `metformina` | ● (regra ped. inutilizável) | ● | ○ | ● | — (B sem regra) | ○ | ● | — | — | ○ | ● |
| Paracetamol | `paracetamol` | — | ● | ○ | ○ | ● | ● | ● | — | ● | ○ | ○ |
| Azitromicina | `azitromicina` | — | ○ | ○ | ● (B ≥ 6 m; A/C sem mínimo estruturado) | ○ (dose diária igual; esquema difere) | ○ | ○ | — | — | ○ | ○ |
D3, D11 e D13 incidem sobre **todos** os medicamentos (classificação populacional, BSA/TFG, rótulos de interface).

## 2. Inventário por decisão

### D1 — Ausência de regra pediátrica
Arquivo completo (382 linhas): `evidencias/inventario-D1-por-medicamento.csv` (coluna `grupo_D1`).
| Grupo `[EXEC]` | Medicamentos | Com marca `uso_pediatrico = nao_aplicavel` no catálogo |
|---|---|---|
| D1-1 sem regra pediátrica — **calcula dose adulta sem bloqueio** (neonato 14 d, lactente 6 m, criança 4 a) | **207** | 55 |
| D1-2 sem regra pediátrica — frequência indeterminada, **bloqueia até confirmação** | 125 | 9 |
| D1-3 sem regra pediátrica — sem dose numérica ou com alerta crítico | 30 | 2 |
| D1-4 regra pediátrica **usada** pelo motor | 15 | 0 |
| D1-5 regra pediátrica cadastrada **não utilizável** → dose adulta | 5 (metformina, salbutamol, budesonida, montelucaste, vitamina K1 neonatal) | 0 |
| **Total** | **382** | 66 |
- Exemplos medidos: cefalexina, SMZ-TMP, metformina (ver matriz). Os 207 incluem, por categoria do catálogo: respiratório 35, cardiovascular 24, psiquiatria 23, antibiótico 19, anti-hipertensivo 17, hormônio 14, oncologia 13, antidiabético 10, neurológico 10, outros 42 (`catalogo-dose-calculator-por-paciente.csv`).
- Quais dos 207 têm uso pediátrico clínico previsto: **NÃO CONFIRMADO** (o campo `uso_pediatrico` existe só em 66; não é consultado pelo cálculo `[COD]`).
- Após confirmação manual da frequência (grupo D1-2): comportamento **`[COD]`**, não executado.

### D2 — Adolescentes
- A: 20 regras, **todas "adolescente + adulto"**: amoxicilina, amoxicilina + clavulanato, azitromicina, cefalexina, SMZ-TMP, paracetamol, ibuprofeno, dipirona, prednisona, salbutamol, montelucaste, atenolol, losartana, metformina, omeprazol, pramipexol, fenitoína (+ demais da lista da matriz) `[DADO]`.
- C: 20 medicamentos com `dose_pediatrica` (anlodipino, furosemida, metformina, salbutamol, budesonida, montelucaste, amoxicilina, amoxicilina + clavulanato, azitromicina, omeprazol, paracetamol, dipirona, prednisolona, cafeína citrato, poractanto alfa, vitamina K1 neonatal, palivizumabe, sildenafil neonatal, ibuprofeno, fenobarbital neonatal): **0 usam a regra pediátrica aos 14 anos** `[EXEC]`.
- B: sem classificação de adolescente; 30 de 32 indicações sem idade máxima `[DADO]`.

### D3 — Faixas etárias
- Regras por população em A `[DADO]`: neonato (amoxicilina, paracetamol, fenitoína); lactente (amoxicilina, amoxicilina + clavulanato, azitromicina, cefalexina, SMZ-TMP, paracetamol, dipirona, prednisona, salbutamol, montelucaste, omeprazol, fenitoína); pediátrico 1–11 a (esses 12 + ibuprofeno, losartana, metformina).
- C: todo o catálogo (382) classifica por `classifyPopulation` `[COD]`. B: 21 medicamentos/32 indicações por idade em meses `[DADO]`.
- Demonstrado `[EXEC]`: divergência 365–729 d (A pediátrico × C lactente) e conversão de meses (30 d × 365/12 d).

### D4 — Idade mínima
Demonstrado: dipirona, ibuprofeno, metformina, omeprazol, amoxicilina (neonato). Concordância A × B demonstrada (≈ 2 meses): amoxicilina + clavulanato, SMZ-TMP. Azitromicina: B ≥ 6 m; A/C sem mínimo estruturado `[DADO]`. Demais 372 medicamentos do catálogo: **NÃO CONFIRMADO** (C não tem faixa etária estruturada: 20 de 20 regras pediátricas em texto livre).
Restrições etárias estruturadas existentes `[DADO]`: A — 3 regras (`contraindicado_ate_dias`: amoxicilina + clavulanato 60 d; SMZ-TMP 60 d; dipirona 90 d); B — idade mínima por indicação (todas as 32) e alertas neonatais (`NEONATAL_ALERTS`, 10 entradas).

### D5 — Dose pediátrica por indicação e peso
Demonstrados: cefalexina, amoxicilina, amoxicilina + clavulanato, ibuprofeno, omeprazol, dipirona, SMZ-TMP, paracetamol. Sem divergência numérica demonstrada: azitromicina. Medicamentos com regra pediátrica só em B (11): ceftriaxona, metronidazol, fluconazol, aciclovir, oseltamivir, albendazol, ivermectina, ondansetrona, domperidona, lactulose, dexametasona — **divergência não demonstrada** (um só motor) `[DADO]`. Só em C (9): anlodipino, furosemida, budesonida, cafeína citrato, poractanto alfa, vitamina K1 neonatal, palivizumabe, sildenafil neonatal, fenobarbital neonatal — idem.
Achado adicional `[EXEC]`: 19 medicamentos com unidade de base temporal/peso/superfície tratada como por tomada no ramo adulto (lítio, tramadol, levetiracetam, isotretinoína, insulina degludeca, voriconazol, ivermectina, ciclosporina, cisplatina, paclitaxel, docetaxel, capecitabina, gencitabina, pemetrexede, doxorrubicina, ipilimumabe, bevacizumabe, succinilcolina, canabidiol) e 98 com `habitual` em faixa numérica (usa o primeiro número). Relevância clínica: **NÃO CONFIRMADO**.

### D6 — Frequência
Demonstrados: amoxicilina, ibuprofeno, paracetamol; adulto de paracetamol e dipirona em C (faixa → bloqueio); amoxicilina + clavulanato adulto em C (não distingue 8/8 × 12/12 h por apresentação). 125 medicamentos do catálogo bloqueiam por frequência indeterminada `[EXEC]` (D1-2).

### D7 — Dose máxima
Demonstrados: paracetamol, dipirona, omeprazol, metformina, ibuprofeno; também amoxicilina + clavulanato (A 2.000 mg/dia × B 875 mg/tomada × C 1.750 mg) e SMZ-TMP (A 320 mg/dia × B 12 mg/kg/dia). Campo `max` adulto sem período em 152 de 382 `[DADO]`; `max` adulto de C **não é aplicado** `[COD]`.

### D8 — SMZ-TMP
Apenas **sulfametoxazol + trimetoprima**. Outras associações: **NÃO CONFIRMADO** (não auditadas).

### D9 — Neonatologia/prematuridade
A: amoxicilina, paracetamol, fenitoína (regra neonato). B: ibuprofeno-PDA (0–1 m), aciclovir-neonatal (0–3 m); alertas neonatais para ceftriaxona, SMZ-TMP, dipirona, ibuprofeno, domperidona, metronidazol, fluconazol, aciclovir, `cafeine-citrate`, vancomicina. C: cafeína citrato, poractanto alfa, vitamina K1 neonatal, sildenafil neonatal, fenobarbital neonatal. Idade pós-menstrual e peso ao nascer: **inexistentes** em todos os motores `[COD]`.

### D10 — Arredondamento e apresentação
**266** medicamentos com ≥ 2 concentrações: dose independe da concentração selecionada (`[EXEC]`; colunas `d10_*` do CSV por paciente). Relevância clínica demonstrada: amoxicilina e amoxicilina + clavulanato. Demais 264: **NÃO CONFIRMADO**. A: `comprimidos_por_dose` fracionário sem arredondamento `[COD]`.

### D11 — BSA e função renal
BSA: 6 implementações; TFG/ClCr: 5 (+ CKD-EPI e MDRD) — nomes e arquivos na matriz (D11) `[COD]`. Medicamentos com dose dependente de BSA/TFG: C ped `mg/m²` (nenhum medicamento do catálogo com regra pediátrica `mg/m²` demonstrado) **NÃO CONFIRMADO**; B: entradas com `doseMgM2` (3 entradas `mg/m²`/`mcg`/faixa) `[DADO]`; no ramo adulto de C, 7 dos 207 têm unidade `mg/m²` (a relação com oncologia não foi classificada: **NÃO CONFIRMADO**) `[EXEC]`.

### D12 — Ajustes renal/hepático
A renal (10 regras): amoxicilina, amoxicilina + clavulanato (×2), cefalexina, SMZ-TMP, ibuprofeno, atenolol, losartana, metformina, pramipexol; A hepático: fenitoína. C: renal 364/382 e hepático 382/382 (texto) `[DADO]`. B: nenhum.

### D13 — Interface
`app/dosagem/page.tsx` (selos "Dose/tomada validada", "Dose diária validada"; blocos diretriz/evidência) e `components/modules/DoseCalcCard.tsx` ("Prescrição Sugerida", cartão/botão verdes) `[COD]`. Outras telas que exibam dose calculada: **NÃO CONFIRMADO** (varredura por esses textos só encontrou esses dois arquivos).

### D14 — Motores especializados
`palliative-engine`, `icu-engine`, `oncology-engine`, `geriatric-engine` (funções de dose/BSA/ClCr identificadas); `obstetric-engine`: **NÃO CONFIRMADO**. Medicamentos de oncologia no catálogo C entre os 207: 13 `[EXEC]`; paliativos/UTI: ver CSV (`categoria`).
