// ============================================================
// PRESCREVE-AI — Banco Farmacológico para Prescrição Rápida
// Otimizado para busca instantânea e cálculo de doses
// ============================================================

export type DoseUnit = 'mg' | 'mcg' | 'g' | 'mL' | 'UI' | 'mg/kg' | 'mcg/kg' | 'mg/m²' | 'UI/kg' | 'gotas';
export type Via = 'VO' | 'IV' | 'IM' | 'SC' | 'Inalatório' | 'Tópico' | 'Retal' | 'Sublingual';

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
import { getProdutosByMolecula } from './eurofarma-sync';
import type { ProdutoComercial } from './types';

function produtoToQuickBrand(p: ProdutoComercial): QuickBrand {
  const formas = [...new Set(p.apresentacoes.map((a: { forma_farmaceutica: string }) => {
    const f = a.forma_farmaceutica.replace(/_/g, ' ');
    return f.charAt(0).toUpperCase() + f.slice(1);
  }))] as string[];
  return {
    nome: p.nome_comercial,
    laboratorio: 'Eurofarma',
    concentracoes: p.apresentacoes.map((a: { concentracao: string }) => a.concentracao),
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
      { nome: 'Metformina Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['500 mg', '850 mg', '1000 mg'], formas: ['Comprimido'], lab_id: 'eurofarma' },
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
    sinonimos: ['amoxil', 'amoxicillin', 'penicilina', 'antibiotico'],
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
      faixa_etaria: '> 3 meses: 40-90 mg/kg/dia divididos em 2-3 doses',
      observacao: 'Alta dose (90 mg/kg/dia) para S. pneumoniae com resistência intermediária',
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
      { nome: 'Amoxicilina Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['500 mg', '875 mg', '250 mg/5 mL'], formas: ['Cápsula', 'Comprimido', 'Suspensão'], lab_id: 'eurofarma' },
      { nome: 'Amoxil', laboratorio: 'GSK', concentracoes: ['500 mg', '875 mg', '250 mg/5 mL'], formas: ['Cápsula', 'Comprimido', 'Suspensão'] },
    ],
  },

  {
    id: 'azitromicina',
    molecula: 'Azitromicina',
    nome_generico: 'Azitromicina Di-hidratada',
    sinonimos: ['zithromax', 'macrolideo', 'antibiotico atipico'],
    categoria: 'antibiotico',
    classe: 'Macrolídeo',
    indicacoes_principais: ['PAC (agentes atípicos)', 'DST (clamídia, gonorréia)', 'Infecções pele'],
    dose_adulto: {
      habitual: '500', min: '250', max: '500', unidade: 'mg', via: 'VO',
      frequencias: ['1x/dia'],
      instrucoes: 'PAC: 500 mg/dia por 3-5 dias. DST (clamídia): 1g dose única.',
    },
    dose_pediatrica: {
      calculo: 'mg/kg/dia', dose_por_kg: 10, unidade: 'mg',
      frequencia_divisoes: 1, max_dose_dia: 500, max_dose_dia_unidade: 'mg/dia',
      faixa_etaria: '> 6 meses: 10 mg/kg/dia por 3 dias (máx 500 mg)',
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
      { nome: 'Azitromicina Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['500 mg'], formas: ['Comprimido', 'Suspensão'], lab_id: 'eurofarma' },
      { nome: 'Zitromax', laboratorio: 'Pfizer', concentracoes: ['500 mg'], formas: ['Comprimido'] },
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
];

// ─── FUNÇÕES DE BUSCA ─────────────────────────────────────────

export function searchDrugs(query: string, labPreference?: string): QuickDrug[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();

  const results = PHARMA_DB.filter(drug => {
    return (
      drug.molecula.toLowerCase().includes(q) ||
      drug.nome_generico.toLowerCase().includes(q) ||
      drug.sinonimos.some(s => s.toLowerCase().includes(q)) ||
      drug.classe.toLowerCase().includes(q) ||
      drug.marcas.some(b =>
        b.nome.toLowerCase().includes(q) ||
        b.laboratorio.toLowerCase().includes(q)
      ) ||
      drug.indicacoes_principais.some(i => i.toLowerCase().includes(q))
    );
  });

  // Se há preferência de laboratório, ordenar para mostrar primeiro
  if (labPreference && labPreference !== 'sem_preferencia') {
    return results.sort((a, b) => {
      const aHasLab = a.marcas.some(m => m.lab_id === labPreference || m.laboratorio.toLowerCase() === labPreference);
      const bHasLab = b.marcas.some(m => m.lab_id === labPreference || m.laboratorio.toLowerCase() === labPreference);
      return aHasLab === bHasLab ? 0 : aHasLab ? -1 : 1;
    });
  }

  return results;
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

// ─── ENRIQUECIMENTO COM CATÁLOGO EUROFARMA VERIFICADO ────────
// Substitui as marcas Eurofarma hardcoded pelos dados reais do portal oficial.
// Se uma molécula não existe no catálogo verificado, mantém os dados originais.
(function enrichWithEurofarma() {
  for (const drug of PHARMA_DB) {
    const verified = getProdutosByMolecula(drug.molecula);
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
