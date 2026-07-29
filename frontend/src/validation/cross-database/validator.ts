// ============================================================
// PRESCREVE-AI — RM-24: Cross Database Validator
//
// Compara as 5 fontes farmacológicas internas e reporta divergências.
// Read-only sobre as fontes legadas (camada de validação autorizada).
//
// RM-52 (RM41-014): `lab-catalog.ts` (13 laboratórios) já era consumido
// por `pharma-core/migrate.ts` na construção canônica, mas NUNCA entrava
// nesta comparação — conflitos de marca/molécula introduzidos por essa
// 5ª fonte eram invisíveis ao gate RM-24. Adicionada como `LAB_CATALOG`.
// ============================================================

import { getAllDrugs } from '@/lib/pharma-database';
import { EUROFARMA_CATALOG } from '@/lib/eurofarma-sync';
import { PEDIATRIC_DOSES } from '@/lib/pediatric-engine';
import { MEDICAMENTOS_DOSAGEM } from '@/lib/dosing-engine';
import { getAllLabProducts } from '@/lib/lab-catalog';
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
  LAB_CATALOG: 'Lab catalog (ANVISA)',
} as const;

// RM-54: uma molécula pode ser referenciada por outra fonte usando o nome
// completo/farmacopeico (ex.: lab-catalog "Insulina Isófana Humana (NPH)")
// enquanto o PHARMA_DB usa uma forma abreviada como `molecula` (ex.:
// "Insulina NPH", com o nome completo em `nome_generico`) — sem checar
// `nome_generico`/`sinonimos`, isso gerava um falso positivo de
// "medicamento_ausente" para uma molécula que já existe, só com grafia
// diferente entre os campos. `toMoleculeId` continua sendo o único
// mecanismo de canonicalização (nenhum mapa de sinônimos hardcoded) —
// aqui só amplia-se QUAIS campos de cada droga do PHARMA_DB são
// submetidos a ele para checar presença.
function pharmaAliasKeys(d: { molecula: string; nome_generico?: string; sinonimos?: string[] }): Set<string> {
  const keys = new Set<string>();
  keys.add(toMoleculeId(d.molecula));
  if (d.nome_generico) keys.add(toMoleculeId(d.nome_generico));
  for (const s of d.sinonimos ?? []) keys.add(toMoleculeId(s));
  return keys;
}

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
  const lab: SourceEntry[] = getAllLabProducts().map((p) => ({
    key: toMoleculeId(p.molecula),
    name: p.molecula,
    dose: p.posologia_aprovada,
    brand: p.nome_comercial,
  }));
  return {
    [SOURCES.PHARMA_DB]: pharma,
    [SOURCES.EUROFARMA]: euro,
    [SOURCES.CLINICAL_RULES]: clinical,
    [SOURCES.PRESCRIPTION]: rx,
    [SOURCES.LAB_CATALOG]: lab,
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
  const lab = keySet(src[SOURCES.LAB_CATALOG]);
  const findings: SyncFinding[] = [];

  // RM-54: chaves alternativas (nome_generico/sinonimos) de cada droga do
  // PHARMA_DB — usadas SÓ para decidir presença/ausência (nunca para
  // divergência de nome/dose, que continua comparando pela chave primária
  // de `molecula`). Ver `pharmaAliasKeys` para o porquê.
  const pharmaAllKeys = new Set<string>();
  for (const d of getAllDrugs()) for (const k of pharmaAliasKeys(d)) pharmaAllKeys.add(k);
  const pharmaTemAlias = (key: string) => pharma.has(key) || pharmaAllKeys.has(key);

  // ── 1. Medicamentos ausentes ──────────────────────────────
  // Eurofarma comercializa um ativo ausente na base clínica principal.
  for (const [key, e] of euro) {
    if (!pharmaTemAlias(key)) {
      // Combinações comerciais (ex.: "A + B") estão fora do escopo do PHARMA_DB,
      // que é uma base de moléculas isoladas — divergência esperada (low).
      const isCombo = /\+/.test(e.name);
      findings.push({
        tipo: 'medicamento_ausente',
        gravidade: isCombo ? 'low' : 'medium',
        chave: key,
        fontes: `${SOURCES.EUROFARMA} ✗ ${SOURCES.PHARMA_DB}`,
        detalhe: isCombo
          ? `Combinação comercial "${e.name}" (${e.brand ?? '?'}) fora do escopo do PHARMA_DB (moléculas isoladas).`
          : `"${e.name}" (${e.brand ?? '?'}) existe no catálogo Eurofarma mas não no PHARMA_DB.`,
        correcaoSugerida: isCombo
          ? 'Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente.'
          : 'Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo Eurofarma.',
        aceito: isCombo,
      });
    }
  }
  // Regra clínica (pediatria) referencia ativo ausente no PHARMA_DB.
  for (const [key, e] of clinical) {
    if (!pharmaTemAlias(key)) {
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
    if (!pharmaTemAlias(key)) {
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
  // RM-52 (RM41-014): catálogo de laboratórios (bulas ANVISA) comercializa
  // um ativo ausente na base clínica principal — mesma checagem já
  // aplicada às demais fontes, agora estendida à 5ª fonte.
  for (const [key, e] of lab) {
    if (!pharmaTemAlias(key)) {
      const isCombo = /\+/.test(e.name);
      findings.push({
        tipo: 'medicamento_ausente',
        gravidade: isCombo ? 'low' : 'medium',
        chave: key,
        fontes: `${SOURCES.LAB_CATALOG} ✗ ${SOURCES.PHARMA_DB}`,
        detalhe: isCombo
          ? `Combinação comercial "${e.name}" (${e.brand ?? '?'}) fora do escopo do PHARMA_DB (moléculas isoladas).`
          : `"${e.name}" (${e.brand ?? '?'}) existe no catálogo de laboratórios (bula ANVISA) mas não no PHARMA_DB.`,
        correcaoSugerida: isCombo
          ? 'Aceitável: PHARMA_DB indexa moléculas isoladas.'
          : 'Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo de laboratórios.',
        aceito: isCombo,
      });
    }
  }

  // ── 2/3. Divergência de nomes e doses (PHARMA_DB × Eurofarma) ──
  for (const [key, e] of euro) {
    const p = pharma.get(key);
    if (!p) continue;
    // Divergência de nome REAL só existe quando a DCB canônica (salt-agnóstica)
    // difere. Diferenças de sal ("Losartana" vs "Losartana Potássica") já são
    // reconciliadas pelo molecule_id — não são divergências.
    if (toMoleculeId(p.name) !== toMoleculeId(e.name)) {
      findings.push({
        tipo: 'divergencia_nome',
        gravidade: 'low',
        chave: key,
        fontes: `${SOURCES.PHARMA_DB} × ${SOURCES.EUROFARMA}`,
        detalhe: `DCB canônica difere: PHARMA_DB="${p.name}" vs Eurofarma="${e.name}".`,
        correcaoSugerida: 'Padronizar a DCB entre as fontes.',
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

  // RM-54: uma chave só conta como "divergente" (risco aberto) se tiver ao
  // menos um achado NÃO crítico e NÃO aceito. Chaves cujo único achado é
  // `aceito: true` (decisão de escopo documentada, ex.: combinação
  // comercial fora do escopo do PHARMA_DB) contam em `aceitos`, não em
  // `divergentes` — continuam listadas em `findings` (nunca escondidas).
  const chavesComDivergencia = new Set(
    findings.filter((f) => f.gravidade !== 'critical' && !f.aceito).map((f) => f.chave),
  );
  const chavesAceitas = new Set(
    findings.filter((f) => f.gravidade !== 'critical' && f.aceito).map((f) => f.chave),
  );
  const criticos = findings.filter((f) => f.gravidade === 'critical').length;

  // Compatíveis: chaves presentes em ≥ 2 fontes sem divergência registrada
  // (uma chave só "aceita" conta como compatível — a decisão de escopo
  // documentada não é um risco, então não deve reduzir o número de
  // compatíveis).
  const pharma = keySet(src[SOURCES.PHARMA_DB]);
  const euro = keySet(src[SOURCES.EUROFARMA]);
  const clinical = keySet(src[SOURCES.CLINICAL_RULES]);
  const rx = keySet(src[SOURCES.PRESCRIPTION]);
  const lab = keySet(src[SOURCES.LAB_CATALOG]);
  let compativeis = 0;
  for (const k of universo) {
    const presenca = [pharma, euro, clinical, rx, lab].filter((m) => m.has(k)).length;
    if (presenca >= 2 && !chavesComDivergencia.has(k)) compativeis++;
  }

  return {
    timestamp: new Date().toISOString(),
    totalAnalisado: universo.size,
    aceitos: chavesAceitas.size,
    compativeis,
    divergentes: chavesComDivergencia.size,
    criticos,
    bySource,
    findings,
    publishOk: criticos === 0,
  };
}
