// ============================================================
// PRESCREVE-AI — RM-24: Cross Database Validator
//
// Compara as 4 fontes farmacológicas internas e reporta divergências.
// Read-only sobre as fontes legadas (camada de validação autorizada).
// ============================================================

import { getAllDrugs } from '@/lib/pharma-database';
import { EUROFARMA_CATALOG } from '@/lib/eurofarma-sync';
import { PEDIATRIC_DOSES } from '@/lib/pediatric-engine';
import { MEDICAMENTOS_DOSAGEM } from '@/lib/dosing-engine';
import { toMoleculeId, toSlug } from '@/lib/governance/data-governance';
import type { SyncFinding, SyncReport, SyncSeverity } from './types';

interface SourceEntry {
  key: string; // molecule_id canônico
  name: string;
  dose?: string;
  brand?: string;
}

const SOURCES = {
  PHARMA_DB: 'PHARMA_DB',
  EUROFARMA: 'Eurofarma',
  CLINICAL_RULES: 'Clinical rules (pediatria)',
  PRESCRIPTION: 'Prescription engine',
} as const;

function extract(): Record<string, SourceEntry[]> {
  const pharma: SourceEntry[] = getAllDrugs().map((d) => ({
    key: toMoleculeId(d.molecula || d.nome_generico),
    name: d.molecula,
    dose: d.dose_adulto?.habitual,
  }));
  const euro: SourceEntry[] = EUROFARMA_CATALOG.map((p) => ({
    key: toMoleculeId(p.molecula),
    name: p.molecula,
    dose: p.posologia_aprovada,
    brand: p.nome_comercial,
  }));
  const clinical: SourceEntry[] = PEDIATRIC_DOSES.map((e) => ({
    key: toMoleculeId(e.drugName || e.drugId),
    name: e.drugName || e.drugId,
    dose: '(regra de dose pediátrica)',
  }));
  const rx: SourceEntry[] = MEDICAMENTOS_DOSAGEM.map((m) => ({
    key: toMoleculeId(m.nome_generico || m.id),
    name: m.nome_generico,
    dose: '(regra de cálculo de dose)',
  }));
  return {
    [SOURCES.PHARMA_DB]: pharma,
    [SOURCES.EUROFARMA]: euro,
    [SOURCES.CLINICAL_RULES]: clinical,
    [SOURCES.PRESCRIPTION]: rx,
  };
}

function keySet(entries: SourceEntry[]): Map<string, SourceEntry> {
  const m = new Map<string, SourceEntry>();
  for (const e of entries) if (!m.has(e.key)) m.set(e.key, e);
  return m;
}

export function compareSources(): SyncFinding[] {
  const src = extract();
  const pharma = keySet(src[SOURCES.PHARMA_DB]);
  const euro = keySet(src[SOURCES.EUROFARMA]);
  const clinical = keySet(src[SOURCES.CLINICAL_RULES]);
  const rx = keySet(src[SOURCES.PRESCRIPTION]);
  const findings: SyncFinding[] = [];

  // ── 1. Medicamentos ausentes ──────────────────────────────
  // Eurofarma comercializa um ativo ausente na base clínica principal.
  for (const [key, e] of euro) {
    if (!pharma.has(key)) {
      findings.push({
        tipo: 'medicamento_ausente',
        gravidade: 'medium',
        chave: key,
        fontes: `${SOURCES.EUROFARMA} ✗ ${SOURCES.PHARMA_DB}`,
        detalhe: `"${e.name}" (${e.brand ?? '?'}) existe no catálogo Eurofarma mas não no PHARMA_DB.`,
        correcaoSugerida: 'Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma.',
      });
    }
  }
  // Regra clínica (pediatria) referencia ativo ausente no PHARMA_DB.
  for (const [key, e] of clinical) {
    if (!pharma.has(key)) {
      findings.push({
        tipo: 'medicamento_ausente',
        gravidade: 'high',
        chave: key,
        fontes: `${SOURCES.CLINICAL_RULES} ✗ ${SOURCES.PHARMA_DB}`,
        detalhe: `Regra de dose pediátrica para "${e.name}" sem correspondência no PHARMA_DB.`,
        correcaoSugerida: 'Alinhar o identificador do fármaco entre a regra pediátrica e o PHARMA_DB.',
      });
    }
  }
  // Prescription engine referencia ativo ausente no PHARMA_DB.
  for (const [key, e] of rx) {
    if (!pharma.has(key)) {
      findings.push({
        tipo: 'medicamento_ausente',
        gravidade: 'high',
        chave: key,
        fontes: `${SOURCES.PRESCRIPTION} ✗ ${SOURCES.PHARMA_DB}`,
        detalhe: `Motor de prescrição calcula dose para "${e.name}" sem correspondência no PHARMA_DB.`,
        correcaoSugerida: 'Alinhar o identificador entre o motor de prescrição e o PHARMA_DB.',
      });
    }
  }

  // ── 2/3. Divergência de nomes e doses (PHARMA_DB × Eurofarma) ──
  for (const [key, e] of euro) {
    const p = pharma.get(key);
    if (!p) continue;
    if (toSlug(p.name) !== toSlug(e.name)) {
      findings.push({
        tipo: 'divergencia_nome',
        gravidade: 'low',
        chave: key,
        fontes: `${SOURCES.PHARMA_DB} × ${SOURCES.EUROFARMA}`,
        detalhe: `Nome do ativo difere: PHARMA_DB="${p.name}" vs Eurofarma="${e.name}".`,
        correcaoSugerida: 'Padronizar a DCB entre as fontes (o molecule_id já é o mesmo).',
      });
    }
    const pTem = !!p.dose?.trim();
    const eTem = !!e.dose?.trim();
    if (pTem !== eTem) {
      findings.push({
        tipo: 'divergencia_dose',
        gravidade: 'medium',
        chave: key,
        fontes: `${SOURCES.PHARMA_DB} × ${SOURCES.EUROFARMA}`,
        detalhe: `Posologia presente em apenas uma fonte (PHARMA_DB=${pTem ? 'sim' : 'não'}, Eurofarma=${eTem ? 'sim' : 'não'}).`,
        correcaoSugerida: 'Completar a posologia na fonte que está sem dose.',
      });
    }
  }

  // ── 4. Conflitos: marca → princípios ativos distintos entre fontes ──
  const brandToMolecules = new Map<string, Set<string>>();
  const brandDetail = new Map<string, Set<string>>();
  const addBrand = (brand: string | undefined, key: string, fonte: string) => {
    if (!brand) return;
    const b = toSlug(brand);
    (brandToMolecules.get(b) ?? brandToMolecules.set(b, new Set()).get(b)!).add(key);
    (brandDetail.get(b) ?? brandDetail.set(b, new Set()).get(b)!).add(`${fonte}:${key}`);
  };
  for (const d of getAllDrugs()) {
    const key = toMoleculeId(d.molecula || d.nome_generico);
    for (const m of d.marcas ?? []) addBrand(m.nome, key, SOURCES.PHARMA_DB);
  }
  for (const p of EUROFARMA_CATALOG) addBrand(p.nome_comercial, toMoleculeId(p.molecula), SOURCES.EUROFARMA);
  for (const [brand, mols] of brandToMolecules) {
    if (mols.size > 1) {
      findings.push({
        tipo: 'conflito',
        gravidade: 'critical',
        chave: `marca:${brand}`,
        fontes: [...(brandDetail.get(brand) ?? [])].join(' | '),
        detalhe: `Marca "${brand}" mapeia para ${mols.size} princípios ativos distintos entre fontes: ${[...mols].join(', ')}.`,
        correcaoSugerida: 'Corrigir a atribuição da marca — uma marca deve corresponder a um único princípio ativo (exceto combinações).',
      });
    }
  }

  return findings;
}

const ORDER: Record<SyncSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function buildSyncReport(): SyncReport {
  const src = extract();
  const findings = compareSources().sort((a, b) => ORDER[a.gravidade] - ORDER[b.gravidade]);

  const universo = new Set<string>();
  const bySource: Record<string, number> = {};
  for (const [name, entries] of Object.entries(src)) {
    const ks = keySet(entries);
    bySource[name] = ks.size;
    for (const k of ks.keys()) universo.add(k);
  }

  const chavesComDivergencia = new Set(findings.filter((f) => f.gravidade !== 'critical').map((f) => f.chave));
  const criticos = findings.filter((f) => f.gravidade === 'critical').length;

  // Compatíveis: chaves presentes em ≥ 2 fontes sem divergência registrada.
  const pharma = keySet(src[SOURCES.PHARMA_DB]);
  const euro = keySet(src[SOURCES.EUROFARMA]);
  const clinical = keySet(src[SOURCES.CLINICAL_RULES]);
  const rx = keySet(src[SOURCES.PRESCRIPTION]);
  let compativeis = 0;
  for (const k of universo) {
    const presenca = [pharma, euro, clinical, rx].filter((m) => m.has(k)).length;
    if (presenca >= 2 && !chavesComDivergencia.has(k)) compativeis++;
  }

  return {
    timestamp: new Date().toISOString(),
    totalAnalisado: universo.size,
    compativeis,
    divergentes: chavesComDivergencia.size,
    criticos,
    bySource,
    findings,
    publishOk: criticos === 0,
  };
}
