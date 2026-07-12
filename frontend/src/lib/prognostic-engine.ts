// ============================================================
// PRESCREVE-AI — Motor de Prognóstico Clínico
// Scores validados com fórmulas, interpretação, evidência e diretriz
// Ferramenta de apoio à decisão clínica — não substitui julgamento médico
// NOTA: arquivo distinto de prognosis-engine.ts (predição de desfechos 30d/6m/1a)
//       Este módulo: scores de risco estruturados (GRACE, TIMI, CHA₂DS₂-VASc…)
//       prognosis-engine.ts: predição probabilística por perfil CID + comorbidades
// ============================================================

// ─── Tipos ───────────────────────────────────────────────────

export type ScoreCategoria =
  | 'geral'
  | 'renal'
  | 'cardiovascular'
  | 'hepatico'
  | 'pulmonar'
  | 'coagulacao'
  | 'obstetrico';

export type RiscoNivel = 'baixo' | 'moderado' | 'alto' | 'muito_alto';
export type RiscoCor = 'green' | 'yellow' | 'orange' | 'red';

export interface ScoreVariavel {
  id: string;
  label: string;
  tipo: 'number' | 'select' | 'boolean';
  unidade?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  opcoes?: { label: string; valor: number }[];
}

export interface ScoreResultado {
  pontuacao: number | string;
  interpretacao: string;
  risco: RiscoNivel;
  cor: RiscoCor;
  conduta: string;
  detalhe?: string;
}

export interface ScoreDefinition {
  id: string;
  nome: string;
  sigla: string;
  categoria: ScoreCategoria;
  descricao: string;
  formula_desc: string;
  variaveis: ScoreVariavel[];
  calcular: (v: Record<string, number>) => number | null;
  interpretar: (resultado: number, v?: Record<string, number>) => ScoreResultado;
  evidencia: string;
  diretriz: string;
  sociedade: string;
  ano: number;
  referencia: string;
}

// ─── Helpers internos ────────────────────────────────────────

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// ─── 1. IMC ──────────────────────────────────────────────────

const imc: ScoreDefinition = {
  id: 'imc',
  nome: 'Índice de Massa Corporal',
  sigla: 'IMC',
  categoria: 'geral',
  descricao: 'Classifica o estado nutricional com base na relação entre peso e altura. Amplamente usado como triagem de obesidade e risco metabólico.',
  formula_desc: 'IMC = Peso (kg) ÷ Altura² (m)',
  variaveis: [
    { id: 'peso', label: 'Peso', tipo: 'number', unidade: 'kg', min: 10, max: 300, step: 0.1 },
    { id: 'altura', label: 'Altura', tipo: 'number', unidade: 'cm', min: 50, max: 250, step: 1 },
  ],
  calcular: (v) => {
    if (!v.peso || !v.altura) return null;
    const altM = v.altura / 100;
    return parseFloat((v.peso / (altM * altM)).toFixed(1));
  },
  interpretar: (r) => {
    if (r < 18.5) return { pontuacao: r, interpretacao: 'Abaixo do peso', risco: 'moderado', cor: 'yellow', conduta: 'Avaliar causa de baixo peso. Suporte nutricional. Rastrear desnutrição e doenças consumptivas.' };
    if (r < 25)   return { pontuacao: r, interpretacao: 'Peso normal', risco: 'baixo', cor: 'green', conduta: 'Manter hábitos saudáveis. Peso adequado para estatura.' };
    if (r < 30)   return { pontuacao: r, interpretacao: 'Sobrepeso', risco: 'moderado', cor: 'yellow', conduta: 'Orientar mudança de estilo de vida. Rastrear síndrome metabólica, DM2 e HAS.' };
    if (r < 35)   return { pontuacao: r, interpretacao: 'Obesidade Grau I', risco: 'alto', cor: 'orange', conduta: 'Intervenção no estilo de vida intensiva. Avaliar comorbidades (HAS, DM2, dislipidemia, apneia do sono, DRGE).' };
    if (r < 40)   return { pontuacao: r, interpretacao: 'Obesidade Grau II', risco: 'alto', cor: 'orange', conduta: 'Avaliar indicação de medicamento para obesidade. Encaminhar nutricionista. Considerar cirurgia bariátrica.' };
    return          { pontuacao: r, interpretacao: 'Obesidade Grau III (Mórbida)', risco: 'muito_alto', cor: 'red', conduta: 'Encaminhar para cirurgia bariátrica se IMC ≥ 40 + comorbidades. Risco CV e metabólico muito elevado.' };
  },
  evidencia: 'Múltiplos estudos observacionais e ECRs — correlação com mortalidade cardiovascular e metabólica',
  diretriz: 'Classificação da Obesidade — OMS / Diretriz Brasileira de Obesidade ABESO 2022',
  sociedade: 'OMS / ABESO',
  ano: 2022,
  referencia: 'Diretrizes Brasileiras de Obesidade. ABESO 2022.',
};

// ─── 2. Cockcroft-Gault ──────────────────────────────────────

const cockcroftGault: ScoreDefinition = {
  id: 'cg',
  nome: 'Clearance de Creatinina (Cockcroft-Gault)',
  sigla: 'CG',
  categoria: 'renal',
  descricao: 'Estima o clearance de creatinina (ClCr) para ajuste de dose de medicamentos. Ainda preferido por muitas bulas farmacológicas por sua validade clínica em populações especiais.',
  formula_desc: 'ClCr = [(140 − Idade) × Peso] ÷ [72 × Creatinina] × 0,85 (se feminino)',
  variaveis: [
    { id: 'idade', label: 'Idade', tipo: 'number', unidade: 'anos', min: 18, max: 120, step: 1 },
    { id: 'peso', label: 'Peso', tipo: 'number', unidade: 'kg', min: 20, max: 300, step: 0.1 },
    { id: 'creatinina', label: 'Creatinina sérica', tipo: 'number', unidade: 'mg/dL', min: 0.1, max: 20, step: 0.01 },
    { id: 'sexo', label: 'Sexo biológico', tipo: 'select', opcoes: [{ label: 'Masculino', valor: 1 }, { label: 'Feminino', valor: 0.85 }] },
  ],
  calcular: (v) => {
    if (!v.idade || !v.peso || !v.creatinina || v.sexo === undefined) return null;
    const fator = v.sexo === 1 ? 1 : 0.85;
    return parseFloat((((140 - v.idade) * v.peso) / (72 * v.creatinina) * fator).toFixed(1));
  },
  interpretar: (r) => {
    if (r >= 90)  return { pontuacao: r, interpretacao: 'Função renal normal (G1)', risco: 'baixo', cor: 'green', conduta: 'Sem ajuste de dose necessário para a maioria dos fármacos.' };
    if (r >= 60)  return { pontuacao: r, interpretacao: 'Redução leve (G2)', risco: 'baixo', cor: 'green', conduta: 'Monitorar função renal. Ajuste de dose raramente necessário.' };
    if (r >= 45)  return { pontuacao: r, interpretacao: 'Redução leve-moderada (G3a)', risco: 'moderado', cor: 'yellow', conduta: 'Verificar bula de cada medicamento. Evitar metformina se < 45.' };
    if (r >= 30)  return { pontuacao: r, interpretacao: 'Redução moderada-grave (G3b)', risco: 'moderado', cor: 'yellow', conduta: 'Ajuste obrigatório para: IECA, BRA, metformina, digoxina, HBPM, NOAC. Monitorar K+.' };
    if (r >= 15)  return { pontuacao: r, interpretacao: 'Redução grave (G4)', risco: 'alto', cor: 'orange', conduta: 'Encaminhar nefrologia. Evitar AINEs, contraste iodado. Ajuste rigoroso de todos os fármacos.' };
    return          { pontuacao: r, interpretacao: 'Falência renal (G5)', risco: 'muito_alto', cor: 'red', conduta: 'DRT — preparar para terapia de substituição renal. Contraindicações múltiplas a fármacos.' };
  },
  evidencia: 'Validado em coortes populacionais — correlação com excreção de inulina em adultos com massa muscular normal',
  diretriz: 'KDIGO 2012 Clinical Practice Guideline for CKD Evaluation',
  sociedade: 'KDIGO',
  ano: 2012,
  referencia: 'Cockcroft DW, Gault MH. Nephron. 1976;16(1):31-41.',
};

// ─── 3. CKD-EPI 2021 ─────────────────────────────────────────

const ckdEpi: ScoreDefinition = {
  id: 'ckd_epi',
  nome: 'Taxa de Filtração Glomerular Estimada (CKD-EPI 2021)',
  sigla: 'CKD-EPI',
  categoria: 'renal',
  descricao: 'Equação de 2021 sem raça para estimativa da TFG. Referência atual para estadiamento de DRC conforme KDIGO. Preferível ao Cockcroft-Gault para estadiamento.',
  formula_desc: 'eGFR = 142 × min(Cr/κ, 1)^α × max(Cr/κ, 1)^−1,200 × 0,9938^Idade [× 1,012 se F]\nκ: 0,7(F) / 0,9(M) · α: −0,241(F) / −0,302(M) se Cr ≤ κ; −1,200 se Cr > κ',
  variaveis: [
    { id: 'creatinina', label: 'Creatinina sérica', tipo: 'number', unidade: 'mg/dL', min: 0.1, max: 20, step: 0.01 },
    { id: 'idade', label: 'Idade', tipo: 'number', unidade: 'anos', min: 18, max: 120, step: 1 },
    { id: 'sexo', label: 'Sexo biológico', tipo: 'select', opcoes: [{ label: 'Masculino', valor: 1 }, { label: 'Feminino', valor: 2 }] },
  ],
  calcular: (v) => {
    if (!v.creatinina || !v.idade || !v.sexo) return null;
    const scr = v.creatinina;
    const isFem = v.sexo === 2;
    const kappa = isFem ? 0.7 : 0.9;
    const alpha = isFem ? -0.241 : -0.302;
    const ratio = scr / kappa;
    const base = 142 * Math.pow(Math.min(ratio, 1), alpha) * Math.pow(Math.max(ratio, 1), -1.200) * Math.pow(0.9938, v.idade);
    const result = isFem ? base * 1.012 : base;
    return parseFloat(result.toFixed(1));
  },
  interpretar: (r) => {
    if (r >= 90)  return { pontuacao: r, interpretacao: 'G1 — Normal ou elevada', risco: 'baixo', cor: 'green', conduta: 'Monitorar anualmente. Controle de fatores de risco para progressão (HAS, DM).' };
    if (r >= 60)  return { pontuacao: r, interpretacao: 'G2 — Levemente reduzida', risco: 'baixo', cor: 'green', conduta: 'Monitorar semestralmente. Controle pressórico e glicêmico.' };
    if (r >= 45)  return { pontuacao: r, interpretacao: 'G3a — Leve a moderada', risco: 'moderado', cor: 'yellow', conduta: 'Revisar todos os medicamentos. Monitorar: pressão, K+, bicarbonato, hemoglobina.' };
    if (r >= 30)  return { pontuacao: r, interpretacao: 'G3b — Moderada a grave', risco: 'moderado', cor: 'yellow', conduta: 'Encaminhar nefrologia. Vitamina D, EPO se anemia. Ajustar fármacos rigorosamente.' };
    if (r >= 15)  return { pontuacao: r, interpretacao: 'G4 — Gravemente reduzida', risco: 'alto', cor: 'orange', conduta: 'Nefrologia urgente. Preparar acesso para diálise. Contraindicações: AINEs, contraste, metformina.' };
    return          { pontuacao: r, interpretacao: 'G5 — Falência renal', risco: 'muito_alto', cor: 'red', conduta: 'Terapia de substituição renal (diálise ou transplante).' };
  },
  evidencia: 'Validada em > 1 milhão de participantes de estudos de coorte — Levey AS et al. 2021',
  diretriz: 'KDIGO 2022 Clinical Practice Guideline for CKD',
  sociedade: 'KDIGO',
  ano: 2022,
  referencia: 'Inker LA et al. New England Journal of Medicine. 2021;385(19):1737-1749.',
};

// ─── 4. CURB-65 ──────────────────────────────────────────────

const curb65: ScoreDefinition = {
  id: 'curb65',
  nome: 'Escore de Gravidade de Pneumonia Adquirida na Comunidade',
  sigla: 'CURB-65',
  categoria: 'pulmonar',
  descricao: 'Prediz mortalidade em 30 dias na PAC e orienta a decisão ambulatório vs. internação vs. UTI.',
  formula_desc: 'C = Confusão · U = Ureia > 50 mg/dL · R = FR ≥ 30/min · B = PAS < 90 ou PAD ≤ 60 · 65 = Idade ≥ 65 anos\nCada critério = 1 ponto (máx 5)',
  variaveis: [
    { id: 'confusao', label: 'Confusão mental (desorientação, glasgow < 15)', tipo: 'boolean', opcoes: [{ label: 'Ausente', valor: 0 }, { label: 'Presente', valor: 1 }] },
    { id: 'ureia', label: 'Ureia > 50 mg/dL (> 7 mmol/L)', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'fr', label: 'Frequência respiratória ≥ 30/min', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'pa', label: 'PAS < 90 mmHg ou PAD ≤ 60 mmHg', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'idade65', label: 'Idade ≥ 65 anos', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
  ],
  calcular: (v) => (v.confusao ?? 0) + (v.ureia ?? 0) + (v.fr ?? 0) + (v.pa ?? 0) + (v.idade65 ?? 0),
  interpretar: (r) => {
    if (r <= 1) return { pontuacao: r, interpretacao: 'PAC leve — mortalidade ~1,5%', risco: 'baixo', cor: 'green', conduta: 'Tratamento ambulatorial. Amoxicilina VO por 5 dias. Retorno em 48–72h.' };
    if (r === 2) return { pontuacao: r, interpretacao: 'PAC moderada — mortalidade ~9%', risco: 'moderado', cor: 'yellow', conduta: 'Considerar internação hospitalar. Avaliar suporte e resposta clínica em 24–48h.' };
    if (r === 3) return { pontuacao: r, interpretacao: 'PAC grave — mortalidade ~17%', risco: 'alto', cor: 'orange', conduta: 'Internação hospitalar indicada. Antibioticoterapia IV. Monitorização contínua.' };
    return         { pontuacao: r, interpretacao: `PAC muito grave — mortalidade ~${r >= 4 ? '41' : '57'}%`, risco: 'muito_alto', cor: 'red', conduta: 'Internação em UTI. Antibioticoterapia IV de amplo espectro. Avaliação para ventilação mecânica.' };
  },
  evidencia: 'Derivado e validado em coortes prospectivas multicêntricas — Lim WS et al. (2003)',
  diretriz: 'Diretrizes Brasileiras de PAC — SBPT/AMIB 2022',
  sociedade: 'SBPT / BTS',
  ano: 2022,
  referencia: 'Lim WS et al. Thorax. 2003;58(5):377-382.',
};

// ─── 5. CHA2DS2-VASc ─────────────────────────────────────────

const cha2ds2vasc: ScoreDefinition = {
  id: 'cha2ds2vasc',
  nome: 'Risco de AVC em Fibrilação Atrial',
  sigla: 'CHA₂DS₂-VASc',
  categoria: 'cardiovascular',
  descricao: 'Estratifica o risco de AVC e eventos tromboembólicos em pacientes com fibrilação atrial não valvar, orientando a indicação de anticoagulação oral.',
  formula_desc: 'C=ICC/FEVE<40%(1) · H=HAS(1) · A₂=Idade≥75(2) · D=DM(1) · S₂=AVC/AIT/TEE(2) · V=DCV(1) · A=Idade 65-74(1) · Sc=Sexo F(1)\nMáximo: 9 pontos',
  variaveis: [
    { id: 'icc', label: 'IC com FEVE reduzida ou FEVE < 40%', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'has', label: 'Hipertensão arterial sistêmica', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'idade75', label: 'Idade ≥ 75 anos', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 2 }] },
    { id: 'dm', label: 'Diabetes mellitus', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'avc', label: 'AVC, AIT ou tromboembolismo prévio', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 2 }] },
    { id: 'dcv', label: 'Doença vascular (DAC, IAM prévio, DAP, placa aórtica)', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'idade65', label: 'Idade 65–74 anos', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'sexoF', label: 'Sexo biológico feminino', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
  ],
  calcular: (v) => (v.icc ?? 0) + (v.has ?? 0) + (v.idade75 ?? 0) + (v.dm ?? 0) + (v.avc ?? 0) + (v.dcv ?? 0) + (v.idade65 ?? 0) + (v.sexoF ?? 0),
  interpretar: (r, v) => {
    const isFem = v?.sexoF === 1;
    // Annual stroke risk estimates: 0=0%, 1=1,3%, 2=2,2%, 3=3,2%, 4=4%, 5=6,7%, 6=9,8%, 7=9,6%, 8=12,5%, 9=15,2%
    const strokeRisk = [0, 1.3, 2.2, 3.2, 4.0, 6.7, 9.8, 9.6, 12.5, 15.2];
    const risco = strokeRisk[clamp(r, 0, 9)];

    if (r === 0 && !isFem) return { pontuacao: r, interpretacao: `Risco muito baixo — ${risco}%/ano`, risco: 'baixo', cor: 'green', conduta: 'Anticoagulação NÃO indicada. Nenhuma intervenção tromboembólica.' };
    if ((r === 1 && !isFem) || (r <= 2 && isFem)) return { pontuacao: r, interpretacao: `Risco baixo-moderado — ~${risco}%/ano`, risco: 'moderado', cor: 'yellow', conduta: 'Anticoagulação pode ser considerada. Discussão individualizada (risco-benefício vs sangramento).' };
    return { pontuacao: r, interpretacao: `Risco elevado — ~${risco}%/ano`, risco: 'alto', cor: 'red', conduta: `Anticoagulação oral recomendada. Preferir NOAC (rivaroxabana, apixabana, dabigatrana) sobre warfarina. Calcular HAS-BLED.` };
  },
  evidencia: 'Derivado em 1.733 pacientes com FA — Lip GY et al. (2010). Validado extensivamente.',
  diretriz: 'Diretriz Brasileira de Fibrilação Atrial — SBC 2023 / ESC 2020',
  sociedade: 'SBC / ESC',
  ano: 2023,
  referencia: 'Lip GY et al. Chest. 2010;137(2):263-272.',
};

// ─── 6. HAS-BLED ─────────────────────────────────────────────

const hasBled: ScoreDefinition = {
  id: 'has_bled',
  nome: 'Risco de Sangramento em Anticoagulados',
  sigla: 'HAS-BLED',
  categoria: 'cardiovascular',
  descricao: 'Estima o risco de sangramento maior em pacientes com FA em anticoagulação. NÃO contraindica anticoagulação — identifica fatores modificáveis.',
  formula_desc: 'H=HAS não controlada(1) · A=Alteração renal/hepática(1-2) · S=AVC prévio(1) · B=Sangramento prévio(1) · L=INR lábil(1) · E=Idade>65(1) · D=Drogas/álcool(1-2)\nMáximo: 9 pontos',
  variaveis: [
    { id: 'has_nc', label: 'H — HAS não controlada (PAS > 160 mmHg)', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'renal', label: 'A — Disfunção renal (Cr > 2,6 mg/dL ou diálise)', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'hepatico', label: 'A — Disfunção hepática (cirrose ou BilirT > 2×LSN + TGO/TGP > 3×LSN)', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'avc_prev', label: 'S — AVC ou TIA prévio', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'sangramento', label: 'B — Sangramento maior prévio ou predisposição', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'inr_labil', label: 'L — INR lábil (tempo < 60% na faixa terapêutica)', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'idade65', label: 'E — Idade > 65 anos', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'antiplatelet', label: 'D — Antiagregantes plaquetários ou AINEs', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'alcool', label: 'D — Uso abusivo de álcool', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
  ],
  calcular: (v) => (v.has_nc ?? 0) + (v.renal ?? 0) + (v.hepatico ?? 0) + (v.avc_prev ?? 0) + (v.sangramento ?? 0) + (v.inr_labil ?? 0) + (v.idade65 ?? 0) + (v.antiplatelet ?? 0) + (v.alcool ?? 0),
  interpretar: (r) => {
    if (r <= 2) return { pontuacao: r, interpretacao: `Risco baixo de sangramento — ~${r === 0 ? '1' : r === 1 ? '1,1' : '1,9'}%/ano`, risco: 'baixo', cor: 'green', conduta: 'Anticoagular com segurança. Monitorar fatores modificáveis regularmente.' };
    if (r === 3) return { pontuacao: r, interpretacao: 'Risco moderado — ~3,7%/ano', risco: 'moderado', cor: 'yellow', conduta: 'Anticoagular com cautela. Corrigir fatores modificáveis: controle pressórico, suspender AINEs, revisar INR.' };
    return         { pontuacao: r, interpretacao: `Risco alto — estimado >4%/ano`, risco: 'alto', cor: 'red', conduta: `⚠ Score ≥ 3 NÃO contraindica anticoagulação se CHA₂DS₂-VASc ≥ 2. Identificar e corrigir fatores modificáveis (H, A parcial, L, D). Discutir com paciente.` };
  },
  evidencia: 'Derivado em 3.978 pacientes europeus com FA (EuroHeart Survey) — Pisters R et al. (2010)',
  diretriz: 'ESC 2020 AF Guidelines / SBC 2023 FA',
  sociedade: 'ESC / SBC',
  ano: 2023,
  referencia: 'Pisters R et al. Chest. 2010;138(5):1093-1100.',
};

// ─── 7. Wells para TEP ───────────────────────────────────────

const wellsTep: ScoreDefinition = {
  id: 'wells_tep',
  nome: 'Probabilidade Pré-teste de Tromboembolismo Pulmonar',
  sigla: 'Wells-TEP',
  categoria: 'coagulacao',
  descricao: 'Estima a probabilidade pré-teste de tromboembolismo pulmonar (TEP/EP) para guiar a investigação diagnóstica (D-dímero vs. TC de tórax angiotomográfica).',
  formula_desc: 'Sinais de TVP(3) · EP mais provável(3) · FC>100(1,5) · Imobilização ou cirurgia recente(1,5) · TVP ou EP prévio(1,5) · Hemoptise(1) · Câncer ativo(1)',
  variaveis: [
    { id: 'tvd_sinal', label: 'Sinais/sintomas clínicos de TVP', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 3 }] },
    { id: 'ep_provavel', label: 'EP mais provável que diagnóstico alternativo', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 3 }] },
    { id: 'fc100', label: 'Frequência cardíaca > 100 bpm', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1.5 }] },
    { id: 'imob_cirurgia', label: 'Imobilização ≥ 3 dias ou cirurgia < 4 semanas', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1.5 }] },
    { id: 'tvp_ep_prev', label: 'TVP ou EP prévio documentado', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1.5 }] },
    { id: 'hemoptise', label: 'Hemoptise', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'cancer', label: 'Câncer ativo (tratamento < 6 meses ou paliativo)', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
  ],
  calcular: (v) => (v.tvd_sinal ?? 0) + (v.ep_provavel ?? 0) + (v.fc100 ?? 0) + (v.imob_cirurgia ?? 0) + (v.tvp_ep_prev ?? 0) + (v.hemoptise ?? 0) + (v.cancer ?? 0),
  interpretar: (r) => {
    if (r <= 1) return { pontuacao: r, interpretacao: 'Probabilidade baixa de EP (~1,3%)', risco: 'baixo', cor: 'green', conduta: 'Solicitar D-dímero. Se negativo: EP excluída. Se positivo: TC angiotomográfica de tórax.' };
    if (r <= 4) return { pontuacao: r, interpretacao: 'Probabilidade intermediária de EP (~16%)', risco: 'moderado', cor: 'yellow', conduta: 'Solicitar D-dímero (se PERC negativo e score baixo). Se D-dímero positivo ou score > 4: TC angiotomográfica.' };
    return         { pontuacao: r, interpretacao: 'Probabilidade alta de EP (~41%)', risco: 'muito_alto', cor: 'red', conduta: '⚠ TC angiotomográfica de tórax IMEDIATAMENTE. Anticoagulação empírica se alta suspeita e sem contraindicação hemorrágica.' };
  },
  evidencia: 'Derivado e validado em múltiplas coortes prospectivas — Wells PS et al. (2000)',
  diretriz: 'ESC 2019 Guidelines for PE / SBPT 2022',
  sociedade: 'ESC / SBPT',
  ano: 2019,
  referencia: 'Wells PS et al. Ann Intern Med. 2001;135(2):98-107.',
};

// ─── 8. MELD ─────────────────────────────────────────────────

const meld: ScoreDefinition = {
  id: 'meld',
  nome: 'Escore de Doença Hepática Terminal',
  sigla: 'MELD',
  categoria: 'hepatico',
  descricao: 'Prediz mortalidade em 90 dias em pacientes com doença hepática crônica. Usado para priorização em lista de espera para transplante hepático.',
  formula_desc: 'MELD = 3,78 × ln(BilirT) + 11,2 × ln(INR) + 9,57 × ln(Creatinina) + 6,43\nValores mínimos: Creatinina=1,0 · BilirT=1,0 · INR=1,0. Máximo creatinina=4,0 (diálise)',
  variaveis: [
    { id: 'bilirrubina', label: 'Bilirrubina total', tipo: 'number', unidade: 'mg/dL', min: 0.1, max: 50, step: 0.1 },
    { id: 'inr', label: 'INR', tipo: 'number', unidade: '', min: 0.5, max: 15, step: 0.1 },
    { id: 'creatinina', label: 'Creatinina sérica', tipo: 'number', unidade: 'mg/dL', min: 0.1, max: 20, step: 0.1 },
    { id: 'dialise', label: 'Em diálise (≥ 2× última semana)', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
  ],
  calcular: (v) => {
    if (!v.bilirrubina || !v.inr || !v.creatinina) return null;
    const bil = Math.max(v.bilirrubina, 1.0);
    const inr = Math.max(v.inr, 1.0);
    let cr = Math.max(v.creatinina, 1.0);
    if (v.dialise === 1) cr = 4.0;
    cr = Math.min(cr, 4.0);
    const score = 3.78 * Math.log(bil) + 11.2 * Math.log(inr) + 9.57 * Math.log(cr) + 6.43;
    return Math.round(score);
  },
  interpretar: (r) => {
    if (r < 10)  return { pontuacao: r, interpretacao: 'MELD < 10 — mortalidade em 90 dias ~2%', risco: 'baixo', cor: 'green', conduta: 'Acompanhamento ambulatorial. Transplante geralmente não prioritário neste momento.' };
    if (r < 20)  return { pontuacao: r, interpretacao: 'MELD 10–19 — mortalidade em 90 dias ~6%', risco: 'moderado', cor: 'yellow', conduta: 'Avaliar para lista de transplante. Monitorar complicações (ascite, PBE, EH).' };
    if (r < 30)  return { pontuacao: r, interpretacao: 'MELD 20–29 — mortalidade em 90 dias ~20%', risco: 'alto', cor: 'orange', conduta: 'Prioridade de transplante. Referência a centro de transplante urgente.' };
    if (r < 40)  return { pontuacao: r, interpretacao: 'MELD 30–39 — mortalidade em 90 dias ~52%', risco: 'muito_alto', cor: 'red', conduta: '⚠ Alta prioridade para transplante hepático. Cuidados intensivos. Avaliar TIPS, MARS se indicado.' };
    return         { pontuacao: r, interpretacao: 'MELD ≥ 40 — mortalidade em 90 dias ~71%', risco: 'muito_alto', cor: 'red', conduta: '⚠⚠ Prioridade máxima. Avaliar viabilidade de transplante urgente. Alta mortalidade hospitalar.' };
  },
  evidencia: 'Derivado em 231 pacientes, validado em > 3.000 (Kamath PS et al. 2001). Adotado pela UNOS/ABTO.',
  diretriz: 'EASL Clinical Practice Guidelines: Liver transplantation — ABTO 2022',
  sociedade: 'EASL / ABTO',
  ano: 2022,
  referencia: 'Kamath PS et al. Hepatology. 2001;33(2):464-470.',
};

// ─── 9. Child-Pugh ───────────────────────────────────────────

const childPugh: ScoreDefinition = {
  id: 'child_pugh',
  nome: 'Reserva Funcional Hepática',
  sigla: 'Child-Pugh',
  categoria: 'hepatico',
  descricao: 'Classifica a gravidade da cirrose e estima sobrevida em 2 anos. Usado também para contraindicação de cirurgia e ajuste de fármacos metabolizados pelo fígado.',
  formula_desc: 'Bilirrubina(1-3) + Albumina(1-3) + INR/TP(1-3) + Ascite(1-3) + Encefalopatia(1-3)\nClasse A: 5-6 pts · Classe B: 7-9 pts · Classe C: 10-15 pts',
  variaveis: [
    { id: 'bilirrubina', label: 'Bilirrubina total (mg/dL)', tipo: 'select', opcoes: [{ label: '< 2 mg/dL', valor: 1 }, { label: '2–3 mg/dL', valor: 2 }, { label: '> 3 mg/dL', valor: 3 }] },
    { id: 'albumina', label: 'Albumina sérica (g/dL)', tipo: 'select', opcoes: [{ label: '> 3,5 g/dL', valor: 1 }, { label: '2,8–3,5 g/dL', valor: 2 }, { label: '< 2,8 g/dL', valor: 3 }] },
    { id: 'inr', label: 'INR (ou TP prolongado)', tipo: 'select', opcoes: [{ label: '< 1,7 (TP < 4s acima do controle)', valor: 1 }, { label: '1,7–2,3 (TP 4–6s)', valor: 2 }, { label: '> 2,3 (TP > 6s)', valor: 3 }] },
    { id: 'ascite', label: 'Ascite', tipo: 'select', opcoes: [{ label: 'Ausente', valor: 1 }, { label: 'Leve / controlada com diurético', valor: 2 }, { label: 'Moderada a grave / refratária', valor: 3 }] },
    { id: 'encefalopatia', label: 'Encefalopatia hepática', tipo: 'select', opcoes: [{ label: 'Ausente', valor: 1 }, { label: 'Grau I–II (ou controlada)', valor: 2 }, { label: 'Grau III–IV (refratária)', valor: 3 }] },
  ],
  calcular: (v) => (v.bilirrubina ?? 0) + (v.albumina ?? 0) + (v.inr ?? 0) + (v.ascite ?? 0) + (v.encefalopatia ?? 0),
  interpretar: (r) => {
    if (r <= 6) return { pontuacao: r, interpretacao: 'Classe A — Cirrose compensada', risco: 'baixo', cor: 'green', conduta: 'Sobrevida em 2 anos ~85%. Cirurgia com risco operatório aceitável (mortalidade ~10%).' };
    if (r <= 9) return { pontuacao: r, interpretacao: 'Classe B — Comprometimento funcional significativo', risco: 'moderado', cor: 'yellow', conduta: 'Sobrevida em 2 anos ~57%. Cirurgia com alto risco (mortalidade ~30%). Avaliar indicação de transplante.' };
    return         { pontuacao: r, interpretacao: 'Classe C — Cirrose descompensada grave', risco: 'muito_alto', cor: 'red', conduta: 'Sobrevida em 2 anos ~35%. Cirurgia contraindicada (mortalidade ~80%). Avaliação urgente para transplante hepático.' };
  },
  evidencia: 'Usado há > 50 anos — validado extensivamente para prognóstico e elegibilidade cirúrgica em cirrose',
  diretriz: 'EASL Clinical Practice Guidelines on Hepatic Encephalopathy 2022',
  sociedade: 'EASL / SBH',
  ano: 2022,
  referencia: 'Child CG, Turcotte JG. Surgery. 1964. / Pugh RN et al. Br J Surg. 1973;60(8):646-649.',
};

// ─── 10. APGAR ───────────────────────────────────────────────

const apgar: ScoreDefinition = {
  id: 'apgar',
  nome: 'Escore de Vitalidade Neonatal',
  sigla: 'APGAR',
  categoria: 'obstetrico',
  descricao: 'Avalia a condição do recém-nascido ao 1º e 5º minuto de vida. Guia as decisões de reanimação neonatal.',
  formula_desc: 'A=Aparência (cor da pele) · P=Pulso (FC) · G=Grimace (irritabilidade reflexa) · A=Activity (tônus muscular) · R=Respiração\nCada item: 0, 1 ou 2 pontos. Total: 0–10',
  variaveis: [
    { id: 'aparencia', label: 'A — Aparência (cor da pele)', tipo: 'select', opcoes: [{ label: '0 — Azulado/pálido em todo o corpo', valor: 0 }, { label: '1 — Corpo rosado, extremidades azuladas', valor: 1 }, { label: '2 — Completamente rosado', valor: 2 }] },
    { id: 'pulso', label: 'P — Pulso (frequência cardíaca)', tipo: 'select', opcoes: [{ label: '0 — Ausente', valor: 0 }, { label: '1 — < 100 bpm', valor: 1 }, { label: '2 — ≥ 100 bpm', valor: 2 }] },
    { id: 'grimace', label: 'G — Grimace (resposta a estímulos)', tipo: 'select', opcoes: [{ label: '0 — Sem resposta', valor: 0 }, { label: '1 — Careta / choro fraco', valor: 1 }, { label: '2 — Tosse / espirro / choro vigoroso', valor: 2 }] },
    { id: 'atividade', label: 'A — Activity (tônus muscular)', tipo: 'select', opcoes: [{ label: '0 — Flácido', valor: 0 }, { label: '1 — Alguma flexão dos membros', valor: 1 }, { label: '2 — Movimento ativo', valor: 2 }] },
    { id: 'respiracao', label: 'R — Respiração', tipo: 'select', opcoes: [{ label: '0 — Ausente', valor: 0 }, { label: '1 — Lenta, irregular, gasping', valor: 1 }, { label: '2 — Boa, choro vigoroso', valor: 2 }] },
  ],
  calcular: (v) => (v.aparencia ?? 0) + (v.pulso ?? 0) + (v.grimace ?? 0) + (v.atividade ?? 0) + (v.respiracao ?? 0),
  interpretar: (r) => {
    if (r >= 7) return { pontuacao: r, interpretacao: 'Normal — recém-nascido em boas condições', risco: 'baixo', cor: 'green', conduta: 'Cuidados de rotina. Alojamento conjunto. Amamentação precoce. Repetir APGAR no 5º minuto.' };
    if (r >= 4) return { pontuacao: r, interpretacao: 'Depressão moderada — reanimação necessária', risco: 'moderado', cor: 'yellow', conduta: '⚠ Iniciar reanimação neonatal: estimular, aspirar, ventilação por pressão positiva. Repetir APGAR no 5º minuto.' };
    return         { pontuacao: r, interpretacao: 'Depressão grave — reanimação imediata', risco: 'muito_alto', cor: 'red', conduta: '⚠⚠ EMERGÊNCIA — Reanimação cardiopulmonar completa: VPP, massagem cardíaca, adrenalina se necessário. Chamar equipe neonatal imediatamente.' };
  },
  evidencia: 'Descrito por Virginia Apgar em 1953 — validado em > 100.000 nascimentos como preditor de necessidade de reanimação',
  diretriz: 'Programa de Reanimação Neonatal — SBP 2022 / AAP NRP 2021',
  sociedade: 'SBP / AAP',
  ano: 2022,
  referencia: 'Apgar V. Anesthesia & Analgesia. 1953;32(4):260-267.',
};

// ─── 11. Risco Cardiovascular (Framingham Point Score) ───────

const riscoCV: ScoreDefinition = {
  id: 'risco_cv',
  nome: 'Risco Cardiovascular em 10 Anos (Escore de Framingham)',
  sigla: 'Framingham',
  categoria: 'cardiovascular',
  descricao: 'Estima o risco de eventos cardiovasculares maiores (IAM, AVC, morte cardiovascular) em 10 anos. Base para decisão de terapia hipolipemiante e preventiva.',
  formula_desc: 'Pontos por: Idade + Colesterol Total + HDL-c + PAS (tratada/não tratada) + Tabagismo\nMasculino e feminino possuem tabelas de pontos distintas',
  variaveis: [
    { id: 'sexo', label: 'Sexo biológico', tipo: 'select', opcoes: [{ label: 'Masculino', valor: 1 }, { label: 'Feminino', valor: 2 }] },
    { id: 'idade', label: 'Idade', tipo: 'number', unidade: 'anos', min: 20, max: 79, step: 1 },
    { id: 'col_total', label: 'Colesterol total', tipo: 'number', unidade: 'mg/dL', min: 100, max: 400, step: 1 },
    { id: 'hdl', label: 'HDL-colesterol', tipo: 'number', unidade: 'mg/dL', min: 20, max: 120, step: 1 },
    { id: 'pas', label: 'Pressão arterial sistólica', tipo: 'number', unidade: 'mmHg', min: 90, max: 220, step: 1 },
    { id: 'tratado', label: 'Em uso de anti-hipertensivo', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'tabagismo', label: 'Tabagismo atual', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
  ],
  calcular: (v) => {
    if (!v.sexo || !v.idade || !v.col_total || !v.hdl || !v.pas) return null;
    const isMale = v.sexo === 1;
    const age = v.idade;
    const tc = v.col_total;
    const hdl = v.hdl;
    const sbp = v.pas;
    const treated = v.tratado === 1;
    const smoker = v.tabagismo === 1;

    // Age group index for TC and smoking lookup
    const ageGroup = age < 35 ? 0 : age < 40 ? 1 : age < 45 ? 2 : age < 50 ? 3 : age < 55 ? 4 : age < 60 ? 5 : age < 65 ? 6 : age < 70 ? 7 : age < 75 ? 8 : 9;

    let pts = 0;

    if (isMale) {
      // Age points
      const agePts = [-9,-4,0,3,6,8,10,11,12,13];
      pts += agePts[ageGroup];
      // TC points (per age group 0=20-34, 1=35-39, 2=40-44, 3=45-49, 4=50-54, 5=55-59, 6+=60+)
      const tcIdx = ageGroup > 6 ? 6 : ageGroup;
      const tcPts = [[0,4,7,9,11],[0,4,7,9,11],[0,3,5,6,8],[0,2,3,4,5],[0,1,1,2,3],[0,0,0,1,1],[0,0,0,1,1]];
      const tcLevel = tc < 160 ? 0 : tc < 200 ? 1 : tc < 240 ? 2 : tc < 280 ? 3 : 4;
      pts += (tcPts[Math.min(tcIdx, 4)][tcLevel] ?? 0);
      // Smoking (per age group, but simplified: same indices)
      const smkPts = [8,8,5,5,3,3,1,1,1,1];
      if (smoker) pts += smkPts[ageGroup];
      // HDL
      pts += hdl >= 60 ? -1 : hdl >= 50 ? 0 : hdl >= 40 ? 1 : 2;
      // SBP
      if (!treated) {
        pts += sbp < 120 ? 0 : sbp < 130 ? 0 : sbp < 140 ? 1 : sbp < 160 ? 1 : 2;
      } else {
        pts += sbp < 120 ? 0 : sbp < 130 ? 1 : sbp < 140 ? 2 : sbp < 160 ? 2 : 3;
      }
    } else {
      // Female age points
      const agePts = [-7,-3,0,3,6,8,10,12,14,16];
      pts += agePts[ageGroup];
      const tcIdx = ageGroup > 6 ? 6 : ageGroup;
      const tcPts = [[0,4,8,11,13],[0,4,8,11,13],[0,3,6,8,10],[0,2,4,5,7],[0,1,2,3,4],[0,1,1,2,2],[0,1,1,2,2]];
      const tcLevel = tc < 160 ? 0 : tc < 200 ? 1 : tc < 240 ? 2 : tc < 280 ? 3 : 4;
      pts += (tcPts[Math.min(tcIdx, 4)][tcLevel] ?? 0);
      const smkPts = [9,9,7,7,4,4,2,2,1,1];
      if (smoker) pts += smkPts[ageGroup];
      pts += hdl >= 60 ? -1 : hdl >= 50 ? 0 : hdl >= 40 ? 1 : 2;
      if (!treated) {
        pts += sbp < 120 ? 0 : sbp < 130 ? 1 : sbp < 140 ? 2 : sbp < 160 ? 3 : 4;
      } else {
        pts += sbp < 120 ? 0 : sbp < 130 ? 3 : sbp < 140 ? 4 : sbp < 160 ? 5 : 6;
      }
    }

    return pts;
  },
  interpretar: (r, v) => {
    const isMale = v?.sexo === 1;
    // Risk lookup tables
    const mRisk: Record<number, number> = { 0:1,1:1,2:1,3:1,4:1,5:2,6:2,7:3,8:4,9:5,10:6,11:8,12:10,13:12,14:16,15:20,16:25 };
    const fRisk: Record<number, number> = { 9:1,10:1,11:1,12:1,13:2,14:2,15:3,16:4,17:5,18:6,19:8,20:11,21:14,22:17,23:22,24:27 };

    const lookup = isMale ? mRisk : fRisk;
    const clampedR = clamp(r, isMale ? 0 : 9, isMale ? 16 : 24);
    const pct = lookup[clampedR] ?? (r >= (isMale ? 17 : 25) ? 30 : 1);

    if (pct < 5)   return { pontuacao: r, interpretacao: `Risco baixo — ${pct}% em 10 anos`, risco: 'baixo', cor: 'green', conduta: 'Orientação para estilo de vida. Estatina geralmente não indicada para prevenção primária se sem DM.', detalhe: `${pct}% de risco cardiovascular em 10 anos (Framingham)` };
    if (pct < 10)  return { pontuacao: r, interpretacao: `Risco intermediário — ${pct}% em 10 anos`, risco: 'moderado', cor: 'yellow', conduta: 'Calcular Escore de Risco Global (ERG-SBC). Considerar estatina se LDL > 130 + outros fatores. Modificar estilo de vida.', detalhe: `${pct}% de risco cardiovascular em 10 anos` };
    if (pct < 20)  return { pontuacao: r, interpretacao: `Risco moderado-alto — ${pct}% em 10 anos`, risco: 'alto', cor: 'orange', conduta: 'Estatina indicada (meta LDL < 100 mg/dL). Controle rigoroso de PA, glicemia, tabagismo. Avaliar AAS 100 mg.', detalhe: `${pct}% de risco cardiovascular em 10 anos` };
    return           { pontuacao: r, interpretacao: `Risco muito alto — ${pct}% em 10 anos`, risco: 'muito_alto', cor: 'red', conduta: 'Estatina de alta potência (meta LDL < 70 mg/dL). Controle agressivo de todos os fatores de risco. Investigar lesão de órgão-alvo.', detalhe: `${pct}% de risco cardiovascular em 10 anos` };
  },
  evidencia: 'Derivado do Framingham Heart Study — D\'Agostino RB et al. (2008). Base do ERG brasileiro.',
  diretriz: '7ª Diretriz Brasileira de HAS (SBC 2020) / V Diretriz de Dislipidemias (SBC 2017)',
  sociedade: 'SBC',
  ano: 2020,
  referencia: "D'Agostino RB et al. Circulation. 2008;117(6):743-753.",
};

// ─── 12. FRAX (simplificado) ─────────────────────────────────

const frax: ScoreDefinition = {
  id: 'frax',
  nome: 'Risco de Fratura Osteoporótica (FRAX Simplificado)',
  sigla: 'FRAX',
  categoria: 'geral',
  descricao: 'Estima o risco de fratura osteoporótica maior e de quadril em 10 anos. O FRAX completo requer DXA; esta versão identifica candidatos à investigação e tratamento.',
  formula_desc: 'Screening por fatores de risco clínicos — para resultado preciso usar calculadora oficial FRAX (www.sheffield.ac.uk/FRAX) com densitometria',
  variaveis: [
    { id: 'idade', label: 'Idade', tipo: 'number', unidade: 'anos', min: 40, max: 90, step: 1 },
    { id: 'sexo', label: 'Sexo biológico', tipo: 'select', opcoes: [{ label: 'Masculino', valor: 1 }, { label: 'Feminino', valor: 2 }] },
    { id: 'imc', label: 'IMC', tipo: 'number', unidade: 'kg/m²', min: 10, max: 60, step: 0.1 },
    { id: 'fratura_prev', label: 'Fratura por fragilidade prévia (> 50 anos)', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'fratura_familiar', label: 'Fratura de quadril nos pais', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'tabagismo', label: 'Tabagismo atual', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'corticoide', label: 'Uso de corticoide oral (> 3 meses, ≥ 5 mg/dia prednisona)', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'ar', label: 'Artrite reumatoide', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'osteoporose_sec', label: 'Osteoporose secundária (DM1, hipogonadismo, doença inflamatória intestinal)', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
    { id: 'alcool', label: 'Álcool ≥ 3 unidades/dia', tipo: 'boolean', opcoes: [{ label: 'Não', valor: 0 }, { label: 'Sim', valor: 1 }] },
  ],
  calcular: (v) => {
    if (!v.idade) return null;
    let score = 0;
    if (v.sexo === 2) score += 2;           // Feminino: maior risco basal
    if (v.idade >= 65) score += 2;
    else if (v.idade >= 55) score += 1;
    if (v.imc < 19) score += 2;
    else if (v.imc < 23) score += 1;
    score += (v.fratura_prev ?? 0) * 3;
    score += (v.fratura_familiar ?? 0) * 1;
    score += (v.tabagismo ?? 0) * 1;
    score += (v.corticoide ?? 0) * 2;
    score += (v.ar ?? 0) * 1;
    score += (v.osteoporose_sec ?? 0) * 1;
    score += (v.alcool ?? 0) * 1;
    return score;
  },
  interpretar: (r) => {
    if (r <= 2) return { pontuacao: r, interpretacao: 'Risco baixo de fratura', risco: 'baixo', cor: 'green', conduta: 'Suplementação de cálcio (1200 mg/dia) e vitamina D (800–2000 UI/dia). Exercícios de resistência e equilíbrio. Prevenção de quedas.' };
    if (r <= 5) return { pontuacao: r, interpretacao: 'Risco intermediário — investigação indicada', risco: 'moderado', cor: 'yellow', conduta: 'Solicitar densitometria óssea (DXA). Usar FRAX com T-score para decisão de tratamento. Suplementação de cálcio e vitamina D.' };
    return         { pontuacao: r, interpretacao: 'Risco alto — provável indicação de tratamento', risco: 'alto', cor: 'orange', conduta: 'Solicitar DXA com urgência. Alta probabilidade de indicação de bifosfonato (alendronato). Afastar causas secundárias. Redução do risco de quedas.' };
  },
  evidencia: 'FRAX desenvolvido pela OMS/Universidade de Sheffield — validado em populações globais incluindo Brasil',
  diretriz: 'Diretriz Brasileira de Osteoporose — SBEM/IOF 2022 · Calculadora oficial: www.sheffield.ac.uk/FRAX',
  sociedade: 'SBEM / IOF / OMS',
  ano: 2022,
  referencia: 'Kanis JA et al. Osteoporosis International. 2008;19(4):385-397.',
};

// ─── Registro de todos os scores ─────────────────────────────

export const SCORES: ScoreDefinition[] = [
  imc,
  frax,
  cockcroftGault,
  ckdEpi,
  riscoCV,
  cha2ds2vasc,
  hasBled,
  curb65,
  wellsTep,
  meld,
  childPugh,
  apgar,
];

export const CATEGORIAS: Record<ScoreCategoria, string> = {
  geral:          'Geral',
  renal:          'Renal',
  cardiovascular: 'Cardiovascular',
  hepatico:       'Hepático',
  pulmonar:       'Pulmonar',
  coagulacao:     'Coagulação / TEV',
  obstetrico:     'Obstétrico / Neonatal',
};

export function getScoresByCategoria(cat: ScoreCategoria): ScoreDefinition[] {
  return SCORES.filter(s => s.categoria === cat);
}

export function getScoreById(id: string): ScoreDefinition | undefined {
  return SCORES.find(s => s.id === id);
}
