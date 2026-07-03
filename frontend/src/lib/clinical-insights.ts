'use client';

// ═══════════════════════════════════════════════════════════
// CLINICAL INSIGHTS ENGINE — PRESCREVE-AI
// Inteligência coletiva anonimizada — sem dados individuais
// Princípio: k-anonimidade mínima de 3 registros por célula
// ═══════════════════════════════════════════════════════════

import type { AuditEntry } from './medical-audit';

// ─── Limiar de privacidade ────────────────────────────────
// Nenhum dado é exibido se o grupo tiver menos de K registros
const K_ANONIMIDADE = 3;

// ═══════════════════════════════════════════════════════════
// TIPOS DE INSIGHTS
// ═══════════════════════════════════════════════════════════

export interface CombinacaoTerapeutica {
  moleculas: string[];          // ordenadas alfabeticamente
  label: string;                // "BRA + SGLT-2"
  frequencia: number;           // N de eventos
  percentual: number;           // % sobre total da condição
  cids: string[];               // condições associadas
  nivel_evidencia_min: string;  // nível mínimo das evidências
}

export interface CondutaInsight {
  descricao_normalizada: string;
  tipo: string;
  frequencia: number;
  percentual: number;
  cids_principais: string[];
}

export interface ProtocoloInsight {
  nome: string;
  frequencia: number;
  percentual: number;
  cids_associados: string[];
  classe_terapeutica_predominante: string;
}

export interface TendenciaMensal {
  mes: string;              // 'YYYY-MM'
  label: string;            // 'Jan 2025'
  n_eventos: number;
  n_prescricoes: number;
  n_alertas_ignorados: number;
  n_ajustes: number;
  top_molecula: string;
}

export interface InsightCondicao {
  cid: string;
  descricao: string;
  n_eventos: number;
  top_combinacoes: CombinacaoTerapeutica[];
  top_moleculas: { molecula: string; frequencia: number; percentual: number }[];
  top_diretrizes: { sociedade: string; frequencia: number }[];
  n_alertas_ignorados_total: number;
  n_ajustes_total: number;
  percentual_com_ajuste_renal: number;
}

export interface InsightGeral {
  total_eventos_anonimizados: number;
  total_prescricoes:          number;
  total_ajustes:              number;
  total_alertas_ignorados:    number;
  periodo_inicio:             string;
  periodo_fim:                string;

  top_combinacoes_global:     CombinacaoTerapeutica[];
  top_moleculas_global:       { molecula: string; frequencia: number; percentual: number }[];
  top_condutas:               CondutaInsight[];
  top_protocolos:             ProtocoloInsight[];
  tendencias_mensais:         TendenciaMensal[];
  insights_por_condicao:      InsightCondicao[];
  top_classes_terapeuticas:   { classe: string; frequencia: number; percentual: number }[];
  alertas_mais_ignorados:     { mensagem: string; severidade: string; n: number }[];
}

// ═══════════════════════════════════════════════════════════
// NORMALIZAÇÃO DE MOLÉCULAS
// Agrupa variações do mesmo princípio ativo
// ═══════════════════════════════════════════════════════════

const NORMALIZACAO_MOLECULA: Record<string, string> = {
  'losartana potássica':     'Losartana',
  'losartana':               'Losartana',
  'zart':                    'Losartana',
  'olmesartana medoxomila':  'Olmesartana',
  'olmesartana':             'Olmesartana',
  'holmes':                  'Olmesartana',
  'maleato de enalapril':    'Enalapril',
  'enalapril':               'Enalapril',
  'besilato de anlodipino':  'Anlodipino',
  'anlodipino':              'Anlodipino',
  'hidroclorotiazida':       'HCTZ',
  'hctz':                    'HCTZ',
  'espironolactona':         'Espironolactona',
  'cloridrato de metformina':'Metformina',
  'metformina':              'Metformina',
  'glifage':                 'Metformina',
  'empagliflozina':          'Empagliflozina',
  'jardiance':               'Empagliflozina',
  'liraglutida':             'Liraglutida',
  'victoza':                 'Liraglutida',
  'semaglutida':             'Semaglutida',
  'ozempic':                 'Semaglutida',
  'sitagliptina':            'Sitagliptina',
  'januvia':                 'Sitagliptina',
  'sacubitril/valsartana':   'Sacubitril/Valsartana',
  'sacubitril + valsartana': 'Sacubitril/Valsartana',
  'entresto':                'Sacubitril/Valsartana',
  'carvedilol':              'Carvedilol',
  'atorvastatina':           'Atorvastatina',
  'atorvastatina cálcica':   'Atorvastatina',
  'rosuvastatina':           'Rosuvastatina',
  'cálcio de rosuvastatina': 'Rosuvastatina',
  'crestor':                 'Rosuvastatina',
  'dapagliflozina':          'Dapagliflozina',
  'forxiga':                 'Dapagliflozina',
  'bisoprolol':              'Bisoprolol',
  'metoprolol':              'Metoprolol',
  'amlodipino':              'Anlodipino',
  'ezetimiba':               'Ezetimiba',
  'furosemida':              'Furosemida',
  'digoxina':                'Digoxina',
  'warfarina':               'Varfarina',
  'varfarina':               'Varfarina',
  'rivaroxabana':            'Rivaroxabana',
  'apixabana':               'Apixabana',
};

export function normalizarMolecula(nome: string): string {
  const key = nome.toLowerCase().trim();
  return NORMALIZACAO_MOLECULA[key] ?? nome.trim();
}

// ─── Classe terapêutica inferida ─────────────────────────

const CLASSE_POR_MOLECULA: Record<string, string> = {
  'Losartana':             'BRA',
  'Olmesartana':           'BRA',
  'Valsartana':            'BRA',
  'Enalapril':             'IECA',
  'Ramipril':              'IECA',
  'Anlodipino':            'BCC',
  'HCTZ':                  'Tiazídico',
  'Espironolactona':       'ARM',
  'Furosemida':            'Diurético alça',
  'Metformina':            'Biguanida',
  'Empagliflozina':        'SGLT-2',
  'Dapagliflozina':        'SGLT-2',
  'Liraglutida':           'GLP-1',
  'Semaglutida':           'GLP-1',
  'Sitagliptina':          'DPP-4',
  'Sacubitril/Valsartana': 'ARNI',
  'Carvedilol':            'Betabloqueador',
  'Bisoprolol':            'Betabloqueador',
  'Metoprolol':            'Betabloqueador',
  'Atorvastatina':         'Estatina',
  'Rosuvastatina':         'Estatina',
  'Ezetimiba':             'Inibidor absorção colesterol',
  'Varfarina':             'Anticoagulante AVK',
  'Rivaroxabana':          'NOAC',
  'Apixabana':             'NOAC',
  'Digoxina':              'Glicosídeo cardíaco',
};

function inferirClasse(molecula: string): string {
  return CLASSE_POR_MOLECULA[molecula] ?? 'Outro';
}

// ─── Normalização de condutas ─────────────────────────────

function normalizarConduta(descricao: string): string {
  const d = descricao.toLowerCase();
  if (d.includes('sglt') || d.includes('flozina'))       return 'Adição de SGLT-2';
  if (d.includes('glp') || d.includes('glp-1'))          return 'Adição de GLP-1';
  if (d.includes('bra') || d.includes('sartana'))        return 'Início/titulação de BRA';
  if (d.includes('ieca') || d.includes('enalapril'))     return 'Início/titulação de IECA';
  if (d.includes('estatina') || d.includes('vastatina')) return 'Início/intensificação de estatina';
  if (d.includes('sacubitril') || d.includes('arni'))    return 'Início/titulação de ARNI';
  if (d.includes('betabloqueador') || d.includes('carvedilol') || d.includes('bisoprolol')) return 'Início/titulação de betabloqueador';
  if (d.includes('diurético') || d.includes('furosemida') || d.includes('espironolactona')) return 'Ajuste de diurético';
  if (d.includes('metformina'))                           return 'Início/ajuste de Metformina';
  if (d.includes('insulina'))                             return 'Início/ajuste de insulina';
  if (d.includes('exercício') || d.includes('atividade física')) return 'Orientação de atividade física';
  if (d.includes('dieta') || d.includes('alimentar') || d.includes('nutricional')) return 'Orientação nutricional';
  if (d.includes('exame') || d.includes('solicitação'))  return 'Solicitação de exames';
  if (d.includes('retorno') || d.includes('consulta'))   return 'Agendamento de retorno';
  if (d.includes('encaminhamento'))                       return 'Encaminhamento especialidade';
  if (d.includes('quarteto') || d.includes('quadrupla')) return 'Protocolo quarteto IC';
  return descricao.length > 60 ? descricao.slice(0, 57) + '…' : descricao;
}

// ═══════════════════════════════════════════════════════════
// ENGINE PRINCIPAL
// ═══════════════════════════════════════════════════════════

export function gerarInsights(entries: AuditEntry[]): InsightGeral {
  if (entries.length === 0) {
    return {
      total_eventos_anonimizados: 0,
      total_prescricoes: 0,
      total_ajustes: 0,
      total_alertas_ignorados: 0,
      periodo_inicio: '',
      periodo_fim: '',
      top_combinacoes_global: [],
      top_moleculas_global: [],
      top_condutas: [],
      top_protocolos: [],
      tendencias_mensais: [],
      insights_por_condicao: [],
      top_classes_terapeuticas: [],
      alertas_mais_ignorados: [],
    };
  }

  // ─── Totais globais ───────────────────────────────────
  const total_prescricoes      = entries.reduce((s, e) => s + e.prescricoes.length, 0);
  const total_ajustes          = entries.reduce((s, e) => s + e.ajustes_aplicados.length, 0);
  const total_alertas_ignorados = entries.reduce((s, e) => s + e.alertas_ignorados.length, 0);
  const timestamps             = entries.map(e => e.timestamp_inicio).sort();
  const periodo_inicio         = timestamps[0] ?? '';
  const periodo_fim            = timestamps[timestamps.length - 1] ?? '';

  // ─── Moléculas globais ───────────────────────────────
  const molCount: Record<string, number> = {};
  for (const e of entries) {
    for (const px of e.prescricoes) {
      for (const m of px.medicamentos) {
        const mol = normalizarMolecula(m.molecula);
        molCount[mol] = (molCount[mol] ?? 0) + 1;
      }
    }
  }
  const totalMolMencoes = Object.values(molCount).reduce((s, v) => s + v, 0) || 1;
  const top_moleculas_global = Object.entries(molCount)
    .filter(([, n]) => n >= K_ANONIMIDADE)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([molecula, frequencia]) => ({
      molecula,
      frequencia,
      percentual: Math.round((frequencia / totalMolMencoes) * 100),
    }));

  // ─── Classes terapêuticas ─────────────────────────────
  const classeCount: Record<string, number> = {};
  for (const { molecula, frequencia } of top_moleculas_global) {
    const cls = inferirClasse(molecula);
    classeCount[cls] = (classeCount[cls] ?? 0) + frequencia;
  }
  const totalClasse = Object.values(classeCount).reduce((s, v) => s + v, 0) || 1;
  const top_classes_terapeuticas = Object.entries(classeCount)
    .sort(([, a], [, b]) => b - a)
    .map(([classe, frequencia]) => ({
      classe,
      frequencia,
      percentual: Math.round((frequencia / totalClasse) * 100),
    }));

  // ─── Combinações globais ──────────────────────────────
  const comboCount: Record<string, { n: number; cids: Set<string>; evs: string[] }> = {};
  for (const e of entries) {
    for (const px of e.prescricoes) {
      const mols = [...new Set(px.medicamentos.map(m => normalizarMolecula(m.molecula)))].sort();
      if (mols.length < 2) continue;
      // Pares e trios
      const combos: string[][] = [];
      for (let i = 0; i < mols.length; i++) {
        for (let j = i + 1; j < mols.length; j++) {
          combos.push([mols[i], mols[j]]);
          for (let k = j + 1; k < mols.length; k++) {
            combos.push([mols[i], mols[j], mols[k]]);
          }
        }
      }
      const cids = e.diagnosticos.map(d => d.cid);
      const evs  = e.evidencias_consultadas.map(ev => ev.nivel_evidencia);
      for (const combo of combos) {
        const key = combo.join(' + ');
        if (!comboCount[key]) comboCount[key] = { n: 0, cids: new Set(), evs: [] };
        comboCount[key].n++;
        cids.forEach(c => comboCount[key].cids.add(c));
        evs.forEach(v => comboCount[key].evs.push(v));
      }
    }
  }
  const totalEventos = entries.length || 1;
  const top_combinacoes_global: CombinacaoTerapeutica[] = Object.entries(comboCount)
    .filter(([, v]) => v.n >= K_ANONIMIDADE)
    .sort(([, a], [, b]) => b.n - a.n)
    .slice(0, 12)
    .map(([key, v]) => {
      const mols = key.split(' + ');
      const evOrdem: Record<string, number> = { A: 3, B: 2, C: 1 };
      const minEv = v.evs.sort((a, b) => evOrdem[a] - evOrdem[b])[0] ?? 'B';
      return {
        moleculas: mols,
        label: mols.map(m => inferirClasse(m) !== 'Outro' ? inferirClasse(m) : m).join(' + '),
        frequencia: v.n,
        percentual: Math.round((v.n / totalEventos) * 100),
        cids: [...v.cids].slice(0, 4),
        nivel_evidencia_min: minEv,
      };
    });

  // ─── Condutas ─────────────────────────────────────────
  const condutaCount: Record<string, { n: number; tipo: string; cids: Set<string> }> = {};
  for (const e of entries) {
    const cids = e.diagnosticos.map(d => d.cid);
    for (const c of e.condutas) {
      const norm = normalizarConduta(c.descricao);
      if (!condutaCount[norm]) condutaCount[norm] = { n: 0, tipo: c.tipo, cids: new Set() };
      condutaCount[norm].n++;
      cids.forEach(cid => condutaCount[norm].cids.add(cid));
    }
  }
  const top_condutas: CondutaInsight[] = Object.entries(condutaCount)
    .filter(([, v]) => v.n >= K_ANONIMIDADE)
    .sort(([, a], [, b]) => b.n - a.n)
    .slice(0, 12)
    .map(([descricao_normalizada, v]) => ({
      descricao_normalizada,
      tipo: v.tipo,
      frequencia: v.n,
      percentual: Math.round((v.n / totalEventos) * 100),
      cids_principais: [...v.cids].slice(0, 3),
    }));

  // ─── Protocolos ───────────────────────────────────────
  const protCount: Record<string, { n: number; cids: Set<string>; classes: string[] }> = {};
  for (const e of entries) {
    if (!e.protocolo_aplicado) continue;
    const k = e.protocolo_aplicado;
    if (!protCount[k]) protCount[k] = { n: 0, cids: new Set(), classes: [] };
    protCount[k].n++;
    e.diagnosticos.forEach(d => protCount[k].cids.add(d.cid));
    e.prescricoes.flatMap(px => px.medicamentos.map(m => inferirClasse(normalizarMolecula(m.molecula))))
      .forEach(cls => protCount[k].classes.push(cls));
  }
  const top_protocolos: ProtocoloInsight[] = Object.entries(protCount)
    .filter(([, v]) => v.n >= 1)  // protocolos: threshold menor (são raros)
    .sort(([, a], [, b]) => b.n - a.n)
    .slice(0, 8)
    .map(([nome, v]) => {
      const classFreq: Record<string, number> = {};
      v.classes.forEach(cls => { classFreq[cls] = (classFreq[cls] ?? 0) + 1; });
      const top = Object.entries(classFreq).sort(([,a],[,b]) => b-a)[0]?.[0] ?? '';
      return {
        nome,
        frequencia: v.n,
        percentual: Math.round((v.n / totalEventos) * 100),
        cids_associados: [...v.cids],
        classe_terapeutica_predominante: top,
      };
    });

  // ─── Tendências mensais ───────────────────────────────
  const mesMap: Record<string, TendenciaMensal & { molCount: Record<string, number> }> = {};
  for (const e of entries) {
    const mes   = e.timestamp_inicio.slice(0, 7);
    const label = new Date(mes + '-15').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    if (!mesMap[mes]) mesMap[mes] = { mes, label, n_eventos: 0, n_prescricoes: 0, n_alertas_ignorados: 0, n_ajustes: 0, top_molecula: '', molCount: {} };
    mesMap[mes].n_eventos++;
    mesMap[mes].n_prescricoes        += e.prescricoes.length;
    mesMap[mes].n_alertas_ignorados  += e.alertas_ignorados.length;
    mesMap[mes].n_ajustes            += e.ajustes_aplicados.length;
    for (const px of e.prescricoes) {
      for (const m of px.medicamentos) {
        const mol = normalizarMolecula(m.molecula);
        mesMap[mes].molCount[mol] = (mesMap[mes].molCount[mol] ?? 0) + 1;
      }
    }
  }
  const tendencias_mensais: TendenciaMensal[] = Object.values(mesMap)
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-12)
    .map(m => ({
      mes:                    m.mes,
      label:                  m.label,
      n_eventos:              m.n_eventos,
      n_prescricoes:          m.n_prescricoes,
      n_alertas_ignorados:    m.n_alertas_ignorados,
      n_ajustes:              m.n_ajustes,
      top_molecula:           Object.entries(m.molCount).sort(([,a],[,b]) => b-a)[0]?.[0] ?? '',
    }));

  // ─── Insights por condição ────────────────────────────
  const cidMap: Record<string, AuditEntry[]> = {};
  for (const e of entries) {
    for (const d of e.diagnosticos) {
      if (!cidMap[d.cid]) cidMap[d.cid] = [];
      cidMap[d.cid].push(e);
    }
  }
  const insights_por_condicao: InsightCondicao[] = Object.entries(cidMap)
    .filter(([, evs]) => evs.length >= K_ANONIMIDADE)
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 8)
    .map(([cid, evs]) => {
      const desc = evs[0].diagnosticos.find(d => d.cid === cid)?.descricao ?? cid;
      const n    = evs.length;

      // Combinações para esta condição
      const localCombo: Record<string, number> = {};
      for (const e of evs) {
        for (const px of e.prescricoes) {
          const mols = [...new Set(px.medicamentos.map(m => normalizarMolecula(m.molecula)))].sort();
          for (let i = 0; i < mols.length; i++) {
            for (let j = i + 1; j < mols.length; j++) {
              const k = [mols[i], mols[j]].join(' + ');
              localCombo[k] = (localCombo[k] ?? 0) + 1;
            }
          }
        }
      }
      const top_combinacoes = Object.entries(localCombo)
        .filter(([, c]) => c >= 1)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([key, freq]) => {
          const mols = key.split(' + ');
          return {
            moleculas: mols,
            label: mols.map(m => inferirClasse(m) !== 'Outro' ? inferirClasse(m) : m).join(' + '),
            frequencia: freq,
            percentual: Math.round((freq / n) * 100),
            cids: [cid],
            nivel_evidencia_min: 'A',
          } as CombinacaoTerapeutica;
        });

      // Moléculas para esta condição
      const localMol: Record<string, number> = {};
      for (const e of evs) {
        for (const px of e.prescricoes) {
          for (const m of px.medicamentos) {
            const mol = normalizarMolecula(m.molecula);
            localMol[mol] = (localMol[mol] ?? 0) + 1;
          }
        }
      }
      const totalMol = Object.values(localMol).reduce((s, v) => s + v, 0) || 1;
      const top_moleculas = Object.entries(localMol)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([molecula, freq]) => ({ molecula, frequencia: freq, percentual: Math.round((freq / totalMol) * 100) }));

      // Diretrizes
      const dirCount: Record<string, number> = {};
      for (const e of evs) {
        for (const d of e.diretrizes_utilizadas) {
          dirCount[d.sociedade] = (dirCount[d.sociedade] ?? 0) + 1;
        }
      }
      const top_diretrizes = Object.entries(dirCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([sociedade, frequencia]) => ({ sociedade, frequencia }));

      const n_alertas_ignorados_total = evs.reduce((s, e) => s + e.alertas_ignorados.length, 0);
      const n_ajustes_total           = evs.reduce((s, e) => s + e.ajustes_aplicados.length, 0);
      const comAjusteRenal            = evs.filter(e => e.ajustes_aplicados.some(a => a.tipo === 'renal')).length;

      return {
        cid,
        descricao: desc,
        n_eventos: n,
        top_combinacoes,
        top_moleculas,
        top_diretrizes,
        n_alertas_ignorados_total,
        n_ajustes_total,
        percentual_com_ajuste_renal: Math.round((comAjusteRenal / n) * 100),
      };
    });

  // ─── Alertas mais ignorados ───────────────────────────
  const alertaCount: Record<string, { n: number; severidade: string }> = {};
  for (const e of entries) {
    for (const al of e.alertas_ignorados) {
      const key = al.mensagem.slice(0, 80);
      if (!alertaCount[key]) alertaCount[key] = { n: 0, severidade: al.severidade };
      alertaCount[key].n++;
    }
  }
  const alertas_mais_ignorados = Object.entries(alertaCount)
    .filter(([, v]) => v.n >= 1)
    .sort(([, a], [, b]) => b.n - a.n)
    .slice(0, 8)
    .map(([mensagem, v]) => ({ mensagem, severidade: v.severidade, n: v.n }));

  return {
    total_eventos_anonimizados: entries.length,
    total_prescricoes,
    total_ajustes,
    total_alertas_ignorados,
    periodo_inicio,
    periodo_fim,
    top_combinacoes_global,
    top_moleculas_global,
    top_condutas,
    top_protocolos,
    tendencias_mensais,
    insights_por_condicao,
    top_classes_terapeuticas,
    alertas_mais_ignorados,
  };
}

// ═══════════════════════════════════════════════════════════
// SEED DE DEMONSTRAÇÃO EXPANDIDO
// Necessário para gerar insights ricos (precisa de N >= K)
// ═══════════════════════════════════════════════════════════

import {
  registrarAudit, listarAudits, gerarIdPacienteAnonimo, hashConteudoPrescricao,
} from './medical-audit';

export function seedInsightsDemo(): void {
  if (typeof window === 'undefined') return;
  const existing = listarAudits();
  if (existing.length >= 20) return; // já tem dados suficientes

  const agora = new Date();
  const ts = (diasAtras: number, horasOffset = 0) => {
    const d = new Date(agora);
    d.setDate(d.getDate() - diasAtras);
    d.setHours(d.getHours() - horasOffset);
    return d.toISOString();
  };

  type DraftEntry = Omit<Parameters<typeof registrarAudit>[0], never>;

  const cases: DraftEntry[] = [
    // ── HAS + DM2 — BRA + SGLT-2 (caso mais frequente) ──
    ...[1, 3, 7, 12, 18, 22, 28, 35].map((dias, i) => ({
      usuario: { nome: 'Dr. João Silva', crm: '123456', uf_crm: 'SP', especialidade: 'Cardiologia' },
      timestamp_inicio: ts(dias, i),
      timestamp_fim: ts(dias, i + 1),
      duracao_minutos: 20 + i * 2,
      paciente: {
        id_anonimo: gerarIdPacienteAnonimo(`has-dm2-${i}`),
        iniciais: `P${i + 1}.S.`,
        idade_anos: 58 + i,
        sexo: (i % 2 === 0 ? 'M' : 'F') as 'M' | 'F',
        peso_kg: 78 + i * 2,
        tfg_ml_min: 62 + i * 3,
        alergias_registradas: [],
        comorbidades_ativas: ['HAS', 'DM2'],
      },
      tipo_evento: 'prescricao_gerada' as const,
      status: 'finalizado' as const,
      diagnosticos: [
        { cid: 'I10', descricao: 'Hipertensão arterial sistêmica', tipo: 'principal' as const, confirmado: true, data_registro: ts(dias) },
        { cid: 'E11', descricao: 'Diabetes mellitus tipo 2', tipo: 'secundario' as const, confirmado: true, data_registro: ts(dias) },
      ],
      condutas: [
        { descricao: 'Início de BRA (Losartana 50 mg)', tipo: 'medicamentosa' as const, cid_relacionado: 'I10', diretriz_base: 'SBC DBHA-7 2020', registrada_em: ts(dias) },
        { descricao: 'Adição de SGLT-2 (Dapagliflozina 10 mg) — DM2 + DCV', tipo: 'medicamentosa' as const, cid_relacionado: 'E11', diretriz_base: 'ADA 2024', registrada_em: ts(dias) },
        { descricao: 'Orientação nutricional e atividade física', tipo: 'nao_medicamentosa' as const, registrada_em: ts(dias) },
        { descricao: 'Solicitação de HbA1c e função renal', tipo: 'solicitacao_exame' as const, registrada_em: ts(dias) },
        { descricao: 'Retorno em 30 dias', tipo: 'retorno' as const, registrada_em: ts(dias) },
      ],
      prescricoes: [{
        id_prescricao: `PRX-HAS-DM2-${i}`,
        data_prescricao: ts(dias),
        status: 'emitida' as const,
        hash_conteudo: hashConteudoPrescricao([
          { molecula: 'Losartana', concentracao: '50 mg', dose: '50 mg', via: 'Oral', frequencia: '1×/dia', indicacao_cid: 'I10' },
          { molecula: 'Dapagliflozina', concentracao: '10 mg', dose: '10 mg', via: 'Oral', frequencia: '1×/dia', indicacao_cid: 'E11' },
          { molecula: 'Metformina', concentracao: '850 mg', dose: '850 mg', via: 'Oral', frequencia: '2×/dia', indicacao_cid: 'E11' },
        ]),
        medicamentos: [
          { molecula: 'Losartana', marca: 'Zart', laboratorio: 'Eurofarma', concentracao: '50 mg', dose: '50 mg', via: 'Oral', frequencia: '1×/dia', duracao: '30 dias', indicacao_cid: 'I10' },
          { molecula: 'Dapagliflozina', marca: 'Glif', laboratorio: 'Eurofarma', concentracao: '10 mg', dose: '10 mg', via: 'Oral', frequencia: '1×/dia', duracao: '30 dias', indicacao_cid: 'E11' },
          { molecula: 'Metformina', concentracao: '850 mg', dose: '850 mg', via: 'Oral', frequencia: '2×/dia', duracao: '30 dias', indicacao_cid: 'E11' },
        ],
      }],
      evidencias_consultadas: [
        { estudo: 'DECLARE-TIMI 58', tipo: 'RCT' as const, nivel_evidencia: 'A' as const, grau_recomendacao: 'I' as const, fonte: 'NEJM 2019', ano: 2019, consultada_em: ts(dias) },
        { estudo: 'RENAAL', tipo: 'RCT' as const, nivel_evidencia: 'A' as const, grau_recomendacao: 'I' as const, fonte: 'NEJM 2001', ano: 2001, consultada_em: ts(dias) },
      ],
      diretrizes_utilizadas: [
        { sociedade: 'ADA', nome: 'Standards of Medical Care in Diabetes', ano: 2024, secao: 'Section 10', consultada_em: ts(dias) },
        { sociedade: 'SBC', nome: 'DBHA-7', ano: 2020, secao: 'Cap. 5', consultada_em: ts(dias) },
      ],
      ajustes_aplicados: [],
      alertas_ignorados: [],
      alertas_aceitos: ['SGLT-2 em DM2+DCV — Classe I-A'],
      contexto_clinico: `HAS + DM2, TFG ${62 + i * 3}. BRA + SGLT-2 + Metformina.`,
      protocolo_aplicado: 'Protocolo HAS + DM2 com DCV — SBC/ADA 2024',
      origem: 'consulta' as const,
    })),

    // ── HAS + DM2 — BRA + GLP-1 ──
    ...[4, 9, 15, 20, 26].map((dias, i) => ({
      usuario: { nome: 'Dr. João Silva', crm: '123456', uf_crm: 'SP', especialidade: 'Cardiologia' },
      timestamp_inicio: ts(dias, i + 2),
      timestamp_fim: ts(dias, i + 3),
      duracao_minutos: 25,
      paciente: {
        id_anonimo: gerarIdPacienteAnonimo(`glp1-${i}`),
        iniciais: `G${i + 1}.M.`,
        idade_anos: 52 + i * 3,
        sexo: 'M' as const,
        peso_kg: 92 + i * 2,
        tfg_ml_min: 70,
        alergias_registradas: [],
        comorbidades_ativas: ['HAS', 'DM2', 'Obesidade'],
      },
      tipo_evento: 'prescricao_gerada' as const,
      status: 'finalizado' as const,
      diagnosticos: [
        { cid: 'I10', descricao: 'Hipertensão arterial sistêmica', tipo: 'principal' as const, confirmado: true, data_registro: ts(dias) },
        { cid: 'E11', descricao: 'Diabetes mellitus tipo 2', tipo: 'secundario' as const, confirmado: true, data_registro: ts(dias) },
        { cid: 'E66', descricao: 'Obesidade', tipo: 'secundario' as const, confirmado: true, data_registro: ts(dias) },
      ],
      condutas: [
        { descricao: 'Adição de GLP-1 (Liraglutida 1,2 mg) — DM2 + obesidade + DCV', tipo: 'medicamentosa' as const, cid_relacionado: 'E11', diretriz_base: 'ADA 2024', registrada_em: ts(dias) },
        { descricao: 'Orientação nutricional e atividade física', tipo: 'nao_medicamentosa' as const, registrada_em: ts(dias) },
        { descricao: 'Retorno em 30 dias com peso e HbA1c', tipo: 'retorno' as const, registrada_em: ts(dias) },
      ],
      prescricoes: [{
        id_prescricao: `PRX-GLP1-${i}`,
        data_prescricao: ts(dias),
        status: 'emitida' as const,
        hash_conteudo: hashConteudoPrescricao([
          { molecula: 'Losartana', concentracao: '100 mg', dose: '100 mg', via: 'Oral', frequencia: '1×/dia', indicacao_cid: 'I10' },
          { molecula: 'Liraglutida', concentracao: '6 mg/mL', dose: '1,2 mg', via: 'SC', frequencia: '1×/dia', indicacao_cid: 'E11' },
        ]),
        medicamentos: [
          { molecula: 'Losartana', marca: 'Zart', laboratorio: 'Eurofarma', concentracao: '100 mg', dose: '100 mg', via: 'Oral', frequencia: '1×/dia', duracao: '30 dias', indicacao_cid: 'I10' },
          { molecula: 'Liraglutida', marca: 'Victoza', laboratorio: 'Novo Nordisk', concentracao: '6 mg/mL', dose: '1,2 mg', via: 'SC', frequencia: '1×/dia', duracao: '30 dias', indicacao_cid: 'E11' },
          { molecula: 'Metformina', concentracao: '1000 mg', dose: '1000 mg', via: 'Oral', frequencia: '2×/dia', duracao: '30 dias', indicacao_cid: 'E11' },
        ],
      }],
      evidencias_consultadas: [
        { estudo: 'LEADER', tipo: 'RCT' as const, nivel_evidencia: 'A' as const, grau_recomendacao: 'I' as const, fonte: 'NEJM 2016', ano: 2016, consultada_em: ts(dias) },
      ],
      diretrizes_utilizadas: [
        { sociedade: 'ADA', nome: 'Standards of Medical Care in Diabetes', ano: 2024, secao: 'Section 10', consultada_em: ts(dias) },
        { sociedade: 'EASD', nome: 'EASD Consensus', ano: 2023, consultada_em: ts(dias) },
      ],
      ajustes_aplicados: [],
      alertas_ignorados: [],
      alertas_aceitos: ['GLP-1 em DM2+DCV — Classe I-A'],
      contexto_clinico: `DM2 + obesidade + DCV. Adicionando GLP-1 por benefício cardiovascular e perda de peso.`,
      protocolo_aplicado: undefined,
      origem: 'consulta' as const,
    })),

    // ── IC-FEr — Quarteto ──
    ...[6, 11, 17, 23, 30].map((dias, i) => ({
      usuario: { nome: 'Dr. João Silva', crm: '123456', uf_crm: 'SP', especialidade: 'Cardiologia' },
      timestamp_inicio: ts(dias, i),
      timestamp_fim: ts(dias, i + 1),
      duracao_minutos: 30,
      paciente: {
        id_anonimo: gerarIdPacienteAnonimo(`ic-${i}`),
        iniciais: `I${i + 1}.C.`,
        idade_anos: 65 + i * 2,
        sexo: (i % 2 === 0 ? 'M' : 'F') as 'M' | 'F',
        peso_kg: 70 + i,
        tfg_ml_min: 45 + i * 4,
        alergias_registradas: i % 2 === 0 ? ['IECA (tosse)'] : [],
        comorbidades_ativas: ['IC-FEr', 'HAS'],
      },
      tipo_evento: 'prescricao_gerada' as const,
      status: 'finalizado' as const,
      diagnosticos: [
        { cid: 'I50.0', descricao: 'IC com fração de ejeção reduzida', tipo: 'principal' as const, confirmado: true, data_registro: ts(dias) },
        { cid: 'I10', descricao: 'HAS', tipo: 'secundario' as const, confirmado: true, data_registro: ts(dias) },
      ],
      condutas: [
        { descricao: 'Quarteto IC-FEr: ARNI + Betabloqueador + ARM + SGLT-2', tipo: 'medicamentosa' as const, cid_relacionado: 'I50.0', diretriz_base: 'ESC-HF 2021', registrada_em: ts(dias) },
        { descricao: 'Restrição hídrica 1,5L/dia + Pesagem diária', tipo: 'nao_medicamentosa' as const, registrada_em: ts(dias) },
        { descricao: 'Solicitação de ECG, ecocardiograma, BNP', tipo: 'solicitacao_exame' as const, registrada_em: ts(dias) },
        { descricao: 'Retorno em 14 dias — titulação', tipo: 'retorno' as const, registrada_em: ts(dias) },
      ],
      prescricoes: [{
        id_prescricao: `PRX-IC-${i}`,
        data_prescricao: ts(dias),
        status: 'emitida' as const,
        hash_conteudo: hashConteudoPrescricao([
          { molecula: 'Sacubitril/Valsartana', concentracao: '49/51 mg', dose: '49/51 mg', via: 'Oral', frequencia: '2×/dia', indicacao_cid: 'I50.0' },
        ]),
        medicamentos: [
          { molecula: 'Sacubitril/Valsartana', marca: 'Entresto', laboratorio: 'Novartis', concentracao: '49/51 mg', dose: '49/51 mg', via: 'Oral', frequencia: '2×/dia', duracao: '30 dias', indicacao_cid: 'I50.0' },
          { molecula: 'Carvedilol', concentracao: '12,5 mg', dose: '12,5 mg', via: 'Oral', frequencia: '2×/dia', duracao: '30 dias', indicacao_cid: 'I50.0' },
          { molecula: 'Espironolactona', concentracao: '25 mg', dose: '25 mg', via: 'Oral', frequencia: '1×/dia', duracao: '30 dias', indicacao_cid: 'I50.0' },
          { molecula: 'Dapagliflozina', marca: 'Glif', laboratorio: 'Eurofarma', concentracao: '10 mg', dose: '10 mg', via: 'Oral', frequencia: '1×/dia', duracao: '30 dias', indicacao_cid: 'I50.0' },
        ],
      }],
      evidencias_consultadas: [
        { estudo: 'PARADIGM-HF', tipo: 'RCT' as const, nivel_evidencia: 'B' as const, grau_recomendacao: 'I' as const, fonte: 'NEJM 2014', ano: 2014, consultada_em: ts(dias) },
        { estudo: 'EMPEROR-Reduced', tipo: 'RCT' as const, nivel_evidencia: 'A' as const, grau_recomendacao: 'I' as const, fonte: 'NEJM 2020', ano: 2020, consultada_em: ts(dias) },
      ],
      diretrizes_utilizadas: [
        { sociedade: 'ESC', nome: 'ESC Heart Failure Guidelines', ano: 2021, secao: 'Quarteto IC-FEr', consultada_em: ts(dias) },
      ],
      ajustes_aplicados: i % 2 === 0 ? [{
        tipo: 'renal' as const,
        descricao: 'Espironolactona dose reduzida — TFG < 45',
        dose_original: '50 mg',
        dose_ajustada: '25 mg',
        motivo: 'TFG 45 — dose máxima 25 mg',
        aplicado_em: ts(dias),
      }] : [],
      alertas_ignorados: i % 3 === 0 ? [{
        tipo: 'interacao' as const,
        severidade: 'grave' as const,
        mensagem: 'ARNI + ARM: risco de hipercalemia em TFG < 45 mL/min',
        farmaco_a: 'Sacubitril/Valsartana',
        farmaco_b: 'Espironolactona',
        justificativa_medico: 'Quarteto ESC-HF 2021 — monitoramento K+ semanal nas primeiras 4 semanas',
        ignorado_em: ts(dias),
      }] : [],
      alertas_aceitos: ['Quarteto IC-FEr — ESC 2021 Classe I-A para todos os 4 agentes'],
      contexto_clinico: `IC-FEr FE ${28 + i * 3}%. Quarteto ESC iniciado/titulado.`,
      protocolo_aplicado: 'Quarteto IC-FEr — ESC-HF 2021',
      origem: 'consulta' as const,
    })),

    // ── Dislipidemia + DCV — Estatina alta intensidade ──
    ...[8, 14, 21, 27].map((dias, i) => ({
      usuario: { nome: 'Dr. João Silva', crm: '123456', uf_crm: 'SP', especialidade: 'Cardiologia' },
      timestamp_inicio: ts(dias, i + 4),
      timestamp_fim: ts(dias, i + 5),
      duracao_minutos: 18,
      paciente: {
        id_anonimo: gerarIdPacienteAnonimo(`dlp-${i}`),
        iniciais: `L${i + 1}.D.`,
        idade_anos: 55 + i * 4,
        sexo: 'M' as const,
        peso_kg: 82,
        tfg_ml_min: 68,
        alergias_registradas: [],
        comorbidades_ativas: ['DCV', 'Dislipidemia mista'],
      },
      tipo_evento: 'prescricao_gerada' as const,
      status: 'finalizado' as const,
      diagnosticos: [
        { cid: 'E78', descricao: 'Dislipidemia mista', tipo: 'principal' as const, confirmado: true, data_registro: ts(dias) },
        { cid: 'I25', descricao: 'Doença coronariana crônica', tipo: 'secundario' as const, confirmado: true, data_registro: ts(dias) },
      ],
      condutas: [
        { descricao: 'Estatina alta intensidade (Atorvastatina 80 mg ou Rosuvastatina 40 mg)', tipo: 'medicamentosa' as const, cid_relacionado: 'E78', diretriz_base: 'SBC 2025', registrada_em: ts(dias) },
        { descricao: 'Orientação nutricional — dieta anti-inflamatória', tipo: 'nao_medicamentosa' as const, registrada_em: ts(dias) },
      ],
      prescricoes: [{
        id_prescricao: `PRX-DLP-${i}`,
        data_prescricao: ts(dias),
        status: 'emitida' as const,
        hash_conteudo: hashConteudoPrescricao([
          { molecula: i % 2 === 0 ? 'Atorvastatina' : 'Rosuvastatina', concentracao: i % 2 === 0 ? '80 mg' : '40 mg', dose: i % 2 === 0 ? '80 mg' : '40 mg', via: 'Oral', frequencia: '1×/dia', indicacao_cid: 'E78' },
        ]),
        medicamentos: [
          { molecula: i % 2 === 0 ? 'Atorvastatina' : 'Rosuvastatina', concentracao: i % 2 === 0 ? '80 mg' : '40 mg', dose: i % 2 === 0 ? '80 mg' : '40 mg', via: 'Oral', frequencia: '1×/dia noite', duracao: '90 dias', indicacao_cid: 'E78' },
          ...(i % 2 === 0 ? [{ molecula: 'Ezetimiba', concentracao: '10 mg', dose: '10 mg', via: 'Oral', frequencia: '1×/dia', duracao: '90 dias', indicacao_cid: 'E78' }] : []),
        ],
      }],
      evidencias_consultadas: [
        { estudo: i % 2 === 0 ? 'PROVE IT-TIMI 22' : 'JUPITER', tipo: 'RCT' as const, nivel_evidencia: 'A' as const, grau_recomendacao: 'I' as const, fonte: i % 2 === 0 ? 'NEJM 2004' : 'NEJM 2008', ano: i % 2 === 0 ? 2004 : 2008, consultada_em: ts(dias) },
      ],
      diretrizes_utilizadas: [
        { sociedade: 'SBC', nome: 'Diretriz de Dislipidemias', ano: 2025, secao: 'LDL-alvo risco muito alto', consultada_em: ts(dias) },
        { sociedade: 'ESC', nome: 'ESC/EAS Guidelines for Dyslipidaemias', ano: 2019, consultada_em: ts(dias) },
      ],
      ajustes_aplicados: [],
      alertas_ignorados: [],
      alertas_aceitos: ['Estatina alta intensidade — Classe I em DCV'],
      contexto_clinico: `DCV + dislipidemia. LDL ${98 + i * 5} mg/dL, meta < 50. Intensificando estatina.`,
      protocolo_aplicado: undefined,
      origem: 'consulta' as const,
    })),
  ];

  for (const c of cases) {
    registrarAudit(c);
  }
}

// ─── Labels de UI ─────────────────────────────────────────

export const NIVEL_EV_COR: Record<string, string> = {
  A: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  B: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',
  C: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export const CLASSE_COR: Record<string, string> = {
  'BRA':                         'bg-rose-100     text-rose-700     dark:bg-rose-900/30     dark:text-rose-400',
  'IECA':                        'bg-orange-100   text-orange-700   dark:bg-orange-900/30   dark:text-orange-400',
  'BCC':                         'bg-amber-100    text-amber-700    dark:bg-amber-900/30    dark:text-amber-400',
  'Tiazídico':                   'bg-yellow-100   text-yellow-700   dark:bg-yellow-900/30   dark:text-yellow-400',
  'ARM':                         'bg-lime-100     text-lime-700     dark:bg-lime-900/30     dark:text-lime-400',
  'Diurético alça':              'bg-green-100    text-green-700    dark:bg-green-900/30    dark:text-green-400',
  'Biguanida':                   'bg-emerald-100  text-emerald-700  dark:bg-emerald-900/30  dark:text-emerald-400',
  'SGLT-2':                      'bg-teal-100     text-teal-700     dark:bg-teal-900/30     dark:text-teal-400',
  'GLP-1':                       'bg-cyan-100     text-cyan-700     dark:bg-cyan-900/30     dark:text-cyan-400',
  'DPP-4':                       'bg-sky-100      text-sky-700      dark:bg-sky-900/30      dark:text-sky-400',
  'ARNI':                        'bg-blue-100     text-blue-700     dark:bg-blue-900/30     dark:text-blue-400',
  'Betabloqueador':              'bg-indigo-100   text-indigo-700   dark:bg-indigo-900/30   dark:text-indigo-400',
  'Estatina':                    'bg-violet-100   text-violet-700   dark:bg-violet-900/30   dark:text-violet-400',
  'Inibidor absorção colesterol':'bg-purple-100   text-purple-700   dark:bg-purple-900/30   dark:text-purple-400',
  'NOAC':                        'bg-fuchsia-100  text-fuchsia-700  dark:bg-fuchsia-900/30  dark:text-fuchsia-400',
  'Anticoagulante AVK':          'bg-pink-100     text-pink-700     dark:bg-pink-900/30     dark:text-pink-400',
};
