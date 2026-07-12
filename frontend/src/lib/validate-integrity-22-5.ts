/**
 * Phase 22.5 — Deep Data Integrity Validation
 * Programmatic audit of all 8 checks
 * Run: npx tsx src/lib/validate-integrity-22-5.ts
 */

import type { Anamnesis } from './types';
import { getAllDrugs } from './pharma-database';
import { EVIDENCE_DB } from './evidence-engine';
import {
  gerarMapaConhecimento, calcularCentralidade,
} from './medical-knowledge-graph';
import { gerarTimeline, CIDS_TIMELINE } from './evidence-timeline';
import { registrarRecomendacao, verificarIntegridade, listarRecomendacoes } from './recommendation-registry';

// ─── CHECK 1: MARCA ↔ MOLÉCULA ────────────────────────────────────────────────

function check1_MarcaMolecula() {
  const drugs = getAllDrugs();
  const results = {
    total_molecules: drugs.length,
    empty_marcas: [] as string[],
    duplicate_brands_within_molecule: [] as { mol: string; brand: string }[],
    cross_molecule_duplicate_brands: [] as { brand: string; molecules: string[] }[],
    molecules_by_file_count: drugs.length,
  };

  // Check empty marcas
  for (const d of drugs) {
    if (!d.marcas || d.marcas.length === 0) {
      results.empty_marcas.push(d.id);
    }
  }

  // Check duplicate brand names within same molecule
  for (const d of drugs) {
    const seen = new Set<string>();
    for (const m of (d.marcas ?? [])) {
      const key = m.nome.toLowerCase().trim();
      if (seen.has(key)) {
        results.duplicate_brands_within_molecule.push({ mol: d.id, brand: m.nome });
      }
      seen.add(key);
    }
  }

  // Check same brand name appearing in MULTIPLE molecules
  const brandToMols = new Map<string, string[]>();
  for (const d of drugs) {
    for (const m of (d.marcas ?? [])) {
      const key = m.nome.toLowerCase().trim();
      if (!brandToMols.has(key)) brandToMols.set(key, []);
      brandToMols.get(key)!.push(d.id);
    }
  }
  for (const [brand, mols] of brandToMols) {
    if (mols.length > 1) {
      results.cross_molecule_duplicate_brands.push({ brand, molecules: mols });
    }
  }

  return results;
}

// ─── CHECK 2 & 3: ATC + RxNorm COVERAGE ──────────────────────────────────────

async function check2_3_ATC_RxNorm() {
  // Import dynamically to avoid circular dep issues
  const { MOLECULA_RXNORM_MAP } = await import('./interoperability-engine');
  const drugs = getAllDrugs();
  const drugIds = new Set(drugs.map(d => d.id));

  const rxnormEntries = Object.entries(MOLECULA_RXNORM_MAP as Record<string, { rxnorm?: string; atc?: string }>);

  const withRxNorm = rxnormEntries.filter(([, v]) => v.rxnorm);
  const withATC    = rxnormEntries.filter(([, v]) => v.atc);
  const rxnormIds  = rxnormEntries.map(([k]) => k);

  // Which RxNorm-mapped molecules exist in pharma-database?
  const inDB     = rxnormIds.filter(id => drugIds.has(id));
  const notInDB  = rxnormIds.filter(id => !drugIds.has(id));

  // Which drugs have NO RxNorm mapping?
  const drugsWithoutRxNorm = drugs.filter(d => !rxnormIds.includes(d.id)).map(d => d.id);

  return {
    total_rxnorm_mapped: withRxNorm.length,
    total_atc_mapped:    withATC.length,
    rxnorm_ids_in_pharma_db: inDB.length,
    rxnorm_ids_NOT_in_pharma_db: notInDB,
    drugs_without_rxnorm: drugsWithoutRxNorm.length,
    drugs_without_rxnorm_sample: drugsWithoutRxNorm.slice(0, 20),
    coverage_pct: Math.round((inDB.length / drugs.length) * 100),
  };
}

// ─── CHECK 4: DOI / PMID COVERAGE ────────────────────────────────────────────

function check4_DOI_PMID() {
  let totalStudies = 0;
  let withDoi = 0;
  let withPmid = 0;
  let withBoth = 0;
  let withNeither = 0;
  const missingDoi: string[] = [];
  const missingPmid: string[] = [];

  for (const diag of EVIDENCE_DB) {
    for (const diretriz of diag.diretrizes) {
      for (const terapia of diretriz.terapias) {
        for (const estudo of terapia.estudos) {
        totalStudies++;
        const hasDoi  = !!estudo.doi;
        const hasPmid = !!estudo.pmid;
        if (hasDoi)  withDoi++;
        if (hasPmid) withPmid++;
        if (hasDoi && hasPmid)   withBoth++;
        if (!hasDoi && !hasPmid) { withNeither++; missingDoi.push(estudo.id); }
        if (hasDoi && !hasPmid)  missingPmid.push(estudo.id);
        if (!hasDoi && hasPmid)  missingDoi.push(estudo.id);
        }
      }
    }
  }

  return {
    total_studies: totalStudies,
    with_doi:  withDoi,
    with_pmid: withPmid,
    with_both: withBoth,
    with_neither: withNeither,
    doi_coverage_pct:  Math.round((withDoi  / Math.max(totalStudies, 1)) * 100),
    pmid_coverage_pct: Math.round((withPmid / Math.max(totalStudies, 1)) * 100),
    missing_both_ids: missingDoi.slice(0, 30),
  };
}

// ─── CHECK 5: DRUG INTERACTIONS INTEGRITY ────────────────────────────────────

function check5_Interactions() {
  const drugs = getAllDrugs();
  const drugNames = new Set(drugs.map(d => d.molecula.toLowerCase().trim()));
  const drugIds   = new Set(drugs.map(d => d.id.toLowerCase().trim()));

  let totalInteractions = 0;
  let resolvedByName = 0;
  let unresolved: { mol: string; interacts_with: string }[] = [];

  for (const drug of drugs) {
    for (const inter of (drug.interacoes_importantes ?? [])) {
      totalInteractions++;
      const target = inter.com.toLowerCase().trim();
      // Try exact name match or partial match (some entries are class names like "IECA", "BRA")
      const classNames = new Set(['ieca', 'bra', 'inibidores da mao', 'imao', 'isrs', 'snri', 'anticoagulantes', 'ain', 'aines', 'corticoides', 'benzodiazepínicos', 'opioides', 'diuréticos', 'estatinas', 'beta-bloqueadores', 'bcc', 'antiagregantes', 'hipoglicemiantes']);
      const isClassName = [...classNames].some(c => target.includes(c));
      const exactMatch  = drugNames.has(target) || drugIds.has(target);
      if (exactMatch || isClassName) {
        resolvedByName++;
      } else {
        unresolved.push({ mol: drug.id, interacts_with: inter.com });
      }
    }
  }

  const uniqueUnresolved = [...new Map(unresolved.map(u => [u.interacts_with, u])).values()];

  return {
    total_interaction_rules: totalInteractions,
    resolved_by_name_or_class: resolvedByName,
    unresolved_count: unresolved.length,
    unique_unresolved_targets: uniqueUnresolved.length,
    unresolved_sample: uniqueUnresolved.slice(0, 20),
    resolution_pct: Math.round((resolvedByName / Math.max(totalInteractions, 1)) * 100),
  };
}

// ─── CHECK 6: RECOMMENDATION REGISTRY HASH ───────────────────────────────────

function check6_RegistryHash() {
  // Create a test recommendation, verify its hash, mutate it, verify it breaks
  const draft = {
    diagnostico_id: 'has',
    diagnostico_nome: 'Hipertensão Arterial Sistêmica',
    molecula: 'enalapril',
    classe_terapeutica: 'IECA',
    indicacao: 'Redução da PA em HAS',
    guideline_sigla: 'SBC',
    guideline_versao: '2020',
    guideline_sociedade: 'Sociedade Brasileira de Cardiologia',
    guideline_ano: 2020,
    evidencias: [],
    engine: 'clinical-therapeutics' as const,
    score_confianca: 92,
    score_seguranca: 88,
    score_evidencia: 90,
  };

  const rec1 = registrarRecomendacao(draft);
  const hash1_valid = verificarIntegridade(rec1);

  // Simulate external mutation
  const mutated = { ...rec1, molecula: 'losartana' };
  const hash1_after_mutation = verificarIntegridade(mutated);

  // Create 50 more and verify all
  let allIntact = 0;
  let allFailed = 0;
  const recs: ReturnType<typeof registrarRecomendacao>[] = [];
  for (let i = 0; i < 50; i++) {
    const r = registrarRecomendacao({
      ...draft,
      molecula: `mol_${i}`,
      score_confianca: 50 + i,
      score_evidencia: 40 + i,
      score_seguranca: 60 + i,
    });
    recs.push(r);
    if (verificarIntegridade(r)) allIntact++; else allFailed++;
  }

  return {
    hash_created_correctly: hash1_valid,
    hash_detects_mutation: !hash1_after_mutation,
    batch_50_intact: allIntact,
    batch_50_failed: allFailed,
    hash_algorithm: 'djb2 (non-cryptographic)',
    vulnerable_to_collision: true,
    recommended_upgrade: 'SHA-256 via crypto.subtle',
  };
}

// ─── CHECK 7: KNOWLEDGE GRAPH ORPHANS ────────────────────────────────────────

function check7_KnowledgeGraph() {
  const drugs  = getAllDrugs();
  const drugIds = new Set(drugs.map(d => d.id));

  const graph = gerarMapaConhecimento();
  const nos   = graph.nos;
  const arestas = graph.arestas;

  // Medication nodes whose IDs don't match any drug in getAllDrugs()
  const medicamentNodes = nos.filter(n => n.tipo === 'medicamento');
  const orphanMedNodes  = medicamentNodes.filter(n => !drugIds.has(n.id));

  // Marca nodes — check if their referenced molecula IDs are valid
  const marcaNodes = nos.filter(n => n.tipo === 'marca');

  // Edge orphans: edges referencing node IDs that don't exist in nos
  const nodeIds = new Set(nos.map(n => n.id));
  const orphanEdges = arestas.filter(e => !nodeIds.has(e.origem) || !nodeIds.has(e.destino));

  // Study nodes: check if they match EVIDENCE_DB
  const studyNodes = nos.filter(n => n.tipo === 'estudo');
  const evidenceIds = new Set(
    EVIDENCE_DB.flatMap(d => d.diretrizes.flatMap(dr => dr.terapias.flatMap(t => t.estudos.map(e => e.id))))
  );
  const studyNodesNotInEvidence = studyNodes.filter(n => !evidenceIds.has(n.id) && !evidenceIds.has(n.label));

  return {
    total_nodes: nos.length,
    total_edges: arestas.length,
    medicament_nodes: medicamentNodes.length,
    orphan_medicament_nodes: orphanMedNodes.map(n => ({ id: n.id, label: n.label })),
    orphan_edge_count: orphanEdges.length,
    orphan_edges_sample: orphanEdges.slice(0, 10),
    study_nodes: studyNodes.length,
    study_nodes_not_in_evidence_db: studyNodesNotInEvidence.map(n => n.id),
    marca_nodes: marcaNodes.length,
    graph_integrity: orphanMedNodes.length === 0 && orphanEdges.length === 0 ? 'PASS' : 'FAIL',
  };
}

// ─── CHECK 8: EXPLAINABLE AI COVERAGE ────────────────────────────────────────

async function check8_ExplainableAI() {
  const { gerarExplanacao } = await import('./explainable-ai');
  const drugs = getAllDrugs();

  // Pick 20 random molecules spread across specialties
  const sample = [
    drugs.find(d => d.id === 'enalapril'),
    drugs.find(d => d.id === 'metformina'),
    drugs.find(d => d.id === 'rosuvastatina'),
    drugs.find(d => d.id === 'carvedilol'),
    drugs.find(d => d.id === 'furosemida'),
    drugs.find(d => d.id === 'omeprazol'),
    drugs.find(d => d.id === 'sertralina'),
    drugs.find(d => d.id === 'amlodipino'),
    drugs.find(d => d.id === 'losartana'),
    drugs.find(d => d.id === 'insulina_glargina'),
    // plus 10 lesser-known
    drugs[50], drugs[80], drugs[100], drugs[150], drugs[200],
    drugs[220], drugs[240], drugs[260], drugs[280], drugs[300],
  ].filter(Boolean) as typeof drugs;

  const results: { mol: string; why: boolean; why_not: boolean; confidence: number; error?: string }[] = [];

  const mockAnamnese: Anamnesis = {
    queixa_principal: 'hipertensão',
    hda: '',
    hpp: '',
    historia_familiar: '',
    habitos_vida: { tabagismo: 'nunca', etilismo: 'nao', atividade_fisica: 'sedentario', dieta: '' },
    exame_fisico: '',
    sinais_vitais: { pa_sistolica: 160, pa_diastolica: 100, fc: 78, fr: 16, temperatura: 36.5, spo2: 97 },
    laboratorio: {},
    imagem: '',
    comorbidades: ['Hipertensão'],
    medicamentos_em_uso: [],
    alergias: [],
    gestante: false,
    lactante: false,
    funcao_renal: { tfg: 90, ckd_stage: 'G1' },
    funcao_hepatica: { child_pugh: 'A' },
  };

  for (const drug of sample) {
    const suggestion = {
      id: drug.id,
      classe_terapeutica: drug.classe ?? drug.categoria,
      molecula: drug.molecula,
      nome_generico: drug.molecula,
      indicacao: drug.indicacoes_principais?.[0] ?? '',
      dose: { dose_padrao: '10mg', unidade: 'mg', via: 'oral', frequencia: '1×/dia' },
      posologia_completa: `${drug.molecula} 10mg 1×/dia`,
      evidencia: { diretriz: 'SBC', sociedade: 'SBC', ano: 2020, nivel_evidencia: { nivel: 'A' as const, grau: 'I' as const, descricao: 'Forte evidência' }, citacao: 'SBC 2020' },
      contraindicacoes: drug.contraindicacoes_rapidas ?? [],
      efeitos_adversos: [],
      monitoramento: [],
      alternativas: [],
      marcas: drug.marcas?.slice(0, 2).map(m => ({ nome_comercial: m.nome, laboratorio: m.laboratorio, apresentacoes: m.formas ?? [] })) ?? [],
    };

    try {
      const exp = gerarExplanacao(suggestion, mockAnamnese, undefined);
      results.push({
        mol: drug.id,
        why: !!exp.racionalidade,
        why_not: !!exp.limitacoes_especificas,
        confidence: exp.nivel_confianca ?? 0,
      });
    } catch (e) {
      results.push({ mol: drug.id, why: false, why_not: false, confidence: 0, error: String(e) });
    }
  }

  const passed = results.filter(r => r.why && !r.error).length;
  const errors = results.filter(r => r.error);

  return {
    molecules_tested: results.length,
    generated_why: passed,
    generated_why_pct: Math.round((passed / results.length) * 100),
    errors: errors.map(r => ({ mol: r.mol, error: r.error })),
    detail: results,
  };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.error('=== PHASE 22.5 DATA INTEGRITY VALIDATION ===');

  const t0 = performance.now();

  console.error('[1/8] Marca ↔ Molécula...');
  const c1 = check1_MarcaMolecula();

  console.error('[2+3/8] ATC + RxNorm...');
  const c23 = await check2_3_ATC_RxNorm();

  console.error('[4/8] DOI / PMID...');
  const c4 = check4_DOI_PMID();

  console.error('[5/8] Drug Interactions...');
  const c5 = check5_Interactions();

  console.error('[6/8] Registry Hash...');
  const c6 = check6_RegistryHash();

  console.error('[7/8] Knowledge Graph...');
  const c7 = check7_KnowledgeGraph();

  console.error('[8/8] Explainable AI...');
  const c8 = await check8_ExplainableAI();

  const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

  const report = {
    phase: '22.5 — Deep Data Integrity Validation',
    timestamp: new Date().toISOString(),
    elapsed_s: elapsed,

    check1_marca_molecula: {
      verdict: c1.cross_molecule_duplicate_brands.length === 0 && c1.empty_marcas.length === 0 ? 'PASS' : 'FAIL',
      total_molecules: c1.total_molecules,
      molecules_with_empty_marcas: c1.empty_marcas.length,
      empty_marcas_list: c1.empty_marcas,
      brands_duplicated_within_molecule: c1.duplicate_brands_within_molecule.length,
      brands_duplicated_within_molecule_list: c1.duplicate_brands_within_molecule,
      brands_appearing_in_multiple_molecules: c1.cross_molecule_duplicate_brands.length,
      cross_molecule_duplicates: c1.cross_molecule_duplicate_brands,
    },

    check2_atc: {
      verdict: c23.total_atc_mapped > 0 ? 'PARTIAL' : 'FAIL',
      molecules_with_atc: c23.total_atc_mapped,
      total_molecules: getAllDrugs().length,
      coverage_pct: Math.round((c23.total_atc_mapped / getAllDrugs().length) * 100),
      location: 'interoperability-engine.ts MOLECULA_RXNORM_MAP (atc field)',
      gap: 'ATC not in QuickDrug interface — only in FHIR mapping layer',
    },

    check3_rxnorm: {
      verdict: c23.rxnorm_ids_NOT_in_pharma_db.length === 0 ? 'PASS' : 'WARNING',
      molecules_with_rxnorm: c23.total_rxnorm_mapped,
      rxnorm_ids_in_pharma_db: c23.rxnorm_ids_in_pharma_db,
      rxnorm_ids_NOT_in_pharma_db: c23.rxnorm_ids_NOT_in_pharma_db,
      drugs_without_rxnorm: c23.drugs_without_rxnorm,
      drugs_without_rxnorm_sample: c23.drugs_without_rxnorm_sample,
      pharma_db_coverage_pct: c23.coverage_pct,
    },

    check4_doi_pmid: {
      verdict: c4.doi_coverage_pct >= 50 ? 'WARNING' : 'FAIL',
      total_studies: c4.total_studies,
      with_doi: c4.with_doi,
      with_pmid: c4.with_pmid,
      with_both: c4.with_both,
      with_neither: c4.with_neither,
      doi_coverage_pct: c4.doi_coverage_pct,
      pmid_coverage_pct: c4.pmid_coverage_pct,
      studies_missing_both: c4.missing_both_ids,
    },

    check5_interactions: {
      verdict: c5.resolution_pct >= 80 ? 'PASS' : 'WARNING',
      total_interaction_rules: c5.total_interaction_rules,
      resolved_count: c5.resolved_by_name_or_class,
      unresolved_count: c5.unresolved_count,
      unique_unresolved_targets: c5.unique_unresolved_targets,
      resolution_pct: c5.resolution_pct,
      unresolved_sample: c5.unresolved_sample,
    },

    check6_registry_hash: {
      verdict: c6.hash_created_correctly && c6.hash_detects_mutation ? 'PASS_WITH_WARNING' : 'FAIL',
      hash_creates_correctly: c6.hash_created_correctly,
      hash_detects_mutation: c6.hash_detects_mutation,
      batch_50_all_intact: c6.batch_50_intact === 50,
      batch_50_intact: c6.batch_50_intact,
      batch_50_failed: c6.batch_50_failed,
      algorithm: c6.hash_algorithm,
      vulnerability: c6.vulnerable_to_collision,
      recommended_upgrade: c6.recommended_upgrade,
    },

    check7_knowledge_graph: {
      verdict: c7.graph_integrity,
      total_nodes: c7.total_nodes,
      total_edges: c7.total_edges,
      medicament_nodes: c7.medicament_nodes,
      orphan_medicament_nodes_count: c7.orphan_medicament_nodes.length,
      orphan_medicament_nodes: c7.orphan_medicament_nodes,
      orphan_edge_count: c7.orphan_edge_count,
      orphan_edges_sample: c7.orphan_edges_sample,
      study_nodes: c7.study_nodes,
      study_nodes_not_in_evidence_db: c7.study_nodes_not_in_evidence_db,
      marca_nodes: c7.marca_nodes,
    },

    check8_explainable_ai: {
      verdict: c8.errors.length === 0 ? 'PASS' : 'FAIL',
      molecules_tested: c8.molecules_tested,
      generated_why_successfully: c8.generated_why,
      success_rate_pct: c8.generated_why_pct,
      errors: c8.errors,
      detail: c8.detail,
    },

    overall_verdict: {
      pass:    ['check1_marca_molecula','check5_interactions','check6_registry_hash','check8_explainable_ai'].filter(k => (({check1_marca_molecula: c1.cross_molecule_duplicate_brands.length === 0, check5_interactions: c5.resolution_pct >= 80, check6_registry_hash: c6.hash_created_correctly && c6.hash_detects_mutation, check8_explainable_ai: c8.errors.length === 0}) as Record<string,boolean>)[k]),
      warning: ['check2_atc','check3_rxnorm','check4_doi_pmid'].concat(c7.graph_integrity === 'FAIL' ? ['check7_knowledge_graph'] : []),
      fail:    c7.graph_integrity === 'FAIL' ? ['check7_knowledge_graph'] : [],
    },
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
