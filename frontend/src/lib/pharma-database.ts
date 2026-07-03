// ============================================================
// PRESCREVE-AI — Banco Farmacológico para Prescrição Rápida
// Otimizado para busca instantânea e cálculo de doses
// ============================================================

export type DoseUnit = 'mg' | 'mcg' | 'g' | 'mL' | 'UI' | 'mg/kg' | 'mcg/kg' | 'mg/m²' | 'UI/kg' | 'gotas' | 'mg/dia' | 'mg/kg/dia';
export type Via = 'VO' | 'IV' | 'IM' | 'SC' | 'Inalatório' | 'Tópico' | 'Retal' | 'Sublingual' | 'spray nasal';

export type DrugCategory =
  | 'cardiovascular' | 'antihipertensivo' | 'antidiabético' | 'respiratory'
  | 'antibiotico' | 'antifungico' | 'antiparasitario' | 'psiquiatria'
  | 'neurologico' | 'gastroenterologia' | 'analgesico' | 'antiinflamatorio'
  | 'hormonio' | 'oncologia' | 'imunossupressor' | 'outro';

export interface QuickBrand {
  nome: string;
  laboratorio: string;
  concentracoes: string[];
  formas: string[];
  lab_id?: string; // referência ao lab-catalog
  // Campos de ligação ao catálogo verificado (preenchidos automaticamente via eurofarma-sync)
  produto_id?: string;
  bula_paciente?: string;
  bula_profissional?: string;
  verificado?: boolean; // true = dados do portal oficial Eurofarma
}

export interface PediatricDose {
  calculo: string;
  dose_por_kg: number;
  unidade: string;
  frequencia_divisoes: number;
  max_dose_dia: number;
  max_dose_dia_unidade: string;
  faixa_etaria: string;
  observacao?: string;
}

export interface RenalAdjustment {
  normal: string;
  tfg_60_30: string;
  tfg_30_15: string;
  tfg_lt_15: string;
  dialisavel: boolean;
}

export interface HepaticAdjustment {
  child_a: string;
  child_b: string;
  child_c: string;
}

export interface QuickDrug {
  id: string;
  molecula: string;
  nome_generico: string;
  sinonimos: string[]; // termos alternativos para busca
  categoria: DrugCategory;
  classe: string;
  subclasse?: string;
  indicacoes_principais: string[];

  dose_adulto: {
    habitual: string;
    min?: string;
    max: string;
    unidade: DoseUnit;
    via: Via;
    frequencias: string[];
    instrucoes?: string;
  };

  dose_pediatrica?: PediatricDose;
  ajuste_renal?: RenalAdjustment;
  ajuste_hepatico?: HepaticAdjustment;

  contraindicacoes_rapidas: string[];
  interacoes_importantes: InteractionRule[];
  alertas_especiais: string[];
  uso_gestante: 'seguro' | 'risco' | 'contraindicado' | 'avaliar';
  uso_lactante: 'seguro' | 'risco' | 'contraindicado' | 'avaliar';

  marcas: QuickBrand[];
}

export interface InteractionRule {
  com: string; // molecule name
  severidade: 'leve' | 'moderada' | 'grave' | 'contraindicado';
  descricao: string;
}

// ─── IMPORTAÇÃO DO CATÁLOGO VERIFICADO EUROFARMA ──────────────
// A biblioteca importa os produtos oficiais e substitui as marcas hardcoded
import { EUROFARMA_CATALOG, normMol } from './eurofarma-sync';
import type { ProdutoComercial } from './types';

function produtoToQuickBrand(p: ProdutoComercial): QuickBrand {
  const formas = [...new Set(p.apresentacoes.map((a: { forma_farmaceutica: string }) => {
    const f = a.forma_farmaceutica.replace(/_/g, ' ');
    return f.charAt(0).toUpperCase() + f.slice(1);
  }))] as string[];
  return {
    nome: p.nome_comercial,
    laboratorio: 'Eurofarma',
    concentracoes: [...new Set(p.apresentacoes.map((a: { concentracao: string }) => a.concentracao))],
    formas,
    lab_id: 'eurofarma',
    produto_id: p.id,
    bula_paciente: p.link_bula_paciente,
    bula_profissional: p.link_bula_profissional,
    verificado: true,
  };
}

// ─── BANCO DE MEDICAMENTOS ─────────────────────────────────────

export const PHARMA_DB: QuickDrug[] = [

  // ══════════════════════════════════════════════════════════
  // CARDIOVASCULAR — ANTIHIPERTENSIVOS
  // ══════════════════════════════════════════════════════════

  {
    id: 'enalapril',
    molecula: 'Enalapril',
    nome_generico: 'Maleato de Enalapril',
    sinonimos: ['enalapril', 'renitec', 'ieca'],
    categoria: 'antihipertensivo',
    classe: 'IECA',
    subclasse: 'Inibidor da ECA',
    indicacoes_principais: ['HAS', 'IC-FEr', 'DRC + proteinúria', 'Pós-IAM'],
    dose_adulto: {
      habitual: '10', min: '2.5', max: '40', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
      instrucoes: 'Iniciar com 5 mg/dia. Aumentar progressivamente.',
    },
    ajuste_renal: {
      normal: '5–40 mg/dia', tfg_60_30: '5 mg/dia',
      tfg_30_15: '2,5 mg/dia', tfg_lt_15: '2,5 mg no dia de diálise',
      dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['Histórico de angioedema por IECA', 'Gestação', 'Com sacubitril/valsartana'],
    interacoes_importantes: [
      { com: 'Losartana', severidade: 'grave', descricao: 'Duplo bloqueio SRAA — hipotensão, hipercalemia, IRA' },
      { com: 'Espironolactona', severidade: 'moderada', descricao: 'Hipercalemia — monitorar K+' },
      { com: 'AINE', severidade: 'moderada', descricao: 'Redução efeito anti-hipertensivo + risco IRA' },
    ],
    alertas_especiais: ['Tosse seca (10-15%) — trocar por BRA se intolerado', 'Angioedema — risco aumentado em afro-descendentes'],
    uso_gestante: 'contraindicado', uso_lactante: 'risco',
    marcas: [
      { nome: 'Enalapril Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['5 mg', '10 mg', '20 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
      { nome: 'EMS Enalapril', laboratorio: 'EMS', concentracoes: ['5 mg', '10 mg', '20 mg'], formas: ['Comprimido'] },
      { nome: 'Vasopril', laboratorio: 'Aché', concentracoes: ['5 mg', '10 mg', '20 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'olmesartana',
    molecula: 'Olmesartana',
    nome_generico: 'Olmesartana Medoxomila',
    sinonimos: ['holmes', 'olmesartan', 'bra', 'benicar'],
    categoria: 'antihipertensivo',
    classe: 'BRA',
    subclasse: 'Bloqueador do Receptor AT1',
    indicacoes_principais: ['HAS'],
    dose_adulto: {
      habitual: '20', min: '10', max: '40', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Iniciar com 20 mg/dia. Pode aumentar para 40 mg após 2 semanas se necessário.',
    },
    ajuste_renal: {
      normal: '20–40 mg/dia', tfg_60_30: 'Cautela',
      tfg_30_15: 'Máx 20 mg/dia', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['Gestação (2º/3º trimestre)', 'Hipersensibilidade', 'Com alisquireno em DM/DRC'],
    interacoes_importantes: [
      { com: 'Enalapril', severidade: 'grave', descricao: 'Duplo bloqueio SRAA — contraindicado' },
      { com: 'Espironolactona', severidade: 'moderada', descricao: 'Hipercalemia' },
    ],
    alertas_especiais: ['Não causa tosse', 'Monitorar K+ e função renal', 'Raro: enteropatia tipo espru com diarreia grave'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Holmes®', laboratorio: 'Eurofarma', concentracoes: ['20 mg', '40 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
      { nome: 'Benicar', laboratorio: 'Daiichi Sankyo', concentracoes: ['20 mg', '40 mg'], formas: ['Comprimido'] },
      { nome: 'Olmesartana EMS', laboratorio: 'EMS', concentracoes: ['20 mg', '40 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'losartana',
    molecula: 'Losartana',
    nome_generico: 'Losartana Potássica',
    sinonimos: ['losartan', 'zart', 'cozaar', 'bra', 'bra bloq'],
    categoria: 'antihipertensivo',
    classe: 'BRA',
    subclasse: 'Bloqueador do Receptor AT1',
    indicacoes_principais: ['HAS', 'Nefropatia diabética', 'IC-FEr', 'HVE'],
    dose_adulto: {
      habitual: '50', min: '25', max: '100', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Dose máxima: 100 mg/dia. Sem tosse, substitui IECA.',
    },
    ajuste_renal: {
      normal: '50–100 mg/dia', tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Cautela', tfg_lt_15: 'Não recomendado em nefropatia DM',
      dialisavel: false,
    },
    ajuste_hepatico: { child_a: '25 mg/dia', child_b: '25 mg/dia', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Gestação (2º/3º trimestre)', 'Com alisquireno em DM/DRC'],
    interacoes_importantes: [
      { com: 'Enalapril', severidade: 'grave', descricao: 'Duplo bloqueio SRAA' },
      { com: 'Espironolactona', severidade: 'moderada', descricao: 'Hipercalemia' },
    ],
    alertas_especiais: ['Não causa tosse (diferente dos IECAs)', 'Monitorar K+ e função renal'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Zart®', laboratorio: 'Eurofarma', concentracoes: ['50 mg', '100 mg'], formas: ['Comprimido revestido'], lab_id: 'eurofarma' },
      { nome: 'Cozaar', laboratorio: 'MSD', concentracoes: ['50 mg', '100 mg'], formas: ['Comprimido'] },
      { nome: 'Losartana EMS', laboratorio: 'EMS', concentracoes: ['25 mg', '50 mg', '100 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'valsartana',
    molecula: 'Valsartana',
    nome_generico: 'Valsartana',
    sinonimos: ['valsartan', 'diovan', 'bra'],
    categoria: 'antihipertensivo',
    classe: 'BRA',
    indicacoes_principais: ['HAS', 'IC-FEr pós-IAM'],
    dose_adulto: {
      habitual: '160', min: '80', max: '320', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
    },
    ajuste_renal: {
      normal: '80–320 mg/dia', tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Cautela', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Máx 80 mg/dia', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Gestação', 'Com aliskiren em DM/DRC'],
    interacoes_importantes: [
      { com: 'Enalapril', severidade: 'grave', descricao: 'Duplo bloqueio SRAA' },
    ],
    alertas_especiais: [],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Diovan', laboratorio: 'Novartis', concentracoes: ['80 mg', '160 mg', '320 mg'], formas: ['Comprimido'] },
      { nome: 'Valsartana EMS', laboratorio: 'EMS', concentracoes: ['80 mg', '160 mg', '320 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'anlodipino',
    molecula: 'Anlodipino',
    nome_generico: 'Besilato de Anlodipino',
    sinonimos: ['amlodipine', 'norvasc', 'bcc', 'bloqueador canal calcio'],
    categoria: 'antihipertensivo',
    classe: 'BCC',
    subclasse: 'Di-hidropiridínico',
    indicacoes_principais: ['HAS', 'Angina estável', 'Angina vasoespástica'],
    dose_adulto: {
      habitual: '5', min: '2.5', max: '10', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
    },
    dose_pediatrica: {
      calculo: 'mg/kg/dia', dose_por_kg: 0.1, unidade: 'mg',
      frequencia_divisoes: 1, max_dose_dia: 5, max_dose_dia_unidade: 'mg',
      faixa_etaria: '> 6 anos',
    },
    ajuste_renal: {
      normal: '5–10 mg/dia', tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false,
    },
    ajuste_hepatico: { child_a: '2,5 mg/dia', child_b: '2,5 mg/dia', child_c: 'Cautela extrema' },
    contraindicacoes_rapidas: ['Hipotensão grave', 'Choque cardiogênico', 'Estenose aórtica grave'],
    interacoes_importantes: [
      { com: 'Sinvastatina', severidade: 'moderada', descricao: 'Sinvastatina > 20 mg: risco de miopatia' },
      { com: 'Ciclosporina', severidade: 'grave', descricao: 'Aumento dos níveis de ciclosporina' },
    ],
    alertas_especiais: ['Edema periférico dose-dependente (10-20%)', 'Não interromper abruptamente em angina vasoespástica'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Anlodipino Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['5 mg', '10 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
      { nome: 'Norvasc', laboratorio: 'Pfizer', concentracoes: ['5 mg', '10 mg'], formas: ['Comprimido'] },
      { nome: 'Anlodipino EMS', laboratorio: 'EMS', concentracoes: ['5 mg', '10 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'hctz',
    molecula: 'Hidroclorotiazida',
    nome_generico: 'Hidroclorotiazida',
    sinonimos: ['hctz', 'hidroclorotiazida', 'tiazidico', 'diuretico'],
    categoria: 'antihipertensivo',
    classe: 'Diurético Tiazídico',
    indicacoes_principais: ['HAS', 'Edema'],
    dose_adulto: {
      habitual: '12.5', min: '12.5', max: '25', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia (manhã)'],
      instrucoes: 'Doses > 25 mg não aumentam eficácia anti-hipertensiva.',
    },
    ajuste_renal: {
      normal: '12,5–25 mg/dia', tfg_60_30: 'Reduzir',
      tfg_30_15: 'Evitar (ineficaz)', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cuidado', child_b: 'Cuidado', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['Anúria', 'TFG < 30', 'Gota ativa'],
    interacoes_importantes: [
      { com: 'Digoxina', severidade: 'grave', descricao: 'Hipocalemia aumenta toxicidade digitálica' },
      { com: 'Lítio', severidade: 'grave', descricao: 'Redução da excreção renal de lítio' },
    ],
    alertas_especiais: ['Monitorar K+, Na+, ácido úrico e glicose', 'Fotossensibilidade'],
    uso_gestante: 'risco', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Hidroclorotiazida Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['25 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
      { nome: 'Clorana', laboratorio: 'Sanofi', concentracoes: ['25 mg', '50 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'carvedilol',
    molecula: 'Carvedilol',
    nome_generico: 'Carvedilol',
    sinonimos: ['carvedilol', 'coreg', 'betabloqueador', 'beta-bloq'],
    categoria: 'cardiovascular',
    classe: 'Beta-bloqueador',
    subclasse: 'Não-seletivo + alfa-1',
    indicacoes_principais: ['IC-FEr', 'HAS', 'Angina'],
    dose_adulto: {
      habitual: '6.25', min: '3.125', max: '50', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia'],
      instrucoes: 'Iniciar 3,125 mg 2x/dia. Dobrar a cada 2 semanas até máx 25 mg 2x/dia (< 85 kg). Tomar com alimentos.',
    },
    ajuste_renal: {
      normal: '3,125–25 mg 2x/dia', tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste (met. hepático)', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela extrema', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Asma ativa', 'BAV 2°/3° grau sem MP', 'Bradicardia sintomática', 'Choque cardiogênico'],
    interacoes_importantes: [
      { com: 'Verapamil', severidade: 'grave', descricao: 'Bradicardia grave e BAV IV' },
      { com: 'Amiodarona', severidade: 'moderada', descricao: 'Bradicardia e hipotensão' },
    ],
    alertas_especiais: ['Nunca suspender abruptamente', 'Mascaramento da hipoglicemia em diabéticos'],
    uso_gestante: 'avaliar', uso_lactante: 'risco',
    marcas: [
      { nome: 'Carvedilol Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['6,25 mg', '12,5 mg', '25 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
      { nome: 'Coreg', laboratorio: 'GSK', concentracoes: ['6,25 mg', '12,5 mg', '25 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'bisoprolol',
    molecula: 'Bisoprolol',
    nome_generico: 'Fumarato de Bisoprolol',
    sinonimos: ['bisoprolol', 'concor', 'bisoprol', 'betabloqueador seletivo'],
    categoria: 'cardiovascular',
    classe: 'Beta-bloqueador',
    subclasse: 'Beta-1 seletivo',
    indicacoes_principais: ['IC-FEr', 'HAS', 'Angina', 'Controle FC em FA'],
    dose_adulto: {
      habitual: '5', min: '1.25', max: '10', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'IC: iniciar 1,25 mg/dia. Dobrar a cada 2 semanas até 10 mg/dia.',
    },
    ajuste_renal: {
      normal: '1,25–10 mg/dia', tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Máx 10 mg/dia, cautela', tfg_lt_15: 'Cautela', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Máx 10 mg/dia', child_b: 'Máx 10 mg/dia', child_c: 'Cautela extrema' },
    contraindicacoes_rapidas: ['Asma grave', 'BAV 2°/3° grau', 'Choque cardiogênico', 'Bradicardia (FC < 50)'],
    interacoes_importantes: [
      { com: 'Verapamil', severidade: 'grave', descricao: 'Risco de parada cardíaca' },
      { com: 'Amiodarona', severidade: 'moderada', descricao: 'Bradicardia sinusal' },
    ],
    alertas_especiais: ['Nunca suspender abruptamente', 'Pode ser usado com cautela na DPOC leve (beta-1 seletivo)'],
    uso_gestante: 'risco', uso_lactante: 'risco',
    marcas: [
      { nome: 'Concor', laboratorio: 'Merck', concentracoes: ['2,5 mg', '5 mg', '10 mg'], formas: ['Comprimido'] },
      { nome: 'Bisoprolol EMS', laboratorio: 'EMS', concentracoes: ['2,5 mg', '5 mg', '10 mg'], formas: ['Comprimido'] },
      { nome: 'Bisoprolol Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['5 mg', '10 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
    ],
  },

  {
    id: 'espironolactona',
    molecula: 'Espironolactona',
    nome_generico: 'Espironolactona',
    sinonimos: ['aldactone', 'espirono', 'arm', 'anti-aldosterona'],
    categoria: 'cardiovascular',
    classe: 'ARM — Antagonista da Aldosterona',
    indicacoes_principais: ['IC-FEr (NYHA II-IV)', 'HAS resistente', 'Hiperaldosteronismo', 'Ascite cirrótica'],
    dose_adulto: {
      habitual: '25', min: '12.5', max: '50', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
    },
    ajuste_renal: {
      normal: '25–50 mg/dia', tfg_60_30: 'Cautela + monitorar K+',
      tfg_30_15: 'Evitar', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cuidado', child_c: 'Pode ser benéfico na ascite' },
    contraindicacoes_rapidas: ['K+ > 5,5 mEq/L', 'TFG < 30', 'Doença de Addison'],
    interacoes_importantes: [
      { com: 'Enalapril', severidade: 'moderada', descricao: 'Hipercalemia' },
      { com: 'Losartana', severidade: 'moderada', descricao: 'Hipercalemia' },
    ],
    alertas_especiais: ['Monitorar K+ e creatinina após 1 semana', 'Ginecomastia dose-dependente'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Espironolactona Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['25 mg', '50 mg', '100 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
      { nome: 'Aldactone', laboratorio: 'Pfizer', concentracoes: ['25 mg', '50 mg', '100 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'furosemida',
    molecula: 'Furosemida',
    nome_generico: 'Furosemida',
    sinonimos: ['furosemide', 'lasix', 'diuretico alca'],
    categoria: 'cardiovascular',
    classe: 'Diurético de Alça',
    indicacoes_principais: ['IC congestiva', 'Edema', 'HAS (DRC avançada)', 'Hipercalcemia'],
    dose_adulto: {
      habitual: '40', min: '20', max: '600', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia (manhã)', '2x/dia', 'dose única'],
      instrucoes: 'Titular conforme sintomas e peso. Dose máxima em casos refratários: 600 mg/dia.',
    },
    dose_pediatrica: {
      calculo: 'mg/kg/dose', dose_por_kg: 1, unidade: 'mg',
      frequencia_divisoes: 2, max_dose_dia: 6, max_dose_dia_unidade: 'mg/kg/dia',
      faixa_etaria: 'Todas as idades',
    },
    ajuste_renal: {
      normal: '20–80 mg/dia', tfg_60_30: 'Pode necessitar doses maiores',
      tfg_30_15: 'Doses maiores podem ser necessárias', tfg_lt_15: 'Preferir em relação a tiazídicos', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cuidado', child_b: 'Cuidado', child_c: 'Risco de encefalopatia' },
    contraindicacoes_rapidas: ['Anúria', 'Hipocalemia grave', 'Coma hepático'],
    interacoes_importantes: [
      { com: 'Aminoglicosídeos', severidade: 'grave', descricao: 'Ototoxicidade e nefrotoxicidade' },
      { com: 'Digoxina', severidade: 'grave', descricao: 'Hipocalemia aumenta toxicidade digitálica' },
    ],
    alertas_especiais: ['Monitorar eletrólitos e hidratação', 'Ototoxicidade com doses altas IV'],
    uso_gestante: 'risco', uso_lactante: 'risco',
    marcas: [
      { nome: 'Furosemida Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['40 mg', '10 mg/mL'], formas: ['Comprimido', 'Solução oral'], lab_id: 'eurofarma' },
      { nome: 'Lasix', laboratorio: 'Sanofi', concentracoes: ['40 mg'], formas: ['Comprimido'] },
    ],
  },

  // ── ESTATINAS ───────────────────────────────────────────────

  {
    id: 'atorvastatina',
    molecula: 'Atorvastatina',
    nome_generico: 'Atorvastatina Cálcica',
    sinonimos: ['lipitor', 'vast', 'atorvastatin', 'estatina', 'colesterol'],
    categoria: 'cardiovascular',
    classe: 'Estatina (Inibidor da HMG-CoA Redutase)',
    indicacoes_principais: ['Dislipidemia', 'Prevenção CV primária e secundária', 'Síndrome coronariana aguda'],
    dose_adulto: {
      habitual: '20', min: '10', max: '80', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia (à noite)'],
      instrucoes: 'Alta intensidade: 40-80 mg/dia. Moderada: 10-20 mg/dia.',
    },
    ajuste_renal: {
      normal: '10–80 mg/dia', tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Cautela', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Evitar', child_b: 'Contraindicado', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hepatopatia ativa', 'Gestação', 'Lactação', 'Rabdomiólise ativa'],
    interacoes_importantes: [
      { com: 'Anlodipino', severidade: 'leve', descricao: 'Leve aumento dos níveis de atorvastatina' },
      { com: 'Claritromicina', severidade: 'moderada', descricao: 'Inibição CYP3A4 — risco de miopatia' },
    ],
    alertas_especiais: ['Monitorar CPK se dor muscular', 'Transaminases antes e após 3 meses'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Lipitor', laboratorio: 'Pfizer', concentracoes: ['10 mg', '20 mg', '40 mg', '80 mg'], formas: ['Comprimido'] },
      { nome: 'Atorvastatina EMS', laboratorio: 'EMS', concentracoes: ['10 mg', '20 mg', '40 mg', '80 mg'], formas: ['Comprimido'] },
      { nome: 'Vast®', laboratorio: 'Eurofarma', concentracoes: ['10 mg', '20 mg', '40 mg', '80 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
    ],
  },

  {
    id: 'rosuvastatina',
    molecula: 'Rosuvastatina',
    nome_generico: 'Rosuvastatina Cálcica',
    sinonimos: ['crestor', 'ruva', 'rosuvastatina', 'estatina potente'],
    categoria: 'cardiovascular',
    classe: 'Estatina (Inibidor da HMG-CoA Redutase)',
    indicacoes_principais: ['Dislipidemia', 'Prevenção CV primária e secundária', 'Síndrome coronariana'],
    dose_adulto: {
      habitual: '10', min: '5', max: '40', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia (qualquer horário)'],
      instrucoes: 'Alta intensidade: 20-40 mg. Iniciar com 5-10 mg em asiáticos (metabolização diferente).',
    },
    ajuste_renal: {
      normal: '5–40 mg/dia', tfg_60_30: 'Máx 20 mg',
      tfg_30_15: 'Máx 10 mg', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Evitar', child_b: 'Contraindicado', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hepatopatia ativa', 'Gestação', 'Miopatia', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Ciclosporina', severidade: 'contraindicado', descricao: 'Aumento extremo dos níveis de rosuvastatina' },
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Potencialização do efeito anticoagulante' },
    ],
    alertas_especiais: ['Ruva® é a marca Eurofarma', 'Monitorar CPK se mialgia'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Ruva®', laboratorio: 'Eurofarma', concentracoes: ['5 mg', '10 mg', '20 mg', '40 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
      { nome: 'Crestor', laboratorio: 'AstraZeneca', concentracoes: ['5 mg', '10 mg', '20 mg', '40 mg'], formas: ['Comprimido'] },
      { nome: 'Rosuvastatina EMS', laboratorio: 'EMS', concentracoes: ['5 mg', '10 mg', '20 mg', '40 mg'], formas: ['Comprimido'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // DIABETES
  // ══════════════════════════════════════════════════════════

  {
    id: 'metformina',
    molecula: 'Metformina',
    nome_generico: 'Cloridrato de Metformina',
    sinonimos: ['glucoformin', 'metformin', 'biguanida', 'diabetes'],
    categoria: 'antidiabético',
    classe: 'Biguanida',
    indicacoes_principais: ['DM2', 'Pré-diabetes (off-label)', 'SOP (off-label)'],
    dose_adulto: {
      habitual: '850', min: '500', max: '3000', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia', '3x/dia'],
      instrucoes: 'Tomar com refeições. Iniciar com 500 mg 2x/dia. Aumentar 500 mg/semana.',
    },
    dose_pediatrica: {
      calculo: 'mg/dia', dose_por_kg: 0, unidade: 'mg',
      frequencia_divisoes: 2, max_dose_dia: 2000, max_dose_dia_unidade: 'mg',
      faixa_etaria: '≥ 10 anos: iniciar 500 mg 2x/dia',
    },
    ajuste_renal: {
      normal: '500–3000 mg/dia', tfg_60_30: 'Reduzir, monitorar',
      tfg_30_15: 'Máx 500 mg/dia + cautela', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Contraindicado', child_b: 'Contraindicado', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['TFG < 30', 'Insuficiência hepática', 'Acidose metabólica', 'Contraste iodado IV em 48h'],
    interacoes_importantes: [
      { com: 'Furosemida', severidade: 'leve', descricao: 'Furosemida pode aumentar níveis de metformina' },
    ],
    alertas_especiais: ['Suspender 48h antes de contraste iodado IV', 'Risco de acidose lática (raro, mas fatal)', 'Monitorar B12 anualmente'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Metformina', laboratorio: 'Eurofarma', concentracoes: ['500 mg', '850 mg', '1000 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
      { nome: 'Glifage', laboratorio: 'Merck', concentracoes: ['500 mg', '850 mg', '1000 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'empagliflozina',
    molecula: 'Empagliflozina',
    nome_generico: 'Empagliflozina',
    sinonimos: ['jardiance', 'sglt2', 'sglt-2', 'glifozina'],
    categoria: 'antidiabético',
    classe: 'SGLT-2',
    indicacoes_principais: ['DM2', 'IC (independente do DM)', 'DRC'],
    dose_adulto: {
      habitual: '10', min: '10', max: '25', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia (manhã)'],
    },
    ajuste_renal: {
      normal: '10–25 mg/dia', tfg_60_30: 'TFG 30-45: apenas para IC/DRC, não para DM',
      tfg_30_15: 'Apenas IC — não para controle glicêmico', tfg_lt_15: 'IC: 10 mg ainda avaliado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Não recomendado' },
    contraindicacoes_rapidas: ['DM tipo 1', 'TFG < 30 (indicação DM)', 'Cetoacidose diabética'],
    interacoes_importantes: [
      { com: 'Insulina', severidade: 'moderada', descricao: 'Risco de hipoglicemia — reduzir insulina 20%' },
    ],
    alertas_especiais: ['Cetoacidose euglicêmica (rara, mas grave)', 'Infecção genital por fungos (5-10%)', 'Amputação (cuidado com feridas nos pés)'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Jardiance', laboratorio: 'Boehringer/Lilly', concentracoes: ['10 mg', '25 mg'], formas: ['Comprimido'] },
      { nome: 'Empagliflozina EMS', laboratorio: 'EMS', concentracoes: ['10 mg', '25 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'sitagliptina',
    molecula: 'Sitagliptina',
    nome_generico: 'Fosfato de Sitagliptina',
    sinonimos: ['januvia', 'dpp4', 'dpp-4', 'gliptina'],
    categoria: 'antidiabético',
    classe: 'DPP-4',
    indicacoes_principais: ['DM2'],
    dose_adulto: {
      habitual: '100', min: '25', max: '100', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
    },
    ajuste_renal: {
      normal: '100 mg/dia', tfg_60_30: '50 mg/dia',
      tfg_30_15: '25 mg/dia', tfg_lt_15: '25 mg/dia', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Dados insuficientes' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'DM tipo 1'],
    interacoes_importantes: [],
    alertas_especiais: ['Pancreatite — risco aumentado de forma controversa', 'Infecção de VAS comum'],
    uso_gestante: 'contraindicado', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Januvia', laboratorio: 'MSD', concentracoes: ['25 mg', '50 mg', '100 mg'], formas: ['Comprimido'] },
      { nome: 'Sitagliptina EMS', laboratorio: 'EMS', concentracoes: ['50 mg', '100 mg'], formas: ['Comprimido'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // RESPIRATÓRIO
  // ══════════════════════════════════════════════════════════

  {
    id: 'salbutamol',
    molecula: 'Salbutamol',
    nome_generico: 'Sulfato de Salbutamol',
    sinonimos: ['albuterol', 'aerolin', 'saba', 'broncodilatador rapido', 'ventolin'],
    categoria: 'respiratory',
    classe: 'SABA (Beta-2 agonista de curta ação)',
    indicacoes_principais: ['Broncoespasmo agudo', 'Asma (resgate)', 'DPOC (resgate)', 'Hipercalemia (EV)'],
    dose_adulto: {
      habitual: '2 jatos', min: '1 jato', max: '4 jatos', unidade: 'mg', via: 'Inalatório',
      frequencias: ['A cada 4-6h', 'Conforme necessidade (resgate)'],
      instrucoes: 'Cada jato = 100 mcg. Usar espaçador. Crise: 2-4 jatos a cada 20 min x 3 vezes.',
    },
    dose_pediatrica: {
      calculo: 'jatos', dose_por_kg: 0, unidade: 'jatos',
      frequencia_divisoes: 1, max_dose_dia: 8, max_dose_dia_unidade: 'jatos/dia (manutenção)',
      faixa_etaria: '> 4 anos: 1-2 jatos. < 4 anos: aerossol com câmara espaçadora',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Beta-bloqueadores', severidade: 'grave', descricao: 'Antagonismo — ineficaz + broncoespasmo paradoxal' },
    ],
    alertas_especiais: ['Não usar como monoterapia em asma — sempre associar ICS', 'Taquicardia e tremores são efeitos comuns'],
    uso_gestante: 'avaliar', uso_lactante: 'seguro',
    marcas: [
      { nome: 'Aerolin', laboratorio: 'GSK', concentracoes: ['100 mcg/jato'], formas: ['Aerossol'] },
      { nome: 'Ventolin', laboratorio: 'GSK', concentracoes: ['100 mcg/jato', '5 mg/mL nebulização'], formas: ['Aerossol', 'Solução'] },
      { nome: 'Salbutamol Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['100 mcg/jato'], formas: ['Aerossol'], lab_id: 'eurofarma' },
    ],
  },

  {
    id: 'budesonida',
    molecula: 'Budesonida',
    nome_generico: 'Budesonida',
    sinonimos: ['noex', 'pulmicort', 'ics', 'corticoide inalatorio'],
    categoria: 'respiratory',
    classe: 'Corticosteroide Inalatório (ICS)',
    indicacoes_principais: ['Asma (manutenção)', 'DPOC (overlap)', 'Rinite alérgica (spray nasal)'],
    dose_adulto: {
      habitual: '400', min: '200', max: '1600', unidade: 'mcg', via: 'Inalatório',
      frequencias: ['2x/dia'],
      instrucoes: 'LAVAR A BOCA após cada uso (candidíase).',
    },
    dose_pediatrica: {
      calculo: 'mcg/dia (dose total)', dose_por_kg: 0, unidade: 'mcg',
      frequencia_divisoes: 2, max_dose_dia: 400, max_dose_dia_unidade: 'mcg/dia',
      faixa_etaria: '> 6 anos: 100-400 mcg/dia',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela (sistêmico aumentado)', child_b: 'Cautela', child_c: 'Monitorar' },
    contraindicacoes_rapidas: ['Broncoespasmo agudo (não é broncodilatador)', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Ritonavir', severidade: 'contraindicado', descricao: 'Síndrome de Cushing iatrogênico' },
    ],
    alertas_especiais: ['Candidíase orofaríngea — lavar boca após uso', 'Uso contínuo — não suspender abruptamente'],
    uso_gestante: 'seguro', uso_lactante: 'seguro',
    marcas: [
      { nome: 'Noex®', laboratorio: 'Eurofarma', concentracoes: ['200 mcg/dose', '400 mcg/dose'], formas: ['Inalatório'], lab_id: 'eurofarma' },
      { nome: 'Pulmicort', laboratorio: 'AstraZeneca', concentracoes: ['200 mcg/dose', '400 mcg/dose'], formas: ['Inalatório'] },
    ],
  },

  {
    id: 'montelucaste',
    molecula: 'Montelucaste',
    nome_generico: 'Montelucaste Sódico',
    sinonimos: ['singulair', 'leucotrieno', 'antileucotriene'],
    categoria: 'respiratory',
    classe: 'Antagonista de Receptor de Leucotrieno',
    indicacoes_principais: ['Asma (coadjuvante)', 'Rinite alérgica', 'Urticária crônica'],
    dose_adulto: {
      habitual: '10', min: '10', max: '10', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia (à noite)'],
    },
    dose_pediatrica: {
      calculo: 'dose fixa por faixa', dose_por_kg: 0, unidade: 'mg',
      frequencia_divisoes: 1, max_dose_dia: 10, max_dose_dia_unidade: 'mg/dia',
      faixa_etaria: '2-5 anos: 4 mg; 6-14 anos: 5 mg; ≥ 15 anos: 10 mg',
    },
    ajuste_renal: { normal: '10 mg/dia', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Cautela extrema' },
    contraindicacoes_rapidas: ['Hipersensibilidade'],
    interacoes_importantes: [],
    alertas_especiais: ['Efeitos neuropsiquiátricos — pesadelos, depressão (raro mas notificar ANVISA)', 'Alerta FDA/ANVISA 2020'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Singulair', laboratorio: 'MSD', concentracoes: ['4 mg', '5 mg', '10 mg'], formas: ['Comprimido mastigável', 'Comprimido'] },
      { nome: 'Montelucaste Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['5 mg', '10 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ANTIBIÓTICOS
  // ══════════════════════════════════════════════════════════

  {
    id: 'amoxicilina',
    molecula: 'Amoxicilina',
    nome_generico: 'Amoxicilina Tri-hidratada',
    sinonimos: ['sinot', 'amoxil', 'amoxicillin', 'penicilina', 'antibiotico', 'amoxicilina'],
    categoria: 'antibiotico',
    classe: 'Penicilina de Amplo Espectro',
    indicacoes_principais: ['PAC leve', 'Otite média', 'Sinusite bacteriana', 'Faringoamigdalite', 'ITU não complicada'],
    dose_adulto: {
      habitual: '875', min: '500', max: '875', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia', '3x/dia'],
      instrucoes: 'Duração: 5-7 dias (PAC), 7-10 dias (outras infecções).',
    },
    dose_pediatrica: {
      calculo: 'mg/kg/dia', dose_por_kg: 45, unidade: 'mg',
      frequencia_divisoes: 2, max_dose_dia: 3000, max_dose_dia_unidade: 'mg/dia',
      faixa_etaria: '2 meses a 12 anos: 25 mg/kg/dia (leve) ou 45 mg/kg/dia (grave) em 2 doses. > 40 kg: dose adulto.',
      observacao: 'Sinot® Susp. 400 mg/5 mL (80 mg/mL): volume por dose = (peso × 45 ÷ 2) ÷ 80. Ex. 27 kg infecção grave: dose = 27×45 = 1215 mg/dia ÷ 2 = 607 mg/dose ÷ 80 = 7,6 mL 2x/dia.',
    },
    ajuste_renal: {
      normal: '500–875 mg 2-3x/dia', tfg_60_30: '500 mg 12/12h',
      tfg_30_15: '500 mg/dia', tfg_lt_15: '250 mg/dia', dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['Alergia a penicilinas ou cefalosporinas (CRUZADA)', 'Mononucleose infecciosa (exantema)'],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Pode aumentar INR — monitorar' },
      { com: 'Metotrexato', severidade: 'grave', descricao: 'Aumento da toxicidade do metotrexato' },
    ],
    alertas_especiais: ['Anafilaxia — ter adrenalina disponível na 1ª dose em alérgicos a beta-lactâmicos', 'Completar tratamento mesmo após melhora'],
    uso_gestante: 'seguro', uso_lactante: 'seguro',
    marcas: [
      { nome: 'Sinot®', laboratorio: 'Eurofarma', concentracoes: ['500 mg', '875 mg', '250 mg/5 mL', '400 mg/5 mL'], formas: ['Cápsula', 'Comprimido', 'Suspensão Oral'], lab_id: 'eurofarma', produto_id: 'euro-sinot', verificado: true },
      { nome: 'Amoxil', laboratorio: 'GSK', concentracoes: ['500 mg', '875 mg', '250 mg/5 mL'], formas: ['Cápsula', 'Comprimido', 'Suspensão'] },
    ],
  },

  {
    id: 'amoxicilina_clavulanato',
    molecula: 'Amoxicilina + Clavulanato',
    nome_generico: 'Amoxicilina Tri-hidratada + Clavulanato de Potássio',
    sinonimos: ['sinot clav', 'clavulin', 'augmentin', 'amoxicilina clavulanato', 'amoxiclav', 'sinot clavulanato'],
    categoria: 'antibiotico',
    classe: 'Aminopenicilina + Inibidor de β-lactamase',
    indicacoes_principais: ['Faringoamigdalite bacteriana recorrente', 'Otite média aguda', 'Sinusite bacteriana', 'Infecções pele/partes moles', 'PAC com cobertura ampliada', 'ITU complicada'],
    dose_adulto: {
      habitual: '875/125', min: '500/125', max: '875/125', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia', '3x/dia'],
      instrucoes: 'Tomar com alimento para reduzir intolerância GI. Faringoamigdalite: 875/125 mg 2x/dia por 10 dias.',
    },
    dose_pediatrica: {
      calculo: 'mg/kg/dia', dose_por_kg: 45, unidade: 'mg',
      frequencia_divisoes: 2, max_dose_dia: 1750, max_dose_dia_unidade: 'mg/dia',
      faixa_etaria: '> 3 meses: 25 mg/kg/dia (leve) ou 45 mg/kg/dia (grave) em 2 doses — referente à fração amoxicilina.',
      observacao: 'Susp. oral 400/57 mg/5 mL (80 mg/mL amoxicilina): dose = (peso × 45 ÷ 2) ÷ 80. Ex. 27 kg/amigdalite: 27×45=1215/2=607 mg/dose ÷ 80 = 7,6 mL 2x/dia. Tomar com alimento.',
    },
    ajuste_renal: {
      normal: '875/125 mg 2x/dia', tfg_60_30: '500/125 mg 2x/dia',
      tfg_30_15: '500/125 mg/dia', tfg_lt_15: 'Não recomendado — clavulanato acumula', dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Monitorar TGO/TGP', child_c: 'Contraindicado (hepatotoxicidade por clavulanato)' },
    contraindicacoes_rapidas: ['Alergia a penicilinas', 'Histórico de icterícia colestática por amoxicilina+clavulanato', 'Mononucleose infecciosa'],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Pode aumentar INR — monitorar' },
      { com: 'Metotrexato', severidade: 'grave', descricao: 'Aumenta toxicidade do metotrexato' },
    ],
    alertas_especiais: ['Diarreia por C. difficile', 'Risco de icterícia colestática — hepatite colestática pode aparecer até 6 sem após suspensão', 'Tomar sempre com alimento'],
    uso_gestante: 'avaliar', uso_lactante: 'seguro',
    marcas: [
      { nome: 'Sinot Clav®', laboratorio: 'Eurofarma', concentracoes: ['250/62,5 mg/5 mL', '400/57 mg/5 mL', '500/125 mg', '875/125 mg'], formas: ['Suspensão Oral', 'Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-sinot-clav', verificado: false },
      { nome: 'Clavulin', laboratorio: 'GSK', concentracoes: ['250/62,5 mg/5 mL', '400/57 mg/5 mL', '500/125 mg', '875/125 mg'], formas: ['Suspensão Oral', 'Comprimido'] },
      { nome: 'Augmentin', laboratorio: 'GSK', concentracoes: ['400/57 mg/5 mL', '875/125 mg'], formas: ['Suspensão Oral', 'Comprimido'] },
    ],
  },

  {
    id: 'azitromicina',
    molecula: 'Azitromicina',
    nome_generico: 'Azitromicina Di-hidratada',
    sinonimos: ['astro', 'zithromax', 'macrolideo', 'antibiotico atipico', 'azitromicina'],
    categoria: 'antibiotico',
    classe: 'Macrolídeo',
    indicacoes_principais: ['PAC (agentes atípicos)', 'DST (clamídia, gonorréia)', 'Otite média', 'Faringoamigdalite', 'Infecções pele'],
    dose_adulto: {
      habitual: '500', min: '250', max: '1000', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'PAC/infecções respiratórias: 500 mg/dia por 3 dias. DST (clamídia): 1 g dose única. DST (gonorréia suscetível): 1 g dose única.',
    },
    dose_pediatrica: {
      calculo: 'mg/kg/dia', dose_por_kg: 10, unidade: 'mg',
      frequencia_divisoes: 1, max_dose_dia: 500, max_dose_dia_unidade: 'mg/dia',
      faixa_etaria: '> 6 meses: 10 mg/kg/dia × 3 dias (máx 500 mg/dia). Otite: 30 mg/kg dose única. Astro® Susp. 200 mg/5 mL: volume = peso(kg) × 10 ÷ 40',
      observacao: 'Astro® Suspensão 200 mg/5 mL (= 40 mg/mL). Comprimido 500 mg somente se > 45 kg.',
    },
    ajuste_renal: {
      normal: '250–500 mg/dia', tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Cautela', tfg_lt_15: 'Não recomendado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Arritmia/QT prolongado', 'Hipersensibilidade a macrolídeos'],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Aumento do INR — monitorar' },
      { com: 'Amiodarona', severidade: 'grave', descricao: 'Prolongamento QT — risco de torsades' },
    ],
    alertas_especiais: ['Monitorar ECG (QT) em cardiopatas', 'Resistência crescente de S. pneumoniae — verificar epidemiologia local'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Astro®', laboratorio: 'Eurofarma', concentracoes: ['500 mg'], formas: ['Comprimido Revestido'], lab_id: 'eurofarma', produto_id: 'euro-astro-500', verificado: true },
      { nome: 'Astro® Suspensão Oral', laboratorio: 'Eurofarma', concentracoes: ['200 mg/5 mL'], formas: ['Suspensão Oral'], lab_id: 'eurofarma', produto_id: 'euro-astro-sus', verificado: true },
      { nome: 'Zithromax', laboratorio: 'Pfizer', concentracoes: ['500 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'ciprofloxacino',
    molecula: 'Ciprofloxacino',
    nome_generico: 'Cloridrato de Ciprofloxacino',
    sinonimos: ['cipro', 'quinolona', 'fluoroquinolona', 'itu', 'infeccao urinaria'],
    categoria: 'antibiotico',
    classe: 'Fluoroquinolona',
    indicacoes_principais: ['ITU complicada', 'Pielonefrite', 'Prostatite bacteriana', 'Infecções entéricas'],
    dose_adulto: {
      habitual: '500', min: '250', max: '750', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia'],
      instrucoes: 'ITU não complicada: 250 mg 2x/dia por 3 dias. Pielonefrite: 500 mg 2x/dia por 7-14 dias.',
    },
    ajuste_renal: {
      normal: '250–750 mg 2x/dia', tfg_60_30: '250-500 mg 2x/dia',
      tfg_30_15: '250-500 mg/dia', tfg_lt_15: '250 mg/dia', dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['< 18 anos (cartilagem)', 'QT prolongado', 'Hipersensibilidade a quinolonas', 'Tendinopatia prévia por quinolonas'],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'grave', descricao: 'Aumento marcado do INR' },
      { com: 'Amiodarona', severidade: 'grave', descricao: 'Prolongamento QT' },
      { com: 'Antiácidos (Al, Mg)', severidade: 'moderada', descricao: 'Redução de 50% da absorção — tomar 2h antes' },
    ],
    alertas_especiais: ['Risco de ruptura de tendão (especialmente > 60 anos + corticoide)', 'Alerta FDA: efeitos adversos graves no SNC e tendões', 'QT prolongado'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Cipro', laboratorio: 'Bayer', concentracoes: ['250 mg', '500 mg', '750 mg'], formas: ['Comprimido'] },
      { nome: 'Ciprofloxacino EMS', laboratorio: 'EMS', concentracoes: ['500 mg'], formas: ['Comprimido'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // PSIQUIATRIA / SNC
  // ══════════════════════════════════════════════════════════

  {
    id: 'sertralina',
    molecula: 'Sertralina',
    nome_generico: 'Cloridrato de Sertralina',
    sinonimos: ['afetus', 'zoloft', 'isrs', 'antidepressivo', 'sertraline'],
    categoria: 'psiquiatria',
    classe: 'ISRS — Inibidor Seletivo da Recaptação de Serotonina',
    indicacoes_principais: ['Depressão maior', 'TOC', 'TEPT', 'Pânico', 'Ansiedade social', 'PMDD'],
    dose_adulto: {
      habitual: '50', min: '25', max: '200', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia (manhã ou noite)'],
      instrucoes: 'Iniciar 25-50 mg/dia. Aumentar 25-50 mg a cada 1-2 semanas conforme tolerância.',
    },
    ajuste_renal: {
      normal: '50–200 mg/dia', tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Cautela', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Metade da dose', child_b: 'Metade da dose ou menor frequência', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['IMAOs (dentro de 14 dias)', 'Pimozida', 'Dissulfiram (gotas — contém álcool)'],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Pode aumentar o risco de sangramento — monitorar INR' },
      { com: 'Tramadol', severidade: 'grave', descricao: 'Síndrome serotoninérgica' },
      { com: 'Lítio', severidade: 'moderada', descricao: 'Síndrome serotoninérgica (raro)' },
    ],
    alertas_especiais: ['Ideação suicida nas primeiras semanas (especialmente < 25 anos) — monitorar', 'Síndrome de descontinuação se suspensão abrupta', 'Efeitos surgem após 2-4 semanas'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Afetus®', laboratorio: 'Eurofarma', concentracoes: ['25 mg', '50 mg', '100 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
      { nome: 'Zoloft', laboratorio: 'Pfizer', concentracoes: ['50 mg', '100 mg'], formas: ['Comprimido'] },
      { nome: 'Sertralina EMS', laboratorio: 'EMS', concentracoes: ['25 mg', '50 mg', '100 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'escitalopram',
    molecula: 'Escitalopram',
    nome_generico: 'Oxalato de Escitalopram',
    sinonimos: ['lexapro', 'isrs', 'antidepressivo', 'ansiedade'],
    categoria: 'psiquiatria',
    classe: 'ISRS',
    indicacoes_principais: ['Depressão maior', 'TAG', 'Pânico', 'Ansiedade social'],
    dose_adulto: {
      habitual: '10', min: '5', max: '20', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Iniciar 5-10 mg/dia. Aumentar após 1 semana para 20 mg se necessário.',
    },
    ajuste_renal: {
      normal: '10–20 mg/dia', tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Cautela', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Máx 10 mg/dia', child_b: 'Máx 10 mg/dia', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['IMAOs', 'Com citalopram (duplicidade)', 'QT prolongado'],
    interacoes_importantes: [
      { com: 'Tramadol', severidade: 'grave', descricao: 'Síndrome serotoninérgica' },
      { com: 'Amiodarona', severidade: 'moderada', descricao: 'Prolongamento QT' },
    ],
    alertas_especiais: ['Monitorar QT em cardiopatas (especialmente dose 20 mg)', 'Síndrome de descontinuação'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Lexapro', laboratorio: 'Lundbeck', concentracoes: ['5 mg', '10 mg', '20 mg'], formas: ['Comprimido'] },
      { nome: 'Escitalopram Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['10 mg', '20 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
    ],
  },

  {
    id: 'desvenlafaxina',
    molecula: 'Desvenlafaxina',
    nome_generico: 'Desvenlafaxina',
    sinonimos: ['desve', 'pristiq', 'irsn', 'antidepressivo'],
    categoria: 'psiquiatria',
    classe: 'IRSN — Inibidor da Recaptação de Serotonina e Noradrenalina',
    indicacoes_principais: ['Depressão maior', 'TAG', 'Fogachos na menopausa'],
    dose_adulto: {
      habitual: '50', min: '50', max: '100', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Dose padrão 50 mg/dia. Não partir/mastigar o comprimido de liberação prolongada.',
    },
    ajuste_renal: {
      normal: '50 mg/dia', tfg_60_30: '50 mg/dia',
      tfg_30_15: '50 mg em dias alternados', tfg_lt_15: '50 mg 2x/semana', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Máx 100 mg/dia', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['IMAOs (dentro de 7 dias)', 'Hipersensibilidade à venlafaxina'],
    interacoes_importantes: [
      { com: 'Tramadol', severidade: 'grave', descricao: 'Síndrome serotoninérgica' },
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Potencialização do efeito anticoagulante' },
    ],
    alertas_especiais: ['Síndrome de descontinuação — reduzir gradualmente', 'Monitorar PA (pode elevar discretamente)', 'Efeito surge após 2-4 semanas'],
    uso_gestante: 'avaliar', uso_lactante: 'risco',
    marcas: [
      { nome: 'Desve®', laboratorio: 'Eurofarma', concentracoes: ['50 mg', '100 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
      { nome: 'Pristiq', laboratorio: 'Pfizer', concentracoes: ['50 mg', '100 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'alprazolam',
    molecula: 'Alprazolam',
    nome_generico: 'Alprazolam',
    sinonimos: ['xanax', 'benzo', 'benzodiazepino', 'ansiolítico', 'controlado'],
    categoria: 'psiquiatria',
    classe: 'Benzodiazepínico',
    indicacoes_principais: ['TAG', 'Pânico', 'Ansiedade situacional', 'Fobia social'],
    dose_adulto: {
      habitual: '0.5', min: '0.25', max: '4', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia', '3x/dia'],
      instrucoes: 'Uso pelo menor tempo necessário. Não suspender abruptamente — reduzir 25%/semana.',
    },
    ajuste_renal: {
      normal: '0,25–0,5 mg 2-3x/dia', tfg_60_30: 'Reduzir dose',
      tfg_30_15: 'Reduzir 50%', tfg_lt_15: 'Cautela extrema', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Reduzir 50%', child_b: 'Reduzir 50-75%', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Miastenia gravis', 'Insuficiência respiratória grave', 'Glaucoma agudo de ângulo fechado', 'Dependência de álcool/benzodiazepínicos'],
    interacoes_importantes: [
      { com: 'Álcool', severidade: 'contraindicado', descricao: 'Depressão SNC grave — depressão respiratória' },
      { com: 'Opioides', severidade: 'grave', descricao: 'Sedação excessiva e depressão respiratória' },
    ],
    alertas_especiais: ['⚠ RECEITA ESPECIAL BRANCA', 'Risco de dependência e tolerância', 'Idosos: alto risco de quedas e confusão'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Xanax', laboratorio: 'Pfizer', concentracoes: ['0,25 mg', '0,5 mg', '1 mg', '2 mg'], formas: ['Comprimido'] },
      { nome: 'Alprazolam Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['0,25 mg', '0,5 mg', '1 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // GASTROENTEROLOGIA
  // ══════════════════════════════════════════════════════════

  {
    id: 'omeprazol',
    molecula: 'Omeprazol',
    nome_generico: 'Omeprazol',
    sinonimos: ['losec', 'ppi', 'ibb', 'antiácido', 'gastrite'],
    categoria: 'gastroenterologia',
    classe: 'Inibidor de Bomba de Prótons (IBP)',
    indicacoes_principais: ['DRGE', 'Úlcera péptica', 'H. pylori (erradicação)', 'AINE + proteção gástrica', 'Sd. Zollinger-Ellison'],
    dose_adulto: {
      habitual: '20', min: '20', max: '40', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia (30 min antes café)', '2x/dia (H. pylori)'],
    },
    dose_pediatrica: {
      calculo: 'mg/kg/dia', dose_por_kg: 0.7, unidade: 'mg',
      frequencia_divisoes: 1, max_dose_dia: 20, max_dose_dia_unidade: 'mg/dia',
      faixa_etaria: '> 1 ano: 0,7-3,3 mg/kg/dia; adulto: 20-40 mg/dia',
    },
    ajuste_renal: {
      normal: '20–40 mg/dia', tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Máx 20 mg/dia', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Máx 20 mg/dia', child_c: 'Máx 20 mg/dia' },
    contraindicacoes_rapidas: ['Hipersensibilidade a IBP ou benzimidazóis'],
    interacoes_importantes: [
      { com: 'Clopidogrel', severidade: 'moderada', descricao: 'Reduz ativação do clopidogrel (evitar — preferir pantoprazol)' },
      { com: 'Metotrexato', severidade: 'moderada', descricao: 'Aumenta toxicidade do metotrexato' },
    ],
    alertas_especiais: ['Deficiência de B12 e magnésio com uso prolongado', 'Risco de Clostridioides difficile', 'Hipomagnesemia com uso > 1 ano'],
    uso_gestante: 'seguro', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Losec', laboratorio: 'AstraZeneca', concentracoes: ['20 mg', '40 mg'], formas: ['Cápsula', 'Comprimido'] },
      { nome: 'Omeprazol Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['20 mg', '40 mg'], formas: ['Cápsula', 'Comprimido'], lab_id: 'eurofarma' },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ANALGÉSICOS
  // ══════════════════════════════════════════════════════════

  {
    id: 'paracetamol',
    molecula: 'Paracetamol',
    nome_generico: 'Paracetamol (Acetaminofen)',
    sinonimos: ['tylenol', 'acetaminophen', 'analgesico', 'dipirona alternativa', 'febre'],
    categoria: 'analgesico',
    classe: 'Analgésico/Antipirético',
    indicacoes_principais: ['Dor leve a moderada', 'Febre', 'Cefaleia'],
    dose_adulto: {
      habitual: '500', min: '325', max: '1000', unidade: 'mg', via: 'VO',
      frequencias: ['A cada 4-6h', 'A cada 8h'],
      instrucoes: 'Dose máxima: 4000 mg/dia (adulto saudável). Hepatopatas: máx 2000 mg/dia.',
    },
    dose_pediatrica: {
      calculo: 'mg/kg/dose', dose_por_kg: 15, unidade: 'mg',
      frequencia_divisoes: 4, max_dose_dia: 60, max_dose_dia_unidade: 'mg/kg/dia',
      faixa_etaria: 'Todas as idades: 10-15 mg/kg/dose a cada 4-6h',
    },
    ajuste_renal: {
      normal: '325–1000 mg 4-6/4-6h', tfg_60_30: 'Sem ajuste',
      tfg_30_15: 'Aumentar intervalo para 6-8h', tfg_lt_15: 'Intervalo 8h', dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Máx 2000 mg/dia', child_b: 'Máx 2000 mg/dia', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['Hepatite aguda ativa', 'Uso concomitante de outros produtos com paracetamol'],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Paracetamol > 2g/dia por > 1 semana aumenta INR' },
      { com: 'Álcool', severidade: 'grave', descricao: 'Hepatotoxicidade aumentada com uso crônico de álcool' },
    ],
    alertas_especiais: ['Principal causa de insuficiência hepática aguda nos EUA — respeitar dose máxima', 'Verificar outros produtos com paracetamol em uso (Tylenol flu, etc.)'],
    uso_gestante: 'seguro', uso_lactante: 'seguro',
    marcas: [
      { nome: 'Tylenol', laboratorio: 'J&J', concentracoes: ['500 mg', '750 mg'], formas: ['Comprimido', 'Solução'] },
      { nome: 'Paracetamol Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['500 mg', '750 mg'], formas: ['Comprimido', 'Solução oral'], lab_id: 'eurofarma' },
    ],
  },

  {
    id: 'dipirona',
    molecula: 'Dipirona',
    nome_generico: 'Dipirona Monoidratada (Metamizol)',
    sinonimos: ['novalgina', 'metamizol', 'metamizole', 'analgesico', 'febre'],
    categoria: 'analgesico',
    classe: 'Analgésico/Antipirético/Espasmolítico',
    indicacoes_principais: ['Dor', 'Febre', 'Cólica renal/biliar'],
    dose_adulto: {
      habitual: '1000', min: '500', max: '1000', unidade: 'mg', via: 'VO',
      frequencias: ['A cada 6-8h'],
      instrucoes: 'Dose máxima: 4000 mg/dia. Gotas: 1 mL = 500 mg.',
    },
    dose_pediatrica: {
      calculo: 'mg/kg/dose', dose_por_kg: 10, unidade: 'mg',
      frequencia_divisoes: 4, max_dose_dia: 50, max_dose_dia_unidade: 'mg/kg/dia',
      faixa_etaria: '> 3 meses: 10-15 mg/kg/dose; VO: 1 gota/kg/dose',
    },
    ajuste_renal: {
      normal: '500–1000 mg 3-4x/dia', tfg_60_30: 'Aumentar intervalo',
      tfg_30_15: 'Evitar', tfg_lt_15: 'Evitar', dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Agranulocitose prévia por dipirona', 'Porfiria aguda', 'Deficiência de G6PD', '< 3 meses de idade'],
    interacoes_importantes: [
      { com: 'Ciclosporina', severidade: 'moderada', descricao: 'Redução dos níveis de ciclosporina' },
    ],
    alertas_especiais: ['⚠ Agranulocitose (rara, 1:1 milhão): suspender se febre alta, úlceras orais, calafrios', 'Proibida em muitos países — disponível no Brasil'],
    uso_gestante: 'contraindicado', uso_lactante: 'risco',
    marcas: [
      { nome: 'Novalgina', laboratorio: 'Sanofi', concentracoes: ['500 mg', '500 mg/mL gotas'], formas: ['Comprimido', 'Gotas'] },
      { nome: 'Dipirona Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['500 mg', '500 mg/mL'], formas: ['Comprimido', 'Gotas', 'Solução injetável'], lab_id: 'eurofarma' },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // DIABETES — iSGLT2 / GLP-1 / Sulfonilureia 3ª Geração
  // ══════════════════════════════════════════════════════════

  {
    id: 'dapagliflozina',
    molecula: 'Dapagliflozina',
    nome_generico: 'Dapagliflozina',
    sinonimos: ['glif', 'dapa', 'sglt2', 'forxiga', 'isglt2', 'glifozina'],
    categoria: 'antidiabético',
    classe: 'iSGLT2',
    indicacoes_principais: ['DM2', 'IC-FEr (NYHA II-IV)', 'DRC com proteinúria'],
    dose_adulto: {
      habitual: '10', max: '10', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Independente de refeições. Não iniciar em TFG < 25 mL/min (DM2).',
    },
    ajuste_renal: {
      normal: '10 mg/dia', tfg_60_30: '10 mg/dia (efeito glicêmico reduzido)', tfg_30_15: 'Apenas para IC/DRC (não para DM2)', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    contraindicacoes_rapidas: ['DM1', 'Cetoacidose diabética', 'TFG < 25 mL/min (indicação DM2)'],
    interacoes_importantes: [
      { com: 'Insulina', severidade: 'moderada', descricao: 'Risco de hipoglicemia — reduzir insulina ao iniciar' },
      { com: 'Diuréticos', severidade: 'leve', descricao: 'Depleção de volume — monitorar PA e hidratação' },
    ],
    alertas_especiais: ['Suspender 3 dias antes de cirurgia (cetoacidose euglicêmica)', 'Infecções genitais fúngicas (frequente)', 'Poliúria'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Glif®', laboratorio: 'Eurofarma', concentracoes: ['10 mg'], formas: ['Comprimido revestido'], lab_id: 'eurofarma', produto_id: 'euro-glif', verificado: true },
      { nome: 'Forxiga', laboratorio: 'AstraZeneca', concentracoes: ['10 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'semaglutida',
    molecula: 'Semaglutida',
    nome_generico: 'Semaglutida',
    sinonimos: ['extensior', 'ozempic', 'wegovy', 'glp1', 'ar-glp1', 'semaglutide'],
    categoria: 'antidiabético',
    classe: 'AR-GLP-1',
    indicacoes_principais: ['DM2', 'Obesidade (IMC ≥ 30 ou ≥ 27 + comorbidade)', 'Prevenção CV'],
    dose_adulto: {
      habitual: '0.5', min: '0.25', max: '2', unidade: 'mg', via: 'SC',
      frequencias: ['1x/semana'],
      instrucoes: 'Titular: 0,25 mg/semana × 4 sem → 0,5 mg × 4 sem → 1 mg (DM2) ou até 2,4 mg (obesidade).',
    },
    ajuste_renal: {
      normal: 'Titular normalmente', tfg_60_30: 'Sem ajuste (dados disponíveis)', tfg_30_15: 'Cautela (dados limitados)', tfg_lt_15: 'Não recomendado', dialisavel: false,
    },
    contraindicacoes_rapidas: ['NEM tipo 2', 'Histórico de carcinoma medular de tireoide (pessoal ou familiar)', 'Gravidez'],
    interacoes_importantes: [
      { com: 'Insulina', severidade: 'moderada', descricao: 'Hipoglicemia — reduzir insulina ao iniciar' },
    ],
    alertas_especiais: ['Retenção especial ANVISA', 'Pancreatite: suspender se dor abdominal intensa', 'Náuseas comuns no início (transitórias)'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Extensior®', laboratorio: 'Eurofarma', concentracoes: ['0,25 mg/dose', '0,5 mg/dose', '1 mg/dose'], formas: ['Solução injetável SC'], lab_id: 'eurofarma', produto_id: 'euro-extensior', verificado: true },
      { nome: 'Ozempic', laboratorio: 'Novo Nordisk', concentracoes: ['0,25 mg/dose', '0,5 mg/dose', '1 mg/dose'], formas: ['Solução injetável SC'] },
    ],
  },

  {
    id: 'glimepirida',
    molecula: 'Glimepirida',
    nome_generico: 'Glimepirida',
    sinonimos: ['betes', 'amaryl', 'sulfonilureia', 'glimepiride'],
    categoria: 'antidiabético',
    classe: 'Sulfonilureia',
    indicacoes_principais: ['DM2'],
    dose_adulto: {
      habitual: '2', min: '1', max: '8', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Tomar ao café da manhã. Titular a cada 1–2 semanas.',
    },
    ajuste_renal: {
      normal: '1–8 mg/dia', tfg_60_30: 'Cautela', tfg_30_15: 'Evitar', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['DM1', 'Cetoacidose', 'IR/IH grave', 'Hipersensibilidade a sulfonamidas'],
    interacoes_importantes: [
      { com: 'Fluconazol', severidade: 'grave', descricao: 'Potencializa hipoglicemia (inibição CYP2C9)' },
      { com: 'Beta-bloqueadores', severidade: 'moderada', descricao: 'Mascara sintomas de hipoglicemia (exceto sudorese)' },
    ],
    alertas_especiais: ['Menor risco de hipoglicemia que glibenclamida', 'Preferida em idosos (vs glibenclamida)'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Betes®', laboratorio: 'Eurofarma', concentracoes: ['2 mg', '4 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-betes', verificado: true },
      { nome: 'Amaryl', laboratorio: 'Sanofi', concentracoes: ['1 mg', '2 mg', '4 mg'], formas: ['Comprimido'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // SAÚDE MENTAL — Novos
  // ══════════════════════════════════════════════════════════

  {
    id: 'duloxetina',
    molecula: 'Duloxetina',
    nome_generico: 'Cloridrato de Duloxetina',
    sinonimos: ['dep', 'cymbalta', 'irsn', 'duloxetine'],
    categoria: 'psiquiatria',
    classe: 'IRSN',
    indicacoes_principais: ['Transtorno Depressivo Maior', 'TAG', 'Neuropatia diabética dolorosa', 'Fibromialgia', 'Dor musculoesquelética crônica'],
    dose_adulto: {
      habitual: '60', min: '30', max: '120', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Não abrir cápsula. Iniciar com 30 mg/dia por 1 semana.',
    },
    ajuste_renal: {
      normal: '60 mg/dia', tfg_60_30: 'Cautela', tfg_30_15: 'Evitar', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['IMAOs (washout 14 dias)', 'IH grave', 'ClCr < 30 mL/min', 'HAS não controlada'],
    interacoes_importantes: [
      { com: 'IMAOs', severidade: 'contraindicado', descricao: 'Síndrome serotoninérgica grave' },
      { com: 'Paroxetina/Fluoxetina', severidade: 'moderada', descricao: 'Inibidores CYP2D6 — aumentam nível de duloxetina' },
      { com: 'AINE/Aspirina', severidade: 'moderada', descricao: 'Sangramento aumentado' },
    ],
    alertas_especiais: ['Aumenta PA — monitorar', 'Síndrome de descontinuação (não suspender abruptamente)', 'Ideação suicida (< 25 anos — monitorar primeiras semanas)'],
    uso_gestante: 'avaliar', uso_lactante: 'risco',
    marcas: [
      { nome: 'Dep®', laboratorio: 'Eurofarma', concentracoes: ['30 mg', '60 mg'], formas: ['Cápsula lib. retardada'], lab_id: 'eurofarma', produto_id: 'euro-dep', verificado: true },
      { nome: 'Cymbalta', laboratorio: 'Lilly', concentracoes: ['30 mg', '60 mg'], formas: ['Cápsula'] },
    ],
  },

  {
    id: 'vortioxetina',
    molecula: 'Vortioxetina',
    nome_generico: 'Bromidrato de Vortioxetina',
    sinonimos: ['vod', 'brintellix', 'vortioxetine', 'multimodal', 'antidepressivo multimodal'],
    categoria: 'psiquiatria',
    classe: 'Antidepressivo Multimodal',
    indicacoes_principais: ['Transtorno Depressivo Maior (TDM)'],
    dose_adulto: {
      habitual: '10', min: '5', max: '20', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Qualquer horário, independente de refeição. Titulação conforme tolerância.',
    },
    ajuste_renal: {
      normal: '5–20 mg/dia', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste (dados limitados)', tfg_lt_15: 'Cautela', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Evitar (dados insuficientes)' },
    contraindicacoes_rapidas: ['IMAOs (washout 14 dias)', 'Menores de 18 anos', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'IMAOs', severidade: 'contraindicado', descricao: 'Síndrome serotoninérgica grave' },
      { com: 'Paroxetina/Fluoxetina', severidade: 'moderada', descricao: 'Inibidores CYP2D6 — aumentam nível; reduzir vortioxetina 50%' },
      { com: 'Rifampicina', severidade: 'moderada', descricao: 'Indutor CYP — aumentar vortioxetina até 3×' },
    ],
    alertas_especiais: ['Retenção especial ANVISA', 'Mecanismo único: inibe recaptação 5-HT + modula receptores 5-HT1A/1B/3/7 e 5-HT1D', 'Melhora da função cognitiva (memória, concentração)'],
    uso_gestante: 'avaliar', uso_lactante: 'risco',
    marcas: [
      { nome: 'Vod®', laboratorio: 'Eurofarma', concentracoes: ['5 mg', '10 mg', '15 mg', '20 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-vod', verificado: true },
      { nome: 'Brintellix', laboratorio: 'Lundbeck/Takeda', concentracoes: ['5 mg', '10 mg', '15 mg', '20 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'risperidona',
    molecula: 'Risperidona',
    nome_generico: 'Risperidona',
    sinonimos: ['riss', 'risperdal', 'antipsicótico', 'atípico', 'risperidone'],
    categoria: 'psiquiatria',
    classe: 'Antipsicótico Atípico',
    indicacoes_principais: ['Esquizofrenia', 'Transtorno Bipolar (mania aguda)', 'TEA (irritabilidade)', 'Depressão com psicose (adjuvante)'],
    dose_adulto: {
      habitual: '4', min: '1', max: '16', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
      instrucoes: 'Iniciar com 2 mg/dia; titular 1–2 mg a cada 2 semanas. Dose usual esquizofrenia: 4–8 mg/dia.',
    },
    ajuste_renal: {
      normal: '4–8 mg/dia', tfg_60_30: 'Iniciar 0,5 mg 2x/dia', tfg_30_15: 'Iniciar 0,5 mg 2x/dia; titular lentamente', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela; dose inicial 0,5 mg 2x/dia', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Demência com psicose (Black Box — AVC/morte)'],
    interacoes_importantes: [
      { com: 'Paroxetina/Fluoxetina', severidade: 'moderada', descricao: 'CYP2D6 — aumentam nível de risperidona' },
      { com: 'Carbamazepina', severidade: 'moderada', descricao: 'Reduz nível de risperidona (indução CYP3A4)' },
      { com: 'QT-prolongadores', severidade: 'moderada', descricao: 'Risco de prolongamento QT' },
    ],
    alertas_especiais: ['Retenção especial ANVISA', 'Síndrome metabólica: monitorar peso, glicose, lipídios', 'Hiperprolactinemia (amenorreia, galactorreia, disfunção sexual)', '⚠ BEERS: alto risco em idosos com demência'],
    uso_gestante: 'avaliar', uso_lactante: 'risco',
    marcas: [
      { nome: 'Riss®', laboratorio: 'Eurofarma', concentracoes: ['1 mg', '2 mg', '3 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-riss', verificado: true },
      { nome: 'Risperdal', laboratorio: 'Janssen', concentracoes: ['1 mg', '2 mg', '3 mg'], formas: ['Comprimido'] },
      { nome: 'Risperidona EMS', laboratorio: 'EMS', concentracoes: ['1 mg', '2 mg', '3 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'zolpidem',
    molecula: 'Zolpidem',
    nome_generico: 'Hemitartarato de Zolpidem',
    sinonimos: ['turno', 'stilnox', 'zolpidem', 'hipnotico', 'insonia'],
    categoria: 'psiquiatria',
    classe: 'Hipnótico Não-Benzodiazepínico',
    indicacoes_principais: ['Insônia (curto prazo — máximo 4 semanas)'],
    dose_adulto: {
      habitual: '10', min: '5', max: '10', unidade: 'mg', via: 'VO',
      frequencias: ['1x/noite'],
      instrucoes: 'Imediatamente antes de deitar. Mulheres e idosos: 5 mg. Retenção especial ANVISA.',
    },
    ajuste_renal: {
      normal: '10 mg (homens); 5 mg (mulheres/idosos)', tfg_60_30: 'Sem ajuste formal; monitorar', tfg_30_15: 'Cautela', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: '5 mg', child_b: '5 mg', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Apneia do sono grave não tratada', 'Miastenia gravis', 'IH grave', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Álcool', severidade: 'grave', descricao: 'Depressão grave do SNC — CONTRAINDICADO combinar' },
      { com: 'Cetoconazol', severidade: 'moderada', descricao: 'CYP3A4 — aumenta nível de zolpidem' },
    ],
    alertas_especiais: ['Retenção especial ANVISA', 'Comportamentos complexos do sono (sonambulismo, comer dormindo, dirigir dormindo)', '⚠ BEERS: risco em idosos (quedas, confusão)', 'Uso máximo: 4 semanas'],
    uso_gestante: 'avaliar', uso_lactante: 'risco',
    marcas: [
      { nome: 'Turno®', laboratorio: 'Eurofarma', concentracoes: ['10 mg'], formas: ['Comprimido revestido'], lab_id: 'eurofarma', produto_id: 'euro-turno', verificado: true },
      { nome: 'Turno SL®', laboratorio: 'Eurofarma', concentracoes: ['5 mg'], formas: ['Comprimido sublingual'], lab_id: 'eurofarma', produto_id: 'euro-turno-sl', verificado: true },
      { nome: 'Turno XR®', laboratorio: 'Eurofarma', concentracoes: ['6,25 mg', '12,5 mg'], formas: ['Comprimido lib. prolongada'], lab_id: 'eurofarma', produto_id: 'euro-turno-xr', verificado: true },
      { nome: 'Stilnox', laboratorio: 'Sanofi', concentracoes: ['10 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'eszopiclona',
    molecula: 'Eszopiclona',
    nome_generico: 'Eszopiclona',
    sinonimos: ['prysma', 'lunesta', 'eszopiclone', 'hipnotico', 'insonia'],
    categoria: 'psiquiatria',
    classe: 'Hipnótico Não-Benzodiazepínico',
    indicacoes_principais: ['Insônia (iniciação e manutenção do sono)'],
    dose_adulto: {
      habitual: '2', min: '1', max: '3', unidade: 'mg', via: 'VO',
      frequencias: ['1x/noite'],
      instrucoes: 'Imediatamente antes de deitar. CI: > 65 anos e < 18 anos. Retenção especial ANVISA.',
    },
    ajuste_renal: {
      normal: '1–3 mg', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Cautela', dialisavel: false,
    },
    ajuste_hepatico: { child_a: '1 mg', child_b: '1 mg', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['> 65 anos', '< 18 anos', 'IH grave', 'Apneia do sono grave', 'Miastenia gravis'],
    interacoes_importantes: [
      { com: 'Álcool', severidade: 'grave', descricao: 'Depressão grave do SNC' },
      { com: 'Cetoconazol', severidade: 'moderada', descricao: 'Inibidor CYP3A4 — aumenta eszopiclona' },
    ],
    alertas_especiais: ['Retenção especial ANVISA', 'Paladar metálico amargo (característico)', 'Comportamentos complexos do sono', 'Tolerância em uso prolongado (> 3–6 meses)'],
    uso_gestante: 'avaliar', uso_lactante: 'risco',
    marcas: [
      { nome: 'Prysma®', laboratorio: 'Eurofarma', concentracoes: ['1 mg', '2 mg', '3 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-prysma', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ANALGÉSICOS / ANTI-INFLAMATÓRIOS — Novos
  // ══════════════════════════════════════════════════════════

  {
    id: 'celecoxibe',
    molecula: 'Celecoxibe',
    nome_generico: 'Celecoxibe',
    sinonimos: ['coques', 'celebra', 'cox2', 'coxibe', 'celecoxib'],
    categoria: 'antiinflamatorio',
    classe: 'AINE — Coxibe (seletivo COX-2)',
    indicacoes_principais: ['Artrite Reumatoide', 'Osteoartrite', 'Espondilite anquilosante', 'Dor aguda'],
    dose_adulto: {
      habitual: '200', min: '100', max: '400', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
    },
    ajuste_renal: {
      normal: '200–400 mg/dia', tfg_60_30: 'Cautela', tfg_30_15: 'Evitar', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Reduzir 50%', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Alergia a sulfonamidas', 'Pós-CRM imediato', 'IR/IH grave', 'Gestação 3º trimestre'],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Aumenta INR — monitorar' },
      { com: 'Fluconazol', severidade: 'moderada', descricao: 'Inibidor CYP2C9 — aumenta celecoxibe significativamente' },
    ],
    alertas_especiais: ['Menor risco GI que AINEs não-seletivos', 'Mesmo risco CV que AINEs (usar com cautela em coronariopatas)', 'Cautela: alergia a sulfonamidas'],
    uso_gestante: 'contraindicado', uso_lactante: 'risco',
    marcas: [
      { nome: 'Coques®', laboratorio: 'Eurofarma', concentracoes: ['200 mg'], formas: ['Cápsula'], lab_id: 'eurofarma', produto_id: 'euro-coques', verificado: true },
      { nome: 'Celebra', laboratorio: 'Pfizer', concentracoes: ['100 mg', '200 mg'], formas: ['Cápsula'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // NEUROLÓGICO — Novos
  // ══════════════════════════════════════════════════════════

  {
    id: 'topiramato',
    molecula: 'Topiramato',
    nome_generico: 'Topiramato',
    sinonimos: ['amato', 'topamax', 'anticonvulsivante', 'epilepsia', 'enxaqueca'],
    categoria: 'neurologico',
    classe: 'Anticonvulsivante',
    indicacoes_principais: ['Epilepsia focal', 'Epilepsia generalizada', 'Profilaxia de enxaqueca'],
    dose_adulto: {
      habitual: '100', min: '25', max: '400', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia'],
      instrucoes: 'Titular lentamente: 25–50 mg/semana. Pode ser tomado com ou sem alimentos.',
    },
    ajuste_renal: {
      normal: '100–400 mg/dia', tfg_60_30: 'Reduzir 50%', tfg_30_15: 'Reduzir 50%', tfg_lt_15: 'Evitar', dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste formal', child_b: 'Cautela', child_c: 'Cautela extrema' },
    contraindicacoes_rapidas: ['Gravidez (Cat. D — fenda palatina)', 'Hipersensibilidade', 'Litíase renal recorrente com hipercalciúria'],
    interacoes_importantes: [
      { com: 'Valproato', severidade: 'moderada', descricao: 'Hiperamonemia — monitorar amônia sérica' },
      { com: 'Anticoncepcionais orais', severidade: 'moderada', descricao: 'Reduz eficácia — usar método adicional' },
      { com: 'Carbamazepina', severidade: 'moderada', descricao: 'Reduz nível de topiramato (indução CYP3A4)' },
    ],
    alertas_especiais: ['Cat. D — CONTRAINDICADO na gravidez (fenda palatina, labioschisis)', 'Hipertermia/hipoidrose (cautela em crianças e no verão)', 'Glaucoma agudo de ângulo fechado (descontinuar imediatamente)', 'Nefrolitíase — hidratação', 'Perda de peso (pode ser desejada ou indesejada)'],
    uso_gestante: 'contraindicado', uso_lactante: 'risco',
    marcas: [
      { nome: 'Amato®', laboratorio: 'Eurofarma', concentracoes: ['25 mg', '50 mg', '100 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-amato', verificado: true },
      { nome: 'Topamax', laboratorio: 'Janssen', concentracoes: ['25 mg', '50 mg', '100 mg', '200 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'pramipexol',
    molecula: 'Pramipexol',
    nome_generico: 'Dicloridrato de Pramipexol',
    sinonimos: ['pisa', 'mirapex', 'pramipexole', 'parkinson', 'spi', 'agonista dopaminergico'],
    categoria: 'neurologico',
    classe: 'Agonista Dopaminérgico D2/D3',
    indicacoes_principais: ['Doença de Parkinson', 'Síndrome das Pernas Inquietas (SPI)'],
    dose_adulto: {
      habitual: '1.5', min: '0.375', max: '4.5', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'LP: 1x/dia qualquer horário. Titular: aumentar 0,75 mg/semana a cada 5–7 dias.',
    },
    ajuste_renal: {
      normal: '0,375–4,5 mg/dia', tfg_60_30: 'Titular mais lentamente', tfg_30_15: 'Máx 2,25 mg/dia', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'ClCr < 20 mL/min'],
    interacoes_importantes: [
      { com: 'Metoclopramida', severidade: 'grave', descricao: 'Antagonismo dopaminérgico — reduz efeito; usar domperidona se necessário' },
      { com: 'Levodopa', severidade: 'leve', descricao: 'Efeito aditivo — possível potencialização; monitorar discinesias' },
    ],
    alertas_especiais: ['Retenção especial ANVISA', 'Controle de impulsos (jogo, hipersexualidade, compulsão): alertar paciente e familiar', 'Sonolência súbita (não dirigir até confirmar tolerância)', 'Augmentation na SPI (aumentar necessidade de dose com tempo)'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Pisa®', laboratorio: 'Eurofarma', concentracoes: ['0,375 mg', '0,75 mg', '1,5 mg'], formas: ['Comprimido lib. prolongada'], lab_id: 'eurofarma', produto_id: 'euro-pisa', verificado: true },
      { nome: 'Mirapex ER', laboratorio: 'Boehringer', concentracoes: ['0,375 mg', '0,75 mg', '1,5 mg', '3 mg'], formas: ['Comprimido lib. prolongada'] },
    ],
  },

  {
    id: 'betaistina',
    molecula: 'Betaistina',
    nome_generico: 'Dicloridrato de Betaistina',
    sinonimos: ['betina', 'serc', 'betahistine', 'vertigem', 'meniere'],
    categoria: 'neurologico',
    classe: 'Antivertiginoso — Análogo da Histamina',
    indicacoes_principais: ['Doença de Ménière', 'Vertigem vestibular'],
    dose_adulto: {
      habitual: '24', min: '16', max: '48', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia', '3x/dia'],
      instrucoes: 'Tomar às refeições. Efeito máximo em 2–4 semanas.',
    },
    ajuste_renal: {
      normal: '16–48 mg/dia', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Cautela', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['Feocromocitoma', 'Hipersensibilidade'],
    interacoes_importantes: [],
    alertas_especiais: ['Asma: cautela (pode potencializar broncoespasmo)', 'Úlcera péptica ativa: cautela'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Betina®', laboratorio: 'Eurofarma', concentracoes: ['16 mg', '24 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-betina', verificado: true },
      { nome: 'Serc', laboratorio: 'Abbott', concentracoes: ['8 mg', '16 mg', '24 mg'], formas: ['Comprimido'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CARDIOVASCULAR — Novos
  // ══════════════════════════════════════════════════════════

  {
    id: 'enoxaparina',
    molecula: 'Enoxaparina',
    nome_generico: 'Enoxaparina Sódica',
    sinonimos: ['versa', 'clexane', 'hbpm', 'anticoagulante', 'enoxaparin', 'heparina baixo peso'],
    categoria: 'cardiovascular',
    classe: 'Anticoagulante — HBPM',
    indicacoes_principais: ['Profilaxia de TVP (cirurgia, internação)', 'Tratamento de TVP/TEP', 'SCA (UA/IAMSST)', 'Anticoagulação na gestação'],
    dose_adulto: {
      habitual: '40', min: '20', max: '80', unidade: 'mg', via: 'SC',
      frequencias: ['1x/dia (profilaxia)', '12/12h (tratamento)'],
      instrucoes: 'Profilaxia: 40 mg SC 1x/dia. Tratamento: 1 mg/kg SC 12/12h.',
    },
    ajuste_renal: {
      normal: '40 mg/dia (profilaxia) ou 1 mg/kg 12/12h (tratamento)', tfg_60_30: 'Monitorar anti-Xa', tfg_30_15: 'Reduzir: profilaxia 20 mg/dia; tratamento 1 mg/kg 1x/dia', tfg_lt_15: 'Evitar ou usar apenas com monitoração anti-Xa', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Evitar (trombocitopenia, sangramento)' },
    contraindicacoes_rapidas: ['Sangramento ativo maior', 'HIT (trombocitopenia induzida por heparina)', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Sangramento aditivo — monitorar durante transição' },
      { com: 'AINE/Aspirina', severidade: 'moderada', descricao: 'Risco hemorrágico aumentado' },
    ],
    alertas_especiais: ['Monitorar plaquetas (HIT entre 5–10 dias)', 'Preferida na gravidez (não atravessa placenta)', 'Anti-Xa em obesos, IR, gestantes'],
    uso_gestante: 'seguro', uso_lactante: 'seguro',
    marcas: [
      { nome: 'Versa®', laboratorio: 'Eurofarma', concentracoes: ['20 mg', '40 mg', '60 mg', '80 mg'], formas: ['Solução injetável SC'], lab_id: 'eurofarma', produto_id: 'euro-versa', verificado: true },
      { nome: 'Clexane', laboratorio: 'Sanofi', concentracoes: ['20 mg', '40 mg', '60 mg', '80 mg', '100 mg'], formas: ['Solução injetável'] },
    ],
  },

  {
    id: 'aas',
    molecula: 'Ácido Acetilsalicílico',
    nome_generico: 'Ácido Acetilsalicílico (AAS)',
    sinonimos: ['saliprevi', 'aspirina', 'aas', 'aspirin', 'antiagregante'],
    categoria: 'cardiovascular',
    classe: 'Antiagregante Plaquetário — Inibidor COX Irreversível',
    indicacoes_principais: ['Prevenção CV secundária (IAM, AVC, Angina)', 'SCA', 'Prevenção primária em alto risco (selecionado)'],
    dose_adulto: {
      habitual: '100', min: '75', max: '325', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Dose baixa (100 mg) para antiagregação. Preferir formulação entérica para proteção gástrica.',
    },
    ajuste_renal: {
      normal: '100 mg/dia', tfg_60_30: 'Sem ajuste (cautela — maior risco sangramento)', tfg_30_15: 'Evitar doses analgésicas', tfg_lt_15: 'Evitar doses analgésicas', dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar (sangramento GI)', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Sangramento ativo', 'Úlcera péptica ativa', 'Alergia a AINEs', '< 16 anos (Síndrome de Reye)', 'Gestação 3º trimestre'],
    interacoes_importantes: [
      { com: 'Ibuprofeno', severidade: 'moderada', descricao: 'Ibuprofeno bloqueia sítio da COX — tomar AAS 2h antes de ibuprofeno' },
      { com: 'Varfarina', severidade: 'grave', descricao: 'Sangramento aumentado — monitorar INR e sinais de sangramento' },
      { com: 'Clopidogrel', severidade: 'moderada', descricao: 'Dupla antiagregação: indicada em SCA/stent; risco GI — associar IBP' },
    ],
    alertas_especiais: ['Resistência em ~25% dos pacientes', 'Suspender 7 dias antes de cirurgia eletiva (exceto CV)', 'Associar IBP em risco GI alto (idosos, úlcera prévia, dupla antiagregação)'],
    uso_gestante: 'risco', uso_lactante: 'risco',
    marcas: [
      { nome: 'Saliprevi®', laboratorio: 'Eurofarma', concentracoes: ['100 mg'], formas: ['Comprimido gastrorresistente'], lab_id: 'eurofarma', produto_id: 'euro-saliprevi', verificado: true },
      { nome: 'AAS Bayer', laboratorio: 'Bayer', concentracoes: ['100 mg'], formas: ['Comprimido gastrorresistente'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // INFECTOLOGIA — Novos
  // ══════════════════════════════════════════════════════════

  {
    id: 'valaciclovir',
    molecula: 'Valaciclovir',
    nome_generico: 'Cloridrato de Valaciclovir',
    sinonimos: ['vilaxy', 'valtrex', 'valacyclovir', 'herpes', 'zoster', 'hsv'],
    categoria: 'antibiotico',
    classe: 'Antiviral — Pró-fármaco do Aciclovir',
    indicacoes_principais: ['Herpes zoster', 'HSV genital (1º episódio e recorrências)', 'Herpes labial', 'Supressão de HSV recorrente'],
    dose_adulto: {
      habitual: '1000', min: '500', max: '3000', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia', '3x/dia'],
      instrucoes: 'Zoster: 1 g 3x/dia × 7 dias. HSV genital 1º ep.: 1 g 2x/dia × 10 dias. Supressão: 500 mg 1x/dia.',
    },
    ajuste_renal: {
      normal: '1 g 3x/dia (zoster)', tfg_60_30: '1 g 12/12h', tfg_30_15: '1 g 1x/dia', tfg_lt_15: '500 mg 1x/dia', dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Dados insuficientes' },
    contraindicacoes_rapidas: ['Hipersensibilidade a valaciclovir/aciclovir', '< 12 anos'],
    interacoes_importantes: [
      { com: 'Probenecida/Cimetidina', severidade: 'leve', descricao: 'Redução da eliminação renal — aumentam nível' },
    ],
    alertas_especiais: ['Ajuste obrigatório em IR (encefalopatia em doses altas)', 'Micrangiopatia trombótica em imunossuprimidos (TTP/SHU — raro)', 'Hidratação adequada'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Vilaxy®', laboratorio: 'Eurofarma', concentracoes: ['500 mg'], formas: ['Comprimido revestido'], lab_id: 'eurofarma', produto_id: 'euro-vilaxy', verificado: true },
      { nome: 'Valtrex', laboratorio: 'GSK', concentracoes: ['500 mg'], formas: ['Comprimido'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // RESPIRATÓRIO — Anti-H1 Novos
  // ══════════════════════════════════════════════════════════

  {
    id: 'fexofenadina',
    molecula: 'Fexofenadina',
    nome_generico: 'Cloridrato de Fexofenadina',
    sinonimos: ['altiva', 'allegra', 'fexofenadine', 'anti-h1', 'anti-histaminico'],
    categoria: 'respiratory',
    classe: 'Anti-histamínico H1 de 2ª Geração',
    indicacoes_principais: ['Rinite alérgica sazonal e perene', 'Urticária crônica idiopática'],
    dose_adulto: {
      habitual: '180', min: '60', max: '180', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia (120 mg)'],
      instrucoes: 'NÃO tomar com suco de laranja, toranja ou maçã (reduz absorção em 36%). Tomar com água.',
    },
    ajuste_renal: {
      normal: '180 mg/dia', tfg_60_30: '60 mg 1x/dia', tfg_30_15: '60 mg 1x/dia', tfg_lt_15: '60 mg 1x/dia', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['Hipersensibilidade à fexofenadina'],
    interacoes_importantes: [
      { com: 'Suco cítrico/maçã', severidade: 'moderada', descricao: 'Reduz absorção em 36% — evitar; tomar com água' },
    ],
    alertas_especiais: ['Mínima sedação — seguro para dirigir', 'Sem efeitos anticolinérgicos'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Altiva®', laboratorio: 'Eurofarma', concentracoes: ['120 mg', '180 mg'], formas: ['Comprimido revestido'], lab_id: 'eurofarma', produto_id: 'euro-altiva', verificado: true },
      { nome: 'Allegra', laboratorio: 'Sanofi', concentracoes: ['120 mg', '180 mg'], formas: ['Comprimido'] },
    ],
  },

  {
    id: 'ebastina',
    molecula: 'Ebastina',
    nome_generico: 'Ebastina',
    sinonimos: ['ebastel', 'kestine', 'anti-h1', 'anti-histaminico'],
    categoria: 'respiratory',
    classe: 'Anti-histamínico H1 de 2ª Geração',
    indicacoes_principais: ['Rinite alérgica sazonal e perene', 'Urticária crônica'],
    dose_adulto: {
      habitual: '10', min: '10', max: '20', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
    },
    ajuste_renal: {
      normal: '10 mg/dia', tfg_60_30: 'Sem ajuste formal', tfg_30_15: 'Cautela', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['IH grave', 'QT longo congênito', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Cetoconazol/Eritromicina', severidade: 'moderada', descricao: 'Inibidores CYP3A4 — aumentam nível de ebastina; risco QT' },
    ],
    alertas_especiais: ['Risco de prolongamento QT (menor que terfenadina/astemizol — já retirados)', 'Metabolismo exclusivamente hepático'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Ebastel®', laboratorio: 'Eurofarma', concentracoes: ['10 mg', '1 mg/mL xarope'], formas: ['Comprimido', 'Xarope'], lab_id: 'eurofarma', produto_id: 'euro-ebastel', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ANALGÉSICO — CETOROLACO (VORIC®)
  // ══════════════════════════════════════════════════════════

  {
    id: 'cetorolaco',
    molecula: 'Cetorolaco de Trometamol',
    nome_generico: 'Cetorolaco de Trometamol',
    sinonimos: ['voric', 'cetorolaco', 'ketorolac', 'aine', 'analgesico', 'dor aguda', 'dor pós-operatória'],
    categoria: 'analgesico',
    classe: 'AINE — Inibidor COX não seletivo (potente analgésico)',
    indicacoes_principais: ['Dor aguda moderada a intensa de curta duração', 'Dor pós-operatória', 'Cólica renal', 'Dor musculoesquelética aguda'],
    dose_adulto: {
      habitual: '10', min: '10', max: '40', unidade: 'mg', via: 'VO',
      frequencias: ['4x/dia', '6x/dia'],
      instrucoes: '10 mg a cada 4–6h. Máximo 40 mg/dia VO. Uso máximo: 5 dias.',
    },
    ajuste_renal: {
      normal: '10 mg até 4x/dia', tfg_60_30: 'Reduzir dose', tfg_30_15: 'Evitar', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Uso > 5 dias', 'Úlcera péptica ativa', 'IR/IH grave', 'Gestação 3º trimestre', 'Alergia a AINEs'],
    interacoes_importantes: [
      { com: 'Anticoagulantes', severidade: 'grave', descricao: 'Alto risco hemorrágico' },
      { com: 'Outros AINEs', severidade: 'grave', descricao: 'Não combinar — toxicidade aditiva' },
    ],
    alertas_especiais: ['⚠ USO MÁXIMO 5 DIAS — risco GI e renal com uso prolongado', 'Potente analgésico — alternativa a opioides em dor aguda'],
    uso_gestante: 'risco', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Voric®', laboratorio: 'Eurofarma', concentracoes: ['10 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-voric', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ANTI-INFLAMATÓRIO — MELOXICAM
  // ══════════════════════════════════════════════════════════

  {
    id: 'meloxicam',
    molecula: 'Meloxicam',
    nome_generico: 'Meloxicam',
    sinonimos: ['meloxicam', 'mobic', 'movatec', 'aine', 'cox-2', 'artrite', 'artrose'],
    categoria: 'antiinflamatorio',
    classe: 'AINE — Inibidor COX preferencial (COX-2 > COX-1)',
    indicacoes_principais: ['Osteoartrite', 'Artrite Reumatoide', 'Espondilite Anquilosante', 'Dor musculoesquelética aguda'],
    dose_adulto: {
      habitual: '15', min: '7.5', max: '15', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: '7,5–15 mg 1x/dia com refeição. Iniciar com menor dose eficaz.',
    },
    ajuste_renal: {
      normal: '15 mg/dia', tfg_60_30: 'Cautela — 7,5 mg/dia', tfg_30_15: 'Evitar', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Úlcera péptica ativa', 'IRC grave', 'Alergia a AINEs', 'Gestação 3º trimestre'],
    interacoes_importantes: [
      { com: 'Anticoagulantes', severidade: 'moderada', descricao: 'Aumenta risco hemorrágico' },
      { com: 'Anti-hipertensivos', severidade: 'moderada', descricao: 'Reduz efeito anti-hipertensivo' },
    ],
    alertas_especiais: ['Menor risco GI que AINEs não seletivos (COX-2 preferencial, não exclusivo)', 'Preferir dose mínima eficaz pelo menor tempo possível'],
    uso_gestante: 'risco', uso_lactante: 'risco',
    marcas: [],
  },

  // ══════════════════════════════════════════════════════════
  // CORTICÓIDE — PREDNISOLONA / PREDNISONA
  // ══════════════════════════════════════════════════════════

  {
    id: 'prednisolona',
    molecula: 'Prednisolona',
    nome_generico: 'Prednisolona',
    sinonimos: ['preni', 'prednisolona', 'corticoide', 'corticosteroide', 'anti-inflamatorio', 'imunossupressor', 'preni solução', 'preni gotas'],
    categoria: 'imunossupressor',
    classe: 'Corticosteroide Sistêmico — Glicocorticoide',
    indicacoes_principais: ['Asma aguda', 'DPOC exacerbado', 'Doenças autoimunes', 'Reações alérgicas graves', 'Artrite Reumatoide (ponte)'],
    dose_adulto: {
      habitual: '20', min: '5', max: '60', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
      instrucoes: 'Dose altamente variável conforme indicação. Asma: 40–60 mg/dia por 5–7 dias. Tomar pela manhã com alimento.',
    },
    dose_pediatrica: {
      calculo: 'mg/kg/dia', dose_por_kg: 1, unidade: 'mg',
      frequencia_divisoes: 1, max_dose_dia: 40, max_dose_dia_unidade: 'mg/dia',
      faixa_etaria: '> 1 ano: 1–2 mg/kg/dia (máx 40 mg/dia) — Asma: curso curto 3–5 dias',
      observacao: 'Asma leve-moderada: 1 mg/kg/dia. Asma grave/croup: 2 mg/kg/dia. Preni® Sol. Oral 3 mg/mL: volume = dose(mg) ÷ 3',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Sem ajuste formal', tfg_30_15: 'Sem ajuste formal', tfg_lt_15: 'Cautela', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Preferir prednisolona à prednisona (IH)', child_c: 'Usar prednisolona — prednisona requer conversão hepática' },
    contraindicacoes_rapidas: ['Infecção sistêmica não tratada', 'Varicela/herpes-zóster ativo', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'AINEs', severidade: 'moderada', descricao: 'Risco GI aditivo — evitar combinação sem proteção' },
      { com: 'Antidiabéticos', severidade: 'moderada', descricao: 'Hiperglicemia — monitorar glicemia' },
      { com: 'Inibidores CYP3A4', severidade: 'moderada', descricao: 'Aumentam nível do corticoide' },
    ],
    alertas_especiais: ['Retirada gradual em uso > 2 semanas (supressão adrenal)', 'Monitorar PA, glicemia, densidade óssea em uso prolongado'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Preni®', laboratorio: 'Eurofarma', concentracoes: ['20 mg', '40 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-prednisolona-20', verificado: true },
      { nome: 'Preni® Solução Oral', laboratorio: 'Eurofarma', concentracoes: ['3 mg/mL'], formas: ['Solução Oral'], lab_id: 'eurofarma', produto_id: 'euro-prednisolona-sol', verificado: true },
      { nome: 'Preni® Gotas', laboratorio: 'Eurofarma', concentracoes: ['1 mg/gota'], formas: ['Gotas'], lab_id: 'eurofarma', produto_id: 'euro-prednisolona-gotas', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // PSIQUIATRIA/ALERGIA — HIDROXIZINA
  // ══════════════════════════════════════════════════════════

  {
    id: 'hidroxizina',
    molecula: 'Hidroxizina',
    nome_generico: 'Cloridrato de Hidroxizina',
    sinonimos: ['pergo', 'hidroxizina', 'antihistaminico', 'ansiolítico', 'anti-histaminico', 'prurido', 'urticaria'],
    categoria: 'psiquiatria',
    classe: 'Anti-histamínico H1 de 1ª geração — Ansiolítico',
    indicacoes_principais: ['Ansiedade (uso pontual)', 'Prurido alérgico', 'Urticária', 'Pré-medicação anestésica'],
    dose_adulto: {
      habitual: '25', min: '10', max: '100', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia', '3x/dia', '4x/dia'],
      instrucoes: 'Ansiedade: 12,5–25 mg 3–4x/dia. Prurido/urticária: 25 mg 3–4x/dia.',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Reduzir 50%', tfg_30_15: 'Reduzir 50%', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Reduzir intervalo', child_b: 'Reduzir dose', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['QT prolongado', 'Hipersensibilidade à cetrizina/piperazinas', 'Gestação (Cat. C)'],
    interacoes_importantes: [
      { com: 'Depressores do SNC/álcool', severidade: 'grave', descricao: 'Sedação aditiva — risco de depressão respiratória' },
      { com: 'QT-prolongadores', severidade: 'grave', descricao: 'Risco de prolongamento QT sinérgico' },
    ],
    alertas_especiais: ['⚠ Idosos: risco de sedação excessiva, confusão, quedas (critérios Beers)', 'Efeito anticolinérgico: retenção urinária, boca seca', 'Solução oral 2 mg/mL — útil quando comprimido não é possível'],
    uso_gestante: 'risco', uso_lactante: 'risco',
    marcas: [
      { nome: 'Pergo®', laboratorio: 'Eurofarma', concentracoes: ['2 mg/mL solução oral'], formas: ['Solução Oral'], lab_id: 'eurofarma', produto_id: 'euro-pergo', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // DOR/ANTI-INFLAMATÓRIO — ACECLOFENACO
  // ══════════════════════════════════════════════════════════

  {
    id: 'aceclofenaco',
    molecula: 'Aceclofenaco',
    nome_generico: 'Aceclofenaco',
    sinonimos: ['proflam', 'aceclofenaco', 'aine', 'anti-inflamatorio', 'artrite', 'dor musculoesquelética'],
    categoria: 'antiinflamatorio',
    classe: 'AINE — Inibidor COX preferencial (COX-2 > COX-1)',
    indicacoes_principais: ['Osteoartrite', 'Artrite Reumatoide', 'Espondilite Anquilosante', 'Lombalgias', 'Dor musculoesquelética aguda'],
    dose_adulto: {
      habitual: '100', min: '100', max: '200', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia'],
      instrucoes: 'Tomar com alimentos. 100 mg 2x/dia (manhã e noite).',
    },
    ajuste_renal: {
      normal: '100 mg 2x/dia', tfg_60_30: 'Cautela', tfg_30_15: 'Evitar', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Úlcera péptica ativa', 'IRC grave', 'IC grave', 'Alergia a AINEs', 'Gestação 3º trimestre'],
    interacoes_importantes: [
      { com: 'Anticoagulantes (varfarina)', severidade: 'grave', descricao: 'Aumenta risco de sangramento — monitorar INR' },
      { com: 'Lítio', severidade: 'moderada', descricao: 'Aumenta nível sérico de lítio' },
      { com: 'Anti-hipertensivos', severidade: 'moderada', descricao: 'Reduz efeito anti-hipertensivo' },
    ],
    alertas_especiais: ['Perfil GI melhor que diclofenaco (COX-2 preferencial)', 'Disponível também como creme tópico (Proflam® creme)', 'Monitorar PA, função renal e hepática'],
    uso_gestante: 'risco', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Proflam®', laboratorio: 'Eurofarma', concentracoes: ['100 mg', 'Creme tópico'], formas: ['Comprimido', 'Creme'], lab_id: 'eurofarma', produto_id: 'euro-proflam', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // PSIQUIATRIA — VENLAFAXINA
  // ══════════════════════════════════════════════════════════

  {
    id: 'venlafaxina',
    molecula: 'Cloridrato de Venlafaxina',
    nome_generico: 'Cloridrato de Venlafaxina',
    sinonimos: ['effexor', 'venlafaxina', 'irsn', 'antidepressivo', 'ansiedade generalizada', 'tdm'],
    categoria: 'psiquiatria',
    classe: 'IRSN — Inibidor da Recaptação de Serotonina e Noradrenalina',
    indicacoes_principais: ['Transtorno Depressivo Maior (TDM)', 'Transtorno de Ansiedade Generalizada (TAG)', 'Transtorno de Pânico', 'Fobia Social', 'Dor neuropática (off-label)'],
    dose_adulto: {
      habitual: '75', min: '37.5', max: '225', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
      instrucoes: 'Iniciar 37,5–75 mg/dia. Aumentar 75 mg a cada 4 semanas conforme resposta. Tomar com alimento.',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Reduzir 25–50%', tfg_30_15: 'Reduzir 50%', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Reduzir 50%', child_b: 'Reduzir 50%', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['IMAOs (14 dias de intervalo)', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'IMAOs', severidade: 'grave', descricao: 'Síndrome serotoninérgica — contraindicado' },
      { com: 'Tramadol/triptanos', severidade: 'moderada', descricao: 'Risco de síndrome serotoninérgica' },
    ],
    alertas_especiais: ['Monitorar PA (pode elevar diastólica em doses altas ≥ 225 mg)', 'Retirada gradual — síndrome de descontinuação', 'Caixa preta FDA: risco suicída em < 24 anos'],
    uso_gestante: 'risco', uso_lactante: 'risco',
    marcas: [],
  },

  {
    id: 'paroxetina',
    molecula: 'Cloridrato de Paroxetina',
    nome_generico: 'Cloridrato de Paroxetina',
    sinonimos: ['pondera', 'pondera xr', 'paroxetina', 'isrs', 'antidepressivo', 'ansiedade', 'toc', 'tdm'],
    categoria: 'psiquiatria',
    classe: 'ISRS — Inibidor Seletivo da Recaptação de Serotonina',
    indicacoes_principais: ['Transtorno Depressivo Maior', 'Transtorno de Pânico', 'TOC', 'Fobia Social', 'TEPT', 'TAG'],
    dose_adulto: {
      habitual: '20', min: '10', max: '60', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Iniciar 10–20 mg/dia. Aumentar 10 mg a cada 2 semanas. Tomar pela manhã com alimento.',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Iniciar com dose baixa', tfg_30_15: '10 mg/dia máximo', tfg_lt_15: '10 mg/dia', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Iniciar com dose baixa', child_b: '10 mg/dia máximo', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['IMAOs (14 dias)', 'Tioridazina', 'Pimozida', 'Gestação (Cat. D — especialmente 3º trim.)'],
    interacoes_importantes: [
      { com: 'IMAOs', severidade: 'grave', descricao: 'Síndrome serotoninérgica' },
      { com: 'Tamoxifeno', severidade: 'grave', descricao: 'Inibidor CYP2D6 potente — reduz eficácia do tamoxifeno' },
    ],
    alertas_especiais: ['Maior potencial de descontinuação entre os ISRS (meia-vida curta)', 'Efeitos anticolinérgicos maiores que outros ISRS', 'Pondera XR® 12,5/25 mg — formulação de liberação prolongada'],
    uso_gestante: 'risco', uso_lactante: 'risco',
    marcas: [
      { nome: 'Pondera®', laboratorio: 'Eurofarma', concentracoes: ['20 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-paroxetina-20', verificado: true },
      { nome: 'Pondera XR®', laboratorio: 'Eurofarma', concentracoes: ['12,5 mg', '25 mg'], formas: ['Comprimido LP'], lab_id: 'eurofarma', produto_id: 'euro-pondera-xr', verificado: true },
    ],
  },

  {
    id: 'bupropiona',
    molecula: 'Cloridrato de Bupropiona',
    nome_generico: 'Cloridrato de Bupropiona',
    sinonimos: ['bupropiona', 'wellbutrin', 'zyban', 'antidepressivo', 'tdm', 'tabagismo', 'tdah'],
    categoria: 'psiquiatria',
    classe: 'IRND — Inibidor da Recaptação de Noradrenalina e Dopamina',
    indicacoes_principais: ['Transtorno Depressivo Maior', 'Cessação do tabagismo', 'TDAH (off-label adultos)', 'Depressão com hipersônia/fadiga'],
    dose_adulto: {
      habitual: '150', min: '150', max: '300', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
      instrucoes: 'Iniciar 150 mg/dia por 3 dias, depois 150 mg 2x/dia (intervalo ≥ 8h). Comprimido SR. Não partir/mastigar.',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Cautela', tfg_30_15: '150 mg/dia máximo', tfg_lt_15: '150 mg/dia', dialisavel: false,
    },
    ajuste_hepatico: { child_a: '150 mg/dia', child_b: '150 mg a cada 2 dias', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Epilepsia ou limiar convulsivo baixo', 'Bulimia/anorexia nervosa (risco convulsão)', 'IMAOs (14 dias)', 'Abstinência abrupta de benzodiazepínico/álcool'],
    interacoes_importantes: [
      { com: 'IMAOs', severidade: 'grave', descricao: 'Contraindicado — risco de crise hipertensiva' },
      { com: 'Tamoxifeno', severidade: 'moderada', descricao: 'Inibidor CYP2D6 moderado' },
    ],
    alertas_especiais: ['Risco de convulsão dose-dependente (raro com doses corretas)', 'Não causa disfunção sexual — vantagem sobre ISRS/IRSN', 'Pode auxiliar em perda de peso'],
    uso_gestante: 'avaliar', uso_lactante: 'risco',
    marcas: [],
  },

  {
    id: 'nortriptilina',
    molecula: 'Cloridrato de Nortriptilina',
    nome_generico: 'Cloridrato de Nortriptilina',
    sinonimos: ['nortriptilina', 'pamelor', 'antidepressivo', 'antidepressivo triclico', 'dor neuropatica', 'enxaqueca'],
    categoria: 'psiquiatria',
    classe: 'Antidepressivo Tricíclico (ATC) — Amina Secundária',
    indicacoes_principais: ['Transtorno Depressivo Maior', 'Dor neuropática', 'Profilaxia de enxaqueca', 'Incontinência urinária (off-label)'],
    dose_adulto: {
      habitual: '50', min: '25', max: '150', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
      instrucoes: 'Iniciar 25 mg/dia. Aumentar 25 mg a cada 1–2 semanas. Tomar à noite (sedação).',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Cautela', tfg_30_15: 'Dose reduzida', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Iniciar com dose baixa', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['IAM recente', 'Bloqueio AV', 'Glaucoma de ângulo fechado', 'Retenção urinária', 'IMAOs'],
    interacoes_importantes: [
      { com: 'IMAOs', severidade: 'grave', descricao: 'Crise hipertensiva — contraindicado' },
      { com: 'QT-prolongadores', severidade: 'grave', descricao: 'Risco de torsades' },
    ],
    alertas_especiais: ['ECG antes de iniciar (prolongamento QT)', 'Menos sedativo e anticolinérgico que amitriptilina', 'Idosos: critérios Beers — preferir outros antidepressivos'],
    uso_gestante: 'risco', uso_lactante: 'risco',
    marcas: [],
  },

  {
    id: 'litio',
    molecula: 'Carbonato de Lítio',
    nome_generico: 'Carbonato de Lítio',
    sinonimos: ['litio', 'carbolitium', 'lítio', 'estabilizador humor', 'bipolar', 'tab'],
    categoria: 'psiquiatria',
    classe: 'Estabilizador do Humor — Sal de Lítio',
    indicacoes_principais: ['Transtorno Afetivo Bipolar (TAB) — manutenção', 'Episódio maníaco agudo', 'Prevenção de recaídas no TAB', 'Potencialização de antidepressivos'],
    dose_adulto: {
      habitual: '900', min: '600', max: '1800', unidade: 'mg/dia', via: 'VO',
      frequencias: ['2x/dia', '3x/dia'],
      instrucoes: 'Dose guiada por litemia. Nível terapêutico: 0,6–1,2 mEq/L (manutenção). Tomar com alimento.',
    },
    ajuste_renal: {
      normal: 'Litemia 0,6–1,2 mEq/L', tfg_60_30: 'Reduzir dose — litemia semanal', tfg_30_15: 'Evitar', tfg_lt_15: 'Contraindicado', dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste (excreção renal)' },
    contraindicacoes_rapidas: ['IR grave', 'Gestação 1º trimestre (anomalia de Ebstein)', 'Doença de Addison', 'Síndrome do nó sinusal'],
    interacoes_importantes: [
      { com: 'AINEs/tiazídicos', severidade: 'grave', descricao: 'Elevam litemia — risco de toxicidade' },
      { com: 'IECA/BRA', severidade: 'grave', descricao: 'Reduzem clearance renal do lítio' },
    ],
    alertas_especiais: ['🚨 Índice terapêutico estreito — monitorar litemia regularmente', 'Sinais de toxicidade: tremores grosseiros, confusão, ataxia, vômitos', 'Hidratação adequada obrigatória — evitar dieta hipossódica', 'Cat. D na gestação'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [],
  },

  {
    id: 'metilfenidato',
    molecula: 'Cloridrato de Metilfenidato',
    nome_generico: 'Cloridrato de Metilfenidato',
    sinonimos: ['ritalina', 'concerta', 'metilfenidato', 'tdah', 'add', 'estimulante', 'psicoestimulante'],
    categoria: 'psiquiatria',
    classe: 'Psicoestimulante — Inibidor da Recaptação de Dopamina e Noradrenalina',
    indicacoes_principais: ['TDAH (Transtorno de Déficit de Atenção e Hiperatividade)', 'Narcolepsia (off-label)'],
    dose_adulto: {
      habitual: '20', min: '10', max: '60', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia', '3x/dia'],
      instrucoes: 'Iniciar 5–10 mg 2x/dia (café da manhã e almoço). Não tomar após 18h. Liberação prolongada: 1x/dia pela manhã.',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Cautela', tfg_30_15: 'Cautela', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['Ansiedade/agitação grave', 'Glaucoma', 'Tiques/Tourette (relativo)', 'IMAOs (14 dias)', 'Hipertireoidismo não controlado'],
    interacoes_importantes: [
      { com: 'IMAOs', severidade: 'grave', descricao: 'Crise hipertensiva — contraindicado' },
      { com: 'Antihipertensivos', severidade: 'moderada', descricao: 'Pode antagonizar efeito anti-hipertensivo' },
    ],
    alertas_especiais: ['⚠ RECEITA ESPECIAL AMARELA (lista A3 — psicotrópico)', 'Monitorar FC, PA e crescimento em crianças', 'Potencial de abuso — avaliar antes de prescrever'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [],
  },

  // ══════════════════════════════════════════════════════════
  // DOR — TRAMADOL
  // ══════════════════════════════════════════════════════════

  {
    id: 'tramadol',
    molecula: 'Tramadol',
    nome_generico: 'Cloridrato de Tramadol',
    sinonimos: ['gesico', 'tramadol', 'opioid', 'analgesico', 'dor moderada', 'dor intensa'],
    categoria: 'analgesico',
    classe: 'Opioide Fraco — Agonista µ parcial + Inibidor Recaptação Serotonina/Noradrenalina',
    indicacoes_principais: ['Dor moderada a intensa', 'Dor pós-operatória', 'Dor oncológica (escada OMS 2ª degrau)', 'Dor neuropática'],
    dose_adulto: {
      habitual: '50', min: '50', max: '400', unidade: 'mg/dia', via: 'VO',
      frequencias: ['4x/dia', '6x/dia'],
      instrucoes: '50–100 mg a cada 4–6 horas. Máximo: 400 mg/dia. LP (Gésico® 100 mg): 1 cp 12/12h.',
    },
    ajuste_renal: {
      normal: '50 mg 4–6x/dia', tfg_60_30: 'Intervalo ≥ 12h', tfg_30_15: 'Evitar liberação prolongada', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: '50 mg a cada 12h', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Epilepsia não controlada', 'Uso com IMAOs (14 dias)', 'Depressão respiratória aguda', '< 12 anos'],
    interacoes_importantes: [
      { com: 'IMAOs/antidepressivos serotoninérgicos', severidade: 'grave', descricao: 'Síndrome serotoninérgica — risco de vida' },
      { com: 'Benzodiazepínicos/depressores SNC', severidade: 'grave', descricao: 'Depressão respiratória aditiva' },
      { com: 'Carbamazepina', severidade: 'moderada', descricao: 'Induz metabolismo — reduz analgesia' },
    ],
    alertas_especiais: ['⚠ Abaixar limiar convulsivo — cuidado em epilépticos', 'Síndrome de abstinência com retirada abrupta', 'Receita Especial Branca em 2 vias (lista C1)', 'Gésico Duo® = tramadol 37,5 mg + paracetamol 325 mg'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Gésico®', laboratorio: 'Eurofarma', concentracoes: ['50 mg', '100 mg LP'], formas: ['Comprimido', 'Comprimido LP'], lab_id: 'eurofarma', produto_id: 'euro-gesico', verificado: true },
      { nome: 'Gésico Duo®', laboratorio: 'Eurofarma', concentracoes: ['37,5 mg + 325 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-gesico-duo', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CARDIOVASCULAR — METOPROLOL
  // ══════════════════════════════════════════════════════════

  {
    id: 'metoprolol',
    molecula: 'Succinato de Metoprolol',
    nome_generico: 'Succinato de Metoprolol',
    sinonimos: ['selozok', 'metoprolol', 'betabloqueador', 'hipertensão', 'ic', 'angina', 'arritmia'],
    categoria: 'antihipertensivo',
    classe: 'Betabloqueador Cardiosseletivo (β1) — Ação Prolongada',
    indicacoes_principais: ['Hipertensão Arterial', 'Insuficiência Cardíaca (FE reduzida)', 'Angina Estável', 'Pós-IAM', 'Taquiarritmias supraventriculares'],
    dose_adulto: {
      habitual: '50', min: '25', max: '200', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Succinato (LP): 1x/dia. Iniciar com dose baixa e titular. Tomar com ou sem alimento.',
    },
    ajuste_renal: {
      normal: 'Sem ajuste necessário', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste (excreção hepática)', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Reduzir dose', child_b: 'Reduzir significativamente', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Bradicardia sintomática (FC < 50)', 'BAV 2º/3º grau', 'Asma grave ativa', 'IC descompensada aguda', 'Choque cardiogênico'],
    interacoes_importantes: [
      { com: 'Verapamil/diltiazem', severidade: 'grave', descricao: 'Bradicardia e bloqueio AV combinados' },
      { com: 'Clonidina', severidade: 'moderada', descricao: 'Hipertensão rebote na retirada da clonidina' },
    ],
    alertas_especiais: ['Não suspender abruptamente (angina de rebote/IAM)', 'Preferir succinato (LP) ao tartarato para IC e dose única diária', 'Pode mascarar hipoglicemia em diabéticos insulino-dependentes'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [],
  },

  {
    id: 'irbesartana',
    molecula: 'Irbesartana',
    nome_generico: 'Irbesartana',
    sinonimos: ['aprovel', 'irbesartana', 'bra', 'sartana', 'hipertensão', 'nefropatia diabetica'],
    categoria: 'antihipertensivo',
    classe: 'BRA — Bloqueador do Receptor de Angiotensina II (AT1)',
    indicacoes_principais: ['Hipertensão Arterial', 'Nefropatia diabética (DM2 + HAS)', 'Proteinúria'],
    dose_adulto: {
      habitual: '150', min: '75', max: '300', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: '150 mg/dia. Pode aumentar para 300 mg/dia conforme resposta.',
    },
    ajuste_renal: {
      normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Cautela — monitorar K+', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['Gestação 2º/3º trimestre', 'Hiperpotassemia', 'Uso concomitante de alisquireno em DM'],
    interacoes_importantes: [
      { com: 'IECA (duplo bloqueio)', severidade: 'grave', descricao: 'Hipotensão, hiperpotassemia, IRA — evitar' },
      { com: 'AINEs', severidade: 'moderada', descricao: 'Reduzem efeito anti-hipertensivo e aumentam risco renal' },
    ],
    alertas_especiais: ['Não usar em gestação (fetotóxico)', 'Monitorar K+ e creatinina especialmente em IRC'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [],
  },

  {
    id: 'doxazosina',
    molecula: 'Mesilato de Doxazosina',
    nome_generico: 'Mesilato de Doxazosina',
    sinonimos: ['duomo', 'doxazosina', 'alfa-bloqueador', 'hiperplasia prostática', 'hbp', 'hipertensão'],
    categoria: 'antihipertensivo',
    classe: 'Alfa-1 Bloqueador Seletivo',
    indicacoes_principais: ['Hiperplasia Prostática Benigna (HPB)', 'Hipertensão Arterial (2ª linha)'],
    dose_adulto: {
      habitual: '4', min: '1', max: '8', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'HPB: iniciar 1 mg/dia à noite. Dobrar dose a cada 1–2 semanas até 4 mg/dia. Tomar à noite para minimizar hipotensão postural.',
    },
    ajuste_renal: {
      normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Cautela', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hipotensão postural sintomática', 'Hipersensibilidade a quinazolinonas'],
    interacoes_importantes: [
      { com: 'Inibidores PDE5 (sildenafila/tadalafila)', severidade: 'grave', descricao: 'Hipotensão grave — separar temporalmente' },
      { com: 'Anti-hipertensivos', severidade: 'moderada', descricao: 'Hipotensão aditiva' },
    ],
    alertas_especiais: ['Síndrome do Íris Flácido Intraoperatória (SIFI) — avisar oftalmologista antes de cirurgia de catarata', 'Duomo® monocomponente (doxazosina); Duomo HP® = doxazosina + finasterida'],
    uso_gestante: 'risco', uso_lactante: 'risco',
    marcas: [
      { nome: 'Duomo®', laboratorio: 'Eurofarma', concentracoes: ['2 mg', '4 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-duomo', verificado: true },
    ],
  },

  {
    id: 'tadalafila',
    molecula: 'Tadalafila',
    nome_generico: 'Tadalafila',
    sinonimos: ['cialis', 'tadalafila', 'pde5', 'disfunção erétil', 'hbp', 'hipertensão pulmonar'],
    categoria: 'outro',
    classe: 'Inibidor da PDE5 — Vasodilatador',
    indicacoes_principais: ['Disfunção Erétil', 'Hiperplasia Prostática Benigna (HPB)', 'Hipertensão Arterial Pulmonar (HAP)'],
    dose_adulto: {
      habitual: '10', min: '2.5', max: '20', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', 'uso sob demanda'],
      instrucoes: 'DE sob demanda: 10 mg antes da atividade (máx 20 mg). DE diário: 2,5–5 mg/dia. HPB: 5 mg/dia.',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Não ultrapassar 10 mg/dose', tfg_30_15: '5 mg dose única máxima', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Não ultrapassar 10 mg', child_b: 'Não recomendado', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Nitratos (qualquer forma — hipotensão grave)', 'Alfabloqueadores (cautela — hipotensão)', 'Riociguate'],
    interacoes_importantes: [
      { com: 'Nitratos (nitroglicerina, isossorbida)', severidade: 'grave', descricao: 'Hipotensão grave potencialmente fatal — CONTRAINDICADO' },
      { com: 'Inibidores CYP3A4 (cetoconazol, ritonavir)', severidade: 'moderada', descricao: 'Aumentam nível de tadalafila — reduzir dose' },
    ],
    alertas_especiais: ['⚠ Contraindicado com nitratos — risco de vida', 'Meia-vida longa (~17h) — menos urgência vs sildenafila (4h)', 'Pode causar lombalgia/mialgia (diferencial vs sildenafila)'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [],
  },

  // ══════════════════════════════════════════════════════════
  // GASTROENTEROLOGIA — ESOMEPRAZOL E DOMPERIDONA
  // ══════════════════════════════════════════════════════════

  {
    id: 'esomeprazol',
    molecula: 'Esomeprazol Magnésico',
    nome_generico: 'Esomeprazol Magnésico',
    sinonimos: ['esio', 'esomeprazol', 'nexium', 'ibb', 'inibidor bomba protónica', 'drge', 'ulcera', 'refluxo'],
    categoria: 'gastroenterologia',
    classe: 'Inibidor da Bomba de Prótons (IBP)',
    indicacoes_principais: ['DRGE', 'Úlcera Péptica (H. pylori — erradicação)', 'Esofagite erosiva', 'Prevenção de úlcera por AINEs', 'Síndrome de Zollinger-Ellison'],
    dose_adulto: {
      habitual: '40', min: '20', max: '40', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Tomar 30–60 min antes da refeição principal. DRGE: 20–40 mg/dia por 4–8 semanas.',
    },
    ajuste_renal: {
      normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Cautela', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: '20 mg máximo', child_c: '20 mg máximo' },
    contraindicacoes_rapidas: ['Hipersensibilidade a benzimidazóis', 'Uso com nelfinavir/rilpivirina'],
    interacoes_importantes: [
      { com: 'Clopidogrel', severidade: 'moderada', descricao: 'IBP reduzem ativação via CYP2C19 — preferir pantoprazol em coronariopatas' },
    ],
    alertas_especiais: ['Uso prolongado > 1 ano: risco de hipomagnesemia, deficiência B12, fraturas por osteoporose', 'Preferir S-enantiômero do omeprazol — metabolismo mais previsível'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Ésio®', laboratorio: 'Eurofarma', concentracoes: ['20 mg', '40 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-esio', verificado: true },
    ],
  },

  {
    id: 'domperidona',
    molecula: 'Domperidona',
    nome_generico: 'Domperidona',
    sinonimos: ['domperidona', 'motilium', 'procinético', 'nausei', 'vomito', 'motilidade', 'refluxo'],
    categoria: 'gastroenterologia',
    classe: 'Procinético — Antagonista Dopaminérgico D2 Periférico',
    indicacoes_principais: ['Náuseas e vômitos', 'Gastroparesia', 'Dispepsia funcional', 'Refluxo gastroesofágico (adjuvante)'],
    dose_adulto: {
      habitual: '10', min: '10', max: '30', unidade: 'mg', via: 'VO',
      frequencias: ['3x/dia'],
      instrucoes: '10 mg 3x/dia, 15–30 min antes das refeições. Duração máxima recomendada: 7 dias (risco QT).',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Reduzir frequência para 2x/dia', tfg_30_15: '1x/dia', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['QT prolongado', 'Prolactinoma', 'Hemorragia GI/perfuração', 'Uso com inibidores CYP3A4 fortes'],
    interacoes_importantes: [
      { com: 'Antifúngicos azólicos (cetoconazol)', severidade: 'grave', descricao: 'Prolongamento QT — contraindicado' },
      { com: 'Eritromicina/claritromicina', severidade: 'grave', descricao: 'Risco QT aditivo' },
    ],
    alertas_especiais: ['⚠ Risco de prolongamento QT — ANVISA recomenda uso pelo menor tempo possível', 'Preferir metoclopramida para uso agudo hospitalar (acessa SNC)', 'Não usar com inibidores CYP3A4 fortes'],
    uso_gestante: 'risco', uso_lactante: 'risco',
    marcas: [],
  },

  // ══════════════════════════════════════════════════════════
  // NEUROLOGIA — MEMANTINA, DONEPEZILA, LEVETIRACETAM
  // ══════════════════════════════════════════════════════════

  {
    id: 'memantina',
    molecula: 'Cloridrato de Memantina',
    nome_generico: 'Cloridrato de Memantina',
    sinonimos: ['memantina', 'ebixa', 'alzheimer', 'demência', 'antagonista nmda'],
    categoria: 'neurologico',
    classe: 'Antagonista do Receptor NMDA — Antidemencial',
    indicacoes_principais: ['Doença de Alzheimer moderada a grave', 'Demência Vascular moderada a grave'],
    dose_adulto: {
      habitual: '20', min: '5', max: '20', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
      instrucoes: 'Titular: sem 1: 5 mg/dia; sem 2: 10 mg/dia; sem 3: 15 mg/dia; sem 4+: 20 mg/dia (1x/dia ou 10 mg 2x/dia).',
    },
    ajuste_renal: {
      normal: '20 mg/dia', tfg_60_30: '10 mg/dia máximo', tfg_30_15: '5 mg 2x/dia', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Não recomendado' },
    contraindicacoes_rapidas: ['TFG < 5 mL/min', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Amantadina/quetamina', severidade: 'moderada', descricao: 'Risco de psicose por antagonismo NMDA aditivo' },
    ],
    alertas_especiais: ['Frequentemente combinado com donepezila (sinérgico)', 'Benefício modesto — avaliar junto com família/cuidadores'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [],
  },

  {
    id: 'donepezila',
    molecula: 'Cloridrato de Donepezila',
    nome_generico: 'Cloridrato de Donepezila',
    sinonimos: ['aricept', 'donepezila', 'alzheimer', 'demência', 'inibidor colinesterase'],
    categoria: 'neurologico',
    classe: 'Inibidor da Acetilcolinesterase — Antidemencial',
    indicacoes_principais: ['Doença de Alzheimer leve, moderada e grave', 'Demência na Doença de Parkinson'],
    dose_adulto: {
      habitual: '10', min: '5', max: '10', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'Iniciar 5 mg/dia por 4–6 semanas, depois 10 mg/dia. Tomar à noite (reduz insônia).',
    },
    ajuste_renal: {
      normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Cautela', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Não recomendado' },
    contraindicacoes_rapidas: ['Hipersensibilidade a piperidinas', 'Bradicardia sintomática', 'Úlcera péptica ativa'],
    interacoes_importantes: [
      { com: 'Anticolinérgicos', severidade: 'moderada', descricao: 'Antagonismo farmacológico — evitar combinação' },
      { com: 'Betabloqueadores/antiarrítmicos', severidade: 'moderada', descricao: 'Risco de bradicardia' },
    ],
    alertas_especiais: ['Efeitos colinérgicos: náuseas, diarreia, cãibras, bradicardia', 'Não modifica a progressão da doença — melhora sintomática'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [],
  },

  {
    id: 'levetiracetam',
    molecula: 'Levetiracetam',
    nome_generico: 'Levetiracetam',
    sinonimos: ['keppra', 'levetiracetam', 'anticonvulsivante', 'epilepsia', 'convulsão', 'dae'],
    categoria: 'neurologico',
    classe: 'Anticonvulsivante — Ligante da Proteína SV2A da Vesícula Sináptica',
    indicacoes_principais: ['Epilepsia focal (com ou sem generalização)', 'Epilepsia mioclônica juvenil', 'Crises tônico-clônicas generalizadas'],
    dose_adulto: {
      habitual: '1000', min: '500', max: '3000', unidade: 'mg/dia', via: 'VO',
      frequencias: ['2x/dia'],
      instrucoes: 'Iniciar 500 mg 2x/dia. Aumentar 500 mg/dose a cada 2 semanas conforme resposta.',
    },
    ajuste_renal: {
      normal: '500–1500 mg 2x/dia', tfg_60_30: '250–750 mg 2x/dia', tfg_30_15: '250–500 mg 2x/dia', tfg_lt_15: '500–1000 mg/dia', dialisavel: true,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Cautela (IH + IR frequentemente coexistem)' },
    contraindicacoes_rapidas: ['Hipersensibilidade'],
    interacoes_importantes: [],
    alertas_especiais: ['Pouquíssimas interações medicamentosas — vantagem em politerapia', 'Efeito adverso principal: irritabilidade/alterações de humor (10–15%)', 'Monitorar humor especialmente em pacientes com histórico psiquiátrico'],
    uso_gestante: 'risco', uso_lactante: 'risco',
    marcas: [],
  },

  // ══════════════════════════════════════════════════════════
  // RESPIRATÓRIO — MOMETASONA NASAL (VENTUS®)
  // ══════════════════════════════════════════════════════════

  {
    id: 'mometasona-nasal',
    molecula: 'Furoato de Mometasona',
    nome_generico: 'Furoato de Mometasona',
    sinonimos: ['ventus', 'nasonex', 'mometasona', 'corticoide nasal', 'rinite', 'spray nasal', 'polipo nasal'],
    categoria: 'respiratory',
    classe: 'Corticosteroide Nasal Tópico',
    indicacoes_principais: ['Rinite alérgica sazonal e perene', 'Profilaxia de rinite alérgica', 'Pólipos nasais', 'Rinossinusite aguda (adjuvante)'],
    dose_adulto: {
      habitual: '200', min: '100', max: '400', unidade: 'mcg', via: 'spray nasal',
      frequencias: ['1x/dia'],
      instrucoes: '2 jatos em cada narina 1x/dia (200 mcg/dia). Profilaxia: iniciar 2–4 semanas antes da temporada.',
    },
    ajuste_renal: {
      normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['< 2 anos', 'Cirurgia nasal recente (até cicatrização)', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Inibidores CYP3A4 fortes (cetoconazol)', severidade: 'moderada', descricao: 'Pode aumentar exposição sistêmica ao corticoide' },
    ],
    alertas_especiais: ['Mínima biodisponibilidade sistêmica (< 1%) — seguro em uso prolongado', 'Monitorar velocidade de crescimento em crianças no uso crônico'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Ventus®', laboratorio: 'Eurofarma', concentracoes: ['50 mcg/jato'], formas: ['Spray nasal'], lab_id: 'eurofarma', produto_id: 'euro-ventus', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // DIABETES — GLICAZIDA E GLIBENCLAMIDA
  // ══════════════════════════════════════════════════════════

  {
    id: 'glicazida',
    molecula: 'Glicazida',
    nome_generico: 'Glicazida',
    sinonimos: ['diamicron', 'glicazida', 'sulfonilureia', 'antidiabético', 'dm2', 'hipoglicemiante'],
    categoria: 'antidiabético',
    classe: 'Sulfonilureia de 2ª Geração',
    indicacoes_principais: ['Diabetes Mellitus tipo 2 (DM2)'],
    dose_adulto: {
      habitual: '60', min: '30', max: '120', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'MR: 30–120 mg/dia com o café da manhã. Iniciar 30 mg/dia e ajustar a cada 4 semanas.',
    },
    ajuste_renal: {
      normal: 'Sem ajuste', tfg_60_30: 'Cautela — monitorar glicemia', tfg_30_15: 'Evitar', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['DM1', 'Cetoacidose diabética', 'IR/IH grave', 'Gestação', 'Alergia a sulfonamidas'],
    interacoes_importantes: [
      { com: 'Fluconazol/miconazol', severidade: 'grave', descricao: 'Hipoglicemia grave — inibem metabolismo da glicazida' },
      { com: 'AINEs/salicilatos', severidade: 'moderada', descricao: 'Potencializam hipoglicemia' },
    ],
    alertas_especiais: ['Hipoglicemia: principal risco — orientar paciente sobre sinais e tratamento', 'MR (liberação modificada) permite dose única diária — melhor adesão', 'Segura no idoso (menor risco de hipoglicemia que glibenclamida)'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [],
  },

  {
    id: 'glibenclamida',
    molecula: 'Glibenclamida',
    nome_generico: 'Glibenclamida',
    sinonimos: ['daonil', 'glibenclamida', 'sulfonilureia', 'antidiabético', 'dm2', 'hipoglicemiante'],
    categoria: 'antidiabético',
    classe: 'Sulfonilureia de 2ª Geração',
    indicacoes_principais: ['Diabetes Mellitus tipo 2 (DM2)'],
    dose_adulto: {
      habitual: '5', min: '2.5', max: '20', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
      instrucoes: 'Iniciar 2,5–5 mg/dia com refeição. Aumentar 2,5 mg a cada 1–2 semanas. Máx: 20 mg/dia.',
    },
    ajuste_renal: {
      normal: 'Sem ajuste', tfg_60_30: 'Evitar', tfg_30_15: 'Contraindicado', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['DM1', 'IR (TFG < 60)', 'Idosos > 65 anos (critérios Beers)', 'Cetoacidose', 'Gestação'],
    interacoes_importantes: [
      { com: 'Fluconazol', severidade: 'grave', descricao: 'Hipoglicemia grave' },
      { com: 'Álcool', severidade: 'moderada', descricao: 'Potencializa hipoglicemia e efeito antabuse (raro)' },
    ],
    alertas_especiais: ['⚠ Critérios Beers: EVITAR em idosos — hipoglicemia prolongada grave', 'Mecanismo: fecha canal K+-ATP → insulinossecretagogo independente de glicose', 'Preferir glicazida MR ou glimepirida no idoso'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [],
  },

  // ══════════════════════════════════════════════════════════
  // REUMATOLOGIA
  // ══════════════════════════════════════════════════════════

  {
    id: 'hidroxicloroquina',
    molecula: 'Hidroxicloroquina',
    nome_generico: 'Sulfato de Hidroxicloroquina',
    sinonimos: ['reuplaq', 'plaquinol', 'hidroxicloroquina', 'dmard', 'lupus', 'artrite'],
    categoria: 'imunossupressor',
    classe: 'DMARD Convencional — Antimalárico',
    indicacoes_principais: ['Artrite Reumatoide (moderada)', 'Lúpus Eritematoso Sistêmico (LES)', 'Artrite Psoriásica'],
    dose_adulto: {
      habitual: '400', min: '200', max: '400', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
      instrucoes: 'Dose máxima: 5 mg/kg de peso ideal. Tomar com alimento para reduzir dispepsia.',
    },
    ajuste_renal: {
      normal: '400 mg/dia', tfg_60_30: 'Reduzir dose/frequência', tfg_30_15: 'Cautela significativa', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['Retinopatia preexistente', 'Hipersensibilidade', 'QT longo congênito'],
    interacoes_importantes: [
      { com: 'Amiodarona/QT-prolongadores', severidade: 'grave', descricao: 'Prolongamento QT combinado — monitorar ECG' },
      { com: 'Antidiabéticos', severidade: 'moderada', descricao: 'Potencializa hipoglicemia' },
    ],
    alertas_especiais: ['⚠ Oftalmoscopia antes do início e anualmente após 5 anos (retinopatia irreversível)', 'Deficiência de G6PD: hemólise', 'Cat. D — apesar de geralmente permitida no LES gestacional'],
    uso_gestante: 'avaliar', uso_lactante: 'risco',
    marcas: [
      { nome: 'Reuplaq®', laboratorio: 'Eurofarma', concentracoes: ['400 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-reuplaq', verificado: true },
      { nome: 'Plaquinol', laboratorio: 'Sanofi', concentracoes: ['400 mg'], formas: ['Comprimido'] },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // CARDIOVASCULAR — TRIMETAZIDINA
  // ══════════════════════════════════════════════════════════

  {
    id: 'trimetazidina',
    molecula: 'Trimetazidina',
    nome_generico: 'Dicloridrato de Trimetazidina',
    sinonimos: ['vascor mr', 'trimetazidina', 'angina', 'cardioprotecao', 'ischemia'],
    categoria: 'cardiovascular',
    classe: 'Antiisquêmico Metabólico — Inibidor Parcial da Beta-Oxidação de Ácidos Graxos',
    indicacoes_principais: ['Angina estável (tratamento adjuvante)', 'Cardiopatia isquêmica crônica'],
    dose_adulto: {
      habitual: '35', min: '35', max: '70', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia'],
      instrucoes: 'Vascor MR® 35 mg LP: 1 cp 2x/dia (manhã e noite, com refeição).',
    },
    ajuste_renal: {
      normal: '35 mg 2x/dia', tfg_60_30: 'Reduzir para 35 mg 1x/dia', tfg_30_15: 'Evitar', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem dados', child_b: 'Cautela', child_c: 'Não recomendado' },
    contraindicacoes_rapidas: ['TFG < 30 mL/min', 'Doença de Parkinson ou sintomas parkinsonianos', 'Hipersensibilidade'],
    interacoes_importantes: [],
    alertas_especiais: ['Pode causar/agravar sintomas parkinsonianos e distúrbios do movimento', 'Não é antianginal de primeira linha — usar como adjuvante a betabloqueadores/nitratos', 'Uso exclusivamente VO com alimento'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Vascor MR®', laboratorio: 'Eurofarma', concentracoes: ['35 mg LP'], formas: ['Comprimido LP'], lab_id: 'eurofarma', produto_id: 'euro-vascor-mr', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // DERMATOLOGIA — ISOTRETINOÍNA
  // ══════════════════════════════════════════════════════════

  {
    id: 'isotretinoia',
    molecula: 'Isotretinoína',
    nome_generico: 'Isotretinoína',
    sinonimos: ['amalfi', 'isotretinoina', 'acne', 'acne grave', 'retinóide'],
    categoria: 'outro',
    classe: 'Retinóide Sistêmico — Derivado da Vitamina A',
    indicacoes_principais: ['Acne vulgar grave (nódulo-cística)', 'Acne moderada resistente a antibióticos', 'Rosácea grave (off-label)'],
    dose_adulto: {
      habitual: '0.5-1', min: '0.1', max: '1', unidade: 'mg/kg/dia', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
      instrucoes: 'Dose cumulativa alvo: 120–150 mg/kg. Iniciar com 0,5 mg/kg/dia. Tomar com refeição gordurosa.',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Cautela', tfg_30_15: 'Cautela', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela — monitorar TGO/TGP', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['GESTAÇÃO (Cat. X — teratogênico grave)', 'Lactação', 'Hipervitaminose A', 'Uso concomitante de tetraciclinas (hipertensão intracraniana)'],
    interacoes_importantes: [
      { com: 'Tetraciclinas', severidade: 'grave', descricao: 'Pseudotumor cerebri — contraindicado combinação' },
      { com: 'Vitamina A suplementar', severidade: 'grave', descricao: 'Hipervitaminose A aditiva' },
    ],
    alertas_especiais: [
      '🚨 TERATOGÊNICO — CATEGORIA X: 2 métodos contraceptivos por 1 mês antes, durante e 1 mês após tratamento',
      '⚠ Programa de Prevenção de Gravidez (PPG) obrigatório no Brasil — notificar ANVISA',
      'Teste de gravidez negativo antes e durante tratamento (mensal)',
      'Monitorar lipídios e transaminases mensalmente',
      'Receita especial com retenção (notificação de receita)',
    ],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'Amalfi®', laboratorio: 'Eurofarma', concentracoes: ['20 mg'], formas: ['Cápsula Mole'], lab_id: 'eurofarma', produto_id: 'euro-amalfi', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // DOR — IBUPROFENO + PARACETAMOL (COMBINAÇÃO)
  // ══════════════════════════════════════════════════════════

  {
    id: 'ibuprofeno-paracetamol',
    molecula: 'Ibuprofeno + Paracetamol',
    nome_generico: 'Ibuprofeno + Paracetamol',
    sinonimos: ['dualgi', 'ibuprofeno paracetamol', 'combinacao analgesica', 'dor aguda'],
    categoria: 'analgesico',
    classe: 'AINE + Analgésico não opioide — Combinação Fixa',
    indicacoes_principais: ['Dor aguda moderada', 'Cefaleia', 'Dor dentária', 'Dor musculoesquelética aguda', 'Dismenorreia'],
    dose_adulto: {
      habitual: '200+500', min: '200+500', max: '400+1000', unidade: 'mg', via: 'VO',
      frequencias: ['3x/dia', '4x/dia'],
      instrucoes: 'Dualgi®: 1 cp (ibuprofeno 200 mg + paracetamol 500 mg) a cada 6–8h. Máx: 3 cp/dia. Tomar com alimento.',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Reduzir dose ibuprofeno', tfg_30_15: 'Evitar ibuprofeno', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela (paracetamol)', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Alergia a AINEs/paracetamol', 'Úlcera péptica ativa', 'IRC/IH grave', 'Gestação 3º trimestre'],
    interacoes_importantes: [
      { com: 'Anticoagulantes', severidade: 'moderada', descricao: 'Ibuprofeno aumenta risco hemorrágico' },
      { com: 'Álcool (paracetamol)', severidade: 'grave', descricao: 'Hepatotoxicidade por paracetamol com álcool' },
    ],
    alertas_especiais: ['Associação sinérgica analgésica — evidência de superioridade à monoterapia', 'Não combinar com outros AINEs ou paracetamol isolado (risco de sobredose)'],
    uso_gestante: 'risco', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Dualgi®', laboratorio: 'Eurofarma', concentracoes: ['200 mg + 500 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-dualgi', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // DOR — CETOPROFENO LP
  // ══════════════════════════════════════════════════════════

  {
    id: 'cetoprofeno',
    molecula: 'Cetoprofeno',
    nome_generico: 'Cetoprofeno',
    sinonimos: ['bicerto', 'cetoprofeno', 'aine', 'anti-inflamatorio', 'artrite', 'dor aguda'],
    categoria: 'antiinflamatorio',
    classe: 'AINE — Inibidor COX não seletivo (derivado do ácido propiônico)',
    indicacoes_principais: ['Artrite Reumatoide', 'Osteoartrite', 'Espondilite Anquilosante', 'Dor aguda musculoesquelética', 'Dismenorreia'],
    dose_adulto: {
      habitual: '150', min: '100', max: '200', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia', '2x/dia'],
      instrucoes: 'Bicerto® LP 150 mg: 1 cp 1x/dia (preferir LP para maior tolerabilidade GI). Tomar com alimento.',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Cautela', tfg_30_15: 'Evitar', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Úlcera péptica ativa', 'Alergia a AINEs', 'IRC/IC grave', 'Gestação 3º trimestre'],
    interacoes_importantes: [
      { com: 'Anticoagulantes', severidade: 'grave', descricao: 'Risco hemorrágico aumentado' },
      { com: 'Metotrexato', severidade: 'grave', descricao: 'Reduz clearance — toxicidade do MTX' },
    ],
    alertas_especiais: ['Formulação LP (liberação prolongada) melhora tolerabilidade GI vs formulação imediata', 'Fotossensibilidade — usar protetor solar'],
    uso_gestante: 'risco', uso_lactante: 'risco',
    marcas: [
      { nome: 'Bicerto®', laboratorio: 'Eurofarma', concentracoes: ['150 mg LP'], formas: ['Comprimido LP'], lab_id: 'eurofarma', produto_id: 'euro-bicerto', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // ORTOPEDIA — RISEDRONATO
  // ══════════════════════════════════════════════════════════

  {
    id: 'risedronato',
    molecula: 'Risedronato',
    nome_generico: 'Sódio de Risedronato',
    sinonimos: ['dorto', 'risedronato', 'osteoporose', 'bifosfonato', 'bisfosfonato'],
    categoria: 'outro',
    classe: 'Bifosfonato — Antirreabsortivo Ósseo',
    indicacoes_principais: ['Osteoporose pós-menopáusica', 'Osteoporose induzida por corticóide', 'Doença de Paget óssea'],
    dose_adulto: {
      habitual: '150', min: '35', max: '150', unidade: 'mg', via: 'VO',
      frequencias: ['1x/mês'],
      instrucoes: 'D\'Orto® 150 mg: 1 cp 1x/mês. Em jejum, 30 min antes da primeira refeição, com copo cheio d\'água. Permanecer em pé por 30 min após.',
    },
    ajuste_renal: {
      normal: 'Dose habitual', tfg_60_30: 'Cautela', tfg_30_15: 'Não recomendado', tfg_lt_15: 'Contraindicado', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste necessário', child_b: 'Sem ajuste', child_c: 'Sem dados' },
    contraindicacoes_rapidas: ['Hipocalcemia não corrigida', 'TFG < 30 mL/min', 'Disfagia/esofagite ativa', 'Incapacidade de permanecer sentado/em pé'],
    interacoes_importantes: [
      { com: 'Antiácidos/cálcio/ferro oral', severidade: 'moderada', descricao: 'Quelam risedronato — separar por ≥ 2h' },
    ],
    alertas_especiais: ['⚠ Osteonecroses de maxila (raro — especialmente com uso IV prolongado ou oncológico)', 'Fratura atípica de fêmur (uso prolongado > 5 anos — reavaliar benefício/risco)', 'Administração mensal melhora adesão vs semanal', 'Suplementação de cálcio e vitamina D recomendada'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'D\'Orto®', laboratorio: 'Eurofarma', concentracoes: ['150 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-dorto', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // INFECTOLOGIA — NITAZOXANIDA
  // ══════════════════════════════════════════════════════════

  {
    id: 'nitazoxanida',
    molecula: 'Nitazoxanida',
    nome_generico: 'Nitazoxanida',
    sinonimos: ['azox', 'nitazoxanida', 'antiparasitario', 'giardíase', 'criptosporidiose', 'diarreia'],
    categoria: 'antiparasitario',
    classe: 'Antiprotozoário — Nitrotiazolil-Salicilamida',
    indicacoes_principais: ['Giardíase', 'Criptosporidiose', 'Amebíase intestinal', 'Diarreia por Clostridioides difficile (adjuvante)'],
    dose_adulto: {
      habitual: '500', min: '500', max: '1000', unidade: 'mg', via: 'VO',
      frequencias: ['2x/dia'],
      instrucoes: '500 mg 2x/dia por 3 dias (giardíase/amebíase). Tomar com alimento.',
    },
    ajuste_renal: {
      normal: '500 mg 2x/dia', tfg_60_30: 'Cautela', tfg_30_15: 'Evitar', tfg_lt_15: 'Evitar', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Evitar', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'IR/IH grave'],
    interacoes_importantes: [
      { com: 'Varfarina', severidade: 'moderada', descricao: 'Alta ligação proteica — pode deslocar varfarina; monitorar INR' },
    ],
    alertas_especiais: ['Coloração amarelada da urina (sem toxicidade)', 'Eficácia contra vírus influenza e outros vírus (uso off-label)'],
    uso_gestante: 'avaliar', uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Azox®', laboratorio: 'Eurofarma', concentracoes: ['500 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-azox', verificado: true },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // INFECTOLOGIA — MOXIFLOXACINO
  // ══════════════════════════════════════════════════════════

  {
    id: 'moxifloxacino',
    molecula: 'Moxifloxacino',
    nome_generico: 'Cloridrato de Moxifloxacino',
    sinonimos: ['praiva', 'moxifloxacino', 'fluoroquinolona', 'pneumonia', 'sinusite', 'antibiotico'],
    categoria: 'antibiotico',
    classe: 'Fluoroquinolona de 4ª Geração — Inibidor DNA Girase e Topoisomerase IV',
    indicacoes_principais: ['Pneumonia Adquirida na Comunidade (PAC)', 'Sinusite bacteriana aguda', 'Exacerbação aguda de DPOC', 'Infecções de pele e partes moles'],
    dose_adulto: {
      habitual: '400', min: '400', max: '400', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: '400 mg 1x/dia. PAC: 5–10 dias. Sinusite: 7 dias. DPOC: 5 dias.',
    },
    ajuste_renal: {
      normal: '400 mg 1x/dia', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste (cautela)', tfg_lt_15: 'Cautela', dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Evitar' },
    contraindicacoes_rapidas: ['QT prolongado', 'Uso com outros QT-prolongadores', 'Hipocalemia/Hipomagnasemia não corrigida', '< 18 anos', 'Gestação/Lactação'],
    interacoes_importantes: [
      { com: 'Antiarrítmicos IA/III (amiodarona)', severidade: 'grave', descricao: 'QT sinérgico — risco de torsades de pointes' },
      { com: 'Antiácidos com Al/Mg/Ca', severidade: 'moderada', descricao: 'Reduz absorção — separar por ≥ 4h' },
    ],
    alertas_especiais: ['⚠ Risco de tendinopatia/ruptura tendínea (especialmente em idosos e com corticóides)', 'Boa cobertura de pneumococo resistente e atípicos (Legionella, Mycoplasma)', 'Não cobre Pseudomonas — em PAC grave, considerar combinação'],
    uso_gestante: 'contraindicado', uso_lactante: 'contraindicado',
    marcas: [
      { nome: 'PraIVA®', laboratorio: 'Eurofarma', concentracoes: ['400 mg'], formas: ['Comprimido'], lab_id: 'eurofarma', produto_id: 'euro-praiva-comp', verificado: true },
    ],
  },
];

// ─── FUNÇÕES DE BUSCA ─────────────────────────────────────────

export function searchDrugs(query: string, labPreference?: string): QuickDrug[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();

  // Match apenas no início de palavras (após espaço, hífen, parêntese, + ou início de string).
  // Evita que "astro" retorne "Gastroparesia" ou "Antagonista".
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordRe = new RegExp(`(?:^|[\\s\\-\\/+®,(\\[])${esc}`, 'i');
  const wordMatch = (text: string) => wordRe.test(text);

  const results = PHARMA_DB.filter(drug => {
    // Molécula e nome genérico — substring livre (nomes técnicos longos)
    if (drug.molecula.toLowerCase().includes(q)) return true;
    if (drug.nome_generico.toLowerCase().includes(q)) return true;
    // Sinonimos — word-start (evita falsos positivos entre sinônimos similares)
    if (drug.sinonimos.some(s => wordMatch(s) || s.toLowerCase() === q)) return true;
    // Classe — word-start (impede "astro" → "Antagonista")
    if (wordMatch(drug.classe)) return true;
    // Marcas — substring livre (nomes comerciais podem ser partes de palavras)
    if (drug.marcas.some(b =>
      b.nome.toLowerCase().includes(q) ||
      b.laboratorio.toLowerCase().includes(q)
    )) return true;
    // Indicações — word-start (impede "astro" → "Gastroparesia")
    if (drug.indicacoes_principais.some(i => wordMatch(i))) return true;
    return false;
  });

  // Ordenar: correspondência na molécula > marca > sinonimo > lab preference
  const scored = results.map(drug => {
    let score = 0;
    if (drug.molecula.toLowerCase().startsWith(q)) score += 100;
    else if (drug.molecula.toLowerCase().includes(q)) score += 60;
    if (drug.marcas.some(b => b.nome.toLowerCase().startsWith(q))) score += 80;
    if (drug.sinonimos.some(s => s.toLowerCase().startsWith(q))) score += 50;
    if (labPreference && labPreference !== 'sem_preferencia') {
      if (drug.marcas.some(m => m.lab_id === labPreference)) score += 30;
    }
    return { drug, score };
  });

  return scored.sort((a, b) => b.score - a.score).map(s => s.drug);
}

export function getDrugById(id: string): QuickDrug | undefined {
  return PHARMA_DB.find(d => d.id === id);
}

export function getBrandsForLab(drug: QuickDrug, labId: string): QuickBrand[] {
  if (!labId || labId === 'sem_preferencia') return drug.marcas;
  const preferred = drug.marcas.filter(m => m.lab_id === labId || m.laboratorio.toLowerCase() === labId.toLowerCase());
  const others = drug.marcas.filter(m => m.lab_id !== labId && m.laboratorio.toLowerCase() !== labId.toLowerCase());
  return [...preferred, ...others];
}

// Inclui variantes sem acento pois produtoToQuickBrand() gera 'Solucao oral', 'Suspensao oral'
const FORMAS_LIQUIDAS = ['solução', 'solucao', 'suspensão', 'suspensao', 'gotas', 'xarope', 'líquido', 'liquido', 'elixir'];

export function isFormaLiquida(brand: QuickBrand): boolean {
  return (
    brand.formas.some(f => FORMAS_LIQUIDAS.some(liq => f.toLowerCase().includes(liq))) ||
    brand.concentracoes.some(c => /mg\/ml|mg\/gota|mg\/5\s*ml|mcg\/ml/i.test(c))
  );
}

const CONC_LIQUIDA_RE = /\/\s*ml|\/\s*gota|mg\/5\s*ml|mcg\/ml|xarope|solução|suspensão/i;

/** Retorna true se a string de concentração representa uma forma líquida */
export function isConcLiquida(conc: string): boolean {
  return CONC_LIQUIDA_RE.test(conc);
}

/**
 * Retorna a concentração preferida da marca:
 * - Para pediátricos (< 12 anos com dose_pediatrica), prefere a primeira concentração líquida
 * - Caso contrário, retorna a primeira concentração
 */
export function getPreferredConcentration(
  brand: QuickBrand,
  drug: QuickDrug,
  idadeAnos?: number,
): string {
  if (idadeAnos !== undefined && idadeAnos < 12 && drug.dose_pediatrica) {
    const liquida = brand.concentracoes.find(isConcLiquida);
    if (liquida) return liquida;
  }
  return brand.concentracoes[0] ?? '';
}

/**
 * Retorna a marca preferida considerando:
 * 1. Preferência de laboratório
 * 2. Para pacientes pediátricos (< 12 anos com dose_pediatrica), preferir formas líquidas
 */
export function getPreferredBrandForPatient(
  drug: QuickDrug,
  labId: string,
  idadeAnos?: number,
): QuickBrand | null {
  const brands = getBrandsForLab(drug, labId);
  if (!brands.length) return null;

  if (idadeAnos !== undefined && idadeAnos < 12 && drug.dose_pediatrica) {
    // Padrão A: marca separada com forma líquida
    const liquidas = brands.filter(isFormaLiquida);
    if (liquidas.length > 0) return liquidas[0];
    // Padrão B: marca mista com concentração líquida → retorna a mesma marca
    // (a concentração será selecionada por getPreferredConcentration)
    const marcaComLiquido = brands.find(b => b.concentracoes.some(isConcLiquida));
    if (marcaComLiquido) return marcaComLiquido;
  }

  return brands[0];
}

export const CATEGORIA_LABELS: Record<DrugCategory, string> = {
  cardiovascular: 'Cardiovascular',
  antihipertensivo: 'Anti-hipertensivo',
  antidiabético: 'Antidiabético',
  respiratory: 'Respiratório',
  antibiotico: 'Antibiótico',
  antifungico: 'Antifúngico',
  antiparasitario: 'Antiparasitário',
  psiquiatria: 'Psiquiatria',
  neurologico: 'Neurológico',
  gastroenterologia: 'Gastroenterologia',
  analgesico: 'Analgésico',
  antiinflamatorio: 'Anti-inflamatório',
  hormonio: 'Hormônio',
  oncologia: 'Oncologia',
  imunossupressor: 'Imunossupressor',
  outro: 'Outro',
};

// ─── ENRIQUECIMENTO COM CATÁLOGO DE LABORATÓRIOS VERIFICADOS ─
// Substitui marcas hardcoded pelos dados reais do catálogo oficial.
// normMol() (importada de eurofarma-sync) garante matching exato após
// normalizar prefixos salinos e sufixos de hidratação — evita falsos
// positivos como Prednisona → Prednisolona, Amoxicilina → Amox+Clav etc.
(function enrichWithEurofarma() {
  for (const drug of PHARMA_DB) {
    const dn = normMol(drug.molecula);
    const verified = EUROFARMA_CATALOG.filter(p => normMol(p.molecula) === dn);
    if (verified.length === 0) continue;
    const nonEurofarma = drug.marcas.filter(
      m => m.lab_id !== 'eurofarma' && m.laboratorio.toLowerCase() !== 'eurofarma'
    );
    drug.marcas = [...verified.map(produtoToQuickBrand), ...nonEurofarma];
  }
})();

export const GESTANTE_LABELS: Record<string, { label: string; color: string }> = {
  seguro: { label: 'Geralmente seguro', color: 'text-green-600' },
  avaliar: { label: 'Avaliar risco-benefício', color: 'text-yellow-600' },
  risco: { label: 'Risco potencial', color: 'text-orange-600' },
  contraindicado: { label: 'Contraindicado', color: 'text-red-600' },
};
