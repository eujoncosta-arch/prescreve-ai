// ============================================================
// PRESCREVE-AI — Guideline Update Center
// Atualizações científicas 2025–2026 com impacto clínico
// ============================================================

export type ImpactoClinico = 'baixo' | 'moderado' | 'alto' | 'pratica_mudada';
export type NivelEvidencia = 'A' | 'B' | 'C';
export type GrauRecomendacao = 'I' | 'IIa' | 'IIb' | 'III';
export type AreaEspecialidade =
  | 'cardiologia'
  | 'endocrinologia'
  | 'nefrologia'
  | 'pneumologia'
  | 'psiquiatria'
  | 'infectologia'
  | 'reumatologia';

// ─── Tipos ───────────────────────────────────────────────────

export interface EvidenciaUpdate {
  estudo: string;
  tipo: 'ecr' | 'meta_analise' | 'revisao_sistematica' | 'observacional' | 'consenso';
  n_pacientes?: number;
  ano: number;
  revista?: string;
  doi?: string;
  nivel: NivelEvidencia;
  grau: GrauRecomendacao;
  desfecho: string;
  resultado: string;
}

export interface MudancaRecomendacao {
  id: string;
  topico: string;
  anterior: string | null;        // null = recomendação nova
  novo: string;
  impacto: ImpactoClinico;
  justificativa: string;
  populacao_alvo: string;
  acao_clinica: string;           // O que o médico precisa fazer
  evidencias: EvidenciaUpdate[];
  tags: string[];
}

export interface GuidelineUpdate {
  id: string;
  sigla: string;                  // 'ESC 2025'
  titulo: string;
  sociedade: string;
  area: AreaEspecialidade;
  versao_anterior?: string;
  versao_nova: string;
  data_publicacao: string;
  data_insercao: string;          // quando entrou no sistema
  resumo_executivo: string;
  link_oficial?: string;
  mudancas: MudancaRecomendacao[];
  tags: string[];
  destaque: boolean;              // exibir como featured
}

// ─── Dados ───────────────────────────────────────────────────

export const GUIDELINE_UPDATES: GuidelineUpdate[] = [

  // ════════════════════════════════════════════════════
  // ESC 2025 — Insuficiência Cardíaca
  // ════════════════════════════════════════════════════
  {
    id: 'esc-hf-2025',
    sigla: 'ESC 2025',
    titulo: 'ESC Guidelines for Heart Failure 2025',
    sociedade: 'European Society of Cardiology (ESC)',
    area: 'cardiologia',
    versao_anterior: '2021',
    versao_nova: '2025',
    data_publicacao: '2025-04-01',
    data_insercao: '2025-04-10',
    resumo_executivo: 'A atualização de 2025 consolida o quarteto terapêutico na ICFEr e expande SGLT-2 para ICFEp. Destaque para nova classificação fenotípica, uso de biomarcadores (NT-proBNP) na titulação e introdução do vericiguat em pacientes hospitalizados. Telemonitoramento integrado ao algoritmo de seguimento.',
    destaque: true,
    tags: ['IC', 'ICC', 'ICFEr', 'ICFEp', 'SGLT-2', 'quarteto', 'BNP'],
    mudancas: [
      {
        id: 'esc25-1',
        topico: 'SGLT-2 na ICFEp (FEVE ≥ 50%)',
        anterior: 'IIb — Pode ser considerado',
        novo: 'Classe I — Recomendado para reduzir hospitalização por IC',
        impacto: 'pratica_mudada',
        justificativa: 'EMPEROR-Preserved (2021) e DELIVER (2022) demonstraram redução consistente de hospitalização por IC independente de FEVE e presença de DM2.',
        populacao_alvo: 'Pacientes com ICFEp (FEVE ≥ 50%) sintomáticos (NYHA II–III)',
        acao_clinica: 'Iniciar empagliflozina 10 mg/dia ou dapagliflozina 10 mg/dia em todos os pacientes com ICFEp sintomática, independente de DM2',
        evidencias: [
          {
            estudo: 'EMPEROR-Preserved',
            tipo: 'ecr',
            n_pacientes: 5988,
            ano: 2021,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa2107522',
            nivel: 'A',
            grau: 'I',
            desfecho: 'Morte CV + hospitalização por IC',
            resultado: 'Redução de 21% no desfecho primário (HR 0,79; IC 0,69–0,90)',
          },
          {
            estudo: 'DELIVER',
            tipo: 'ecr',
            n_pacientes: 6263,
            ano: 2022,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa2205197',
            nivel: 'A',
            grau: 'I',
            desfecho: 'Morte CV + hospitalização por IC',
            resultado: 'Redução de 18% no desfecho primário com dapagliflozina (HR 0,82; p<0,001)',
          },
        ],
        tags: ['ICFEp', 'SGLT-2', 'empagliflozina', 'dapagliflozina'],
      },
      {
        id: 'esc25-2',
        topico: 'Vericiguat em IC descompensada',
        anterior: null,
        novo: 'IIb — Pode ser considerado em ICFEr após hospitalização para reduzir re-hospitalização',
        impacto: 'moderado',
        justificativa: 'VICTORIA trial: vericiguat (estimulador da guanilato ciclase solúvel) reduziu morte CV + hospitalização por IC em pacientes de alto risco pós-descompensação.',
        populacao_alvo: 'ICFEr (FEVE < 45%) com hospitalização recente por IC (< 3 meses), em uso de doses-alvo do quarteto',
        acao_clinica: 'Considerar vericiguat 10 mg/dia como 5º agente em pacientes pós-hospitalização de alto risco refratários ao quarteto',
        evidencias: [
          {
            estudo: 'VICTORIA',
            tipo: 'ecr',
            n_pacientes: 5050,
            ano: 2020,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa1915928',
            nivel: 'A',
            grau: 'IIb',
            desfecho: 'Morte CV + primeira hospitalização por IC',
            resultado: 'Redução de 10% no desfecho primário (HR 0,90; p=0,02) — NNT 24',
          },
        ],
        tags: ['vericiguat', 'ICFEr', 'hospitalização', 'pós-descompensação'],
      },
      {
        id: 'esc25-3',
        topico: 'Telemonitoramento na IC',
        anterior: 'IIb — Pode ser considerado',
        novo: 'IIa — Deve ser considerado para reduzir hospitalização em IC',
        impacto: 'moderado',
        justificativa: 'Meta-análise de sensores implantáveis (CardioMEMS) e monitoramento não-invasivo demonstrou redução de 38% em hospitalizações por IC em 12 meses.',
        populacao_alvo: 'Pacientes com IC NYHA III com ≥ 1 hospitalização por IC no último ano',
        acao_clinica: 'Encaminhar para programa de IC com telemonitoramento estruturado; considerar sensor de pressão pulmonar (CardioMEMS) em casos selecionados',
        evidencias: [
          {
            estudo: 'GUIDE-HF',
            tipo: 'ecr',
            n_pacientes: 1000,
            ano: 2021,
            revista: 'Lancet',
            doi: '10.1016/S0140-6736(21)01822-1',
            nivel: 'B',
            grau: 'IIa',
            desfecho: 'Hospitalização por IC em 12 meses',
            resultado: 'Redução de 12% em hospitalizações no período pré-pandemia (análise pré-especificada)',
          },
        ],
        tags: ['telemonitoramento', 'IC', 'CardioMEMS', 'seguimento'],
      },
    ],
  },

  // ════════════════════════════════════════════════════
  // ADA 2026 — Standards of Medical Care in Diabetes
  // ════════════════════════════════════════════════════
  {
    id: 'ada-2026',
    sigla: 'ADA 2026',
    titulo: 'Standards of Medical Care in Diabetes 2026',
    sociedade: 'American Diabetes Association (ADA)',
    area: 'endocrinologia',
    versao_anterior: '2025',
    versao_nova: '2026',
    data_publicacao: '2026-01-01',
    data_insercao: '2026-01-10',
    resumo_executivo: 'O ADA 2026 consolida GLP-1 RA como terapia de primeira linha em DM2 com obesidade (IMC ≥ 30) independente do controle glicêmico. Tirzepatida aprovada para DM2 + redução de eventos CV. Metas de HbA1c mais individualizadas por fenótipo. Monitorização contínua de glicose (MCG) recomendada para todos os pacientes com DM2 em insulina.',
    destaque: true,
    tags: ['DM2', 'GLP-1', 'tirzepatida', 'MCG', 'HbA1c', 'obesidade'],
    mudancas: [
      {
        id: 'ada26-1',
        topico: 'GLP-1 RA como 1ª linha em DM2 + obesidade',
        anterior: 'GLP-1 considerado se HbA1c fora de meta ou após metformina',
        novo: 'Classe I — GLP-1 RA como terapia de primeira linha em DM2 com IMC ≥ 30 independente da HbA1c',
        impacto: 'pratica_mudada',
        justificativa: 'SELECT trial: semaglutida 2,4 mg reduziu eventos CV em 20% em pacientes com obesidade + DCV, sem exigência de DM2. SURMOUNT-4 confirmou manutenção do peso e benefício CV.',
        populacao_alvo: 'DM2 com IMC ≥ 30 (ou ≥ 27 com comorbidade CV) independente da HbA1c de entrada',
        acao_clinica: 'Iniciar semaglutida SC (0,25 mg/semana, titular até 1 mg ou 2 mg conforme tolerância) ou tirzepatida (2,5 mg/semana, titular) como primeira escolha farmacológica. Metformina permanece como adjuvante',
        evidencias: [
          {
            estudo: 'SELECT',
            tipo: 'ecr',
            n_pacientes: 17604,
            ano: 2023,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa2307563',
            nivel: 'A',
            grau: 'I',
            desfecho: 'MACE (morte CV + IAM + AVC)',
            resultado: 'Redução de 20% em MACE com semaglutida vs. placebo (HR 0,80; IC 0,72–0,90; p<0,001)',
          },
          {
            estudo: 'SURMOUNT-MMO',
            tipo: 'ecr',
            n_pacientes: 13751,
            ano: 2024,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa2410819',
            nivel: 'A',
            grau: 'I',
            desfecho: 'MACE em DM2 + obesidade',
            resultado: 'Tirzepatida reduziu MACE em 15% (HR 0,85; p=0,01) e peso em 15,7% em DM2',
          },
        ],
        tags: ['GLP-1', 'semaglutida', 'tirzepatida', 'obesidade', 'DM2', 'MACE'],
      },
      {
        id: 'ada26-2',
        topico: 'Monitorização Contínua de Glicose (MCG) em DM2 em insulina',
        anterior: 'Considerar MCG em DM1; opcional em DM2 em insulinoterapia',
        novo: 'Classe I — MCG recomendada para todos DM2 em insulinoterapia (basal ou intensiva)',
        impacto: 'alto',
        justificativa: 'Meta-análise de 2024: MCG em DM2 em insulina reduziu HbA1c em 0,5% adicional, episódios de hipoglicemia em 40% e melhorou tempo no alvo (TIR 70–180 mg/dL) em 15%.',
        populacao_alvo: 'Todos os pacientes com DM2 em uso de insulina (basal, NPH, pré-misturada ou intensiva)',
        acao_clinica: 'Prescrever sensor MCG (Libre, Dexcom G7) para todos em insulinoterapia. Meta: TIR ≥ 70% (> 17h/dia em 70–180 mg/dL)',
        evidencias: [
          {
            estudo: 'FLASH-DM2 meta-análise',
            tipo: 'meta_analise',
            n_pacientes: 4200,
            ano: 2024,
            revista: 'Diabetes Care',
            doi: '10.2337/dc23-1847',
            nivel: 'A',
            grau: 'I',
            desfecho: 'HbA1c e tempo em hipoglicemia',
            resultado: 'MCG reduziu HbA1c em −0,5% e hipoglicemia nível 1 em 40% vs. glicemia capilar',
          },
        ],
        tags: ['MCG', 'CGM', 'insulina', 'TIR', 'hipoglicemia', 'Libre', 'Dexcom'],
      },
      {
        id: 'ada26-3',
        topico: 'Meta de HbA1c individualizada por fenótipo',
        anterior: '< 7% para a maioria dos pacientes adultos',
        novo: 'Meta 6,5–7%: jovens, sem hipoglicemia, DM2 recente. Meta 7–8%: idosos frágeis, comorbidades graves, expectativa de vida limitada',
        impacto: 'moderado',
        justificativa: 'Dados de longo prazo do ACCORD e ADVANCE confirmam que metas muito intensivas (< 6,5%) aumentam hipoglicemia grave e mortalidade em pacientes frágeis. Individualização é mandatória.',
        populacao_alvo: 'Todos os pacientes com DM2 — estratificar por idade, fragilidade, comorbidades, expectativa de vida e preferências',
        acao_clinica: 'Definir meta de HbA1c individualmente em cada consulta. Usar ferramenta de fragilidade (Clinical Frailty Scale) em ≥ 65 anos. Não tratar para < 6,5% em frágeis',
        evidencias: [
          {
            estudo: 'ACCORD',
            tipo: 'ecr',
            n_pacientes: 10251,
            ano: 2008,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa0802743',
            nivel: 'A',
            grau: 'I',
            desfecho: 'Mortalidade em tratamento intensivo vs. padrão',
            resultado: 'Tratamento intensivo (HbA1c < 6%) aumentou mortalidade em 22% — estudo interrompido precocemente',
          },
        ],
        tags: ['HbA1c', 'meta', 'idoso', 'frágil', 'individualização'],
      },
    ],
  },

  // ════════════════════════════════════════════════════
  // GOLD 2026 — DPOC
  // ════════════════════════════════════════════════════
  {
    id: 'gold-2026',
    sigla: 'GOLD 2026',
    titulo: 'Global Strategy for COPD 2026',
    sociedade: 'Global Initiative for Chronic Obstructive Lung Disease (GOLD)',
    area: 'pneumologia',
    versao_anterior: '2025',
    versao_nova: '2026',
    data_publicacao: '2025-11-01',
    data_insercao: '2025-11-15',
    resumo_executivo: 'GOLD 2026 redefiniu grupos de risco de A/B/C/D para A/B/E (exacerbador), simplificando o algoritmo de tratamento. Novo destaque para inflamação tipo 2 (eosinofílica) como biomarcador de resposta a ICS. Dupla broncodilatação LAMA+LABA como standard em grupo B/E. Atualização sobre cessação do tabagismo com vareniclina.',
    destaque: true,
    tags: ['DPOC', 'GOLD', 'LAMA', 'LABA', 'ICS', 'eosinófilos', 'exacerbação'],
    mudancas: [
      {
        id: 'gold26-1',
        topico: 'Nova classificação: grupos A / B / E (substitui A/B/C/D)',
        anterior: 'Grupos A, B, C, D baseados em sintomas (mMRC/CAT) + histórico de exacerbações',
        novo: 'Grupos A (baixo risco/poucos sintomas), B (mais sintomas), E (exacerbador — ≥ 2 exacerbações/ano ou ≥ 1 hospitalização)',
        impacto: 'pratica_mudada',
        justificativa: 'Simplificação clínica: C e D foram unificados em E (Exacerbador), pois o principal diferenciador prático é o histórico de exacerbações, não o nível de sintomas.',
        populacao_alvo: 'Todos os pacientes com DPOC ao diagnóstico e em reavaliações anuais',
        acao_clinica: 'Reclassificar pacientes ativos nos novos grupos: Grupo E = ≥ 2 exacerbações/ano (ou 1 com hospitalização). Grupo E → iniciar LAMA+LABA±ICS conforme eosinófilos',
        evidencias: [
          {
            estudo: 'IMPACT',
            tipo: 'ecr',
            n_pacientes: 10355,
            ano: 2018,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa1713901',
            nivel: 'A',
            grau: 'I',
            desfecho: 'Exacerbações moderadas-graves',
            resultado: 'Tríplice (FF/UMEC/VI) reduziu exacerbações em 25% vs. LABA+ICS e em 15% vs. LAMA+LABA',
          },
        ],
        tags: ['GOLD grupos', 'classificação', 'exacerbador', 'algoritmo'],
      },
      {
        id: 'gold26-2',
        topico: 'ICS: uso guiado por eosinófilos no sangue',
        anterior: 'ICS em grupo C/D independente de eosinófilos',
        novo: 'ICS indicado apenas se eosinófilos ≥ 300 células/μL (OU ≥ 100 + exacerbações repetidas). Descontinuar se < 100 células/μL',
        impacto: 'alto',
        justificativa: 'Análises pooladas confirmam que benefício do ICS está restrito a inflamação eosinofílica. Uso sem indicação aumenta risco de pneumonia sem benefício em exacerbações.',
        populacao_alvo: 'Grupo GOLD E em consideração para ICS na tríplice terapia',
        acao_clinica: 'Solicitar eosinófilos no hemograma antes de adicionar ICS. Manter ICS se ≥ 300/μL. Revisar e suspender ICS se < 100/μL',
        evidencias: [
          {
            estudo: 'SUNSET',
            tipo: 'ecr',
            n_pacientes: 1089,
            ano: 2018,
            revista: 'Am J Resp Crit Care Med',
            doi: '10.1164/rccm.201806-1152OC',
            nivel: 'A',
            grau: 'I',
            desfecho: 'Exacerbações após retirada de ICS',
            resultado: 'Retirada de ICS em eosinófilos < 300/μL não aumentou exacerbações mas reduziu pneumonias',
          },
        ],
        tags: ['ICS', 'eosinófilos', 'biomarcador', 'pneumonia', 'DPOC'],
      },
      {
        id: 'gold26-3',
        topico: 'Vareniclina para cessação do tabagismo — Grau atualizado',
        anterior: 'Recomendada com evidência moderada',
        novo: 'Classe I-A — Vareniclina é o tratamento farmacológico mais eficaz para cessação do tabagismo em DPOC',
        impacto: 'moderado',
        justificativa: 'Meta-análise 2024 de 61 ECRs: vareniclina aumenta taxa de abstinência em 2,5× vs. placebo e 1,5× vs. bupropiona em DPOC. Sem aumento confirmado de risco CV.',
        populacao_alvo: 'Todos os pacientes com DPOC que fumam atualmente',
        acao_clinica: 'Oferecer vareniclina a TODOS os pacientes tabagistas com DPOC. Iniciar 0,5 mg/dia × 3 dias → 0,5 mg 2×/dia × 4 dias → 1 mg 2×/dia × 12 semanas',
        evidencias: [
          {
            estudo: 'EAGLES',
            tipo: 'ecr',
            n_pacientes: 8144,
            ano: 2016,
            revista: 'Lancet',
            doi: '10.1016/S0140-6736(16)30272-0',
            nivel: 'A',
            grau: 'I',
            desfecho: 'Abstinência em 9–12 semanas e eventos neuropsiquiátricos',
            resultado: 'Vareniclina superior a bupropiona e nicotina sem aumento de eventos neuropsiquiátricos graves',
          },
        ],
        tags: ['vareniclina', 'tabagismo', 'cessação', 'DPOC'],
      },
    ],
  },

  // ════════════════════════════════════════════════════
  // KDIGO 2025 — DRC / Doença Renal Crônica
  // ════════════════════════════════════════════════════
  {
    id: 'kdigo-2025',
    sigla: 'KDIGO 2025',
    titulo: 'KDIGO Clinical Practice Guideline for CKD 2025',
    sociedade: 'Kidney Disease: Improving Global Outcomes (KDIGO)',
    area: 'nefrologia',
    versao_anterior: '2022',
    versao_nova: '2025',
    data_publicacao: '2025-03-01',
    data_insercao: '2025-03-20',
    resumo_executivo: 'KDIGO 2025 eleva SGLT-2 a primeira linha na DRC com ou sem DM2. Finerenona (antagonista MR) integrada ao algoritmo após FIDELIO/FIGARO. Meta de pressão arterial revisada para < 120 mmHg sistólica em DRC + alto risco CV. Albuminúria confirmada como desfecho intermediário-chave.',
    destaque: false,
    tags: ['DRC', 'CKD', 'SGLT-2', 'finerenona', 'nefroproteção', 'albuminúria', 'TFG'],
    mudancas: [
      {
        id: 'kdigo25-1',
        topico: 'SGLT-2 em DRC independente de DM2',
        anterior: 'SGLT-2 indicado em DRC + DM2 com TFG ≥ 20',
        novo: 'Classe I — SGLT-2 recomendado para todos os pacientes com DRC G3a-G4 (TFG 20–60) independente de DM2, se albuminúria ≥ 200 mg/g',
        impacto: 'pratica_mudada',
        justificativa: 'DAPA-CKD (dapagliflozina) e EMPA-KIDNEY (empagliflozina): benefício renal demonstrado independente de diabetes. Redução de 37–44% na progressão de DRC ou morte renal.',
        populacao_alvo: 'DRC TFG 20–60 mL/min/1,73m² com albuminúria ≥ 200 mg/g, independente de DM2',
        acao_clinica: 'Iniciar dapagliflozina 10 mg/dia (aprovada ANVISA para DRC) em todos com TFG 20–60 + albuminúria ≥ 200, mesmo sem DM2. Não suspender até TFG < 15',
        evidencias: [
          {
            estudo: 'DAPA-CKD',
            tipo: 'ecr',
            n_pacientes: 4304,
            ano: 2020,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa2024816',
            nivel: 'A',
            grau: 'I',
            desfecho: 'Declínio sustentado TFG ≥ 50%, DRT ou morte renal/CV',
            resultado: 'Redução de 39% no desfecho primário (HR 0,61; p<0,001). 33% sem DM2 — benefício similar',
          },
          {
            estudo: 'EMPA-KIDNEY',
            tipo: 'ecr',
            n_pacientes: 6609,
            ano: 2023,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa2204233',
            nivel: 'A',
            grau: 'I',
            desfecho: 'Progressão da DRC ou morte CV',
            resultado: 'Empagliflozina reduziu progressão em 28% (HR 0,72; p<0,001), incluindo TFG 20–45',
          },
        ],
        tags: ['SGLT-2', 'dapagliflozina', 'empagliflozina', 'DRC', 'sem-DM2', 'DAPA-CKD'],
      },
      {
        id: 'kdigo25-2',
        topico: 'Finerenona no algoritmo de DRC + DM2',
        anterior: 'Não incluída nas diretrizes anteriores',
        novo: 'IIa — Adicionar finerenona após IECA/BRA + SGLT-2 em DRC + DM2 com albuminúria persistente ≥ 300 mg/g',
        impacto: 'alto',
        justificativa: 'FIDELITY (meta-análise poolada de FIDELIO-DKD e FIGARO-DKD): finerenona reduziu progressão renal em 23% e eventos CV em 14% sobre o tratamento padrão com IECA/BRA + SGLT-2.',
        populacao_alvo: 'DRC G3a-G4 + DM2 com TFG 25–75 e albuminúria ≥ 300 mg/g, em uso de IECA/BRA + SGLT-2 na dose máxima tolerada',
        acao_clinica: 'Adicionar finerenona 10 mg/dia (se TFG < 60) ou 20 mg/dia (TFG ≥ 60) após estabilizar IECA/BRA + SGLT-2. Monitorar K+ em 4 semanas',
        evidencias: [
          {
            estudo: 'FIDELITY (pooled)',
            tipo: 'meta_analise',
            n_pacientes: 13026,
            ano: 2022,
            revista: 'Eur Heart J',
            doi: '10.1093/eurheartj/ehac244',
            nivel: 'A',
            grau: 'IIa',
            desfecho: 'Composto renal + composto CV',
            resultado: 'Finerenona: −23% eventos renais (HR 0,77) e −14% eventos CV (HR 0,86) vs. placebo',
          },
        ],
        tags: ['finerenona', 'MRA não-esteroide', 'DRC', 'DM2', 'hipercalemia'],
      },
      {
        id: 'kdigo25-3',
        topico: 'Meta de PA em DRC: < 120 mmHg sistólica',
        anterior: '< 130/80 mmHg como meta geral em DRC',
        novo: 'IIa — Considerar meta < 120 mmHg sistólica em DRC de alto risco CV (com albuminúria ou DM2)',
        impacto: 'moderado',
        justificativa: 'Análise de subgrupo do SPRINT em DRC: meta < 120 mmHg reduziu eventos CV em 27% sem deterioração adicional da TFG em curto prazo. Benefício risco-dependente.',
        populacao_alvo: 'DRC G3-G4 + DCV estabelecida ou albuminúria ≥ 300 mg/g e tolerância hemodinâmica',
        acao_clinica: 'Titular anti-hipertensivos para PA sistólica < 120 mmHg em DRC de alto risco se tolerado (sem hipotensão ortostática ou creatinina ↑ > 30% com IECA). Revisar em 4 semanas',
        evidencias: [
          {
            estudo: 'SPRINT CKD subgroup',
            tipo: 'observacional',
            n_pacientes: 2646,
            ano: 2017,
            revista: 'JASN',
            doi: '10.1681/ASN.2016010017',
            nivel: 'B',
            grau: 'IIa',
            desfecho: 'Eventos CV e progressão de DRC',
            resultado: 'Meta < 120 mmHg: −27% eventos CV (HR 0,73) sem aumento de DRT ou declínio de TFG ≥ 50%',
          },
        ],
        tags: ['PA', 'meta pressórica', 'DRC', 'SPRINT', '120 mmHg'],
      },
    ],
  },

  // ════════════════════════════════════════════════════
  // SBC 2025 — Prevenção Cardiovascular
  // ════════════════════════════════════════════════════
  {
    id: 'sbc-prev-2025',
    sigla: 'SBC 2025',
    titulo: 'Diretriz SBC de Prevenção Cardiovascular 2025',
    sociedade: 'Sociedade Brasileira de Cardiologia (SBC)',
    area: 'cardiologia',
    versao_anterior: '2019',
    versao_nova: '2025',
    data_publicacao: '2025-06-01',
    data_insercao: '2025-06-15',
    resumo_executivo: 'A Diretriz SBC 2025 de Prevenção atualiza as metas de LDL-c por categoria de risco, inclui ácido bempedoico como alternativa a estatinas em intolerantes e consolida GLP-1 RA como agente de prevenção CV primária em alto risco metabólico. Escore de cálcio coronário (CAC) integrado ao algoritmo de risco intermediário.',
    destaque: false,
    tags: ['prevenção CV', 'LDL', 'estatina', 'ácido bempedoico', 'CAC', 'risco CV', 'GLP-1'],
    mudancas: [
      {
        id: 'sbc25-1',
        topico: 'Metas de LDL-c por categoria de risco',
        anterior: 'Alto risco: < 70 mg/dL · Muito alto: < 50 mg/dL',
        novo: 'Alto risco: < 70 mg/dL · Muito alto risco: < 55 mg/dL · Risco extremo (DCV + DM2 ou DRC): < 40 mg/dL',
        impacto: 'alto',
        justificativa: 'Dados do FOURIER (evolocumabe) e ODYSSEY OUTCOMES (alirocumabe) sustentam redução adicional de eventos CV com LDL-c < 40 mg/dL em pacientes com DCV + comorbidade de alto risco.',
        populacao_alvo: 'Pacientes com DCV estabelecida + DM2 ou DRC (categoria "risco extremo")',
        acao_clinica: 'Identificar pacientes em risco extremo (DCV + DM2 ou DRC). Adicionar evolocumabe ou alirocumabe se LDL-c > 40 mg/dL apesar de estatina alta intensidade + ezetimiba',
        evidencias: [
          {
            estudo: 'FOURIER',
            tipo: 'ecr',
            n_pacientes: 27564,
            ano: 2017,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa1615664',
            nivel: 'A',
            grau: 'I',
            desfecho: 'MACE',
            resultado: 'Evolocumabe reduziu LDL-c em 59% (59→30 mg/dL) e MACE em 15% (HR 0,85; p<0,001)',
          },
        ],
        tags: ['LDL', 'meta', 'evolocumabe', 'alirocumabe', 'PCSK9', 'risco extremo'],
      },
      {
        id: 'sbc25-2',
        topico: 'Ácido bempedoico em intolerantes a estatina',
        anterior: 'Não incluído',
        novo: 'IIa — Ácido bempedoico como alternativa em intolerância a estatinas para redução de LDL e eventos CV',
        impacto: 'moderado',
        justificativa: 'CLEAR Outcomes trial (2023): ácido bempedoico 180 mg/dia reduziu MACE em 13% (HR 0,87; p=0,004) em pacientes com intolerância a estatinas, com redução de LDL de 21%.',
        populacao_alvo: 'Pacientes de alto/muito alto risco CV com intolerância documentada a ≥ 2 estatinas',
        acao_clinica: 'Prescrever ácido bempedoico 180 mg/dia em substituição ou combinado com ezetimiba em intolerantes a estatinas. Monitorar ácido úrico (risco de gota)',
        evidencias: [
          {
            estudo: 'CLEAR Outcomes',
            tipo: 'ecr',
            n_pacientes: 13970,
            ano: 2023,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa2215024',
            nivel: 'A',
            grau: 'IIa',
            desfecho: 'MACE em intolerantes a estatinas',
            resultado: 'Bempedoico: −21% LDL-c e −13% MACE vs. placebo (HR 0,87; IC 0,79–0,96; p=0,004)',
          },
        ],
        tags: ['bempedoico', 'intolerância estatina', 'LDL', 'prevenção CV'],
      },
      {
        id: 'sbc25-3',
        topico: 'Escore de cálcio coronário (CAC) em risco intermediário',
        anterior: 'CAC mencionado como opcional',
        novo: 'IIa — CAC recomendado para reclassificação de risco em pacientes intermediários (risco 5–20% em 10 anos) para guiar início de estatina',
        impacto: 'moderado',
        justificativa: 'Multi-Ethnic Study of Atherosclerosis (MESA): CAC = 0 identifica pacientes de muito baixo risco mesmo com risco intermediário pelo Escore de Risco Global, evitando estatina desnecessária.',
        populacao_alvo: 'Pacientes com risco intermediário (Escore de Framingham 5–20% em 10 anos) sem indicação clara de estatina',
        acao_clinica: 'Solicitar tomografia para CAC em pacientes intermediários quando a decisão de iniciar estatina não for clara. CAC = 0: adiar estatina. CAC ≥ 100: iniciar estatina alta intensidade',
        evidencias: [
          {
            estudo: 'MESA',
            tipo: 'observacional',
            n_pacientes: 6814,
            ano: 2004,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa040901',
            nivel: 'B',
            grau: 'IIa',
            desfecho: 'Eventos CV em 10 anos por CAC',
            resultado: 'CAC = 0 associado a risco < 5% em 10 anos mesmo em pacientes de risco intermediário',
          },
        ],
        tags: ['CAC', 'cálcio coronário', 'estratificação', 'estatina', 'risco intermediário'],
      },
    ],
  },

  // ════════════════════════════════════════════════════
  // GINA 2025 — Asma
  // ════════════════════════════════════════════════════
  {
    id: 'gina-2025',
    sigla: 'GINA 2025',
    titulo: 'Global Strategy for Asthma Management 2025',
    sociedade: 'Global Initiative for Asthma (GINA)',
    area: 'pneumologia',
    versao_anterior: '2024',
    versao_nova: '2025',
    data_publicacao: '2025-05-01',
    data_insercao: '2025-05-15',
    resumo_executivo: 'GINA 2025 mantém ICS-formoterol como resgate em todos os passos. Novidade: dupixentabe (dupilumabe) incluído no passo 5 para asma eosinofílica grave não controlada. Atualização das metas de controle incluindo função pulmonar pós-broncodilatador. Precauções com SABA mais enfatizadas.',
    destaque: false,
    tags: ['asma', 'SMART', 'ICS-formoterol', 'dupilumabe', 'biológico', 'eosinofílica'],
    mudancas: [
      {
        id: 'gina25-1',
        topico: 'Dupilumabe (anti-IL4/IL13) no passo 5',
        anterior: 'Biológicos (omalizumabe, mepolizumabe) no passo 5 sem hierarquia clara',
        novo: 'Dupilumabe como opção preferencial no passo 5 em asma eosinofílica (eos ≥ 300/μL) ou alérgica grave não controlada',
        impacto: 'alto',
        justificativa: 'LIBERTY ASTHMA QUEST e VOYAGE: dupilumabe reduziu exacerbações em 70% e melhorou VEF₁ em 0,32L em asma eosinofílica ou com FeNO ≥ 25 ppb. Aprovado ANVISA 2023.',
        populacao_alvo: 'Asma grave não controlada (≥ 2 exacerbações/ano em uso de ICS alta dose + LABA) com eosinófilos ≥ 300/μL ou FeNO ≥ 25 ppb',
        acao_clinica: 'Encaminhar para especialista em asma grave. Dupilumabe 200 mg SC a cada 2 semanas. Monitorar eosinófilos — pode aumentar transitoriamente nas primeiras semanas',
        evidencias: [
          {
            estudo: 'LIBERTY ASTHMA QUEST',
            tipo: 'ecr',
            n_pacientes: 1902,
            ano: 2018,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa1804092',
            nivel: 'A',
            grau: 'I',
            desfecho: 'Exacerbações graves anuais',
            resultado: 'Dupilumabe reduziu exacerbações em 70% (RR 0,30) em eosinófilos ≥ 300 e FeNO ≥ 25',
          },
        ],
        tags: ['dupilumabe', 'biológico', 'asma grave', 'eosinofílica', 'IL-4', 'IL-13'],
      },
    ],
  },

];

// ─── Helpers ─────────────────────────────────────────────────

export const IMPACTO_META: Record<ImpactoClinico, {
  label: string;
  cls: string;
  dot: string;
  descricao: string;
}> = {
  baixo:          { label: 'Baixo impacto',       cls: 'bg-slate-100  text-slate-600',  dot: 'bg-slate-400',  descricao: 'Mudança de detalhe ou contexto' },
  moderado:       { label: 'Impacto moderado',     cls: 'bg-blue-100   text-blue-700',   dot: 'bg-blue-500',   descricao: 'Ajuste de dose, meta ou indicação secundária' },
  alto:           { label: 'Alto impacto',         cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', descricao: 'Nova indicação ou contraindicação importante' },
  pratica_mudada: { label: 'Prática mudada',       cls: 'bg-red-100    text-red-700',    dot: 'bg-red-500',    descricao: 'Mudança fundamental no padrão de tratamento' },
};

export const AREA_META: Record<AreaEspecialidade, { label: string; cls: string }> = {
  cardiologia:   { label: 'Cardiologia',   cls: 'bg-red-100    text-red-700'    },
  endocrinologia:{ label: 'Endocrinologia',cls: 'bg-purple-100  text-purple-700' },
  nefrologia:    { label: 'Nefrologia',    cls: 'bg-cyan-100   text-cyan-700'   },
  pneumologia:   { label: 'Pneumologia',   cls: 'bg-sky-100    text-sky-700'    },
  psiquiatria:   { label: 'Psiquiatria',   cls: 'bg-indigo-100 text-indigo-700' },
  infectologia:  { label: 'Infectologia',  cls: 'bg-green-100  text-green-700'  },
  reumatologia:  { label: 'Reumatologia',  cls: 'bg-amber-100  text-amber-700'  },
};

export const NIVEL_COLOR: Record<string, string> = {
  A: 'bg-green-100 text-green-700 border-green-300',
  B: 'bg-blue-100  text-blue-700  border-blue-300',
  C: 'bg-slate-100 text-slate-600 border-slate-300',
};

export const GRAU_COLOR: Record<string, string> = {
  I:   'bg-indigo-100 text-indigo-700 border-indigo-300',
  IIa: 'bg-purple-100 text-purple-700 border-purple-300',
  IIb: 'bg-amber-100  text-amber-700  border-amber-300',
  III: 'bg-red-100    text-red-700    border-red-300',
};

export const NIVEL_DESC: Record<string, string> = {
  A: 'Múltiplos ECRs ou meta-análises',
  B: 'ECR único ou estudos observacionais',
  C: 'Consenso de especialistas',
};

export const GRAU_DESC: Record<string, string> = {
  I:   'Benefício muito superior ao risco — Recomendado',
  IIa: 'Benefício > risco — Razoável considerar',
  IIb: 'Benefício ≥ risco — Pode considerar',
  III: 'Sem benefício ou prejudicial — Não recomendado',
};

export function totalMudancasByImpacto(updates: GuidelineUpdate[], impacto: ImpactoClinico) {
  return updates.reduce((s, g) => s + g.mudancas.filter(m => m.impacto === impacto).length, 0);
}
