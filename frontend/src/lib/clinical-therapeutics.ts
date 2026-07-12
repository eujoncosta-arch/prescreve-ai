// ============================================================
// PRESCREVE-AI — Protocolos Terapêuticos por Condição
// Vinculados ao Motor CDS — apenas condições com CID selecionado
// Baseados em diretrizes brasileiras verificadas
// ============================================================

import type { TherapeuticPlan, TherapeuticSuggestion } from './types';

// ─── HELPER ──────────────────────────────────────────────────

function sug(s: Omit<TherapeuticSuggestion, 'id'> & { id: string }): TherapeuticSuggestion {
  return s;
}

// ─── PROTOCOLOS POR CONDIÇÃO ─────────────────────────────────

const PROTOCOLOS: Record<string, Omit<TherapeuticPlan, 'diagnostico_selecionado' | 'preferencia_laboratorio'>> = {

  // ══════════════════════════════════════════════════════════
  // HAS — 7ª Diretriz SBC 2020
  // ══════════════════════════════════════════════════════════
  has: {
    farmacologico: [
      sug({
        id: 'enalapril',
        classe_terapeutica: 'Inibidor da Enzima Conversora de Angiotensina (IECA)',
        molecula: 'Enalapril',
        nome_generico: 'Maleato de Enalapril',
        indicacao: 'Anti-hipertensivo de 1ª linha — preferido em HAS + DM ou proteinúria',
        dose: { dose_padrao: '10 mg', dose_min: '5 mg', dose_max: '40 mg/dia', unidade: 'mg', via: 'Oral', frequencia: '1–2x/dia', duracao: 'Contínuo', ajuste_renal: 'TFG < 30: iniciar com 2,5 mg', ajuste_hepatico: 'Sem ajuste habitual' },
        posologia_completa: 'Enalapril 10 mg — 1 comprimido pela manhã. Titular para 20 mg em 4 semanas se meta não atingida.',
        contraindicacoes: ['Gravidez (categoria D)', 'Angioedema prévio por IECA', 'Estenose bilateral de artéria renal', 'Uso com alisquireno em DM/DRC'],
        efeitos_adversos: ['Tosse seca (10–15%)', 'Hipotensão na 1ª dose', 'Hipercalemia', 'Angioedema (raro)'],
        monitoramento: ['Creatinina e K+ em 1–2 semanas após início', 'PA após 1ª dose'],
        alternativas: ['Losartana 50 mg se tosse por IECA (BRA)', 'Anlodipino 5 mg (BCC)', 'Clortalidona 12,5 mg'],
        evidencia: { diretriz: '7ª Diretriz Brasileira de Hipertensão Arterial', sociedade: 'SBC', ano: 2020, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'Múltiplos ECRs' }, citacao: 'Barroso WKS et al. Arq Bras Cardiol. 2021;116(3):516-658.', doi: '10.36660/abc.20201238' },
      }),
      sug({
        id: 'hctz',
        classe_terapeutica: 'Diurético Tiazídico',
        molecula: 'Hidroclorotiazida',
        nome_generico: 'Hidroclorotiazida',
        indicacao: 'Anti-hipertensivo — combinação com IECA/BRA para HAS estágio 2',
        dose: { dose_padrao: '12,5 mg', dose_min: '12,5 mg', dose_max: '25 mg/dia', unidade: 'mg', via: 'Oral', frequencia: '1x/dia (manhã)', duracao: 'Contínuo', ajuste_renal: 'Evitar se TFG < 30' },
        posologia_completa: 'Hidroclorotiazida 12,5 mg — 1 comprimido pela manhã.',
        contraindicacoes: ['Anúria', 'TFG < 30', 'Hipocalemia refratária', 'Gota ativa'],
        efeitos_adversos: ['Hipocalemia', 'Hiperuricemia', 'Hiperglicemia', 'Fotossensibilidade'],
        monitoramento: ['Eletrólitos e creatinina em 4 semanas', 'Ácido úrico se histórico de gota'],
        alternativas: ['Clortalidona 12,5 mg (preferível — maior duração)', 'Indapamida 1,5 mg SR'],
        evidencia: { diretriz: '7ª Diretriz Brasileira de Hipertensão Arterial', sociedade: 'SBC', ano: 2020, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECR ALLHAT e meta-análises' }, citacao: 'Barroso WKS et al. Arq Bras Cardiol. 2021;116(3):516-658.' },
      }),
    ],
    nao_farmacologico: [
      'Dieta DASH: rica em frutas, vegetais, laticínios com baixo teor de gordura',
      'Restrição de sódio: < 2 g/dia (< 5 g de sal)',
      'Atividade física aeróbica: ≥ 150 min/semana de intensidade moderada',
      'Redução de peso: meta IMC < 25 kg/m²',
      'Cessação do tabagismo (se aplicável)',
      'Limitação do álcool: < 2 drinques/dia (H) / < 1 drinque/dia (M)',
    ],
    seguimento: 'Retorno em 4 semanas para avaliação da resposta e tolerabilidade. Após atingir meta, consultas a cada 3–6 meses.',
    monitorizacao: ['MRPA domiciliar: 3 medidas manhã + 3 tarde por 5 dias antes da consulta', 'Creatinina e K+ a cada 6 meses (uso de IECA/BRA)', 'Lesão de órgão-alvo anualmente'],
    encaminhamento: 'Cardiologista se meta não atingida em 3 meses com tratamento otimizado',
  },

  // ══════════════════════════════════════════════════════════
  // DM2 — SBD 2023
  // ══════════════════════════════════════════════════════════
  dm2: {
    farmacologico: [
      sug({
        id: 'metformina',
        classe_terapeutica: 'Biguanida',
        molecula: 'Metformina',
        nome_generico: 'Cloridrato de Metformina',
        indicacao: '1ª linha em DM2 — preferível em todos os pacientes sem contraindicação',
        dose: { dose_padrao: '500 mg', dose_min: '500 mg', dose_max: '2550 mg/dia', unidade: 'mg', via: 'Oral', frequencia: '2–3x/dia com refeições', duracao: 'Contínuo', ajuste_renal: 'TFG 45–60: manter; TFG 30–45: reduzir 50%; TFG < 30: contraindicada' },
        posologia_completa: 'Metformina 500 mg com o almoço e jantar. Titular em 4–8 semanas para 1000 mg 2x/dia conforme tolerância GI.',
        contraindicacoes: ['TFG < 30 mL/min', 'Insuficiência hepática grave', 'Alcoolismo', 'Procedimento com contraste iodado (suspender 48h antes)', 'Sepse ou hipóxia tecidual'],
        efeitos_adversos: ['Náusea, diarreia, desconforto abdominal (início do tratamento — melhora com titulação lenta)', 'Acidose lática (raro, com contraindicações)', 'Deficiência de vitamina B12 (uso prolongado)'],
        monitoramento: ['HbA1c a cada 3 meses até controle, depois a cada 6 meses', 'Creatinina e TFG anualmente', 'Vitamina B12 anualmente (uso > 3 anos)'],
        alternativas: ['Empagliflozina 10 mg (DM2 + DCV estabelecida ou DRC)', 'Sitagliptina 100 mg (tolerância GI ruim)', 'Semaglutida 0,5 mg/semana SC (DM2 + obesidade + DCV)'],
        evidencia: { diretriz: 'Diretrizes da Sociedade Brasileira de Diabetes', sociedade: 'SBD', ano: 2023, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECRs e meta-análises' }, citacao: 'Sociedade Brasileira de Diabetes. Diretrizes SBD 2023.' },
      }),
      sug({
        id: 'empagliflozina_dm2',
        classe_terapeutica: 'Inibidor do SGLT-2 (iSGLT2)',
        molecula: 'Empagliflozina',
        nome_generico: 'Empagliflozina',
        indicacao: 'DM2 com DCV estabelecida, ICC ou DRC — 2ª linha mandatória independente do controle glicêmico (SBD 2023 / ADA 2024)',
        dose: { dose_padrao: '10 mg', dose_min: '10 mg', dose_max: '25 mg/dia', unidade: 'mg', via: 'Oral', frequencia: '1x/dia (manhã)', duracao: 'Contínuo', ajuste_renal: 'Não iniciar se TFG < 30 (DM2); manter em IC/DRC até TFG 20' },
        posologia_completa: 'Empagliflozina 10 mg 1x/dia pela manhã, independente de refeições. Considerar 25 mg se controle glicêmico insuficiente e TFG adequada.',
        contraindicacoes: ['DM tipo 1', 'Cetoacidose diabética', 'TFG < 30 mL/min (indicação DM2)', 'Hipersensibilidade'],
        efeitos_adversos: ['Infecções genitais fúngicas (frequente)', 'Poliúria / depleção de volume', 'Cetoacidose euglicêmica (raro — suspender antes de cirurgia)'],
        monitoramento: ['TFG e K+ antes e após início', 'PA (efeito hipotensor — ajustar anti-hipertensivos)', 'HbA1c a cada 3 meses', 'Sintomas de infecção genital'],
        alternativas: ['Dapagliflozina 10 mg/dia (mesma classe, aprovada em DRC/ICC pelo ANVISA)', 'Semaglutida 0,5 mg/semana (GLP-1 — preferir em DM2 + obesidade + DCV aterosclerótica)'],
        evidencia: { diretriz: 'Diretrizes da Sociedade Brasileira de Diabetes', sociedade: 'SBD / ADA', ano: 2023, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECRs EMPA-REG OUTCOME, EMPEROR-Reduced — redução de hospitalização por IC e progressão de DRC' }, citacao: 'Zinman B et al. N Engl J Med. 2015;373:2117-2128.' },
      }),
      sug({
        id: 'sitagliptina_dm2',
        classe_terapeutica: 'Inibidor da DPP-4 (iDPP-4)',
        molecula: 'Sitagliptina',
        nome_generico: 'Fosfato de Sitagliptina',
        indicacao: 'DM2 — alternativa em pacientes com intolerância GI à metformina ou como associação quando iSGLT2/GLP-1 não disponíveis (SBD 2023)',
        dose: { dose_padrao: '100 mg', dose_min: '50 mg', dose_max: '100 mg/dia', unidade: 'mg', via: 'Oral', frequencia: '1x/dia', duracao: 'Contínuo', ajuste_renal: 'TFG 30–50: 50 mg/dia; TFG < 30: 25 mg/dia' },
        posologia_completa: 'Sitagliptina 100 mg 1x/dia, independente de refeições. Ajuste renal obrigatório: TFG 30–50 → 50 mg/dia; TFG < 30 → 25 mg/dia.',
        contraindicacoes: ['Hipersensibilidade (inclui anafilaxia e angioedema relatados)', 'DM tipo 1', 'Cetoacidose diabética'],
        efeitos_adversos: ['Nasofaringite (frequente)', 'Infecção do trato urinário superior', 'Pancreatite aguda (raro — orientar sobre dor abdominal persistente)', 'Artralgia (FDA alerta 2015)'],
        monitoramento: ['HbA1c a cada 3 meses', 'Função renal para ajuste de dose', 'Sintomas de pancreatite (dor epigástrica intensa)', 'PA (neutro — sem efeito hipotensor)'],
        alternativas: ['Vildagliptina 50 mg 2x/dia (iDPP-4 alternativo)', 'Saxagliptina 5 mg/dia (iDPP-4 alternativo)', 'Empagliflozina 10 mg/dia (preferir se DCV ou DRC)'],
        evidencia: { diretriz: 'Diretrizes da Sociedade Brasileira de Diabetes', sociedade: 'SBD', ano: 2023, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECR TECOS — não inferioridade cardiovascular confirmada' }, citacao: 'Green JB et al. N Engl J Med. 2015;373:232-242. (TECOS)' },
      }),
    ],
    nao_farmacologico: [
      'Dieta hipoglicêmica: índice glicêmico baixo, redução de carboidratos simples',
      'Atividade física: ≥ 150 min/semana aeróbico + resistência 2–3x/semana',
      'Redução de peso: perda de 5–10% já melhora controle glicêmico significativamente',
      'Cessação do tabagismo',
      'Monitorização glicêmica domiciliar (glicemia capilar ou CGM)',
      'Educação em diabetes: automonitorização, reconhecimento de hipoglicemia',
    ],
    seguimento: 'Retorno em 3 meses para HbA1c. Meta: HbA1c < 7% (individualizar: < 6,5% jovens sem complicações; < 8% idosos frágeis ou hipoglicemia recorrente).',
    monitorizacao: ['HbA1c a cada 3 meses (até controle), depois cada 6 meses', 'Microalbuminúria anual', 'Perfil lipídico anual', 'Fundo de olho anual', 'Avaliação dos pés a cada consulta', 'PA a cada consulta'],
    encaminhamento: 'Endocrinologista se HbA1c > 9% após 3 meses de tratamento otimizado',
  },

  // ══════════════════════════════════════════════════════════
  // DISLIPIDEMIA — V Diretriz SBC 2017
  // ══════════════════════════════════════════════════════════
  dislipidemia: {
    farmacologico: [
      sug({
        id: 'rosuvastatina',
        classe_terapeutica: 'Estatina (Inibidor da HMG-CoA redutase)',
        molecula: 'Rosuvastatina',
        nome_generico: 'Rosuvastatina Cálcica',
        indicacao: '1ª linha em dislipidemia — redução do LDL-c e risco cardiovascular',
        dose: { dose_padrao: '10 mg', dose_min: '5 mg', dose_max: '40 mg/dia', unidade: 'mg', via: 'Oral', frequencia: '1x/dia (noite)', duracao: 'Contínuo', ajuste_renal: 'TFG < 30: máx 10 mg/dia', ajuste_hepatico: 'Contraindicada em hepatopatia ativa' },
        posologia_completa: 'Rosuvastatina 10 mg — 1 comprimido à noite. Avaliar LDL em 4–6 semanas e titular conforme meta.',
        contraindicacoes: ['Hepatopatia ativa (TGO/TGP > 3× LSN)', 'Miopatia prévia com estatinas', 'Gravidez e lactação'],
        efeitos_adversos: ['Mialgia (3–5%)', 'Miopatia / rabdomiólise (raro)', 'Elevação de TGO/TGP (< 1%)', 'Hiperglicemia / DM incidente (risco modesto)'],
        monitoramento: ['Perfil lipídico em 4–6 semanas após início/titulação', 'TGO/TGP e CK basal; repetir se sintomas musculares', 'LDL-alvo: < 100 mg/dL (risco intermediário); < 70 mg/dL (alto risco); < 50 mg/dL (muito alto risco)'],
        alternativas: ['Atorvastatina 20–40 mg (alternativa de alta potência)', 'Sinvastatina 20–40 mg (menor potência, menor custo)', 'Ezetimiba 10 mg (adicionar se meta não atingida com estatina máxima tolerada)'],
        evidencia: { diretriz: 'V Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose', sociedade: 'SBC / SBH / SBD', ano: 2017, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'Múltiplos ECRs de desfechos cardiovasculares' }, citacao: 'Faludi AA et al. Arq Bras Cardiol. 2017;109(1Supl.1):1-76.' },
      }),
    ],
    nao_farmacologico: [
      'Dieta com restrição de gordura saturada (< 7% das calorias) e trans (< 1%)',
      'Aumento de fibras solúveis: aveia, feijão, frutas — reduz LDL em 5–10%',
      'Atividade física aeróbica regular: aumenta HDL e reduz TG',
      'Cessação do tabagismo (aumenta HDL)',
      'Redução do consumo de álcool (reduz TG)',
      'Controle do peso e da glicemia (reduz TG)',
    ],
    seguimento: 'Perfil lipídico em 4–6 semanas após início. Após atingir meta de LDL, monitorar anualmente.',
    monitorizacao: ['Perfil lipídico, TGO/TGP e CK a cada 6 meses', 'Escore de risco cardiovascular global (ERG) para definir meta de LDL', 'Glicemia anual (estatinas aumentam levemente o risco de DM)'],
    encaminhamento: 'Cardiologista ou endocrinologista se LDL > 190 mg/dL (suspeita de hipercolesterolemia familiar)',
  },

  // ══════════════════════════════════════════════════════════
  // ASMA — GINA 2024
  // ══════════════════════════════════════════════════════════
  asma: {
    farmacologico: [
      sug({
        id: 'budesonida_formoterol',
        classe_terapeutica: 'Corticosteroide Inalatório + LABA (ICS/LABA)',
        molecula: 'Budesonida + Formoterol',
        nome_generico: 'Budesonida + Fumarato de Formoterol',
        indicacao: 'Controle e alívio da asma — terapia MART (manutenção e alívio com ICS/formoterol)',
        dose: { dose_padrao: '160/4,5 mcg', dose_min: '80/4,5 mcg', dose_max: '320/9 mcg 2x/dia + 8 inalações/dia resgate', unidade: 'mcg', via: 'Inalatório', frequencia: '2x/dia + conforme necessidade (MART)', duracao: 'Contínuo' },
        posologia_completa: 'Budesonida/Formoterol 160/4,5 mcg — 1 inalação 2x/dia (manhã e noite). Usar como resgate no lugar de SABA. Técnica inalatória correta é essencial.',
        contraindicacoes: ['Hipersensibilidade aos componentes', 'Status asmático agudo grave isolado (usar broncodilatador de curta ação)'],
        efeitos_adversos: ['Candidíase oral (bochechar após cada uso)', 'Rouquidão', 'Tremor e taquicardia (formoterol)', 'Supressão do crescimento em crianças (baixa dose inalatória é segura)'],
        monitoramento: ['Espirometria a cada 3–6 meses até estabilidade', 'Controle da asma: Asthma Control Test (ACT)', 'Técnica inalatória a cada consulta'],
        alternativas: ['Fluticasona/Salmeterol (Seretide) — alternativa se MART não disponível', 'ICS isolado (Beclometasona 100–200 mcg 2x/dia) para asma leve', 'Montelucaste 10 mg/noite (complemento ou alternativa em rinite alérgica associada)'],
        evidencia: { diretriz: 'Global Initiative for Asthma (GINA) — Report 2024', sociedade: 'GINA / SBPT', ano: 2024, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECRs SYGMA, Novel START, PRACTICAL' }, citacao: 'GINA Report 2024. ginasthma.org' },
      }),
      sug({
        id: 'salbutamol_resgate',
        classe_terapeutica: 'Beta-2 agonista de curta ação (SABA)',
        molecula: 'Salbutamol',
        nome_generico: 'Sulfato de Salbutamol',
        indicacao: 'Broncodilatador de resgate em crises — alternativa ao ICS/formoterol como resgate',
        dose: { dose_padrao: '100 mcg/dose', dose_min: '100 mcg', dose_max: '400 mcg por evento', unidade: 'mcg', via: 'Inalatório', frequencia: '2–4 jatos se crise, máx 8 jatos/dia', duracao: 'Conforme necessidade' },
        posologia_completa: 'Salbutamol 100 mcg/dose — 2 jatos em crise, repetir em 20 min se necessário. Uso frequente (> 2x/semana) indica asma não controlada.',
        contraindicacoes: ['Hipersensibilidade'],
        efeitos_adversos: ['Tremor, taquicardia, palpitações', 'Hipocalemia em doses altas'],
        monitoramento: ['Frequência de uso: > 2 jatos/semana indica reavaliação do tratamento'],
        alternativas: ['Fenoterol (alternativa ao salbutamol)', 'ICS/formoterol como MART substitui SABA (GINA 2024 preferência)'],
        evidencia: { diretriz: 'GINA 2024', sociedade: 'GINA', ano: 2024, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'Evidência consolidada' }, citacao: 'GINA Report 2024.' },
      }),
    ],
    nao_farmacologico: [
      'Identificação e evitação de desencadeantes (ácaros, pelos, mofo, fumaça, perfumes)',
      'Técnica inalatória correta — rever a cada consulta',
      'Vacinação anual contra influenza e anti-pneumocócica',
      'Cessação do tabagismo (ativo e passivo)',
      'Controle de rinite alérgica associada (impacta controle da asma)',
      'Plano de ação por escrito para crises',
    ],
    seguimento: 'Retorno em 4–6 semanas após início ou ajuste. Avaliar controle com ACT (Asthma Control Test). Meta: ACT ≥ 20.',
    monitorizacao: ['Espirometria com prova broncodilatadora a cada 1–2 anos', 'ACT a cada consulta', 'Frequência de uso de SABA/resgate', 'Exacerbações que necessitaram de corticoide sistêmico'],
    encaminhamento: 'Pneumologista se asma grave ou não controlada com step 3 (ICS alta dose + LABA)',
  },

  // ══════════════════════════════════════════════════════════
  // DPOC — GOLD 2024
  // ══════════════════════════════════════════════════════════
  dpoc: {
    farmacologico: [
      sug({
        id: 'tiotropio',
        classe_terapeutica: 'Broncodilatador LAMA (Anticolinérgico de Longa Ação)',
        molecula: 'Tiotrópio',
        nome_generico: 'Brometo de Tiotrópio',
        indicacao: 'Broncodilatador de manutenção — 1ª linha em DPOC sintomático (mMRC ≥ 2 ou CAT ≥ 10)',
        dose: { dose_padrao: '18 mcg (HandiHaler) ou 2,5 mcg (Respimat)', dose_min: '18 mcg', dose_max: '18 mcg/dia', unidade: 'mcg', via: 'Inalatório', frequencia: '1x/dia (manhã)', duracao: 'Contínuo' },
        posologia_completa: 'Tiotrópio 18 mcg (HandiHaler) — 1 cápsula pela manhã. Técnica de inalação correta é essencial.',
        contraindicacoes: ['Hipersensibilidade', 'Glaucoma de ângulo fechado (relativa)', 'Retenção urinária grave'],
        efeitos_adversos: ['Boca seca (10–15%)', 'Constipação', 'Retenção urinária (cuidado em HBP)'],
        monitoramento: ['Espirometria anual', 'Sintomas (mMRC, CAT)', 'Frequência de exacerbações'],
        alternativas: ['Umeclidínio 62,5 mcg (LAMA alternativo)', 'Indacaterol/Glicopirrônio (LABA/LAMA — DPOC grupo E)', 'Formoterol 12 mcg 2x/dia (LABA se LAMA não disponível)'],
        evidencia: { diretriz: 'GOLD 2024 — Global Strategy for Prevention, Diagnosis and Management of COPD', sociedade: 'GOLD / SBPT', ano: 2024, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECRs UPLIFT, TIOSPIR' }, citacao: 'Global Initiative for Chronic Obstructive Lung Disease. GOLD Report 2024.' },
      }),
      sug({
        id: 'salbutamol_dpoc',
        classe_terapeutica: 'Beta-2 agonista de curta ação (SABA)',
        molecula: 'Salbutamol',
        nome_generico: 'Sulfato de Salbutamol',
        indicacao: 'DPOC — broncodilatador de resgate em dispneia e exacerbações agudas (GOLD 2024)',
        dose: { dose_padrao: '100 mcg/dose', dose_min: '100 mcg', dose_max: '400 mcg por evento', unidade: 'mcg', via: 'Inalatório', frequencia: '2–4 jatos conforme necessidade (máx 8 jatos/dia)', duracao: 'Conforme necessidade' },
        posologia_completa: 'Salbutamol 100 mcg/dose — 2 a 4 jatos em dispneia aguda. Repetir em 20 min se necessário. Uso frequente indica necessidade de reavaliação e intensificação do tratamento.',
        contraindicacoes: ['Hipersensibilidade'],
        efeitos_adversos: ['Tremor fino', 'Taquicardia', 'Hipocalemia em doses altas'],
        monitoramento: ['Frequência de uso: uso diário indica DPOC não controlado — reavaliar manutenção'],
        alternativas: ['Fenoterol 100 mcg/dose (SABA alternativo)', 'Ipratrópio 40 mcg/dose (SAMA — alternativa ao SABA ou associação em crise)'],
        evidencia: { diretriz: 'GOLD 2024 — Global Strategy for Prevention, Diagnosis and Management of COPD', sociedade: 'GOLD / SBPT', ano: 2024, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'SABA como resgate é padrão universal em DPOC' }, citacao: 'Global Initiative for Chronic Obstructive Lung Disease. GOLD Report 2024.' },
      }),
    ],
    nao_farmacologico: [
      'Cessação do tabagismo — intervenção mais eficaz em DPOC (reduz progressão)',
      'Reabilitação pulmonar: 6–12 semanas de exercício supervisionado (reduz dispneia e exacerbações)',
      'Vacinação: influenza anual + pneumocócica (PCV15/23) + COVID-19',
      'Oxigenoterapia domiciliar se PaO2 < 55 mmHg ou SatO2 < 88% em repouso',
      'Nutrição adequada (desnutrição piora prognóstico)',
    ],
    seguimento: 'Retorno em 4–6 semanas após início. Avaliar com CAT (COPD Assessment Test) e mMRC. Espirometria anual.',
    monitorizacao: ['Espirometria com prova broncodilatadora anual', 'Gasometria arterial se SpO2 < 92%', 'Frequência de exacerbações (definir grupo GOLD A/B/E)', 'CAT e mMRC a cada consulta'],
    encaminhamento: 'Pneumologista para estadiamento e decisão de LABA/LAMA vs. ICS/LABA/LAMA',
  },

  // ══════════════════════════════════════════════════════════
  // ICC — II Diretriz SBC 2023
  // ══════════════════════════════════════════════════════════
  icc: {
    farmacologico: [
      sug({
        id: 'enalapril_icc',
        classe_terapeutica: 'Inibidor da Enzima Conversora de Angiotensina (IECA)',
        molecula: 'Enalapril',
        nome_generico: 'Maleato de Enalapril',
        indicacao: 'IC-FEr (FEVE < 40%) — pilar fundamental: reduz mortalidade, hospitalização e progressão da doença',
        dose: { dose_padrao: '5 mg', dose_min: '2,5 mg', dose_max: '20 mg 2x/dia', unidade: 'mg', via: 'Oral', frequencia: '2x/dia', duracao: 'Contínuo', ajuste_renal: 'TFG < 30: iniciar com 2,5 mg e titular com cautela', ajuste_hepatico: 'Sem ajuste habitual' },
        posologia_completa: 'Enalapril 2,5 mg 2x/dia (início). Titular a cada 2 semanas até 10–20 mg 2x/dia conforme tolerabilidade. Monitorar K+ e creatinina em 1–2 semanas após cada ajuste.',
        contraindicacoes: ['Gravidez (categoria D)', 'Angioedema prévio por IECA', 'Hipercalemia > 5,5 mEq/L', 'Estenose bilateral de artéria renal', 'Uso simultâneo de sacubitril/valsartana (washout 36h)'],
        efeitos_adversos: ['Tosse seca (10–15%)', 'Hipotensão na 1ª dose', 'Hipercalemia', 'Piora aguda da função renal (< 30% creatinina é aceitável)'],
        monitoramento: ['K+ e creatinina em 1–2 semanas após início e cada ajuste', 'PA — meta PAS 90–130 mmHg na IC', 'Sinais de angioedema'],
        alternativas: ['Losartana 50–100 mg/dia (BRA — se tosse por IECA)', 'Sacubitril/Valsartana 24/26 mg 2x/dia (ARNI — preferência ESC HF 2023 se tolerado)'],
        evidencia: { diretriz: 'II Diretriz Brasileira de Insuficiência Cardíaca', sociedade: 'SBC', ano: 2023, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECRs CONSENSUS, SOLVD, V-HeFT II — redução de mortalidade 16–40%' }, citacao: 'Marcondes-Braga FG et al. Arq Bras Cardiol. 2024.' },
      }),
      sug({
        id: 'carvedilol',
        classe_terapeutica: 'Betabloqueador (Alfa-1 e Beta não seletivo)',
        molecula: 'Carvedilol',
        nome_generico: 'Carvedilol',
        indicacao: 'IC-FEr (FEVE < 40%) — pilar fundamental: reduz mortalidade e morte súbita. Iniciar apenas após estabilização.',
        dose: { dose_padrao: '6,25 mg', dose_min: '3,125 mg', dose_max: '25 mg 2x/dia', unidade: 'mg', via: 'Oral', frequencia: '2x/dia com refeições', duracao: 'Contínuo', ajuste_renal: 'Sem ajuste necessário', ajuste_hepatico: 'Cautela em hepatopatia' },
        posologia_completa: 'Carvedilol 3,125 mg 2x/dia (início). Dobrar a dose a cada 2 semanas conforme tolerância. Meta: 25 mg 2x/dia.',
        contraindicacoes: ['Asma / DPOC grave (broncoespasmo)', 'Bradiarritmias (BAV 2–3 grau)', 'ICC descompensada aguda (aguardar estabilização)', 'Hipotensão grave'],
        efeitos_adversos: ['Bradicardia', 'Hipotensão (especialmente na titulação)', 'Fadiga', 'Piora da retenção hídrica (inicio)'],
        monitoramento: ['FC e PA a cada titulação (meta FC repouso 55–65 bpm)', 'Função renal e eletrólitos', 'Sinais de descompensação (peso diário)'],
        alternativas: ['Succinato de Metoprolol 25–200 mg/dia (ICC com FEVE reduzida)', 'Bisoprolol 2,5–10 mg/dia'],
        evidencia: { diretriz: 'II Diretriz Brasileira de Insuficiência Cardíaca', sociedade: 'SBC', ano: 2023, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECRs COPERNICUS, MERIT-HF, CIBIS-II' }, citacao: 'Marcondes-Braga FG et al. Arq Bras Cardiol. 2024.' },
      }),
      sug({
        id: 'espironolactona_icc',
        classe_terapeutica: 'Antagonista da Aldosterona (ARM)',
        molecula: 'Espironolactona',
        nome_generico: 'Espironolactona',
        indicacao: 'IC-FEr NYHA II–IV (FEVE < 35%) — pilar fundamental: reduz mortalidade e hospitalização',
        dose: { dose_padrao: '25 mg', dose_min: '12,5 mg', dose_max: '50 mg/dia', unidade: 'mg', via: 'Oral', frequencia: '1x/dia', duracao: 'Contínuo', ajuste_renal: 'Contraindicado se TFG < 30 ou K+ > 5,0 mEq/L' },
        posologia_completa: 'Espironolactona 25 mg 1x/dia. Aumentar para 50 mg/dia após 4–8 semanas se K+ < 5,0 mEq/L e TFG estável.',
        contraindicacoes: ['TFG < 30 mL/min', 'K+ > 5,0 mEq/L antes do início', 'Uso com amilorida ou triamtereno (hipercalemia grave)', 'Doença de Addison'],
        efeitos_adversos: ['Hipercalemia (monitorar K+ e creatinina)', 'Ginecomastia/mastalgia (substituir por eplerenona se intolerável)', 'Piora da função renal'],
        monitoramento: ['K+ e creatinina em 1 semana após início, 1 mês, depois a cada 3 meses', 'Suspender se K+ > 5,5 mEq/L ou creatinina > 2,5 mg/dL'],
        alternativas: ['Eplerenona 25–50 mg/dia (menos ginecomastia — sem interação CYP3A4)'],
        evidencia: { diretriz: 'II Diretriz Brasileira de Insuficiência Cardíaca', sociedade: 'SBC', ano: 2023, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECR RALES — redução de mortalidade 30%' }, citacao: 'Marcondes-Braga FG et al. Arq Bras Cardiol. 2024.' },
      }),
      sug({
        id: 'furosemida',
        classe_terapeutica: 'Diurético de Alça',
        molecula: 'Furosemida',
        nome_generico: 'Furosemida',
        indicacao: 'ICC — alívio de congestão (edema, ortopneia, dispneia). Usar a menor dose eficaz.',
        dose: { dose_padrao: '40 mg', dose_min: '20 mg', dose_max: '240 mg/dia', unidade: 'mg', via: 'Oral', frequencia: '1–2x/dia (manhã / manhã e tarde)', duracao: 'Conforme congestão' },
        posologia_completa: 'Furosemida 40 mg — 1 comprimido pela manhã. Ajustar conforme resposta diurética e peso corporal diário.',
        contraindicacoes: ['Anúria', 'Hipopotassemia grave não corrigida', 'Coma hepático'],
        efeitos_adversos: ['Hipocalemia (monitorar K+)', 'Hiponatremia', 'Hiperuricemia', 'Ototoxicidade em doses altas IV'],
        monitoramento: ['Peso diário (alerta: ganho > 2 kg em 3 dias → aumentar furosemida)', 'Eletrólitos e creatinina semanalmente no início', 'Débito urinário'],
        alternativas: ['Bumetanida 0,5–2 mg (se resistência à furosemida)', 'Torasemida 10–20 mg (maior biodisponibilidade oral)'],
        evidencia: { diretriz: 'II Diretriz Brasileira de Insuficiência Cardíaca', sociedade: 'SBC', ano: 2023, nivel_evidencia: { nivel: 'B', grau: 'I', descricao: 'Diuréticos reduzem sintomas de congestão' }, citacao: 'Marcondes-Braga FG et al. Arq Bras Cardiol. 2024.' },
      }),
    ],
    nao_farmacologico: [
      'Restrição hídrica: 1,5–2 L/dia em ICC avançada',
      'Restrição de sódio: < 2 g/dia',
      'Peso diário em jejum: alerta se ganho > 2 kg em 3 dias',
      'Reabilitação cardíaca supervisionada (melhora capacidade funcional)',
      'Cessação do tabagismo e álcool',
    ],
    seguimento: 'Retorno em 2–4 semanas após início ou ajuste. Avaliar NYHA, peso, FC, PA e função renal.',
    monitorizacao: ['BNP/NT-proBNP a cada 3–6 meses', 'Ecocardiograma anual', 'Eletrólitos e creatinina frequentes (mensal no início)', 'Peso diário domiciliar'],
    encaminhamento: 'Cardiologista para avaliação de terapia de ressincronização (FEVE < 35% com BRE) ou TAVI/cirurgia se causa valvar',
  },

  // ══════════════════════════════════════════════════════════
  // SCA — Diretriz SBC 2021
  // ══════════════════════════════════════════════════════════
  sca: {
    farmacologico: [
      sug({
        id: 'aas_sca',
        classe_terapeutica: 'Antiagregante Plaquetário (AAS)',
        molecula: 'Ácido Acetilsalicílico',
        nome_generico: 'Ácido Acetilsalicílico',
        indicacao: 'SCA — antiagregação imediata',
        dose: { dose_padrao: '300 mg (ataque)', dose_min: '100 mg', dose_max: '300 mg ataque, depois 100 mg/dia', unidade: 'mg', via: 'Oral', frequencia: '300 mg dose única de ataque → 100 mg/dia manutenção', duracao: 'Indefinido' },
        posologia_completa: 'AAS 300 mg VO imediatamente (mastigar). Manutenção: AAS 100 mg/dia contínuo.',
        contraindicacoes: ['Úlcera péptica ativa sangrante', 'Alergia a salicilatos', 'Sangramento ativo'],
        efeitos_adversos: ['Irritação gástrica', 'Sangramento GI', 'Broncoespasmo (sensíveis a AINE)'],
        monitoramento: ['Hemograma (sangramento)', 'PA (controle pressórico adequado reduz risco hemorrágico)'],
        alternativas: ['Clopidogrel 300 mg ataque se alergia ao AAS'],
        evidencia: { diretriz: 'Diretriz Brasileira de SCA sem Supradesnivelamento de ST', sociedade: 'SBC', ano: 2021, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECRs e meta-análises ISIS-2, PLATO' }, citacao: 'Nicolau JC et al. Arq Bras Cardiol. 2021;117(1):181-264.' },
      }),
    ],
    nao_farmacologico: [
      '⚠ URGÊNCIA — Acionar SAMU 192 ou encaminhar imediatamente à emergência',
      'ECG de 12 derivações + troponina hs IMEDIATAMENTE (protocolo 0-1h ou 0-3h)',
      'Monitorização cardíaca contínua',
      'Acesso venoso periférico calibroso',
      'Oxigenoterapia se SpO2 < 90%',
      'Jejum para possível cateterismo de urgência',
    ],
    seguimento: 'Avaliação cardiológica urgente em serviço com hemodinâmica. Após estabilização: reabilitação cardíaca, controle rigoroso de fatores de risco.',
    monitorizacao: ['Troponina hs 0h e 1h (ou 3h)', 'ECG seriado a cada 6–12h', 'PA, FC e ritmo cardíaco contínuo', 'Função renal (antes de contraste para cateterismo)'],
    encaminhamento: 'Cardiologia / hemodinâmica IMEDIATAMENTE',
  },

  // ══════════════════════════════════════════════════════════
  // HIPOTIREOIDISMO — Consenso SBEM 2023
  // ══════════════════════════════════════════════════════════
  hipotireoidismo: {
    farmacologico: [
      sug({
        id: 'levotiroxina',
        classe_terapeutica: 'Hormônio Tireoidiano Sintético (T4)',
        molecula: 'Levotiroxina Sódica',
        nome_generico: 'Levotiroxina Sódica',
        indicacao: 'Hipotireoidismo primário — reposição hormonal',
        dose: { dose_padrao: '1,6 mcg/kg/dia', dose_min: '25 mcg/dia', dose_max: '200 mcg/dia', unidade: 'mcg', via: 'Oral', frequencia: '1x/dia (jejum, 30–60 min antes do café da manhã)', duracao: 'Contínuo (lifelong)' },
        posologia_completa: 'Levotiroxina 1,6 mcg/kg/dia em dose única diária, em jejum 30–60 min antes do café. Iniciar com 25–50 mcg em idosos ou cardiopatas e titular a cada 6 semanas.',
        contraindicacoes: ['Tireotoxicose não tratada', 'IAM agudo (relativa — extrema cautela)'],
        efeitos_adversos: ['Palpitações / taquicardia (superdosagem)', 'Insônia, ansiedade (TSH suprimido)', 'Perda de peso excessiva', 'Fibrilação atrial (idosos — risco com TSH suprimido)'],
        monitoramento: ['TSH em 6–8 semanas após início ou ajuste de dose', 'Meta: TSH 0,5–2,5 mUI/L (adultos)', 'Meta TSH 1–4 mUI/L (idosos > 70 anos)', 'FC e ritmo cardíaco (fibrilação atrial em subdosagem ou superdosagem)'],
        alternativas: ['Não há alternativa equivalente ao T4 para hipotireoidismo primário; combinação T4+T3 é controversa e não recomendada rotineiramente'],
        evidencia: { diretriz: 'Consenso Brasileiro de Hipotireoidismo', sociedade: 'SBEM', ano: 2023, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECRs e meta-análises — levotiroxina é tratamento padrão-ouro' }, citacao: 'Sociedade Brasileira de Endocrinologia e Metabologia. Consenso de Hipotireoidismo 2023.' },
      }),
    ],
    nao_farmacologico: [
      'Tomar levotiroxina sempre em jejum, 30–60 min antes do café (interferência com cálcio, ferro, fibras)',
      'Evitar ingestão de cálcio, ferro ou antiácidos dentro de 4h da levotiroxina',
      'Dieta regular sem restrição específica de iodo',
      'Atividade física regular (melhora os sintomas)',
    ],
    seguimento: 'TSH em 6–8 semanas após início ou ajuste. Após estabilidade, TSH anual.',
    monitorizacao: ['TSH a cada 6–8 semanas (ajuste) → anual (estável)', 'T4L se TSH discordante com clínica', 'Perfil lipídico (melhora com tratamento)', 'FC e PA a cada consulta'],
    encaminhamento: 'Endocrinologista se TSH > 10 mUI/L com sintomas, gravidez (TSH < 2,5 no 1T), nódulos tireoidianos associados',
  },

  // ══════════════════════════════════════════════════════════
  // FARINGOAMIGDALITE BACTERIANA — IDSA 2012 / Escore McIsaac
  // ══════════════════════════════════════════════════════════
  faringoamigdalite: {
    farmacologico: [
      sug({
        id: 'amoxicilina_faringe',
        classe_terapeutica: 'Aminopenicilina',
        molecula: 'Amoxicilina',
        nome_generico: 'Amoxicilina Tri-hidratada',
        indicacao: '1ª linha para faringoamigdalite estreptocócica (Streptococcus pyogenes / grupo A)',
        dose: { dose_padrao: '500 mg', dose_min: '250 mg', dose_max: '500 mg 3x/dia', unidade: 'mg', via: 'Oral', frequencia: '3x/dia (8/8h) por 10 dias', duracao: '10 dias (não abreviar — risco de recidiva e febre reumática)' },
        posologia_completa: 'Amoxicilina 500 mg a cada 8 horas por 10 dias. Alternativa: 1 g 2x/dia (evidência equivalente, melhor adesão). Iniciar apenas com RADT positivo ou escore McIsaac ≥ 3.',
        contraindicacoes: ['Alergia a penicilinas (verificar mononucleose — rash cutâneo se amoxicilina em EBV)'],
        efeitos_adversos: ['Diarreia (10–15%)', 'Rash cutâneo (3–5%; atenção se mononucleose)', 'Náusea', 'Candidíase oral ou vaginal'],
        monitoramento: ['Resolução da febre em 24–48h', 'Melhora da odinofagia em 48–72h', 'Retornar se piora ou persistência após 48h'],
        alternativas: ['Benzilpenicilina benzatina 1.200.000 UI IM dose única (melhor adesão, previne febre reumática)', 'Azitromicina 500 mg/dia por 5 dias (alergia a betalactâmicos)', 'Cefalexina 500 mg 4x/dia por 10 dias (alergia leve à penicilina)'],
        evidencia: { diretriz: 'IDSA Clinical Practice Guideline for Pharyngitis', sociedade: 'Infectious Diseases Society of America (IDSA)', ano: 2012, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'Múltiplos ECRs — amoxicilina é equivalente à penicilina V' }, citacao: 'Shulman ST et al. Clin Infect Dis. 2012;55(10):e86-102.' },
      }),
    ],
    nao_farmacologico: [
      'Analgesia e antipiresia: paracetamol 750 mg 6/6h (1ª opção) ou ibuprofeno 400 mg 8/8h com alimento',
      'Hidratação oral adequada',
      'Repouso relativo',
      'Gargarejos com água morna e sal (alívio local)',
      'Não usar antibiótico sem confirmação bacteriana (RADT ou McIsaac ≥ 3)',
      '⚠ Não prescrever amoxicilina sem excluir mononucleose (EBV) — risco de rash extenso',
    ],
    seguimento: 'Retorno em 48–72h se não houver melhora. Se melhora em 48h, completar 10 dias de antibiótico.',
    monitorizacao: ['Resolução dos sintomas em 48–72h', 'Febre persistente > 72h: reavaliação (abscesso periamigdaliano?)', 'Cultura de orofaringe se falha terapêutica'],
    encaminhamento: 'Otorrinolaringologista se suspeita de abscesso periamigdaliano ou amigdalite de repetição (≥ 5 episódios/ano)',
  },

  // ══════════════════════════════════════════════════════════
  // PAC — Diretriz SBPT/AMIB 2022
  // ══════════════════════════════════════════════════════════
  pac: {
    farmacologico: [
      sug({
        id: 'amoxicilina_pac',
        classe_terapeutica: 'Aminopenicilina',
        molecula: 'Amoxicilina',
        nome_generico: 'Amoxicilina Tri-hidratada',
        indicacao: 'PAC leve sem comorbidades em paciente ambulatorial — 1ª linha (S. pneumoniae)',
        dose: { dose_padrao: '500 mg', dose_min: '500 mg', dose_max: '1000 mg 3x/dia', unidade: 'mg', via: 'Oral', frequencia: '3x/dia (8/8h) por 5–7 dias', duracao: '5 dias (PAC leve, sem complicações)' },
        posologia_completa: 'Amoxicilina 500 mg a cada 8 horas por 5–7 dias. Alternativa em PAC leve + atípicos: Amoxicilina 500 mg 8/8h + Azitromicina 500 mg/dia por 5 dias.',
        contraindicacoes: ['Alergia a penicilinas'],
        efeitos_adversos: ['Diarreia', 'Rash cutâneo', 'Candidíase'],
        monitoramento: ['Reavaliação em 48–72h', 'Radiografia de tórax controle em 6–8 semanas (excluir neoplasia subjacente em > 50 anos)'],
        alternativas: ['Azitromicina 500 mg/dia × 5 dias (atípicos, alergia a betalactâmicos)', 'Amoxicilina-Clavulanato 875/125 mg 2x/dia (PAC com comorbidades)', 'Levofloxacino 750 mg/dia × 5 dias (PAC de risco, falha à amoxicilina)'],
        evidencia: { diretriz: 'Diretrizes Brasileiras para Pneumonia Adquirida na Comunidade (PAC)', sociedade: 'SBPT / AMIB', ano: 2022, nivel_evidencia: { nivel: 'A', grau: 'I', descricao: 'ECRs e meta-análises — amoxicilina é 1ª linha em PAC leve' }, citacao: 'Corrêa RA et al. J Bras Pneumol. 2022;48(1):e20210406.' },
      }),
    ],
    nao_farmacologico: [
      'Hidratação oral ou IV conforme gravidade',
      'Analgesia e antipiresia: paracetamol 750 mg 6/6h',
      'Repouso relativo',
      'Oxigenoterapia se SpO2 < 92% (meta SpO2 92–96%)',
      'Avaliação de internação: CURB-65 ≥ 2 ou critérios de gravidade',
      'Vacinação antipneumocócica após recuperação (se não vacinado)',
    ],
    seguimento: 'Reavaliação em 48–72h. Radiografia de tórax controle em 6–8 semanas. Resposta clínica esperada: defervescência em 72h.',
    monitorizacao: ['CURB-65 na apresentação para decisão ambulatório/internação', 'SpO2 contínua se internado', 'Hemoculturas e culturas de escarro (se hospitalizado)', 'Procalcitonina como guia de descontinuação do antibiótico'],
    encaminhamento: 'Internação hospitalar se CURB-65 ≥ 2 ou critérios ATS/IDSA de PAC grave',
  },
};

// ─── FUNÇÃO PRINCIPAL ─────────────────────────────────────────

export function getTherapeuticForCondition(
  conditionId: string,
  diagnosticoSelecionado: string,
): TherapeuticPlan | null {
  const protocolo = PROTOCOLOS[conditionId];
  if (!protocolo) return null;

  return {
    diagnostico_selecionado: diagnosticoSelecionado,
    preferencia_laboratorio: 'sem_preferencia',
    ...protocolo,
  };
}

// ─── Cross-engine: Evidence + Conflict + Registry integration ─

import { EVIDENCE_DB } from './evidence-engine';
import { detectarConflitos, buscarConflitoClasse } from './guideline-conflict-engine';
import { listarRecomendacoes } from './recommendation-registry';

export interface SugestaoTerapeuticaEnriquecida {
  molecula: string;
  classe_terapeutica: string;
  conflitos: ReturnType<typeof detectarConflitos>;
  conflitos_classe: ReturnType<typeof buscarConflitoClasse>;
  uso_historico: number;
  nivel_evidencia_disponivel: string;
}

export function enriquecerSugestao(
  molecula: string,
  classe_terapeutica: string,
  diagnostico_id: string,
): SugestaoTerapeuticaEnriquecida {
  const conflitos       = detectarConflitos(diagnostico_id);
  const conflitos_classe = buscarConflitoClasse(classe_terapeutica);

  const historico = listarRecomendacoes({ molecula });
  const uso_historico = historico.length;

  const diagEv = EVIDENCE_DB.find(d =>
    d.cid10 === diagnostico_id ||
    d.nome.toLowerCase().includes(diagnostico_id.toLowerCase())
  );

  let nivel_evidencia_disponivel = 'Sem evidência indexada';
  if (diagEv) {
    for (const dir of diagEv.diretrizes) {
      for (const ter of dir.terapias) {
        if (ter.nome.toLowerCase().includes(molecula.toLowerCase())) {
          nivel_evidencia_disponivel = `Nível ${ter.estudos[0]?.nivel ?? 'B'} (${dir.sigla})`;
          break;
        }
      }
    }
  }

  return { molecula, classe_terapeutica, conflitos, conflitos_classe, uso_historico, nivel_evidencia_disponivel };
}
