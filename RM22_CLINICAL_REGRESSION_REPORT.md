# RM22_CLINICAL_REGRESSION_REPORT

**Gerado:** 2026-07-13T22:32:36.465Z · **Total:** 37 · **PASS:** 37 · **FAIL:** 0

| Categoria | PASS/Total |
|---|---|
| interacoes | 7/7 |
| contraindicacoes | 5/5 |
| gestantes | 3/3 |
| idosos | 3/3 |
| renal | 4/4 |
| pediatria | 4/4 |
| dose | 3/3 |
| controlados | 6/6 |
| hepatico | 2/2 |

### ✅ INT-01 · interacoes
- **Caso clínico:** Homem, 58 anos, angina estável em uso de nitrato; procura PS por disfunção erétil e recebe sildenafila.
- **Entrada:** moléculas: [Mononitrato de isossorbida, Sildenafila]
- **Resultado esperado:** Alerta CRÍTICO de hipotensão grave (nitrato + iPDE5).
- **Resultado obtido:** [critical] Nitrato + Sildenafila — Hipotensão grave potencialmente fatal
- **Status:** PASS

### ✅ INT-02 · interacoes
- **Caso clínico:** Mulher, 45 anos, transtorno bipolar em lítio; recebe hidroclorotiazida para HAS.
- **Entrada:** moléculas: [Litio, Hidroclorotiazida]
- **Resultado esperado:** Alerta de interação sinalizando toxicidade por lítio (tiazídico reduz excreção).
- **Resultado obtido:** [danger] Interação: Hidroclorotiazida + Carbonato de Lítio
- **Status:** PASS

### ✅ INT-03 · interacoes
- **Caso clínico:** Depressão em uso de IMAO; adiciona-se sertralina sem washout.
- **Entrada:** moléculas: [Fenelzina, Sertralina]
- **Resultado esperado:** Alerta CRÍTICO de síndrome serotoninérgica.
- **Resultado obtido:** [critical] IMAO + Sertralina — Síndrome serotoninérgica fatal
- **Status:** PASS

### ✅ INT-04 · interacoes
- **Caso clínico:** Paciente 65 anos, HAS + DM + DRC (TFG 25) em polifarmácia: dupla inibição SRAA + ARM + metformina.
- **Entrada:** moléculas: [Enalapril, Losartana, Metformina, Espironolactona]; idoso; TFG 25; K+ 5,4
- **Resultado esperado:** Múltiplos alertas (≥ 3), incluindo ao menos 1 CRÍTICO (ARM contraindicado por K+/TFG) e a dupla inibição SRAA.
- **Resultado obtido:** 7 alertas — [critical] ARM CONTRAINDICADO — K+ 5.4 mEq/L + TFG < 45 mL/min · [danger] Interação: Enalapril + Losartana · [danger] Ajuste renal necessário: Metformina · [danger] Ajuste renal necessário: Espironolactona · [warning] Interação: Enalapril + Espironolactona · [warning] Interação: Losartana + Espironolactona · [warning] IECA + Espironolactona — Hipercalemia
- **Status:** PASS

### ✅ CON-01 · contraindicacoes
- **Caso clínico:** Adolescente com asma em uso de montelucaste.
- **Entrada:** moléculas: [Montelucaste]
- **Resultado esperado:** Alerta do Black Box FDA 2020 (risco neuropsiquiátrico).
- **Resultado obtido:** [warning] Montelucaste — Alerta FDA 2020: Risco neuropsiquiátrico (Black Box)
- **Status:** PASS

### ✅ CON-02 · contraindicacoes
- **Caso clínico:** IC-FEr, inicia espironolactona sem dosar K+ sérico.
- **Entrada:** moléculas: [Espironolactona] (sem K+ informado)
- **Resultado esperado:** Alerta para verificar K+ antes de iniciar ARM (KDIGO/ESC).
- **Resultado obtido:** [warning] ARM prescrito — verificar K+ sérico antes do início
- **Status:** PASS

### ✅ CON-03 · contraindicacoes
- **Caso clínico:** DRC (TFG 40) com K+ 5,6 mEq/L; prescrição de espironolactona.
- **Entrada:** moléculas: [Espironolactona]; TFG 40; K+ 5,6
- **Resultado esperado:** ARM CONTRAINDICADO (hipercalemia + TFG baixa) — alerta CRÍTICO.
- **Resultado obtido:** [critical] ARM CONTRAINDICADO — K+ 5.6 mEq/L + TFG < 45 mL/min
- **Status:** PASS

### ✅ GES-01 · gestantes
- **Caso clínico:** Gestante 1º trimestre, HAS crônica em uso de enalapril.
- **Entrada:** moléculas: [Enalapril]; gestante
- **Resultado esperado:** Contraindicado na gestação (IECA — fetotoxicidade) — alerta CRÍTICO.
- **Resultado obtido:** [critical] Contraindicado na gestação: Enalapril
- **Status:** PASS

### ✅ GES-02 · gestantes
- **Caso clínico:** Gestante em anticoagulação com varfarina.
- **Entrada:** moléculas: [Varfarina]; gestante
- **Resultado esperado:** Alerta de gestação (varfarina — teratogênica/risco).
- **Resultado obtido:** [critical] Contraindicado na gestação: Varfarina
- **Status:** PASS

### ✅ GES-03 · gestantes
- **Caso clínico:** Mulher em idade fértil com acne grave usando isotretinoína, engravida.
- **Entrada:** moléculas: [Isotretinoína]; gestante
- **Resultado esperado:** Alerta de gestação (isotretinoína — altamente teratogênica).
- **Resultado obtido:** [critical] Contraindicado na gestação: Isotretinoína
- **Status:** PASS

### ✅ IDO-01 · idosos
- **Caso clínico:** Idoso, 78 anos, insônia/depressão em uso de amitriptilina.
- **Entrada:** checkBeersCriteria(Amitriptilina)
- **Resultado esperado:** Critério de Beers presente (anticolinérgico — evitar em idosos).
- **Resultado obtido:** ⚠ Beers: Anticolinérgico — confusão, retenção urinária, constipação, hipotensão em idosos.
- **Status:** PASS

### ✅ IDO-02 · idosos
- **Caso clínico:** Idosa, 82 anos, ansiedade em uso crônico de diazepam.
- **Entrada:** checkBeersCriteria(Diazepam)
- **Resultado esperado:** Critério de Beers presente (BZD de longa ação — quedas/sedação).
- **Resultado obtido:** ⚠ Beers: Benzodiazepínico de longa duração — evitar em idosos (meia-vida prolongada).
- **Status:** PASS

### ✅ IDO-03 · idosos
- **Caso clínico:** Classificação populacional de paciente de 70 anos.
- **Entrada:** classifyPopulation(70)
- **Resultado esperado:** population=geriatrico e alerta_beers=true.
- **Resultado obtido:** geriatrico · beers=true
- **Status:** PASS

### ✅ REN-01 · renal
- **Caso clínico:** DM2 com DRC avançada (TFG 10) mantendo metformina.
- **Entrada:** moléculas: [Metformina]; TFG 10
- **Resultado esperado:** Contraindicado na IR grave — alerta CRÍTICO (acidose lática).
- **Resultado obtido:** [critical] Contraindicado na insuficiência renal grave: Metformina
- **Status:** PASS

### ✅ REN-02 · renal
- **Caso clínico:** Oncologia: pemetrexede em paciente com TFG 20.
- **Entrada:** moléculas: [Pemetrexede]; TFG 20
- **Resultado esperado:** Ajuste/contraindicação renal — alerta (ClCr < 30).
- **Resultado obtido:** [danger] Ajuste renal necessário: pemetrexede
- **Status:** PASS

### ✅ REN-03 · renal
- **Caso clínico:** Paciente com função renal normal (TFG 90) em metformina — não deve gerar alerta renal.
- **Entrada:** moléculas: [Metformina]; TFG 90
- **Resultado esperado:** Sem alerta renal (controle negativo).
- **Resultado obtido:** sem alerta renal
- **Status:** PASS

### ✅ PED-01 · pediatria
- **Caso clínico:** Criança 4 anos, 15 kg, febre — cálculo de dose pediátrica de paracetamol.
- **Entrada:** calcDosePediatrica('paracetamol', { pesoKg: 15, idadeMeses: 48 })
- **Resultado esperado:** Dose pediátrica calculada (> 0 mg) e não-nula.
- **Resultado obtido:** 225 mg/dose (15 mg/kg) (a cada 4–6h)
- **Status:** PASS

### ✅ PED-02 · pediatria
- **Caso clínico:** Criança 5 anos, 20 kg, otite — dose pediátrica de amoxicilina.
- **Entrada:** calcDosePediatrica('amoxicilina', { pesoKg: 20, idadeMeses: 60 })
- **Resultado esperado:** Dose pediátrica calculada e não-nula.
- **Resultado obtido:** 1000 mg/dia
- **Status:** PASS

### ✅ PED-03 · pediatria
- **Caso clínico:** Fármaco de uso adulto (tadalafila) — deve estar marcado como não aplicável a pediatria.
- **Entrada:** drugRepository.getById('tadalafila').pediatricUse
- **Resultado esperado:** pediatricUse === 'nao_aplicavel' (RM-01 BAIXO-01).
- **Resultado obtido:** pediatricUse=nao_aplicavel
- **Status:** PASS

### ✅ DOS-01 · dose
- **Caso clínico:** Prescrição pediátrica acima do teto (200 mg/kg/dia, 20 kg) — sistema deve limitar à dose máxima.
- **Entrada:** calcWeightDose(200, 20, 3, 1500, "mg")
- **Resultado esperado:** Dose total capada em 1500 mg/dia (não 4000).
- **Resultado obtido:** dose_total_dia=1500 mg
- **Status:** PASS

### ✅ DOS-02 · dose
- **Caso clínico:** Prescrição pediátrica dentro do teto (50 mg/kg/dia, 10 kg) — sem capagem.
- **Entrada:** calcWeightDose(50, 10, 2, 1500, "mg")
- **Resultado esperado:** Dose total = 500 mg/dia, 250 mg por tomada (12/12h).
- **Resultado obtido:** 500 mg/dia · 250 mg/dose
- **Status:** PASS

### ✅ CTR-01 · controlados
- **Caso clínico:** Opioide forte (morfina) em dor oncológica — deve ser reconhecido como controlado e existir na base.
- **Entrada:** isControlled(Morfina) + drugRepository.getByActiveIngredient(morfina)
- **Resultado esperado:** Controlado (Notificação A) e presente na Single Source of Truth.
- **Resultado obtido:** controlado=true · na base=true
- **Status:** PASS

### ✅ CTR-02 · controlados
- **Caso clínico:** Benzodiazepínico (clonazepam) — reconhecimento de controle especial (Notificação B).
- **Entrada:** isControlled(Clonazepam)
- **Resultado esperado:** Controlado = true.
- **Resultado obtido:** controlado=true
- **Status:** PASS

### ✅ CTR-03 · controlados
- **Caso clínico:** Anti-hipertensivo comum (losartana) — NÃO deve ser classificado como controlado (controle negativo).
- **Entrada:** isControlled(Losartana)
- **Resultado esperado:** Controlado = false.
- **Resultado obtido:** controlado=false
- **Status:** PASS

### ✅ CTR-04 · controlados
- **Caso clínico:** Psicoestimulante (metilfenidato) para TDAH — controle especial (Notificação A).
- **Entrada:** isControlled(Metilfenidato)
- **Resultado esperado:** Controlado = true.
- **Resultado obtido:** controlado=true
- **Status:** PASS

### ✅ INT-05 · interacoes
- **Caso clínico:** ITU tratada com azitromicina em paciente cardiopata usando amiodarona.
- **Entrada:** moléculas: [Azitromicina, Amiodarona]
- **Resultado esperado:** Alerta de interação azitromicina + amiodarona (risco de QT/torsades).
- **Resultado obtido:** [danger] Interação: Azitromicina + Amiodarona
- **Status:** PASS

### ✅ INT-06 · interacoes
- **Caso clínico:** DM2 em metformina agendado para TC com contraste iodado.
- **Entrada:** moléculas: [Metformina, Contraste iodado]
- **Resultado esperado:** Alerta de risco de acidose lática (suspender metformina).
- **Resultado obtido:** [warning] Metformina + Contraste iodado — Risco de acidose lática
- **Status:** PASS

### ✅ INT-07 · interacoes
- **Caso clínico:** Depressão em escitalopram; adiciona-se tramadol para dor.
- **Entrada:** moléculas: [Escitalopram, Tramadol]
- **Resultado esperado:** Alerta de síndrome serotoninérgica.
- **Resultado obtido:** [danger] Interação: Escitalopram + Tramadol · [danger] ISRS + Tramadol — Síndrome serotoninérgica
- **Status:** PASS

### ✅ DUP-01 · contraindicacoes
- **Caso clínico:** Prescrição simultânea de dois IECA (enalapril + ramipril).
- **Entrada:** moléculas: [Enalapril, Ramipril]
- **Resultado esperado:** Alerta de duplicidade terapêutica (mesma classe IECA).
- **Resultado obtido:** [warning] Duplicidade terapêutica: IECA
- **Status:** PASS

### ✅ LAC-01 · contraindicacoes
- **Caso clínico:** Puérpera amamentando em uso de amiodarona.
- **Entrada:** moléculas: [Amiodarona]; lactante
- **Resultado esperado:** Alerta de risco na amamentação.
- **Resultado obtido:** [danger] Risco na amamentação: Amiodarona
- **Status:** PASS

### ✅ REN-04 · renal
- **Caso clínico:** Dor em paciente com DRC grave (TFG 10) recebendo codeína.
- **Entrada:** moléculas: [Codeína]; TFG 10
- **Resultado esperado:** Alerta renal CRÍTICO (metabólitos ativos acumulam).
- **Resultado obtido:** [critical] Contraindicado na insuficiência renal grave: codeína
- **Status:** PASS

### ✅ HEP-01 · hepatico
- **Caso clínico:** Cirrose Child C — metotrexato oncológico.
- **Entrada:** drugRepository.getById('metotrexato-onco') → dosageRule hepático (Child C)
- **Resultado esperado:** Child C contraindicado (hepatotoxicidade).
- **Resultado obtido:** Child C: Contraindicado (hepatotoxicidade)
- **Status:** PASS

### ✅ HEP-02 · hepatico
- **Caso clínico:** Toda a base deve ter ajuste hepático cadastrado (cobertura RM-01 MED-03).
- **Entrada:** drugRepository.getAll() → dosageRules com population hepatico
- **Resultado esperado:** 100% das entidades possuem regra hepática.
- **Resultado obtido:** 355/355 com ajuste hepático
- **Status:** PASS

### ✅ PED-04 · pediatria
- **Caso clínico:** Recém-nascido (7 dias) — classificação populacional neonatal.
- **Entrada:** classifyPopulation(0.02)
- **Resultado esperado:** population=neonato, usar_dose_pediatrica=true.
- **Resultado obtido:** neonato · ped=true
- **Status:** PASS

### ✅ CTR-05 · controlados
- **Caso clínico:** Fentanila em UTI (variante de contexto) — reconhecimento por sufixo.
- **Entrada:** isControlled(fentanil-uti)
- **Resultado esperado:** Controlado = true (tolera sufixo de contexto).
- **Resultado obtido:** controlado=true
- **Status:** PASS

### ✅ CTR-06 · controlados
- **Caso clínico:** Analgésico comum (paracetamol) — NÃO controlado (controle negativo).
- **Entrada:** isControlled(Paracetamol)
- **Resultado esperado:** Controlado = false.
- **Resultado obtido:** controlado=false
- **Status:** PASS

### ✅ DOS-03 · dose
- **Caso clínico:** Antibiótico 100 mg/kg/dia, 12 kg, 6/6h, teto 4000 mg — cálculo por peso.
- **Entrada:** calcWeightDose(100, 12, 4, 4000, "mg")
- **Resultado esperado:** Total 1200 mg/dia; 300 mg por dose (6/6h).
- **Resultado obtido:** 1200 mg/dia · 300 mg/dose
- **Status:** PASS
