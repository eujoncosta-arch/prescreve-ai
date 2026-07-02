// ============================================================
// PRESCREVE-AI — Motor de Verificação de Segurança Rápida
// Interações, duplicidade, contraindicações, limites de dose
// ============================================================

import { PHARMA_DB, type QuickDrug } from './pharma-database';

export type AlertSeverityFast = 'info' | 'warning' | 'danger' | 'critical';

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
}

export function runSafetyCheck(input: SafetyCheckInput): QuickSafetyAlert[] {
  const alerts: QuickSafetyAlert[] = [];
  const { moleculas, gestante, lactante, idoso, crclValue } = input;

  // Busca dados das moléculas no banco
  const drugs: QuickDrug[] = moleculas
    .map(m => PHARMA_DB.find(d => d.molecula.toLowerCase() === m.toLowerCase() ||
      d.sinonimos.some(s => s.toLowerCase() === m.toLowerCase())))
    .filter(Boolean) as QuickDrug[];

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
  ];

  const molsLower = moleculas.map(m => m.toLowerCase());

  for (const pair of CRITICAL_PAIRS) {
    const hasA = molsLower.some(m => m.includes(pair.mol_a) || pair.mol_a.includes(m));
    const hasB = molsLower.some(m => m.includes(pair.mol_b) || pair.mol_b.includes(m));
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
