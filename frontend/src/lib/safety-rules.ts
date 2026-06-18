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
