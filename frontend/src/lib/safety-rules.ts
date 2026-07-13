// ============================================================
// PRESCREVE-AI — Motor de Verificação de Segurança Rápida
// Interações, duplicidade, contraindicações, limites de dose
// ============================================================

// RM-06: consome exclusivamente a Single Source of Truth (Drug Repository Layer),
// sem importar as bases legadas. A forma `SafeDrug` adapta a DrugEntity canônica
// aos campos usados por este motor, preservando o algoritmo original 1:1.
import { drugRepository } from './pharma-core';
import type { DrugEntity, InteractionSeverity } from './pharma-core';

export type AlertSeverityFast = 'info' | 'warning' | 'danger' | 'critical';

/** Projeção mínima da DrugEntity usada pelo motor de segurança. */
interface SafeDrug {
  id: string;
  molecula: string;
  classe: string;
  sinonimos: string[];
  interacoes_importantes: { com: string; severidade: InteractionSeverity; descricao: string }[];
  uso_gestante: string;
  uso_lactante: string;
  alertas_especiais: string[];
  ajuste_renal?: { tfg_lt_15: string; tfg_30_15: string };
}

function toSafeDrug(e: DrugEntity): SafeDrug {
  const renal = e.dosageRules.find((r) => r.population === 'renal');
  return {
    id: e.id,
    molecula: e.activeIngredient.name,
    classe: e.therapeuticClass,
    sinonimos: e.activeIngredient.sinonimos ?? [],
    interacoes_importantes: e.interactions.map((i) => ({
      com: i.with,
      severidade: i.severity,
      descricao: i.description,
    })),
    uso_gestante: e.pregnancy,
    uso_lactante: e.lactation,
    alertas_especiais: e.alerts,
    ajuste_renal: renal?.detail
      ? {
          tfg_lt_15: String(renal.detail.tfg_lt_15 ?? ''),
          tfg_30_15: String(renal.detail.tfg_30_15 ?? ''),
        }
      : undefined,
  };
}

/** Resolve uma molécula (por DCB, nome genérico ou sinônimo) via repositório canônico. */
function resolveSafeDrug(m: string): SafeDrug | null {
  const target = m.toLowerCase().trim();
  const e = drugRepository.getAll().find(
    (x) =>
      x.activeIngredient.name.toLowerCase() === target ||
      x.activeIngredient.fullName?.toLowerCase() === target ||
      (x.activeIngredient.sinonimos ?? []).some((s) => s.toLowerCase() === target),
  );
  return e ? toSafeDrug(e) : null;
}

export interface QuickSafetyAlert {
  id: string;
  tipo: 'interacao' | 'duplicidade' | 'contraind' | 'gestante' | 'lactante' | 'geriatria' | 'dose' | 'renal';
  severidade: AlertSeverityFast;
  titulo: string;
  descricao: string;
  acao: string;
}

export interface SafetyCheckInput {
  moleculas: string[];
  gestante?: boolean;
  lactante?: boolean;
  idoso?: boolean; // > 65 anos
  crclValue?: number;
  potassiumLevel?: number; // K+ sérico em mEq/L — necessário para verificar risco ARM
}

export function runSafetyCheck(input: SafetyCheckInput): QuickSafetyAlert[] {
  const alerts: QuickSafetyAlert[] = [];
  const { moleculas, gestante, lactante, idoso, crclValue, potassiumLevel } = input;

  // Busca dados das moléculas na Single Source of Truth (Drug Repository)
  const drugs: SafeDrug[] = moleculas
    .map(m => resolveSafeDrug(m))
    .filter(Boolean) as SafeDrug[];

  // ── 1. Interações medicamentosas ──────────────────────────
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const a = drugs[i];
      const b = drugs[j];

      // Verifica interação de A com B
      const interAB = a.interacoes_importantes.find(
        inter => b.molecula.toLowerCase().includes(inter.com.toLowerCase()) ||
          inter.com.toLowerCase().includes(b.molecula.toLowerCase())
      );
      if (interAB) {
        const sev: AlertSeverityFast =
          interAB.severidade === 'contraindicado' ? 'critical' :
          interAB.severidade === 'grave' ? 'danger' :
          interAB.severidade === 'moderada' ? 'warning' : 'info';

        alerts.push({
          id: `inter-${a.id}-${b.id}`,
          tipo: 'interacao',
          severidade: sev,
          titulo: `Interação: ${a.molecula} + ${b.molecula}`,
          descricao: interAB.descricao,
          acao: interAB.severidade === 'contraindicado'
            ? 'Combinação CONTRAINDICADA — substituir um dos medicamentos'
            : interAB.severidade === 'grave'
            ? 'Avaliar necessidade de substituição ou monitoramento rigoroso'
            : 'Monitorar clinicamente e laboratorialmente',
        });
      }

      // Verifica interação de B com A (bidirecional)
      const interBA = b.interacoes_importantes.find(
        inter => a.molecula.toLowerCase().includes(inter.com.toLowerCase()) ||
          inter.com.toLowerCase().includes(a.molecula.toLowerCase())
      );
      if (interBA && !interAB) {
        const sev: AlertSeverityFast =
          interBA.severidade === 'contraindicado' ? 'critical' :
          interBA.severidade === 'grave' ? 'danger' :
          interBA.severidade === 'moderada' ? 'warning' : 'info';
        alerts.push({
          id: `inter-${b.id}-${a.id}`,
          tipo: 'interacao',
          severidade: sev,
          titulo: `Interação: ${b.molecula} + ${a.molecula}`,
          descricao: interBA.descricao,
          acao: interBA.severidade === 'contraindicado' ? 'Combinação CONTRAINDICADA' : 'Monitorar',
        });
      }
    }
  }

  // ── 2. Duplicidade de classe terapêutica ─────────────────
  const classCounts: Record<string, string[]> = {};
  for (const d of drugs) {
    const key = d.classe;
    if (!classCounts[key]) classCounts[key] = [];
    classCounts[key].push(d.molecula);
  }
  for (const [classe, mols] of Object.entries(classCounts)) {
    if (mols.length > 1) {
      alerts.push({
        id: `dup-${classe}`,
        tipo: 'duplicidade',
        severidade: 'warning',
        titulo: `Duplicidade terapêutica: ${classe}`,
        descricao: `${mols.join(' e ')} pertencem à mesma classe (${classe}).`,
        acao: 'Verificar se duplicidade é intencional. Geralmente apenas uma molécula da mesma classe deve ser prescrita.',
      });
    }
  }

  // ── 3. Contraindicações em gestante ──────────────────────
  if (gestante) {
    for (const d of drugs) {
      if (d.uso_gestante === 'contraindicado') {
        alerts.push({
          id: `gest-${d.id}`,
          tipo: 'gestante',
          severidade: 'critical',
          titulo: `Contraindicado na gestação: ${d.molecula}`,
          descricao: `${d.molecula} está contraindicado durante a gestação.`,
          acao: 'Substituir por alternativa segura na gestação. Consultar obstetra.',
        });
      } else if (d.uso_gestante === 'risco') {
        alerts.push({
          id: `gest-risco-${d.id}`,
          tipo: 'gestante',
          severidade: 'danger',
          titulo: `Risco na gestação: ${d.molecula}`,
          descricao: `${d.molecula} apresenta risco potencial na gestação.`,
          acao: 'Usar apenas se benefício superar o risco. Documentar decisão.',
        });
      }
    }
  }

  // ── 4. Contraindicações em lactante ──────────────────────
  if (lactante) {
    for (const d of drugs) {
      if (d.uso_lactante === 'contraindicado') {
        alerts.push({
          id: `lact-${d.id}`,
          tipo: 'lactante',
          severidade: 'danger',
          titulo: `Risco na amamentação: ${d.molecula}`,
          descricao: `${d.molecula} não é recomendado durante a amamentação.`,
          acao: 'Considerar suspender amamentação ou substituir o medicamento.',
        });
      }
    }
  }

  // ── 5. Alertas geriátricos ────────────────────────────────
  if (idoso) {
    for (const d of drugs) {
      const beerAlert = d.alertas_especiais.find(a =>
        a.toLowerCase().includes('beers') || a.toLowerCase().includes('idoso') || a.toLowerCase().includes('queda')
      );
      if (beerAlert) {
        alerts.push({
          id: `geri-${d.id}`,
          tipo: 'geriatria',
          severidade: 'warning',
          titulo: `Alerta geriátrico: ${d.molecula}`,
          descricao: beerAlert,
          acao: 'Avaliar necessidade. Se mantido, iniciar com doses menores e monitorar.',
        });
      }
    }
  }

  // ── 6. Alertas renais ─────────────────────────────────────
  if (crclValue !== undefined) {
    for (const d of drugs) {
      if (!d.ajuste_renal) continue;
      const { tfg_lt_15, tfg_30_15 } = d.ajuste_renal;

      if (crclValue < 15 && tfg_lt_15.toLowerCase().includes('contraindicado')) {
        alerts.push({
          id: `renal-${d.id}`,
          tipo: 'renal',
          severidade: 'critical',
          titulo: `Contraindicado na insuficiência renal grave: ${d.molecula}`,
          descricao: `TFG estimada: ${crclValue} mL/min. ${d.molecula}: ${tfg_lt_15}`,
          acao: 'Substituir medicamento ou aguardar melhora da função renal.',
        });
      } else if (crclValue < 30 && (tfg_30_15.toLowerCase().includes('contraindicado') || tfg_30_15.toLowerCase().includes('evitar'))) {
        alerts.push({
          id: `renal-${d.id}`,
          tipo: 'renal',
          severidade: 'danger',
          titulo: `Ajuste renal necessário: ${d.molecula}`,
          descricao: `TFG estimada: ${crclValue} mL/min. Recomendação: ${tfg_30_15}`,
          acao: 'Ajustar dose ou frequência conforme função renal.',
        });
      }
    }
  }

  // ── 7a. K+ pré-requisito ARM (KDIGO 2024 / ESC 2023) ─────────
  // Espironolactona/eplerenona exigem K+ ≤ 5,0 mEq/L antes do início
  const ARM_MOLECULES = ['espironolactona', 'eplerenona', 'finerenona'];
  const usaARM = moleculas.some(m => ARM_MOLECULES.some(arm => m.toLowerCase().includes(arm)));
  if (usaARM) {
    if (potassiumLevel === undefined) {
      alerts.push({
        id: 'arm-k-nao-informado',
        tipo: 'contraind',
        severidade: 'warning',
        titulo: 'ARM prescrito — verificar K+ sérico antes do início',
        descricao: 'Antagonistas do receptor mineralocorticoide (ARM) requerem K+ sérico ≤ 5,0 mEq/L antes do início (KDIGO 2024 / ESC 2023). Hipercalemia é a principal complicação.',
        acao: 'Solicitar K+ sérico e creatinina antes de iniciar ARM. Suspender se K+ > 5,5 mEq/L.',
      });
    } else if (potassiumLevel > 5.0 && crclValue !== undefined && crclValue < 45) {
      alerts.push({
        id: 'arm-hipercalemia-tfg-baixa',
        tipo: 'contraind',
        severidade: 'critical',
        titulo: `ARM CONTRAINDICADO — K+ ${potassiumLevel} mEq/L + TFG < 45 mL/min`,
        descricao: `K+ sérico elevado (${potassiumLevel} mEq/L) associado a TFG reduzida (${crclValue} mL/min). ARM nessa combinação apresenta risco elevado de hipercalemia grave e arritmia fatal (RALES/EMPHASIS-HF excluíram TFG < 30 e K+ > 5,0).`,
        acao: 'CONTRAINDICADO. Corrigir hipercalemia antes de iniciar ARM. Considerar patirômer ou resina de troca. Reavalie quando K+ < 5,0 mEq/L.',
      });
    } else if (potassiumLevel > 5.0) {
      alerts.push({
        id: 'arm-hipercalemia',
        tipo: 'contraind',
        severidade: 'danger',
        titulo: `ARM com K+ elevado — ${potassiumLevel} mEq/L`,
        descricao: `K+ > 5,0 mEq/L contraindica início de ARM (espironolactona/eplerenona). Risco de hipercalemia grave e arritmia ventricular.`,
        acao: 'Suspender ou não iniciar ARM. Corrigir hipercalemia. Reavalie quando K+ ≤ 5,0 mEq/L.',
      });
    }
  }

  // ── 7b. Montelucaste — alerta FDA 2020 (depressão/ideação suicida) ─
  const usaMontelucaste = moleculas.some(m => m.toLowerCase().includes('montelucaste') || m.toLowerCase().includes('montelukast'));
  if (usaMontelucaste) {
    alerts.push({
      id: 'montelucaste-saude-mental',
      tipo: 'contraind',
      severidade: 'warning',
      titulo: 'Montelucaste — Alerta FDA 2020: Risco neuropsiquiátrico (Black Box)',
      descricao: 'FDA adicionou Black Box Warning em março/2020: montelucaste associado a agitação, agressividade, pesadelos, depressão, ideação suicida e suicídio consumado em adultos, adolescentes e crianças. Risco persiste mesmo após descontinuação.',
      acao: 'Informar paciente/responsável sobre sintomas neuropsiquiátricos. Reservar montelucaste para pacientes sem resposta ou contraindicação a ICS. Descontinuar imediatamente se sintomas psiquiátricos aparecerem.',
    });
  }

  // ── 7. Interações críticas conhecidas (pares hardcoded de alta relevância clínica) ──
  const CRITICAL_PAIRS: Array<{
    mol_a: string; mol_b: string;
    severidade: AlertSeverityFast;
    titulo: string; descricao: string; acao: string;
  }> = [
    // Nefrotoxicidade triple whammy
    {
      mol_a: 'ieca', mol_b: 'aine',
      severidade: 'danger',
      titulo: 'IECA + AINE — Risco nefrotóxico',
      descricao: 'Combinação reduz TFG e aumenta risco de IRA, especialmente em idosos ou desidratados.',
      acao: 'Monitorar creatinina e pressão. Preferir paracetamol como analgésico.',
    },
    {
      mol_a: 'bra', mol_b: 'aine',
      severidade: 'danger',
      titulo: 'BRA + AINE — Risco nefrotóxico',
      descricao: 'BRA + AINE reduz TFG e aumenta potássio sérico.',
      acao: 'Monitorar função renal e eletrólitos. Preferir paracetamol.',
    },
    // Hipercalemia
    {
      mol_a: 'ieca', mol_b: 'espironolactona',
      severidade: 'warning',
      titulo: 'IECA + Espironolactona — Hipercalemia',
      descricao: 'Associação aumenta potássio. Indicada na IC-FEr com monitoramento.',
      acao: 'Monitorar K+ e creatinina a cada 1-3 meses. Suspender se K+ > 5,5 mEq/L.',
    },
    // QT prolongamento
    {
      mol_a: 'azitromicina', mol_b: 'amiodarona',
      severidade: 'critical',
      titulo: 'Azitromicina + Amiodarona — QT prolongado',
      descricao: 'Combinação prolonga intervalo QT com risco de torsades de pointes.',
      acao: 'EVITAR combinação. Substituir azitromicina por amoxicilina ou doxiciclina.',
    },
    {
      mol_a: 'azitromicina', mol_b: 'haloperidol',
      severidade: 'danger',
      titulo: 'Azitromicina + Haloperidol — QT prolongado',
      descricao: 'Ambos prolongam QT — risco aditivo de arritmia.',
      acao: 'Monitorar ECG. Preferir alternativa ao macrolídeo.',
    },
    {
      mol_a: 'hidroxicloroquina', mol_b: 'azitromicina',
      severidade: 'danger',
      titulo: 'Hidroxicloroquina + Azitromicina — QT prolongado',
      descricao: 'Associação de dois agentes que prolongam QT. Risco de arritmia grave.',
      acao: 'Monitorar ECG. Considerar alternativa ao macrolídeo.',
    },
    // Síndrome serotoninérgica
    {
      mol_a: 'isrs', mol_b: 'tramadol',
      severidade: 'danger',
      titulo: 'ISRS + Tramadol — Síndrome serotoninérgica',
      descricao: 'Tramadol inibe recaptação de serotonina — risco de síndrome serotoninérgica com ISRS.',
      acao: 'Evitar associação. Preferir dipirona, paracetamol ou opioides sem atividade serotoninérgica.',
    },
    {
      mol_a: 'sertralina', mol_b: 'tramadol',
      severidade: 'danger',
      titulo: 'Sertralina + Tramadol — Síndrome serotoninérgica',
      descricao: 'Combinação aumenta serotonina sináptica — risco de síndrome serotoninérgica.',
      acao: 'Evitar. Usar paracetamol ou dipirona para analgesia.',
    },
    {
      mol_a: 'escitalopram', mol_b: 'tramadol',
      severidade: 'danger',
      titulo: 'Escitalopram + Tramadol — Síndrome serotoninérgica',
      descricao: 'Risco de síndrome serotoninérgica por mecanismo aditivo.',
      acao: 'Evitar. Usar analgésico sem atividade serotoninérgica.',
    },
    // Metformina + contraste
    {
      mol_a: 'metformina', mol_b: 'contraste',
      severidade: 'warning',
      titulo: 'Metformina + Contraste iodado — Risco de acidose lática',
      descricao: 'Contraste iodado pode causar IRA transitória acumulando metformina e risco de acidose lática.',
      acao: 'Suspender metformina 48h antes de procedimentos com contraste e reiniciar após confirmação de função renal normal.',
    },
    // Lítio + tiazídico
    {
      mol_a: 'litio', mol_b: 'hidroclorotiazida',
      severidade: 'critical',
      titulo: 'Lítio + Hidroclorotiazida — Toxicidade por lítio',
      descricao: 'Tiazídicos reduzem excreção renal de lítio, elevando litemia a níveis tóxicos.',
      acao: 'CONTRAINDICADO. Substituir diurético tiazídico por alternativa (furosemida com cautela).',
    },
    // Varfarina + AINEs
    {
      mol_a: 'varfarina', mol_b: 'aine',
      severidade: 'critical',
      titulo: 'Varfarina + AINE — Risco hemorrágico grave',
      descricao: 'AINEs inibem plaquetas e deslocam varfarina da albumina — potencializa anticoagulação e risco GI.',
      acao: 'EVITAR. Usar paracetamol como analgésico. Monitorar INR se necessário.',
    },
    // Corticoide + AINEs
    {
      mol_a: 'prednisolona', mol_b: 'aine',
      severidade: 'warning',
      titulo: 'Corticoide + AINE — Risco gastrointestinal',
      descricao: 'Associação aumenta risco de úlcera péptica e sangramento GI.',
      acao: 'Adicionar proteção gástrica (IBP). Evitar combinação quando possível.',
    },
    // Fluoroquinolona + QT
    {
      mol_a: 'moxifloxacino', mol_b: 'amiodarona',
      severidade: 'critical',
      titulo: 'Moxifloxacino + Amiodarona — QT crítico',
      descricao: 'Moxifloxacino já prolonga QT sozinho — combinação com amiodarona é de alto risco.',
      acao: 'CONTRAINDICADO. Substituir moxifloxacino por levofloxacino ou outro antibiótico.',
    },
    // Duplo bloqueio SRAA
    {
      mol_a: 'ieca', mol_b: 'bra',
      severidade: 'critical',
      titulo: 'IECA + BRA — Duplo bloqueio SRAA contraindicado',
      descricao: 'Combinação aumenta risco de hipercalemia, hipotensão e IRA sem benefício adicional.',
      acao: 'CONTRAINDICADO conforme diretrizes. Usar apenas um dos dois.',
    },
    // IMAO + ISRS — Síndrome serotoninérgica fatal
    {
      mol_a: 'imao', mol_b: 'isrs',
      severidade: 'critical',
      titulo: 'IMAO + ISRS — Síndrome serotoninérgica potencialmente fatal',
      descricao: 'A combinação de inibidores da MAO com ISRS provoca acúmulo maciço de serotonina — hipertermia, rigidez, crises autonômicas e morte. Período de washout obrigatório: 14 dias após IMAO; 5 dias após ISRS (exceto fluoxetina: 5 semanas).',
      acao: 'CONTRAINDICADO ABSOLUTO. Respeitar washout de 14 dias. Fluoxetina requer 5 semanas de washout antes de iniciar IMAO.',
    },
    {
      mol_a: 'fenelzina', mol_b: 'sertralina',
      severidade: 'critical',
      titulo: 'IMAO + Sertralina — Síndrome serotoninérgica fatal',
      descricao: 'Mesmo mecanismo IMAO+ISRS. Washout: 14 dias após IMAO, 5 dias após sertralina.',
      acao: 'CONTRAINDICADO ABSOLUTO.',
    },
    {
      mol_a: 'fenelzina', mol_b: 'fluoxetina',
      severidade: 'critical',
      titulo: 'IMAO + Fluoxetina — Síndrome serotoninérgica (washout 5 semanas)',
      descricao: 'Fluoxetina tem meia-vida de ~5 semanas — washout prolongado obrigatório antes de IMAO.',
      acao: 'CONTRAINDICADO. Aguardar 5 semanas após última dose de fluoxetina antes de iniciar IMAO.',
    },
    // Nitrato + inibidor PDE5 — hipotensão grave
    {
      mol_a: 'nitrato', mol_b: 'tadalafila',
      severidade: 'critical',
      titulo: 'Nitrato + Tadalafila — Hipotensão grave potencialmente fatal',
      descricao: 'Sinergismo vasodilatador aditivo — queda brusca de PA com risco de síncope, IAM e morte. Tadalafila tem meia-vida de ~36h; nitrato de resgate também é contraindicado.',
      acao: 'CONTRAINDICADO ABSOLUTO. Intervalo mínimo: 48h após tadalafila antes de nitrato. Em emergência coronariana usar nitroprussiato IV com cautela.',
    },
    {
      mol_a: 'nitrato', mol_b: 'sildenafila',
      severidade: 'critical',
      titulo: 'Nitrato + Sildenafila — Hipotensão grave potencialmente fatal',
      descricao: 'Mesma interação nitrato+iPDE5. Sildenafila meia-vida ~4h; contraindicado nitrato nas 24h seguintes.',
      acao: 'CONTRAINDICADO ABSOLUTO. Intervalo mínimo: 24h após sildenafila antes de nitrato.',
    },
    {
      mol_a: 'nitrato', mol_b: 'vardenafila',
      severidade: 'critical',
      titulo: 'Nitrato + Vardenafila — Hipotensão grave',
      descricao: 'Mesma classe iPDE5. Contraindicado nitrato nas 24h após vardenafila.',
      acao: 'CONTRAINDICADO ABSOLUTO. Intervalo mínimo: 24h.',
    },
    // ARNI + IECA
    {
      mol_a: 'sacubitril', mol_b: 'ieca',
      severidade: 'critical',
      titulo: 'ARNI (Sacubitril/Valsartana) + IECA — Angioedema fatal',
      descricao: 'Sacubitril inibe neprilisina (que degrada bradicinina). Combinação com IECA eleva bradicinina a níveis tóxicos — angioedema de vias aéreas potencialmente fatal.',
      acao: 'CONTRAINDICADO. Washout de 36h após IECA antes de iniciar sacubitril/valsartana. Monitorar via aérea nas primeiras 24h.',
    },
  ];

  const molsLower = moleculas.map(m => m.toLowerCase());

  for (const pair of CRITICAL_PAIRS) {
    const hasA = molsLower.some(m => m.includes(pair.mol_a) || pair.mol_a.includes(m)) ||
      drugs.some(d => d.classe.toLowerCase().includes(pair.mol_a));
    const hasB = molsLower.some(m => m.includes(pair.mol_b) || pair.mol_b.includes(m)) ||
      drugs.some(d => d.classe.toLowerCase().includes(pair.mol_b));
    if (hasA && hasB) {
      // Evita duplicatas com interações já encontradas pelo banco de dados
      const dupKey = `${pair.mol_a}-${pair.mol_b}`;
      const jaExiste = alerts.some(a => a.id.includes(pair.mol_a) || a.titulo.toLowerCase().includes(pair.mol_a));
      if (!jaExiste) {
        alerts.push({
          id: `critical-pair-${dupKey}`,
          tipo: 'interacao',
          severidade: pair.severidade,
          titulo: pair.titulo,
          descricao: pair.descricao,
          acao: pair.acao,
        });
      }
    }
  }

  // Ordenar por severidade
  const order: Record<AlertSeverityFast, number> = { critical: 0, danger: 1, warning: 2, info: 3 };
  return alerts.sort((a, b) => order[a.severidade] - order[b.severidade]);
}

export const SEVERITY_CONFIG: Record<AlertSeverityFast, { color: string; icon: string; label: string }> = {
  critical: { color: 'border-red-200 bg-red-50', icon: 'text-red-600', label: 'Crítico' },
  danger: { color: 'border-orange-200 bg-orange-50', icon: 'text-orange-500', label: 'Alerta' },
  warning: { color: 'border-yellow-200 bg-yellow-50', icon: 'text-yellow-500', label: 'Atenção' },
  info: { color: 'border-blue-200 bg-blue-50', icon: 'text-blue-500', label: 'Info' },
};
