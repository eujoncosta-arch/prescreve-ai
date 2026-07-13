// ============================================================
// PRESCREVE-AI — RM-22: Casos de regressão clínica (8 categorias)
// ============================================================

import { drugRepository } from '@/lib/pharma-core';
import { calcDosePediatrica } from '@/lib/pediatric-engine';
import { calcWeightDose, checkBeersCriteria, classifyPopulation } from '@/lib/dose-calculator';
import { isControlled } from './controlled-substances';
import { type ClinicalCase, safety, expectAlert, expectTrue } from './framework';

export const CLINICAL_CASES: ClinicalCase[] = [
  // ══════════════════════ INTERAÇÕES ══════════════════════
  {
    id: 'INT-01',
    category: 'interacoes',
    caso: 'Homem, 58 anos, angina estável em uso de nitrato; procura PS por disfunção erétil e recebe sildenafila.',
    entrada: 'moléculas: [Mononitrato de isossorbida, Sildenafila]',
    esperado: 'Alerta CRÍTICO de hipotensão grave (nitrato + iPDE5).',
    assert: () => expectAlert(safety({ moleculas: ['Mononitrato de isossorbida', 'Sildenafila'] }), {
      severidade: 'critical',
      match: 'hipotens',
    }),
  },
  {
    id: 'INT-02',
    category: 'interacoes',
    caso: 'Mulher, 45 anos, transtorno bipolar em lítio; recebe hidroclorotiazida para HAS.',
    entrada: 'moléculas: [Litio, Hidroclorotiazida]',
    esperado: 'Alerta de interação sinalizando toxicidade por lítio (tiazídico reduz excreção).',
    assert: () => expectAlert(safety({ moleculas: ['Litio', 'Hidroclorotiazida'] }), {
      tipo: 'interacao',
      match: 'lítio',
    }),
  },
  {
    id: 'INT-03',
    category: 'interacoes',
    caso: 'Depressão em uso de IMAO; adiciona-se sertralina sem washout.',
    entrada: 'moléculas: [Fenelzina, Sertralina]',
    esperado: 'Alerta CRÍTICO de síndrome serotoninérgica.',
    assert: () => expectAlert(safety({ moleculas: ['Fenelzina', 'Sertralina'] }), {
      severidade: 'critical',
      match: 'serotonin',
    }),
  },
  {
    id: 'INT-04',
    category: 'interacoes',
    caso: 'Paciente 65 anos, HAS + DM + DRC (TFG 25) em polifarmácia: dupla inibição SRAA + ARM + metformina.',
    entrada: 'moléculas: [Enalapril, Losartana, Metformina, Espironolactona]; idoso; TFG 25; K+ 5,4',
    esperado: 'Múltiplos alertas (≥ 3), incluindo ao menos 1 CRÍTICO (ARM contraindicado por K+/TFG) e a dupla inibição SRAA.',
    assert: () => {
      const alerts = safety({
        moleculas: ['Enalapril', 'Losartana', 'Metformina', 'Espironolactona'],
        idoso: true,
        crclValue: 25,
        potassiumLevel: 5.4,
      });
      const temCritico = alerts.some((a) => a.severidade === 'critical');
      const temSraa = alerts.some((a) => /enalapril \+ losartana|duplo bloqueio/i.test(a.titulo));
      const ok = alerts.length >= 3 && temCritico && temSraa;
      return {
        obtido: `${alerts.length} alertas — ${alerts.map((a) => `[${a.severidade}] ${a.titulo}`).join(' · ')}`,
        status: ok ? 'PASS' : 'FAIL',
      };
    },
  },

  // ══════════════════════ CONTRAINDICAÇÕES ══════════════════════
  {
    id: 'CON-01',
    category: 'contraindicacoes',
    caso: 'Adolescente com asma em uso de montelucaste.',
    entrada: 'moléculas: [Montelucaste]',
    esperado: 'Alerta do Black Box FDA 2020 (risco neuropsiquiátrico).',
    assert: () => expectAlert(safety({ moleculas: ['Montelucaste'] }), { match: 'montelucaste' }),
  },
  {
    id: 'CON-02',
    category: 'contraindicacoes',
    caso: 'IC-FEr, inicia espironolactona sem dosar K+ sérico.',
    entrada: 'moléculas: [Espironolactona] (sem K+ informado)',
    esperado: 'Alerta para verificar K+ antes de iniciar ARM (KDIGO/ESC).',
    assert: () => expectAlert(safety({ moleculas: ['Espironolactona'] }), { tipo: 'contraind', match: 'k+' }),
  },
  {
    id: 'CON-03',
    category: 'contraindicacoes',
    caso: 'DRC (TFG 40) com K+ 5,6 mEq/L; prescrição de espironolactona.',
    entrada: 'moléculas: [Espironolactona]; TFG 40; K+ 5,6',
    esperado: 'ARM CONTRAINDICADO (hipercalemia + TFG baixa) — alerta CRÍTICO.',
    assert: () => expectAlert(safety({ moleculas: ['Espironolactona'], crclValue: 40, potassiumLevel: 5.6 }), {
      severidade: 'critical',
      match: 'contraindicado',
    }),
  },

  // ══════════════════════ GESTANTES ══════════════════════
  {
    id: 'GES-01',
    category: 'gestantes',
    caso: 'Gestante 1º trimestre, HAS crônica em uso de enalapril.',
    entrada: 'moléculas: [Enalapril]; gestante',
    esperado: 'Contraindicado na gestação (IECA — fetotoxicidade) — alerta CRÍTICO.',
    assert: () => expectAlert(safety({ moleculas: ['Enalapril'], gestante: true }), {
      tipo: 'gestante',
      severidade: 'critical',
    }),
  },
  {
    id: 'GES-02',
    category: 'gestantes',
    caso: 'Gestante em anticoagulação com varfarina.',
    entrada: 'moléculas: [Varfarina]; gestante',
    esperado: 'Alerta de gestação (varfarina — teratogênica/risco).',
    assert: () => expectAlert(safety({ moleculas: ['Varfarina'], gestante: true }), { tipo: 'gestante' }),
  },
  {
    id: 'GES-03',
    category: 'gestantes',
    caso: 'Mulher em idade fértil com acne grave usando isotretinoína, engravida.',
    entrada: 'moléculas: [Isotretinoína]; gestante',
    esperado: 'Alerta de gestação (isotretinoína — altamente teratogênica).',
    assert: () => expectAlert(safety({ moleculas: ['Isotretinoína'], gestante: true }), { tipo: 'gestante' }),
  },

  // ══════════════════════ IDOSOS ══════════════════════
  {
    id: 'IDO-01',
    category: 'idosos',
    caso: 'Idoso, 78 anos, insônia/depressão em uso de amitriptilina.',
    entrada: 'checkBeersCriteria(Amitriptilina)',
    esperado: 'Critério de Beers presente (anticolinérgico — evitar em idosos).',
    assert: () => {
      const beers = checkBeersCriteria('Amitriptilina');
      return expectTrue(!!beers, beers ?? '(sem alerta Beers)');
    },
  },
  {
    id: 'IDO-02',
    category: 'idosos',
    caso: 'Idosa, 82 anos, ansiedade em uso crônico de diazepam.',
    entrada: 'checkBeersCriteria(Diazepam)',
    esperado: 'Critério de Beers presente (BZD de longa ação — quedas/sedação).',
    assert: () => {
      const beers = checkBeersCriteria('Diazepam');
      return expectTrue(!!beers, beers ?? '(sem alerta Beers)');
    },
  },
  {
    id: 'IDO-03',
    category: 'idosos',
    caso: 'Classificação populacional de paciente de 70 anos.',
    entrada: 'classifyPopulation(70)',
    esperado: 'population=geriatrico e alerta_beers=true.',
    assert: () => {
      const p = classifyPopulation(70);
      return expectTrue(p.population === 'geriatrico' && p.alerta_beers === true, `${p.population} · beers=${p.alerta_beers}`);
    },
  },

  // ══════════════════════ INSUFICIÊNCIA RENAL ══════════════════════
  {
    id: 'REN-01',
    category: 'renal',
    caso: 'DM2 com DRC avançada (TFG 10) mantendo metformina.',
    entrada: 'moléculas: [Metformina]; TFG 10',
    esperado: 'Contraindicado na IR grave — alerta CRÍTICO (acidose lática).',
    assert: () => expectAlert(safety({ moleculas: ['Metformina'], crclValue: 10 }), {
      tipo: 'renal',
      severidade: 'critical',
    }),
  },
  {
    id: 'REN-02',
    category: 'renal',
    caso: 'Oncologia: pemetrexede em paciente com TFG 20.',
    entrada: 'moléculas: [Pemetrexede]; TFG 20',
    esperado: 'Ajuste/contraindicação renal — alerta (ClCr < 30).',
    assert: () => expectAlert(safety({ moleculas: ['Pemetrexede'], crclValue: 20 }), { tipo: 'renal' }),
  },
  {
    id: 'REN-03',
    category: 'renal',
    caso: 'Paciente com função renal normal (TFG 90) em metformina — não deve gerar alerta renal.',
    entrada: 'moléculas: [Metformina]; TFG 90',
    esperado: 'Sem alerta renal (controle negativo).',
    assert: () => {
      const alerts = safety({ moleculas: ['Metformina'], crclValue: 90 });
      const renal = alerts.find((a) => a.tipo === 'renal');
      return expectTrue(!renal, renal ? `[${renal.severidade}] ${renal.titulo}` : 'sem alerta renal');
    },
  },

  // ══════════════════════ PEDIATRIA ══════════════════════
  {
    id: 'PED-01',
    category: 'pediatria',
    caso: 'Criança 4 anos, 15 kg, febre — cálculo de dose pediátrica de paracetamol.',
    entrada: "calcDosePediatrica('paracetamol', { pesoKg: 15, idadeMeses: 48 })",
    esperado: 'Dose pediátrica calculada (> 0 mg) e não-nula.',
    assert: () => {
      const r = calcDosePediatrica('paracetamol', { pesoKg: 15, idadeMeses: 48 });
      return expectTrue(!!r && (r.doseUnitariaMg ?? 0) > 0, r ? `${r.doseUnitariaTexto} (${r.frequenciaTexto})` : 'null');
    },
  },
  {
    id: 'PED-02',
    category: 'pediatria',
    caso: 'Criança 5 anos, 20 kg, otite — dose pediátrica de amoxicilina.',
    entrada: "calcDosePediatrica('amoxicilina', { pesoKg: 20, idadeMeses: 60 })",
    esperado: 'Dose pediátrica calculada e não-nula.',
    assert: () => {
      const r = calcDosePediatrica('amoxicilina', { pesoKg: 20, idadeMeses: 60 });
      return expectTrue(!!r && (r.doseTotalDiaMg ?? 0) > 0, r ? r.doseTotalDiaTexto : 'null');
    },
  },
  {
    id: 'PED-03',
    category: 'pediatria',
    caso: 'Fármaco de uso adulto (tadalafila) — deve estar marcado como não aplicável a pediatria.',
    entrada: "drugRepository.getById('tadalafila').pediatricUse",
    esperado: "pediatricUse === 'nao_aplicavel' (RM-01 BAIXO-01).",
    assert: () => {
      const e = drugRepository.getById('tadalafila');
      return expectTrue(e?.pediatricUse === 'nao_aplicavel', `pediatricUse=${e?.pediatricUse ?? 'undefined'}`);
    },
  },

  // ══════════════════════ DOSE INCORRETA ══════════════════════
  {
    id: 'DOS-01',
    category: 'dose',
    caso: 'Prescrição pediátrica acima do teto (200 mg/kg/dia, 20 kg) — sistema deve limitar à dose máxima.',
    entrada: 'calcWeightDose(200, 20, 3, 1500, "mg")',
    esperado: 'Dose total capada em 1500 mg/dia (não 4000).',
    assert: () => {
      const r = calcWeightDose(200, 20, 3, 1500, 'mg');
      return expectTrue(r.dose_total_dia === 1500, `dose_total_dia=${r.dose_total_dia} mg`);
    },
  },
  {
    id: 'DOS-02',
    category: 'dose',
    caso: 'Prescrição pediátrica dentro do teto (50 mg/kg/dia, 10 kg) — sem capagem.',
    entrada: 'calcWeightDose(50, 10, 2, 1500, "mg")',
    esperado: 'Dose total = 500 mg/dia, 250 mg por tomada (12/12h).',
    assert: () => {
      const r = calcWeightDose(50, 10, 2, 1500, 'mg');
      return expectTrue(r.dose_total_dia === 500 && r.dose_por_tomada === 250, `${r.dose_total_dia} mg/dia · ${r.dose_por_tomada} mg/dose`);
    },
  },

  // ══════════════════════ MEDICAMENTOS CONTROLADOS ══════════════════════
  {
    id: 'CTR-01',
    category: 'controlados',
    caso: 'Opioide forte (morfina) em dor oncológica — deve ser reconhecido como controlado e existir na base.',
    entrada: 'isControlled(Morfina) + drugRepository.getByActiveIngredient(morfina)',
    esperado: 'Controlado (Notificação A) e presente na Single Source of Truth.',
    assert: () => {
      const ctrl = isControlled('Morfina');
      const exists = drugRepository.getByActiveIngredient('morfina').length > 0;
      return expectTrue(ctrl && exists, `controlado=${ctrl} · na base=${exists}`);
    },
  },
  {
    id: 'CTR-02',
    category: 'controlados',
    caso: 'Benzodiazepínico (clonazepam) — reconhecimento de controle especial (Notificação B).',
    entrada: 'isControlled(Clonazepam)',
    esperado: 'Controlado = true.',
    assert: () => expectTrue(isControlled('Clonazepam'), `controlado=${isControlled('Clonazepam')}`),
  },
  {
    id: 'CTR-03',
    category: 'controlados',
    caso: 'Anti-hipertensivo comum (losartana) — NÃO deve ser classificado como controlado (controle negativo).',
    entrada: 'isControlled(Losartana)',
    esperado: 'Controlado = false.',
    assert: () => expectTrue(!isControlled('Losartana'), `controlado=${isControlled('Losartana')}`),
  },
  {
    id: 'CTR-04',
    category: 'controlados',
    caso: 'Psicoestimulante (metilfenidato) para TDAH — controle especial (Notificação A).',
    entrada: 'isControlled(Metilfenidato)',
    esperado: 'Controlado = true.',
    assert: () => expectTrue(isControlled('Metilfenidato'), `controlado=${isControlled('Metilfenidato')}`),
  },
];
