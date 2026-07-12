// Second Opinion Engine — apoio à decisão clínica pós-conduta
// Exibe alternativas válidas com evidência, benefícios, riscos e diretriz

export type NivelEvidencia = 'A' | 'B' | 'C';
export type GrauRecomendacao = 'I' | 'IIa' | 'IIb' | 'III';

export interface EstudoPrincipal {
  nome: string;
  ano: number;
  n?: number;
  resultado: string;
}

export interface EvidenciaConduta {
  nivel: NivelEvidencia;
  grau: GrauRecomendacao;
  estudos: EstudoPrincipal[];
}

export interface DiretrizRef {
  orgao: string;
  ano: number;
  recomendacao: string;
  grau: GrauRecomendacao;
  nivel: NivelEvidencia;
}

export interface CondutaOpcao {
  id: string;
  label: string;
  classe: string;
  moleculas: string[];
  indicacao: string;
  evidencia: EvidenciaConduta;
  beneficios: string[];
  riscos: string[];
  contraindicacoes: string[];
  diretriz: DiretrizRef;
  perfil_ideal: string;
}

export interface CondicaoClinica {
  id: string;
  label: string;
  cid10: string;
  grupo: string;
  descricao: string;
  opcoes: CondutaOpcao[];
}

export interface SegundaOpiniao {
  condicao: CondicaoClinica;
  escolhida: CondutaOpcao;
  alternativas: CondutaOpcao[];
  nota_clinica: string;
}

// ─── Base de conhecimento clínico ───────────────────────────────────────────

const CONDICOES: CondicaoClinica[] = [

  // ─── HAS ─────────────────────────────────────────────────────────────────
  {
    id: 'has',
    label: 'Hipertensão Arterial Sistêmica',
    cid10: 'I10',
    grupo: 'Cardiometabólico',
    descricao: 'HAS estágio 1-3, com ou sem comorbidades associadas',
    opcoes: [
      {
        id: 'bra',
        label: 'BRA — Bloqueador do Receptor AT1',
        classe: 'BRA',
        moleculas: ['Losartana', 'Olmesartana', 'Valsartana', 'Candesartana', 'Irbesartana'],
        indicacao: 'HAS com DM2, DRC, microalbuminúria, IC, pós-IAM, intolerância a IECA',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'LIFE', ano: 2002, n: 9193, resultado: 'Losartana −13% eventos CV vs Atenolol (p=0,021)' },
            { nome: 'ONTARGET', ano: 2008, n: 25620, resultado: 'Telmisartana não-inferior ao Ramipril em eventos CV' },
            { nome: 'RENAAL', ano: 2001, n: 1513, resultado: 'Losartana −16% desfecho renal composto em DM2 com nefropatia' },
          ],
        },
        beneficios: [
          'Nefroproteção comprovada em DRC e DM2',
          'Redução de microalbuminúria em 30–50%',
          'Proteção cardiovascular equivalente ao IECA',
          'Sem tosse — melhor tolerabilidade que IECA',
          'Redução de AVC independente de PA (Losartana)',
        ],
        riscos: [
          'Hiperpotassemia (risco aumentado com TFGe <45)',
          'Piora aguda de função renal em estenose bilateral de artéria renal',
          'Teratogênico — contraindicado gravidez (categoria D/X)',
          'Angioedema raro (cruzado com IECA em 10% dos casos)',
        ],
        contraindicacoes: ['Gravidez', 'Estenose bilateral de artéria renal', 'Hiperpotassemia grave (K+ >5,5)', 'Combinação com IECA (duplo bloqueio RAA)'],
        diretriz: { orgao: 'SBC', ano: 2020, recomendacao: 'Primeira linha em HAS com DM2, DRC ou proteinúria. Combinação preferencial com BCC ou tiazídico.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'HAS + DM2 ou DRC, tosse por IECA, população com microalbuminúria, pós-IAM com FEVE preservada',
      },
      {
        id: 'ieca',
        label: 'IECA — Inibidor da ECA',
        classe: 'IECA',
        moleculas: ['Enalapril', 'Ramipril', 'Perindopril', 'Lisinopril', 'Captopril'],
        indicacao: 'HAS com IC-FEr, DM2, pós-IAM, proteinúria, alto risco CV',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'HOPE', ano: 2000, n: 9297, resultado: 'Ramipril −22% morte CV + IAM + AVC vs Placebo (p<0,001)' },
            { nome: 'EUROPA', ano: 2003, n: 12218, resultado: 'Perindopril −20% eventos CV em DAC estável' },
            { nome: 'CONSENSUS', ano: 1987, n: 253, resultado: 'Enalapril −40% mortalidade em IC grave (NYHA IV)' },
          ],
        },
        beneficios: [
          'Maior evidência histórica em IC e pós-IAM',
          'Nefroproteção em DM1 e DM2',
          'Redução de mortalidade cardiovascular comprovada',
          'Regressão de hipertrofia ventricular esquerda',
          'Proteção renal em nefropatia diabética',
        ],
        riscos: [
          'Tosse seca em 10–15% — principal causa de descontinuação',
          'Angioedema (0,1–0,5%) — potencialmente grave',
          'Hiperpotassemia com TFGe reduzida',
          'Contraindicado na gravidez (fetotóxico)',
          'Piora renal aguda em estenose bilateral',
        ],
        contraindicacoes: ['Gravidez', 'Angioedema prévio por IECA', 'Estenose bilateral de artéria renal', 'Hiperpotassemia grave', 'Combinação com BRA (duplo bloqueio)'],
        diretriz: { orgao: 'ESC', ano: 2023, recomendacao: 'Recomendado em HAS com IC-FEr, DM, DRC e pós-IAM. Primeira escolha quando nefroproteção é o objetivo primário.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'HAS + IC-FEr, pós-IAM, DM1 com proteinúria, alto risco CV sem intolerância à tosse',
      },
      {
        id: 'bcc',
        label: 'BCC — Bloqueador de Canal de Cálcio',
        classe: 'BCC',
        moleculas: ['Anlodipino', 'Lercarnidipino', 'Felodipino', 'Nifedipino GITS'],
        indicacao: 'HAS isolada, idosos, angina, população afrodescendente, HAS sistólica isolada',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'ALLHAT', ano: 2002, n: 33357, resultado: 'Anlodipino equivalente ao Lisinopril em morte CV + IAM' },
            { nome: 'ACCOMPLISH', ano: 2008, n: 11506, resultado: 'BRA+BCC −20% vs BRA+tiazídico em eventos CV (p<0,001)' },
            { nome: 'ASCOT-BPLA', ano: 2005, n: 19257, resultado: 'Anlodipino±Perindopril −11% eventos CV vs Atenolol±Bendroflumetiazida' },
          ],
        },
        beneficios: [
          'Eficácia anti-hipertensiva superior em afrodescendentes',
          'Combinação preferencial com BRA ou IECA (ACCOMPLISH)',
          'Efeito antianginoso adicional (DHP)',
          'Meia-vida longa (Anlodipino ~42h) — adesão facilitada',
          'Sem efeito metabólico adverso em glicose ou lipídios',
        ],
        riscos: [
          'Edema maleolar dose-dependente (10–30%)',
          'Taquicardia reflexa com doses altas (DHP)',
          'Rubor facial, cefaleia e tonturas',
          'Hiperplasia gengival com Nifedipino',
          'Interação com CYP3A4 (Anlodipino — risco com estatinas)',
        ],
        contraindicacoes: ['IC descompensada (DHP)', 'BAV de 2º/3º grau sem marcapasso (não-DHP)', 'Combinação de não-DHP com Beta-bloqueador (bradicardia)'],
        diretriz: { orgao: 'SBC', ano: 2020, recomendacao: 'Primeira linha em HAS isolada, idosos, HAS sistólica isolada e angina. Combinação preferencial: BCC + BRA/IECA.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'HAS em idosos ou afrodescendentes, HAS + angina estável, HAS sistólica isolada, pacientes com diabetes sem proteinúria',
      },
      {
        id: 'tiazidia',
        label: 'Tiazídico / Tiazídico-símile',
        classe: 'Diurético Tiazídico',
        moleculas: ['Hidroclorotiazida', 'Clortalidona', 'Indapamida'],
        indicacao: 'HAS em combinação, idosos, HAS resistente, IC com retenção hídrica',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'ALLHAT', ano: 2002, n: 33357, resultado: 'Clortalidona superior ao Lisinopril na prevenção de IC (−19%)' },
            { nome: 'HYVET', ano: 2008, n: 3845, resultado: 'Indapamida −30% AVC em hipertensos ≥80 anos' },
            { nome: 'ADVANCE', ano: 2007, n: 11140, resultado: 'Perindopril+Indapamida −9% mortalidade total em DM2' },
          ],
        },
        beneficios: [
          'Custo-efetividade excelente — genérico acessível',
          'Comprovação histórica em IAM, AVC e IC',
          'Clortalidona: maior potência e duração vs HCTZ',
          'Combinação sinérgica com BRA, IECA ou BCC',
          'Redução de HAS resistente em combinação tripla',
        ],
        riscos: [
          'Hipocalemia (K+ <3,5 em 10–15%) — risco de arritmia',
          'Hiponatremia — risco em idosos',
          'Hiperglicemia e resistência insulínica (HCTZ doses altas)',
          'Hiperuricemia — pode precipitar gota',
          'Dislipidemia leve (hipertrigliceridemia)',
        ],
        contraindicacoes: ['Gota ativa ou hiperuricemia grave', 'Hipocalemia refratária', 'Hiponatremia grave', 'Insuficiência renal avançada (TFGe <30)'],
        diretriz: { orgao: 'SBC', ano: 2020, recomendacao: 'Componente essencial de esquemas combinados. Preferir Clortalidona ou Indapamida. Monitorar eletrólitos.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'HAS em combinação (2ª ou 3ª droga), HAS sistólica isolada em idosos, HAS com retenção hídrica, populações de baixa renda',
      },
      {
        id: 'arm_has',
        label: 'ARM — Antagonista do Receptor Mineralocorticoide',
        classe: 'ARM',
        moleculas: ['Espironolactona', 'Eplerenona'],
        indicacao: 'HAS resistente (4ª droga), hiperaldosteronismo primário, IC-FEr, hipocalemia',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'PATHWAY-2', ano: 2015, n: 314, resultado: 'Espironolactona superior a Bisoprolol e Doxazosina em HAS resistente (−8,7 mmHg)' },
            { nome: 'RALES', ano: 1999, n: 1663, resultado: 'Espironolactona −30% mortalidade em IC-FEr NYHA III-IV' },
            { nome: 'EMPHASIS-HF', ano: 2011, n: 2737, resultado: 'Eplerenona −37% morte CV + hospitalização em IC-FEr' },
          ],
        },
        beneficios: [
          'Droga de escolha em HAS resistente (PATHWAY-2)',
          'Correção de hipocalemia diurético-induzida',
          'Benefício adicional em IC-FEr e pós-IAM',
          'Efeito antiproteinúrico independente',
          'Eplerenona: sem efeitos antiandrogênicos',
        ],
        riscos: [
          'Hiperpotassemia — monitorar K+ e função renal',
          'Ginecomastia e disfunção erétil (Espironolactona)',
          'Irregularidade menstrual em mulheres em idade fértil',
          'Combinação perigosa com IECA/BRA (risco K+)',
        ],
        contraindicacoes: ['TFGe <30 mL/min', 'K+ >5,0 mEq/L', 'Combinação com Amilorida ou Triantereno'],
        diretriz: { orgao: 'ESC', ano: 2023, recomendacao: 'Recomendado como 4ª droga em HAS resistente após IECA/BRA + BCC + tiazídico. Monitorar K+ e creatinina em 4 semanas.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'HAS resistente (≥3 drogas), hiperaldosteronismo primário, HAS + IC-FEr concomitante, hipocalemia por tiazídico',
      },
    ],
  },

  // ─── DM2 ──────────────────────────────────────────────────────────────────
  {
    id: 'dm2',
    label: 'Diabetes Mellitus tipo 2',
    cid10: 'E11',
    grupo: 'Cardiometabólico',
    descricao: 'DM2 com ou sem DCV estabelecida, DRC ou obesidade',
    opcoes: [
      {
        id: 'metformina',
        label: 'Metformina',
        classe: 'Biguanida',
        moleculas: ['Metformina'],
        indicacao: 'DM2 como base terapêutica em todos os pacientes sem contraindicação',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'UKPDS 34', ano: 1998, n: 1704, resultado: 'Metformina −36% mortalidade por DM e −39% IAM vs dieta em obesos' },
            { nome: 'UKPDS Follow-up', ano: 2008, resultado: 'Legado metabólico: benefício mantido 10 anos após intervenção' },
          ],
        },
        beneficios: [
          'Base terapêutica universal — primeira linha global',
          'Neutro em peso ou discreta redução',
          'Sem hipoglicemia como monoterapia',
          'Custo mínimo — acessibilidade máxima',
          'Benefício cardiovascular residual a longo prazo (UKPDS legacy)',
        ],
        riscos: [
          'Distúrbios GI em 20–30% (náusea, diarreia, desconforto abdominal)',
          'Acidose lática rara mas grave (TFGe <30)',
          'Deficiência de B12 a longo prazo (monitorar anualmente)',
          'Suspender antes de contraste iodado IV (TFGe <60)',
        ],
        contraindicacoes: ['TFGe <30 mL/min', 'Acidose metabólica (incluindo CAD)', 'Insuficiência hepática grave', 'Insuficiência cardíaca descompensada'],
        diretriz: { orgao: 'ADA', ano: 2025, recomendacao: 'Primeira linha no DM2. Manter se tolerado, mesmo ao adicionar outras drogas. Suspender se TFGe <30.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'Todo DM2 sem contraindicação, como base de qualquer esquema terapêutico combinado',
      },
      {
        id: 'sglt2',
        label: 'iSGLT-2 — Inibidor do SGLT-2',
        classe: 'SGLT-2',
        moleculas: ['Empagliflozina', 'Dapagliflozina', 'Canagliflozina'],
        indicacao: 'DM2 com DCV estabelecida, IC, DRC ou alto risco CV',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'EMPA-REG OUTCOME', ano: 2015, n: 7020, resultado: 'Empagliflozina −14% MACE, −38% morte CV, −35% hospitalização por IC' },
            { nome: 'DAPA-HF', ano: 2019, n: 4744, resultado: 'Dapagliflozina −26% morte CV + piora IC (benefício também em não-diabéticos)' },
            { nome: 'CREDENCE', ano: 2019, n: 4401, resultado: 'Canagliflozina −30% desfecho renal composto em DM2 + DRC' },
            { nome: 'DAPA-CKD', ano: 2020, n: 4304, resultado: 'Dapagliflozina −44% desfecho renal composto independente de DM' },
          ],
        },
        beneficios: [
          'Redução de mortalidade cardiovascular (EMPA-REG)',
          'Proteção renal comprovada independente de controle glicêmico',
          'Redução de hospitalização por IC (−35%)',
          'Perda de peso de 2–4 kg',
          'Redução de PA sistólica 3–5 mmHg (osmótica)',
          'Benefício renal em DM e não-DM (DAPA-CKD)',
        ],
        riscos: [
          'Infecção genital fúngica (8–10%, especialmente mulheres)',
          'ITU recorrente (especialmente Canagliflozina)',
          'CAD euglicêmica — risco em jejum, cirurgia, dieta low-carb',
          'Amputação de membros inferiores (Canagliflozina — CANVAS)',
          'Fraturas ósseas (Canagliflozina)',
          'Poliúria e tontura ortostática por depleção volêmica',
        ],
        contraindicacoes: ['DM tipo 1 (risco CAD)', 'TFGe <20 (efeito glicêmico perdido, mas renal mantido >25 para Dapa)', 'Infecção genital recorrente ativa', 'Cirurgia eletiva (suspender 3–4 dias antes)'],
        diretriz: { orgao: 'ADA', ano: 2025, recomendacao: 'Indicado independente de HbA1c em DM2 com DCV estabelecida, IC ou DRC (TFGe 25–75). Manter mesmo se HbA1c atingida.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'DM2 + DCV ou IC ou DRC, DM2 com obesidade, DM2 com HAS (redução osmótica de PA)',
      },
      {
        id: 'glp1',
        label: 'AR-GLP-1 — Agonista do Receptor GLP-1',
        classe: 'GLP-1',
        moleculas: ['Liraglutida', 'Semaglutida SC', 'Dulaglutida', 'Semaglutida VO'],
        indicacao: 'DM2 com DCV estabelecida, obesidade, alto risco CV, meta de perda de peso',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'LEADER', ano: 2016, n: 9340, resultado: 'Liraglutida −13% MACE vs Placebo (p<0,001), −22% morte CV' },
            { nome: 'SUSTAIN-6', ano: 2016, n: 3297, resultado: 'Semaglutida SC −26% MACE, −39% AVC não-fatal' },
            { nome: 'REWIND', ano: 2019, n: 9901, resultado: 'Dulaglutida −12% MACE, benefício mesmo sem DCV prévia' },
            { nome: 'SELECT', ano: 2023, n: 17604, resultado: 'Semaglutida −20% MACE em obesos SEM DM (trial transformador)' },
          ],
        },
        beneficios: [
          'Maior redução de peso entre antidiabéticos (5–15% com Semaglutida)',
          'Redução de MACE e morte cardiovascular',
          'Benefício em AVC (especialmente Semaglutida)',
          'Proteção renal secundária (antiinflamatória e hemodinâmica)',
          'Redução de HbA1c de 1–2% com perfil favorável',
          'Saciedade e melhora de hábitos alimentares',
        ],
        riscos: [
          'Náusea, vômito e diarreia (20–40%, geralmente transitório)',
          'Pancreatite aguda (rara, <0,5%) — monitorar sintomas',
          'Neoplasia de tireoide (carcinoma medular — contraindicação teórica, observado em roedores)',
          'Custo alto — acesso limitado no Brasil',
          'Aplicação SC semanal ou diária (exceto Semaglutida VO)',
        ],
        contraindicacoes: ['Carcinoma medular de tireoide pessoal/familiar', 'NEM tipo 2', 'Pancreatite crônica grave ativa', 'Gastroparesia severa'],
        diretriz: { orgao: 'ADA', ano: 2025, recomendacao: 'Indicado em DM2 com DCV estabelecida ou alto risco CV. Preferido quando perda de peso é objetivo. Semaglutida: opção também em obesidade sem DM (SELECT).', grau: 'I', nivel: 'A' },
        perfil_ideal: 'DM2 + DCV + obesidade, DM2 com necessidade de perda de peso substancial, DM2 com alto risco de AVC',
      },
      {
        id: 'dpp4',
        label: 'iDPP-4 — Inibidor da DPP-4',
        classe: 'DPP-4',
        moleculas: ['Sitagliptina', 'Saxagliptina', 'Alogliptina', 'Vildagliptina', 'Linagliptina'],
        indicacao: 'DM2 com necessidade de abordagem neutra em peso, idosos frágeis, DRC (Linagliptina)',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'TECOS', ano: 2015, n: 14671, resultado: 'Sitagliptina: não-inferior ao Placebo em MACE (segurança CV confirmada)' },
            { nome: 'EXAMINE', ano: 2013, n: 5380, resultado: 'Alogliptina: não-inferior em eventos CV pós-SCA' },
          ],
        },
        beneficios: [
          'Neutra em peso — ideal para DM2 sem obesidade',
          'Sem hipoglicemia como monoterapia ou combinada com Metformina',
          'Linagliptina: excreção biliar — segura em DRC avançada sem ajuste de dose',
          'Via oral, uma vez ao dia — excelente adesão',
          'Bem tolerada em idosos e frágeis',
        ],
        riscos: [
          'Nasofaringite e ITU (discretamente aumentados)',
          'Artralgia grave incomum (alerta FDA)',
          'Saxagliptina: aumento de hospitalização por IC (SAVOR-TIMI)',
          'Pancreatite relatada (causalidade não estabelecida)',
          'Sem benefício CV adicional além do controle glicêmico',
        ],
        contraindicacoes: ['IC descompensada (Saxagliptina — evitar)', 'Histórico de pancreatite (relativo)', 'Hipersensibilidade aos componentes'],
        diretriz: { orgao: 'ADA', ano: 2025, recomendacao: 'Opção válida em DM2 sem DCV ou DRC predominante, especialmente em idosos. Preferir Linagliptina em DRC avançada. Não substitui SGLT-2 ou GLP-1 quando há DCV.', grau: 'IIa', nivel: 'B' },
        perfil_ideal: 'DM2 em idosos frágeis, DM2 sem DCV ou IC, DRC avançada (Linagliptina), DM2 com baixo risco CV e meta modesta de HbA1c',
      },
      {
        id: 'sulfonilureia',
        label: 'Sulfonilureia',
        classe: 'Sulfonilureia',
        moleculas: ['Glibenclamida', 'Glicazida MR', 'Glimepirida', 'Glipizida'],
        indicacao: 'DM2 com necessidade de redução rápida de HbA1c e sem risco de hipoglicemia',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'UKPDS 33', ano: 1998, n: 3867, resultado: 'Glibenclamida −25% complicações microvasculares vs dieta (p<0,01)' },
            { nome: 'ADVANCE', ano: 2008, n: 11140, resultado: 'Glicazida MR base do braço intensivo: −21% eventos renais' },
          ],
        },
        beneficios: [
          'Custo muito baixo — amplamente disponível no SUS',
          'Redução rápida e eficaz de HbA1c (1,5–2,5%)',
          'Comprovação de longa data em redução microvascular',
          'Glicazida MR: risco menor de hipoglicemia vs Glibenclamida',
          'Via oral, familiar, esquema simples',
        ],
        riscos: [
          'Hipoglicemia — risco real, especialmente em idosos e Glibenclamida',
          'Ganho de peso de 2–4 kg',
          'Sem benefício CV adicional demonstrado além do controle glicêmico',
          'Falência secundária ao longo prazo (exaustão de célula beta)',
          'Interações (Álcool, Fluconazol, Sulfonamidas potencializam hipoglicemia)',
        ],
        contraindicacoes: ['Idosos frágeis (risco hipoglicemia grave)', 'DRC avançada — Glibenclamida (metabólitos ativos acumulam)', 'DM tipo 1 ou LADA', 'Gravidez (exceto Glibenclamida em algumas diretrizes)'],
        diretriz: { orgao: 'SBC', ano: 2023, recomendacao: 'Opção de baixo custo quando controle glicêmico é prioritário e risco CV/renal não é dominante. Preferir Glicazida MR sobre Glibenclamida. Considerar substituição por SGLT-2/GLP-1 se DCV ou IC presentes.', grau: 'IIa', nivel: 'B' },
        perfil_ideal: 'DM2 sem DCV, sem obesidade, sem DRC, com acesso limitado a outros medicamentos, necessidade de redução rápida de glicemia',
      },
    ],
  },

  // ─── IC-FEr ───────────────────────────────────────────────────────────────
  {
    id: 'ic_fer',
    label: 'Insuficiência Cardíaca com FE Reduzida',
    cid10: 'I50',
    grupo: 'Cardiologia',
    descricao: 'IC com FEVE ≤40% — alvo: Quarteto da IC (IECA/ARNI + BB + ARM + SGLT-2)',
    opcoes: [
      {
        id: 'arni',
        label: 'ARNI — Sacubitril/Valsartana',
        classe: 'ARNI',
        moleculas: ['Sacubitril/Valsartana (Entresto)'],
        indicacao: 'IC-FEr NYHA II-III sintomática, substituindo IECA/BRA quando estabilizado',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'PARADIGM-HF', ano: 2014, n: 8442, resultado: 'Sacubitril/Valsartana −20% morte CV + hospitalização por IC vs Enalapril (p<0,001)' },
            { nome: 'PIONEER-HF', ano: 2019, n: 440, resultado: 'ARNI iniciado na hospitalização: superior ao Enalapril em redução de NT-proBNP' },
          ],
        },
        beneficios: [
          'Superior ao Enalapril em mortalidade CV e hospitalização por IC (PARADIGM-HF)',
          'Melhora de classe funcional NYHA e qualidade de vida',
          'Pode ser iniciado durante hospitalização (PIONEER-HF)',
          'Benefício maior que IECA isolado — substitui, não combina',
          'Redução de BNP/NT-proBNP marcador de resposta ao tratamento',
        ],
        riscos: [
          'Hipotensão sintomática (18%) — titulação gradual necessária',
          'Angioedema — nunca combinar com IECA (intervalo 36h mínimo)',
          'Hiperpotassemia (combinado com ARM)',
          'Piora de função renal na titulação inicial',
          'Custo elevado — acesso limitado no SUS',
        ],
        contraindicacoes: ['Combinação com IECA (intervalo <36h)', 'Angioedema prévio por IECA/ARNI', 'PAS <100 mmHg', 'TFGe <30 ou K+ >5,4', 'Gravidez'],
        diretriz: { orgao: 'ESC', ano: 2021, recomendacao: 'Recomendado em substituição ao IECA em IC-FEr NYHA II-III sintomática para reduzir mortalidade CV e hospitalização. Classe I, Nível A.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'IC-FEr estável NYHA II-III já em IECA/BRA tolerado, sem hipotensão, sem DRC grave — candidato ideal ao upgrade terapêutico',
      },
      {
        id: 'ieca_ic',
        label: 'IECA — Base terapêutica histórica da IC',
        classe: 'IECA',
        moleculas: ['Enalapril', 'Ramipril', 'Captopril', 'Lisinopril'],
        indicacao: 'IC-FEr NYHA I-IV quando ARNI não for possível ou disponível',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'CONSENSUS', ano: 1987, n: 253, resultado: 'Enalapril −40% mortalidade em IC NYHA IV vs Placebo (p<0,003)' },
            { nome: 'SOLVD', ano: 1991, n: 2569, resultado: 'Enalapril −16% mortalidade em IC-FEr moderada (p<0,004)' },
          ],
        },
        beneficios: [
          'Primeira droga com mortalidade comprovada em IC (CONSENSUS)',
          'Base estabelecida por décadas — enorme experiência clínica',
          'Custo muito baixo — universalmente acessível',
          'Redução de sintomas e melhora de classe funcional',
          'Ponto de partida antes de upgrade para ARNI',
        ],
        riscos: [
          'Tosse seca (15%) — razão frequente para troca por BRA ou ARNI',
          'Angioedema raro mas grave',
          'Hipotensão — titulação necessária',
          'Hiperpotassemia com ARM ou diurético poupador de K+',
          'Piora renal na iniciação em pacientes com hipovolemia',
        ],
        contraindicacoes: ['Angioedema prévio', 'Gravidez', 'PAS <90 mmHg', 'K+ >5,5 mEq/L', 'Estenose bilateral de artéria renal'],
        diretriz: { orgao: 'ESC', ano: 2021, recomendacao: 'Recomendado quando ARNI não estiver disponível. Titular até dose máxima tolerada. Considerar upgrade para ARNI quando estabilizado.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'IC-FEr com acesso limitado ao ARNI, pacientes em início de terapia antes de upgrade, intolerância ao ARNI',
      },
      {
        id: 'bb_ic',
        label: 'Beta-bloqueador seletivo para IC',
        classe: 'Beta-bloqueador',
        moleculas: ['Carvedilol', 'Bisoprolol', 'Metoprolol Succinato (CR)'],
        indicacao: 'IC-FEr NYHA II-IV estável em combinação com IECA/ARNI e ARM',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'COPERNICUS', ano: 2001, n: 2289, resultado: 'Carvedilol −35% mortalidade em IC grave (p<0,001)' },
            { nome: 'MERIT-HF', ano: 1999, n: 3991, resultado: 'Metoprolol CR −34% mortalidade em IC (p<0,0062)' },
            { nome: 'CIBIS-II', ano: 1999, n: 2647, resultado: 'Bisoprolol −34% mortalidade em IC NYHA III-IV (p<0,0001)' },
          ],
        },
        beneficios: [
          'Redução de mortalidade em três grandes estudos independentes',
          'Melhora de FEVE ao longo de 3–6 meses (remodelamento reverso)',
          'Controle de FC — redução de trabalho miocárdico',
          'Carvedilol: bloqueio α1 adicional — vasodilatação',
          'Prevenção de morte súbita arrítmica',
        ],
        riscos: [
          'Piora de IC nas primeiras semanas de titulação — iniciar dose mínima',
          'Bradicardia e BAV — monitorar ECG',
          'Broncoespasmo (Carvedilol, não-seletivo) — cuidado em asma',
          'Mascaramento de hipoglicemia em DM insulinodependente',
          'Letargia e disfunção erétil (dose-dependente)',
        ],
        contraindicacoes: ['IC aguda descompensada (iniciar apenas após estabilização)', 'BAV 2º/3º grau sem marcapasso', 'FC <60 bpm', 'Asma grave (Carvedilol)'],
        diretriz: { orgao: 'ESC', ano: 2021, recomendacao: 'Obrigatório em IC-FEr NYHA II-IV estável. Usar apenas Carvedilol, Bisoprolol ou Metoprolol CR — outros BB não têm eficácia comprovada em IC.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'Todo IC-FEr estável sem contraindicação — pilar indispensável do Quarteto, com ou sem FA concomitante',
      },
      {
        id: 'arm_ic',
        label: 'ARM — Antagonista do Receptor Mineralocorticoide',
        classe: 'ARM',
        moleculas: ['Espironolactona', 'Eplerenona'],
        indicacao: 'IC-FEr NYHA II-IV, pós-IAM com disfunção sistólica',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'RALES', ano: 1999, n: 1663, resultado: 'Espironolactona −30% mortalidade em IC grave (p<0,001)' },
            { nome: 'EMPHASIS-HF', ano: 2011, n: 2737, resultado: 'Eplerenona −37% morte CV + hospitalização por IC em NYHA II' },
            { nome: 'EPHESUS', ano: 2003, n: 6632, resultado: 'Eplerenona −15% mortalidade em pós-IAM com FEVE ≤40%' },
          ],
        },
        beneficios: [
          'Redução de mortalidade adicional ao IECA+BB (RALES)',
          'Eplerenona: sem ginecomastia nem disfunção erétil',
          'Redução de fibrose miocárdica — benefício antirremodelatório',
          'Melhora de NYHA e qualidade de vida',
          'Benefício comprovado mesmo em IC leve (NYHA II — EMPHASIS-HF)',
        ],
        riscos: [
          'Hiperpotassemia — risco real com IECA/ARNI+BRA simultaneamente',
          'Ginecomastia dolorosa com Espironolactona (10–15%)',
          'Piora de função renal — monitorar Cr+K+ em 1–4 semanas',
          'Interação com AINEs (retenção de K+)',
        ],
        contraindicacoes: ['K+ >5,0 mEq/L no início', 'TFGe <30 mL/min', 'Creatinina >2,5 mg/dL (homens) ou >2,0 mg/dL (mulheres)'],
        diretriz: { orgao: 'ESC', ano: 2021, recomendacao: 'Terceiro pilar do Quarteto em IC-FEr. Iniciar com K+ <5,0 e TFGe >30. Monitorar eletrólitos em 1, 4 semanas e 3 meses.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'IC-FEr já em IECA/ARNI + BB, especialmente com hipocalemia, FA concomitante ou histórico de IAM',
      },
      {
        id: 'sglt2_ic',
        label: 'iSGLT-2 — Quarto pilar do Quarteto da IC',
        classe: 'SGLT-2',
        moleculas: ['Dapagliflozina', 'Empagliflozina'],
        indicacao: 'IC-FEr NYHA II-IV, com ou sem DM2 — benefício CV direto, não glicêmico',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'DAPA-HF', ano: 2019, n: 4744, resultado: 'Dapagliflozina −26% morte CV + piora IC (benefício em DM e não-DM)' },
            { nome: 'EMPEROR-Reduced', ano: 2020, n: 3730, resultado: 'Empagliflozina −25% morte CV + hospitalização por IC' },
            { nome: 'EMPEROR-Pooled', ano: 2021, resultado: 'Metanálise: −26% hospitalização por IC, benefício renal consistente' },
          ],
        },
        beneficios: [
          'Único pilar com benefício comprovado em IC independente de DM',
          'Redução de hospitalização por IC em 25–30%',
          'Proteção renal adicional ao Quarteto',
          'Neutro em K+ — complementa ARM sem aumentar hiperpotassemia',
          'Melhora de qualidade de vida (Kansas City CM Questionnaire)',
          'Efeito hemodinâmico: redução de pré-carga (natriurese osmótica)',
        ],
        riscos: [
          'Infecção genital fúngica',
          'Hipotensão por depleção volêmica — ajustar diurético de alça',
          'CAD euglicêmica em DM tipo 1 (não usar)',
          'Suspender antes de cirurgia (3–4 dias)',
        ],
        contraindicacoes: ['DM tipo 1', 'TFGe <20 mL/min (para benefício glicêmico; renal mantido >20 para Dapa)', 'CAD ativa'],
        diretriz: { orgao: 'ESC', ano: 2021, recomendacao: 'Quarto pilar do Quarteto da IC-FEr. Recomendado em todo IC-FEr NYHA II-IV independente de DM2. Iniciar precocemente, mesmo em hospitalização.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'Todo IC-FEr — pilar universal do Quarteto, especialmente em IC + DRC ou IC + DM2',
      },
    ],
  },

  // ─── Dislipidemia + DCV ───────────────────────────────────────────────────
  {
    id: 'dislipidemia',
    label: 'Dislipidemia e Redução de Risco CV',
    cid10: 'E78',
    grupo: 'Cardiometabólico',
    descricao: 'Dislipidemia aterogênica em pacientes de alto e muito alto risco CV',
    opcoes: [
      {
        id: 'estatina_alta',
        label: 'Estatina de Alta Intensidade',
        classe: 'Estatina',
        moleculas: ['Rosuvastatina 20–40 mg', 'Atorvastatina 40–80 mg'],
        indicacao: 'Primeira linha em alto e muito alto risco CV — alvo LDL <70 mg/dL (alto) ou <55 mg/dL (muito alto)',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'JUPITER', ano: 2008, n: 17802, resultado: 'Rosuvastatina −44% MACE vs Placebo em PCR-us elevada sem DCV' },
            { nome: 'TNT', ano: 2005, n: 10001, resultado: 'Atorvastatina 80mg −22% vs 10mg em eventos CV em DAC estável' },
            { nome: 'PROVE-IT', ano: 2004, n: 4162, resultado: 'Atorvastatina 80mg −16% eventos vs Pravastatina 40mg pós-SCA' },
          ],
        },
        beneficios: [
          'Redução de LDL de 40–60% (Rosuvastatina >Atorvastatina)',
          'Pleiotropia: estabilização de placa, efeito anti-inflamatório',
          'Benefício CV independente do nível basal de LDL',
          'Genéricos acessíveis (Atorvastatina e Rosuvastatina)',
          'Dose única noturna — excelente adesão',
        ],
        riscos: [
          'Miopatia e rabdomiólise (raro, <0,01%) — risco com Fibratos+Estatina',
          'Mialgia sem CK elevada (5–10% — síndrome musculoesquelética)',
          'Aumento de transaminases (1–3%) — monitorar TGP',
          'Leve aumento de risco de DM2 (redução de sensibilidade insulínica)',
          'Interações: CYP3A4 (Atorvastatina) — Amiodarona, Verapamil, Cetoconazol',
        ],
        contraindicacoes: ['Miopatia ou rabdomiólise prévia por estatina', 'Hepatopatia ativa (TGP >3× LSN)', 'Gravidez', 'Amamentação'],
        diretriz: { orgao: 'ESC/EAS', ano: 2019, recomendacao: 'Primeira linha em todo paciente de alto e muito alto risco CV. Alvo LDL: <70 mg/dL (alto risco) ou <55 mg/dL (muito alto risco). Dose máxima tolerada.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'Todo paciente de alto/muito alto risco CV como base — DCV estabelecida, DM com órgão-alvo, DRC moderada-grave, LDL ≥190 mg/dL',
      },
      {
        id: 'estatina_ezetimiba',
        label: 'Estatina + Ezetimiba',
        classe: 'Estatina + Inibidor de Absorção',
        moleculas: ['Rosuvastatina + Ezetimiba', 'Atorvastatina + Ezetimiba'],
        indicacao: 'LDL não atingido com estatina máxima tolerada em alto/muito alto risco CV',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'IMPROVE-IT', ano: 2015, n: 18144, resultado: 'Ezetimiba+Sinvastatina −6% MACE vs Sinvastatina isolada em pós-SCA (p=0,016)' },
          ],
        },
        beneficios: [
          'Redução adicional de LDL de 15–25% sobre estatina isolada',
          'Mecanismo complementar (redução de absorção intestinal)',
          'Ezetimiba: excelente tolerabilidade — sem metabolismo CYP significativo',
          'Combinação fixa disponível (reduz comprimidos)',
          'Custo razoável — genérico de Ezetimiba acessível',
        ],
        riscos: [
          'Mialgia (pequeno aumento vs estatina isolada)',
          'Hepatotoxicidade rara',
          'Sem benefício CV independente de estatina (terapia complementar)',
          'Absorção reduzida com Colestiramina',
        ],
        contraindicacoes: ['Hepatopatia ativa', 'Gravidez', 'Hipersensibilidade à Ezetimiba'],
        diretriz: { orgao: 'ESC/EAS', ano: 2019, recomendacao: 'Segunda linha quando LDL alvo não atingido com dose máxima de estatina tolerada. Combinação com iPCSK9 se LDL ainda acima da meta.', grau: 'I', nivel: 'B' },
        perfil_ideal: 'DCV estabelecida ou muito alto risco com LDL >55 mg/dL em estatina máxima tolerada',
      },
      {
        id: 'ipcsk9',
        label: 'iPCSK9 — Inibidor de PCSK9',
        classe: 'iPCSK9',
        moleculas: ['Evolocumabe', 'Alirocumabe'],
        indicacao: 'LDL refratário a estatina+Ezetimiba em muito alto risco CV ou hipercolesterolemia familial',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'FOURIER', ano: 2017, n: 27564, resultado: 'Evolocumabe −59% LDL, −15% MACE vs Placebo+Estatina (p<0,001)' },
            { nome: 'ODYSSEY OUTCOMES', ano: 2018, n: 18924, resultado: 'Alirocumabe −48% LDL, −15% MACE em pós-SCA (p<0,001)' },
          ],
        },
        beneficios: [
          'Redução de LDL de 50–65% adicional — mais potente disponível',
          'Redução de MACE comprovada sobre estatina máxima',
          'Aplicação SC a cada 2–4 semanas — alta comodidade',
          'Segurança cardiovascular e hepática excelente',
          'Benefício em hipercolesterolemia familial heterozigótica',
        ],
        riscos: [
          'Custo muito elevado — principal limitação no Brasil',
          'Reação no local de injeção (5%)',
          'Neurocognição: sinal de alerta investigado — FDA sem restrição',
          'Necessita prescrição especializada e justificativa para cobertura',
        ],
        contraindicacoes: ['Hipersensibilidade ao produto biológico', 'Gravidez (dados insuficientes)'],
        diretriz: { orgao: 'ESC/EAS', ano: 2019, recomendacao: 'Terceira linha em muito alto risco CV com LDL >55 mg/dL apesar de estatina máxima + Ezetimiba. Ou segunda linha em HF com LDL >100 mg/dL.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'DCV estabelecida com LDL refratário, HF heterozigótica, pós-SCA de alto risco, intolerância total a estatinas',
      },
    ],
  },

  // ─── FA ───────────────────────────────────────────────────────────────────
  {
    id: 'fa',
    label: 'Fibrilação Atrial',
    cid10: 'I48',
    grupo: 'Cardiologia',
    descricao: 'FA paroxística, persistente ou permanente — anticoagulação e controle de FC/ritmo',
    opcoes: [
      {
        id: 'doac',
        label: 'DOAC — Anticoagulante Oral Direto',
        classe: 'Anticoagulante (DOAC)',
        moleculas: ['Apixabana', 'Rivaroxabana', 'Dabigatrana', 'Edoxabana'],
        indicacao: 'FA não-valvar com CHA₂DS₂-VASc ≥2 (homens) ou ≥3 (mulheres)',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'ARISTOTLE', ano: 2011, n: 18201, resultado: 'Apixabana −21% AVC+embolia, −31% AVC hemorrágico, −11% mortalidade vs Varfarina' },
            { nome: 'ROCKET-AF', ano: 2011, n: 14264, resultado: 'Rivaroxabana não-inferior à Varfarina, −41% hemorragia intracraniana' },
            { nome: 'RE-LY', ano: 2009, n: 18113, resultado: 'Dabigatrana 150mg −35% AVC isquêmico vs Varfarina' },
          ],
        },
        beneficios: [
          'Superiores ou não-inferiores à Varfarina sem monitorização de INR',
          'Menor risco de hemorragia intracraniana (−50%) vs Varfarina',
          'Início de ação rápido — sem sobreposição com Heparina',
          'Interações alimentares e medicamentosas muito menores',
          'Reversores disponíveis (Andexanet-α para Fator Xa; Idarucizumabe para Dabigatrana)',
        ],
        riscos: [
          'Custo elevado — acesso limitado sem cobertura',
          'Não usar em FA valvar (estenose mitral moderada-grave ou prótese mecânica)',
          'Ajuste de dose obrigatório em DRC (especialmente Dabigatrana)',
          'Hemorragia GI maior com Dabigatrana e Rivaroxabana vs Varfarina',
          'Sem antídoto universal — Andexanet-α disponível apenas para Fator Xa',
        ],
        contraindicacoes: ['FA valvar (estenose mitral reumática ou prótese mecânica)', 'TFGe <15 mL/min (Dabigatrana contraindicada <30)', 'Hemorragia ativa grave', 'Gravidez'],
        diretriz: { orgao: 'ESC', ano: 2020, recomendacao: 'Preferidos sobre Varfarina em FA não-valvar com indicação de anticoagulação. Apixabana: melhor perfil de segurança. Ajustar dose conforme função renal.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'FA não-valvar com CHA₂DS₂-VASc ≥2, pacientes com INR lábil em Varfarina, sem DRC grave',
      },
      {
        id: 'varfarina',
        label: 'Varfarina (AVK)',
        classe: 'Anticoagulante (AVK)',
        moleculas: ['Varfarina'],
        indicacao: 'FA com prótese valvar mecânica, estenose mitral moderada-grave, ou sem acesso a DOAC',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'AFASAK', ano: 1989, resultado: 'Varfarina −64% AVC em FA vs Placebo (primeiro grande estudo)' },
            { nome: 'SPAF', ano: 1991, n: 1330, resultado: 'Varfarina −67% AVC em FA não-reumática vs Placebo' },
          ],
        },
        beneficios: [
          'Única opção em FA valvar com prótese mecânica',
          'Custo baixíssimo — disponível no SUS',
          'Experiência clínica de décadas',
          'Monitorização por INR permite verificar adesão',
          'Reversão com Vitamina K e PFC disponíveis universalmente',
        ],
        riscos: [
          'Janela terapêutica estreita — INR alvo 2,0–3,0',
          'Múltiplas interações medicamentosas e alimentares',
          'Hemorragia intracraniana mais frequente que DOAC',
          'Monitorização frequente de INR necessária',
          'Necrose cutânea por Varfarina (raro, deficiência de Proteína C)',
        ],
        contraindicacoes: ['FA não-valvar com acesso a DOAC (DOAC superior)', 'Gravidez (teratogênico no 1º trimestre)', 'Hemorragia ativa', 'Hipersensibilidade à Varfarina'],
        diretriz: { orgao: 'ESC', ano: 2020, recomendacao: 'Ainda indicada em FA valvar (prótese mecânica, estenose mitral grave). Em FA não-valvar, preferir DOAC quando disponível.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'FA com prótese valvar mecânica, estenose mitral reumática moderada-grave, impossibilidade de acesso a DOAC',
      },
      {
        id: 'controle_fc_bb',
        label: 'Controle de FC — Beta-bloqueador',
        classe: 'Beta-bloqueador',
        moleculas: ['Bisoprolol', 'Carvedilol', 'Metoprolol'],
        indicacao: 'FA com resposta ventricular elevada — alvo FC <80–110 bpm em repouso',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'AFFIRM', ano: 2002, n: 4060, resultado: 'Controle de FC não-inferior ao controle de ritmo em mortalidade total em FA' },
            { nome: 'RACE', ano: 2002, n: 522, resultado: 'Controle de FC equivalente ao controle de ritmo em eventos CV combinados' },
          ],
        },
        beneficios: [
          'Controle eficaz de FC em repouso e exercício',
          'Benefício adicional em IC-FEr concomitante',
          'Redução de sintomas palpitações e dispneia',
          'Custo baixo — amplamente disponível',
          'Não pró-arrítmico — seguro em IC estrutural',
        ],
        riscos: [
          'Bradicardia e BAV — monitorar ECG',
          'Broncoespasmo em asmáticos (menos com BB seletivos)',
          'Piora de IC na fase aguda de descompensação',
          'Fadiga e intolerância ao exercício',
          'Mascaramento de hipoglicemia em DM1',
        ],
        contraindicacoes: ['BAV 2º/3º grau sem marcapasso', 'Síndrome do nó sinusal', 'Asma grave', 'IC descompensada aguda'],
        diretriz: { orgao: 'ESC', ano: 2020, recomendacao: 'Primeira linha para controle de FC em FA. Alvo: FC <80 bpm em repouso (estratégia leniente aceita: FC <110 bpm).', grau: 'I', nivel: 'A' },
        perfil_ideal: 'FA + IC-FEr, FA com hipertireoidismo, FA em pós-operatório cardíaco, FA com hipertensão associada',
      },
    ],
  },

  // ─── DRC + HAS + DM2 ─────────────────────────────────────────────────────
  {
    id: 'drc_has_dm2',
    label: 'DRC + HAS + DM2 — Nefroproteção',
    cid10: 'N18',
    grupo: 'Nefrologia',
    descricao: 'Doença Renal Crônica com HAS e/ou DM2 — foco em retardar progressão renal',
    opcoes: [
      {
        id: 'bra_drc',
        label: 'BRA — Nefroproteção de primeira linha',
        classe: 'BRA',
        moleculas: ['Losartana', 'Irbesartana', 'Candesartana', 'Olmesartana'],
        indicacao: 'DRC + DM2 com proteinúria ≥300 mg/g ou DRC + HAS com albuminúria',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'RENAAL', ano: 2001, n: 1513, resultado: 'Losartana −16% desfecho renal composto, −35% duplicação de creatinina' },
            { nome: 'IDNT', ano: 2001, n: 1715, resultado: 'Irbesartana −33% desfecho renal composto vs Anlodipino (p<0,001)' },
          ],
        },
        beneficios: [
          'Redução de proteinúria de 30–40% (mecanismo hemodinâmico)',
          'Retardo comprovado de progressão para DRCT',
          'Combinação sinérgica com SGLT-2 para nefroproteção',
          'Sem tosse (vantagem vs IECA em adesão a longo prazo)',
          'Redução de PA e proteção CV concomitantes',
        ],
        riscos: [
          'Hiperpotassemia — monitorar K+ mensalmente no início',
          'Elevação de creatinina de até 30% aceitável no início',
          'Piora aguda de função renal em hipovolemia ou estenose bilateral',
          'Contraindicado na gravidez',
        ],
        contraindicacoes: ['TFGe <15 (considerar suspensão antes de diálise)', 'K+ >5,5 mEq/L', 'Estenose bilateral de artéria renal', 'Gravidez'],
        diretriz: { orgao: 'KDIGO', ano: 2022, recomendacao: 'Primeira linha em DRC + DM2 com TFGe 25–60 + albuminúria >300 mg/g. Manter mesmo com elevação de creatinina ≤30%.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'DRC estágio G3a-G4 + DM2 com macroalbuminúria, DRC + HAS sem DM com proteinúria significativa',
      },
      {
        id: 'sglt2_drc',
        label: 'iSGLT-2 — Nefroproteção independente de DM',
        classe: 'SGLT-2',
        moleculas: ['Dapagliflozina', 'Empagliflozina'],
        indicacao: 'DRC + DM2 ou DRC isolada com TFGe 25–75 + albuminúria — proteção renal direta',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'DAPA-CKD', ano: 2020, n: 4304, resultado: 'Dapagliflozina −44% desfecho renal composto em DM e não-DM com DRC' },
            { nome: 'CREDENCE', ano: 2019, n: 4401, resultado: 'Canagliflozina −30% desfecho renal composto em DM2 + DRC' },
            { nome: 'EMPA-KIDNEY', ano: 2023, n: 6609, resultado: 'Empagliflozina −28% progressão renal ou morte renal em DRC com/sem DM' },
          ],
        },
        beneficios: [
          'Benefício renal INDEPENDENTE de controle glicêmico (DAPA-CKD em não-DM)',
          'Redução de proteinúria adicional ao BRA',
          'Redução de hospitalização por IC concomitante',
          'Mecanismo tubuloglomerular: redução de hiperfiltração glomerular',
          'Combinação BRA + SGLT-2 = máxima nefroproteção disponível',
        ],
        riscos: [
          'Infecção genital fúngica',
          'Redução de TFGe aguda inicial (esperada e reversível — efeito hemodinâmico)',
          'Poliúria e hipotensão — ajustar diurético de alça concomitante',
          'CAD euglicêmica em DM tipo 1',
          'Efeito glicêmico perde-se com TFGe <25 (Dapa) ou <30 (Empa)',
        ],
        contraindicacoes: ['TFGe <20 mL/min (Dapa pode ser mantida até 25 para efeito renal)', 'DM tipo 1', 'CAD ativa'],
        diretriz: { orgao: 'KDIGO', ano: 2022, recomendacao: 'Recomendado em todo DRC + DM2 com TFGe ≥25 independente de HbA1c. Em DRC sem DM, também recomendado com albuminúria >200 mg/g (Dapagliflozina).', grau: 'I', nivel: 'A' },
        perfil_ideal: 'DRC G3a-G4 + DM2, DRC com albuminúria + IC concomitante, DRC sem DM com TFGe 25–60 + albuminúria elevada',
      },
      {
        id: 'finerenona',
        label: 'Finerenona — ARM seletivo não-esteroidal',
        classe: 'ARM não-esteroidal',
        moleculas: ['Finerenona'],
        indicacao: 'DRC + DM2 com albuminúria persistente apesar de BRA máximo tolerado',
        evidencia: {
          nivel: 'A',
          grau: 'I',
          estudos: [
            { nome: 'FIDELIO-DKD', ano: 2020, n: 5674, resultado: 'Finerenona −18% desfecho renal composto vs Placebo (p<0,001) em DRC+DM2' },
            { nome: 'FIGARO-DKD', ano: 2021, n: 7352, resultado: 'Finerenona −13% desfecho CV composto em DRC+DM2 com DCV ou alto risco' },
          ],
        },
        beneficios: [
          'Redução de albuminúria de 30% adicional ao BRA',
          'Sem ginecomastia — seletividade alta para receptor mineralocorticoide',
          'Menor risco de hiperpotassemia que Espironolactona/Eplerenona',
          'Benefício CV e renal simultâneos (FIDELITY — análise combinada)',
          'Mecanismo anti-inflamatório e antifibrótico distinto do BRA',
        ],
        riscos: [
          'Hiperpotassemia — monitorar K+ em 4 semanas após início',
          'Custo elevado — acesso limitado no Brasil',
          'Não usar combinado com ARM esteroidal (Espironolactona/Eplerenona)',
          'Dados limitados em TFGe <25',
        ],
        contraindicacoes: ['K+ >5,0 mEq/L', 'TFGe <25 mL/min', 'ARM esteroidal concomitante', 'Insuficiência adrenal'],
        diretriz: { orgao: 'KDIGO', ano: 2022, recomendacao: 'Recomendado em DRC + DM2 com albuminúria ≥300 mg/g apesar de BRA máximo e SGLT-2. Benefício adicional ao Quarteto renal.', grau: 'I', nivel: 'A' },
        perfil_ideal: 'DRC + DM2 com albuminúria persistente em BRA + SGLT-2 — terceiro pilar da nefroproteção',
      },
      {
        id: 'glp1_drc',
        label: 'AR-GLP-1 — Proteção renal e CV em DM2+DRC',
        classe: 'GLP-1',
        moleculas: ['Semaglutida SC', 'Liraglutida', 'Dulaglutida'],
        indicacao: 'DM2 + DRC com DCV estabelecida ou alto risco CV + necessidade de controle de HbA1c e peso',
        evidencia: {
          nivel: 'A',
          grau: 'IIa',
          estudos: [
            { nome: 'FLOW', ano: 2024, n: 3533, resultado: 'Semaglutida SC −24% desfecho renal composto em DM2+DRC (primeiro trial renal GLP-1)' },
            { nome: 'LEADER', ano: 2016, n: 9340, resultado: 'Liraglutida −26% eventos renais compostos (secundário)' },
          ],
        },
        beneficios: [
          'FLOW (2024): primeiro AR-GLP-1 com benefício renal primário comprovado',
          'Benefício cardiovascular adicional (MACE)',
          'Redução de peso relevante — HbA1c e PA melhoras',
          'Sem ajuste de dose em DRC (Semaglutida SC, Dulaglutida)',
          'Combinação segura com BRA + SGLT-2',
        ],
        riscos: [
          'Náusea e vômito — comum no início, limitar titulação',
          'Custo elevado',
          'Pancreatite rara',
          'Carcinoma medular de tireoide (contraindicação teórica)',
        ],
        contraindicacoes: ['NEM tipo 2', 'Carcinoma medular de tireoide', 'Gastroparesia grave', 'DRC estágio G5 (dados insuficientes)'],
        diretriz: { orgao: 'ADA', ano: 2025, recomendacao: 'Indicado em DM2 + DRC com DCV ou alto risco CV. Adicionar ao BRA + SGLT-2 quando benefício CV é prioridade. FLOW 2024: evidência renal direta.', grau: 'IIa', nivel: 'A' },
        perfil_ideal: 'DM2 + DRC + DCV estabelecida com necessidade de controle glicêmico e peso, complementando BRA e SGLT-2',
      },
    ],
  },
];

// ─── Engine ──────────────────────────────────────────────────────────────────

export function listarCondicoes(): CondicaoClinica[] {
  return CONDICOES;
}

export function buscarCondicao(id: string): CondicaoClinica | undefined {
  return CONDICOES.find(c => c.id === id);
}

export function gerarSegundaOpiniao(
  condicaoId: string,
  condutaEscolhidaId: string,
): SegundaOpiniao | null {
  const condicao = buscarCondicao(condicaoId);
  if (!condicao) return null;

  const escolhida = condicao.opcoes.find(o => o.id === condutaEscolhidaId);
  if (!escolhida) return null;

  const alternativas = condicao.opcoes.filter(o => o.id !== condutaEscolhidaId);

  const nota_clinica = gerarNotaClinica(condicao, escolhida, alternativas);

  return { condicao, escolhida, alternativas, nota_clinica };
}

function gerarNotaClinica(
  condicao: CondicaoClinica,
  escolhida: CondutaOpcao,
  alternativas: CondutaOpcao[],
): string {
  const totalOpcoes = alternativas.length;
  const altNivelA = alternativas.filter(a => a.evidencia.nivel === 'A').length;

  if (altNivelA === 0) {
    return `Conduta selecionada (${escolhida.label}) é a opção com maior nível de evidência disponível para ${condicao.label}.`;
  }

  return `Existem ${totalOpcoes} alternativa(s) válida(s), sendo ${altNivelA} com Nível de Evidência A. A escolha entre as opções deve considerar o perfil individual do paciente, comorbidades, custo e disponibilidade. Todas as alternativas listadas têm respaldo em diretrizes nacionais e internacionais vigentes.`;
}

export const NIVEL_COR: Record<NivelEvidencia, string> = {
  A: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  C: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

export const GRAU_COR: Record<GrauRecomendacao, string> = {
  I:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  IIa: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  IIb: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  III: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

// ─── Bridge to Medical Copilot Second Opinion ────────────────
// medical-copilot.ts also exposes a second-opinion function that operates on
// ContextoClinico (unstructured context) while this module operates on
// structured CondicaoClinica/CondutaOpcao evidence trees.
// Re-exported here so a single import covers both use cases.
export {
  gerarSegundaOpiniao as gerarSegundaOpinaoCopilot,
  type SegundaOpiniao as SegundaOpinaoCopilot,
  type ContextoClinico,
} from './medical-copilot';
