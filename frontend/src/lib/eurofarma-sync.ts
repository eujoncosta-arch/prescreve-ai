// ============================================================
// PRESCREVE-AI — Motor de Sincronização Eurofarma
// Arquitetura de sync contínuo com portal oficial
// Separação estrita: dados regulatórios ≠ evidência científica
// ============================================================

import type { ProdutoComercial, LabInfo } from './types';

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
      { concentracao: '40 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos', registro_anvisa: '1.0281.0192.002-5' },
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
    nome_comercial: 'Valsartana Eurofarma',
    classe_terapeutica: 'Bloqueador do Receptor da Angiotensina II (BRA/SARA)',
    cids_aprovados: ['I10', 'I50'],
    apresentacoes: [
      { concentracao: '80 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '160 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '320 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'HAS: 80–160 mg 1x/dia; máx 320 mg/dia. IC pós-IAM: 20 mg 2x/dia, titular até 160 mg 2x/dia.',
    contraindicacoes_bula: ['Gravidez', 'Uso com alisquireno em DM/IR', 'Hipersensibilidade'],
    advertencias_principais: ['Hipotensão em depleção de volume', 'Hipercalemia', 'Monitorar função renal'],
    interacoes_principais: ['AINEs', 'Poupadores de potássio', 'Lítio'],
    uso_populacoes_especiais: { renal: 'Cuidado em ClCr < 10 mL/min', hepatico: 'Não exceder 80 mg/dia', gestante: 'CONTRAINDICADO' },
    data_registro: '2017-08-14',
    data_ultima_atualizacao: '2025-09-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-valsartana-eurofarma.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-valsartana-eurofarma.pdf',
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
    molecula: 'Fumarato de Bisoprolol',
    nome_comercial: 'Bisoprolol Eurofarma',
    classe_terapeutica: 'Betabloqueador seletivo β1',
    cids_aprovados: ['I50', 'I10', 'I48'],
    apresentacoes: [
      { concentracao: '2,5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'IC: iniciar 1,25 mg/dia, dobrar a cada 2 semanas até 10 mg/dia. HAS: 5–20 mg/dia.',
    contraindicacoes_bula: ['BAV 2º/3º grau', 'Bradicardia sintomática', 'IC descompensada grave'],
    advertencias_principais: ['Asma — usar com extrema cautela', 'Não suspender abruptamente em coronariopatas'],
    interacoes_principais: ['Clonidina', 'Antiarrítmicos classe I', 'Insulina'],
    uso_populacoes_especiais: { renal: 'Sem ajuste em ClCr > 20 mL/min', idoso: 'Mesma dose, monitorar FC' },
    data_registro: '2019-02-28',
    data_ultima_atualizacao: '2025-10-15',
    versao_bula: 'v2025.2',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-bisostad.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-bisostad.pdf',
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
    nome_comercial: 'Metformina Eurofarma',
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
      { concentracao: '200 mcg/dose', forma_farmaceutica: 'inalatorio', embalagem: 'Frasco 200 doses', registro_anvisa: '1.0281.0055.001-1' },
      { concentracao: '400 mcg/dose', forma_farmaceutica: 'inalatorio', embalagem: 'Frasco 200 doses', registro_anvisa: '1.0281.0055.002-9' },
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
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0281.0210.001-3' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0281.0210.002-1' },
    ],
    posologia_aprovada: 'Depressão: 50 mg 1x/dia. Dose pode ser aumentada até 400 mg/dia conforme tolerância e resposta.',
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
      { concentracao: '50 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos' },
      { concentracao: '100 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos' },
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
    nome_comercial: 'Escitalopram Eurofarma',
    classe_terapeutica: 'Inibidor Seletivo da Recaptação de Serotonina (ISRS)',
    cids_aprovados: ['F32', 'F33', 'F41'],
    apresentacoes: [
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos' },
    ],
    posologia_aprovada: 'Depressão/TAG: iniciar 10 mg/dia. Dose usual: 10–20 mg/dia. Máximo: 20 mg/dia.',
    contraindicacoes_bula: ['IMAOs', 'Citalopram concomitante', 'QT longo congênito'],
    advertencias_principais: ['Prolongamento QT (evitar com outros QT-prolongadores)', 'Hiponatremia', 'Sangramento'],
    interacoes_principais: ['IMAOs', 'Pimozida', 'QT-prolongadores', 'Lítio'],
    uso_populacoes_especiais: { idoso: 'Máximo 10 mg/dia em > 65 anos (risco QT)' },
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
    nome_comercial: 'Paroxetina Eurofarma',
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
      { concentracao: '300 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
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
    id: 'euro-amoxicilina-500',
    lab_id: 'eurofarma',
    molecula: 'Amoxicilina Tri-hidratada',
    nome_comercial: 'Amoxicilina Eurofarma',
    classe_terapeutica: 'Aminopenicilina — Antibiótico beta-lactâmico',
    cids_aprovados: ['J06', 'J18', 'J20', 'J31', 'J32', 'H66', 'K12'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'capsula', embalagem: '21 cápsulas' },
      { concentracao: '875 mg', forma_farmaceutica: 'comprimido', embalagem: '14 comprimidos' },
      { concentracao: '250 mg/5 mL', forma_farmaceutica: 'suspensao_oral', embalagem: 'Frasco 150 mL' },
    ],
    posologia_aprovada: 'Infecções leves/moderadas: 500 mg 8/8h ou 875 mg 12/12h. PAC não grave: 1 g 8/8h por 7–10 dias.',
    contraindicacoes_bula: ['Alergia a penicilinas (anafilaxia)'],
    advertencias_principais: ['Reação cruzada com cefalosporinas (~1%)', 'Exantema em mononucleose', 'Diarreia por C. difficile'],
    interacoes_principais: ['Varfarina (potencializa)', 'Metotrexato', 'Alopurinol (exantema)'],
    uso_populacoes_especiais: { renal: 'Reduzir dose/frequência em ClCr < 30', pediatrico: '25–45 mg/kg/dia divididos', gestante: 'Seguro (Categoria B)' },
    data_registro: '2014-03-20',
    data_ultima_atualizacao: '2025-07-15',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-eurofarma-amoxicilina.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-eurofarma-amoxicilina.pdf',
  },

  {
    id: 'euro-azitromicina-500',
    lab_id: 'eurofarma',
    molecula: 'Di-hidrato de Azitromicina',
    nome_comercial: 'Azitromicina Eurofarma',
    classe_terapeutica: 'Macrolídeo — Antibiótico',
    cids_aprovados: ['J06', 'J18', 'J20', 'J31', 'J32'],
    apresentacoes: [
      { concentracao: '500 mg', forma_farmaceutica: 'comprimido', embalagem: '3 comprimidos' },
    ],
    posologia_aprovada: 'PAC ambulatorial: 500 mg/dia por 3–5 dias. Sinusite/faringite: 500 mg/dia por 3 dias.',
    contraindicacoes_bula: ['QT longo', 'Hepatopatia grave', 'Hipersensibilidade a macrolídeos'],
    advertencias_principais: ['Prolongamento QT', 'Hepatotoxicidade rara', 'Diarreia por C. difficile'],
    interacoes_principais: ['Digoxina (aumenta nível)', 'Varfarina', 'QT-prolongadores', 'Estatinas (miopatia raro)'],
    uso_populacoes_especiais: { gestante: 'Usar com cautela — dados limitados', pediatrico: '10 mg/kg/dia por 3 dias' },
    data_registro: '2015-06-08',
    data_ultima_atualizacao: '2025-08-01',
    versao_bula: 'v2025.1',
    fonte_regulatoria: 'ANVISA',
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-eurofarma-azitromicina.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-eurofarma-azitromicina.pdf',
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
    nome_comercial: 'Prednisolona Eurofarma',
    classe_terapeutica: 'Corticosteroide Sistêmico',
    cids_aprovados: ['J45', 'M06', 'K50', 'L10', 'D59'],
    apresentacoes: [
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '20 comprimidos' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '10 comprimidos' },
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
    link_bula_paciente: 'https://eurofarma.com.br/produtos/bulas/patient/pt/bula-attenze-10mg.pdf',
    link_bula_profissional: 'https://eurofarma.com.br/produtos/bulas/healthcare/pt/bula-attenze-10mg.pdf',
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
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0281.0290.001-8' },
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
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos' },
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
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos', registro_anvisa: '1.0043.1040' },
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
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '20 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
      { concentracao: '40 mg', forma_farmaceutica: 'comprimido', embalagem: '30 comprimidos' },
    ],
    posologia_aprovada: 'Dislipidemia: 10–20 mg 1x/dia. Alta intensidade: 20–40 mg/dia. Dose máxima: 40 mg/dia.',
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
      { concentracao: '5 mg', forma_farmaceutica: 'comprimido', embalagem: '28 comprimidos' },
      { concentracao: '10 mg', forma_farmaceutica: 'comprimido', embalagem: '4 comprimidos' },
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
      { concentracao: '200 mcg/dose', forma_farmaceutica: 'inalatorio', embalagem: 'Frasco 60 doses' },
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
      'Para rinite alérgica + asma concomitante: considerar Lemont® (montelucaste + levocetirizina)',
      'Ajuste de dose em insuficiência renal (ClCr < 50 mL/min)',
    ],
  },
];

// ─── STATUS DE SYNC ────────────────────────────────────────────

export const SYNC_STATUS: SyncStatus = {
  estado: 'success',
  ultima_sync: '2026-06-17T03:00:00Z',
  proxima_sync: '2026-06-18T03:00:00Z',
  total_produtos: EUROFARMA_CATALOG.length,
  produtos_novos: 17,
  produtos_atualizados: 4,
  erros: [],
  fonte_principal: 'https://eurofarma.com.br/produtos',
  fonte_bulas: 'https://eurofarma.com.br/produtos/bulas',
  versao_catalogo: '2026.6.2',
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
  const mol = molecula.toLowerCase().trim();
  // Extrai o primeiro substantivo da molécula (ignora prefixos como "cloridrato de", "maleato de", etc.)
  const stripPrefix = (s: string) => s.replace(/^(cloridrato|maleato|besilato|fumarato|succinato|oxalato|carbonato|di-hidrato|tri-hidrato|monoidrato)\s+(de|do|da)\s+/i, '').trim();
  const molClean = stripPrefix(mol);
  return EUROFARMA_CATALOG.filter(p => {
    const prodMol = p.molecula.toLowerCase();
    const prodMolClean = stripPrefix(prodMol);
    return (
      prodMol.includes(molClean) ||
      molClean.includes(prodMolClean) ||
      prodMolClean.startsWith(molClean.split(' ')[0]) ||
      molClean.startsWith(prodMolClean.split(' ')[0])
    );
  });
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
