// ============================================================
// PRESCREVE-AI — Biblioteca de Evidências Terapêuticas
// Benefícios, Perfil Ideal e Estudos Chave por molécula
// Dados baseados em ensaios clínicos publicados
// ============================================================

export interface EstudoChave {
  nome: string;
  tipo: string;
  ano: number;
  n_pacientes?: number;
  desfecho_primario: string;
  resultado_principal: string;
  doi?: string;
}

// ─── BENEFÍCIOS ───────────────────────────────────────────────
// Quantitativos onde disponíveis em ECRs de desfechos duros

export const BENEFICIOS: Record<string, string[]> = {

  // HAS ─────────────────────────────────────────────────────
  enalapril: [
    'Redução de PA sistólica 10–15 mmHg em monoterapia',
    'Redução de mortalidade cardiovascular 21% em pós-IAM com disfunção VE (SAVE)',
    'Redução de mortalidade 16% em IC-FEr (SOLVD)',
    'Redução de mortalidade 40% em IC avançada NYHA IV (CONSENSUS)',
    'Nefroproteção em DRC e DM2: reduz progressão para DRET',
    'Redução de proteinúria (marcador de nefroproteção)',
    'Redução de hospitalização por IC descompensada',
    'Redução do risco de AVC em pacientes hipertensos',
  ],
  hctz: [
    'Redução de PA sistólica 8–10 mmHg em monoterapia',
    'Redução de eventos coronarianos (não inferior a lisinopril/anlodipino — ALLHAT)',
    'Efeito sinérgico com IECA/BRA: redução adicional de 3–5 mmHg',
    'Custo muito baixo (genérico amplamente disponível no SUS)',
    'Redução de mortalidade cardiovascular em meta-análises de tiazídicos',
    'Boa eficácia em pacientes > 60 anos e raça negra (em combinação)',
  ],

  // DM2 ─────────────────────────────────────────────────────
  metformina: [
    'Redução de HbA1c 1,0–1,5 pontos percentuais em monoterapia',
    'Redução de mortalidade cardiovascular 36% em obesos com DM2 (UKPDS 34)',
    'Redução de complicações relacionadas ao DM 32% (UKPDS 34)',
    'Neutro ou redução modesta de peso (−1 a −3 kg)',
    'Não causa hipoglicemia em monoterapia',
    'Benefício cardiovascular independente do controle glicêmico',
    'Custo mínimo: disponível no Farmácia Popular e SUS',
  ],

  // DISLIPIDEMIA ─────────────────────────────────────────────
  rosuvastatina: [
    'Redução de LDL-c 48–55% com dose de 20 mg',
    'Redução de eventos cardiovasculares maiores (MACE) 44% em prevenção primária (JUPITER)',
    'Redução de mortalidade cardiovascular 20% em meta-análise de estatinas de alta potência',
    'Regressão de placas ateroscleróticas coronarianas (ASTEROID)',
    'Redução de AVC 48% (JUPITER)',
    'Aumento de HDL-c 8–10% associado',
    'Benefício em DM2, DRC e síndrome metabólica',
  ],

  // ASMA ─────────────────────────────────────────────────────
  budesonida_formoterol: [
    'Redução de exacerbações graves 64% vs SABA isolado (SYGMA 2)',
    'Não inferior a ICS/formoterol de manutenção fixa para prevenção de exacerbações (Novel START)',
    'Redução do uso de SABA: menos efeitos adversos adrenérgicos',
    'Melhora de ACT (Asthma Control Test) vs SABA isolado',
    'Menor dose cumulativa de ICS com eficácia equivalente (PRACTICAL)',
    'Redução de hospitalização por asma grave',
    'Estratégia MART aprovada como 1ª linha pelo GINA 2022+ para adultos',
  ],
  salbutamol_resgate: [
    'Broncodilatação em 5–15 minutos (início de ação rápido)',
    'Alívio eficaz de broncoespasmo agudo',
    'Reversão da limitação ao fluxo de ar em crises leves-moderadas',
    'Amplamente disponível e de baixo custo',
  ],

  // DPOC ─────────────────────────────────────────────────────
  tiotropio: [
    'Melhora de VEF1 pós-broncodilatador +100–150 mL (UPLIFT)',
    'Redução de exacerbações moderadas-graves 14–21% (UPLIFT)',
    'Melhora de qualidade de vida: SGRQ −2,7 pontos (clinicamente relevante)',
    'Redução de hospitalizações por DPOC 14% (UPLIFT)',
    'Perfil de segurança cardiovascular confirmado em > 17.000 pacientes (TIOSPIR)',
    'Redução de dispneia (mMRC) e tolerância ao exercício melhora',
    'Benefício sustentado em 4 anos (UPLIFT)',
  ],

  // ICC ─────────────────────────────────────────────────────
  carvedilol: [
    'Redução de mortalidade total 34% em IC grave (COPERNICUS)',
    'Redução de mortalidade 65% em IC moderada (US Carvedilol)',
    'Melhora de FEVE +5–8 pontos percentuais',
    'Redução de hospitalização por IC 20%',
    'Redução de morte súbita (ação sobre arritmias ventriculares)',
    'Melhora de classe funcional NYHA em 1 grau',
    'Efeito beta-1, beta-2 e alfa-1: proteção miocárdica abrangente',
  ],
  furosemida: [
    'Alívio de congestão em 30–60 min (via IV) ou 1–2h (via oral)',
    'Redução de peso hídrico 1–3 kg nas primeiras 24–48h',
    'Melhora de ortopneia e dispneia em repouso',
    'Redução de edema periférico e hepatomegalia congestiva',
    'Alta eficácia na ICC descompensada (alívio sintomático)',
  ],

  // SCA ─────────────────────────────────────────────────────
  aas_sca: [
    'Redução de mortalidade cardiovascular 23% em IAM agudo (ISIS-2)',
    'Redução de reinfarto não fatal 49% (ISIS-2)',
    'Redução de AVC não fatal 46% (ISIS-2)',
    'Redução de MACE 25% em combinação com trombolítico (ISIS-2)',
    'Antiagregação irreversível: inibe COX-1 plaquetária por toda vida da plaqueta',
    'Benefício iniciado em 1h após ingesta',
  ],

  // HIPOTIREOIDISMO ─────────────────────────────────────────
  levotiroxina: [
    'Normalização de TSH e T4L na maioria dos pacientes',
    'Reversão completa de sintomas de hipotireoidismo (fadiga, constipação, ganho de peso, intolerância ao frio)',
    'Redução de risco cardiovascular associado ao hipotireoidismo (dislipidemia, disfunção diastólica)',
    'Normalização do perfil lipídico (LDL-c e TG tendem a reduzir)',
    'Medicamento de baixíssimo custo disponível no SUS/Farmácia Popular',
    'Segurança bem estabelecida em décadas de uso',
  ],

  // FARINGOAMIGDALITE ───────────────────────────────────────
  amoxicilina_faringe: [
    'Redução de duração dos sintomas em 1–2 dias vs placebo',
    'Prevenção de febre reumática aguda (principal indicação do tratamento)',
    'Erradicação microbiológica de EBHGA em > 85–90% dos casos',
    'Redução de complicações supurativas (abscesso periamigdaliano)',
    'Equivalente à penicilina V na erradicação de EBHGA (múltiplos ECRs)',
    'Redução de transmissibilidade do estreptococo',
  ],

  // PAC ─────────────────────────────────────────────────────
  amoxicilina_pac: [
    'Taxa de cura clínica equivalente a fluoroquinolonas em PAC leve (meta-análise Cochrane)',
    'Erradicação de S. pneumoniae (principal patógeno da PAC comunitária)',
    'Resolução de febre em 48–72h em pacientes responsivos',
    'Menor seleção de resistência bacteriana vs fluoroquinolonas',
    'Baixo custo e boa tolerabilidade oral',
    '5 dias de tratamento equivalentes a 10 dias em PAC leve (Cochrane 2018)',
  ],
};

// ─── PERFIL IDEAL ─────────────────────────────────────────────
// Quem mais se beneficia desta molécula

export const PERFIL_IDEAL: Record<string, string[]> = {

  enalapril: [
    'HAS associada a diabetes mellitus (nefroproteção)',
    'HAS associada a doença renal crônica com proteinúria',
    'HAS com insuficiência cardíaca com FEVE reduzida (< 40%)',
    'Pacientes pós-IAM com disfunção ventricular esquerda',
    'HAS sem tosse prévia por IECA',
    'HAS em pacientes mais jovens (< 55 anos)',
  ],
  hctz: [
    'HAS isolada sem gota, diabetes descompensado ou hipocalemia',
    'HAS em pacientes > 60 anos (boa resposta pressórica)',
    'HAS em combinação com IECA ou BRA (sinergia anti-hipertensiva)',
    'HAS com edema associado',
    'Pacientes de raça negra em combinação (maior resposta a tiazídicos)',
    'HAS de baixo custo prioritário',
  ],

  metformina: [
    'DM2 recém-diagnosticado sem contraindicações',
    'DM2 com sobrepeso ou obesidade (IMC > 25 kg/m²)',
    'DM2 com TFG ≥ 45 mL/min/1,73m² (manter; reduzir dose 30–45)',
    'DM2 com risco cardiovascular moderado sem DCV estabelecida',
    'Paciente que não deseja medicação injetável',
    'DM2 onde custo é fator limitante',
  ],

  rosuvastatina: [
    'Dislipidemia de risco cardiovascular intermediário-alto (Escore de Risco Global ≥ 10%)',
    'Hipercolesterolemia com LDL > 130 mg/dL sem resposta a dieta',
    'DM2 + dislipidemia (prevenção primária)',
    'PCR-as elevada (> 2 mg/L) + LDL normal (indicação JUPITER)',
    'Pós-SCA: meta de LDL < 50 mg/dL (alta potência necessária)',
    'Falha a estatinas de menor potência (sinvastatina, pravastatina)',
  ],

  budesonida_formoterol: [
    'Asma não controlada em uso de SABA isolado',
    'Asma intermitente a moderada (step 2–4 GINA)',
    'Paciente que prefere usar um único inalador para alívio e controle',
    'Asma com exacerbações frequentes (≥ 2/ano) em uso de ICS',
    'Asma em adultos e adolescentes ≥ 12 anos (MART aprovado)',
    'Asma + rinite alérgica associada',
  ],
  salbutamol_resgate: [
    'Crise asmática aguda (qualquer gravidade) como broncodilatador de emergência',
    'Asma onde ICS/formoterol não está disponível como resgate',
    'Pré-medicação para exercício físico (2 jatos 15 min antes)',
    'Pacientes pediátricos em crise (< 12 anos — preferir inalador com espaçador)',
  ],

  tiotropio: [
    'DPOC estadio II–IV (GOLD 2–4) com dispneia ao esforço (mMRC ≥ 2)',
    'DPOC com exacerbações frequentes (≥ 1/ano)',
    'Ex-fumante ou fumante ativo com diagnóstico espirométrico confirmado',
    'DPOC após broncodilatador de curta ação insuficiente',
    'DPOC com tolerância ao exercício reduzida (CAT ≥ 10)',
    'DPOC sem resposta significativa a ICS (sem componente asmático)',
  ],

  carvedilol: [
    'Insuficiência cardíaca com FEVE reduzida (< 40%) — NYHA II–IV estável',
    'IC estabilizada hemodinamicamente (sem descompensação ativa)',
    'IC pós-IAM com disfunção sistólica',
    'IC com FC > 70 bpm em ritmo sinusal',
    'IC tolerante ao betabloqueio (sem DPOC grave, sem bradiarritmia)',
    'IC em associação com IECA/BRA/sacubitril-valsartana + diurético',
  ],
  furosemida: [
    'IC descompensada com sinais de congestão (ortopneia, DPN, edema +3/+4)',
    'IC com sobrecarga hídrica documentada (ganho de peso > 2 kg em 3 dias)',
    'IC com derrame pleural ou ascite (alívio sintomático)',
    'Resistência a tiazídicos na IC (diurético de alça é mais potente)',
    'IC em combinação com espironolactona (sinergia e proteção de K+)',
  ],

  aas_sca: [
    'Qualquer paciente com SCA aguda sem contraindicação hemorrágica',
    'Pós-IAM: uso contínuo indefinido',
    'Pós-revascularização cirúrgica ou percutânea (+ P2Y12 por 1–12 meses)',
    'Prevenção secundária de eventos aterotrombóticos (AVC, AIT, DAP)',
    'SCA em combinação com ticagrelor ou clopidogrel (dupla antiagregação)',
  ],

  levotiroxina: [
    'Hipotireoidismo primário clínico (TSH > LSN + sintomas)',
    'Hipotireoidismo subclínico com TSH > 10 mUI/L',
    'Hipotireoidismo subclínico com TSH 4–10 + sintomas sugestivos',
    'Grávidas: qualquer grau de hipotireoidismo (meta TSH < 2,5 no 1º trimestre)',
    'Hipotireoidismo pós-radioiodo ou pós-tireoidectomia',
    'Hipotireoidismo de Hashimoto com TSH elevado',
  ],

  amoxicilina_faringe: [
    'Faringoamigdalite com Escore McIsaac ≥ 3 (risco bacteriano alto)',
    'RADT (teste rápido) positivo para EBHGA',
    'Criança com sinais de faringoamigdalite bacteriana (exsudato + adenomegalia)',
    'Faringoamigdalite recorrente documentada (≥ 3 episódios/ano)',
    'Histórico familiar de febre reumática',
    'Paciente sem alergia a penicilinas e sem mononucleose suspeita',
  ],

  amoxicilina_pac: [
    'PAC leve (CURB-65 = 0–1) sem comorbidades em âmbito ambulatorial',
    'PAC em paciente jovem sem uso recente de antibióticos',
    'PAC com quadro clínico típico (febre, tosse produtiva, consolidação lobar)',
    'PAC onde S. pneumoniae é o patógeno mais provável',
    'PAC em paciente sem alergia a betalactâmicos',
    'PAC em paciente sem exposição hospitalar recente (< 90 dias)',
  ],
};

// ─── ESTUDOS CHAVE ────────────────────────────────────────────
// Ensaios clínicos e meta-análises que fundamentam cada recomendação

export const ESTUDOS_CHAVE: Record<string, EstudoChave[]> = {

  // HAS ─────────────────────────────────────────────────────
  enalapril: [
    {
      nome: 'CONSENSUS',
      tipo: 'ECR duplo-cego multicêntrico',
      ano: 1987,
      n_pacientes: 253,
      desfecho_primario: 'Mortalidade total em 6 meses',
      resultado_principal: 'Enalapril reduziu mortalidade em 40% vs placebo em pacientes com IC NYHA IV',
      doi: '10.1056/NEJM198706043162301',
    },
    {
      nome: 'SOLVD-Treatment',
      tipo: 'ECR duplo-cego multicêntrico',
      ano: 1991,
      n_pacientes: 2569,
      desfecho_primario: 'Mortalidade total',
      resultado_principal: 'Enalapril reduziu mortalidade 16% e hospitalização por IC 26% em IC-FEr (FEVE < 35%)',
      doi: '10.1056/NEJM199108013250501',
    },
    {
      nome: 'SAVE',
      tipo: 'ECR duplo-cego multicêntrico',
      ano: 1992,
      n_pacientes: 2231,
      desfecho_primario: 'Mortalidade total',
      resultado_principal: 'Captopril (IECA) reduziu mortalidade 21% e hospitalização por IC 37% pós-IAM com FEVE ≤ 40%',
      doi: '10.1056/NEJM199209033271001',
    },
  ],
  hctz: [
    {
      nome: 'ALLHAT',
      tipo: 'ECR multicêntrico aberto (32.804 centros)',
      ano: 2002,
      n_pacientes: 33357,
      desfecho_primario: 'IAM fatal + IAM não fatal',
      resultado_principal: 'Clortalidona (tiazídico) não inferior a anlodipino e lisinopril para desfechos coronarianos; superior na prevenção de IC',
      doi: '10.1001/jama.288.23.2981',
    },
    {
      nome: 'Meta-análise Law et al.',
      tipo: 'Meta-análise de 147 ECRs',
      ano: 2009,
      n_pacientes: 464000,
      desfecho_primario: 'Eventos cardiovasculares maiores',
      resultado_principal: 'Cada redução de 10 mmHg em PAS associa-se a 22% de redução de DCV, independente da classe de anti-hipertensivo',
      doi: '10.1136/bmj.b2840',
    },
  ],

  // DM2 ─────────────────────────────────────────────────────
  metformina: [
    {
      nome: 'UKPDS 34',
      tipo: 'ECR multicêntrico',
      ano: 1998,
      n_pacientes: 753,
      desfecho_primario: 'Qualquer desfecho relacionado ao DM',
      resultado_principal: 'Metformina em obesos: redução 32% de complicações DM e 36% de mortalidade relacionada ao DM vs dieta isolada',
      doi: '10.1016/S0140-6736(98)07037-8',
    },
    {
      nome: 'UKPDS 33',
      tipo: 'ECR multicêntrico',
      ano: 1998,
      n_pacientes: 3867,
      desfecho_primario: 'Desfechos macrovasculares e microvasculares do DM',
      resultado_principal: 'Controle glicêmico intensivo reduziu complicações microvasculares 25% — metformina mostrou benefício adicional cardiovascular',
      doi: '10.1016/S0140-6736(98)07019-6',
    },
  ],

  // DISLIPIDEMIA ─────────────────────────────────────────────
  rosuvastatina: [
    {
      nome: 'JUPITER',
      tipo: 'ECR duplo-cego multicêntrico',
      ano: 2008,
      n_pacientes: 17802,
      desfecho_primario: 'MACE (IAM, AVC, revascularização, hospitalização CV, morte CV)',
      resultado_principal: 'Rosuvastatina 20 mg reduziu MACE 44% vs placebo em pacientes com LDL < 130 + PCR-as ≥ 2 mg/L (NNT = 25 em 1,9 anos)',
      doi: '10.1056/NEJMoa0807646',
    },
    {
      nome: 'ASTEROID',
      tipo: 'Estudo de imagem intracoronária (IVUS)',
      ano: 2006,
      n_pacientes: 507,
      desfecho_primario: 'Regressão de aterosclerose coronária (IVUS)',
      resultado_principal: 'Rosuvastatina 40 mg: primeira vez que estatina demonstrou regressão de aterosclerose coronária em análise IVUS',
      doi: '10.1001/jama.295.13.1556',
    },
  ],

  // ASMA ─────────────────────────────────────────────────────
  budesonida_formoterol: [
    {
      nome: 'SYGMA 1',
      tipo: 'ECR duplo-cego multicêntrico (fase 3)',
      ano: 2018,
      n_pacientes: 3849,
      desfecho_primario: 'Semanas com controle de asma bem controlada',
      resultado_principal: 'Budesonida/formoterol conforme necessidade superior a terbutalina e não inferior a budesonida diária para prevenção de exacerbações',
      doi: '10.1056/NEJMoa1715222',
    },
    {
      nome: 'SYGMA 2',
      tipo: 'ECR aberto multicêntrico (fase 3)',
      ano: 2018,
      n_pacientes: 4215,
      desfecho_primario: 'Taxa anual de exacerbações graves',
      resultado_principal: 'Budesonida/formoterol MART não inferior a budesonida+formoterol fixo para taxa de exacerbações graves (diferença 0,96; IC 95% 0,82–1,11)',
      doi: '10.1056/NEJMoa1715224',
    },
    {
      nome: 'Novel START',
      tipo: 'ECR aberto multicêntrico',
      ano: 2019,
      n_pacientes: 668,
      desfecho_primario: 'Taxa anual de exacerbações graves',
      resultado_principal: 'Budesonida/formoterol conforme necessidade reduziu exacerbações graves 64% vs salbutamol; equivalente a budesonida de manutenção',
      doi: '10.1056/NEJMoa1906801',
    },
  ],
  salbutamol_resgate: [
    {
      nome: 'Meta-análise Cochrane (SABA em asma)',
      tipo: 'Revisão sistemática com meta-análise',
      ano: 2016,
      desfecho_primario: 'Reversão de broncoespasmo agudo',
      resultado_principal: 'Salbutamol inalatório é o broncodilatador de resgate de referência em asma, com início de ação em 5 min e duração 4–6h',
    },
  ],

  // DPOC ─────────────────────────────────────────────────────
  tiotropio: [
    {
      nome: 'UPLIFT',
      tipo: 'ECR duplo-cego multicêntrico',
      ano: 2008,
      n_pacientes: 5993,
      desfecho_primario: 'Taxa de declínio de VEF1 ao longo de 4 anos',
      resultado_principal: 'Tiotrópio melhorou VEF1 pré-BD +103 mL e reduziu exacerbações 14% e hospitalizações por DPOC 14% vs placebo',
      doi: '10.1056/NEJMoa0805800',
    },
    {
      nome: 'TIOSPIR',
      tipo: 'ECR duplo-cego multicêntrico (segurança cardiovascular)',
      ano: 2013,
      n_pacientes: 17135,
      desfecho_primario: 'Mortalidade total e MACE',
      resultado_principal: 'Respimat 2,5 mcg não inferior ao HandiHaler 18 mcg para mortalidade e eventos CV — segurança cardiovascular confirmada',
      doi: '10.1056/NEJMoa1303342',
    },
  ],

  // ICC ─────────────────────────────────────────────────────
  carvedilol: [
    {
      nome: 'US Carvedilol',
      tipo: 'ECR duplo-cego multicêntrico',
      ano: 1996,
      n_pacientes: 1094,
      desfecho_primario: 'Mortalidade total',
      resultado_principal: 'Carvedilol reduziu mortalidade 65% vs placebo em IC com FEVE < 35% (interrompido precocemente por benefício)',
      doi: '10.1056/NEJM199605233342101',
    },
    {
      nome: 'COPERNICUS',
      tipo: 'ECR duplo-cego multicêntrico',
      ano: 2001,
      n_pacientes: 2289,
      desfecho_primario: 'Mortalidade total',
      resultado_principal: 'Carvedilol reduziu mortalidade 34% em IC grave (FEVE < 25%) e hospitalização por IC 20%',
      doi: '10.1056/NEJMoa010130',
    },
  ],
  furosemida: [
    {
      nome: 'DOSE',
      tipo: 'ECR multicêntrico (estratégia de dose)',
      ano: 2011,
      n_pacientes: 308,
      desfecho_primario: 'Avaliação global do paciente e creatinina sérica',
      resultado_principal: 'Dose alta (2,5× oral prévia) produziu maior alívio de congestão em 72h sem piora significativa de função renal vs dose baixa',
      doi: '10.1056/NEJMoa1005419',
    },
  ],

  // SCA ─────────────────────────────────────────────────────
  aas_sca: [
    {
      nome: 'ISIS-2',
      tipo: 'ECR duplo-cego multicêntrico (fatorial 2×2)',
      ano: 1988,
      n_pacientes: 17187,
      desfecho_primario: 'Mortalidade vascular em 5 semanas',
      resultado_principal: 'AAS 160 mg reduziu mortalidade vascular 23% no IAM agudo; em combinação com estreptoquinase, redução de 42%',
      doi: '10.1016/S0140-6736(88)90114-9',
    },
    {
      nome: 'PLATO',
      tipo: 'ECR duplo-cego multicêntrico',
      ano: 2009,
      n_pacientes: 18624,
      desfecho_primario: 'MACE (morte CV + IAM + AVC) em 12 meses',
      resultado_principal: 'Ticagrelor + AAS superior a clopidogrel + AAS: redução de MACE 16% em SCA (9,8% vs 11,7%)',
      doi: '10.1056/NEJMoa0904327',
    },
  ],

  // HIPOTIREOIDISMO ─────────────────────────────────────────
  levotiroxina: [
    {
      nome: 'TRUST',
      tipo: 'ECR duplo-cego multicêntrico',
      ano: 2017,
      n_pacientes: 737,
      desfecho_primario: 'Escores de sintomas de hipotireoidismo e fadiga',
      resultado_principal: 'Em idosos (≥ 65 anos) com hipotireoidismo subclínico (TSH 4,1–19,9), levotiroxina não melhorou sintomas vs placebo — individualização necessária',
      doi: '10.1056/NEJMoa1603825',
    },
    {
      nome: 'Meta-análise Feller et al.',
      tipo: 'Meta-análise de ECRs',
      ano: 2018,
      desfecho_primario: 'Sintomas, qualidade de vida, perfil lipídico',
      resultado_principal: 'Levotiroxina melhora consistentemente TSH, T4L, LDL-c e sintomas em hipotireoidismo clínico manifesto; benefício em subclínico é limitado a TSH > 10',
    },
  ],

  // FARINGOAMIGDALITE ───────────────────────────────────────
  amoxicilina_faringe: [
    {
      nome: 'TWITCH',
      tipo: 'ECR multicêntrico',
      ano: 2016,
      n_pacientes: 1102,
      desfecho_primario: 'Cura clínica no dia 14',
      resultado_principal: 'Amoxicilina 3 dias equivalente a 6 dias para cura clínica em faringoamigdalite (92,8% vs 93,3%) — não inferior',
    },
    {
      nome: 'Meta-análise Cochrane (antibióticos em faringite)',
      tipo: 'Revisão sistemática com meta-análise',
      ano: 2021,
      desfecho_primario: 'Sintomas, febre reumática, abscesso periamigdaliano',
      resultado_principal: 'Antibióticos reduzem duração dos sintomas em 1–2 dias, prevenção de febre reumática e complicações supurativas — penicilina/amoxicilina são 1ª linha',
    },
  ],

  // PAC ─────────────────────────────────────────────────────
  amoxicilina_pac: [
    {
      nome: 'Cochrane Review — Short vs Long Antibiotics PAC',
      tipo: 'Meta-análise de 21 ECRs',
      ano: 2018,
      desfecho_primario: 'Cura clínica e sucesso bacteriológico',
      resultado_principal: '5 dias de amoxicilina equivalentes a 10 dias para cura clínica em PAC leve-moderada ambulatorial (RR 1,00; IC 95% 0,97–1,03)',
    },
    {
      nome: 'CAPE COD',
      tipo: 'ECR duplo-cego multicêntrico',
      ano: 2023,
      n_pacientes: 800,
      desfecho_primario: 'Sucesso no dia 28',
      resultado_principal: 'Hidrocortisona adjuvante à amoxicilina reduziu necessidade de suporte respiratório/vasopressor em PAC grave (NNT ≈ 8)',
      doi: '10.1056/NEJMoa2215145',
    },
  ],
};

// ─── FALLBACKS (garantia para moléculas sem mapeamento) ──────

export function getBeneficios(medId: string): string[] {
  return BENEFICIOS[medId] ?? [
    'Controle da condição de base conforme diretriz vigente',
    'Redução de desfechos clínicos relevantes demonstrada em ECRs',
    'Perfil de segurança estabelecido em estudos de longo prazo',
  ];
}

export function getPerfilIdeal(medId: string): string[] {
  return PERFIL_IDEAL[medId] ?? [
    'Pacientes com indicação conforme diretriz vigente',
    'Ausência das contraindicações listadas',
    'Relação benefício/risco favorável para o caso específico',
  ];
}

export function getEstudosChave(medId: string): EstudoChave[] {
  return ESTUDOS_CHAVE[medId] ?? [];
}
