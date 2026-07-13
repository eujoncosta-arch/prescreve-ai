// ============================================================
// PRESCREVE-AI — Extensão Farmacológica: PNEUMOLOGIA (Phase 21.6) — Parte A
// SABA · SAMA · LABA · LAMA · ICS · ICS/LABA · LABA/LAMA · Triple
// ============================================================

import type { QuickDrug } from './pharma-database';

export const PHARMA_DB_PULMO_A: QuickDrug[] = [

  // ══════════════════════════════════════════════════════════════
  // SABA — Beta-2 agonistas de Curta Ação
  // (salbutamol já em PHARMA_DB — não duplicar)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'fenoterol',
    molecula: 'Fenoterol',
    nome_generico: 'Bromidrato de Fenoterol',
    sinonimos: ['berotec', 'fenoterol', 'fenoterol saba', 'broncodilatador rapido fenoterol'],
    categoria: 'respiratory',
    classe: 'SABA',
    subclasse: 'Beta-2 agonista inalatório de curta ação — potência ligeiramente maior que salbutamol',
    indicacoes_principais: [
      'Broncoespasmo agudo (asma, DPOC)',
      'Crise asmática — resgate',
      'Broncoconstrição induzida por exercício',
    ],
    dose_adulto: {
      habitual: '1–2 jatos (100–200 mcg) por dose',
      min: '1 jato = 100 mcg',
      max: '8 jatos/dia (manutenção) | crise: até 4 jatos a cada 20 min × 3 vezes',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['A cada 4–6h (manutenção)', 'A cada 20 min × 3 (crise aguda)'],
      instrucoes: 'Solução nebulização: 0,5 mL (2,5 mg) em 3 mL SF. Crise grave: 5 mg (1 mL) em nebulização contínua. Usar espaçador com aerossol.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Taquiarritmias não controladas', 'Cardiomiopatia obstrutiva hipertrófica'],
    interacoes_importantes: [
      { com: 'Beta-bloqueadores não seletivos', severidade: 'grave', descricao: 'Antagonismo — bloqueio do broncoespasmo + broncoconstrição paradoxal' },
      { com: 'IMAO / antidepressivos tricíclicos', severidade: 'moderada', descricao: 'Potencialização de efeitos cardiovasculares' },
    ],
    alertas_especiais: [
      'Maior potência beta-2 que salbutamol — risco maior de taquicardia',
      'Não usar como monoterapia de manutenção em asma — sempre associar ICS',
      'Hipocalemia em doses altas — monitorar K+ em nebulizações repetidas',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Berotec®', laboratorio: 'Boehringer Ingelheim', concentracoes: ['100 mcg/dose aerossol', '5 mg/mL solução nebulização'], formas: ['Aerossol', 'Solução nebulização'] },
    ],
  },

  {
    id: 'ipratropio',
    molecula: 'Ipratrópio',
    nome_generico: 'Brometo de Ipratrópio',
    sinonimos: ['atrovent', 'ipratropio', 'ipratropium', 'sama', 'anticolinergico curta acao', 'brometo ipratropio'],
    categoria: 'respiratory',
    classe: 'SAMA',
    subclasse: 'Anticolinérgico inalatório de curta ação (Short-Acting Muscarinic Antagonist)',
    indicacoes_principais: [
      'DPOC — broncodilatador de resgate e manutenção',
      'Crise asmática grave (associado a SABA — protocolo de emergência)',
      'Rinorreia não-alérgica (spray nasal)',
    ],
    dose_adulto: {
      habitual: '20–40 mcg (1–2 jatos) até 4×/dia',
      min: '20 mcg (1 jato)',
      max: '320 mcg/dia (aerossol)',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['3–4x/dia (manutenção)', 'A cada 20 min × 3 (crise — junto a SABA)'],
      instrucoes: 'Solução nebulização: 0,5 mg (2 mL) em SF. Crise asmática grave: combinar com salbutamol/fenoterol na mesma nebulização (sinergismo). Início de ação: 15–30 min (mais lento que SABA).',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade à atropina ou derivados', 'Glaucoma de ângulo fechado (evitar contato ocular — usar bocal, não máscara)'],
    interacoes_importantes: [
      { com: 'Tiotrópio / Umeclidínio (LAMA)', severidade: 'moderada', descricao: 'Duplicidade anticolinérgica — efeitos adversos aditivos sem benefício adicional' },
    ],
    alertas_especiais: [
      'GLAUCOMA: nebulização com máscara facial → risco de borrifar nos olhos → glaucoma agudo. Preferir bocal.',
      'Retenção urinária: HBP — monitorar',
      'MENOS eficaz que SABA em asma — não é broncodilatador de primeira linha para asma',
      'MAIS eficaz em DPOC que asma (maior componente colinérgico na DPOC)',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Atrovent®', laboratorio: 'Boehringer Ingelheim', concentracoes: ['20 mcg/dose', '0,25 mg/mL nebulização'], formas: ['Aerossol', 'Solução nebulização'] },
      { nome: 'Ipratrópio Eurofarma', laboratorio: 'Eurofarma', concentracoes: ['20 mcg/dose'], formas: ['Aerossol'], lab_id: 'eurofarma' },
    ],
  },

  {
    id: 'fenoterol_ipratropio',
    molecula: 'Fenoterol + Ipratrópio',
    nome_generico: 'Bromidrato de Fenoterol + Brometo de Ipratrópio',
    sinonimos: ['berodual', 'fenoterol ipratropio', 'saba sama combinado', 'broncodilatador duplo'],
    categoria: 'respiratory',
    classe: 'SABA + SAMA',
    subclasse: 'Combinação broncodilatadora de dupla ação (Beta-2 agonista + Anticolinérgico) — curta ação',
    indicacoes_principais: [
      'DPOC — resgate e manutenção (melhor que cada agente isolado)',
      'Crise asmática moderada-grave (protocolo de emergência)',
      'Broncoespasmo agudo em pacientes hospitalizados',
    ],
    dose_adulto: {
      habitual: '1–2 mL (20–40 gotas) 3–4×/dia nebulização',
      min: '1 mL (20 gotas) nebulização',
      max: '4 mL por dose em crise grave',
      unidade: 'mL',
      via: 'Inalatório',
      frequencias: ['3–4×/dia (manutenção)', 'A cada 20 min × 3 em crise (protocolo PS)'],
      instrucoes: 'Cada mL = 0,5 mg fenoterol + 0,25 mg ipratrópio. Nebulizar com 3 mL SF. Aerossol: 1–2 jatos = 50 mcg fenoterol + 20 mcg ipratrópio.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade a fenoterol, ipratrópio ou atropina', 'Cardiomiopatia obstrutiva hipertrófica', 'Glaucoma de ângulo fechado'],
    interacoes_importantes: [
      { com: 'LAMA (tiotrópio, umeclidínio)', severidade: 'moderada', descricao: 'Duplicidade anticolinérgica — não usar Berodual junto a LAMA de manutenção sem indicação clara' },
    ],
    alertas_especiais: [
      'GLAUCOMA: usar bocal (não máscara) na nebulização',
      'Sinergismo broncodilatador: combinação demonstrou benefício adicional sobre SABA ou SAMA isolados em DPOC',
      'Padrão de resgate hospitalar — protocolo UPA/PS para crises moderadas-graves',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Berodual®', laboratorio: 'Boehringer Ingelheim', concentracoes: ['0,5 mg + 0,25 mg/mL'], formas: ['Solução nebulização', 'Aerossol'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // LABA — Beta-2 agonistas de Longa Ação (extras)
  // (formoterol e salmeterol já em PHARMA_DB — não duplicar)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'indacaterol',
    uso_pediatrico: 'nao_aplicavel',
    molecula: 'Indacaterol',
    nome_generico: 'Maleato de Indacaterol',
    sinonimos: ['onbrez', 'indacaterol', 'indacaterolum', 'laba once daily', 'laba 1x dia'],
    categoria: 'respiratory',
    classe: 'LABA',
    subclasse: 'Beta-2 agonista inalatório de longa ação — duração 24h (1×/dia)',
    indicacoes_principais: [
      'DPOC — broncodilatador de manutenção (GOLD 2025 — monofármaco LABA grupo B)',
      'NÃO aprovado como monoterapia em asma (sem ICS)',
    ],
    dose_adulto: {
      habitual: '150 mcg 1×/dia (Breezhaler)',
      min: '150 mcg/dia',
      max: '300 mcg/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['1×/dia (mesma hora)'],
      instrucoes: 'Usar o inalador Breezhaler: perfurar a cápsula e inalar completamente em uma ou duas inalações profundas. Ouvir o chiado indica uso correto.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Dados limitados', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['Asma — CONTRAINDICADO como monoterapia (sem ICS)', 'Taquiarritmias graves', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Beta-bloqueadores não seletivos', severidade: 'grave', descricao: 'Antagonismo — bloqueio completo do efeito broncodilatador' },
    ],
    alertas_especiais: [
      'Duração 24h — uma única inalação por dia',
      'ASMA: CONTRAINDICADO sem ICS — aprovado somente para DPOC como monoterapia',
      'Tosse pós-inalação: frequente (transitória, < 30 s) — não indica troca',
      'Disponível como dupla LABA/LAMA: Indacaterol/Glicopirrônio (Ultibro®)',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Onbrez® Breezhaler', laboratorio: 'Novartis', concentracoes: ['150 mcg/cápsula'], formas: ['Pó inalatório (cápsula)'], lab_id: 'novartis' },
    ],
  },

  {
    id: 'olodaterol',
    uso_pediatrico: 'nao_aplicavel',
    molecula: 'Olodaterol',
    nome_generico: 'Cloridrato de Olodaterol',
    sinonimos: ['striverdi', 'olodaterol', 'laba respimat', 'laba 1x dia dpoc'],
    categoria: 'respiratory',
    classe: 'LABA',
    subclasse: 'Beta-2 agonista inalatório de longa ação — duração 24h, inalador Respimat',
    indicacoes_principais: [
      'DPOC — broncodilatador de manutenção (GOLD 2025)',
    ],
    dose_adulto: {
      habitual: '5 mcg (2 jatos × 2,5 mcg) 1×/dia',
      min: '5 mcg/dia',
      max: '5 mcg/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['1×/dia (manhã)'],
      instrucoes: 'Respimat: 2 jatos = 5 mcg. Inalar lentamente e profundamente. Disponível combinado com tiotrópio (Spiolto® Respimat).',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Dados limitados', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['Asma como monoterapia (sem ICS)', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Beta-bloqueadores não seletivos', severidade: 'grave', descricao: 'Antagonismo broncodilatador' },
    ],
    alertas_especiais: ['Aprovado somente para DPOC como monoterapia LABA', 'Disponível como LABA/LAMA: Olodaterol/Tiotrópio (Spiolto® Respimat)'],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Striverdi® Respimat', laboratorio: 'Boehringer Ingelheim', concentracoes: ['2,5 mcg/jato'], formas: ['Solução inalatória Respimat'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // LAMA — Anticolinérgicos de Longa Ação (extras)
  // (tiotrópio e umeclidínio já em PHARMA_DB — não duplicar)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'glicopirronio',
    molecula: 'Glicopirrônio',
    nome_generico: 'Brometo de Glicopirrônio',
    sinonimos: ['seebri', 'glicopirronio', 'glycopyrronium', 'lama breezhaler'],
    categoria: 'respiratory',
    classe: 'LAMA',
    subclasse: 'Anticolinérgico inalatório de longa ação — 24h, inalador Breezhaler',
    indicacoes_principais: [
      'DPOC — broncodilatador de manutenção (GOLD 2025)',
    ],
    dose_adulto: {
      habitual: '50 mcg 1×/dia (Breezhaler)',
      min: '50 mcg/dia',
      max: '50 mcg/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['1×/dia'],
      instrucoes: 'Cápsula Breezhaler: perfurar e inalar profundamente. Disponível como LABA/LAMA: Indacaterol/Glicopirrônio (Ultibro®).',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Cautela', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Glaucoma de ângulo fechado agudo', 'Retenção urinária grave'],
    interacoes_importantes: [
      { com: 'Outros anticolinérgicos (tiotrópio, ipratrópio)', severidade: 'moderada', descricao: 'Duplicidade — não combinar LAMAs' },
    ],
    alertas_especiais: ['Disponível como combinação LABA/LAMA: Ultibro® (Indacaterol 110 mcg + Glicopirrônio 50 mcg)', 'Boca seca frequente'],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Seebri® Breezhaler', laboratorio: 'Novartis', concentracoes: ['50 mcg/cápsula'], formas: ['Pó inalatório'], lab_id: 'novartis' },
    ],
  },

  {
    id: 'aclidinio',
    uso_pediatrico: 'nao_aplicavel',
    molecula: 'Aclidínio',
    nome_generico: 'Brometo de Aclidínio',
    sinonimos: ['eklira', 'aclidinio', 'aclidinium', 'lama genuair'],
    categoria: 'respiratory',
    classe: 'LAMA',
    subclasse: 'Anticolinérgico inalatório de longa ação — 12h (2×/dia), inalador Genuair',
    indicacoes_principais: ['DPOC — broncodilatador de manutenção (alternativa 2×/dia)'],
    dose_adulto: {
      habitual: '322 mcg 2×/dia (Genuair)',
      min: '322 mcg 2×/dia',
      max: '644 mcg/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['2×/dia (manhã e noite)'],
      instrucoes: 'Inalador Genuair: pressionar e soltar o botão verde, inalar profundamente. O botão verde confirma inalação correta.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Sem ajuste' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Glaucoma de ângulo fechado'],
    interacoes_importantes: [
      { com: 'Outros LAMAs / ipratrópio', severidade: 'moderada', descricao: 'Duplicidade anticolinérgica' },
    ],
    alertas_especiais: ['Diferencial: aclidínio requer 2×/dia (duração 12h), vs tiotrópio/umeclidínio/glicopirrônio (24h)'],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Eklira® Genuair', laboratorio: 'AstraZeneca', concentracoes: ['322 mcg/dose'], formas: ['Pó inalatório'], lab_id: 'astrazeneca' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ICS — Corticosteroides Inalatórios (extras)
  // (budesonida já em PHARMA_DB — não duplicar)
  // ══════════════════════════════════════════════════════════════

  {
    id: 'fluticasona_propionato',
    molecula: 'Fluticasona Propionato',
    nome_generico: 'Propionato de Fluticasona',
    sinonimos: ['flixotide', 'fluticasona', 'fluticasone', 'ics fluticasona', 'flutiform', 'fluticasona propionato'],
    categoria: 'respiratory',
    classe: 'ICS',
    subclasse: 'Corticosteroide inalatório — alta potência (ratio relativo vs budesonida 1:2)',
    indicacoes_principais: [
      'Asma persistente leve a grave (manutenção — GINA 2025)',
      'DPOC com eosinofilia (GOLD 2025 — ponderado)',
    ],
    dose_adulto: {
      habitual: '250–500 mcg/dia (asma leve-moderada)',
      min: '100 mcg/dia',
      max: '1000 mcg/dia (asma grave)',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['2×/dia (dividido em dose manhã/noite)'],
      instrucoes: 'Lavar boca após cada uso (candidíase). Equivalência de dose: fluticasona propionato 250 mcg ≈ budesonida 400 mcg. Disponível como MDI e Diskus.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Monitorar — metabolismo CYP3A4' },
    contraindicacoes_rapidas: ['Broncoespasmo agudo (não é broncodilatador)', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Ritonavir / Cobicistate', severidade: 'contraindicado', descricao: 'Inibição intensa de CYP3A4 → supressão adrenal grave (Cushing iatrogênico)' },
      { com: 'Cetoconazol / Itraconazol', severidade: 'grave', descricao: 'CYP3A4 — aumenta fluticasona sistêmica' },
    ],
    alertas_especiais: [
      'RITONAVIR / ARV com inibição de CYP3A4: CONTRAINDICADO — risco de insuficiência adrenal aguda',
      'Lavar boca obrigatório: candidíase oral e rouquidão',
      'Alta potência ICS — a menor dose eficaz deve ser utilizada',
    ],
    uso_gestante: 'seguro',
    uso_lactante: 'seguro',
    marcas: [
      { nome: 'Flixotide®', laboratorio: 'GSK', concentracoes: ['50 mcg', '125 mcg', '250 mcg/dose'], formas: ['Aerossol MDI', 'Diskus'] },
      { nome: 'Fluticasona EMS', laboratorio: 'EMS', concentracoes: ['250 mcg'], formas: ['Aerossol'] },
    ],
  },

  {
    id: 'fluticasona_furoato',
    molecula: 'Fluticasona Furoato',
    nome_generico: 'Furoato de Fluticasona',
    sinonimos: ['relvar', 'flonase', 'fluticasona furoato', 'ics 1x dia', 'ics once daily'],
    categoria: 'respiratory',
    classe: 'ICS',
    subclasse: 'Corticosteroide inalatório — maior afinidade e duração 24h (1×/dia); diferente do propionato',
    indicacoes_principais: [
      'Asma persistente (manutenção 1×/dia — GINA 2025)',
      'DPOC com eosinofilia (combinado com vilanterol — Trelegy)',
      'Rinite alérgica (spray nasal)',
    ],
    dose_adulto: {
      habitual: '100–200 mcg 1×/dia (asma)',
      min: '100 mcg/dia',
      max: '200 mcg/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['1×/dia'],
      instrucoes: 'Ellipta: abrir tampa e inalar profundamente. Lavar boca. 1×/dia é suficiente (duração 24h). Não é intercambiável com fluticasona propionato (estrutura e equipotência diferentes).',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Monitorar' },
    contraindicacoes_rapidas: ['Broncoespasmo agudo', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Ritonavir / inibidores CYP3A4 potentes', severidade: 'contraindicado', descricao: 'Supressão adrenal — risco de insuficiência adrenal aguda' },
    ],
    alertas_especiais: [
      'NÃO intercambiável com fluticasona propionato — estrutura molecular diferente',
      'Vantagem: 1×/dia — melhora adesão',
      'Disponível como triple ICS/LABA/LAMA: Fluticasona FF/Vilanterol/Umeclidínio (Trelegy® Ellipta)',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Relvar® Ellipta', laboratorio: 'GSK', concentracoes: ['92/22 mcg', '184/22 mcg (FF/Vilanterol)'], formas: ['Pó inalatório Ellipta'] },
    ],
  },

  {
    id: 'beclometasona',
    molecula: 'Beclometasona',
    nome_generico: 'Dipropionato de Beclometasona',
    sinonimos: ['clenil', 'aldecin', 'qvar', 'beclometasona', 'beclomethasone', 'ics beclometasona'],
    categoria: 'respiratory',
    classe: 'ICS',
    subclasse: 'Corticosteroide inalatório — pró-droga (convertida a beclometasona-17-monopropionato ativo)',
    indicacoes_principais: [
      'Asma persistente leve a moderada (manutenção)',
      'Rinite alérgica (spray nasal)',
    ],
    dose_adulto: {
      habitual: '200–400 mcg/dia',
      min: '100 mcg/dia',
      max: '800 mcg/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['2×/dia'],
      instrucoes: 'Lavar boca após cada uso. Disponível em partícula extrafina (Qvar®, Foster®) — partícula menor alcança vias distais. Dose equipotente: beclometasona 400 mcg ≈ budesonida 400 mcg ≈ fluticasona propionato 200 mcg.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Monitorar' },
    contraindicacoes_rapidas: ['Broncoespasmo agudo', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Ritonavir', severidade: 'contraindicado', descricao: 'Inibição CYP3A4 — supressão adrenal' },
    ],
    alertas_especiais: [
      'Formulação extrafina (Qvar®, Foster®): partícula 1,1 mcm vs 3,5 mcm padrão — maior deposição pulmonar distal',
      'Lavar boca obrigatório',
    ],
    uso_gestante: 'seguro',
    uso_lactante: 'seguro',
    marcas: [
      { nome: 'Clenil®', laboratorio: 'Chiesi', concentracoes: ['50 mcg', '100 mcg', '200 mcg/dose'], formas: ['Aerossol MDI'] },
      { nome: 'Qvar®', laboratorio: 'Teva', concentracoes: ['50 mcg', '100 mcg/dose (extrafina)'], formas: ['Aerossol MDI extrafina'] },
    ],
  },

  {
    id: 'ciclesonida',
    molecula: 'Ciclesonida',
    nome_generico: 'Ciclesonida',
    sinonimos: ['alvesco', 'ciclesonide', 'ciclesonida', 'ics pró-droga', 'ics menos candidíase'],
    categoria: 'respiratory',
    classe: 'ICS',
    subclasse: 'Corticosteroide inalatório — pró-droga ativada no pulmão (menos candidíase/rouquidão)',
    indicacoes_principais: [
      'Asma persistente — vantagem em pacientes com candidíase orofaríngea frequente',
    ],
    dose_adulto: {
      habitual: '160–320 mcg/dia',
      min: '80 mcg/dia',
      max: '640 mcg/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['1×/dia ou 2×/dia'],
      instrucoes: 'Pró-druma ativada por esterases pulmonares → menos absorção orofaríngea → menor candidíase. Menos lavagem bucal necessária vs outros ICS.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Monitorar' },
    contraindicacoes_rapidas: ['Broncoespasmo agudo', 'Hipersensibilidade'],
    interacoes_importantes: [
      { com: 'Inibidores potentes de CYP3A4 (cetoconazol, ritonavir, itraconazol)', severidade: 'leve', descricao: 'Aumentam a exposição ao metabólito ativo (des-CIC ~3,5×), mas sem ajuste de dose necessário para o ICS inalatório; cautela com ritonavir' },
    ],
    alertas_especiais: [
      'Menor risco de candidíase orofaríngea vs outros ICS (ativação local no pulmão)',
      'Menor biodisponibilidade sistêmica — menor risco de efeitos sistêmicos em doses altas',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Alvesco®', laboratorio: 'Takeda', concentracoes: ['80 mcg', '160 mcg/dose'], formas: ['Aerossol MDI'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ICS/LABA — Combinações Fixas
  // ══════════════════════════════════════════════════════════════

  {
    id: 'budesonida_formoterol',
    molecula: 'Budesonida/Formoterol',
    nome_generico: 'Budesonida + Fumarato de Formoterol',
    sinonimos: ['symbicort', 'budesonida formoterol', 'ics laba combinado', 'smart therapy', 'airsupra', 'noex duo'],
    categoria: 'respiratory',
    classe: 'ICS/LABA',
    subclasse: 'Combinação fixa ICS + LABA — dispositivo único',
    indicacoes_principais: [
      'Asma persistente moderada-grave (GINA step 3–5)',
      'DPOC com eosinofilia sintomática (GOLD B/E)',
      'SMART (Single Maintenance And Reliever Therapy): mesma inalador para manutenção E resgate — GINA preferred option step 3–4',
    ],
    dose_adulto: {
      habitual: '1–2 inalações 2×/dia (manutenção) + conforme necessário (SMART)',
      min: '1 inalação 2×/dia (160/4,5 mcg)',
      max: '4 inalações 2×/dia (total 8 inalações/dia incluindo resgate)',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['2×/dia manutenção + resgate conforme necessário (SMART)', '2×/dia fixo (abordagem convencional)'],
      instrucoes: 'SMART: 1–2 inalações de manutenção + 1 inalação de resgate conforme necessidade — máx 8 inalações/dia. Turbuhaler ou MDI. Lavar boca. Disponível em 80/4,5, 160/4,5 e 320/9 mcg.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Monitorar' },
    contraindicacoes_rapidas: ['Hipersensibilidade a budesonida ou formoterol', 'Taquiarritmias graves', 'Broncoespasmo agudo como dose de ataque'],
    interacoes_importantes: [
      { com: 'Ritonavir / inibidores CYP3A4', severidade: 'grave', descricao: 'Supressão adrenal — cautela' },
      { com: 'Beta-bloqueadores não seletivos', severidade: 'grave', descricao: 'Antagonismo da broncodilatação' },
    ],
    alertas_especiais: [
      'SMART: estratégia validada por GINA 2025 — preferida para asma leve-moderada (reduz exacerbações vs SABA separado)',
      'Formoterol tem início rápido (3–5 min) — permite uso como resgate no dispositivo SMART',
      'DPOC: budesonida/formoterol indicado quando eosinófilos > 300/μL',
      'Lavar boca obrigatório',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Symbicort®', laboratorio: 'AstraZeneca', concentracoes: ['80/4,5 mcg', '160/4,5 mcg', '320/9 mcg'], formas: ['Turbuhaler', 'Aerossol'], lab_id: 'astrazeneca' },
      { nome: 'Noex® Duo', laboratorio: 'Eurofarma', concentracoes: ['160/4,5 mcg'], formas: ['Aerossol MDI'], lab_id: 'eurofarma' },
      { nome: 'Vannair®', laboratorio: 'AstraZeneca', concentracoes: ['80/4,5 mcg', '160/4,5 mcg'], formas: ['Aerossol'], lab_id: 'astrazeneca' },
    ],
  },

  {
    id: 'fluticasona_salmeterol',
    molecula: 'Fluticasona/Salmeterol',
    nome_generico: 'Propionato de Fluticasona + Xinafoato de Salmeterol',
    sinonimos: ['seretide', 'advair', 'fluticasona salmeterol', 'ics laba fluticasona'],
    categoria: 'respiratory',
    classe: 'ICS/LABA',
    subclasse: 'Combinação fixa ICS (fluticasona propionato) + LABA (salmeterol)',
    indicacoes_principais: [
      'Asma persistente moderada-grave (GINA step 3–5)',
      'DPOC com eosinofilia (GOLD)',
    ],
    dose_adulto: {
      habitual: '1 inalação 2×/dia',
      min: '100/50 mcg 2×/dia',
      max: '500/50 mcg 2×/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['2×/dia (manhã e noite)'],
      instrucoes: 'Diskus: abrir e inalar profundamente; segurar 10 s. MDI: agitar e usar com espaçador. Lavar boca. NÃO pode ser usado para SMART (salmeterol tem início lento).',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Monitorar — CYP3A4' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Taquiarritmias', 'Broncoespasmo agudo não controlado'],
    interacoes_importantes: [
      { com: 'Ritonavir / inibidores CYP3A4', severidade: 'contraindicado', descricao: 'Aumento drástico de fluticasona — insuficiência adrenal' },
      { com: 'Beta-bloqueadores não seletivos', severidade: 'grave', descricao: 'Antagonismo broncodilatador' },
    ],
    alertas_especiais: [
      'Salmeterol tem início lento (10–20 min) — NÃO pode ser usado como resgate (diferente de Symbicort SMART)',
      'Manter SABA separado para resgate agudo',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Seretide®', laboratorio: 'GSK', concentracoes: ['100/50 mcg', '250/50 mcg', '500/50 mcg'], formas: ['Diskus', 'Aerossol MDI'] },
    ],
  },

  {
    id: 'fluticasona_ff_vilanterol',
    uso_pediatrico: 'nao_aplicavel',
    molecula: 'Fluticasona Furoato/Vilanterol',
    nome_generico: 'Furoato de Fluticasona + Trifenatato de Vilanterol',
    sinonimos: ['breo', 'relvar', 'fluticasona vilanterol', 'ics laba 1x dia', 'breo ellipta'],
    categoria: 'respiratory',
    classe: 'ICS/LABA',
    subclasse: 'Combinação fixa ICS (fluticasona furoato) + LABA (vilanterol) — 1×/dia, inalador Ellipta',
    indicacoes_principais: [
      'Asma persistente moderada-grave — 1×/dia (GINA step 3–5)',
      'DPOC — base de Trelegy® (triple therapy)',
    ],
    dose_adulto: {
      habitual: '92/22 mcg 1×/dia',
      min: '92/22 mcg/dia',
      max: '184/22 mcg/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['1×/dia (manhã)'],
      instrucoes: 'Ellipta: abrir cobertura → inalar profundamente → fechar. Lavar boca. Uma inalação por dia é suficiente.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Broncoespasmo agudo', 'Insuficiência hepática grave'],
    interacoes_importantes: [
      { com: 'Inibidores CYP3A4 potentes (cetoconazol, ritonavir)', severidade: 'contraindicado', descricao: 'Supressão adrenal grave' },
    ],
    alertas_especiais: [
      'Vantagem: 1×/dia — melhor adesão',
      'Base do Trelegy® Ellipta (adiciona umeclidínio para triple ICS/LABA/LAMA)',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Breo® Ellipta', laboratorio: 'GSK', concentracoes: ['92/22 mcg', '184/22 mcg'], formas: ['Pó inalatório Ellipta'] },
    ],
  },

  {
    id: 'beclometasona_formoterol',
    molecula: 'Beclometasona/Formoterol',
    nome_generico: 'Dipropionato de Beclometasona (extrafina) + Fumarato de Formoterol',
    sinonimos: ['foster', 'beclometasona formoterol', 'ics laba extrafino', 'foster 100'],
    categoria: 'respiratory',
    classe: 'ICS/LABA',
    subclasse: 'Combinação fixa ICS/LABA — partícula extrafina (1,1 mcm) — maior deposição distal',
    indicacoes_principais: [
      'Asma persistente moderada-grave — especialmente asma de vias distais',
      'DPOC sintomático com eosinofilia',
    ],
    dose_adulto: {
      habitual: '2 inalações 2×/dia (100/6 mcg)',
      min: '1 inalação 2×/dia',
      max: '2 inalações 3×/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['2×/dia', 'SMART: disponível formulação 100/6 mcg para manutenção e resgate'],
      instrucoes: 'MDI sem necessidade de espaçador (partícula extrafina alcança alvéolos sem propelente ativo). Lavar boca. Pode usar como SMART (formoterol — início rápido).',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Sem ajuste', tfg_lt_15: 'Sem ajuste', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Monitorar' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Taquiarritmias'],
    interacoes_importantes: [
      { com: 'Inibidores CYP3A4', severidade: 'moderada', descricao: 'Podem aumentar exposição à beclometasona' },
    ],
    alertas_especiais: [
      'Partícula extrafina: vantagem em asma de vias aéreas distais (hiperinsuflação, trapping de ar)',
      'Disponível também como triple (Trimbow®: beclometasona/formoterol/glicopirrônio)',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Foster®', laboratorio: 'Chiesi', concentracoes: ['100/6 mcg', '200/6 mcg/dose'], formas: ['Aerossol MDI extrafina'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // LABA/LAMA — Combinações Fixas Duplas
  // ══════════════════════════════════════════════════════════════

  {
    id: 'indacaterol_glicopirronio',
    uso_pediatrico: 'nao_aplicavel',
    molecula: 'Indacaterol/Glicopirrônio',
    nome_generico: 'Maleato de Indacaterol + Brometo de Glicopirrônio',
    sinonimos: ['ultibro', 'indacaterol glicopirronio', 'laba lama ultibro', 'laba lama breezhaler'],
    categoria: 'respiratory',
    classe: 'LABA/LAMA',
    subclasse: 'Dupla broncodilatação de longa ação — 1×/dia — DPOC',
    indicacoes_principais: [
      'DPOC moderada-grave — broncodilatação máxima (GOLD B/E — quando um LABA ou LAMA insuficiente)',
      'Primeira escolha em DPOC sem eosinofilia > 300/μL (sem indicação de ICS)',
    ],
    dose_adulto: {
      habitual: '1 cápsula 1×/dia (110/50 mcg) — Breezhaler',
      min: '1 cápsula/dia',
      max: '1 cápsula/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['1×/dia (manhã)'],
      instrucoes: 'Breezhaler: perfurar cápsula e inalar profundamente. Verificar cápsula vazia. GOLD 2025: preferência sobre monoterapia com LABA ou LAMA em DPOC sintomático.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Cautela', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Glaucoma de ângulo fechado', 'Retenção urinária grave'],
    interacoes_importantes: [
      { com: 'Outros LAMAs (tiotrópio, umeclidínio)', severidade: 'moderada', descricao: 'Duplicidade de LAMA — não combinar' },
    ],
    alertas_especiais: [
      'GOLD 2025: LABA/LAMA preferido sobre monoterapia em DPOC grupos B/E',
      'Não indicado em asma como monoterapia',
      'Boca seca e retenção urinária: efeito anticolinérgico — monitorar',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Ultibro® Breezhaler', laboratorio: 'Novartis', concentracoes: ['110/50 mcg'], formas: ['Pó inalatório (cápsula)'], lab_id: 'novartis' },
    ],
  },

  {
    id: 'vilanterol_umeclidinio',
    uso_pediatrico: 'nao_aplicavel',
    molecula: 'Vilanterol/Umeclidínio',
    nome_generico: 'Trifenatato de Vilanterol + Brometo de Umeclidínio',
    sinonimos: ['anoro', 'vilanterol umeclidinio', 'laba lama anoro', 'anoro ellipta'],
    categoria: 'respiratory',
    classe: 'LABA/LAMA',
    subclasse: 'Dupla broncodilatação 24h — 1×/dia — inalador Ellipta',
    indicacoes_principais: [
      'DPOC moderada-grave (GOLD B/E — dupla broncodilatação)',
    ],
    dose_adulto: {
      habitual: '22/55 mcg 1×/dia — Ellipta',
      min: '22/55 mcg/dia',
      max: '22/55 mcg/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['1×/dia (mesma hora)'],
      instrucoes: 'Ellipta: abrir e inalar profundamente. Uma inalação por dia. Lavar boca (vilanterol é LABA — mínimo ICS).',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Cautela', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Sem ajuste', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Glaucoma de ângulo fechado', 'Retenção urinária grave'],
    interacoes_importantes: [
      { com: 'Outros LAMAs', severidade: 'moderada', descricao: 'Duplicidade anticolinérgica' },
    ],
    alertas_especiais: ['GOLD 2025: dupla broncodilatação LABA/LAMA superior a monoterapia em DPOC sintomático', 'Base para triple: Trelegy® (+ fluticasona furoato)'],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Anoro® Ellipta', laboratorio: 'GSK', concentracoes: ['22/55 mcg'], formas: ['Pó inalatório Ellipta'] },
    ],
  },

  {
    id: 'olodaterol_tiotropio',
    uso_pediatrico: 'nao_aplicavel',
    molecula: 'Olodaterol/Tiotrópio',
    nome_generico: 'Cloridrato de Olodaterol + Brometo de Tiotrópio',
    sinonimos: ['spiolto', 'olodaterol tiotropio', 'laba lama respimat', 'spiolto respimat'],
    categoria: 'respiratory',
    classe: 'LABA/LAMA',
    subclasse: 'Dupla broncodilatação 24h — 1×/dia — inalador Respimat',
    indicacoes_principais: ['DPOC moderada-grave (GOLD B/E)'],
    dose_adulto: {
      habitual: '2 jatos 1×/dia (2,5/2,5 mcg por jato = 5/5 mcg total)',
      min: '2 jatos/dia',
      max: '2 jatos/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['1×/dia (manhã)'],
      instrucoes: 'Respimat: 2 jatos. Inalar devagar e profundamente. Sem propelente CFC — nebulização suave.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Monitorar', tfg_30_15: 'Cautela', tfg_lt_15: 'Cautela', dialisavel: false },
    ajuste_hepatico: { child_a: 'Sem ajuste', child_b: 'Cautela', child_c: 'Cautela' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Glaucoma de ângulo fechado', 'Retenção urinária grave'],
    interacoes_importantes: [
      { com: 'Outros anticolinérgicos', severidade: 'moderada', descricao: 'Duplicidade LAMA' },
    ],
    alertas_especiais: ['Respimat: nebulização lenta e suave — técnica mais fácil para idosos com dificuldade de coordenação'],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Spiolto® Respimat', laboratorio: 'Boehringer Ingelheim', concentracoes: ['2,5/2,5 mcg/jato'], formas: ['Solução inalatória Respimat'] },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ICS/LABA/LAMA — Triple Therapy
  // ══════════════════════════════════════════════════════════════

  {
    id: 'fluticasona_ff_vilanterol_umeclidinio',
    uso_pediatrico: 'nao_aplicavel',
    molecula: 'Fluticasona Furoato/Vilanterol/Umeclidínio',
    nome_generico: 'FF/Vilanterol/Umeclidínio (Trelegy)',
    sinonimos: ['trelegy', 'triple therapy ellipta', 'ics laba lama 1x dia', 'trelegy ellipta'],
    categoria: 'respiratory',
    classe: 'ICS/LABA/LAMA',
    subclasse: 'Triple inalatória de longa ação — 1×/dia — inalador Ellipta',
    indicacoes_principais: [
      'DPOC grave/muito grave (GOLD E) com exacerbações frequentes + eosinófilos elevados',
      'Asma grave não controlada em GINA step 5 (off-label em alguns cenários)',
      'DPOC: triple preferred quando LABA/LAMA insuficiente + eosinófilos ≥ 150/μL',
    ],
    dose_adulto: {
      habitual: '1 inalação 1×/dia (92/22/55 mcg)',
      min: '1 inalação/dia',
      max: '1 inalação/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['1×/dia (manhã — mesma hora)'],
      instrucoes: 'Ellipta: abrir cobertura → inalar profundamente → fechar → lavar boca. Estudo IMPACT (2018): triple vs dupla LABA/LAMA reduziu exacerbações em 25% e mortalidade em DPOC grave.',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Cautela', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hipersensibilidade a qualquer componente', 'Insuficiência hepática grave', 'Glaucoma de ângulo fechado', 'Retenção urinária grave'],
    interacoes_importantes: [
      { com: 'Inibidores CYP3A4 (ritonavir, cetoconazol)', severidade: 'contraindicado', descricao: 'Supressão adrenal' },
    ],
    alertas_especiais: [
      'IMPACT trial: triple vs LABA/LAMA → redução de exacerbações graves (31%), hospitalizações e mortalidade em DPOC grave',
      'GOLD 2025: indicado quando LABA/LAMA insuficiente + eosinófilos ≥ 150/μL + exacerbações',
      'Lavar boca obrigatório (ICS)',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Trelegy® Ellipta', laboratorio: 'GSK', concentracoes: ['92/22/55 mcg'], formas: ['Pó inalatório Ellipta'] },
    ],
  },

  {
    id: 'budesonida_formoterol_glicopirronio',
    uso_pediatrico: 'nao_aplicavel',
    molecula: 'Budesonida/Formoterol/Glicopirrônio',
    nome_generico: 'Budesonida + Fumarato de Formoterol + Brometo de Glicopirrônio',
    sinonimos: ['trixeo', 'triple turbuhaler', 'ics laba lama budesonida', 'trixeo aerosphere'],
    categoria: 'respiratory',
    classe: 'ICS/LABA/LAMA',
    subclasse: 'Triple inalatória de longa ação — 2×/dia — inalador Aerosphere',
    indicacoes_principais: [
      'DPOC grave/muito grave (GOLD E) — triple quando dupla insuficiente',
    ],
    dose_adulto: {
      habitual: '2 inalações 2×/dia (320/9,6/14,4 mcg por inalação)',
      min: '2 inalações 2×/dia',
      max: '2 inalações 2×/dia',
      unidade: 'mcg',
      via: 'Inalatório',
      frequencias: ['2×/dia'],
      instrucoes: 'MDI Aerosphere: agitar, acionar após inspiração lenta. Lavar boca. Diferente do Trelegy (1×/dia, Ellipta).',
    },
    ajuste_renal: { normal: 'Sem ajuste', tfg_60_30: 'Sem ajuste', tfg_30_15: 'Cautela', tfg_lt_15: 'Cautela', dialisavel: false },
    ajuste_hepatico: { child_a: 'Cautela', child_b: 'Cautela', child_c: 'Monitorar' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Glaucoma de ângulo fechado', 'Retenção urinária'],
    interacoes_importantes: [
      { com: 'Inibidores CYP3A4', severidade: 'moderada', descricao: 'Aumento da exposição sistêmica aos ICS' },
    ],
    alertas_especiais: ['Estudo ETHOS: triple vs dupla → redução de exacerbações moderadas-graves em DPOC', 'Lavar boca obrigatório'],
    uso_gestante: 'avaliar',
    uso_lactante: 'avaliar',
    marcas: [
      { nome: 'Trixeo® Aerosphere', laboratorio: 'AstraZeneca', concentracoes: ['320/9,6/14,4 mcg/inalação'], formas: ['Aerossol MDI'], lab_id: 'astrazeneca' },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // METILXANTINAS
  // ══════════════════════════════════════════════════════════════

  {
    id: 'teofilina',
    molecula: 'Teofilina',
    nome_generico: 'Teofilina',
    sinonimos: ['teofilina', 'aminofilina', 'theo-dur', 'theophylline', 'metilxantina', 'broncodilatador oral'],
    categoria: 'respiratory',
    classe: 'Metilxantina',
    subclasse: 'Inibidor não seletivo de fosfodiesterase — broncodilatador oral de fraca potência',
    indicacoes_principais: [
      'DPOC — broncodilatação adicional (3ª linha; quando LABAs/LAMAs insuficientes)',
      'Asma refratária grave (adjuvante — baixas doses)',
      'Apneia da prematuridade (aminofilina IV — uso neonatal)',
    ],
    dose_adulto: {
      habitual: '200–400 mg VO 2×/dia (liberação prolongada)',
      min: '200 mg 2×/dia',
      max: '600 mg/dia (titulação pelo nível sérico)',
      unidade: 'mg',
      via: 'VO',
      frequencias: ['2×/dia (LP)', '3–4×/dia (liberação imediata)'],
      instrucoes: 'NÍVEL SÉRICO ALVO: 5–10 mcg/mL (eficácia com menor toxicidade). Tomar com refeição. Dose inicial baixa, titular lentamente. JANELA TERAPÊUTICA ESTREITA.',
    },
    ajuste_renal: {
      normal: '200–400 mg 2×/dia',
      tfg_60_30: 'Sem ajuste formal (excreção hepática) — monitorar nível sérico',
      tfg_30_15: 'Cautela — monitorar nível',
      tfg_lt_15: 'Cautela — nível sérico mais frequente',
      dialisavel: false,
    },
    ajuste_hepatico: { child_a: 'Reduzir 30–50%', child_b: 'Reduzir 50% — nível sérico', child_c: 'Contraindicado' },
    contraindicacoes_rapidas: ['Hipersensibilidade', 'Arritmias graves', 'Epilepsia não controlada', 'Úlcera péptica ativa'],
    interacoes_importantes: [
      { com: 'Ciprofloxacino / Claritromicina', severidade: 'grave', descricao: 'Inibição CYP1A2 — teofilina dobra. Convulsões, arritmias' },
      { com: 'Rifampicina / Carbamazepina / Fenitoína', severidade: 'moderada', descricao: 'Indutores CYP1A2 — reduzem teofilina — perda de efeito' },
      { com: 'Cimetidina', severidade: 'moderada', descricao: 'Aumenta teofilina — toxicidade' },
      { com: 'Tabagismo', severidade: 'moderada', descricao: 'Tabagismo induz CYP1A2 — necessita dose maior; cessação aumenta nível (toxicidade)' },
    ],
    alertas_especiais: [
      'JANELA TERAPÊUTICA ESTREITA: nível > 20 mcg/mL → convulsões, arritmias (potencialmente fatais)',
      'Monitorar nível sérico após ajuste de dose e antes de adicionar qualquer novo medicamento',
      'Tabagismo: fumante necessita dose 50% maior; ao parar de fumar, reduzir dose',
      'Uso em queda: substituído por LABAs/LAMAs com muito melhor perfil segurança/eficácia',
    ],
    uso_gestante: 'avaliar',
    uso_lactante: 'risco',
    marcas: [
      { nome: 'Euphyllin® LP', laboratorio: 'Nycomed', concentracoes: ['200 mg', '300 mg', '400 mg'], formas: ['Comprimido LP'] },
      { nome: 'Teofilina EMS', laboratorio: 'EMS', concentracoes: ['100 mg', '200 mg'], formas: ['Comprimido'] },
    ],
  },

];
