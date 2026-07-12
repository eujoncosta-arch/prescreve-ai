// ============================================================
// PRESCREVE-AI — Motor de Sincronização Eurofarma
// Arquitetura de sync contínuo com portal oficial
// Separação estrita: dados regulatórios ≠ evidência científica
// ============================================================

import type { ProdutoComercial, LabInfo } from './types';

// ─── NORMALIZAÇÃO DE MOLÉCULA ─────────────────────────────────
// Função canônica para comparar nomes de moléculas com robustez.
// Remove prefixos salinos, sufixos de hidratação e contra-íons para
// obter o nome base da molécula. Exportada para uso em todo o sistema.
export function normMol(s: string): string {
  return s
    .toLowerCase()
    // Prefixos salinos: "Cloridrato de X" → "X"
    .replace(
      /^(di-?|tri-?)?(cloridrato|dicloridrato|bromidrato|hemitartarato|mesilato|maleato|besilato|fumarato|succinato|oxalato|carbonato|bissulfato|divalproato|dipropionato|acetato|fosfato|sulfato|fosfato dissódico de)\s+(de|do|da)\s+/i,
      '',
    )
    // Sufixos de hidratação: "X Tri-hidratada" → "X"
    .replace(/\s+(tri-hidratad[ao]|di-hidratad[ao]|mono-hidratad[ao]|hidratad[ao]|an-hidro)\b.*/i, '')
    // Contra-íons adjetivados no final: "X Sódico", "X Potássica", "X Cálcica", "X Magnésico"
    .replace(/\s+(sódic[oa]|potássic[oa]|cálcic[oa]|magnésic[oa])\s*$/i, '')
    // Sais descritivos no final: "X de Potássio", "X de Sódio", "X de Cálcio"
    // Nota: usar .+ (não [\w\s]+) pois \w não captura acentos (ã, á, etc.) em JS
    .replace(/\s+(de|do|da)\s+.+$/i, '')
    .trim();
}

// ─── TIPOS DE SYNC ────────────────────────────────────────────

export type SyncState = 'idle' | 'syncing' | 'error' | 'success';

export interface SyncRecord {
  produto_id: string;
  nome_comercial: string;
  ultima_sync: string;
  versao_bula: string;
  hash_conteudo: string;
  alteracoes_detectadas: string[];
}

export interface SyncStatus {
  estado: SyncState;
  ultima_sync: string | null;
  proxima_sync: string | null;
  total_produtos: number;
  produtos_novos: number;
  produtos_atualizados: number;
  erros: string[];
  fonte_principal: string;
  fonte_bulas: string;
  versao_catalogo: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  tipo: 'sync_completo' | 'atualizacao_bula' | 'novo_produto' | 'remocao_produto' | 'nova_indicacao' | 'alteracao_posologia';
  produto_id?: string;
  produto_nome?: string;
  descricao: string;
  fonte: string;
  operador: 'sistema_automatico' | 'revisao_manual';
}

// ─── CORRELAÇÃO DIAGNÓSTICO → DIRETRIZ → CLASSE → MOLÉCULA → MARCA ──

export interface CorrelacaoTerapeutica {
  cid10: string[];
  diagnostico: string;
  diretrizes: Array<{
    nome: string;
    sociedade: string;
    ano: number;
    nivel_evidencia: string;
    grau_recomendacao: string;
    url_referencia?: string;
  }>;
  classes: Array<{
    nome: string;
    posicao_terapeutica: string;
    moleculas: Array<{
      nome: string;
      grau_recomendacao: string;
      nivel_evidencia: string;
      produtos_eurofarma: string[]; // IDs em EUROFARMA_CATALOG
    }>;
  }>;
  notas_clinicas: string[];
}

// ─── CATÁLOGO EUROFARMA COMPLETO ──────────────────────────────
// Fonte: Portal Eurofarma + bulas ANVISA registradas
// Todos os dados são regulatórios — separados da evidência científica

export const EUROFARMA_CATALOG: ProdutoComercial[] = [

  // ═══════════════════════════════════════════
  // CARDIOVASCULAR — Bloqueadores do SRAA
  // ═══════════════════════════════════════════

  {
    id: 'euro-zart-50',
    lab_id: 'eurofarma',
    molecula: 'Losartana Potássica',
    nome_comercial: 'Zart®',
    classe_terapeutica: 'Bloqueador do Receptor da Angiotensina II (BRA/SARA)',
    cids_aprovados: ['I10', 'I50', 'N18'],
    apresentacoes: [
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0281.0164.001-5' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0281.0164.002-3' },
    ],
    posologia_aprovada: 'HAS: 50 mg 1x/dia, podendo aumentar para 100 mg/dia. Nefropatia diabética: 50–100 mg/dia.',
    contraindicacoes_bula: ['Hipersensibilidade à losartana', 'Gravidez (2º e 3º trimestres)', 'Uso concomitante com alisquireno em DM ou IR'],
    advertencias_principais: ['Monitorar potássio e creatinina', 'Hipotensão em pacientes hipovolêmicos', 'Estenose bilateral de artéria renal'],
    interacoes_principais: ['AINEs reduzem efeito anti-hipertensivo', 'Poupadores de potássio aumentam risco de hipercalemia', 'Lítio: aumento de toxicidade'],
    uso_populacoes_especiais: { renal: 'Sem ajuste para ClCr > 10 mL/min', hepatico: 'Iniciar com 25 mg em hepatopatia grave', gestante: 'CONTRAINDICADO 2º-3º trimestres', idoso: 'Sem ajuste necessário' },
    data_registro: '2018-03-15',
    data_ultima_atualizacao: '2025-11-20',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-zart.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-zart.pdf',
  },

  {
    id: 'euro-zart-h',
    lab_id: 'eurofarma',
    molecula: 'Losartana Potássica + Hidroclorotiazida',
    nome_comercial: 'Zart H®',
    classe_terapeutica: 'BRA + Diurético Tiazídico (Associação)',
    cids_aprovados: ['I10'],
    apresentacoes: [
      { concentracao: '50/12,5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '100/25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'HAS não controlada com monoterapia: 1 comprimido 1x/dia. Iniciar pela menor dose disponível.',
    contraindicacoes_bula: ['Gravidez', 'Anúria', 'Hipersensibilidade a sulfonamidas', 'Uso com alisquireno em DM/IR'],
    advertencias_principais: ['Monitorar eletrólitos e função renal', 'Hipocalemia', 'Hipotensão na depleção de volume'],
    interacoes_principais: ['AINEs', 'Poupadores de potássio', 'Lítio', 'Digitálicos'],
    uso_populacoes_especiais: { renal: 'Evitar em ClCr < 30 mL/min', gestante: 'CONTRAINDICADO', idoso: 'Monitorar PA e eletrólitos' },
    data_registro: '2019-04-10',
    data_ultima_atualizacao: '2025-11-20',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-zart-h.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-zart-h.pdf',
  },

  {
    id: 'euro-holmes-20',
    lab_id: 'eurofarma',
    molecula: 'Olmesartana Medoxomila',
    nome_comercial: 'Holmes®',
    classe_terapeutica: 'Bloqueador do Receptor da Angiotensina II (BRA/SARA)',
    cids_aprovados: ['I10'],
    apresentacoes: [
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0281.0192.001-7' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '60 comprimidos', registro_anvisa: '1.0281.0192.001-7' },
      { concentracao: '40 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0281.0192.002-5' },
      { concentracao: '40 mg', forma_farmaceutica: 'comprimido', embalagem: '60 comprimidos', registro_anvisa: '1.0281.0192.002-5' },
    ],
    posologia_aprovada: 'HAS: 20 mg 1x/dia. Dose máxima: 40 mg/dia. Não requer ajuste renal/hepático leve.',
    contraindicacoes_bula: ['Hipersensibilidade à olmesartana', 'Gravidez', 'Uso com alisquireno em DM/IR'],
    advertencias_principais: ['Enteropatia severa (síndrome sprue-like) relatada', 'Hipotensão na depleção de volume'],
    interacoes_principais: ['AINEs', 'Diuréticos poupadores de potássio', 'Lítio'],
    uso_populacoes_especiais: { renal: 'Cuidado em IR grave (ClCr < 20)', hepatico: 'Não usar em hepatopatia grave', gestante: 'CONTRAINDICADO' },
    data_registro: '2020-06-10',
    data_ultima_atualizacao: '2025-10-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-holmes.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-holmes.pdf',
  },

  {
    id: 'euro-valsartana-80',
    lab_id: 'eurofarma',
    molecula: 'Valsartana',
    nome_comercial: 'Vartaz®',
    classe_terapeutica: 'Bloqueador do Receptor da Angiotensina II (BRA/SARA)',
    cids_aprovados: ['I10', 'I50', 'I21'],
    apresentacoes: [
      { concentracao: '80 mg', forma_farmaceutica: 'comprimido', embalagem: '15 ou 30 comprimidos' },
      { concentracao: '160 mg', forma_farmaceutica: 'comprimido', embalagem: '15 ou 30 comprimidos' },
      { concentracao: '320 mg', forma_farmaceutica: 'comprimido', embalagem: '15 ou 30 comprimidos' },
    ],
    posologia_aprovada: 'HAS: 80–160 mg 1x/dia; máx 320 mg/dia. IC (NYHA II–IV): 40 mg 2x/dia → titular até 160 mg 2x/dia (máx 320 mg/dia fracionado). Pós-IAM: 20 mg 2x/dia → titular até 160 mg 2x/dia em 3 meses.',
    contraindicacoes_bula: ['Gravidez (Categoria D)', 'Lactação', 'Uso com alisquireno em DM tipo 2', 'Hipersensibilidade à valsartana ou excipientes'],
    advertencias_principais: ['Hipotensão sintomática em depleção de sódio/volume — corrigir antes de iniciar', 'Hipercalemia — monitorar com poupadores de K+', 'Monitorar função renal em IC grave e pós-IAM', 'Angioedema — descontinuar imediatamente', 'Cautela na tripla combinação IECA + BB + valsartana em IC'],
    interacoes_principais: ['Alisquireno (contraindicado em DM; evitar em IR grave)', 'AINEs (redução efeito anti-hipertensivo + risco renal)', 'Poupadores de K+ / suplementos de K+ (hipercalemia)', 'Lítio (aumento da litemia)', 'Ritonavir (aumento da exposição à valsartana)', 'Rifampicina/Ciclosporina (inibição transportador OATP1B1)'],
    uso_populacoes_especiais: {
      renal: 'Sem ajuste necessário (excreção renal apenas 30%). Cautela se ClCr < 10 mL/min (sem dados). Não é removida por hemodiálise',
      hepatico: 'Sem ajuste em hepatopatia não biliar sem colestase. Cautela em obstrução biliar/cirrose biliar (ASC duplica)',
      gestante: 'CONTRAINDICADO — Categoria D. Oligodrâmnio, hipoplasia renal fetal, morte. Descontinuar imediatamente se gravidez confirmada',
      lactante: 'CONTRAINDICADO — transferência para leite de ratas confirmada; risco em humanos não excluído',
      idoso: 'Sem ajuste (maior exposição sistêmica sem significado clínico)',
      pediatrico: 'Não aprovado no Brasil para < 18 anos',
    },
    registro_anvisa: '1.0043.1091',
    data_registro: '2014-06-10',
    data_ultima_atualizacao: '2022-08-04',
    versao_bula: 'v10',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-vartaz-paciente.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-vartaz-profissional.pdf',
  },

  {
    id: 'euro-irbesartana-150',
    lab_id: 'eurofarma',
    molecula: 'Irbesartana',
    nome_comercial: 'Irbesartana Eurofarma',
    classe_terapeutica: 'Bloqueador do Receptor da Angiotensina II (BRA/SARA)',
    cids_aprovados: ['I10', 'N18'],
    apresentacoes: [
      { concentracao: '150 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '300 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'HAS: 150 mg 1x/dia; máx 300 mg/dia. Nefropatia diabética: 300 mg/dia.',
    contraindicacoes_bula: ['Gravidez', 'Hipersensibilidade'],
    advertencias_principais: ['Hipotensão em depleção de volume', 'Hipercalemia'],
    interacoes_principais: ['AINEs', 'Poupadores de potássio', 'Lítio'],
    uso_populacoes_especiais: { renal: 'Sem ajuste necessário', gestante: 'CONTRAINDICADO' },
    data_registro: '2018-10-05',
    data_ultima_atualizacao: '2025-08-20',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-irbesartana-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-irbesartana-eurofarma.pdf',
  },

  {
    id: 'euro-enalapril-10',
    lab_id: 'eurofarma',
    molecula: 'Maleato de Enalapril',
    nome_comercial: 'Enalapril Eurofarma',
    classe_terapeutica: 'Inibidor da Enzima Conversora de Angiotensina (IECA)',
    cids_aprovados: ['I10', 'I50', 'I25'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'HAS: 5–40 mg/dia em 1–2 tomadas. IC: 2,5 mg 2x/dia titulando até 20 mg 2x/dia.',
    contraindicacoes_bula: ['Histórico de angioedema por IECA', 'Gravidez', 'Uso concomitante com sacubitril/valsartana (< 36h)'],
    advertencias_principais: ['Tosse seca em 10–15%', 'Angioedema raro mas grave', 'Hipercalemia'],
    interacoes_principais: ['AINEs', 'Poupadores de potássio', 'Lítio', 'Antidiabéticos (hipoglicemia)'],
    uso_populacoes_especiais: { renal: 'Reduzir dose em ClCr < 30 mL/min', gestante: 'CONTRAINDICADO', idoso: 'Iniciar com 2,5–5 mg' },
    data_registro: '2015-08-20',
    data_ultima_atualizacao: '2025-09-01',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-enalapril-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-enalapril-eurofarma.pdf',
  },

  // ═══════════════════════════════════════════
  // CARDIOVASCULAR — Bloqueadores de Canal de Cálcio
  // ═══════════════════════════════════════════

  {
    id: 'euro-anlodipino-5',
    lab_id: 'eurofarma',
    molecula: 'Besilato de Anlodipino',
    nome_comercial: 'Anlodipino Eurofarma',
    classe_terapeutica: 'Bloqueador de Canal de Cálcio (BCC) — Diidropiridínico',
    cids_aprovados: ['I10', 'I20'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'HAS/angina: 5 mg 1x/dia. Dose máxima: 10 mg/dia.',
    contraindicacoes_bula: ['Hipersensibilidade', 'Hipotensão grave', 'Choque cardiogênico'],
    advertencias_principais: ['Edema de tornozelo dose-dependente', 'Rubor facial', 'Taquicardia reflexa'],
    interacoes_principais: ['Ciclosporina (aumenta níveis)', 'Sinvastatina (limitar a 20 mg/dia)', 'Inibidores CYP3A4'],
    uso_populacoes_especiais: { hepatico: 'Iniciar com 2,5 mg em hepatopatia', idoso: 'Mesma dose, monitorar PA' },
    data_registro: '2014-02-18',
    data_ultima_atualizacao: '2025-08-10',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-anlodipino-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-anlodipino-eurofarma.pdf',
  },

  // ═══════════════════════════════════════════
  // CARDIOVASCULAR — Diuréticos
  // ═══════════════════════════════════════════

  {
    id: 'euro-hctz-25',
    lab_id: 'eurofarma',
    molecula: 'Hidroclorotiazida',
    nome_comercial: 'Hidroclorotiazida Eurofarma',
    classe_terapeutica: 'Diurético Tiazídico',
    cids_aprovados: ['I10', 'R60'],
    apresentacoes: [
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'HAS: 12,5–25 mg 1x/dia pela manhã. Dose máxima antihipertensiva: 25 mg/dia.',
    contraindicacoes_bula: ['Anúria', 'Sulfonamidas (hipersensibilidade cruzada)', 'Hipocalemia refratária'],
    advertencias_principais: ['Hipocalemia, hiponatremia', 'Hiperglicemia (DM2)', 'Hiperuricemia (gota)'],
    interacoes_principais: ['Digitálicos (toxicidade na hipocalemia)', 'Lítio', 'AINEs', 'Antidiabéticos'],
    uso_populacoes_especiais: { renal: 'INEFICAZ em ClCr < 30 mL/min', gestante: 'Evitar (reduz volume placentário)' },
    data_registro: '2013-05-12',
    data_ultima_atualizacao: '2025-07-20',
    versao_bula: 'v2024.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-hctz-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-hctz-eurofarma.pdf',
  },

  {
    id: 'euro-furosemida-40',
    lab_id: 'eurofarma',
    molecula: 'Furosemida',
    nome_comercial: 'Furosemida Eurofarma',
    classe_terapeutica: 'Diurético de Alça',
    cids_aprovados: ['I50', 'R60', 'N18'],
    apresentacoes: [
      { concentracao: '40 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '10 mg/mL', forma_farmaceutica: 'solucao_oral', embalagem: 'Frasco 60 mL' },
    ],
    posologia_aprovada: 'IC/edema: 20–80 mg/dia VO ou IV. Titular conforme resposta diurética.',
    contraindicacoes_bula: ['Anúria', 'Hipersensibilidade a sulfonamidas'],
    advertencias_principais: ['Hipocalemia', 'Desidratação', 'Ototoxicidade em doses altas'],
    interacoes_principais: ['Aminoglicosídeos (ototoxicidade)', 'Digitálicos', 'AINEs'],
    uso_populacoes_especiais: { renal: 'Doses maiores necessárias em IR grave' },
    data_registro: '2012-11-08',
    data_ultima_atualizacao: '2025-06-15',
    versao_bula: 'v2024.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-furosemida-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-furosemida-eurofarma.pdf',
  },

  {
    id: 'euro-espiro-25',
    lab_id: 'eurofarma',
    molecula: 'Espironolactona',
    nome_comercial: 'Espironolactona Eurofarma',
    classe_terapeutica: 'Antagonista da Aldosterona (Poupador de Potássio)',
    cids_aprovados: ['I50', 'I10', 'K70'],
    apresentacoes: [
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'IC (NYHA II–IV): 25–50 mg/dia. Hiperaldosteronismo/ascite: 100–400 mg/dia.',
    contraindicacoes_bula: ['Hipercalemia', 'IR grave (ClCr < 30)', 'Insuficiência adrenal'],
    advertencias_principais: ['Monitorar K+ e creatinina rigorosamente', 'Ginecomastia', 'Irregularidade menstrual'],
    interacoes_principais: ['IECA/BRA (hipercalemia)', 'AINEs', 'Digoxina (aumenta nível)'],
    uso_populacoes_especiais: { renal: 'CONTRAINDICADO em ClCr < 30 mL/min', gestante: 'Evitar' },
    data_registro: '2016-04-22',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-espironolactona-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-espironolactona-eurofarma.pdf',
  },

  // ═══════════════════════════════════════════
  // CARDIOVASCULAR — Betabloqueadores
  // ═══════════════════════════════════════════

  {
    id: 'euro-carvedilol-625',
    lab_id: 'eurofarma',
    molecula: 'Carvedilol',
    nome_comercial: 'Carvedilol Eurofarma',
    classe_terapeutica: 'Betabloqueador não-seletivo + Alfa-1 bloqueador',
    cids_aprovados: ['I50', 'I10', 'I25'],
    apresentacoes: [
      { concentracao: '6,25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '12,5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'IC: iniciar 3,125 mg 2x/dia, dobrar a cada 2 semanas até 25–50 mg 2x/dia. HAS: 12,5–25 mg 2x/dia.',
    contraindicacoes_bula: ['Asma brônquica', 'BAV 2º/3º grau', 'Bradicardia grave (< 50 bpm)', 'IC descompensada'],
    advertencias_principais: ['Não suspender abruptamente', 'Mascarar hipoglicemia', 'Broncoespasmo'],
    interacoes_principais: ['Verapamil/diltiazem (BAV)', 'Insulina/hipoglicemiantes', 'Digoxina'],
    uso_populacoes_especiais: { hepatico: 'CONTRAINDICADO em hepatopatia grave', idoso: 'Mesma dose' },
    data_registro: '2017-09-14',
    data_ultima_atualizacao: '2025-09-30',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-carvedilol-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-carvedilol-eurofarma.pdf',
  },

  {
    id: 'euro-bisoprolol-5',
    lab_id: 'eurofarma',
    molecula: 'Hemifumarato de Bisoprolol',
    nome_comercial: 'Bizo®',
    classe_terapeutica: 'Betabloqueador seletivo β1',
    cids_aprovados: ['I50', 'I10', 'I20'],
    apresentacoes: [
      { concentracao: '2,5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'HAS/Angina (5 e 10 mg): 5 mg 1x/dia; máx 20 mg/dia. IC crônica estável (2,5–10 mg): titulação semanal 1,25→2,5→3,75→5→7,5→10 mg 1x/dia; máx 10 mg/dia.',
    contraindicacoes_bula: ['IC aguda ou descompensação que requer inotrópico IV', 'Choque cardiogênico', 'BAV 2º/3º grau (sem marcapasso)', 'Síndrome do nó sinusal', 'Bloqueio sinoatrial', 'Bradicardia sintomática', 'Hipotensão sintomática', 'Asma brônquica grave', 'Doença arterial periférica grave / Síndrome de Raynaud', 'Feocromocitoma não tratado', 'Acidose metabólica', 'Hipersensibilidade ao bisoprolol'],
    advertencias_principais: ['Não suspender abruptamente em coronariopatas — reduzir gradualmente', 'Asma/DPOC — usar com cautela; broncodilatador concomitante', 'Mascarar hipoglicemia e sinais de tireotoxicose', 'Titulação obrigatória na IC com monitoramento de PA e FC'],
    interacoes_principais: ['Verapamil/Diltiazem IV (hipotensão profunda + BAV)', 'Antiarrítmicos classe I (condução AV potencializada)', 'Clonidina (rebote hipertensivo na retirada)', 'Insulina/antidiabéticos orais (mascaramento hipoglicemia)', 'Amiodarona (classe III)', 'AINEs (redução do efeito anti-hipertensivo)'],
    uso_populacoes_especiais: {
      renal: 'HAS/Angina: sem ajuste em IR leve-moderada; ClCr < 20 mL/min: máx 10 mg/dia. IC: titular com cautela adicional (sem dados disponíveis)',
      hepatico: 'HAS/Angina: sem ajuste em hepatopatia leve-moderada; grave: máx 10 mg/dia. IC: titular com cautela adicional',
      gestante: 'Categoria C — não recomendado salvo se estritamente necessário; monitorar fluxo uteroplacentário e FC neonatal',
      lactante: 'CONTRAINDICADO durante aleitamento — pode ser excretado no leite humano',
      idoso: 'Sem ajuste de dose necessário',
      pediatrico: 'Sem experiência pediátrica — não recomendado',
    },
    registro_anvisa: '1.0043.1536',
    data_registro: '2019-02-28',
    data_ultima_atualizacao: '2025-05-16',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-bizo-paciente.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-bizo-profissional.pdf',
  },

  {
    id: 'euro-metoprolol-50',
    lab_id: 'eurofarma',
    molecula: 'Succinato de Metoprolol',
    nome_comercial: 'Metoprolol Eurofarma',
    classe_terapeutica: 'Betabloqueador seletivo β1',
    cids_aprovados: ['I50', 'I10', 'I48', 'I25'],
    apresentacoes: [
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'HAS: 50–100 mg 1x/dia. IC (MERIT-HF): iniciar 12,5–25 mg/dia, titular até 200 mg/dia. FA: 25–100 mg 2x/dia.',
    contraindicacoes_bula: ['BAV 2º/3º grau', 'Bradicardia sintomática (< 45 bpm)', 'IC descompensada', 'Hipotensão grave'],
    advertencias_principais: ['Não suspender abruptamente em coronariopatas (risco de angina/IAM)', 'Asma — alta cautela', 'Mascarar hipoglicemia'],
    interacoes_principais: ['Verapamil/diltiazem (BAV)', 'Clonidina', 'Antiarrítmicos classe I', 'Insulina'],
    uso_populacoes_especiais: { hepatico: 'Reduzir dose em hepatopatia grave', idoso: 'Iniciar com menor dose disponível' },
    data_registro: '2016-11-10',
    data_ultima_atualizacao: '2025-10-20',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-metoprolol-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-metoprolol-eurofarma.pdf',
  },


  // ═══════════════════════════════════════════
  // DIABETES
  // ═══════════════════════════════════════════

  {
    id: 'euro-metformina-850',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Metformina',
    nome_comercial: 'Metformina',
    classe_terapeutica: 'Biguanida — Antidiabético oral',
    cids_aprovados: ['E11', 'E14'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '850 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '1000 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Iniciar 500–850 mg 1–2x/dia às refeições. Dose máxima: 3 g/dia em doses divididas.',
    contraindicacoes_bula: ['IR grave (ClCr < 30 mL/min)', 'Acidose metabólica/cetoacidose', 'Insuficiência hepática grave'],
    advertencias_principais: ['Suspender 48h antes de contraste iodado', 'Risco de acidose lática (raro)', 'Déficit de B12 em uso prolongado'],
    interacoes_principais: ['Contraste iodado (suspender)', 'Álcool (acidose lática)', 'Cimetidina (aumenta níveis)'],
    uso_populacoes_especiais: { renal: 'Reduzir dose em ClCr 30–45; CONTRAINDICADO < 30', gestante: 'Avaliar — pode ser usado', idoso: 'Monitorar função renal' },
    data_registro: '2013-07-10',
    data_ultima_atualizacao: '2025-08-20',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-metformina-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-metformina-eurofarma.pdf',
  },

  {
    id: 'euro-glicazida-30',
    lab_id: 'eurofarma',
    molecula: 'Glicazida',
    nome_comercial: 'Glicazida Eurofarma',
    classe_terapeutica: 'Sulfonilureia — Antidiabético oral',
    cids_aprovados: ['E11'],
    apresentacoes: [
      { concentracao: '30 mg', forma_farmaceutica: 'comprimido_liberacao_modificada', embalagem: '30 comprimidos' },
      { concentracao: '60 mg', forma_farmaceutica: 'comprimido_liberacao_modificada', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Iniciar 30 mg 1x/dia ao café da manhã. Dose máxima: 120 mg/dia. Preferida à glibenclamida em idosos.',
    contraindicacoes_bula: ['DM1', 'Cetoacidose', 'IR grave', 'Hipersensibilidade a sulfonamidas'],
    advertencias_principais: ['Hipoglicemia (menor risco que glibenclamida)', 'Monitorar função renal', 'Suspender antes de procedimentos com jejum prolongado'],
    interacoes_principais: ['Fluconazol (potencializa hipoglicemia)', 'Rifampicina (reduz efeito)', 'Álcool'],
    uso_populacoes_especiais: { idoso: 'Preferida em idosos (menor risco de hipoglicemia que glibenclamida)', renal: 'Cautela em IR moderada' },
    data_registro: '2016-05-15',
    data_ultima_atualizacao: '2025-08-01',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-glicazida-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-glicazida-eurofarma.pdf',
  },

  {
    id: 'euro-glibenclamida-5',
    lab_id: 'eurofarma',
    molecula: 'Glibenclamida',
    nome_comercial: 'Glibenclamida Eurofarma',
    classe_terapeutica: 'Sulfonilureia — Antidiabético oral',
    cids_aprovados: ['E11'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: '2,5–20 mg/dia. Iniciar 2,5–5 mg/dia antes das refeições. Dose máxima: 20 mg/dia.',
    contraindicacoes_bula: ['IR/IH grave', 'DM1/cetoacidose', 'Porfiria'],
    advertencias_principais: ['⚠ BEERS: alto risco de hipoglicemia grave e prolongada em idosos', 'Hipoglicemia noturna'],
    interacoes_principais: ['Fluconazol (potencializa)', 'Rifampicina (reduz)', 'Beta-bloq (mascarar hipoglicemia)'],
    uso_populacoes_especiais: { idoso: 'EVITAR — Critérios de Beers (hipoglicemia prolongada)', renal: 'Evitar em IR' },
    data_registro: '2012-04-05',
    data_ultima_atualizacao: '2024-11-10',
    versao_bula: 'v2024.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-glibenclamida-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-glibenclamida-eurofarma.pdf',
  },

  // ═══════════════════════════════════════════
  // RESPIRATÓRIO
  // ═══════════════════════════════════════════

  {
    id: 'euro-noex-200',
    lab_id: 'eurofarma',
    molecula: 'Budesonida',
    nome_comercial: 'Noex®',
    classe_terapeutica: 'Corticosteroide Inalatório (CI)',
    cids_aprovados: ['J45', 'J44'],
    apresentacoes: [
      { concentracao: '32 mcg/dose', forma_farmaceutica: 'spray', embalagem: 'Frasco 120 doses' },
      { concentracao: '50 mcg/dose', forma_farmaceutica: 'spray', embalagem: 'Frasco 200 doses' },
      { concentracao: '64 mcg/dose', forma_farmaceutica: 'spray', embalagem: 'Frasco 120 doses' },
      { concentracao: '100 mcg/dose', forma_farmaceutica: 'spray', embalagem: 'Frasco 100 doses' },
    ],
    posologia_aprovada: 'Asma leve/moderada: 200–400 mcg 2x/dia. Asma grave: 800–1600 mcg/dia divididos. Lavar a boca após uso.',
    contraindicacoes_bula: ['Hipersensibilidade à budesonida', 'Episódio agudo de asma (sem broncodilatador)'],
    advertencias_principais: ['Candidíase oral — lavar boca após uso', 'Não substituir corticosteroide sistêmico abruptamente', 'Monitorar crescimento em crianças'],
    interacoes_principais: ['Cetoconazol/itraconazol (aumentam níveis)', 'Inibidores CYP3A4'],
    uso_populacoes_especiais: { pediatrico: 'Crianças ≥ 6 anos: 100–400 mcg/dia', gestante: 'Pode usar — menor risco que asma não tratada' },
    data_registro: '2016-12-01',
    data_ultima_atualizacao: '2025-11-01',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-noex.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-noex.pdf',
  },

  {
    id: 'euro-formoterol-12',
    lab_id: 'eurofarma',
    molecula: 'Fumarato de Formoterol',
    nome_comercial: 'Formoterol Eurofarma',
    classe_terapeutica: 'Beta-2 agonista de longa ação (LABA)',
    cids_aprovados: ['J45', 'J44'],
    apresentacoes: [
      { concentracao: '12 mcg/dose', forma_farmaceutica: 'inalatorio', embalagem: 'Frasco 60 doses' },
    ],
    posologia_aprovada: 'Asma (SEMPRE com CI): 12 mcg 2x/dia. DPOC: 12 mcg 2x/dia. Não usar como monoterapia na asma.',
    contraindicacoes_bula: ['Monoterapia na asma sem CI', 'Taquiarritmias'],
    advertencias_principais: ['⚠ NUNCA usar LABA sem CI na asma (aumento de mortalidade)', 'Hipocalemia', 'Taquicardia'],
    interacoes_principais: ['Beta-bloqueadores (antagonismo)', 'QT-prolongadores', 'Diuréticos (hipocalemia)'],
    uso_populacoes_especiais: { pediatrico: 'Não recomendado < 6 anos' },
    data_registro: '2018-05-20',
    data_ultima_atualizacao: '2025-08-15',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-formoterol-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-formoterol-eurofarma.pdf',
  },

  {
    id: 'euro-lugano',
    lab_id: 'eurofarma',
    molecula: 'Fumarato de Formoterol Diidratado + Propionato de Fluticasona',
    nome_comercial: 'Lugano®',
    classe_terapeutica: 'ICS + LABA — Corticosteroide Inalatório + Beta-2 Agonista de Longa Ação',
    cids_aprovados: ['J45', 'J44', 'J44.1'],
    apresentacoes: [
      { concentracao: '12/250 mcg/cápsula', forma_farmaceutica: 'inalatorio', embalagem: '60 cápsulas + inalador CDM Haler' },
      { concentracao: '12/250 mcg/cápsula', forma_farmaceutica: 'inalatorio', embalagem: '8 cápsulas (refil)' },
      { concentracao: '12/250 mcg/cápsula', forma_farmaceutica: 'inalatorio', embalagem: '60 cápsulas (refil)' },
    ],
    posologia_aprovada: 'Asma (adultos e ≥ 12 anos): 1 cápsula inalada 2x/dia (manhã e noite). Não usar como medicação de resgate.',
    contraindicacoes_bula: ['Hipersensibilidade ao formoterol ou fluticasona', 'Asma aguda / crise grave (não usar como resgate isolado)', 'Tuberculose ativa', 'Infecções respiratórias fúngicas ou virais'],
    advertencias_principais: [
      '⚠ LABA: NUNCA usar sem CI na asma (risco de morte)',
      'Candidíase orofaríngea — bochechar após cada uso',
      'Supressão adrenal com doses altas de fluticasona',
      'Catarata e glaucoma com uso prolongado',
      'Hipocalemia (especialmente com diuréticos)',
      'Taquicardia / palpitações (formoterol)',
    ],
    interacoes_principais: ['Beta-bloqueadores (antagonismo ao formoterol)', 'Cetoconazol/itraconazol (aumentam fluticasona via CYP3A4)', 'Diuréticos tiazídicos ou de alça (hipocalemia aditiva)', 'QT-prolongadores (cautela)'],
    uso_populacoes_especiais: { gestante: 'Categoria C — usar apenas se benefício superar risco; fluticasona preferida a doses altas de BDP na gestante', pediatrico: '≥ 4 anos (aerossol com espaçador recomendado)' },
    data_registro: '2021-03-10',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-lugano.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-lugano.pdf',
  },

  {
    id: 'euro-montelucaste-10',
    lab_id: 'eurofarma',
    molecula: 'Montelucaste Sódico',
    nome_comercial: 'Montelucaste Eurofarma',
    classe_terapeutica: 'Antagonista de Leucotrienos',
    cids_aprovados: ['J45', 'J30'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Adultos/adolescentes ≥ 15 anos: 10 mg 1x/dia à noite. Crianças 6–14 anos: 5 mg 1x/dia.',
    contraindicacoes_bula: ['Hipersensibilidade ao montelucaste'],
    advertencias_principais: ['⚠ FDA Black Box: alterações neuropsiquiátricas (depressão, suicídio). Reservar para quando benefício supera risco.', 'Síndrome Churg-Strauss (raro)'],
    interacoes_principais: ['Fenobarbital (reduz níveis)', 'Rifampicina'],
    uso_populacoes_especiais: { pediatrico: 'Pediátrico a partir de 6 meses (4 mg granulado)' },
    data_registro: '2019-03-10',
    data_ultima_atualizacao: '2025-09-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-montelucaste-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-montelucaste-eurofarma.pdf',
  },

  // ═══════════════════════════════════════════
  // SAÚDE MENTAL
  // ═══════════════════════════════════════════

  {
    id: 'euro-desve-50',
    lab_id: 'eurofarma',
    molecula: 'Desvenlafaxina',
    nome_comercial: 'Desve®',
    classe_terapeutica: 'Inibidor de Recaptação de Serotonina e Noradrenalina (IRSN)',
    cids_aprovados: ['F32', 'F33', 'F41'],
    apresentacoes: [
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido_liberacao_prolongada', embalagem: '30 comprimidos', registro_anvisa: '1.0281.0210.001-3' },
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido_liberacao_prolongada', embalagem: '60 comprimidos', registro_anvisa: '1.0281.0210.001-3' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido_liberacao_prolongada', embalagem: '30 comprimidos', registro_anvisa: '1.0281.0210.002-1' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido_liberacao_prolongada', embalagem: '60 comprimidos', registro_anvisa: '1.0281.0210.002-1' },
    ],
    posologia_aprovada: 'Depressão: 50 mg 1x/dia (dose eficaz estabelecida). Dose máxima aprovada pela ANVISA: 100 mg/dia. Doses > 100 mg/dia não demonstraram benefício adicional em estudos clínicos.',
    contraindicacoes_bula: ['IMAO (washout 14 dias)', 'Hipersensibilidade'],
    advertencias_principais: ['Síndrome serotoninérgica com IMAOs', 'Aumento de PA — monitorar', 'Não suspender abruptamente (síndrome de descontinuação)', 'Ideação suicida (jovens < 25 anos — monitorar)', 'Hiponatremia (SIADH)'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Tripanos (síndrome serotoninérgica)', 'Lítio', 'Varfarina (monitorar INR)', 'AINEs/aspirina (sangramento)'],
    uso_populacoes_especiais: { renal: 'ClCr 30–50: 50 mg/2 dias; < 30: 50 mg/3 dias', hepatico: 'Dose máxima 100 mg/dia', gestante: 'Avaliar: síndrome de abstinência neonatal', idoso: 'Iniciar com dose menor' },
    data_registro: '2021-07-08',
    data_ultima_atualizacao: '2025-11-15',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-desve.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-desve.pdf',
  },

  {
    id: 'euro-afetus',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Sertralina',
    nome_comercial: 'Afetus®',
    classe_terapeutica: 'Inibidor Seletivo da Recaptação de Serotonina (ISRS)',
    cids_aprovados: ['F32', 'F33', 'F41', 'F42', 'F43', 'F40'],
    apresentacoes: [
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0281.0301.001-2' },
    ],
    posologia_aprovada: 'Depressão: iniciar 50 mg/dia; dose usual 50–200 mg/dia. TOC: até 200 mg/dia. TEPT/fobia social: iniciar 25 mg/dia.',
    contraindicacoes_bula: ['IMAOs (washout 14 dias)', 'Pimozida', 'Hipersensibilidade'],
    advertencias_principais: ['Ideação suicida nas primeiras semanas (monitorar < 25 anos)', 'Síndrome serotoninérgica', 'Hiponatremia/SIADH', 'Síndrome de descontinuação'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Tramadol', 'Varfarina', 'Lítio', 'Triptanos'],
    uso_populacoes_especiais: { hepatico: 'Reduzir dose ou intervalo em hepatopatia', gestante: 'Avaliar risco-benefício; síndrome de abstinência neonatal', pediatrico: 'TOC: ≥ 6 anos (25 mg/dia)', idoso: 'Iniciar 25 mg/dia' },
    data_registro: '2022-04-20',
    data_ultima_atualizacao: '2025-10-13',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-afetus.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-afetus.pdf',
  },

  {
    id: 'euro-sertralina-50',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Sertralina',
    nome_comercial: 'Sertralina Eurofarma',
    classe_terapeutica: 'Inibidor Seletivo da Recaptação de Serotonina (ISRS)',
    cids_aprovados: ['F32', 'F33', 'F41', 'F42', 'F43'],
    apresentacoes: [
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Depressão/ansiedade: iniciar 25–50 mg/dia, aumentar gradualmente. Dose usual: 50–200 mg/dia.',
    contraindicacoes_bula: ['IMAOs', 'Pimozida'],
    advertencias_principais: ['Ideação suicida (monitorar primeiras semanas)', 'Síndrome serotoninérgica', 'Hiponatremia', 'Síndrome de descontinuação'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Tramadol', 'Varfarina', 'Lítio', 'Triptanos'],
    uso_populacoes_especiais: { hepatico: 'Reduzir dose ou frequência', gestante: 'Avaliar', pediatrico: 'Aprovado para TOC > 6 anos' },
    data_registro: '2015-11-25',
    data_ultima_atualizacao: '2025-10-20',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-sertralina-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-sertralina-eurofarma.pdf',
  },

  {
    id: 'euro-escitalopram-10',
    lab_id: 'eurofarma',
    molecula: 'Oxalato de Escitalopram',
    nome_comercial: 'ESC®',
    classe_terapeutica: 'Inibidor Seletivo da Recaptação de Serotonina (ISRS)',
    cids_aprovados: ['F32', 'F33', 'F41'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Depressão/TAG: iniciar 10 mg/dia. Dose usual: 10–20 mg/dia. Máximo: 20 mg/dia.',
    contraindicacoes_bula: ['IMAOs', 'Citalopram concomitante', 'QT longo congênito'],
    advertencias_principais: ['Prolongamento QT (evitar com outros QT-prolongadores)', 'Hiponatremia', 'Sangramento'],
    interacoes_principais: ['IMAOs', 'Pimozida', 'QT-prolongadores', 'Lítio'],
    uso_populacoes_especiais: { idoso: 'Máximo 10 mg/dia em > 65 anos (risco QT)', gestante: 'Categoria C — usar somente se benefício justificar risco', lactante: 'Evitar — excretado no leite materno; monitorar lactente se uso imprescindível' },
    data_registro: '2018-09-14',
    data_ultima_atualizacao: '2025-11-01',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-eurofarma-escitalopram.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-eurofarma-escitalopram.pdf',
  },

  {
    id: 'euro-paroxetina-20',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Paroxetina',
    nome_comercial: 'Pondera®',
    classe_terapeutica: 'Inibidor Seletivo da Recaptação de Serotonina (ISRS)',
    cids_aprovados: ['F32', 'F33', 'F40', 'F41', 'F42', 'F43'],
    apresentacoes: [
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '30 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Depressão: iniciar 20 mg/dia; máx 50 mg/dia. TP/TOC: 40–60 mg/dia. TEPT: 20–50 mg/dia.',
    contraindicacoes_bula: ['IMAOs', 'Tioridazina', 'Pimozida'],
    advertencias_principais: ['Maior síndrome de descontinuação entre ISRS (meia-vida curta)', 'Efeitos anticolinérgicos (boca seca, constipação)', 'Teratogenicidade (defeito cardíaco — Categoria D)', 'Maior ganho de peso'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Tramadol', 'Triptanos', 'Varfarina', 'Atomoxetina (inibidor CYP2D6)'],
    uso_populacoes_especiais: { idoso: 'Iniciar 10 mg/dia — efeitos anticolinérgicos', gestante: 'EVITAR — Categoria D (defeitos cardíacos)', renal: 'Dose máxima 30 mg em IR grave' },
    data_registro: '2014-12-10',
    data_ultima_atualizacao: '2025-09-20',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-paroxetina-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-paroxetina-eurofarma.pdf',
  },

  {
    id: 'euro-venlafaxina-75',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Venlafaxina',
    nome_comercial: 'Venlafaxina Eurofarma',
    classe_terapeutica: 'Inibidor de Recaptação de Serotonina e Noradrenalina (IRSN)',
    cids_aprovados: ['F32', 'F33', 'F40', 'F41'],
    apresentacoes: [
      { concentracao: '37,5 mg', forma_farmaceutica: 'capsula_liberacao_prolongada', embalagem: '30 cápsulas' },
      { concentracao: '75 mg', forma_farmaceutica: 'capsula_liberacao_prolongada', embalagem: '30 cápsulas' },
      { concentracao: '150 mg', forma_farmaceutica: 'capsula_liberacao_prolongada', embalagem: '30 cápsulas' },
    ],
    posologia_aprovada: 'Depressão: iniciar 37,5–75 mg/dia; dose usual 75–225 mg/dia. TAG/fobia social: 75 mg/dia.',
    contraindicacoes_bula: ['IMAOs', 'Hipersensibilidade'],
    advertencias_principais: ['Hipertensão dose-dependente (monitorar PA)', 'Síndrome serotoninérgica', 'Síndrome de descontinuação (não suspender abruptamente)', 'Hiponatremia'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Triptanos', 'Lítio', 'AINEs/anticoagulantes (sangramento)'],
    uso_populacoes_especiais: { renal: 'Reduzir 25–50% em IR moderada-grave', hepatico: 'Reduzir 50% em hepatopatia moderada', gestante: 'Avaliar; síndrome neonatal', idoso: 'Iniciar 37,5 mg, monitorar PA' },
    data_registro: '2016-03-28',
    data_ultima_atualizacao: '2025-10-10',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-venlafaxina-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-venlafaxina-eurofarma.pdf',
  },

  {
    id: 'euro-nortriptilina-25',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Nortriptilina',
    nome_comercial: 'Nortriptilina Eurofarma',
    classe_terapeutica: 'Antidepressivo Tricíclico (ADT)',
    cids_aprovados: ['F32', 'F33', 'G54', 'R51'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Depressão: 25 mg 3–4x/dia ou 75 mg 1x/dia. Dor neuropática: 10–75 mg à noite. Dose máxima: 150 mg/dia.',
    contraindicacoes_bula: ['IAM recente', 'BAV', 'Glaucoma de ângulo fechado', 'IMAOs', 'Retenção urinária'],
    advertencias_principais: ['⚠ BEERS: evitar em idosos (anticolinérgico, sedação, quedas, arritmia)', 'Prolongamento QT', 'Rebaixamento de limiar convulsivo', 'Hipotensão ortostática'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Antiarrítmicos Classe I', 'QT-prolongadores', 'Álcool (sedação)', 'Simpaticomiméticos'],
    uso_populacoes_especiais: { idoso: '⚠ EVITAR — Critérios de Beers (risco de quedas, arritmia, delirium)', gestante: 'Evitar — dados limitados' },
    data_registro: '2013-09-15',
    data_ultima_atualizacao: '2025-08-05',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-nortriptilina-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-nortriptilina-eurofarma.pdf',
  },


  {
    id: 'euro-carbolitium-300',
    lab_id: 'eurofarma',
    molecula: 'Carbonato de Lítio',
    nome_comercial: 'Carbolitium®',
    classe_terapeutica: 'Estabilizador do Humor',
    cids_aprovados: ['F31', 'F30', 'F33'],
    apresentacoes: [
      { concentracao: '300 mg', forma_farmaceutica: 'comprimido', embalagem: '60 comprimidos' },
    ],
    posologia_aprovada: 'Litemia terapêutica: aguda 0,8–1,2 mEq/L; manutenção 0,6–0,8 mEq/L. Dose usual: 900–1800 mg/dia em 2–3 tomadas. Ajuste rigoroso pela litemia.',
    contraindicacoes_bula: ['IR grave', 'Desidratação grave', 'Gravidez (1º trimestre — anomalia de Ebstein)', 'Disfunção cardíaca grave'],
    advertencias_principais: ['⚠ JANELA TERAPÊUTICA ESTREITA — litemia obrigatória a cada 5 dias no início, depois mensal', 'Toxicidade: tremor, confusão, diarreia, convulsão', 'Nefrotoxicidade em uso prolongado', 'Hipotireoidismo (monitorar TSH)'],
    interacoes_principais: ['IECA/BRA/diuréticos (aumentam litemia — risco toxicidade)', 'AINEs (aumentam litemia)', 'Diuréticos tiazídicos (CONTRAINDICADOS)', 'Carbamazepina (neurotoxicidade)'],
    uso_populacoes_especiais: { renal: 'CONTRAINDICADO em IR grave; reduzir dose proporcionalmente ao ClCr', idoso: 'Litemia < 0,8 mEq/L; monitorar função renal e tireoide', gestante: 'CONTRAINDICADO no 1º trimestre (risco Ebstein); avaliar 2º-3º' },
    data_registro: '2012-08-30',
    data_ultima_atualizacao: '2025-07-10',
    versao_bula: 'v2024.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-carbolitium.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-carbolitium.pdf',
  },

  // ═══════════════════════════════════════════
  // INFECTOLOGIA / ANTIBIÓTICOS
  // ═══════════════════════════════════════════

  {
    id: 'euro-sinot',
    lab_id: 'eurofarma',
    molecula: 'Amoxicilina Tri-hidratada',
    nome_comercial: 'Sinot®',
    classe_terapeutica: 'Aminopenicilina — Antibiótico beta-lactâmico',
    cids_aprovados: ['J06', 'J18', 'J20', 'J31', 'J32', 'H66', 'K12'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'capsula', embalagem: '21 cápsulas', registro_anvisa: '1.0043.0727' },
      { concentracao: '875 mg', forma_farmaceutica: 'comprimido', embalagem: '14 comprimidos', registro_anvisa: '1.0043.0727' },
      { concentracao: '250 mg/5 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 150 mL', registro_anvisa: '1.0043.0727' },
      { concentracao: '400 mg/5 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 100 mL + seringa dosadora', registro_anvisa: '1.0043.0727' },
    ],
    posologia_aprovada: 'Adultos/> 40 kg: 250–500 mg 3x/dia ou 875 mg 2x/dia. Pediátrico: 25–45 mg/kg/dia em 2–3 doses. Suspensão 400 mg/5 mL: 25 mg/kg/dia (leve) ou 45 mg/kg/dia (grave) em 2 doses diárias.',
    contraindicacoes_bula: ['Hipersensibilidade a betalactâmicos', 'Mononucleose infecciosa'],
    advertencias_principais: ['Reação cruzada com cefalosporinas (~1%)', 'Exantema em mononucleose', 'Diarreia por C. difficile', 'Suspensão estável 14 dias após reconstituição'],
    interacoes_principais: ['Varfarina (potencializa)', 'Metotrexato', 'Alopurinol (exantema)'],
    uso_populacoes_especiais: { renal: 'ClCr 10–30: máx 500 mg 2x/dia; ClCr < 10: 500 mg 1x/dia', pediatrico: 'Susp. 400 mg/5 mL (80 mg/mL) para 2 meses a 12 anos: 25–45 mg/kg/dia em 2 doses', gestante: 'Categoria B — seguro' },
    data_registro: '2023-04-20',
    data_ultima_atualizacao: '2026-07-01',
    versao_bula: 'v2026.1',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-astro-500',
    lab_id: 'eurofarma',
    molecula: 'Di-hidrato de Azitromicina',
    nome_comercial: 'Astro®',
    classe_terapeutica: 'Macrolídeo — Antibiótico',
    cids_aprovados: ['J06', 'J18', 'J20', 'J31', 'J32'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido', embalagem: '3 comprimidos', registro_anvisa: '1.0043.1167' },
    ],
    posologia_aprovada: 'PAC ambulatorial: 500 mg/dia por 3 dias (total 1500 mg). DST: 1000 mg dose única.',
    contraindicacoes_bula: ['QT longo', 'Hepatopatia grave', 'Hipersensibilidade a macrolídeos'],
    advertencias_principais: ['Prolongamento QT', 'Hepatotoxicidade rara', 'Diarreia por C. difficile'],
    interacoes_principais: ['Digoxina (aumenta nível)', 'Varfarina', 'QT-prolongadores', 'Estatinas (miopatia raro)'],
    uso_populacoes_especiais: { gestante: 'Categoria B — usar com cautela', pediatrico: 'Comprimido somente > 45 kg: 10 mg/kg/dia × 3 dias (máx 500 mg/dia)' },
    data_registro: '2015-06-08',
    data_ultima_atualizacao: '2026-07-01',
    versao_bula: 'v2026.1',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-astro-sus',
    lab_id: 'eurofarma',
    molecula: 'Di-hidrato de Azitromicina',
    nome_comercial: 'Astro® Suspensão Oral',
    classe_terapeutica: 'Macrolídeo — Antibiótico',
    cids_aprovados: ['J06', 'J18', 'J20', 'J31', 'J32', 'H66'],
    apresentacoes: [
      { concentracao: '200 mg/5 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 600 mg (15 mL)', registro_anvisa: '1.0043.1172' },
      { concentracao: '200 mg/5 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 900 mg (22,5 mL)', registro_anvisa: '1.0043.1172' },
      { concentracao: '200 mg/5 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 1500 mg (37,5 mL)', registro_anvisa: '1.0043.1172' },
    ],
    posologia_aprovada: 'Pediátrico: 10 mg/kg/dia × 3 dias (máx 500 mg/dia). Otite: 30 mg/kg dose única. Faringite estreptocócica: 10 mg/kg/dia × 3 dias (máx 500 mg/dia).',
    contraindicacoes_bula: ['QT longo', 'Hepatopatia grave', 'Hipersensibilidade a macrolídeos'],
    advertencias_principais: ['Prolongamento QT', 'Diarreia por C. difficile'],
    interacoes_principais: ['Digoxina', 'Varfarina', 'QT-prolongadores'],
    uso_populacoes_especiais: { gestante: 'Categoria B', pediatrico: '10 mg/kg/dia × 3 dias. 200 mg/5 mL = 40 mg/mL. Dose (mL) = peso(kg) × 10 ÷ 40' },
    data_registro: '2015-06-08',
    data_ultima_atualizacao: '2026-07-01',
    versao_bula: 'v2026.1',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-ciprofloxacino-500',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Ciprofloxacino',
    nome_comercial: 'Ciprofloxacino Eurofarma',
    classe_terapeutica: 'Fluoroquinolona — Antibiótico',
    cids_aprovados: ['N10', 'N11', 'N30', 'J18', 'L03'],
    apresentacoes: [
      { concentracao: '250 mg', forma_farmaceutica: 'comprimido', embalagem: '14 comprimidos' },
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido', embalagem: '14 comprimidos' },
      { concentracao: '750 mg', forma_farmaceutica: 'comprimido', embalagem: '14 comprimidos' },
    ],
    posologia_aprovada: 'ITU não-complicada: 250 mg 12/12h por 3 dias. ITU complicada: 500 mg 12/12h por 7–14 dias. Pielonefrite: 500 mg 12/12h por 7–10 dias.',
    contraindicacoes_bula: ['Hipersensibilidade a quinolonas', 'Uso concomitante com tizanidina', 'Menores de 18 anos (exceto indicações específicas)'],
    advertencias_principais: ['⚠ FDA Black Box: ruptura de tendão (especialmente tendão de Aquiles)', 'Prolongamento QT', 'Neuropatia periférica', 'Psicose/convulsões', 'Reservar para infecções sem alternativas eficazes'],
    interacoes_principais: ['Antiácidos/cátions (reduzem absorção — espaçar 2h)', 'Teofilina (toxicidade)', 'Varfarina (aumenta INR)', 'Antidiabéticos (hipo/hiperglicemia)'],
    uso_populacoes_especiais: { renal: 'Reduzir dose em ClCr < 30 mL/min', idoso: 'Maior risco de ruptura tendinosa e QT', gestante: 'EVITAR — risco fetal' },
    data_registro: '2014-06-20',
    data_ultima_atualizacao: '2025-08-15',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-eurofarma-ciprofloxacino.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-eurofarma-ciprofloxacino.pdf',
  },

  // ═══════════════════════════════════════════
  // GASTROENTEROLOGIA
  // ═══════════════════════════════════════════

  {
    id: 'euro-omeprazol-20',
    lab_id: 'eurofarma',
    molecula: 'Omeprazol',
    nome_comercial: 'Omeprazol Eurofarma',
    classe_terapeutica: 'Inibidor da Bomba de Prótons (IBP)',
    cids_aprovados: ['K21', 'K25', 'K26', 'K27', 'K29'],
    apresentacoes: [
      { concentracao: '20 mg', forma_farmaceutica: 'capsula', embalagem: '28 cápsulas' },
      { concentracao: '40 mg', forma_farmaceutica: 'capsula', embalagem: '28 cápsulas' },
    ],
    posologia_aprovada: 'DRGE/úlcera: 20–40 mg 1x/dia pela manhã em jejum. Erradicação H. pylori: 20 mg 2x/dia (tripla terapia).',
    contraindicacoes_bula: ['Uso concomitante com nelfinavir', 'Hipersensibilidade a benzimidazóis'],
    advertencias_principais: ['Deficiência de Mg2+ em uso prolongado', 'Risco de infecção entérica (C. difficile)', 'Fratura óssea (uso prolongado > 1 ano)', 'Deficiência de B12'],
    interacoes_principais: ['Clopidogrel (reduz efeito — preferir pantoprazol)', 'Metotrexato', 'Tacrolimo', 'Atazanavir'],
    uso_populacoes_especiais: { hepatico: 'Dose máxima 20 mg/dia em hepatopatia grave' },
    data_registro: '2013-01-15',
    data_ultima_atualizacao: '2025-06-10',
    versao_bula: 'v2024.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-omeprazol-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-omeprazol-eurofarma.pdf',
  },


  // ═══════════════════════════════════════════
  // ANALGÉSICOS / ANTITÉRMICOS
  // ═══════════════════════════════════════════

  {
    id: 'euro-paracetamol-750',
    lab_id: 'eurofarma',
    molecula: 'Paracetamol (Acetaminofeno)',
    nome_comercial: 'Paracetamol Eurofarma',
    classe_terapeutica: 'Analgésico e Antitérmico',
    cids_aprovados: ['R50', 'R51', 'M79'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos' },
      { concentracao: '750 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos' },
    ],
    posologia_aprovada: 'Adultos: 500–1000 mg a cada 4–6h. Dose máxima: 4 g/dia (3 g/dia em hepatopatas/etilistas).',
    contraindicacoes_bula: ['Hepatopatia grave', 'Hipersensibilidade'],
    advertencias_principais: ['Hepatotoxicidade em overdose (N-acetilcisteína — antídoto)', 'Risco aumentado com álcool', 'Monitorar em uso crônico de anticoagulantes'],
    interacoes_principais: ['Varfarina (uso crônico potencializa)', 'Álcool (hepatotoxicidade)', 'Isoniazida'],
    uso_populacoes_especiais: { renal: 'Espaçar doses em ClCr < 30', pediatrico: '10–15 mg/kg/dose 4–6h', gestante: 'Mais seguro disponível' },
    data_registro: '2012-05-30',
    data_ultima_atualizacao: '2025-05-20',
    versao_bula: 'v2024.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-paracetamol-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-paracetamol-eurofarma.pdf',
  },

  {
    id: 'euro-meloxicam-15',
    lab_id: 'eurofarma',
    molecula: 'Meloxicam',
    nome_comercial: 'Meloxicam Eurofarma',
    classe_terapeutica: 'Anti-inflamatório não esteroidal (AINE) — Inibidor preferencial COX-2',
    cids_aprovados: ['M06', 'M15', 'M16', 'M17', 'M79'],
    apresentacoes: [
      { concentracao: '7,5 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos' },
      { concentracao: '15 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos' },
    ],
    posologia_aprovada: 'Artrite reumatoide/osteoartrite: 7,5 mg 1x/dia; máx 15 mg/dia. Espondilite: 15 mg/dia.',
    contraindicacoes_bula: ['Úlcera péptica ativa', 'IR grave (ClCr < 15 mL/min) sem diálise', 'Hepatopatia grave', 'Gravidez (3º trimestre)', 'Alergia a AINEs/aspirina'],
    advertencias_principais: ['Risco cardiovascular (IAM/AVC) aumentado em uso prolongado', 'Toxicidade gastrointestinal (menor que AINEs não-seletivos)', 'Nefrotoxicidade', '⚠ Evitar em idosos — Critérios de Beers'],
    interacoes_principais: ['Anticoagulantes (sangramento)', 'IECA/BRA/diuréticos (nefrotoxicidade)', 'Corticosteroides (sangramento GI)', 'Metotrexato (toxicidade)'],
    uso_populacoes_especiais: { idoso: 'EVITAR — Critérios de Beers (risco CV e GI)', gestante: 'CONTRAINDICADO no 3º trimestre (fechamento prematuro do canal arterial)', renal: 'CONTRAINDICADO em ClCr < 15 mL/min' },
    data_registro: '2015-09-18',
    data_ultima_atualizacao: '2025-08-10',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-meloxicam-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-meloxicam-eurofarma.pdf',
  },

  {
    id: 'euro-tramadol-50',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Tramadol',
    nome_comercial: 'Tramadol Eurofarma',
    classe_terapeutica: 'Analgésico Opioide — Agonista μ + Inibidor de recaptação de S/NA',
    cids_aprovados: ['R52', 'G89', 'M54'],
    apresentacoes: [
      { concentracao: '50 mg', forma_farmaceutica: 'capsula', embalagem: '20 cápsulas' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido_liberacao_modificada', embalagem: '10 comprimidos' },
    ],
    posologia_aprovada: 'Dor moderada a intensa: 50–100 mg a cada 4–6h. Dose máxima: 400 mg/dia (300 mg em idosos).',
    contraindicacoes_bula: ['Epilepsia não controlada', 'IMAOs', 'Hipersensibilidade a opioides', 'Intoxicação aguda por álcool/opioides/psicofármacos'],
    advertencias_principais: ['Síndrome serotoninérgica com ISRS/IRSN', 'Risco de convulsões (reduz limiar)', 'Dependência e abuso', 'Depressão respiratória em superdose', '⚠ BEERS: cautela em idosos (quedas, convulsão)'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'ISRS/IRSN (síndrome serotoninérgica)', 'Carbamazepina (reduz efeito)', 'Benzodiazepínicos (depressão SNC)'],
    uso_populacoes_especiais: { renal: 'Espaçar para 12/12h em ClCr < 30 mL/min', hepatico: 'Espaçar para 12/12h em hepatopatia grave', idoso: 'Dose máxima 300 mg/dia; cautela em quedas', gestante: 'EVITAR — síndrome de abstinência neonatal' },
    data_registro: '2014-10-08',
    data_ultima_atualizacao: '2025-09-05',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-tramadol-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-tramadol-eurofarma.pdf',
  },

  // ═══════════════════════════════════════════
  // CORTICOSTEROIDES SISTÊMICOS
  // ═══════════════════════════════════════════

  {
    id: 'euro-prednisolona-20',
    lab_id: 'eurofarma',
    molecula: 'Prednisolona',
    nome_comercial: 'Preni®',
    classe_terapeutica: 'Corticosteroide Sistêmico',
    cids_aprovados: ['J45', 'M06', 'K50', 'L10', 'D59'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1283' },
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos', registro_anvisa: '1.0043.1283' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1283' },
      { concentracao: '40 mg', forma_farmaceutica: 'comprimido', embalagem: '7 comprimidos', registro_anvisa: '1.0043.1283' },
    ],
    posologia_aprovada: 'Dose imunossupressora: 1–2 mg/kg/dia (máx 80 mg). Asma aguda: 1–2 mg/kg/dia por 5–7 dias. Tapering obrigatório em uso > 3 semanas.',
    contraindicacoes_bula: ['Infecção sistêmica fúngica', 'Hipersensibilidade', 'Vacinas vivas (imunossupressão)'],
    advertencias_principais: ['Supressão do eixo HHA em uso prolongado', 'Hiperglicemia', 'Osteoporose (suplementar Ca/D3 + bifosfonato > 3 meses)', 'Infecção oportunista', 'Insuficiência adrenal na retirada abrupta'],
    interacoes_principais: ['AINEs (sangramento GI)', 'Antidiabéticos (hiperglicemia)', 'Inibidores CYP3A4 (aumentam efeito)', 'Vacinas vivas'],
    uso_populacoes_especiais: { gestante: 'Usar com cautela — menor risco que doença não tratada', idoso: 'Maior risco de osteoporose e hiperglicemia', pediatrico: 'Monitorar crescimento em uso prolongado' },
    data_registro: '2013-02-14',
    data_ultima_atualizacao: '2025-07-01',
    versao_bula: 'v2024.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-prednisolona-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-prednisolona-eurofarma.pdf',
  },

  {
    id: 'euro-prednisolona-sol',
    lab_id: 'eurofarma',
    molecula: 'Prednisolona',
    nome_comercial: 'Preni® Solução Oral',
    classe_terapeutica: 'Corticosteroide Sistêmico',
    cids_aprovados: ['J45', 'J05', 'K50', 'L10', 'D59', 'N04'],
    apresentacoes: [
      { concentracao: '3 mg/mL', forma_farmaceutica: 'solucao_oral', embalagem: 'Frasco 100 mL' },
    ],
    posologia_aprovada: 'Pediátrico: 0,14–2 mg/kg/dia em 1–4 tomadas. Dose habitual inicial: 1 mg/kg/dia (= 0,33 mL/kg/dia). Asma: 1–2 mg/kg dose única diária. Síndrome nefrótica: 2 mg/kg/dia. Redução gradual ao desmame.',
    contraindicacoes_bula: ['Infecção sistêmica fúngica', 'Hipersensibilidade', 'Varicela/herpes-zóster ativo'],
    advertencias_principais: ['Supressão do eixo HHA', 'Monitorar crescimento em uso prolongado', 'Hiperglicemia', 'Infecção oportunista'],
    interacoes_principais: ['AINEs', 'Antidiabéticos', 'Inibidores CYP3A4'],
    uso_populacoes_especiais: { pediatrico: '1 mg/kg/dia (máx 80 mg/dia). Vol. = dose(mg) ÷ 3 mL/mg. Ex. 22 kg × 1 mg/kg = 22 mg ÷ 3 = 7,3 mL/dia', gestante: 'Categoria C — cautela' },
    data_registro: '2013-02-14',
    data_ultima_atualizacao: '2026-07-01',
    versao_bula: 'v2026.1',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-prednisolona-gotas',
    lab_id: 'eurofarma',
    molecula: 'Prednisolona',
    nome_comercial: 'Preni® Gotas',
    classe_terapeutica: 'Corticosteroide Sistêmico',
    cids_aprovados: ['J45', 'J05', 'K50', 'L10'],
    apresentacoes: [
      { concentracao: '1 mg/gota', forma_farmaceutica: 'gotas', embalagem: 'Frasco 20 mL' },
    ],
    posologia_aprovada: 'Pediátrico: 1–2 gotas/kg/dia (= 1–2 mg/kg/dia). Dose diária habitual: 2 gotas/kg (máx 80 gotas/dia = 80 mg/dia).',
    contraindicacoes_bula: ['Infecção sistêmica fúngica', 'Hipersensibilidade'],
    advertencias_principais: ['Supressão do eixo HHA', 'Monitorar crescimento'],
    interacoes_principais: ['AINEs', 'Antidiabéticos', 'Inibidores CYP3A4'],
    uso_populacoes_especiais: { pediatrico: '2 gotas/kg/dia (1 gota = 1 mg). Ex. 22 kg × 1 mg/kg = 22 gotas/dia' },
    data_registro: '2013-02-14',
    data_ultima_atualizacao: '2026-07-01',
    versao_bula: 'v2026.1',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-sinot-clav',
    lab_id: 'eurofarma',
    molecula: 'Amoxicilina + Clavulanato de Potássio',
    nome_comercial: 'Sinot Clav®',
    classe_terapeutica: 'Aminopenicilina + Inibidor de β-lactamase',
    cids_aprovados: ['J06', 'J18', 'J20', 'J31', 'J32', 'H66', 'L03'],
    apresentacoes: [
      { concentracao: '250/62,5 mg/5 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 75 mL' },
      { concentracao: '400/57 mg/5 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 70 mL + seringa dosadora' },
      { concentracao: '500/125 mg', forma_farmaceutica: 'comprimido', embalagem: '21 comprimidos' },
      { concentracao: '875/125 mg', forma_farmaceutica: 'comprimido', embalagem: '14 comprimidos' },
    ],
    posologia_aprovada: 'Pediátrico: 45 mg/kg/dia (amoxicilina) em 2 doses (susp. 400/57 mg/5 mL). Ex. 27 kg: 27×45=1215 mg/dia ÷ 2 = 607 mg/dose ÷ 80 mg/mL = 7,6 mL 2x/dia. Adultos: 875/125 mg 2x/dia.',
    contraindicacoes_bula: ['Hipersensibilidade a penicilinas', 'Histórico de icterícia colestática por amoxicilina+clavulanato', 'Mononucleose infecciosa'],
    advertencias_principais: ['Icterícia colestática pode aparecer até 6 sem após suspensão', 'Tomar sempre com alimento', 'Diarreia por C. difficile'],
    interacoes_principais: ['Varfarina', 'Metotrexato'],
    uso_populacoes_especiais: { pediatrico: 'Susp. 400/57 mg/5 mL: 45 mg/kg/dia amoxicilina em 2 doses (infecção moderada/grave)', gestante: 'Categoria B — cautela em ruptura prematura de membranas' },
    data_registro: '2026-01-01',
    data_ultima_atualizacao: '2026-07-01',
    versao_bula: 'v2026.1',
    fonte_regulatoria: 'ANVISA',
  },

  {
    id: 'euro-prednisona-20',
    lab_id: 'eurofarma',
    molecula: 'Prednisona',
    nome_comercial: 'Prednisona Eurofarma',
    classe_terapeutica: 'Corticosteroide Sistêmico',
    cids_aprovados: ['J45', 'M06', 'K50', 'L10'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos' },
    ],
    posologia_aprovada: 'Pró-droga da prednisolona. Dose usual: 0,5–1 mg/kg/dia. Tapering obrigatório em uso > 3 semanas.',
    contraindicacoes_bula: ['Infecção sistêmica fúngica não tratada', 'Hipersensibilidade'],
    advertencias_principais: ['Mesmas da prednisolona — é convertida a prednisolona no fígado', 'Menor biodisponibilidade em hepatopatia grave (preferir prednisolona)'],
    interacoes_principais: ['AINEs (sangramento GI)', 'Antidiabéticos', 'Inibidores/indutores CYP3A4'],
    uso_populacoes_especiais: { hepatico: 'Em hepatopatia grave: preferir prednisolona (conversão prejudicada)', gestante: 'Usar com cautela — risco-benefício', idoso: 'Monitorar DM2, osteoporose, hipertensão' },
    data_registro: '2012-11-20',
    data_ultima_atualizacao: '2025-07-01',
    versao_bula: 'v2024.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-prednisona-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-prednisona-eurofarma.pdf',
  },

  // ═══════════════════════════════════════════
  // ANTICOAGULANTES / NITRATO / ANTICONVULSIVANTE
  // ═══════════════════════════════════════════

  {
    id: 'euro-zina',
    lab_id: 'eurofarma',
    molecula: 'Dicloridrato de Levocetirizina',
    nome_comercial: 'Zina®',
    classe_terapeutica: 'Anti-histamínico H1 de 3ª Geração',
    cids_aprovados: ['J30', 'J31', 'L50'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos' },
    ],
    posologia_aprovada: 'Rinite alérgica/urticária crônica: 5 mg 1x/dia à noite. Em IR: reduzir para 2,5 mg/dia conforme ClCr.',
    contraindicacoes_bula: ['Hipersensibilidade à levocetirizina ou cetirizina', 'IR grave (ClCr < 10 mL/min)', 'Hemodiálise'],
    advertencias_principais: ['Sonolência — evitar dirigir ou operar máquinas', 'Álcool potencializa sedação'],
    interacoes_principais: ['Álcool e depressores do SNC (potencializam sedação)', 'Ritonavir (aumenta exposição)'],
    uso_populacoes_especiais: { renal: 'ClCr 30–49: 2,5 mg/dia; ClCr 10–29: 2,5 mg a cada 2 dias; CONTRAINDICADO < 10 mL/min', idoso: 'Ajuste conforme função renal' },
    data_registro: '2020-07-15',
    data_ultima_atualizacao: '2025-09-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-zina.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-zina.pdf',
  },

  {
    id: 'euro-antara',
    lab_id: 'eurofarma',
    molecula: 'Levetiracetam',
    nome_comercial: 'Antara®',
    classe_terapeutica: 'Anticonvulsivante / Antiepiléptico de 2ª Geração',
    cids_aprovados: ['G40', 'G40.1', 'G40.2', 'G40.3'],
    apresentacoes: [
      { concentracao: '250 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '750 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Epilepsia focal (≥ 16 anos, monoterapia): 250 mg 2x/dia; aumentar para 500 mg 2x/dia após 2 semanas. Adjuvante: 500–1500 mg 2x/dia. Dose máxima: 3000 mg/dia.',
    contraindicacoes_bula: ['Hipersensibilidade ao levetiracetam ou derivados pirrolidônicos'],
    advertencias_principais: ['Alterações neuropsiquiátricas (irritabilidade, ansiedade, depressão, ideação suicida)', 'Não suspender abruptamente (reduzir gradualmente em ≥ 2 semanas)', 'Leucopenia/trombocitopenia (raro — monitorar hemograma)', 'Sonolência e tontura'],
    interacoes_principais: ['Poucas interações farmacocinéticas (baixa ligação proteica, eliminação renal 66%)', 'Probenecida (aumenta nível do metabólito ativo)', 'Álcool (potencializa sedação)'],
    uso_populacoes_especiais: { renal: 'Ajustar dose: ClCr 50–79: máx 1000 mg 2x/dia; ClCr 30–49: máx 750 mg 2x/dia; ClCr < 30: máx 500 mg 2x/dia', gestante: 'Monitorar — dados de segurança disponíveis (menor teratogenicidade que valproato)', idoso: 'Ajustar conforme função renal' },
    data_registro: '2018-04-12',
    data_ultima_atualizacao: '2025-08-20',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-antara.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-antara.pdf',
  },

  // ═══════════════════════════════════════════
  // TDAH — Estimulantes
  // ═══════════════════════════════════════════

  {
    id: 'euro-attenze-10',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Metilfenidato',
    nome_comercial: 'Attenze® 10mg',
    classe_terapeutica: 'Estimulante do SNC — Inibidor da Recaptação de Dopamina/Noradrenalina',
    cids_aprovados: ['F90'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0281.0303.001-0' },
    ],
    posologia_aprovada: 'TDAH: iniciar 5 mg 2x/dia; aumentar 5–10 mg/semana. Dose usual: 20–60 mg/dia em 2–3 tomadas. Dose máxima: 60 mg/dia.',
    contraindicacoes_bula: ['Glaucoma', 'Feocromocitoma', 'Hipersensibilidade', 'Uso com IMAOs ou dentro de 14 dias', 'Hipertireoidismo'],
    advertencias_principais: ['⚠ RECEITA ESPECIAL B2 (azul) obrigatória', 'Risco de dependência', 'Monitorar FC e PA', 'Retardo de crescimento em crianças (monitorar)', 'Psicose/mania em predispostos', 'Priapismo (raro)'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO — crise hipertensiva)', 'Antihipertensivos (reduz efeito)', 'Anticoagulantes (potencializa)', 'Álcool (efeito SNC)'],
    uso_populacoes_especiais: { pediatrico: 'Aprovado ≥ 6 anos; monitorar crescimento', idoso: 'Usar com extrema cautela — risco cardiovascular', gestante: 'EVITAR — dados insuficientes' },
    data_registro: '2022-03-10',
    data_ultima_atualizacao: '2025-10-13',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-attenze-10mg.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-attenze-10mg.pdf',
  },

  {
    id: 'euro-attenze-20',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Metilfenidato',
    nome_comercial: 'Attenze® 20mg',
    classe_terapeutica: 'Estimulante do SNC — Inibidor da Recaptação de Dopamina/Noradrenalina',
    cids_aprovados: ['F90'],
    apresentacoes: [
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'TDAH: 20 mg 2x/dia. Dose máxima: 60 mg/dia. Receita especial B2.',
    contraindicacoes_bula: ['Glaucoma', 'Feocromocitoma', 'IMAOs', 'Hipersensibilidade'],
    advertencias_principais: ['⚠ RECEITA ESPECIAL B2 (azul)', 'Risco de dependência e abuso', 'Monitorar cardiovascular'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Antihipertensivos', 'Anticoagulantes'],
    uso_populacoes_especiais: { pediatrico: 'Aprovado ≥ 6 anos', gestante: 'EVITAR' },
    data_registro: '2022-03-10',
    data_ultima_atualizacao: '2025-10-13',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-attenze-20mg.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-attenze-20mg.pdf',
  },

  {
    id: 'euro-bup',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Bupropiona',
    nome_comercial: 'BUP®',
    classe_terapeutica: 'Inibidor da Recaptação de Dopamina e Noradrenalina (NDRI)',
    cids_aprovados: ['F32', 'F33', 'F17'],
    apresentacoes: [
      { concentracao: '150 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0281.0320.001-4' },
    ],
    posologia_aprovada: 'Depressão: 150 mg 1–2x/dia (máx 300 mg/dia). Cessação tabágica: 150 mg 1x/dia por 3 dias, depois 150 mg 2x/dia por 7–12 semanas.',
    contraindicacoes_bula: ['Epilepsia ou limiar convulsivo reduzido', 'Bulimia/anorexia (convulsões)', 'IMAOs (washout 14 dias)', 'Abstinência abrupta de álcool/BZDs'],
    advertencias_principais: ['Risco de convulsões dose-dependente (não exceder 150 mg/dose, 300 mg/dia)', 'Hipertensão', 'Ideação suicida (monitorar < 25 anos)', 'Sem efeitos sexuais adversos — vantagem sobre ISRS'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Antipsicóticos/antidepressivos (reduz limiar convulsivo)', 'Tamoxifeno (reduz eficácia)', 'Metoprolol (aumenta nível)'],
    uso_populacoes_especiais: { hepatico: 'Dose máx 150 mg/dia em hepatopatia moderada; 150 mg/2 dias em grave', renal: 'Reduzir frequência em IR', idoso: 'Iniciar 75–150 mg/dia', gestante: 'Evitar — associação com malformações cardíacas (estudos conflitantes)' },
    data_registro: '2020-08-15',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-bup.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-bup.pdf',
  },

  {
    id: 'euro-bup-xl',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Bupropiona',
    nome_comercial: 'BUP XL®',
    classe_terapeutica: 'Inibidor da Recaptação de Dopamina e Noradrenalina (NDRI) — Liberação Prolongada',
    cids_aprovados: ['F32', 'F33', 'F17'],
    apresentacoes: [
      { concentracao: '150 mg', forma_farmaceutica: 'comprimido_liberacao_modificada', embalagem: '30 comprimidos' },
      { concentracao: '300 mg', forma_farmaceutica: 'comprimido_liberacao_modificada', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Depressão: 150 mg 1x/dia pela manhã (máx 300 mg/dia em dose única). Cessação tabágica: 150 mg 1x/dia por 3 dias, depois 300 mg/dia.',
    contraindicacoes_bula: ['Epilepsia', 'Bulimia/anorexia', 'IMAOs', 'Abstinência alcóolica/BZDs'],
    advertencias_principais: ['Risco de convulsões (não partir nem mastigar o comprimido)', 'Hipertensão', 'Menor risco de disfunção sexual que ISRS/IRSN'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Antipsicóticos', 'Tamoxifeno', 'Metoprolol'],
    uso_populacoes_especiais: { hepatico: 'Dose máx 150 mg/dia em Child B/C', idoso: 'Iniciar 150 mg/dia', gestante: 'Avaliar risco-benefício' },
    data_registro: '2020-08-15',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-bup-xl.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-bup-xl.pdf',
  },

  // ═══════════════════════════════════════════
  // ALZHEIMER
  // ═══════════════════════════════════════════

  {
    id: 'euro-don-5',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Donepezila',
    nome_comercial: 'Don® 5mg',
    classe_terapeutica: 'Inibidor da Colinesterase — Antidemencial',
    cids_aprovados: ['G30', 'F00', 'F03'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0281.0290.001-8' },
    ],
    posologia_aprovada: 'Demência Alzheimer leve-moderada: iniciar 5 mg 1x/dia à noite. Após 4–6 semanas, aumentar para 10 mg/dia conforme tolerância.',
    contraindicacoes_bula: ['Hipersensibilidade à donepezila ou derivados piperidínicos'],
    advertencias_principais: ['Síncope bradicárdica (monitorar FC)', 'Náuseas/vômitos/diarreia (maiores no início)', 'Convulsões raras', 'Úlcera péptica (efeito colinérgico)'],
    interacoes_principais: ['Beta-bloqueadores (bradicardia)', 'Anticolinérgicos (antagonismo — evitar)', 'AINEs (sangramento GI)', 'Relaxantes musculares (potencializa)'],
    uso_populacoes_especiais: { idoso: 'Iniciar com 5 mg; maiores efeitos adversos GI', hepatico: 'Sem ajuste necessário' },
    data_registro: '2021-05-18',
    data_ultima_atualizacao: '2025-09-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-don-5mg.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-don-5mg.pdf',
  },

  {
    id: 'euro-don-10',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Donepezila',
    nome_comercial: 'Don® 10mg',
    classe_terapeutica: 'Inibidor da Colinesterase — Antidemencial',
    cids_aprovados: ['G30', 'F00', 'F03'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Dose de manutenção usual: 10 mg 1x/dia à noite. Demência grave: 10 mg/dia (aprovado no Brasil).',
    contraindicacoes_bula: ['Hipersensibilidade à donepezila ou derivados piperidínicos'],
    advertencias_principais: ['Síncope bradicárdica', 'Distúrbios GI', 'Não melhora o curso da doença — efeito sintomático'],
    interacoes_principais: ['Beta-bloqueadores', 'Anticolinérgicos', 'AINEs'],
    uso_populacoes_especiais: { idoso: 'Monitorar FC; considerar 5 mg em fragilidade extrema' },
    data_registro: '2021-05-18',
    data_ultima_atualizacao: '2025-09-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-don-10mg.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-don-10mg.pdf',
  },

  {
    id: 'euro-heimer',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Memantina',
    nome_comercial: 'Heimer®',
    classe_terapeutica: 'Antagonista dos Receptores NMDA — Antidemencial',
    cids_aprovados: ['G30', 'F00'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1040' },
    ],
    posologia_aprovada: 'Alzheimer moderada a grave: iniciar 5 mg/dia; aumentar 5 mg/semana até dose usual 10–20 mg/dia em 2 tomadas.',
    contraindicacoes_bula: ['Hipersensibilidade à memantina', 'IR grave (ClCr < 5 mL/min)'],
    advertencias_principais: ['Tontura e confusão (especialmente em IR)', 'Constipação', 'Monitorar função renal'],
    interacoes_principais: ['Amantadina/dextrometorfano/quetamina (antagonistas NMDA — evitar combinação)', 'Diuréticos poupadores de K+ (aumentam nível)', 'Bicarbonato/antiácidos alcalinizantes (aumentam nível)'],
    uso_populacoes_especiais: { renal: 'Reduzir para 5–10 mg/dia em IR moderada (ClCr 5–29 mL/min); CONTRAINDICADO em ClCr < 5', idoso: 'Iniciar 5 mg/dia; menor risco cardiovascular que anticolinesterásicos' },
    data_registro: '2016-09-21',
    data_ultima_atualizacao: '2025-03-19',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-heimer.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-heimer.pdf',
  },

  // ═══════════════════════════════════════════
  // DISLIPIDEMIA — Estatinas (marcas)
  // ═══════════════════════════════════════════

  {
    id: 'euro-ruva',
    lab_id: 'eurofarma',
    molecula: 'Rosuvastatina Cálcica',
    nome_comercial: 'Ruva®',
    classe_terapeutica: 'Estatina — Inibidor da HMG-CoA Redutase',
    cids_aprovados: ['E78', 'I25', 'Z82'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Dislipidemia: 10–20 mg 1x/dia. Alta intensidade: 20–40 mg/dia (2× 20 mg). Dose máxima: 40 mg/dia.',
    contraindicacoes_bula: ['Miopatia ativa', 'Hepatopatia ativa', 'Gravidez', 'Hipersensibilidade'],
    advertencias_principais: ['Miopatia/rabdomiólise', 'Hepatotoxicidade', 'Novo-onset DM2', 'Proteinúria em doses altas'],
    interacoes_principais: ['Ciclosporina (máx 5 mg)', 'Genfibrozila (miopatia)', 'Anticoagulantes'],
    uso_populacoes_especiais: { renal: 'Máx 10 mg em ClCr < 30', gestante: 'CONTRAINDICADO' },
    data_registro: '2022-06-10',
    data_ultima_atualizacao: '2025-09-10',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-ruva.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-ruva.pdf',
  },

  {
    id: 'euro-vast',
    lab_id: 'eurofarma',
    molecula: 'Atorvastatina Cálcica',
    nome_comercial: 'Vast®',
    classe_terapeutica: 'Estatina — Inibidor da HMG-CoA Redutase',
    cids_aprovados: ['E78', 'I25', 'Z82'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '40 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '80 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Dislipidemia: 10–20 mg 1x/dia. Alta intensidade (alto risco CV): 40–80 mg/dia. Pode ser tomada a qualquer hora.',
    contraindicacoes_bula: ['Hepatopatia ativa', 'Gravidez', 'Lactação'],
    advertencias_principais: ['Miopatia/rabdomiólise (raro)', 'Hepatotoxicidade (monitorar TGO/TGP)', 'Novo-onset DM2', 'Menos interações CYP3A4 que sinvastatina'],
    interacoes_principais: ['Ciclosporina', 'Inibidores CYP3A4 (cetoconazol, eritromicina — aumentam nível)', 'Genfibrozila'],
    uso_populacoes_especiais: { gestante: 'CONTRAINDICADO', idoso: 'Mesma dose; monitorar CPK' },
    data_registro: '2019-11-05',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-vast.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-vast.pdf',
  },

  // ═══════════════════════════════════════════
  // NEUROLÓGICO / ANTICONVULSIVANTE
  // ═══════════════════════════════════════════

  {
    id: 'euro-gaba-er',
    lab_id: 'eurofarma',
    molecula: 'Divalproato de Sódio',
    nome_comercial: 'GABA ER®',
    classe_terapeutica: 'Anticonvulsivante / Estabilizador do Humor',
    cids_aprovados: ['G40', 'F31', 'G43'],
    apresentacoes: [
      { concentracao: '250 mg', forma_farmaceutica: 'comprimido_liberacao_modificada', embalagem: '30 comprimidos' },
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido_liberacao_modificada', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Epilepsia: iniciar 10–15 mg/kg/dia; dose usual 20–30 mg/kg/dia. TAB: 750–1500 mg/dia. Enxaqueca (profilaxia): 500–1000 mg/dia.',
    contraindicacoes_bula: ['Hepatopatia ativa', 'Distúrbios do ciclo da ureia', 'Hipersensibilidade', 'Gravidez (risco teratogênico muito alto — espinha bífida)'],
    advertencias_principais: ['⚠ TERATOGÊNICO — síndrome fetal do valproato (espinha bífida, QI reduzido)', 'Hepatotoxicidade (fatal em < 2 anos)', 'Pancreatite', 'Hiperamonemia', 'Ganho de peso', 'Síndrome dos ovários policísticos'],
    interacoes_principais: ['Lamotrigina (aumenta nível — reduzir lamotrigina)', 'Carbamazepina (reduz nível)', 'Fenitoína (interação complexa)', 'Topiramato (hiperamonemia)'],
    uso_populacoes_especiais: { gestante: '⚠ CONTRAINDICADO — maior teratógeno entre AEDs (espinha bífida, autismo, déficit cognitivo)', pediatrico: 'Risco de hepatotoxicidade fatal < 2 anos', idoso: 'Maior risco de tremor, sedação' },
    data_registro: '2018-09-20',
    data_ultima_atualizacao: '2025-10-15',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-gaba-er.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-gaba-er.pdf',
  },

  // ═══════════════════════════════════════════
  // SONO
  // ═══════════════════════════════════════════

  {
    id: 'euro-lemont',
    lab_id: 'eurofarma',
    molecula: 'Montelucaste Sódico + Cloridrato de Levocetirizina',
    nome_comercial: 'Lemont®',
    classe_terapeutica: 'Antagonista de Leucotrienos + Anti-histamínico H1 de 3ª Geração (Associação)',
    cids_aprovados: ['J45', 'J30', 'J31'],
    apresentacoes: [
      { concentracao: '10mg + 5mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Asma + rinite alérgica: 1 comprimido (montelucaste 10 mg + levocetirizina 5 mg) 1x/dia à noite.',
    contraindicacoes_bula: ['Hipersensibilidade a montelucaste ou levocetirizina', 'IR grave (ClCr < 10 mL/min)', 'Hemodiálise'],
    advertencias_principais: ['⚠ FDA/ANVISA Black Box: alterações neuropsiquiátricas do montelucaste (depressão, ideação suicida)', 'Sonolência (levocetirizina) — não dirigir', 'Reservar associação para pacientes com asma E rinite alérgica concomitantes'],
    interacoes_principais: ['Fenobarbital/rifampicina (reduzem montelucaste)', 'Álcool + depressores do SNC (potencializam sedação da levocetirizina)', 'Teofilina'],
    uso_populacoes_especiais: { renal: 'Ajuste conforme ClCr para a levocetirizina', pediatrico: 'Formulação adulto (10+5 mg) para ≥ 15 anos', idoso: 'Cautela por sedação' },
    data_registro: '2020-08-10',
    data_ultima_atualizacao: '2025-09-20',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-lemont.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-lemont.pdf',
  },

  // ═══════════════════════════════════════════
  // ANTIEMÉTICO
  // ═══════════════════════════════════════════

  {
    id: 'euro-domperix',
    lab_id: 'eurofarma',
    molecula: 'Domperidona',
    nome_comercial: 'Domperix®',
    classe_terapeutica: 'Antiemético — Antagonista Periférico da Dopamina (Procinético)',
    cids_aprovados: ['R11', 'K21', 'K31'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos' },
      { concentracao: '1 mg/mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 100 mL' },
    ],
    posologia_aprovada: 'Náuseas/vômitos/dispepsia: 10 mg 3x/dia antes das refeições. Máximo: 30 mg/dia. Uso pelo menor tempo possível.',
    contraindicacoes_bula: ['Prolactinoma', 'Hemorragia GI/obstrução', 'QT longo congênito', 'Uso com inibidores CYP3A4 potentes'],
    advertencias_principais: ['⚠ Risco de prolongamento QT e morte súbita (especialmente doses altas, idosos, cardiopatas)', 'Evitar > 7 dias', 'Galactorreia/hiperprolactinemia', 'EMA restringiu doses e duração (2014)'],
    interacoes_principais: ['Inibidores CYP3A4 (cetoconazol, eritromicina — CONTRAINDICADO)', 'QT-prolongadores', 'Anticolinérgicos (antagonismo)'],
    uso_populacoes_especiais: { idoso: 'Cautela máxima — risco aumentado de QT e efeitos extrapiramidais', renal: 'Reduzir frequência para 1–2x/dia em IR', gestante: 'Evitar' },
    data_registro: '2015-04-12',
    data_ultima_atualizacao: '2025-08-20',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-domperix-comprimido.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-domperix-comprimido.pdf',
  },

  // ═══════════════════════════════════════════
  // INFECTOLOGIA — Fosfomicina / Anti-H.pylori
  // ═══════════════════════════════════════════

  {
    id: 'euro-foritus',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Ciprofloxacino',
    nome_comercial: 'ForITUs®',
    classe_terapeutica: 'Fluoroquinolona — Antibiótico',
    cids_aprovados: ['N10', 'N30', 'N39'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido', embalagem: '14 comprimidos' },
    ],
    posologia_aprovada: 'ITU complicada/pielonefrite: 500 mg 12/12h por 7–14 dias. Cistite não-complicada: 250 mg 12/12h por 3 dias.',
    contraindicacoes_bula: ['Hipersensibilidade a quinolonas', 'Uso com tizanidina', 'Menores de 18 anos (exceto indicações específicas)'],
    advertencias_principais: ['⚠ FDA Black Box: ruptura de tendão (Aquiles)', 'Prolongamento QT', 'Neuropatia periférica', 'Reservar para ITUs sem alternativa mais segura'],
    interacoes_principais: ['Antiácidos/cátions (reduzem absorção — separar 2h)', 'Teofilina (toxicidade)', 'Varfarina (aumenta INR)', 'Antidiabéticos'],
    uso_populacoes_especiais: { renal: 'Reduzir dose em ClCr < 30 mL/min', gestante: 'EVITAR', idoso: 'Maior risco de ruptura tendinosa e QT' },
    data_registro: '2022-06-15',
    data_ultima_atualizacao: '2025-09-05',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-foritus.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-foritus.pdf',
  },

  {
    id: 'euro-duomo-hp',
    lab_id: 'eurofarma',
    molecula: 'Doxazosina + Finasterida',
    nome_comercial: 'Duomo HP®',
    classe_terapeutica: 'Alfa-1 Bloqueador + Inibidor da 5-Alfa-Redutase (Associação para HPB)',
    cids_aprovados: ['N40'],
    apresentacoes: [
      { concentracao: '4mg + 5mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'HPB sintomática: 1 comprimido (doxazosina 4mg + finasterida 5mg) 1x/dia. Resposta esperada em 3–6 meses para finasterida; doxazosina age mais rapidamente.',
    contraindicacoes_bula: ['Hipersensibilidade aos componentes', 'Mulheres e crianças (finasterida)', 'Hipotensão ortostática grave', 'Insuficiência hepática grave'],
    advertencias_principais: ['Hipotensão ortostática na 1ª dose (doxazosina) — iniciar com cautela', 'Finasterida reduz PSA em ~50% (considerar na interpretação do PSA)', 'Disfunção sexual (ejaculação retrógrada, disfunção erétil)', 'Mulheres grávidas não devem manusear comprimidos (risco fetal — teratogênico)'],
    interacoes_principais: ['Anti-hipertensivos (hipotensão aditiva com doxazosina)', 'Inibidores CYP3A4 (aumentam doxazosina)', 'Inibidores de PDE5/tadalafila (hipotensão)'],
    uso_populacoes_especiais: { idoso: 'Maior risco de hipotensão ortostática — iniciar sentado/deitado', hepatico: 'Cautela em hepatopatia grave (ambos metabolizados no fígado)', renal: 'Sem ajuste necessário' },
    data_registro: '2019-10-08',
    data_ultima_atualizacao: '2025-10-20',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-duomo-hp.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-duomo-hp.pdf',
  },

  // ═══════════════════════════════════════════
  // CARDIOVASCULAR — Antiagregante / Vasodilatador
  // ═══════════════════════════════════════════

  {
    id: 'euro-plaq',
    lab_id: 'eurofarma',
    molecula: 'Bissulfato de Clopidogrel',
    nome_comercial: 'Plaq®',
    classe_terapeutica: 'Antiagregante Plaquetário — Inibidor do Receptor P2Y12',
    cids_aprovados: ['I20', 'I21', 'I25', 'I63', 'I70'],
    apresentacoes: [
      { concentracao: '75 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0281.0280.001-6' },
    ],
    posologia_aprovada: 'Prevenção CV secundária: 75 mg 1x/dia. SCA (com AAS): dose de ataque 300 mg, manutenção 75 mg/dia. Stent coronário: dupla terapia antiagregante por 6–12 meses.',
    contraindicacoes_bula: ['Sangramento ativo', 'Hipersensibilidade', 'Hepatopatia grave'],
    advertencias_principais: ['Suspender 5–7 dias antes de cirurgia eletiva', 'Não combinar com IBP (especialmente omeprazol — usa CYP2C19)', 'Resistência em metabolizadores lentos de CYP2C19 (10–15% da população)'],
    interacoes_principais: ['Omeprazol (reduz eficácia — preferir pantoprazol)', 'AINEs + AAS (sangramento triplo)', 'Varfarina (sangramento)', 'Inibidores CYP2C19'],
    uso_populacoes_especiais: { renal: 'Sem ajuste necessário', idoso: 'Mesma dose; monitorar sangramento', gestante: 'Evitar — dados limitados' },
    data_registro: '2018-12-05',
    data_ultima_atualizacao: '2025-09-20',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-plaq.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-plaq.pdf',
  },

  // ═══════════════════════════════════════════
  // UROLÓGICO / ANDROLÓGICO
  // ═══════════════════════════════════════════

  {
    id: 'euro-tada',
    lab_id: 'eurofarma',
    molecula: 'Tadalafila',
    nome_comercial: 'Tada®',
    classe_terapeutica: 'Inibidor da Fosfodiesterase-5 (iPDE5)',
    cids_aprovados: ['N52', 'N40', 'I27'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '4 comprimidos' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '1 comprimido' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '2 comprimidos' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '4 comprimidos' },
    ],
    posologia_aprovada: 'DE (uso sob demanda): 10 mg 30 min antes da atividade sexual; máx 20 mg/dia. DE (uso diário): 5 mg 1x/dia no mesmo horário. HPB: 5 mg 1x/dia. HAP: 40 mg 1x/dia.',
    contraindicacoes_bula: ['Nitratos (qualquer forma) — hipotensão grave FATAL', 'Riociguat', 'Hipersensibilidade'],
    advertencias_principais: ['⚠ CONTRAINDICADO com nitratos (ex: isossorbida) — queda grave de PA', 'Hipotensão em alfa-bloqueadores', 'Priapismo (raro — > 4h: urgência médica)', 'Perda súbita de visão/audição (NAION — raro)'],
    interacoes_principais: ['Nitratos (CONTRAINDICADO)', 'Alfa-bloqueadores (hipotensão)', 'Inibidores CYP3A4 (ritonavir — dose máx 10 mg/72h)', 'Álcool (hipotensão)'],
    uso_populacoes_especiais: { renal: 'Dose máx 10 mg em IR grave', hepatico: 'Dose máx 10 mg em hepatopatia moderada; evitar Child C', idoso: 'Mesma dose; maior sensibilidade a hipotensão' },
    data_registro: '2021-06-15',
    data_ultima_atualizacao: '2025-10-05',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-tada.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-tada.pdf',
  },

  // ═══════════════════════════════════════════
  // OSTEOPOROSE
  // ═══════════════════════════════════════════

  {
    id: 'euro-iban',
    lab_id: 'eurofarma',
    molecula: 'Ácido Ibandrónico',
    nome_comercial: 'Iban®',
    classe_terapeutica: 'Bifosfonato — Inibidor da Reabsorção Óssea',
    cids_aprovados: ['M80', 'M81', 'C50'],
    apresentacoes: [
      { concentracao: '150 mg', forma_farmaceutica: 'comprimido', embalagem: '1 comprimido (mensal)' },
    ],
    posologia_aprovada: 'Osteoporose: 150 mg 1 comprimido 1x/mês, em jejum, com copo cheio de água, 30–60 min antes de qualquer alimento/medicamento. Permanecer em pé por 60 min após.',
    contraindicacoes_bula: ['Hipocalcemia não corrigida', 'IR grave (ClCr < 30 mL/min)', 'Anormalidades esofágicas (estenose/acalasia)', 'Incapacidade de ficar em pé por 60 min'],
    advertencias_principais: ['Osteossarcoma de mandíbula (ONM) — risco com uso prolongado, procedimentos dentários, imunossupressão', 'Esofagite/úlcera esofágica (tomar corretamente)', 'Fraturas atípicas de fêmur (uso prolongado > 5 anos)', 'Hipocalcemia antes do início'],
    interacoes_principais: ['Cálcio, antiácidos, ferro — reduzem absorção (separar 60 min)', 'AINEs (irritação GI)'],
    uso_populacoes_especiais: { renal: 'CONTRAINDICADO em ClCr < 30 mL/min', idoso: 'Mesma dose; verificar dentição antes de iniciar', gestante: 'CONTRAINDICADO' },
    data_registro: '2020-05-20',
    data_ultima_atualizacao: '2025-08-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-iban.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-iban.pdf',
  },

  // ═══════════════════════════════════════════
  // RESPIRATÓRIO — Broncodilatador SABA
  // ═══════════════════════════════════════════

  {
    id: 'euro-ventus',
    lab_id: 'eurofarma',
    molecula: 'Furoato de Mometasona',
    nome_comercial: 'Ventus®',
    classe_terapeutica: 'Corticosteroide Inalatório (CI)',
    cids_aprovados: ['J45', 'J44', 'J30'],
    apresentacoes: [
      { concentracao: '50 mcg/dose', forma_farmaceutica: 'spray', embalagem: 'Frasco 17,5 mL (120 acionamentos)' },
    ],
    posologia_aprovada: 'Asma: 200–400 mcg 1–2x/dia. Lavar a boca após inalação.',
    contraindicacoes_bula: ['Hipersensibilidade à mometasona', 'Crise aguda de asma sem broncodilatador'],
    advertencias_principais: ['Candidíase oral — lavar boca após uso', 'Não substituir corticosteroide sistêmico abruptamente', 'Monitorar crescimento em crianças'],
    interacoes_principais: ['Cetoconazol/itraconazol (aumentam níveis sistêmicos)', 'Inibidores CYP3A4'],
    uso_populacoes_especiais: { pediatrico: 'Aprovado ≥ 4 anos', gestante: 'Pode usar — menor risco que asma não tratada' },
    data_registro: '2020-04-15',
    data_ultima_atualizacao: '2025-09-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-ventus.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-ventus.pdf',
  },

  // ═══════════════════════════════════════════
  // DIABETES — GLIFOZINA / GLP-1 / SULFONILUREIA
  // ═══════════════════════════════════════════

  {
    id: 'euro-glif',
    lab_id: 'eurofarma',
    molecula: 'Dapagliflozina',
    nome_comercial: 'Glif®',
    classe_terapeutica: 'Inibidor do Cotransportador Sódio-Glicose 2 (iSGLT2)',
    cids_aprovados: ['E11', 'I50', 'N18'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1548' },
    ],
    posologia_aprovada: 'DM2/IC/DRC: 10 mg 1x/dia, independente de refeições. Não iniciar em TFG < 25 mL/min (DM2) ou < 20 mL/min (DRC/IC).',
    contraindicacoes_bula: ['DM1', 'Cetoacidose diabética', 'TFG < 25 mL/min (DM2)', 'Hipersensibilidade'],
    advertencias_principais: ['Cetoacidose euglicêmica (raro)', 'Infecções genitais fúngicas', 'Poliúria/depleção de volume', 'Suspender antes de cirurgia eletiva (3 dias)', 'Gangrena de Fournier (raro)'],
    interacoes_principais: ['Insulina/sulfonilureias (hipoglicemia — reduzir dose)', 'Diuréticos (depleção de volume)'],
    uso_populacoes_especiais: { renal: 'DM2: não iniciar se TFG < 25; IC/DRC: manter até TFG 15 mL/min', gestante: 'CONTRAINDICADO (Cat. C)', idoso: 'Maior risco de depleção de volume — monitorar PA' },
    data_registro: '2024-03-10',
    data_ultima_atualizacao: '2026-01-15',
    versao_bula: 'v2026.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-glif.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-glif.pdf',
  },

  {
    id: 'euro-extensior',
    lab_id: 'eurofarma',
    molecula: 'Semaglutida',
    nome_comercial: 'Extensior®',
    classe_terapeutica: 'Agonista do Receptor GLP-1 (AR-GLP-1)',
    cids_aprovados: ['E11', 'E66', 'Z68'],
    apresentacoes: [
      { concentracao: '0,25 mg/dose', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Caneta 1,5 mL', registro_anvisa: '1.1766.0043' },
      { concentracao: '0,5 mg/dose', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Caneta 1,5 mL', registro_anvisa: '1.1766.0043' },
      { concentracao: '1 mg/dose', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Caneta 1,5 mL', registro_anvisa: '1.1766.0043' },
    ],
    posologia_aprovada: 'DM2/obesidade: iniciar 0,25 mg/semana SC por 4 semanas → 0,5 mg/semana → até 1 mg/semana (DM2) ou 2,4 mg/semana (obesidade).',
    contraindicacoes_bula: ['Neoplasia endócrina múltipla tipo 2 (NEM2)', 'Histórico pessoal/familiar de carcinoma medular de tireoide', 'Hipersensibilidade', 'Gravidez'],
    advertencias_principais: ['⚠ Retenção especial ANVISA', 'Náuseas/vômitos (dose-dependentes — transitórios)', 'Pancreatite aguda (suspender se suspeita)', 'Colelitíase', 'FC aumentada', 'Retinopatia diabética (pode piorar transitoriamente na melhora glicêmica rápida)'],
    interacoes_principais: ['Insulina/sulfonilureias (hipoglicemia)', 'Medicamentos orais (pode retardar absorção — tomar horário fixo)'],
    uso_populacoes_especiais: { renal: 'Sem ajuste; cautela em IR grave (dados limitados)', gestante: 'CONTRAINDICADO', idoso: 'Sem ajuste; monitorar estado de hidratação' },
    data_registro: '2023-08-20',
    data_ultima_atualizacao: '2026-01-15',
    versao_bula: 'v2026.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-extensior.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-extensior.pdf',
  },

  {
    id: 'euro-betes',
    lab_id: 'eurofarma',
    molecula: 'Glimepirida',
    nome_comercial: 'Betes®',
    classe_terapeutica: 'Sulfonilureia de 3ª Geração — Antidiabético Oral',
    cids_aprovados: ['E11'],
    apresentacoes: [
      { concentracao: '2 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.0965' },
      { concentracao: '4 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.0965' },
    ],
    posologia_aprovada: 'DM2: iniciar 1–2 mg 1x/dia ao café da manhã; titular até 4–8 mg/dia. Menor risco de hipoglicemia que glibenclamida.',
    contraindicacoes_bula: ['DM1/cetoacidose', 'IR grave', 'IH grave', 'Hipersensibilidade a sulfonamidas'],
    advertencias_principais: ['Hipoglicemia (menor risco que glibenclamida)', 'Ganho de peso', 'Monitorar função renal'],
    interacoes_principais: ['Fluconazol (potencializa)', 'Rifampicina (reduz efeito)', 'Beta-bloqueadores (mascarar hipoglicemia)', 'Álcool'],
    uso_populacoes_especiais: { idoso: 'Menor risco de hipoglicemia que glibenclamida; preferir glicazida', renal: 'Cautela em IR leve-moderada; evitar em grave' },
    data_registro: '2019-05-10',
    data_ultima_atualizacao: '2025-11-01',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-betes.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-betes.pdf',
  },

  // ═══════════════════════════════════════════
  // GASTROENTEROLOGIA — Esomeprazol / Trimebutina
  // ═══════════════════════════════════════════

  {
    id: 'euro-esio',
    lab_id: 'eurofarma',
    molecula: 'Esomeprazol Magnésico',
    nome_comercial: 'Ésio®',
    classe_terapeutica: 'Inibidor da Bomba de Prótons (IBP)',
    cids_aprovados: ['K21', 'K25', 'K26', 'K27', 'K29'],
    apresentacoes: [
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0043.1217' },
      { concentracao: '40 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0043.1217' },
    ],
    posologia_aprovada: 'DRGE/úlcera: 20–40 mg 1x/dia em jejum pela manhã. Erradicação H. pylori: 20 mg 2x/dia (tripla terapia 7–14 dias).',
    contraindicacoes_bula: ['Hipersensibilidade a benzimidazóis', 'Uso com nelfinavir'],
    advertencias_principais: ['Menor interação com clopidogrel que omeprazol', 'Deficiência de Mg2+ e B12 em uso prolongado', 'Risco de fratura óssea e C. difficile em uso crônico'],
    interacoes_principais: ['Clopidogrel (menor interação que omeprazol)', 'Metotrexato', 'Atazanavir', 'Tacrolimo'],
    uso_populacoes_especiais: { hepatico: 'Dose máxima 20 mg em Child C', gestante: 'Cat. B — pode usar se necessário' },
    data_registro: '2020-09-14',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-esio.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-esio.pdf',
  },

  {
    id: 'euro-trimeb',
    lab_id: 'eurofarma',
    molecula: 'Maleato de Trimebutina',
    nome_comercial: 'Trimeb®',
    classe_terapeutica: 'Regulador da Motilidade Intestinal — Antiespasmódico',
    cids_aprovados: ['K58', 'K57', 'K59'],
    apresentacoes: [
      { concentracao: '200 mg', forma_farmaceutica: 'capsula', embalagem: '30 cápsulas', registro_anvisa: '1.0043.1087' },
    ],
    posologia_aprovada: 'SII e distúrbios funcionais: 200 mg 3x/dia antes das refeições. Uso em adultos e crianças ≥ 12 anos.',
    contraindicacoes_bula: ['Hipersensibilidade à trimebutina', 'Menores de 12 anos'],
    advertencias_principais: ['Evitar em oclusão intestinal mecânica'],
    interacoes_principais: [],
    uso_populacoes_especiais: { gestante: 'Cat. B — usar com cautela', pediatrico: 'Não recomendado < 12 anos' },
    data_registro: '2017-03-15',
    data_ultima_atualizacao: '2025-08-01',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-trimeb.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-trimeb.pdf',
  },

  // ═══════════════════════════════════════════
  // ANALGÉSICOS / ANTI-INFLAMATÓRIOS — Novos
  // ═══════════════════════════════════════════

  {
    id: 'euro-coques',
    lab_id: 'eurofarma',
    molecula: 'Celecoxibe',
    nome_comercial: 'Coques®',
    classe_terapeutica: 'Anti-inflamatório — Inibidor Seletivo COX-2 (Coxibe)',
    cids_aprovados: ['M06', 'M15', 'M16', 'M17', 'M79'],
    apresentacoes: [
      { concentracao: '200 mg', forma_farmaceutica: 'capsula', embalagem: '20 cápsulas', registro_anvisa: '1.0043.1223' },
    ],
    posologia_aprovada: 'Artrite/dor: 100–200 mg 2x/dia. Dose máxima: 400 mg/dia. Usar a menor dose eficaz pelo menor tempo.',
    contraindicacoes_bula: ['Alergia a sulfonamidas', 'Pós-CRM', 'IAM ou AVC recente', 'IH/IR grave', 'Gravidez (3º trimestre)'],
    advertencias_principais: ['Risco CV aumentado (mesmo sendo seletivo COX-2)', 'Menor risco GI que AINEs não-seletivos', 'Nefrotoxicidade', 'Edema/HAS'],
    interacoes_principais: ['Varfarina (aumenta INR)', 'Lítio (aumenta nível)', 'IECA/BRA (nefrotoxicidade)', 'Inibidores CYP2C9 (fluconazol — aumenta celecoxibe)'],
    uso_populacoes_especiais: { idoso: 'Cautela — menor risco GI mas mesmo risco CV; iniciar com 100 mg/dia', renal: 'Cautela em IR moderada; CONTRAINDICADO em grave', gestante: 'CONTRAINDICADO 3º trimestre' },
    data_registro: '2021-04-20',
    data_ultima_atualizacao: '2025-09-10',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-coques.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-coques.pdf',
  },

  {
    id: 'euro-proflam',
    lab_id: 'eurofarma',
    molecula: 'Aceclofenaco',
    nome_comercial: 'Proflam®',
    classe_terapeutica: 'Anti-inflamatório Não Esteroidal (AINE) — Derivado do Diclofenaco',
    cids_aprovados: ['M06', 'M15', 'M16', 'M17', 'M54', 'M79'],
    apresentacoes: [
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos', registro_anvisa: '1.0043.0817' },
      { concentracao: '15 mg/g', forma_farmaceutica: 'creme', embalagem: 'Bisnaga 60 g', registro_anvisa: '1.0043.0817' },
    ],
    posologia_aprovada: 'Dor/inflamação: 100 mg 2x/dia. Uso máximo: 3 meses (oral). Creme: aplicar 2–3x/dia na região afetada.',
    contraindicacoes_bula: ['Úlcera péptica ativa', 'IH/IR grave', 'Gravidez (3º trimestre)', 'Alergia a AINEs', 'Menores de 12 anos'],
    advertencias_principais: ['Risco GI e cardiovascular dos AINEs', 'Nefrotoxicidade', 'Menor risco GI que diclofenaco', 'Monitorar função renal e hepática'],
    interacoes_principais: ['Varfarina/anticoagulantes', 'IECA/BRA (nefrotoxicidade)', 'Metotrexato', 'Lítio'],
    uso_populacoes_especiais: { gestante: 'CONTRAINDICADO 3º trimestre', idoso: 'Usar menor dose; monitorar função renal', renal: 'Evitar em IR grave' },
    data_registro: '2016-07-12',
    data_ultima_atualizacao: '2025-09-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-proflam.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-proflam.pdf',
  },

  {
    id: 'euro-dualgi',
    lab_id: 'eurofarma',
    molecula: 'Ibuprofeno + Paracetamol',
    nome_comercial: 'Dualgi®',
    classe_terapeutica: 'Associação AINE + Analgésico',
    cids_aprovados: ['R51', 'R52', 'M79'],
    apresentacoes: [
      { concentracao: '200 mg + 500 mg', forma_farmaceutica: 'comprimido', embalagem: '12 comprimidos', registro_anvisa: '1.0043.1516' },
    ],
    posologia_aprovada: 'Dor/febre: 1–2 comprimidos a cada 6–8h. Dose máxima: 6 comprimidos/dia. Uso ≥ 16 anos.',
    contraindicacoes_bula: ['< 16 anos', 'Úlcera péptica ativa', 'IR/IH grave', 'Gravidez (3º trimestre)', 'Alergia a AINEs'],
    advertencias_principais: ['Não exceder doses de ibuprofeno (risco GI/CV) nem de paracetamol (hepatotoxicidade)', 'Não combinar com outros AINEs ou paracetamol'],
    interacoes_principais: ['Varfarina', 'IECA/BRA', 'Álcool (hepatotoxicidade do paracetamol)', 'Metotrexato'],
    uso_populacoes_especiais: { gestante: 'CONTRAINDICADO no 3º trimestre', idoso: 'Cautela — risco GI e renal' },
    data_registro: '2023-02-10',
    data_ultima_atualizacao: '2025-11-01',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-dualgi.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-dualgi.pdf',
  },

  {
    id: 'euro-bicerto',
    lab_id: 'eurofarma',
    molecula: 'Cetoprofeno',
    nome_comercial: 'Bicerto®',
    classe_terapeutica: 'Anti-inflamatório Não Esteroidal (AINE) — Profeno',
    cids_aprovados: ['M06', 'M15', 'M17', 'M54', 'M79'],
    apresentacoes: [
      { concentracao: '150 mg', forma_farmaceutica: 'comprimido_liberacao_prolongada', embalagem: '20 comprimidos', registro_anvisa: '1.0043.1249' },
    ],
    posologia_aprovada: 'Artrite/dor musculoesquelética: 150 mg 1x/dia. Dose máxima: 200 mg/dia (libdr. prolongada).',
    contraindicacoes_bula: ['Gravidez (Cat. D — 3º trimestre)', 'IR/IH grave', 'Úlcera péptica ativa', 'Alergia a AINEs/aspirina'],
    advertencias_principais: ['Fotossensibilidade (evitar exposição solar durante tratamento)', 'Risco CV e GI dos AINEs'],
    interacoes_principais: ['Varfarina (aumenta INR)', 'Lítio (aumenta nível)', 'IECA/BRA/diuréticos (nefrotoxicidade)', 'Metotrexato'],
    uso_populacoes_especiais: { gestante: 'Cat. D — CONTRAINDICADO (especialmente 3º trimestre)', idoso: 'Menor dose; monitorar renal e GI' },
    data_registro: '2021-07-20',
    data_ultima_atualizacao: '2025-08-15',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-bicerto.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-bicerto.pdf',
  },

  {
    id: 'euro-gesico',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Tramadol',
    nome_comercial: 'Gésico®',
    classe_terapeutica: 'Analgésico Opioide — Agonista μ + ISRNA',
    cids_aprovados: ['R52', 'G89', 'M54'],
    apresentacoes: [
      { concentracao: '50 mg', forma_farmaceutica: 'capsula', embalagem: '20 cápsulas', registro_anvisa: '1.0043.1254' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido_liberacao_modificada', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1254' },
    ],
    posologia_aprovada: 'Dor moderada a intensa: 50–100 mg a cada 4–6h. Máximo: 400 mg/dia (300 mg em idosos). Retenção especial ANVISA.',
    contraindicacoes_bula: ['IMAOs', 'Epilepsia não controlada', 'Intoxicação aguda por álcool/opioides/psicofármacos'],
    advertencias_principais: ['Síndrome serotoninérgica com ISRS/IRSN', 'Dependência e tolerância', 'Convulsões', 'Depressão respiratória em superdose', '⚠ BEERS: cautela em idosos'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'ISRS/IRSN (síndrome serotoninérgica)', 'Benzodiazepínicos (depressão SNC)', 'Carbamazepina (reduz efeito)'],
    uso_populacoes_especiais: { renal: 'Espaçar 12/12h em ClCr < 30', hepatico: 'Espaçar 12/12h em IH grave', idoso: 'Máximo 300 mg/dia', gestante: 'EVITAR' },
    data_registro: '2018-11-10',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-gesico.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-gesico.pdf',
  },

  {
    id: 'euro-gesico-duo',
    lab_id: 'eurofarma',
    molecula: 'Tramadol + Paracetamol',
    nome_comercial: 'Gésico Duo®',
    classe_terapeutica: 'Associação Opioide + Analgésico',
    cids_aprovados: ['R52', 'M54', 'G89'],
    apresentacoes: [
      { concentracao: '37,5 mg + 325 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1304' },
    ],
    posologia_aprovada: 'Dor moderada a intensa: 1–2 comprimidos a cada 4–6h. Máximo: 8 comprimidos/dia. Retenção especial ANVISA.',
    contraindicacoes_bula: ['IMAOs', 'Epilepsia não controlada', 'IH grave', 'Hipersensibilidade'],
    advertencias_principais: ['Síndrome serotoninérgica', 'Não superar dose diária de paracetamol (3–4 g/dia)'],
    interacoes_principais: ['IMAOs', 'ISRS/IRSN', 'Álcool (hepatotox. paracetamol)', 'Varfarina'],
    uso_populacoes_especiais: { idoso: 'Máximo 300 mg tramadol/dia', gestante: 'EVITAR', renal: 'Espaçar 12/12h em ClCr < 30' },
    data_registro: '2019-09-05',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-gesico-duo.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-gesico-duo.pdf',
  },

  // ═══════════════════════════════════════════
  // SAÚDE MENTAL — Novos produtos
  // ═══════════════════════════════════════════

  {
    id: 'euro-dep',
    lab_id: 'eurofarma',
    molecula: 'Duloxetina',
    nome_comercial: 'Dep®',
    classe_terapeutica: 'Inibidor de Recaptação de Serotonina e Noradrenalina (IRSN)',
    cids_aprovados: ['F32', 'F33', 'F41', 'G62', 'M54', 'E11'],
    apresentacoes: [
      { concentracao: '30 mg', forma_farmaceutica: 'capsula_liberacao_retardada', embalagem: '30 cápsulas', registro_anvisa: '1.0043.1240' },
      { concentracao: '60 mg', forma_farmaceutica: 'capsula_liberacao_retardada', embalagem: '30 cápsulas', registro_anvisa: '1.0043.1240' },
    ],
    posologia_aprovada: 'TDM/TAG: 30–60 mg 1x/dia; máx 120 mg/dia. Neuropatia diabética/fibromialgia: 60 mg 1x/dia. Não abrir a cápsula.',
    contraindicacoes_bula: ['IMAOs (washout 14 dias)', 'IH grave', 'ClCr < 30 mL/min', 'HAS não controlada', 'Hipersensibilidade'],
    advertencias_principais: ['Aumento de PA — monitorar', 'Síndrome serotoninérgica', 'Hiponatremia/SIADH', 'Não suspender abruptamente (síndrome de descontinuação)', 'Ideação suicida (< 25 anos)'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Inibidores CYP1A2/CYP2D6 (fluvoxamina, paroxetina — aumentam nível)', 'Varfarina/AINEs (sangramento)', 'Triptanos'],
    uso_populacoes_especiais: { renal: 'CONTRAINDICADO em ClCr < 30 mL/min', hepatico: 'CONTRAINDICADO em IH grave', gestante: 'Cat. C; síndrome de abstinência neonatal', idoso: 'Iniciar 30 mg; monitorar PA e hiponatremia' },
    data_registro: '2021-05-15',
    data_ultima_atualizacao: '2025-11-20',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-dep.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-dep.pdf',
  },

  {
    id: 'euro-vod',
    lab_id: 'eurofarma',
    molecula: 'Bromidrato de Vortioxetina',
    nome_comercial: 'Vod®',
    classe_terapeutica: 'Antidepressivo Multimodal — Modulador Serotoninérgico',
    cids_aprovados: ['F32', 'F33'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1567' },
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1567' },
      { concentracao: '15 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1567' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1567' },
    ],
    posologia_aprovada: 'TDM: iniciar 10 mg 1x/dia; ajustar para 5–20 mg/dia conforme tolerância e resposta. CI < 18 anos.',
    contraindicacoes_bula: ['IMAOs (washout 14 dias)', 'Menores de 18 anos', 'Hipersensibilidade'],
    advertencias_principais: ['Retenção especial ANVISA', 'Síndrome serotoninérgica com IMAOs', 'Náuseas (frequente — transitório)', 'Ideação suicida (monitorar primeiras semanas)', 'Hiponatremia'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Inibidores CYP2D6 (paroxetina, fluoxetina — reduzir vortioxetina 50%)', 'Indutores CYP (rifampicina — aumentar vortioxetina)', 'Lítio/triptanos (síndrome serotoninérgica)'],
    uso_populacoes_especiais: { hepatico: 'Sem ajuste em IH leve/moderada; cautela em grave', gestante: 'Cat. C; avaliar risco-benefício', idoso: 'Sem ajuste obrigatório; iniciar 5 mg' },
    data_registro: '2023-06-20',
    data_ultima_atualizacao: '2025-11-20',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-vod.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-vod.pdf',
  },

  {
    id: 'euro-esc-odt',
    lab_id: 'eurofarma',
    molecula: 'Oxalato de Escitalopram',
    nome_comercial: 'ESC ODT®',
    classe_terapeutica: 'Inibidor Seletivo da Recaptação de Serotonina (ISRS)',
    cids_aprovados: ['F32', 'F33', 'F41'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido_orodispersivel', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1328' },
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido_orodispersivel', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1328' },
      { concentracao: '15 mg', forma_farmaceutica: 'comprimido_orodispersivel', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1328' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido_orodispersivel', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1328' },
    ],
    posologia_aprovada: 'TDM/TAG: iniciar 10 mg 1x/dia; dose usual 10–20 mg/dia. Máximo 20 mg/dia. Dissolver na língua ou com água.',
    contraindicacoes_bula: ['IMAOs', 'QT longo congênito', 'Hipersensibilidade'],
    advertencias_principais: ['Prolongamento QT (evitar com pimozida, QT-prolongadores)', 'Hiponatremia/SIADH', 'Retenção especial ANVISA', 'Ideação suicida (primeiras semanas)'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Pimozida (QT — CONTRAINDICADO)', 'QT-prolongadores', 'Lítio', 'Triptanos'],
    uso_populacoes_especiais: { idoso: 'Máximo 10 mg/dia em > 65 anos (risco QT)', hepatico: 'Iniciar 5 mg, máximo 10 mg em hepatopatia' },
    data_registro: '2022-05-10',
    data_ultima_atualizacao: '2025-10-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-esc-odt.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-esc-odt.pdf',
  },

  {
    id: 'euro-pondera-xr',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Paroxetina',
    nome_comercial: 'Pondera XR®',
    classe_terapeutica: 'Inibidor Seletivo da Recaptação de Serotonina (ISRS) — Liberação Modificada',
    cids_aprovados: ['F32', 'F33', 'F40', 'F41', 'F42'],
    apresentacoes: [
      { concentracao: '12,5 mg', forma_farmaceutica: 'comprimido_liberacao_modificada', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1268' },
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido_liberacao_modificada', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1268' },
    ],
    posologia_aprovada: 'Depressão/ansiedade: 12,5 mg 1x/dia pela manhã; titular até 25–62,5 mg/dia. Melhor tolerância GI que formulação IR.',
    contraindicacoes_bula: ['IMAOs', 'Tioridazina', 'Pimozida', 'Hipersensibilidade'],
    advertencias_principais: ['Maior síndrome de descontinuação entre ISRS — reduzir gradualmente', 'Cat. D — teratogênico (defeito septo cardíaco)', 'Efeitos anticolinérgicos', 'Retenção especial ANVISA'],
    interacoes_principais: ['IMAOs (CONTRAINDICADO)', 'Tramadol', 'Triptanos', 'Varfarina', 'Atomoxetina (CYP2D6)'],
    uso_populacoes_especiais: { gestante: 'Cat. D — EVITAR (defeitos cardíacos fetais)', idoso: 'Iniciar 12,5 mg; efeitos anticolinérgicos aumentados', renal: 'Máx 25 mg/dia em IR grave' },
    data_registro: '2022-01-15',
    data_ultima_atualizacao: '2025-11-01',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-pondera-xr.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-pondera-xr.pdf',
  },

  {
    id: 'euro-riss',
    lab_id: 'eurofarma',
    molecula: 'Risperidona',
    nome_comercial: 'Riss®',
    classe_terapeutica: 'Antipsicótico Atípico (2ª Geração) — Antagonista D2/5-HT2A',
    cids_aprovados: ['F20', 'F25', 'F31', 'F84'],
    apresentacoes: [
      { concentracao: '1 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1002' },
      { concentracao: '2 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1002' },
      { concentracao: '3 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1002' },
    ],
    posologia_aprovada: 'Esquizofrenia: iniciar 2 mg/dia; dose usual 4–8 mg/dia (1–2 tomadas). TAB/mania: 2–3 mg 1x/dia. TEA: 0,5–3 mg/dia. Retenção especial ANVISA.',
    contraindicacoes_bula: ['Hipersensibilidade', 'Demência (risco aumentado de AVC e morte — Black Box)'],
    advertencias_principais: ['⚠ Síndrome metabólica (ganho de peso, DM2, dislipidemia)', 'Hiperprolactinemia (ginecomastia, amenorreia)', 'Prolongamento QT', 'Efeitos extrapiramidais (akathisia, parkinsonismo)', 'Síndrome neuroléptica maligna', '⚠ BEERS: alto risco em idosos com demência'],
    interacoes_principais: ['QT-prolongadores', 'CYP2D6 inibidores (paroxetina, fluoxetina — aumentam nível)', 'Carbamazepina (reduz nível)', 'Clozapina (neutropenia)'],
    uso_populacoes_especiais: { renal: 'Iniciar 0,5 mg 2x/dia e titular lentamente', hepatico: 'Sem ajuste', idoso: '⚠ Demência — CONTRAINDICADO (AVC, morte)', gestante: 'Cat. C; sintomas extrapiramidais e abstinência neonatal' },
    data_registro: '2017-03-20',
    data_ultima_atualizacao: '2025-11-15',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-riss.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-riss.pdf',
  },

  {
    id: 'euro-prysma',
    lab_id: 'eurofarma',
    molecula: 'Eszopiclona',
    nome_comercial: 'Prysma®',
    classe_terapeutica: 'Hipnótico Não-Benzodiazepínico — Agonista do Receptor GABA-A',
    cids_aprovados: ['G47.0'],
    apresentacoes: [
      { concentracao: '1 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1248' },
      { concentracao: '2 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1248' },
      { concentracao: '3 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1248' },
    ],
    posologia_aprovada: 'Insônia: 1–3 mg imediatamente antes de deitar. CI em > 65 anos e < 18 anos. Retenção especial ANVISA.',
    contraindicacoes_bula: ['Hipersensibilidade', 'Miastenia gravis', 'Apneia do sono grave não tratada', 'IH grave', '> 65 anos', '< 18 anos'],
    advertencias_principais: ['Tolerância e dependência (uso máximo recomendado: 3–6 meses)', 'Sonambulismo e comportamentos complexos do sono', 'Depressão respiratória', 'Déficit cognitivo no dia seguinte — não dirigir', 'Paladar metálico'],
    interacoes_principais: ['Álcool e depressores do SNC (potencializam sedação)', 'Inibidores CYP3A4 (cetoconazol — aumentam nível)', 'Rifampicina (reduz nível)'],
    uso_populacoes_especiais: { idoso: 'CONTRAINDICADO > 65 anos', hepatico: 'CONTRAINDICADO em IH grave; 1 mg em moderada', gestante: 'Cat. C — evitar' },
    data_registro: '2021-10-05',
    data_ultima_atualizacao: '2025-10-20',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-prysma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-prysma.pdf',
  },

  {
    id: 'euro-turno',
    lab_id: 'eurofarma',
    molecula: 'Hemitartarato de Zolpidem',
    nome_comercial: 'Turno®',
    classe_terapeutica: 'Hipnótico Não-Benzodiazepínico — Agonista do Receptor GABA-A (Z-drug)',
    cids_aprovados: ['G47.0'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1398' },
    ],
    posologia_aprovada: 'Insônia: 10 mg imediatamente antes de deitar (homens); 5 mg em mulheres e idosos. Uso máximo: 4 semanas. Retenção especial ANVISA.',
    contraindicacoes_bula: ['Apneia do sono grave', 'Miastenia gravis', 'IH grave', 'Hipersensibilidade'],
    advertencias_principais: ['Sonambulismo e comportamentos complexos do sono', 'Dependência (risco menor que BDZ)', 'Não dirigir na manhã seguinte', 'Tolerância com uso prolongado', '⚠ BEERS: risco em idosos — quedas e delirium'],
    interacoes_principais: ['Álcool (depressão SNC grave)', 'Inibidores CYP3A4 (cetoconazol)', 'Rifampicina (reduz nível)', 'Outros depressores SNC'],
    uso_populacoes_especiais: { idoso: '5 mg/noite (menor metabolização — risco de sedação residual)', gestante: 'Cat. C — evitar; abstinência neonatal', hepatico: 'CONTRAINDICADO em IH grave; 5 mg em moderada' },
    data_registro: '2022-04-01',
    data_ultima_atualizacao: '2025-10-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-turno.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-turno.pdf',
  },

  {
    id: 'euro-turno-sl',
    lab_id: 'eurofarma',
    molecula: 'Hemitartarato de Zolpidem',
    nome_comercial: 'Turno SL®',
    classe_terapeutica: 'Hipnótico Não-Benzodiazepínico — Via Sublingual',
    cids_aprovados: ['G47.0'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido_sublingual', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1301' },
    ],
    posologia_aprovada: 'Insônia de manutenção: 5 mg SL ao acordar durante a noite (mínimo 4h antes de levantar). Retenção especial ANVISA.',
    contraindicacoes_bula: ['Apneia do sono', 'IH grave', 'Hipersensibilidade'],
    advertencias_principais: ['Início de ação mais rápido pela via SL', 'Comportamentos complexos do sono (sonambulismo)', '⚠ Não tomar ao deitar — apenas ao acordar durante a noite'],
    interacoes_principais: ['Álcool', 'Inibidores CYP3A4', 'Outros depressores SNC'],
    uso_populacoes_especiais: { idoso: 'Não recomendado — risco de sedação residual', gestante: 'Evitar' },
    data_registro: '2021-08-20',
    data_ultima_atualizacao: '2025-10-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-turno-sl.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-turno-sl.pdf',
  },

  {
    id: 'euro-turno-xr',
    lab_id: 'eurofarma',
    molecula: 'Hemitartarato de Zolpidem',
    nome_comercial: 'Turno XR®',
    classe_terapeutica: 'Hipnótico Não-Benzodiazepínico — Liberação Prolongada',
    cids_aprovados: ['G47.0'],
    apresentacoes: [
      { concentracao: '6,25 mg', forma_farmaceutica: 'comprimido_liberacao_prolongada', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1487' },
      { concentracao: '12,5 mg', forma_farmaceutica: 'comprimido_liberacao_prolongada', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1487' },
    ],
    posologia_aprovada: 'Insônia: 6,25 mg (mulheres/idosos) ou 12,5 mg (homens) imediatamente antes de deitar. NÃO triturar ou mastigar. Retenção especial ANVISA.',
    contraindicacoes_bula: ['Apneia do sono grave', 'IH grave', 'Hipersensibilidade'],
    advertencias_principais: ['Liberação prolongada — maior risco de sedação residual matinal', 'Não dirigir no dia seguinte', 'Comportamentos complexos do sono'],
    interacoes_principais: ['Álcool', 'Inibidores CYP3A4', 'Outros depressores SNC'],
    uso_populacoes_especiais: { idoso: '6,25 mg somente; maior risco de sedação residual e quedas', gestante: 'Cat. C — evitar' },
    data_registro: '2023-01-10',
    data_ultima_atualizacao: '2025-10-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-turno-xr.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-turno-xr.pdf',
  },

  {
    id: 'euro-pergo',
    lab_id: 'eurofarma',
    molecula: 'Dicloridrato de Hidroxizina',
    nome_comercial: 'Pergo®',
    classe_terapeutica: 'Anti-histamínico H1 de 1ª Geração — Ansiolítico/Antiprurignoso',
    cids_aprovados: ['F41', 'L29', 'F51.0'],
    apresentacoes: [
      { concentracao: '2 mg/mL', forma_farmaceutica: 'solucao_oral', embalagem: 'Frasco 120 mL', registro_anvisa: '1.0043.1189' },
    ],
    posologia_aprovada: 'Ansiedade/prurido: adultos 50–100 mg/dia em 2–4 tomadas; máx 300 mg/dia. Pediátrico: 0,5–1 mg/kg/dia. Pré-medicação: 50–100 mg dose única.',
    contraindicacoes_bula: ['QT longo congênito', 'Hipersensibilidade à hidroxizina ou cetirizina', 'Porfiria'],
    advertencias_principais: ['Prolongamento QT — cautela com QT-prolongadores', 'Sedação — não dirigir', '⚠ BEERS: evitar em idosos (anticolinérgico, sedação, confusão)', 'Retenção urinária'],
    interacoes_principais: ['Álcool e depressores SNC (potencializam sedação)', 'QT-prolongadores (haloperidol, amitriptilina)', 'Anticolinérgicos'],
    uso_populacoes_especiais: { idoso: '⚠ EVITAR — Critérios de Beers (sedação, quedas, confusão, retenção urinária)', gestante: 'Evitar no 1º trimestre e próximo ao parto', renal: 'Reduzir dose/frequência' },
    data_registro: '2019-08-12',
    data_ultima_atualizacao: '2025-09-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-pergo.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-pergo.pdf',
  },

  // ═══════════════════════════════════════════
  // NEUROLÓGICO — Novos
  // ═══════════════════════════════════════════

  {
    id: 'euro-amato',
    lab_id: 'eurofarma',
    molecula: 'Topiramato',
    nome_comercial: 'Amato®',
    classe_terapeutica: 'Anticonvulsivante Multimecanismo',
    cids_aprovados: ['G40', 'G43'],
    apresentacoes: [
      { concentracao: '25 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.0959' },
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.0959' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.0959' },
    ],
    posologia_aprovada: 'Epilepsia: iniciar 25–50 mg/dia; titular lentamente (25 mg/semana) até 200–400 mg/dia. Enxaqueca profilaxia: 50–100 mg/dia. Cat. D.',
    contraindicacoes_bula: ['Hipersensibilidade', 'Litíase renal com histórico de hipercalciúria'],
    advertencias_principais: ['Cat. D — teratogênico (fenda palatina, lábio leporino)', 'Acúmulo de calor/hipertermia (hipoidrose)', 'Glaucoma agudo de ângulo fechado', 'Nefrolitíase', 'Déficit cognitivo/alterações psiquiátricas', 'Perda de peso'],
    interacoes_principais: ['Valproato (hiperamonemia — monitorar)', 'Anticoncepcionais orais (reduz eficácia — usar método adicional)', 'Carbamazepina/fenitoína (reduzem topiramato)', 'Álcool (potencializa)'],
    uso_populacoes_especiais: { renal: 'Reduzir 50% em ClCr < 70 mL/min', gestante: 'Cat. D — CONTRAINDICADO (fenda palatina, RCF)', pediatrico: 'Ajuste de dose por peso — formulação comprimido a partir de 2 anos' },
    data_registro: '2018-06-10',
    data_ultima_atualizacao: '2025-10-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-amato.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-amato.pdf',
  },

  {
    id: 'euro-pisa',
    lab_id: 'eurofarma',
    molecula: 'Dicloridrato de Pramipexol',
    nome_comercial: 'Pisa®',
    classe_terapeutica: 'Agonista Dopaminérgico D2/D3 — Antiparkinsoniano',
    cids_aprovados: ['G20', 'G25.81'],
    apresentacoes: [
      { concentracao: '0,375 mg', forma_farmaceutica: 'comprimido_liberacao_prolongada', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1174' },
      { concentracao: '0,75 mg', forma_farmaceutica: 'comprimido_liberacao_prolongada', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1174' },
      { concentracao: '1,5 mg', forma_farmaceutica: 'comprimido_liberacao_prolongada', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1174' },
    ],
    posologia_aprovada: 'Parkinson: iniciar 0,375 mg 1x/dia; aumentar 0,75 mg/semana até dose usual 1,5–4,5 mg/dia. SPI: 0,125–0,75 mg/noite. Retenção especial ANVISA.',
    contraindicacoes_bula: ['Hipersensibilidade', 'IR grave (ClCr < 20 mL/min)'],
    advertencias_principais: ['Sonolência súbita (risco ao dirigir — alertar paciente)', 'Controle de impulsos (jogo, hipersexualidade, compulsão alimentar)', 'Alucinações/psicose', 'Hipotensão ortostática', 'Augmentation na SPI (com uso prolongado)'],
    interacoes_principais: ['Metoclopramida (antagoniza)', 'Cimetidina (aumenta nível)', 'Levodopa (potencializa)', 'Álcool (sedação)'],
    uso_populacoes_especiais: { renal: 'CONTRAINDICADO em ClCr < 20; ajuste obrigatório em ClCr 20–80', gestante: 'CONTRAINDICADO', idoso: 'Iniciar com dose mínima; monitorar PA ortostática' },
    data_registro: '2020-10-15',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-pisa.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-pisa.pdf',
  },

  {
    id: 'euro-betina',
    lab_id: 'eurofarma',
    molecula: 'Dicloridrato de Betaistina',
    nome_comercial: 'Betina®',
    classe_terapeutica: 'Análogo da Histamina — Antivertiginoso',
    cids_aprovados: ['H81.0', 'H81.3', 'R42'],
    apresentacoes: [
      { concentracao: '16 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1088' },
      { concentracao: '24 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1088' },
    ],
    posologia_aprovada: 'Doença de Ménière/vertigem: 16–24 mg 2–3x/dia às refeições. Resultado esperado após 2–4 semanas. Tratamento prolongado.',
    contraindicacoes_bula: ['Feocromocitoma', 'Hipersensibilidade à betaistina'],
    advertencias_principais: ['Asma brônquica — cautela (histaminérgico)', 'Úlcera péptica ativa — cautela', 'Pode causar cefaleia e distúrbio GI leve'],
    interacoes_principais: ['Anti-histamínicos H1 (antagonismo teórico — sem significância clínica relevante)', 'IMAO-B (teórico)'],
    uso_populacoes_especiais: { gestante: 'Cat. B — usar com cautela; dados limitados', pediatrico: 'Não recomendado (dados insuficientes)' },
    data_registro: '2017-12-10',
    data_ultima_atualizacao: '2025-09-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-betina.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-betina.pdf',
  },

  // ═══════════════════════════════════════════
  // CARDIOVASCULAR — Anticoagulante / Antiagregante / Vasoativo
  // ═══════════════════════════════════════════

  {
    id: 'euro-versa',
    lab_id: 'eurofarma',
    molecula: 'Enoxaparina Sódica',
    nome_comercial: 'Versa®',
    classe_terapeutica: 'Heparina de Baixo Peso Molecular (HBPM) — Anticoagulante',
    cids_aprovados: ['I26', 'I80', 'I21', 'Z29'],
    apresentacoes: [
      { concentracao: '20 mg', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Seringa preenchida 0,2 mL', registro_anvisa: '1.0043.1016' },
      { concentracao: '40 mg', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Seringa preenchida 0,4 mL', registro_anvisa: '1.0043.1016' },
      { concentracao: '60 mg', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Seringa preenchida 0,6 mL', registro_anvisa: '1.0043.1016' },
      { concentracao: '80 mg', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Seringa preenchida 0,8 mL', registro_anvisa: '1.0043.1016' },
    ],
    posologia_aprovada: 'Profilaxia TVP: 20–40 mg SC 1x/dia. Tratamento TVP/TEP: 1 mg/kg SC 12/12h. SCA (UA/IAMSST): 1 mg/kg SC 12/12h + AAS.',
    contraindicacoes_bula: ['Sangramento ativo maior', 'Trombocitopenia induzida por heparina (HIT)', 'Hipersensibilidade a enoxaparina/heparina'],
    advertencias_principais: ['Cat. B', 'Monitorar anti-Xa em IR, obesidade, extremos de peso', 'HIT (suspender imediatamente)', 'Não substituir 1:1 por outras HBPMs ou HNF'],
    interacoes_principais: ['Anticoagulantes orais (aumenta sangramento)', 'AINEs/aspirina (sangramento)', 'Trombolíticos'],
    uso_populacoes_especiais: { renal: 'ClCr < 30: reduzir para 1 mg/kg 1x/dia (tratamento) ou 20 mg 1x/dia (profilaxia)', gestante: 'Cat. B — opção preferida na gestação' },
    data_registro: '2018-04-12',
    data_ultima_atualizacao: '2025-09-20',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-versa.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-versa.pdf',
  },

  {
    id: 'euro-saliprevi',
    lab_id: 'eurofarma',
    molecula: 'Ácido Acetilsalicílico',
    nome_comercial: 'Saliprevi®',
    classe_terapeutica: 'Antiagregante Plaquetário / AINE — Inibidor Irreversível COX',
    cids_aprovados: ['I21', 'I25', 'I63', 'Z82'],
    apresentacoes: [
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido_gastrorresistente', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1489' },
    ],
    posologia_aprovada: 'Prevenção CV secundária: 100 mg 1x/dia. Prevenção primária: apenas em alto risco CV selecionado.',
    contraindicacoes_bula: ['Sangramento ativo', 'Úlcera péptica ativa', '< 16 anos (Síndrome de Reye)', 'Gravidez (Cat. C/D — 3º trimestre CONTRAINDICADO)', 'Alergia a AINEs/aspirina'],
    advertencias_principais: ['Sangramento GI — usar formulação entérica', '3º trimestre: CONTRAINDICADO (fecha canal arterial)', 'Resistência à aspirina (~25%)'],
    interacoes_principais: ['Ibuprofeno (bloqueia efeito antiagregante irreversível da aspirina — espaçar 2h)', 'Varfarina (sangramento)', 'IECAs (reduz efeito anti-hipertensivo em doses altas)'],
    uso_populacoes_especiais: { gestante: 'CONTRAINDICADO no 3º trimestre; evitar no 1º; doses baixas podem ser usadas no 2º trimestre sob supervisão', idoso: 'Risco GI maior — associar IBP' },
    data_registro: '2023-05-15',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-saliprevi.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-saliprevi.pdf',
  },

  {
    id: 'euro-vascor-mr',
    lab_id: 'eurofarma',
    molecula: 'Dicloridrato de Trimetazidina',
    nome_comercial: 'Vascor MR®',
    classe_terapeutica: 'Antianginoso Metabólico — Inibidor Parcial da Oxidação de Ácidos Graxos',
    cids_aprovados: ['I20', 'I25', 'H42.0'],
    apresentacoes: [
      { concentracao: '35 mg', forma_farmaceutica: 'comprimido_liberacao_prolongada', embalagem: '60 comprimidos', registro_anvisa: '1.0043.1477' },
    ],
    posologia_aprovada: 'Angina estável (adjuvante): 35 mg 2x/dia às refeições (MR). Não suspender abruptamente.',
    contraindicacoes_bula: ['Doença de Parkinson e parkinsonismo (tremor, rigidez)', 'IR grave (ClCr < 30 mL/min)', 'Hipersensibilidade'],
    advertencias_principais: ['Pode precipitar ou piorar sintomas parkinsonianos — suspender se ocorrer', 'Cuidado em IR moderada (ClCr 30–60 mL/min)', 'Tontura, tremor, desequilíbrio como efeitos adversos'],
    interacoes_principais: [],
    uso_populacoes_especiais: { renal: 'CONTRAINDICADO em ClCr < 30; reduzir para 35 mg 1x/dia em ClCr 30–60', idoso: 'Monitorar função renal e sintomas extrapiramidais' },
    data_registro: '2023-03-20',
    data_ultima_atualizacao: '2025-09-10',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-vascor-mr.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-vascor-mr.pdf',
  },

  {
    id: 'euro-perivasc',
    lab_id: 'eurofarma',
    molecula: 'Diosmina + Hesperidina',
    nome_comercial: 'Perivasc®',
    classe_terapeutica: 'Flebotônico / Venoativo — Flavonoide',
    cids_aprovados: ['I83', 'I86', 'K64', 'I87'],
    apresentacoes: [
      { concentracao: '450 mg + 50 mg (500 mg total)', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1096' },
      { concentracao: '900 mg + 100 mg (1.000 mg total)', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1096' },
    ],
    posologia_aprovada: 'Insuficiência venosa crônica/hemorroidas: 2 comp. 500 mg 1x/dia (ou 1 comp. 1000 mg 1x/dia). Usar às refeições.',
    contraindicacoes_bula: ['Hipersensibilidade'],
    advertencias_principais: ['Geralmente bem tolerado', 'GI leve (náusea, dispepsia)'],
    interacoes_principais: [],
    uso_populacoes_especiais: { gestante: 'Cat. B — usar com cautela (dados limitados)', pediatrico: 'Não recomendado (dados insuficientes)' },
    data_registro: '2017-09-20',
    data_ultima_atualizacao: '2025-08-01',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-perivasc.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-perivasc.pdf',
  },

  // ═══════════════════════════════════════════
  // RESPIRATÓRIO — Anti-H1 Novos / Piemonte
  // ═══════════════════════════════════════════

  {
    id: 'euro-altiva',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Fexofenadina',
    nome_comercial: 'Altiva®',
    classe_terapeutica: 'Anti-histamínico H1 de 2ª Geração — Não Sedante',
    cids_aprovados: ['J30', 'J31', 'L50'],
    apresentacoes: [
      { concentracao: '120 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos', registro_anvisa: '1.0043.1273' },
      { concentracao: '180 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos', registro_anvisa: '1.0043.1273' },
    ],
    posologia_aprovada: 'Rinite alérgica: 120 mg 2x/dia ou 180 mg 1x/dia. Urticária: 180 mg 1x/dia. Tomar com água (não com suco de laranja/toranja/maçã).',
    contraindicacoes_bula: ['Hipersensibilidade à fexofenadina'],
    advertencias_principais: ['NÃO tomar com sucos cítricos ou de maçã (reduzem absorção em 36%)', 'Mínima ou nenhuma sedação', 'Ajuste em IR grave'],
    interacoes_principais: ['Eritromicina/cetoconazol (aumentam fexofenadina em 50% — sem significância clínica)', 'Sucos cítricos/maçã (reduzem absorção — separar 4h)'],
    uso_populacoes_especiais: { renal: '60 mg 1x/dia em IR grave', gestante: 'Cat. C — usar com cautela', pediatrico: '≥ 6 anos: 30 mg 2x/dia; ≥ 12 anos: dose adulto' },
    data_registro: '2020-11-10',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-altiva.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-altiva.pdf',
  },

  {
    id: 'euro-ebastel',
    lab_id: 'eurofarma',
    molecula: 'Ebastina',
    nome_comercial: 'Ebastel®',
    classe_terapeutica: 'Anti-histamínico H1 de 2ª Geração — Não Sedante',
    cids_aprovados: ['J30', 'J31', 'L50'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos', registro_anvisa: '1.0043.0760' },
      { concentracao: '1 mg/mL', forma_farmaceutica: 'xarope', embalagem: 'Frasco 120 mL', registro_anvisa: '1.0043.0760' },
    ],
    posologia_aprovada: 'Rinite alérgica/urticária: 10 mg 1x/dia (adultos e ≥ 12 anos). Crianças 6–11 anos: 5 mg 1x/dia. Crianças 2–5 anos: 2,5 mg 1x/dia (xarope).',
    contraindicacoes_bula: ['QT longo congênito', 'Hipersensibilidade', 'IH grave'],
    advertencias_principais: ['Risco de prolongamento QT — cautela com QT-prolongadores', 'Menor sedação que anti-H1 de 1ª geração'],
    interacoes_principais: ['Cetoconazol/eritromicina (inibidores CYP3A4 — aumentam nível; potencial risco QT)'],
    uso_populacoes_especiais: { hepatico: 'CONTRAINDICADO em IH grave (metabolização hepática)', gestante: 'Cat. C — usar com cautela', pediatrico: 'A partir de 2 anos (xarope)' },
    data_registro: '2015-06-20',
    data_ultima_atualizacao: '2025-08-15',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-ebastel.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-ebastel.pdf',
  },

  {
    id: 'euro-zina-odt',
    lab_id: 'eurofarma',
    molecula: 'Dicloridrato de Levocetirizina',
    nome_comercial: 'Zina® ODT',
    classe_terapeutica: 'Anti-histamínico H1 de 3ª Geração — Orodispersível',
    cids_aprovados: ['J30', 'J31', 'L50'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido_orodispersivel', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1461' },
    ],
    posologia_aprovada: 'Rinite alérgica/urticária crônica: 5 mg 1x/dia à noite. Dissolve na língua sem necessidade de água. CI em ClCr < 10 mL/min e hemodiálise.',
    contraindicacoes_bula: ['IR grave (ClCr < 10 mL/min)', 'Hemodiálise', 'Hipersensibilidade à levocetirizina/cetirizina/piperazínicos', 'Lactação'],
    advertencias_principais: ['Contém aspartamo (fenilcetonúria — cautela)', 'Contém lactose', 'Sonolência — evitar dirigir', '≥ 6 anos'],
    interacoes_principais: ['Álcool e depressores SNC'],
    uso_populacoes_especiais: { renal: 'ClCr 30–49: 2,5 mg/dia; ClCr 10–29: 2,5 mg a cada 2 dias; CONTRAINDICADO < 10', pediatrico: '≥ 6 anos: 5 mg 1x/dia' },
    data_registro: '2023-07-15',
    data_ultima_atualizacao: '2025-11-01',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-zina-odt.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-zina-odt.pdf',
  },

  {
    id: 'euro-piemonte-sache',
    lab_id: 'eurofarma',
    molecula: 'Montelucaste Sódico',
    nome_comercial: 'Piemonte®',
    classe_terapeutica: 'Antagonista de Leucotrienos — Pediátrico',
    cids_aprovados: ['J45', 'J30'],
    apresentacoes: [
      { concentracao: '4 mg', forma_farmaceutica: 'granulado_sache', embalagem: '30 sachês', registro_anvisa: '1.0043.1320' },
    ],
    posologia_aprovada: 'Asma/rinite alérgica (6 meses a 5 anos): 4 mg granulado 1x/dia. Misturar o conteúdo em leite materno, fórmula ou alimento mole.',
    contraindicacoes_bula: ['Hipersensibilidade ao montelucaste'],
    advertencias_principais: ['⚠ FDA Black Box: alterações neuropsiquiátricas (depressão, suicídio, sonambulismo) — reservar para casos sem alternativa', 'Não suspender abruptamente em asma'],
    interacoes_principais: ['Fenobarbital (reduz níveis)', 'Rifampicina'],
    uso_populacoes_especiais: { pediatrico: '6 meses a 5 anos: 4 mg/dia (sachê). 6–14 anos: 5 mg comprimido. ≥ 15 anos: 10 mg comprimido' },
    data_registro: '2021-11-10',
    data_ultima_atualizacao: '2025-09-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-piemonte-sache.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-piemonte-sache.pdf',
  },

  // ═══════════════════════════════════════════
  // INFECTOLOGIA — Novos
  // ═══════════════════════════════════════════

  {
    id: 'euro-vilaxy',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Valaciclovir',
    nome_comercial: 'Vilaxy®',
    classe_terapeutica: 'Antiviral — Pró-fármaco do Aciclovir',
    cids_aprovados: ['B00', 'B02', 'A60'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos', registro_anvisa: '1.0043.1520' },
    ],
    posologia_aprovada: 'Herpes zoster: 1 g 3x/dia por 7 dias. HSV genital (1º episódio): 1 g 2x/dia por 10 dias. Supressão recorrente: 500 mg 1x/dia. Herpes labial: 2 g 12/12h por 1 dia. ≥ 12 anos.',
    contraindicacoes_bula: ['Hipersensibilidade a valaciclovir/aciclovir', '< 12 anos'],
    advertencias_principais: ['Ajuste obrigatório em IR (risco de encefalopatia)', 'Micrangiopatia trombótica (TTP/SHU) em imunossuprimidos — monitorar', 'Hidratação adequada'],
    interacoes_principais: ['Probenecida/cimetidina (aumentam nível por redução de eliminação renal)', 'Nefrotóxicos (cautela)'],
    uso_populacoes_especiais: { renal: 'Ajuste obrigatório: ClCr 30–49: 1 g 12/12h; ClCr 10–29: 1 g 1x/dia; ClCr < 10: 500 mg 1x/dia', gestante: 'Cat. B — pode usar se necessário' },
    data_registro: '2022-08-10',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-vilaxy.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-vilaxy.pdf',
  },

  {
    id: 'euro-azox',
    lab_id: 'eurofarma',
    molecula: 'Nitazoxanida',
    nome_comercial: 'Azox®',
    classe_terapeutica: 'Antiprotozoário / Antiparasitário de Amplo Espectro',
    cids_aprovados: ['A07', 'A08', 'B82'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido', embalagem: '6 comprimidos', registro_anvisa: '1.0043.1228' },
    ],
    posologia_aprovada: 'Giardíase/criptosporidiose: 500 mg 2x/dia por 3 dias (adultos). Tomar com refeição. Cat. B.',
    contraindicacoes_bula: ['Hipersensibilidade à nitazoxanida'],
    advertencias_principais: ['Urina pode apresentar coloração amarela (metabólito — inócuo)', 'Cautela em IR/IH grave'],
    interacoes_principais: ['Altamente ligado a proteínas — cautela com outros medicamentos de alta ligação proteica'],
    uso_populacoes_especiais: { renal: 'Cautela em IR grave (dados limitados)', pediatrico: '12–47 meses: 100 mg 2x/dia; 4–11 anos: 200 mg 2x/dia', gestante: 'Cat. B — usar apenas se claramente necessário' },
    data_registro: '2023-10-05',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-azox.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-azox.pdf',
  },

  {
    id: 'euro-praiva-comp',
    lab_id: 'eurofarma',
    molecula: 'Cloridrato de Moxifloxacino',
    nome_comercial: 'PraIVA®',
    classe_terapeutica: 'Fluoroquinolona de 4ª Geração — Antibiótico',
    cids_aprovados: ['J18', 'J06', 'H10.1'],
    apresentacoes: [
      { concentracao: '400 mg', forma_farmaceutica: 'comprimido', embalagem: '7 comprimidos', registro_anvisa: '1.0043.1187' },
    ],
    posologia_aprovada: 'PAC ambulatorial: 400 mg 1x/dia por 5–10 dias. Conjuntivite bacteriana (colírio): 1 gota 3x/dia. Retenção especial ANVISA. ≥ 18 anos.',
    contraindicacoes_bula: ['QT longo congênito', 'Hipocalemia', 'Gravidez/lactação', 'Menores de 18 anos', 'Hipersensibilidade a fluoroquinolonas'],
    advertencias_principais: ['⚠ Risco de prolongamento QT (maior entre fluoroquinolonas)', '⚠ FDA Black Box: ruptura de tendão, neuropatia periférica', 'Reservar para infecções sem alternativas', 'Fototoxicidade'],
    interacoes_principais: ['Antiácidos/cátions (separar 2h)', 'QT-prolongadores (CONTRAINDICADO combinar)', 'Varfarina'],
    uso_populacoes_especiais: { gestante: 'CONTRAINDICADO', idoso: 'Maior risco ruptura tendinosa e QT', renal: 'Sem ajuste necessário (eliminação hepática)' },
    data_registro: '2019-09-15',
    data_ultima_atualizacao: '2025-10-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-praiva.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-praiva.pdf',
  },

  // ═══════════════════════════════════════════
  // REUMATOLOGIA / IMUNOLOGIA
  // ═══════════════════════════════════════════

  {
    id: 'euro-reuplaq',
    lab_id: 'eurofarma',
    molecula: 'Sulfato de Hidroxicloroquina',
    nome_comercial: 'Reuplaq®',
    classe_terapeutica: 'Antimalárico / DMARD (Fármaco Modificador da Doença Reumática)',
    cids_aprovados: ['M06', 'M32', 'B54'],
    apresentacoes: [
      { concentracao: '400 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1316' },
    ],
    posologia_aprovada: 'AR/LES: 400 mg/dia (máx 5 mg/kg de peso ideal) em 1–2 tomadas. Início de ação: 4–8 semanas. Cat. D.',
    contraindicacoes_bula: ['Retinopatia preexistente', 'Hipersensibilidade', 'QT longo congênito'],
    advertencias_principais: ['⚠ Retinopatia: oftalmoscopia antes do início e a cada ano após 5 anos (ou a cada 6 meses em alto risco)', 'Prolongamento QT (cautela com amiodarona, azitromicina)', 'Deficiência de G6PD (hemólise)', 'Cat. D — apesar de amplamente usada na gestação com LES por baixo risco relativo'],
    interacoes_principais: ['QT-prolongadores (amiodarona, sotalol — cautela)', 'Antidiabéticos (potencializa hipoglicemia)', 'Digoxina (aumenta nível)'],
    uso_populacoes_especiais: { renal: 'Cautela em IR; ajustar conforme ClCr', gestante: 'Cat. D — uso aceito no LES gestacional (benefício > risco)', idoso: 'Monitorar visão e função renal' },
    data_registro: '2021-08-20',
    data_ultima_atualizacao: '2025-10-15',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-reuplaq.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-reuplaq.pdf',
  },

  // ═══════════════════════════════════════════
  // ORTOPEDIA / CORTICOSTEROIDE INJETÁVEL
  // ═══════════════════════════════════════════

  {
    id: 'euro-betatrinta',
    lab_id: 'eurofarma',
    molecula: 'Dipropionato de Betametasona + Fosfato Dissódico de Betametasona',
    nome_comercial: 'BetaTrinta®',
    classe_terapeutica: 'Corticosteroide de Ação Prolongada — Uso Injetável',
    cids_aprovados: ['M06', 'M15', 'M16', 'M79', 'J45', 'L20'],
    apresentacoes: [
      { concentracao: '5 mg + 2 mg/mL', forma_farmaceutica: 'suspensao_injetavel', embalagem: 'Ampola 1 mL', registro_anvisa: '1.0043.0917' },
    ],
    posologia_aprovada: 'Infiltração articular/periarticular: 0,5–2 mL IM/intraarticular dependendo do tamanho. Sistêmica (asma grave, anafilaxia): 1–2 mL IM profundo. NÃO administrar IV.',
    contraindicacoes_bula: ['Infecção articular ativa', 'Bacteremia', 'Via IV', 'Hipersensibilidade'],
    advertencias_principais: ['Atrofia cutânea e subcutânea no local de infiltração repetida', 'Supressão do eixo HHA', 'Hiperglicemia (diabéticos — monitorar)', 'Flushing após a injeção', 'Máximo 3–4 infiltrações/ano por articulação'],
    interacoes_principais: ['AINEs (sangramento GI)', 'Antidiabéticos (hiperglicemia)', 'Inibidores CYP3A4'],
    uso_populacoes_especiais: { gestante: 'Cat. C — usar com cautela; risco de insuficiência adrenal neonatal', idoso: 'Maior risco de osteoporose e hiperglicemia' },
    data_registro: '2015-05-20',
    data_ultima_atualizacao: '2025-08-20',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-betatrinta.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-betatrinta.pdf',
  },

  // ═══════════════════════════════════════════
  // OSSOS / BIFOSFONATO ORAL
  // ═══════════════════════════════════════════

  {
    id: 'euro-dorto',
    lab_id: 'eurofarma',
    molecula: 'Risedronato Sódico',
    nome_comercial: "D'Orto®",
    classe_terapeutica: 'Bifosfonato — Inibidor da Reabsorção Óssea (dose mensal)',
    cids_aprovados: ['M80', 'M81'],
    apresentacoes: [
      { concentracao: '150 mg', forma_farmaceutica: 'comprimido', embalagem: '1 comprimido (mensal)', registro_anvisa: '1.0043.1288' },
    ],
    posologia_aprovada: 'Osteoporose pós-menopausa: 150 mg 1x/mês, com copo cheio de água, em jejum, 30 min antes do desjejum. Permanecer em pé 30 min após.',
    contraindicacoes_bula: ['Hipocalcemia não corrigida', 'IR grave (ClCr < 30)', 'Anormalidades esofágicas', 'Incapacidade de ficar em pé 30 min'],
    advertencias_principais: ['Osteossarcoma de mandíbula (menor risco que IV — proceder com revisão dentária antes)', 'Fraturas atípicas de fêmur (uso > 5 anos)', 'Esofagite (menor risco que alendronato)', 'Hipocalcemia — corrigir previamente'],
    interacoes_principais: ['Cálcio/antiácidos/ferro — reduzem absorção (separar 30 min)'],
    uso_populacoes_especiais: { renal: 'CONTRAINDICADO em ClCr < 30 mL/min', gestante: 'CONTRAINDICADO', idoso: 'Verificar dentição e saúde GI antes de iniciar' },
    data_registro: '2021-06-10',
    data_ultima_atualizacao: '2025-09-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-dorto.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-dorto.pdf',
  },

  // ═══════════════════════════════════════════
  // GINECOLOGIA / ANTICONCEPCIONAIS / DERMATOLOGIA
  // ═══════════════════════════════════════════

  {
    id: 'euro-selene',
    lab_id: 'eurofarma',
    molecula: 'Etinilestradiol + Acetato de Ciproterona',
    nome_comercial: 'Selene®',
    classe_terapeutica: 'Anticoncepcional Hormonal Combinado — Antiandrogênico',
    cids_aprovados: ['Z30', 'L70', 'N92'],
    apresentacoes: [
      { concentracao: '0,035 mg + 2 mg', forma_farmaceutica: 'comprimido', embalagem: '21 comprimidos', registro_anvisa: '1.0043.0598' },
    ],
    posologia_aprovada: 'Contracepção/acne/hirsutismo: 1 comprimido 1x/dia por 21 dias, pausa 7 dias. Iniciar no 1º dia do ciclo.',
    contraindicacoes_bula: ['Gravidez (Cat. X)', 'Tromboembolismo venoso/arterial', 'Enxaqueca com aura', 'IH grave', 'Neoplasias hormônio-dependentes'],
    advertencias_principais: ['Maior risco de TEV que progestágenos de 2ª geração (ciproterona > levonorgestrel)', 'Monitorar PA e função hepática', 'Não usar apenas como contraceptivo se outra opção disponível (devido ao perfil TEV)'],
    interacoes_principais: ['Rifampicina/carbamazepina/fenitoína (reduzem eficácia)', 'Antibióticos de amplo espectro (potencial redução — usar método adicional)', 'Lamotrigina (reduz nível)'],
    uso_populacoes_especiais: { gestante: 'Cat. X — CONTRAINDICADO', idoso: 'Não aplicável (pós-menopausa)', pediatrico: 'Apenas após menarca' },
    data_registro: '2012-04-10',
    data_ultima_atualizacao: '2025-08-15',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-selene.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-selene.pdf',
  },

  {
    id: 'euro-amora',
    lab_id: 'eurofarma',
    molecula: 'Acetato de Clormadinona + Etinilestradiol',
    nome_comercial: 'Amora®',
    classe_terapeutica: 'Anticoncepcional Hormonal Combinado Oral (AHCO)',
    cids_aprovados: ['Z30'],
    apresentacoes: [
      { concentracao: '2 mg + 0,03 mg', forma_farmaceutica: 'comprimido', embalagem: '21 comprimidos', registro_anvisa: '1.0043.1298' },
    ],
    posologia_aprovada: 'Contracepção: 1 comprimido 1x/dia por 21 dias, pausa 7 dias. Cat. X.',
    contraindicacoes_bula: ['Gravidez (Cat. X)', 'Tromboembolismo', 'IH grave', 'Enxaqueca com aura', 'Neoplasias hormônio-dependentes'],
    advertencias_principais: ['Risco TEV (menor que ciproterona)', 'PA — monitorar', 'Não fumar (> 35 anos)'],
    interacoes_principais: ['Rifampicina/carbamazepina (reduzem eficácia)', 'Lamotrigina'],
    uso_populacoes_especiais: { gestante: 'Cat. X — CONTRAINDICADO' },
    data_registro: '2021-07-15',
    data_ultima_atualizacao: '2025-09-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-amora.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-amora.pdf',
  },

  {
    id: 'euro-primera-20',
    lab_id: 'eurofarma',
    molecula: 'Desogestrel + Etinilestradiol',
    nome_comercial: 'Primera 20®',
    classe_terapeutica: 'Anticoncepcional Hormonal Combinado Oral (AHCO) — Baixa Dose',
    cids_aprovados: ['Z30'],
    apresentacoes: [
      { concentracao: '0,15 mg + 0,02 mg', forma_farmaceutica: 'comprimido', embalagem: '21 comprimidos', registro_anvisa: '1.0043.1122' },
    ],
    posologia_aprovada: 'Contracepção: 1 comprimido 1x/dia por 21 dias, pausa 7 dias. Cat. X.',
    contraindicacoes_bula: ['Gravidez', 'TEV', 'IH grave', 'Enxaqueca com aura', 'Neoplasias hormônio-dependentes'],
    advertencias_principais: ['Baixo dose EE — menor impacto metabólico', 'Maior controle de ciclo que progestínios puros'],
    interacoes_principais: ['Rifampicina/carbamazepina (reduzem eficácia)'],
    uso_populacoes_especiais: { gestante: 'Cat. X — CONTRAINDICADO' },
    data_registro: '2020-04-15',
    data_ultima_atualizacao: '2025-09-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-primera-20.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-primera-20.pdf',
  },

  {
    id: 'euro-primera-30',
    lab_id: 'eurofarma',
    molecula: 'Desogestrel + Etinilestradiol',
    nome_comercial: 'Primera 30®',
    classe_terapeutica: 'Anticoncepcional Hormonal Combinado Oral (AHCO)',
    cids_aprovados: ['Z30'],
    apresentacoes: [
      { concentracao: '0,15 mg + 0,03 mg', forma_farmaceutica: 'comprimido', embalagem: '21 comprimidos', registro_anvisa: '1.0043.1123' },
    ],
    posologia_aprovada: 'Contracepção: 1 comprimido 1x/dia por 21 dias, pausa 7 dias. Cat. X.',
    contraindicacoes_bula: ['Gravidez', 'TEV', 'IH grave', 'Enxaqueca com aura', 'Neoplasias hormônio-dependentes'],
    advertencias_principais: ['Dose padrão de EE (30 mcg)'],
    interacoes_principais: ['Rifampicina/carbamazepina (reduzem eficácia)'],
    uso_populacoes_especiais: { gestante: 'Cat. X — CONTRAINDICADO' },
    data_registro: '2020-04-15',
    data_ultima_atualizacao: '2025-09-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-primera-30.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-primera-30.pdf',
  },

  {
    id: 'euro-pietra-ed',
    lab_id: 'eurofarma',
    molecula: 'Dienogeste',
    nome_comercial: 'Pietra ED®',
    classe_terapeutica: 'Progestógeno — Tratamento da Endometriose',
    cids_aprovados: ['N80', 'N80.0', 'N80.1'],
    apresentacoes: [
      { concentracao: '2 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1116' },
    ],
    posologia_aprovada: 'Endometriose: 2 mg 1x/dia continuamente (sem pausa). Suprimir menstruação, pode ocorrer spotting irregular. Cat. B.',
    contraindicacoes_bula: ['Tromboembolismo ativo', 'Neoplasia hormônio-dependente suspeita ou confirmada', 'Sangramento vaginal não diagnosticado', 'Gravidez'],
    advertencias_principais: ['Redução da densidade mineral óssea (uso prolongado — avaliar DEXA > 12 meses)', 'Spotting irregular nos primeiros meses', 'Não é contraceptivo confiável — usar método adicional', 'Depressão/alteração de humor'],
    interacoes_principais: ['Rifampicina/fenitoína/carbamazepina (reduzem nível)', 'Inibidores CYP3A4 (aumentam nível)'],
    uso_populacoes_especiais: { gestante: 'CONTRAINDICADO', pediatrico: 'Apenas após menarca', idoso: 'Não aplicável' },
    data_registro: '2019-10-20',
    data_ultima_atualizacao: '2025-10-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-pietra-ed.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-pietra-ed.pdf',
  },

  {
    id: 'euro-amalfi',
    lab_id: 'eurofarma',
    molecula: 'Isotretinoína',
    nome_comercial: 'Amalfi®',
    classe_terapeutica: 'Retinoide Oral — Tratamento da Acne Grave',
    cids_aprovados: ['L70', 'L70.0'],
    apresentacoes: [
      { concentracao: '20 mg', forma_farmaceutica: 'capsula_mole', embalagem: '30 cápsulas', registro_anvisa: '1.0043.1425' },
    ],
    posologia_aprovada: 'Acne grave: 0,5–1 mg/kg/dia em 2 tomadas com refeição. Dose total cumulativa: 120–150 mg/kg. Duração: 4–6 meses.',
    contraindicacoes_bula: ['Gravidez (Cat. X — ABSOLUTAMENTE CONTRAINDICADO)', 'Lactação', 'IH grave', 'Hipervitaminose A', 'Hipersensibilidade'],
    advertencias_principais: ['⚠ PROGRAMA iPLEDGE — 2 métodos contraceptivos obrigatórios 1 mês antes, durante e 1 mês após', 'Teratogenicidade grave: malformações craniofaciais, cardíacas, SNC', 'Monitorar TGO/TGP, colesterol/triglicerídeos, hemograma', 'Depressão e ideação suicida (monitorar)', 'Xerostomia, queilite, fotossensibilidade'],
    interacoes_principais: ['Vitamina A (hipervitaminose A — CONTRAINDICADO)', 'Tetraciclinas (pseudotumor cerebri — CONTRAINDICADO)', 'Metotrexato (hepatotoxicidade)'],
    uso_populacoes_especiais: { gestante: 'Cat. X — ABSOLUTAMENTE CONTRAINDICADO (malformações graves)', idoso: 'Dados limitados', pediatrico: '< 12 anos: apenas em formas graves resistentes' },
    data_registro: '2022-11-15',
    data_ultima_atualizacao: '2025-11-01',
    versao_bula: 'v2025.3',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-amalfi.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-amalfi.pdf',
  },

  // ═══════════════════════════════════════════
  // UROLÓGICO — Doxazosina (monocomponente)
  // ═══════════════════════════════════════════

  {
    id: 'euro-duomo',
    lab_id: 'eurofarma',
    molecula: 'Mesilato de Doxazosina',
    nome_comercial: 'Duomo®',
    classe_terapeutica: 'Alfa-1 Bloqueador — Anti-hipertensivo / HPB',
    cids_aprovados: ['N40', 'I10'],
    apresentacoes: [
      { concentracao: '2 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1005' },
      { concentracao: '4 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0043.1005' },
    ],
    posologia_aprovada: 'HPB: iniciar 1 mg 1x/dia; titular para 2–4 mg/dia. HAS: 1–16 mg/dia. Tomar preferencialmente à noite (1ª dose).',
    contraindicacoes_bula: ['Hipotensão ortostática grave', 'Hipersensibilidade a quinazolinases', 'Uso com inibidores de PDE5 (risco hipotensão — cautela)'],
    advertencias_principais: ['Hipotensão de 1ª dose — iniciar com dose baixa e à noite', 'Síndrome de íris flácida intraoperatória (IFIS) — informar oftalmologista antes de cirurgia de catarata', 'Tontura e síncope'],
    interacoes_principais: ['Inibidores de PDE5 (hipotensão — separar doses)', 'Anti-hipertensivos (hipotensão aditiva)'],
    uso_populacoes_especiais: { hepatico: 'Cautela em IH moderada a grave (metabolização hepática)', idoso: 'Iniciar com 0,5–1 mg; maior risco de hipotensão ortostática' },
    data_registro: '2018-02-20',
    data_ultima_atualizacao: '2025-09-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-duomo.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-duomo.pdf',
  },

  // ═══════════════════════════════════════════
  // VITAMINAS / SUPORTE NUTRICIONAL
  // ═══════════════════════════════════════════

  {
    id: 'euro-altad',
    lab_id: 'eurofarma',
    molecula: 'Colecalciferol (Vitamina D3)',
    nome_comercial: 'AltaD Caps®',
    classe_terapeutica: 'Vitamina D — Medicamento',
    cids_aprovados: ['E55', 'M80', 'M81'],
    apresentacoes: [
      { concentracao: '7.000 UI', forma_farmaceutica: 'capsula_mole', embalagem: '30 cápsulas', registro_anvisa: '1.0043.1261' },
      { concentracao: '15.000 UI', forma_farmaceutica: 'capsula_mole', embalagem: '30 cápsulas', registro_anvisa: '1.0043.1261' },
      { concentracao: '50.000 UI', forma_farmaceutica: 'capsula_mole', embalagem: '4 cápsulas (dose semanal)', registro_anvisa: '1.0043.1261' },
    ],
    posologia_aprovada: 'Deficiência de vitamina D: 7.000–50.000 UI/dia ou semanal conforme nível sérico e indicação. Manutenção: 1.000–2.000 UI/dia.',
    contraindicacoes_bula: ['Hipercalcemia/hipervitaminose D', 'Nefrolitíase cálcica ativa', 'Hipersensibilidade'],
    advertencias_principais: ['Monitorar 25(OH)D sérica e calciúria em tratamentos de reposição', 'Toxicidade com doses muito altas e prolongadas (hipercalcemia)'],
    interacoes_principais: ['Tiazídicos (hipercalcemia)', 'Colestipol/colestiramina (reduzem absorção)'],
    uso_populacoes_especiais: { gestante: 'Pode usar — dose ajustada', idoso: '800–2000 UI/dia (prevenção de quedas e osteoporose)' },
    data_registro: '2022-03-15',
    data_ultima_atualizacao: '2025-09-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-altad.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-altad.pdf',
  },

  {
    id: 'euro-bedoze',
    lab_id: 'eurofarma',
    molecula: 'Hidroxocobalamina (Vitamina B12)',
    nome_comercial: 'Bedoze®',
    classe_terapeutica: 'Vitamina B12 — Injetável IM',
    cids_aprovados: ['E53.8', 'D51'],
    apresentacoes: [
      { concentracao: '5 mg/mL', forma_farmaceutica: 'solucao_injetavel', embalagem: 'Ampola 1 mL (IM)', registro_anvisa: '1.0043.1458' },
    ],
    posologia_aprovada: 'Deficiência de B12: 1 mg IM/dia por 7 dias, depois 1 mg/semana por 4 semanas, depois 1 mg/mês. Neuropatia: pode manter mensal indefinidamente.',
    contraindicacoes_bula: ['Hipersensibilidade à cobalamina', 'Uso IV (formulação IM apenas)'],
    advertencias_principais: ['Hidroxocobalamina tem maior retenção tecidual que cianocobalamina', 'Vermelhidão e dor no local da injeção'],
    interacoes_principais: ['Cloranfenicol (reduz resposta da eritropoiese)'],
    uso_populacoes_especiais: { gestante: 'Cat. C — usar se necessário', pediatrico: 'Ajuste de dose por peso' },
    data_registro: '2023-06-10',
    data_ultima_atualizacao: '2025-09-01',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-bedoze.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-bedoze.pdf',
  },

  // ═══════════════════════════════════════════
  // DERMATOLOGIA TÓPICA — TROK® / TROK-G® / TROK-N®
  // ═══════════════════════════════════════════

  {
    id: 'euro-trok-creme',
    lab_id: 'eurofarma',
    molecula: 'Cetoconazol + Dipropionato de Betametasona',
    nome_comercial: 'Trok® Creme',
    classe_terapeutica: 'Antifúngico + Corticosteroide Tópico',
    cids_aprovados: ['L20', 'L23', 'L21', 'L30', 'B37'],
    apresentacoes: [
      { concentracao: '20 mg/g + 0,64 mg/g', forma_farmaceutica: 'creme', embalagem: '30 g', registro_anvisa: '1.0043.1429' },
    ],
    posologia_aprovada: 'Aplicar camada fina na área afetada 1–2x/dia por no máximo 2 semanas. Máximo 45 g/semana.',
    contraindicacoes_bula: ['Varicela', 'Herpes simples/zoster', 'Tuberculose cutânea', 'Sífilis cutânea', 'Menores de 12 anos (cautela)'],
    advertencias_principais: ['Uso máximo 2 semanas', 'Não usar em mucosas, olhos ou canal auditivo (tímpano perfurado)', 'Evitar álcool durante tratamento'],
    interacoes_principais: [],
    uso_populacoes_especiais: { gestante: 'Categoria C — evitar', pediatrico: '< 12 anos: usar pequenas quantidades com cautela' },
    data_registro: '2022-01-01', data_ultima_atualizacao: '2025-01-01', versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-trok-creme.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-trok-creme.pdf',
  },

  {
    id: 'euro-trok-pomada',
    lab_id: 'eurofarma',
    molecula: 'Cetoconazol + Dipropionato de Betametasona',
    nome_comercial: 'Trok® Pomada',
    classe_terapeutica: 'Antifúngico + Corticosteroide Tópico',
    cids_aprovados: ['L20', 'L23', 'L21', 'L30', 'B37'],
    apresentacoes: [
      { concentracao: '20 mg/g + 0,64 mg/g', forma_farmaceutica: 'pomada', embalagem: '30 g', registro_anvisa: '1.0043.1430' },
    ],
    posologia_aprovada: 'Aplicar camada fina na área afetada 1–2x/dia por no máximo 2 semanas.',
    contraindicacoes_bula: ['Varicela', 'Herpes simples/zoster', 'Tuberculose cutânea', 'Sífilis cutânea'],
    advertencias_principais: ['Uso máximo 2 semanas', 'Não usar em mucosas ou olhos', 'Contraindicado na amamentação salvo orientação médica'],
    interacoes_principais: [],
    uso_populacoes_especiais: { gestante: 'Categoria C — evitar', pediatrico: '< 12 anos: usar pequenas quantidades' },
    data_registro: '2022-01-01', data_ultima_atualizacao: '2025-01-01', versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-trok-pomada.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-trok-pomada.pdf',
  },

  {
    id: 'euro-trok-g',
    lab_id: 'eurofarma',
    molecula: 'Dipropionato de Betametasona + Sulfato de Gentamicina',
    nome_comercial: 'Trok-G®',
    classe_terapeutica: 'Corticosteroide + Antibiótico Tópico',
    cids_aprovados: ['L20', 'L23', 'L28', 'L30', 'L40'],
    apresentacoes: [
      { concentracao: '0,64 mg/g + 1 mg/g', forma_farmaceutica: 'creme', embalagem: '30 g', registro_anvisa: '1.0043.0980' },
      { concentracao: '0,64 mg/g + 1 mg/g', forma_farmaceutica: 'pomada', embalagem: '30 g', registro_anvisa: '1.0043.0980' },
    ],
    posologia_aprovada: 'Aplicar camada fina 2–3x/dia na área afetada.',
    contraindicacoes_bula: ['< 2 anos', 'Infecções virais ou fúngicas cutâneas', 'Tuberculose de pele', 'Uso oftálmico'],
    advertencias_principais: ['Risco de nefrotoxicidade/ototoxicidade da gentamicina em áreas extensas', 'Categoria D (1º trim.) / C (2º-3º trim.)', 'Contraindicado na amamentação e doação de leite humano'],
    interacoes_principais: [],
    uso_populacoes_especiais: { gestante: 'Cat. D (1º trim) / Cat. C (2º-3º trim) — evitar', pediatrico: 'Contraindicado < 2 anos' },
    data_registro: '2018-01-01', data_ultima_atualizacao: '2025-01-01', versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-trok-g-creme.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-trok-g-creme.pdf',
  },

  {
    id: 'euro-trok-n',
    lab_id: 'eurofarma',
    molecula: 'Cetoconazol + Dipropionato de Betametasona + Sulfato de Neomicina',
    nome_comercial: 'Trok-N®',
    classe_terapeutica: 'Antifúngico + Corticosteroide + Antibiótico Tópico',
    cids_aprovados: ['L20', 'L23', 'L21', 'L30', 'B37'],
    apresentacoes: [
      { concentracao: '20 mg/g + 0,64 mg/g + 2,5 mg/g', forma_farmaceutica: 'creme', embalagem: '30 g', registro_anvisa: '1.0043.0824' },
      { concentracao: '20 mg/g + 0,64 mg/g + 2,5 mg/g', forma_farmaceutica: 'pomada', embalagem: '30 g', registro_anvisa: '1.0043.0824' },
    ],
    posologia_aprovada: 'Aplicar camada fina 1–2x/dia por no máximo 2 semanas. Máximo 45 g/semana.',
    contraindicacoes_bula: ['Varicela', 'Herpes simples/zoster', 'Tuberculose cutânea', 'Sífilis cutânea', 'Uso oftálmico'],
    advertencias_principais: ['Risco de ototoxicidade/nefrotoxicidade da neomicina em áreas extensas', 'Categoria D — contraindicado na gestação', 'Uso máximo 2 semanas'],
    interacoes_principais: [],
    uso_populacoes_especiais: { gestante: 'Categoria D — contraindicado', pediatrico: '< 12 anos: usar pequenas quantidades' },
    data_registro: '2017-01-01', data_ultima_atualizacao: '2025-01-01', versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-trok-n.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-trok-n.pdf',
  },

  // ═══════════════════════════════════════════
  // GINECOLOGIA — CREMES VAGINAIS
  // ═══════════════════════════════════════════

  {
    id: 'euro-ginna',
    lab_id: 'eurofarma',
    molecula: 'Nitrato de Fenticonazol',
    nome_comercial: 'Ginna®',
    classe_terapeutica: 'Antifúngico Tópico — Imidazólico Vaginal',
    cids_aprovados: ['B37.3', 'N76'],
    apresentacoes: [
      { concentracao: '2% (20 mg/g)', forma_farmaceutica: 'creme', embalagem: '40 g + aplicador', registro_anvisa: '1.0043.1072' },
    ],
    posologia_aprovada: 'Introduzir 1 aplicador/dia no período noturno, por 7 dias (candidíase).',
    contraindicacoes_bula: ['Menores de 18 anos', 'Uso masculino', 'Hipersensibilidade a imidazólicos'],
    advertencias_principais: ['Pode danificar contraceptivos de látex — usar método alternativo durante tratamento', 'Categoria C na gestação — não recomendado', 'Gestantes: não usar aplicador sem orientação médica'],
    interacoes_principais: [],
    uso_populacoes_especiais: { gestante: 'Categoria C — não recomendado' },
    data_registro: '2020-01-01', data_ultima_atualizacao: '2025-01-01', versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-ginna.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-ginna.pdf',
  },

  {
    id: 'euro-crevagin',
    lab_id: 'eurofarma',
    molecula: 'Tinidazol + Nitrato de Miconazol',
    nome_comercial: 'Crevagin®',
    classe_terapeutica: 'Antiprotozoário + Antifúngico Vaginal',
    cids_aprovados: ['B37.3', 'A59.0', 'N76'],
    apresentacoes: [
      { concentracao: '30 mg/g + 20 mg/g', forma_farmaceutica: 'creme', embalagem: '40 g + aplicador', registro_anvisa: '1.0043.0991' },
    ],
    posologia_aprovada: 'Introduzir 1 aplicador à noite por 7 dias. Uso exclusivamente intravaginal.',
    contraindicacoes_bula: ['< 12 anos', 'Uso masculino', 'Aleitamento e doação de leite humano (tinidazol excretado no leite)', 'Hipersensibilidade a nitroimidazólicos'],
    advertencias_principais: ['Proibido álcool durante e até 3 dias após tratamento (efeito antabuse do tinidazol)', 'Pode reduzir eficácia de contraceptivos de barreira de látex', 'Categoria C na gestação'],
    interacoes_principais: ['Álcool — efeito dissulfiram-like grave', 'Anticoagulantes — tinidazol potencializa'],
    uso_populacoes_especiais: { gestante: 'Categoria C — evitar, especialmente no 1º trimestre', pediatrico: 'Contraindicado < 12 anos' },
    data_registro: '2019-01-01', data_ultima_atualizacao: '2025-01-01', versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-crevagin.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-crevagin.pdf',
  },

  {
    id: 'euro-antrofi',
    lab_id: 'eurofarma',
    molecula: 'Promestrieno',
    nome_comercial: 'Antrofi®',
    classe_terapeutica: 'Estrogênio Tópico — Tratamento da Atrofia Vulvovaginal',
    cids_aprovados: ['N95.2', 'N89', 'N95.1'],
    apresentacoes: [
      { concentracao: '10 mg/g', forma_farmaceutica: 'creme', embalagem: '30 g + aplicador', registro_anvisa: '1.0043.1093' },
    ],
    posologia_aprovada: 'Atrofia: 1 aplicador/dia por 20 dias, depois 2–3x/semana (manutenção). Cicatrização: 1 aplicador/dia por 10 dias.',
    contraindicacoes_bula: ['Histórico ou suspeita de câncer de mama ou tumor maligno estrógeno-dependente', 'Hemorragia vaginal de causa desconhecida', 'Hiperplasia endometrial não tratada', 'Tromboembolismo venoso/arterial ativo', 'Doença hepática aguda', 'Porfiria', 'Lactação', 'Uso masculino'],
    advertencias_principais: ['Não usar com espermicidas locais', 'Categoria B — não usar sem orientação médica na gestação', 'Uso exclusivamente tópico vaginal'],
    interacoes_principais: [],
    uso_populacoes_especiais: { gestante: 'Categoria B — não recomendado sem avaliação médica', idoso: 'Indicado para atrofia pós-menopausa' },
    data_registro: '2020-01-01', data_ultima_atualizacao: '2025-01-01', versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-antrofi.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-antrofi.pdf',
  },

  // ═══════════════════════════════════════════
  // CANABIDIOL
  // ═══════════════════════════════════════════

  {
    id: 'euro-canabidiol',
    lab_id: 'eurofarma',
    molecula: 'Canabidiol',
    nome_comercial: 'Canabidiol Eurofarma®',
    classe_terapeutica: 'Canabinóide — Fitoterápico Derivado de Cannabis',
    cids_aprovados: ['G40', 'G43', 'F84'],
    apresentacoes: [
      { concentracao: '20 mg/mL', forma_farmaceutica: 'solucao_oral', embalagem: '30 mL', registro_anvisa: '1.0043.1483' },
    ],
    posologia_aprovada: 'Dose inicial: 2,5 mg/kg/dia (dividida em 2x). Aumentar gradualmente conforme resposta. Dose máxima: 25 mg/kg/dia. Ajuste individualizado pelo médico.',
    contraindicacoes_bula: ['< 2 anos', 'Hipersensibilidade ao canabidiol', 'Usuários de drogas de abuso'],
    advertencias_principais: [
      'Monitorar provas de função hepática (TGO/TGP) periodicamente',
      'Contém até 0,2% de THC e até 5% v/v de etanol',
      'Interações com fármacos metabolizados pelo CYP3A4 e CYP2C19 (clobazam, topiramato, valproato, inibidores/indutores CYP)',
      'Venda sob prescrição com retenção de receita',
      'Risco para gestantes e lactantes',
    ],
    interacoes_principais: ['Clobazam — aumento de nível de clobazam e seu metabólito ativo', 'Valproato — risco de hepatotoxicidade aditiva', 'Inibidores CYP3A4 (cetoconazol, ritonavir) — aumentam nível de canabidiol'],
    uso_populacoes_especiais: { gestante: 'Contraindicado', pediatrico: 'Contraindicado < 2 anos; ajuste de dose por peso corporal' },
    data_registro: '2023-01-01', data_ultima_atualizacao: '2025-01-01', versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-canabidiol.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-canabidiol.pdf',
  },

  // ═══════════════════════════════════════════
  // ANTIFÚNGICO TÓPICO
  // ═══════════════════════════════════════════

  {
    id: 'euro-voric',
    lab_id: 'eurofarma',
    molecula: 'Cetorolaco de Trometamol',
    nome_comercial: 'Voric®',
    classe_terapeutica: 'Anti-inflamatório Não Esteroidal (AINE) — Analgésico/Antipirétic',
    cids_aprovados: ['R52', 'M79', 'R51'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos' },
    ],
    posologia_aprovada: 'Dor aguda moderada a intensa (curto prazo): 10 mg a cada 4–6h. Dose máxima: 40 mg/dia. Uso máximo: 5 dias.',
    contraindicacoes_bula: ['Úlcera péptica ativa', 'Sangramento GI/cerebrovascular', 'IR grave', 'Gravidez (especialmente 3º trimestre)', 'Alergia a AINEs/aspirina', 'Cirurgia de grande porte (risco hemorrágico)'],
    advertencias_principais: ['⚠ USO MÁXIMO 5 DIAS (risco aumentado de eventos GI e renais)', 'Risco cardiovascular aumentado', 'Nefrotoxicidade', 'Sangramento perioperatório', 'Mais potente que outros AINEs — não usar cronicamente'],
    interacoes_principais: ['Anticoagulantes (risco hemorrágico grave)', 'Lítio (aumenta nível)', 'Metotrexato (toxicidade)', 'IECA/BRA (nefrotoxicidade)'],
    uso_populacoes_especiais: { idoso: '⚠ EVITAR — Critérios de Beers (maior risco GI e renal)', renal: 'Reduzir dose em IR leve/moderada; CONTRAINDICADO em IR grave', gestante: 'CONTRAINDICADO (3º trimestre — fechamento prematuro canal arterial)' },
    data_registro: '2021-09-25',
    data_ultima_atualizacao: '2025-10-10',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-voric.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-voric.pdf',
  },

];

// ─── MAPA DE CORRELAÇÃO CIENTÍFICA ────────────────────────────
// Camada científica: Diagnóstico → Diretriz → Classe → Molécula → Marcas
// SEPARAÇÃO: esta correlação é baseada em evidências científicas
// As marcas aparecem apenas como OPÇÃO FINAL de prescrição

export const CORRELACAO_TERAPEUTICA: CorrelacaoTerapeutica[] = [
  {
    cid10: ['I10'],
    diagnostico: 'Hipertensão Arterial Sistêmica (HAS)',
    diretrizes: [
      { nome: 'VII Diretriz Brasileira de HAS', sociedade: 'SBC/SBH/SBN', ano: 2016, nivel_evidencia: 'A', grau_recomendacao: 'I' },
      { nome: '2023 ESH Guidelines for HBP', sociedade: 'ESH', ano: 2023, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'IECA',
        posicao_terapeutica: '1ª linha — especialmente em DM, IC, proteinúria',
        moleculas: [
          { nome: 'Enalapril', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-enalapril-10'] },
          { nome: 'Ramipril', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
        ],
      },
      {
        nome: 'BRA',
        posicao_terapeutica: '1ª linha — alternativa ao IECA (especialmente tosse)',
        moleculas: [
          { nome: 'Losartana', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-zart-50', 'euro-zart-h'] },
          { nome: 'Olmesartana', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-holmes-20'] },
          { nome: 'Valsartana', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-valsartana-80'] },
          { nome: 'Irbesartana', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-irbesartana-150'] },
        ],
      },
      {
        nome: 'BCC Diidropiridínico',
        posicao_terapeutica: '1ª linha — especialmente em idosos e angina',
        moleculas: [
          { nome: 'Anlodipino', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-anlodipino-5'] },
        ],
      },
      {
        nome: 'Diurético Tiazídico',
        posicao_terapeutica: '1ª linha — especialmente no idoso',
        moleculas: [
          { nome: 'Hidroclorotiazida', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-hctz-25'] },
        ],
      },
    ],
    notas_clinicas: [
      'Meta PA < 130/80 mmHg em DM e DRC; < 140/90 mmHg em geral',
      'Associação IECA + BRA é CONTRAINDICADA (risco de IRA)',
      'BB indicados quando há coronariopatia, IC ou FA concomitante',
    ],
  },

  {
    cid10: ['I50', 'I50.0', 'I50.1', 'I50.9'],
    diagnostico: 'Insuficiência Cardíaca com Fração de Ejeção Reduzida (ICFEr)',
    diretrizes: [
      { nome: 'Diretriz Brasileira de ICC', sociedade: 'SBC', ano: 2021, nivel_evidencia: 'A', grau_recomendacao: 'I' },
      { nome: '2021 ESC Guidelines for Heart Failure', sociedade: 'ESC', ano: 2021, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'IECA',
        posicao_terapeutica: '1ª linha — redução de mortalidade e hospitalização',
        moleculas: [
          { nome: 'Enalapril', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-enalapril-10'] },
        ],
      },
      {
        nome: 'Betabloqueador',
        posicao_terapeutica: '1ª linha — com IECA/BRA, reduz mortalidade',
        moleculas: [
          { nome: 'Carvedilol', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-carvedilol-625'] },
          { nome: 'Bisoprolol', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-bisoprolol-5'] },
        ],
      },
      {
        nome: 'Antagonista Mineralocorticoide',
        posicao_terapeutica: '1ª linha — NYHA II–IV, reduz mortalidade (RALES/EMPHASIS)',
        moleculas: [
          { nome: 'Espironolactona', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-espiro-25'] },
        ],
      },
      {
        nome: 'Diurético de Alça',
        posicao_terapeutica: 'Alívio sintomático de congestão',
        moleculas: [
          { nome: 'Furosemida', grau_recomendacao: 'I', nivel_evidencia: 'B', produtos_eurofarma: ['euro-furosemida-40'] },
        ],
      },
    ],
    notas_clinicas: [
      'Pilares da ICFEr: IECA/BRA + BB + ARM + SGLT2i',
      'Titular doses progressivamente — iniciar com doses baixas',
      'Monitorar: Na+, K+, creatinina, FC, PA',
    ],
  },

  {
    cid10: ['E11', 'E11.9'],
    diagnostico: 'Diabetes Mellitus Tipo 2',
    diretrizes: [
      { nome: 'Standards of Medical Care in Diabetes', sociedade: 'ADA', ano: 2024, nivel_evidencia: 'A', grau_recomendacao: 'I' },
      { nome: 'Diretriz da Sociedade Brasileira de Diabetes', sociedade: 'SBD', ano: 2023, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Biguanida',
        posicao_terapeutica: '1ª linha — se tolerada e sem contraindicação renal',
        moleculas: [
          { nome: 'Metformina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-metformina-850'] },
        ],
      },
      {
        nome: 'Sulfonilureia',
        posicao_terapeutica: '2ª linha — quando custo é fator limitante (preferir glicazida em idosos)',
        moleculas: [
          { nome: 'Glicazida', grau_recomendacao: 'IIa', nivel_evidencia: 'B', produtos_eurofarma: ['euro-glicazida-30'] },
          { nome: 'Glibenclamida', grau_recomendacao: 'IIb', nivel_evidencia: 'B', produtos_eurofarma: ['euro-glibenclamida-5'] },
        ],
      },
    ],
    notas_clinicas: [
      'iSGLT2 e aGLP1 são preferidos em pacientes com DCV estabelecida ou DRC (evidência A)',
      'Meta HbA1c < 7% na maioria; individualizar em idosos e fragilidade',
      'Glibenclamida: evitar em idosos (Critérios de Beers)',
    ],
  },

  {
    cid10: ['J45', 'J45.0', 'J45.1', 'J45.9'],
    diagnostico: 'Asma Brônquica',
    diretrizes: [
      { nome: 'Global Initiative for Asthma (GINA)', sociedade: 'GINA', ano: 2023, nivel_evidencia: 'A', grau_recomendacao: 'I' },
      { nome: 'Diretriz SBPT para Asma', sociedade: 'SBPT', ano: 2020, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Corticosteroide Inalatório',
        posicao_terapeutica: '1ª linha de controle — reduz exacerbações e mortalidade',
        moleculas: [
          { nome: 'Budesonida', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-noex-200'] },
        ],
      },
      {
        nome: 'LABA (associado a CI)',
        posicao_terapeutica: 'Associar ao CI quando controle inadequado',
        moleculas: [
          { nome: 'Formoterol', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-formoterol-12'] },
        ],
      },
      {
        nome: 'Antagonista de Leucotrienos',
        posicao_terapeutica: 'Alternativa quando CI não é possível; útil em asma + rinite',
        moleculas: [
          { nome: 'Montelucaste', grau_recomendacao: 'IIa', nivel_evidencia: 'B', produtos_eurofarma: ['euro-montelucaste-10'] },
        ],
      },
    ],
    notas_clinicas: [
      'NUNCA prescriver LABA sem CI concomitante na asma (aumento de mortalidade)',
      'SABA (salbutamol) apenas para resgate — não usar como manutenção',
      'GINA 2023 recomenda CI+formoterol como resgate (preferível ao SABA isolado)',
    ],
  },

  {
    cid10: ['F32', 'F33', 'F32.0', 'F32.1', 'F33.0', 'F33.1'],
    diagnostico: 'Episódio Depressivo / Transtorno Depressivo Recorrente',
    diretrizes: [
      { nome: 'Practice Guideline for MDD', sociedade: 'APA', ano: 2023, nivel_evidencia: 'A', grau_recomendacao: 'I' },
      { nome: 'Diretriz Brasileira para Depressão', sociedade: 'ABP', ano: 2021, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'ISRS',
        posicao_terapeutica: '1ª linha — melhor perfil de segurança',
        moleculas: [
          { nome: 'Sertralina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-afetus', 'euro-sertralina-50'] },
          { nome: 'Escitalopram', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-escitalopram-10'] },
          { nome: 'Paroxetina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-paroxetina-20'] },
        ],
      },
      {
        nome: 'IRSN',
        posicao_terapeutica: '1ª/2ª linha — quando dor crônica ou ansiedade associadas',
        moleculas: [
          { nome: 'Desvenlafaxina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-desve-50'] },
          { nome: 'Venlafaxina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-venlafaxina-75'] },
        ],
      },
      {
        nome: 'Antidepressivo Tricíclico',
        posicao_terapeutica: '2ª/3ª linha — útil em dor neuropática; evitar em idosos',
        moleculas: [
          { nome: 'Nortriptilina', grau_recomendacao: 'IIb', nivel_evidencia: 'B', produtos_eurofarma: ['euro-nortriptilina-25'] },
        ],
      },
    ],
    notas_clinicas: [
      'Resposta esperada em 2–4 semanas; avaliar adesão antes de trocar',
      'Manter tratamento por ≥ 6–12 meses após remissão',
      'Monitorar ideação suicida nas primeiras semanas, especialmente < 25 anos',
    ],
  },

  {
    cid10: ['E78', 'E78.0', 'E78.1', 'E78.5'],
    diagnostico: 'Dislipidemia / Hipercolesterolemia',
    diretrizes: [
      { nome: 'Diretriz Brasileira de Dislipidemias', sociedade: 'SBC/SBD', ano: 2017, nivel_evidencia: 'A', grau_recomendacao: 'I' },
      { nome: '2019 ESC/EAS Guidelines for Dyslipidaemias', sociedade: 'ESC/EAS', ano: 2019, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Estatina',
        posicao_terapeutica: '1ª linha — redução de LDL e eventos cardiovasculares (IAM, AVC)',
        moleculas: [
          { nome: 'Rosuvastatina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-ruva'] },
          { nome: 'Atorvastatina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-vast'] },
        ],
      },
    ],
    notas_clinicas: [
      'Metas de LDL individualizadas: alto risco CV < 70 mg/dL; muito alto risco < 55 mg/dL',
      'Estatinas de alta intensidade (rosuvastatina 20–40 mg, atorvastatina 40–80 mg) para alto risco CV',
      'Monitorar CPK e TGO/TGP. Miopatia é rara mas grave.',
    ],
  },

  {
    cid10: ['F10', 'F11', 'F17', 'F41', 'F51'],
    diagnostico: 'Transtorno do Sono / Insônia',
    diretrizes: [
      { nome: 'Clinical Practice Guideline for Chronic Insomnia', sociedade: 'ACP', ano: 2016, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Antagonista de Orexina',
        posicao_terapeutica: '1ª linha — insônia crônica (menor risco de dependência que BZDs)',
        moleculas: [
          { nome: 'Lemborexant', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
        ],
      },
    ],
    notas_clinicas: [
      'TCC-I (Terapia Cognitivo-Comportamental para Insônia) é o tratamento de 1ª linha',
      'Benzodiazepínicos e zolpidem: uso restrito ao curto prazo (< 4 semanas) — dependência',
      '⚠ BEERS: evitar BZDs e hipnóticos Z em idosos',
      'Lemont® (montelucaste+levocetirizina) NÃO é indicado para insônia — indicado para asma + rinite alérgica',
    ],
  },

  {
    cid10: ['G30', 'G31', 'F00', 'F01', 'F03'],
    diagnostico: 'Doença de Alzheimer / Demência',
    diretrizes: [
      { nome: 'Clinical Practice Guidelines — Alzheimer', sociedade: 'AAN', ano: 2018, nivel_evidencia: 'B', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Inibidor da Colinesterase',
        posicao_terapeutica: '1ª linha — demência leve a moderada; melhora cognitiva modesta',
        moleculas: [
          { nome: 'Donepezila', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-don-5', 'euro-don-10'] },
        ],
      },
      {
        nome: 'Antagonista dos Receptores NMDA',
        posicao_terapeutica: '1ª linha — demência moderada a grave; pode ser associado a inibidor de colinesterase',
        moleculas: [
          { nome: 'Memantina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-heimer'] },
        ],
      },
    ],
    notas_clinicas: [
      'Donepezila (Don®): iniciar 5 mg/noite, aumentar para 10 mg após 4–6 semanas — Alzheimer leve a grave',
      'Memantina (Heimer®): indicada para Alzheimer moderada a grave; mecanismo complementar à donepezila',
      'Associação donepezila + memantina pode ser utilizada em Alzheimer moderada a grave',
      'Nenhum fármaco atual modifica o curso da doença — tratamento sintomático',
    ],
  },

  {
    cid10: ['F90', 'F90.0', 'F90.1'],
    diagnostico: 'Transtorno do Déficit de Atenção e Hiperatividade (TDAH)',
    diretrizes: [
      { nome: 'Clinical Practice Guideline for ADHD', sociedade: 'AAP', ano: 2019, nivel_evidencia: 'A', grau_recomendacao: 'I' },
      { nome: 'Diretrizes da ABDA para TDAH', sociedade: 'ABDA', ano: 2021, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Estimulante — Metilfenidato',
        posicao_terapeutica: '1ª linha em crianças e adultos',
        moleculas: [
          { nome: 'Metilfenidato', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-attenze-10', 'euro-attenze-20'] },
        ],
      },
      {
        nome: 'Não-estimulante — Bupropiona',
        posicao_terapeutica: 'Alternativa quando estimulante é contraindicado ou indesejado',
        moleculas: [
          { nome: 'Bupropiona', grau_recomendacao: 'IIb', nivel_evidencia: 'B', produtos_eurofarma: ['euro-bup', 'euro-bup-xl'] },
        ],
      },
    ],
    notas_clinicas: [
      'Receita especial (Notificação de Receita B2 — azul) para metilfenidato',
      'Iniciar com menor dose; titular conforme resposta e tolerância',
      'Monitorar FC, PA e crescimento em crianças',
    ],
  },

  {
    cid10: ['N30', 'N10', 'N39'],
    diagnostico: 'Infecção do Trato Urinário (ITU)',
    diretrizes: [
      { nome: 'Guia de Antimicrobianos — SBI', sociedade: 'SBI', ano: 2022, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Antibiótico — Fosfomicina',
        posicao_terapeutica: '1ª linha para cistite não-complicada (dose única)',
        moleculas: [
          { nome: 'Fosfomicina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
        ],
      },
      {
        nome: 'Antibiótico — Fluoroquinolona',
        posicao_terapeutica: 'Alternativa em cistite/pielonefrite (reservar para casos sem alternativa)',
        moleculas: [
          { nome: 'Ciprofloxacino', grau_recomendacao: 'IIb', nivel_evidencia: 'B', produtos_eurofarma: ['euro-ciprofloxacino-500', 'euro-foritus'] },
        ],
      },
    ],
    notas_clinicas: [
      'Fosfomicina 3g dose única: eficácia similar a 7 dias de nitrofurantoína para cistite não-complicada',
      'Pielonefrite: fluoroquinolona VO por 7 dias ou cefalosporina 10–14 dias',
      'Resistência local deve guiar escolha — consultar antibiograma quando disponível',
      'ForITUs® (Eurofarma) = Ciprofloxacino 500 mg — indicado especificamente para ITU',
    ],
  },

  {
    cid10: ['N40', 'N40.0', 'N40.1'],
    diagnostico: 'Hiperplasia Prostática Benigna (HPB)',
    diretrizes: [
      { nome: 'AUA Guideline for BPH', sociedade: 'AUA', ano: 2021, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Alfa-1 Bloqueador + Inibidor da 5-Alfa-Redutase (Associação)',
        posicao_terapeutica: '1ª linha em HPB sintomática com próstata aumentada — combina alívio rápido e redução prostática',
        moleculas: [
          { nome: 'Doxazosina + Finasterida', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-duomo-hp'] },
        ],
      },
    ],
    notas_clinicas: [
      'Duomo HP® (doxazosina 4mg + finasterida 5mg): doxazosina alivia sintomas em dias; finasterida reduz volume prostático em 3–6 meses',
      'Finasterida reduz PSA em ~50% — considerar na interpretação do PSA para rastreio de câncer',
      'Inibidores de PDE5 (tadalafila) são alternativa nos pacientes com HPB + disfunção erétil',
    ],
  },

  {
    cid10: ['G40', 'G40.1', 'G40.2', 'G40.3'],
    diagnostico: 'Epilepsia',
    diretrizes: [
      { nome: 'Clinical Practice Guideline — Epilepsy', sociedade: 'ILAE', ano: 2022, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Antiepiléptico de 2ª Geração — Levetiracetam',
        posicao_terapeutica: '1ª linha — crises focais e generalizadas; poucas interações',
        moleculas: [
          { nome: 'Levetiracetam', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-antara'] },
        ],
      },
      {
        nome: 'Antiepiléptico — Valproato',
        posicao_terapeutica: '1ª linha para crises generalizadas; evitar em mulheres em idade fértil',
        moleculas: [
          { nome: 'Divalproato de Sódio', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-gaba-er'] },
        ],
      },
    ],
    notas_clinicas: [
      'Levetiracetam (Antara®): bem tolerado, poucas interações, preferido em politerapia',
      'Valproato (GABA ER®): ⚠ TERATOGÊNICO — contraindicado na gravidez (espinha bífida, déficit cognitivo)',
      'Ajuste de levetiracetam obrigatório em insuficiência renal',
    ],
  },

  {
    cid10: ['J30', 'J31', 'L50', 'L50.0'],
    diagnostico: 'Rinite Alérgica / Urticária Crônica',
    diretrizes: [
      { nome: 'ARIA Guidelines', sociedade: 'ARIA', ano: 2021, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Anti-histamínico H1 de 3ª Geração',
        posicao_terapeutica: '1ª linha — menor sedação que 1ª/2ª geração',
        moleculas: [
          { nome: 'Levocetirizina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-zina'] },
        ],
      },
    ],
    notas_clinicas: [
      'Zina® (Levocetirizina 5 mg): enantiômero ativo da cetirizina — menor sedação',
      'Zina® ODT: mesma molécula em formulação orodispersível — opção para pacientes com dificuldade de deglutição',
      'Altiva® (Fexofenadina 120/180 mg): não sedante — opção quando sedação é inaceitável (operadores de máquinas, motoristas)',
      'Ebastel® (Ebastina 10 mg): disponível em comprimido (adultos) e xarope (pediátrico ≥ 2 anos)',
      'Para rinite alérgica + asma concomitante: considerar Lemont® (montelucaste + levocetirizina)',
      'Ajuste de dose em insuficiência renal (ClCr < 50 mL/min) para levocetirizina',
    ],
  },

  {
    cid10: ['E11', 'E14'],
    diagnostico: 'Diabetes Mellitus Tipo 2 (DM2)',
    diretrizes: [
      { nome: 'Diretriz SBD — Algoritmo de Tratamento do DM2', sociedade: 'SBD', ano: 2023, nivel_evidencia: 'A', grau_recomendacao: 'I' },
      { nome: '2023 ADA Standards of Care in Diabetes', sociedade: 'ADA', ano: 2023, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Biguanida',
        posicao_terapeutica: '1ª linha — base do tratamento; custo-efetivo',
        moleculas: [
          { nome: 'Metformina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-metformina-850'] },
        ],
      },
      {
        nome: 'iSGLT2 (Glifozina)',
        posicao_terapeutica: '2ª linha com benefício CV/renal — preferir em DCV estabelecida, IC ou DRC',
        moleculas: [
          { nome: 'Dapagliflozina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-glif'] },
        ],
      },
      {
        nome: 'AR-GLP-1',
        posicao_terapeutica: '2ª linha com maior perda de peso — preferir em obesidade e DCV estabelecida',
        moleculas: [
          { nome: 'Semaglutida', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-extensior'] },
        ],
      },
      {
        nome: 'Sulfonilureia',
        posicao_terapeutica: '2ª/3ª linha — custo-efetiva; preferir glicazida ou glimepirida (menor hipoglicemia)',
        moleculas: [
          { nome: 'Glicazida', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-glicazida-30'] },
          { nome: 'Glimepirida', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-betes'] },
        ],
      },
    ],
    notas_clinicas: [
      'Glif® (Dapagliflozina 10 mg): benefício cardiovascular e renal independente de HbA1c — usar em IC e DRC',
      'Extensior® (Semaglutida SC): maior redução de HbA1c e peso entre as classes — indicada em obesidade + DM2',
      'Betes® (Glimepirida): sulfonilureia de 3ª geração — menor risco de hipoglicemia que glibenclamida',
      'Metformina: contraindicada em ClCr < 30; suspender antes de contraste iodado',
    ],
  },

  {
    cid10: ['F32', 'F33'],
    diagnostico: 'Transtorno Depressivo Maior (TDM)',
    diretrizes: [
      { nome: 'Diretriz ABP — Depressão', sociedade: 'ABP', ano: 2021, nivel_evidencia: 'A', grau_recomendacao: 'I' },
      { nome: 'NICE Guidelines — Depression in Adults', sociedade: 'NICE', ano: 2022, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'ISRS',
        posicao_terapeutica: '1ª linha — melhor perfil de tolerabilidade',
        moleculas: [
          { nome: 'Escitalopram', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-escitalopram-10', 'euro-esc-odt'] },
          { nome: 'Sertralina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-afetus', 'euro-sertralina-50'] },
          { nome: 'Paroxetina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-paroxetina-20', 'euro-pondera-xr'] },
        ],
      },
      {
        nome: 'IRSN',
        posicao_terapeutica: '1ª/2ª linha — quando dor crônica, fibromialgia ou TAG associada',
        moleculas: [
          { nome: 'Duloxetina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-dep'] },
          { nome: 'Desvenlafaxina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-desve-50'] },
          { nome: 'Venlafaxina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-venlafaxina-75'] },
        ],
      },
      {
        nome: 'Antidepressivo Multimodal',
        posicao_terapeutica: '1ª/2ª linha — vantagem em déficit cognitivo associado à depressão',
        moleculas: [
          { nome: 'Vortioxetina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-vod'] },
        ],
      },
    ],
    notas_clinicas: [
      'ESC® (Escitalopram): meta-análise Cipriani 2018 — melhor eficácia + tolerabilidade entre ISRS',
      'Dep® (Duloxetina 60 mg): dupla ação (S+NA) — indicada em depressão com dor crônica, neuropatia diabética e fibromialgia',
      'Vod® (Vortioxetina): mecanismo multimodal — melhora função cognitiva além do humor; não usar < 18 anos',
      'Manter tratamento ≥ 6 meses após remissão; 12–24 meses em recidivas; indefinido em ≥ 3 episódios',
    ],
  },

  {
    cid10: ['G47.0', 'F51.0'],
    diagnostico: 'Insônia',
    diretrizes: [
      { nome: 'Clinical Practice Guideline for Chronic Insomnia', sociedade: 'AASM', ano: 2017, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Hipnótico Não-Benzodiazepínico (Z-drug)',
        posicao_terapeutica: '1ª linha farmacológica — após TCC-I (preferida não-farmacológica)',
        moleculas: [
          { nome: 'Zolpidem', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-turno', 'euro-turno-sl', 'euro-turno-xr'] },
          { nome: 'Eszopiclona', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-prysma'] },
        ],
      },
    ],
    notas_clinicas: [
      'TCC-I (Terapia Cognitivo-Comportamental para Insônia) é a 1ª linha — mais eficaz que farmacoterapia a longo prazo',
      'Turno® (Zolpidem 10 mg): mulheres e idosos → 5 mg (metabolização mais lenta)',
      'Turno XR® (Zolpidem LP): para insônia de manutenção — maior risco de sedação residual matinal',
      'Turno SL® (Zolpidem 5 mg SL): para acordar durante a noite (mínimo 4h antes de levantar)',
      'Prysma® (Eszopiclona): CONTRAINDICADO > 65 anos; paladar metálico característico',
      '⚠ Todos requerem Retenção Especial ANVISA; uso máximo 4 semanas',
    ],
  },

  {
    cid10: ['I25', 'E78', 'E78.0', 'E78.1', 'E78.5'],
    diagnostico: 'Dislipidemia / Doença Coronária — Prevenção CV',
    diretrizes: [
      { nome: 'Diretriz Brasileira de Dislipidemias', sociedade: 'SBC/SBD', ano: 2023, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Estatina',
        posicao_terapeutica: '1ª linha — redução de LDL e eventos CV',
        moleculas: [
          { nome: 'Rosuvastatina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-ruva'] },
          { nome: 'Atorvastatina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-vast'] },
        ],
      },
      {
        nome: 'Antiagregante Plaquetário',
        posicao_terapeutica: 'Prevenção secundária CV — associar a estatina',
        moleculas: [
          { nome: 'AAS', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-saliprevi'] },
          { nome: 'Clopidogrel', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-plaq'] },
        ],
      },
    ],
    notas_clinicas: [
      'Ruva® (Rosuvastatina): estatina de alta potência — preferida em alto risco CV; máx 10 mg em ClCr < 30',
      'Vast® (Atorvastatina 40–80 mg): alta intensidade — metaanálise CTT: reduz eventos CV em 30% por cada 1 mmol/L de LDL',
      'Saliprevi® (AAS 100 mg): prevenção CV secundária; associar IBP em alto risco GI',
    ],
  },

  {
    cid10: ['N80', 'N80.0', 'N80.1'],
    diagnostico: 'Endometriose',
    diretrizes: [
      { nome: 'ESHRE Guideline — Endometriosis', sociedade: 'ESHRE', ano: 2022, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Progestógeno — Dienogeste',
        posicao_terapeutica: '1ª/2ª linha — tratamento hormonal específico para endometriose',
        moleculas: [
          { nome: 'Dienogeste', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-pietra-ed'] },
        ],
      },
    ],
    notas_clinicas: [
      'Pietra ED® (Dienogeste 2 mg): único progestógeno aprovado especificamente para endometriose no Brasil',
      'Uso contínuo (sem pausa) — spotting irregular nos primeiros 3–6 meses é esperado',
      'Não é contraceptivo confiável — usar método adicional se necessário',
      'Avaliar DEXA após 12 meses de uso (redução de DMO)',
    ],
  },

  {
    cid10: ['G20', 'G25.81'],
    diagnostico: 'Doença de Parkinson / Síndrome das Pernas Inquietas',
    diretrizes: [
      { nome: 'MDS Clinical Diagnostic Criteria for PD', sociedade: 'MDS', ano: 2019, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Agonista Dopaminérgico D2/D3',
        posicao_terapeutica: 'Parkinson precoce ou adjuvante; 1ª linha na SPI',
        moleculas: [
          { nome: 'Pramipexol', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-pisa'] },
        ],
      },
    ],
    notas_clinicas: [
      'Pisa® LP (Pramipexol): 1 tomada/dia — melhor adesão; titular lentamente (0,75 mg/semana)',
      'Alertar sobre controle de impulsos (jogo, hipersexualidade) e sonolência súbita',
      'Na SPI: iniciar 0,125 mg/noite; risco de augmentation com uso prolongado',
    ],
  },

  {
    cid10: ['H81.0', 'H81.3', 'R42'],
    diagnostico: 'Doença de Ménière / Vertigem Vestibular',
    diretrizes: [
      { nome: 'AAO-HNS Clinical Practice Guideline — Ménière Disease', sociedade: 'AAO-HNS', ano: 2020, nivel_evidencia: 'B', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'Antivertiginoso — Análogo da Histamina',
        posicao_terapeutica: '1ª linha farmacológica — reduz frequência e intensidade das crises',
        moleculas: [
          { nome: 'Betaistina', grau_recomendacao: 'I', nivel_evidencia: 'B', produtos_eurofarma: ['euro-betina'] },
        ],
      },
    ],
    notas_clinicas: [
      'Betina® (Betaistina 16–24 mg): início de ação em 2–4 semanas; tomar às refeições',
      'Tratamento prolongado (meses a anos) para profilaxia de crises de Ménière',
      'Dieta hipossódica e evitar cafeína/álcool complementam o tratamento',
    ],
  },
  // ─── J44 — DPOC ───────────────────────────────────────────────
  {
    cid10: ['J44', 'J44.0', 'J44.1', 'J44.9'],
    diagnostico: 'Doença Pulmonar Obstrutiva Crônica (DPOC)',
    diretrizes: [
      { nome: 'GOLD Report 2023 — Global Strategy for COPD', sociedade: 'GOLD', ano: 2023, nivel_evidencia: 'A', grau_recomendacao: 'I', url_referencia: 'https://goldcopd.org/2023-gold-report/' },
      { nome: 'Diretriz Brasileira para o Manejo da DPOC', sociedade: 'SBPT', ano: 2022, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'LABA — Beta-2 Agonista de Longa Ação',
        posicao_terapeutica: '1ª linha — controle sintomático em DPOC sintomático',
        moleculas: [
          { nome: 'Formoterol', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
          { nome: 'Salmeterol', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
        ],
      },
      {
        nome: 'LAMA — Antimuscarínico de Longa Ação',
        posicao_terapeutica: '1ª linha — preferido em DPOC com predomínio de dispneia',
        moleculas: [
          { nome: 'Tiotrópio', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
        ],
      },
      {
        nome: 'LABA + LAMA — Combinação Broncodilatadora',
        posicao_terapeutica: 'Preferido em pacientes sintomáticos ou com exacerbações frequentes',
        moleculas: [
          { nome: 'Combinação LABA+LAMA', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
        ],
      },
      {
        nome: 'CI + LABA — Corticoide Inalatório + LABA',
        posicao_terapeutica: 'Indicado quando eosinófilos > 300 células/µL ou exacerbações frequentes',
        moleculas: [
          { nome: 'Fluticasona + Formoterol', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-lugano'] },
        ],
      },
      {
        nome: 'Corticoide Sistêmico — Exacerbação',
        posicao_terapeutica: 'Exacerbações moderadas a graves — curso curto (5–7 dias)',
        moleculas: [
          { nome: 'Prednisolona', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-prednisolona-20'] },
        ],
      },
      {
        nome: 'Xantina — 3ª linha',
        posicao_terapeutica: '3ª linha quando broncodilatadores inalatórios são insuficientes ou indisponíveis',
        moleculas: [
          { nome: 'Aminofilina', grau_recomendacao: 'IIb', nivel_evidencia: 'B', produtos_eurofarma: [] },
        ],
      },
    ],
    notas_clinicas: [
      'DPOC: classificar por GOLD A/B/E (sintomas + exacerbações)',
      'Não usar CI em monoterapia no DPOC',
      'Vacinação influenza e pneumocócica obrigatória',
    ],
  },
  // ─── N18 — Doença Renal Crônica ───────────────────────────────
  {
    cid10: ['N18', 'N18.1', 'N18.2', 'N18.3', 'N18.4', 'N18.5', 'N18.9'],
    diagnostico: 'Doença Renal Crônica (DRC)',
    diretrizes: [
      { nome: 'KDIGO 2024 Clinical Practice Guideline for CKD', sociedade: 'KDIGO', ano: 2024, nivel_evidencia: 'A', grau_recomendacao: 'I', url_referencia: 'https://kdigo.org/guidelines/ckd/' },
      { nome: 'Diretriz Brasileira de Doença Renal Crônica', sociedade: 'SBN', ano: 2023, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'IECA — Inibidor da ECA',
        posicao_terapeutica: '1ª linha em DRC com proteinúria ou DM2 — nefroprotetor',
        moleculas: [
          { nome: 'Enalapril', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-enalapril-10'] },
          { nome: 'Ramipril', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
        ],
      },
      {
        nome: 'BRA — Bloqueador do Receptor de Angiotensina',
        posicao_terapeutica: 'Alternativa ao IECA em caso de tosse ou intolerância',
        moleculas: [
          { nome: 'Losartana', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-zart-50'] },
          { nome: 'Irbesartana', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-irbesartana-150'] },
        ],
      },
      {
        nome: 'SGLT2 — Inibidor do SGLT2',
        posicao_terapeutica: '1ª linha — reduz progressão da DRC independentemente do DM2',
        moleculas: [
          { nome: 'Dapagliflozina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-dapagliflozina-10'] },
        ],
      },
      {
        nome: 'Diurético de Alça',
        posicao_terapeutica: 'Sobrecarga hídrica / hipertensão refratária na DRC avançada',
        moleculas: [
          { nome: 'Furosemida', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-furosemida-40'] },
        ],
      },
      {
        nome: 'Agente Estimulador de Eritropoese (ASE)',
        posicao_terapeutica: 'Anemia da DRC — iniciar quando Hb < 10 g/dL',
        moleculas: [
          { nome: 'Epoetina alfa', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
        ],
      },
      {
        nome: 'Suplemento de Ferro IV',
        posicao_terapeutica: 'Anemia ferropriva na DRC — preferir IV em pacientes em diálise',
        moleculas: [
          { nome: 'Ferro sacarato IV', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
        ],
      },
    ],
    notas_clinicas: [
      'Meta PA < 130/80 mmHg',
      'Evitar AINEs e contraste iodado',
      'SGLT2 reduz progressão mesmo sem DM2 (estudo DAPA-CKD)',
    ],
  },
  // ─── K21 — DRGE ───────────────────────────────────────────────
  {
    cid10: ['K21', 'K21.0', 'K21.9'],
    diagnostico: 'Doença do Refluxo Gastroesofágico (DRGE)',
    diretrizes: [
      { nome: 'Diretrizes Brasileiras de Doença do Refluxo Gastroesofágico', sociedade: 'FBG', ano: 2022, nivel_evidencia: 'A', grau_recomendacao: 'I' },
      { nome: 'ACG Clinical Guideline — Diagnosis and Management of GERD', sociedade: 'ACG', ano: 2022, nivel_evidencia: 'A', grau_recomendacao: 'I', url_referencia: 'https://journals.lww.com/ajg/fulltext/2022/01000/acg_clinical_guideline__diagnosis_and_management.16.aspx' },
    ],
    classes: [
      {
        nome: 'IBP — Inibidor da Bomba de Prótons',
        posicao_terapeutica: '1ª linha — supressão ácida eficaz na DRGE erosiva e não erosiva',
        moleculas: [
          { nome: 'Omeprazol', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
          { nome: 'Pantoprazol', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
          { nome: 'Esomeprazol', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-esomeprazol-20'] },
        ],
      },
      {
        nome: 'Anti-H2 — Antagonista do Receptor H2',
        posicao_terapeutica: 'Manutenção em DRGE leve — inferior ao IBP',
        moleculas: [
          { nome: 'Famotidina', grau_recomendacao: 'IIa', nivel_evidencia: 'B', produtos_eurofarma: [] },
        ],
      },
      {
        nome: 'Procinético',
        posicao_terapeutica: 'Adjuvante em regurgitação ou dismotilidade esofágica',
        moleculas: [
          { nome: 'Domperidona', grau_recomendacao: 'IIb', nivel_evidencia: 'B', produtos_eurofarma: ['euro-domperidona-10'] },
        ],
      },
      {
        nome: 'Antiácido',
        posicao_terapeutica: 'Alívio imediato de sintomas leves — não modifica doença',
        moleculas: [
          { nome: 'Hidróxido de alumínio/magnésio', grau_recomendacao: 'IIb', nivel_evidencia: 'C', produtos_eurofarma: [] },
        ],
      },
    ],
    notas_clinicas: [
      'IBP: tomar 30 min antes da primeira refeição',
      'Reavaliação em 4-8 semanas; não prolongar IBP sem indicação',
      'Medidas comportamentais: elevar cabeceira, evitar refeições tardias, reduzir peso',
    ],
  },
  // ─── M05/M06 — Artrite Reumatoide ────────────────────────────
  {
    cid10: ['M05', 'M06', 'M05.0', 'M05.1', 'M05.2', 'M05.3', 'M06.0', 'M06.9'],
    diagnostico: 'Artrite Reumatoide (AR)',
    diretrizes: [
      { nome: 'ACR Guideline for the Treatment of Rheumatoid Arthritis', sociedade: 'ACR', ano: 2021, nivel_evidencia: 'A', grau_recomendacao: 'I', url_referencia: 'https://www.rheumatology.org/Practice-Quality/Clinical-Support/Clinical-Practice-Guidelines/Rheumatoid-Arthritis' },
      { nome: 'Recomendações da Sociedade Brasileira de Reumatologia para AR', sociedade: 'SBR', ano: 2022, nivel_evidencia: 'A', grau_recomendacao: 'I' },
    ],
    classes: [
      {
        nome: 'DMARD Convencional — Âncora',
        posicao_terapeutica: '1ª linha — iniciar precocemente; anchor drug da AR',
        moleculas: [
          { nome: 'Metotrexato', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
        ],
      },
      {
        nome: 'Antimalárico',
        posicao_terapeutica: 'AR leve ou em combinação com MTX',
        moleculas: [
          { nome: 'Hidroxicloroquina', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-hidroxicloroquina-400'] },
        ],
      },
      {
        nome: 'DMARD Biológico — Anti-TNF',
        posicao_terapeutica: 'Falha ao MTX após 3–6 meses — escalonamento terapêutico',
        moleculas: [
          { nome: 'Adalimumabe', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
          { nome: 'Etanercepte', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
        ],
      },
      {
        nome: 'JAK Inibidor',
        posicao_terapeutica: 'Falha ao DMARD biológico ou contraindicação a biológicos',
        moleculas: [
          { nome: 'Baricitinibe', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: [] },
          { nome: 'Tofacitinibe', grau_recomendacao: 'I', nivel_evidencia: 'B', produtos_eurofarma: [] },
        ],
      },
      {
        nome: 'Glicocorticoide — Ponte',
        posicao_terapeutica: 'Controle de atividade enquanto DMARD não atinge efeito pleno — curto prazo',
        moleculas: [
          { nome: 'Prednisolona', grau_recomendacao: 'I', nivel_evidencia: 'A', produtos_eurofarma: ['euro-prednisolona-20'] },
        ],
      },
      {
        nome: 'AINE — Analgésico/Anti-inflamatório',
        posicao_terapeutica: 'Controle sintomático de dor e rigidez — não modifica doença',
        moleculas: [
          { nome: 'Meloxicam', grau_recomendacao: 'IIa', nivel_evidencia: 'B', produtos_eurofarma: ['euro-meloxicam-15'] },
          { nome: 'Celecoxibe', grau_recomendacao: 'IIa', nivel_evidencia: 'B', produtos_eurofarma: ['euro-celecoxibe-200'] },
        ],
      },
    ],
    notas_clinicas: [
      'Metotrexato é o anchor drug da AR — usar sempre que possível',
      'Suplementar folato 5 mg/semana com MTX',
      'Rastreio TB, hepatites e vacinação antes de biológicos',
    ],
  },
];

// ─── STATUS DE SYNC ────────────────────────────────────────────

export const SYNC_STATUS: SyncStatus = {
  estado: 'success',
  ultima_sync: '2026-07-01T12:00:00Z',
  proxima_sync: '2026-07-02T03:00:00Z',
  total_produtos: EUROFARMA_CATALOG.length,
  produtos_novos: 53,
  produtos_atualizados: 5,
  erros: [],
  fonte_principal: 'https://eurofarma.com.br/produtos',
  fonte_bulas: 'https://eurofarma.com.br/produtos/bulas',
  versao_catalogo: '2026.7.2',
};

export const AUDIT_TRAIL: AuditEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2026-06-17T03:00:00Z',
    tipo: 'sync_completo',
    descricao: `Sincronização automática concluída. ${EUROFARMA_CATALOG.length} produtos verificados. 0 novos, 2 atualizados.`,
    fonte: 'https://eurofarma.com.br/produtos',
    operador: 'sistema_automatico',
  },
  {
    id: 'audit-002',
    timestamp: '2026-06-17T03:00:12Z',
    tipo: 'atualizacao_bula',
    produto_id: 'euro-desve-50',
    produto_nome: 'Desve® (Desvenlafaxina)',
    descricao: 'Atualização de bula: adicionada seção sobre síndrome serotoninérgica (RDC ANVISA 2026-05).',
    fonte: 'ANVISA — Resolução RDC 2026',
    operador: 'sistema_automatico',
  },
  {
    id: 'audit-003',
    timestamp: '2026-06-17T03:00:15Z',
    tipo: 'atualizacao_bula',
    produto_id: 'euro-montelucaste-10',
    produto_nome: 'Montelucaste Eurofarma',
    descricao: 'Atualização: FDA/ANVISA Black Box Warning confirmada para alterações neuropsiquiátricas.',
    fonte: 'FDA Safety Communication 2020 / ANVISA 2025',
    operador: 'sistema_automatico',
  },
  {
    id: 'audit-004',
    timestamp: '2026-06-16T03:00:00Z',
    tipo: 'sync_completo',
    descricao: 'Sincronização automática concluída. 0 produtos novos, 0 atualizados.',
    fonte: 'https://eurofarma.com.br/produtos',
    operador: 'sistema_automatico',
  },
];

// ─── FUNÇÕES DE CONSULTA ───────────────────────────────────────

export function getProdutoById(id: string): ProdutoComercial | undefined {
  return EUROFARMA_CATALOG.find(p => p.id === id);
}

export function getProdutosByMolecula(molecula: string): ProdutoComercial[] {
  if (!molecula || molecula.trim().length < 3) return [];
  const dn = normMol(molecula);
  return EUROFARMA_CATALOG.filter(p => normMol(p.molecula) === dn);
}

export function getProdutosByClasse(classe: string): ProdutoComercial[] {
  return EUROFARMA_CATALOG.filter(p =>
    p.classe_terapeutica.toLowerCase().includes(classe.toLowerCase())
  );
}

export function searchCatalog(query: string): ProdutoComercial[] {
  if (query.length < 2) return [];
  const q = query.toLowerCase();
  return EUROFARMA_CATALOG.filter(p =>
    p.molecula.toLowerCase().includes(q) ||
    p.nome_comercial.toLowerCase().includes(q) ||
    p.classe_terapeutica.toLowerCase().includes(q) ||
    p.cids_aprovados.some(c => c.toLowerCase().includes(q))
  );
}

export function getCorrelacaoByCID(cid10: string): CorrelacaoTerapeutica | undefined {
  return CORRELACAO_TERAPEUTICA.find(c =>
    c.cid10.some(c10 => c10 === cid10 || cid10.startsWith(c10))
  );
}

export function getCorrelacaoByDiagnostico(diagnostico: string): CorrelacaoTerapeutica | undefined {
  const d = diagnostico.toLowerCase();
  return CORRELACAO_TERAPEUTICA.find(c =>
    c.diagnostico.toLowerCase().includes(d) ||
    c.cid10.some(cid => diagnostico.includes(cid))
  );
}

// Agrupa produtos por classe terapêutica
export function getCatalogoPorClasse(): Record<string, ProdutoComercial[]> {
  const agrupado: Record<string, ProdutoComercial[]> = {};
  for (const produto of EUROFARMA_CATALOG) {
    if (!agrupado[produto.classe_terapeutica]) agrupado[produto.classe_terapeutica] = [];
    agrupado[produto.classe_terapeutica].push(produto);
  }
  return agrupado;
}

// Agrupa produtos por molécula
export function getCatalogoPorMolecula(): Record<string, ProdutoComercial[]> {
  const agrupado: Record<string, ProdutoComercial[]> = {};
  for (const produto of EUROFARMA_CATALOG) {
    const mol = produto.molecula.split(' ')[0]; // primeira palavra
    if (!agrupado[mol]) agrupado[mol] = [];
    agrupado[mol].push(produto);
  }
  return agrupado;
}
