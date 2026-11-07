// ============================================================
// RM-106 — Resolução EXPLÍCITA do alvo de cada interação cadastrada (campo `with`)
//
// Problema: o campo `with` de cada interação é texto livre (491 textos distintos em 870 interações): só 75
// são o nome exato de uma molécula; o restante são classes, grupos, enumerações e agentes não
// medicamentosos. O motor casava esse texto com o nome da molécula prescrita por SUBSTRING nos dois
// sentidos (`nome.includes(with) || with.includes(nome)`): falsos positivos (fragmentos) e falsos negativos
// (classes que nenhuma substring reconhece, p.ex. "Estatinas" × sinvastatina).
//
// Este módulo classifica cada `with` em átomos e resolve cada átomo por um critério EXPLÍCITO e rastreável:
//   A. molecula_exata           nome/nome completo do princípio ativo, igual (normalizado)
//   B. componente_combinacao    componente de uma combinação ("A + B", "A/B"), igual
//   C. classe_farmacologica     classe com lista CONTROLADA (código ATC da OMS), p.ex. IECA, BRA, AINE
//   D. grupo_aprovado           grupo com definição explícita e testável (ATC ou enumeração cadastrada)
//   E. sinonimo_autorizado      sinônimo/variante já aprovado (mesmo mecanismo da RM-105.1)
//   +  nome_base_do_ativo       nome base inteiro dentro do nome com sal/forma ("Lítio" × "Carbonato de Lítio")
//   +  enumeracao_explicita     membros listados entre parênteses no próprio texto cadastrado
//   F. nao_resolvido            descritor sem definição (p.ex. "Inibidores CYP3A4" sem lista) ou ambíguo:
//                               NUNCA gera interação confirmada; é listado como interação NÃO AVALIADA
//   N. nao_medicamentoso        agente que não é item de receita (álcool, tabagismo, alimento, exame)
//
// Nenhuma classe/grupo é inventado: cada definição aponta para códigos ATC (classificação oficial da OMS) e fica
// marcada como pendente de validação clínica. Não há correspondência por fragmento de palavra.
// ============================================================

import { drugRepository } from './pharma-core';
import type { DrugEntity, Interaction } from './pharma-core';
import { categoriaNaoMolecular } from './synonym-governance';
import { componentesDeNome, normalizarAlvo } from './safety-targets';

export type TipoCorrespondencia =
  | 'molecula_exata'
  | 'sinonimo_autorizado'
  | 'componente_combinacao'
  | 'nome_base_do_ativo'
  | 'enumeracao_explicita'
  | 'classe_farmacologica'
  | 'grupo_aprovado';

export type TipoAtomo = TipoCorrespondencia | 'nao_resolvido' | 'nao_medicamentoso';

/** Força da correspondência (menor = mais forte); define o tipo registrado quando uma entidade casa por mais de um caminho. */
export const PRIORIDADE_CORRESPONDENCIA: Record<TipoCorrespondencia, number> = {
  molecula_exata: 0, sinonimo_autorizado: 1, componente_combinacao: 2, nome_base_do_ativo: 3, enumeracao_explicita: 4, classe_farmacologica: 5, grupo_aprovado: 6,
};

export interface AtomoResolvido {
  texto: string;
  tipo: TipoAtomo;
  entidades: string[];
  /** Grupo/classe controlado usado (id), quando aplicável. */
  grupo?: string;
  motivo?: string;
}

export interface AlvoInteracao {
  with: string;
  atomos: AtomoResolvido[];
  /** ID de entidade → tipo de correspondência mais forte. */
  entidades: ReadonlyMap<string, TipoCorrespondencia>;
  /** Átomos que NÃO puderam ser resolvidos (interação parcialmente não avaliada). */
  nao_resolvidos: string[];
  /** Átomos não resolvidos que parecem DESCRITORES de grupo/mecanismo (e não uma molécula ausente do catálogo): podem, na realidade, incluir medicamentos prescritos. */
  descritores_nao_resolvidos: string[];
  /** true quando o texto cadastrado nomeia um grupo aberto (ex.: "Inibidores CYP3A4") cuja lista só cobre os membros enumerados. */
  grupo_aberto: boolean;
  /** true quando TODOS os átomos medicamentosos foram resolvidos. */
  completo: boolean;
  /** true quando o alvo não é item de receita (álcool, tabagismo, alimento, exame, placeholder). */
  nao_medicamentoso: boolean;
}

// ─── Definições controladas (ATC da OMS) ────────────────────────

export interface GrupoControlado {
  id: string;
  tipo: 'classe_farmacologica' | 'grupo_aprovado';
  rotulos: string[];
  /** Prefixos de código ATC (hierarquia oficial) que definem os integrantes. */
  atc: string[];
  /** Prefixos ATC excluídos (ex.: lítio N05AN dentro de N05A). */
  atc_excluir?: string[];
  nota: string;
}

const G = (id: string, tipo: GrupoControlado['tipo'], rotulos: string[], atc: string[], nota: string, atc_excluir?: string[]): GrupoControlado => ({ id, tipo, rotulos: rotulos.map(normalizarAlvo), atc, nota, ...(atc_excluir ? { atc_excluir } : {}) });

/**
 * Lista CONTROLADA de classes e grupos. Cada integrante vem da classificação ATC cadastrada na entidade
 * (`activeIngredient.atc`); nenhum integrante é inferido por texto. Todas as definições estão pendentes de
 * validação clínica quanto à adequação ao alcance de cada interação.
 */
export const GRUPOS_CONTROLADOS: readonly GrupoControlado[] = Object.freeze([
  G('aine', 'classe_farmacologica', ['aine', 'aines', 'anti-inflamatorios nao esteroidais'], ['M01A'], 'ATC M01A — anti-inflamatórios e antirreumáticos não esteroidais (não inclui AAS, ATC B01AC06).'),
  G('ieca', 'classe_farmacologica', ['ieca', 'iecas', 'inibidores da eca', 'inibidores eca', 'inibidores da enzima conversora de angiotensina', 'ace'], ['C09A', 'C09B'], 'ATC C09A/C09B — inibidores da ECA (isolados e em associação).'),
  G('bra', 'classe_farmacologica', ['bra', 'bras', 'ara-ii', 'ara ii', 'araii', 'bloqueadores do receptor de angiotensina'], ['C09C', 'C09D'], 'ATC C09C/C09D — antagonistas da angiotensina II (isolados e em associação; inclui valsartana do ARNI).'),
  G('isrs', 'classe_farmacologica', ['isrs', 'ssri', 'ssris', 'inibidores seletivos da recaptacao de serotonina'], ['N06AB'], 'ATC N06AB — inibidores seletivos da recaptação de serotonina.'),
  G('irsn', 'classe_farmacologica', ['irsn', 'isrn', 'snri'], ['N06AX16', 'N06AX21'], 'ATC N06AX16 (venlafaxina) e N06AX21 (duloxetina) — inibidores da recaptação de serotonina e noradrenalina.'),
  G('triciclicos', 'classe_farmacologica', ['antidepressivos triciclicos', 'triciclicos', 'adt', 'tca'], ['N06AA'], 'ATC N06AA — antidepressivos tricíclicos não seletivos.'),
  G('imao', 'classe_farmacologica', ['imao', 'imaos', 'inibidores da mao', 'inibidores da monoamina oxidase'], ['N06AF', 'N06AG', 'N04BD'], 'ATC N06AF/N06AG (antidepressivos) e N04BD (inibidores da MAO-B).'),
  G('benzodiazepinicos', 'classe_farmacologica', ['benzodiazepinicos', 'benzodiazepinico', 'bzd', 'bdz', 'benzodiazepinas'], ['N05BA', 'N05CD', 'N03AE'], 'ATC N05BA (ansiolíticos), N05CD (hipnóticos benzodiazepínicos, incl. midazolam) e N03AE (clonazepam).'),
  G('opioides', 'classe_farmacologica', ['opioides', 'opioide', 'opioídes', 'opiaceos', 'narcoticos', 'analgesicos opioides'], ['N02A', 'R05DA'], 'ATC N02A (opioides) e R05DA (alcaloides do ópio antitussígenos, incl. codeína).'),
  G('barbituricos', 'classe_farmacologica', ['barbituricos', 'barbiturico'], ['N03AA', 'N05CA'], 'ATC N03AA (antiepilépticos barbitúricos) e N05CA (hipnóticos barbitúricos).'),
  G('antipsicoticos', 'classe_farmacologica', ['antipsicoticos', 'antipsicotico', 'neurolepticos'], ['N05A'], 'ATC N05A — antipsicóticos (exclui lítio, N05AN).', ['N05AN']),
  G('betabloqueadores', 'classe_farmacologica', ['betabloqueadores', 'beta-bloqueadores', 'beta bloqueadores', 'betabloqueador', 'beta-bloqueador', 'β-bloqueadores', 'bb'], ['C07'], 'ATC C07 — betabloqueadores (isolados e em associação).'),
  G('betabloqueadores_nao_seletivos', 'grupo_aprovado', ['beta-bloqueadores nao seletivos', 'betabloqueadores nao seletivos'], ['C07AA'], 'ATC C07AA — betabloqueadores não seletivos.'),
  G('diureticos', 'classe_farmacologica', ['diureticos', 'diuretico'], ['C03'], 'ATC C03 — diuréticos (todos).'),
  G('diureticos_alca', 'grupo_aprovado', ['diureticos de alca'], ['C03C'], 'ATC C03C — diuréticos de alça.'),
  G('diureticos_tiazidicos', 'grupo_aprovado', ['tiazidicos', 'diureticos tiazidicos', 'tiazidas'], ['C03A', 'C03B'], 'ATC C03A (tiazídicos) e C03B (tiazida-símiles, ex.: clortalidona).'),
  G('diureticos_poupadores_k', 'grupo_aprovado', ['diureticos poupadores de k+', 'diureticos poupadores de potassio', 'poupadores de potassio'], ['C03D'], 'ATC C03D — agentes poupadores de potássio.'),
  G('suplementos_k', 'grupo_aprovado', ['suplementos de k+', 'suplementos de k', 'suplementos de potassio'], ['A12BA'], 'ATC A12BA — suplementos de potássio.'),
  G('estatinas', 'classe_farmacologica', ['estatinas', 'estatina', 'inibidores da hmg-coa redutase'], ['C10AA', 'C10BA'], 'ATC C10AA/C10BA — inibidores da HMG-CoA redutase (isolados e em associação).'),
  G('fibratos', 'classe_farmacologica', ['fibratos', 'fibrato'], ['C10AB'], 'ATC C10AB — fibratos.'),
  G('anticoagulantes', 'classe_farmacologica', ['anticoagulantes', 'anticoagulante', 'anticoagulantes orais'], ['B01AA', 'B01AB', 'B01AE', 'B01AF'], 'ATC B01AA/AB/AE/AF — antagonistas da vitamina K, heparinas, inibidores diretos da trombina e do fator Xa.'),
  G('doacs', 'grupo_aprovado', ['doacs', 'doac', 'anticoagulantes orais diretos'], ['B01AE', 'B01AF'], 'ATC B01AE/B01AF — inibidores diretos da trombina e do fator Xa.'),
  G('antiagregantes', 'classe_farmacologica', ['antiagregantes plaquetarios', 'antiagregantes'], ['B01AC'], 'ATC B01AC — antiagregantes plaquetários.'),
  G('insulinas', 'classe_farmacologica', ['insulina', 'insulinas'], ['A10A'], 'ATC A10A — insulinas e análogos.'),
  G('antidiabeticos', 'grupo_aprovado', ['hipoglicemiantes', 'antidiabeticos', 'antidiabetico'], ['A10'], 'ATC A10 — fármacos usados no diabetes (insulinas e antidiabéticos orais/injetáveis).'),
  G('sulfonilureias', 'classe_farmacologica', ['sulfonilureias', 'sulfonilureia'], ['A10BB'], 'ATC A10BB — sulfonilureias.'),
  G('isglt2', 'classe_farmacologica', ['isglt2', 'inibidores sglt2', 'iSGLT2'], ['A10BK'], 'ATC A10BK — inibidores do SGLT2.'),
  G('glp1', 'classe_farmacologica', ['glp-1', 'glp1', 'analogos do glp-1'], ['A10BJ'], 'ATC A10BJ — análogos do GLP-1.'),
  G('tiazolidinedionas', 'classe_farmacologica', ['tiazolidinedionas', 'glitazonas'], ['A10BG'], 'ATC A10BG — tiazolidinedionas.'),
  G('corticosteroides', 'classe_farmacologica', ['corticosteroides', 'corticoides', 'corticosteroide', 'corticosteroides sistemicos', 'corticosteroides sistemicos / imunossupressores', 'corticoides cronicos'], ['H02A'], 'ATC H02A — corticosteroides de uso sistêmico.'),
  G('fluorquinolonas', 'classe_farmacologica', ['fluorquinolonas', 'quinolonas', 'fluoroquinolonas'], ['J01MA'], 'ATC J01MA — fluoroquinolonas.'),
  G('aminoglicosideos', 'classe_farmacologica', ['aminoglicosideos', 'aminoglicosideo'], ['J01G'], 'ATC J01G — aminoglicosídeos sistêmicos.'),
  G('tetraciclinas', 'classe_farmacologica', ['tetraciclinas', 'tetraciclina', 'tetraciclinase'], ['J01A'], 'ATC J01A — tetraciclinas.'),
  G('penicilinas', 'classe_farmacologica', ['penicilinas'], ['J01C'], 'ATC J01C — antibacterianos beta-lactâmicos, penicilinas.'),
  G('antibioticos', 'grupo_aprovado', ['antibioticos', 'antibioticos de amplo espectro', 'antibioticos orais'], ['J01'], 'ATC J01 — antibacterianos de uso sistêmico (grupo amplo).'),
  G('azolicos', 'classe_farmacologica', ['antifungicos azolicos', 'azolicos'], ['J02AC'], 'ATC J02AC — derivados triazólicos/imidazólicos de uso sistêmico.'),
  G('bisfosfonatos', 'classe_farmacologica', ['bisfosfonatos'], ['M05BA'], 'ATC M05BA — bisfosfonatos.'),
  G('contraceptivos_hormonais', 'classe_farmacologica', ['contraceptivos orais', 'anticoncepcionais orais', 'contraceptivos hormonais', 'contraceptivos'], ['G03A'], 'ATC G03A — contraceptivos hormonais de uso sistêmico.'),
  G('antiacidos', 'grupo_aprovado', ['antiacidos', 'antiacidos com al ou mg', 'antiacidos com al/mg'], ['A02A'], 'ATC A02A — antiácidos.'),
  G('lama', 'grupo_aprovado', ['lama', 'lamas'], ['R03BB04', 'R03BB05', 'R03BB06', 'R03BB07'], 'ATC R03BB04/05/06/07 — antagonistas muscarínicos de longa duração (tiotrópio, aclidínio, glicopirrônio, umeclidínio).'),
  G('triptanos', 'classe_farmacologica', ['triptanos', 'triptano'], ['N02CC'], 'ATC N02CC — agonistas seletivos do receptor 5-HT1.'),
  G('nitratos', 'classe_farmacologica', ['nitratos', 'nitrato'], ['C01DA'], 'ATC C01DA — nitratos orgânicos.'),
  G('ipde5', 'classe_farmacologica', ['ipde5', 'inibidores de pde5', 'inibidores da pde5', 'inibidores da fosfodiesterase-5'], ['G04BE'], 'ATC G04BE — fármacos para disfunção erétil (inibidores da PDE5).'),
  G('digitalicos', 'classe_farmacologica', ['digitalicos', 'digitalico'], ['C01AA'], 'ATC C01AA — glicosídeos digitálicos.'),
  G('antiarritmicos_ia', 'grupo_aprovado', ['antiarritmicos classe ia'], ['C01BA'], 'ATC C01BA — antiarrítmicos classe Ia.'),
  G('bloqueadores_neuromusculares', 'classe_farmacologica', ['bloqueadores neuromusculares'], ['M03A'], 'ATC M03A — relaxantes musculares de ação periférica.'),
  G('anti_hipertensivos', 'grupo_aprovado', ['anti-hipertensivos', 'antihipertensivos', 'anti hipertensivos', 'hipotensores'], ['C02', 'C03', 'C07', 'C08', 'C09'], 'ATC C02/C03/C07/C08/C09 — anti-hipertensivos, diuréticos, betabloqueadores, bloqueadores de canal de cálcio e agentes do sistema renina-angiotensina.'),
  G('anti_histaminicos_h1', 'classe_farmacologica', ['anti-histaminicos', 'anti-histaminicos (h1)', 'anti-histaminicos h1'], ['R06A'], 'ATC R06A — anti-histamínicos de uso sistêmico.'),
  G('bcc_nao_dihidropiridinicos', 'grupo_aprovado', ['bcc nao di-hidropiridinicos'], ['C08D'], 'ATC C08D — bloqueadores de canal de cálcio seletivos com efeito cardíaco direto (verapamil, diltiazem).'),
  G('sequestrantes_biliares', 'classe_farmacologica', ['sequestrantes biliares'], ['C10AC'], 'ATC C10AC — sequestrantes de ácidos biliares.'),
  G('ferro', 'grupo_aprovado', ['ferro', 'ferro oral', 'suplementos de ferro', 'ferro (suplementacao)'], ['B03A'], 'ATC B03A — preparações de ferro.'),
]);

/** Agentes que NÃO são itens de receita: nunca correspondem a medicamento prescrito. */
const NAO_MEDICAMENTOSOS: readonly string[] = [
  'alcool', 'etanol', 'alcool (etanol)', 'alcool (paracetamol)', 'tabagismo', 'tabagismo (cessacao)', 'grapefruit', 'grapefruit (suco)', 'suco citrico/maca', 'grapefruit / tangerina pomelo',
  'vitamina k (alimentos)', 'tiramina dietetica', 'citrato (incluindo sucos citricos)', 'sorbitol', 'carvao ativado', 'carvao ativado (paracetamol iv)', 'radioterapia concomitante',
  'exames laboratoriais', 'dosagem de acido urico', 'paraquat', 'cocaina', 'medicamentos orais concomitantes', 'medicamentos orais em geral', 'todos os medicamentos orais',
  'vacinas de virus vivo', 'vacinas vivas atenuadas', 'vacina influenza oral atenuada', 'outros medicamentos inalados', 'farmacos nebulizados', 'vitamina a suplementar',
  'quimioterapicos citotoxicos', 'exames laboratoriais (cetonas urinarias, cpk)',
];
const PLACEHOLDER = /^\(?\s*sem interacao/;
const QUALIFICADOR = /^(cyp|p-gp|p gp|uso |altas? doses|iv$|vo$|im$|sc$|cessacao|atual|historic|intoxica|cirurgia|basais|perfil|mesma seringa|no mesmo|>|\+ olanzapina)/;

/** Sinônimos/variantes ORTOGRÁFICAS autorizados nesta RM (E). Cada um é a mesma molécula (DCB/DCI); pendente de validação farmacêutica. */
export const ALIAS_AUTORIZADOS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  warfarina: ['varfarina'],
  sildenafila: ['sildenafil'],
  valproato: ['acido valproico', 'divalproato de sodio'],
});

// ─── Índices ────────────────────────────────────────────────────

interface Indices {
  entidades: DrugEntity[];
  porNome: Map<string, string[]>;
  porSinonimo: Map<string, string[]>;
  porComponente: Map<string, string[]>;
  porNomeBase: Map<string, string[]>;
}
let cacheIndices: Indices | null = null;

const SAIS_E_FORMAS = new Set(['de', 'da', 'do', 'dos', 'das', 'sodico', 'sodica', 'potassico', 'potassica', 'calcico', 'sulfato', 'cloridrato', 'carbonato', 'nitrato', 'maleato', 'fumarato', 'succinato', 'tartarato', 'besilato', 'mesilato', 'acetato', 'fosfato', 'cloreto', 'gluconato', 'bromidrato', 'hidrocloreto', 'medoxomila', 'axetila', 'sodium', 'potassium']);

function sufixosDeTokens(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) for (let j = i + 1; j <= tokens.length; j++) out.push(tokens.slice(i, j).join(' '));
  return out;
}

function indices(): Indices {
  if (cacheIndices) return cacheIndices;
  const entidades = drugRepository.getAll();
  const porNome = new Map<string, string[]>(); const porSinonimo = new Map<string, string[]>(); const porComponente = new Map<string, string[]>(); const porNomeBase = new Map<string, string[]>();
  const add = (m: Map<string, string[]>, k: string, id: string) => { if (!k) return; const l = m.get(k) ?? []; if (!l.includes(id)) l.push(id); m.set(k, l); };
  for (const e of entidades) {
    const nomes = [e.activeIngredient.name, e.activeIngredient.fullName ?? ''].filter(Boolean).map(normalizarAlvo);
    for (const nm of nomes) {
      add(porNome, nm, e.id);
      const comps = componentesDeNome(nm);
      if (comps.length > 1) for (const c of comps) { add(porComponente, c, e.id); }
    }
    for (const s of e.activeIngredient.sinonimos ?? []) {
      const k = normalizarAlvo(s);
      if (!categoriaNaoMolecular(s)) add(porSinonimo, k, e.id);
    }
    // nome base: sequências inteiras de palavras do nome (ou de cada componente) que NÃO são só sal/forma
    const nm0 = normalizarAlvo(e.activeIngredient.name);
    for (const comp of componentesDeNome(nm0)) {
      const tokens = comp.split(' ').filter(Boolean);
      if (tokens.length < 2) continue;
      for (const seq of sufixosDeTokens(tokens)) {
        const sem = seq.split(' ').filter(t => !SAIS_E_FORMAS.has(t));
        if (sem.length === 0 || seq === comp || seq.length < 4) continue;
        if (seq.split(' ').some(t => SAIS_E_FORMAS.has(t) && (seq.startsWith(t + ' ') || seq.endsWith(' ' + t)))) continue; // não começar/terminar em sal/forma
        add(porNomeBase, seq, e.id);
      }
    }
  }
  cacheIndices = { entidades, porNome, porSinonimo, porComponente, porNomeBase };
  return cacheIndices;
}

function membrosDoGrupo(g: GrupoControlado): string[] {
  const { entidades } = indices();
  return entidades.filter(e => {
    const atc = e.activeIngredient.atc;
    if (!atc) return false;
    if (g.atc_excluir?.some(x => atc.startsWith(x))) return false;
    return g.atc.some(p => atc.startsWith(p));
  }).map(e => e.id);
}

const GRUPO_POR_ROTULO: Map<string, GrupoControlado> = (() => {
  const m = new Map<string, GrupoControlado>();
  for (const g of GRUPOS_CONTROLADOS) for (const r of g.rotulos) if (!m.has(r)) m.set(r, g);
  return m;
})();

/** Integrantes controlados de um grupo (para relatórios e testes). */
export function integrantesDoGrupo(id: string): string[] {
  const g = GRUPOS_CONTROLADOS.find(x => x.id === id);
  return g ? membrosDoGrupo(g) : [];
}

// ─── Resolução de átomos ────────────────────────────────────────

function limparRotulo(bruto: string): string {
  let t = normalizarAlvo(bruto);
  t = t.replace(/^(ex\.?:?|especialmente|incluindo|incl\.?)\s+/, '').replace(/\s*>\s*\d+[\d.,]*\s*[a-z/]*\s*$/, '').replace(/^(outros|outras)\s+/, '');
  t = t.replace(/\s+(em overdose|em uso cronico|altas doses|cronicos?|iv|im|sc|vo|oral|topico|inalatorio)$/, '').trim();
  return t;
}

type ResolucaoRotulo = { tipos: Map<string, TipoCorrespondencia>; grupo?: string; ambiguo?: string } | null;

/** Resolve um rótulo por TODOS os caminhos explícitos (união); cada entidade guarda o caminho mais forte. */
function resolverRotulo(rotulo: string): ResolucaoRotulo {
  const ix = indices();
  const tipos = new Map<string, TipoCorrespondencia>();
  const marcar = (tipo: TipoCorrespondencia, ids: string[]) => { for (const id of ids) { const atual = tipos.get(id); if (atual === undefined || PRIORIDADE_CORRESPONDENCIA[tipo] < PRIORIDADE_CORRESPONDENCIA[atual]) tipos.set(id, tipo); } };
  let grupo: string | undefined;
  const g = GRUPO_POR_ROTULO.get(rotulo);
  if (g) { marcar(g.tipo, membrosDoGrupo(g)); grupo = g.id; }
  const nome = ix.porNome.get(rotulo); if (nome?.length) marcar('molecula_exata', nome);
  const sin = ix.porSinonimo.get(rotulo);
  if (sin?.length) {
    // sinônimo que aponta para moléculas DIFERENTES é ambíguo (nunca confirmado)
    const molecs = new Set(sin.map(id => normalizarAlvo(ix.entidades.find(e => e.id === id)!.activeIngredient.name)));
    if (molecs.size > 1 && !nome?.length && !g && !ALIAS_AUTORIZADOS[rotulo]) return { tipos, ambiguo: `sinônimo "${rotulo}" casa com moléculas diferentes (${[...molecs].join(' / ')})` };
    if (molecs.size === 1 || ALIAS_AUTORIZADOS[rotulo]) marcar('sinonimo_autorizado', sin);
  }
  const alias = ALIAS_AUTORIZADOS[rotulo];
  if (alias) for (const a of alias) { const ids = ix.porNome.get(a); if (ids?.length) marcar('sinonimo_autorizado', ids); }
  const comp = ix.porComponente.get(rotulo); if (comp?.length) marcar('componente_combinacao', comp);
  if (rotulo.length >= 4) { const base = ix.porNomeBase.get(rotulo); if (base?.length) marcar('nome_base_do_ativo', base); }
  return tipos.size || grupo ? { tipos, grupo } : null;
}

function dividirSegmentos(w: string): string[] {
  // separa por "/", "+", vírgula e " e "/" ou " fora de parênteses
  const out: string[] = []; let atual = ''; let nivel = 0;
  const pedacos = w.split('');
  for (let i = 0; i < pedacos.length; i++) {
    const ch = pedacos[i];
    if (ch === '(') nivel++;
    if (ch === ')') nivel = Math.max(0, nivel - 1);
    const resto = w.slice(i);
    if (nivel === 0 && (ch === '/' || ch === '+' || ch === ',' || /^\s(e|ou)\s/.test(resto))) {
      if (atual.trim()) out.push(atual.trim());
      atual = ''; if (/^\s(e|ou)\s/.test(resto)) i += resto.match(/^\s(e|ou)\s/)![0].length - 1;
      continue;
    }
    atual += ch;
  }
  if (atual.trim()) out.push(atual.trim());
  return out;
}

function itensDeEnumeracao(texto: string): string[] {
  return texto.split(/\s*,\s*|\s*\/\s*|\s+e\s+|\s+ou\s+|\s*\+\s*/).map(s => limparRotulo(s)).filter(Boolean);
}

/** Heurística de TRANSPARÊNCIA (não de correspondência): o átomo parece um descritor de grupo/mecanismo, não o nome de uma molécula. */
const DESCRITOR = /(inibidor|indutor|depressor|prolongador|antagonist|agonist|bloqueador|^anti|diuretic|simpatomimetic|\bqt\b|cyp|p-gp|agentes|farmacos|medicamentos|^outros|supressor|estimulante)/;
export function ehDescritorDeGrupo(texto: string): boolean { return DESCRITOR.test(normalizarAlvo(texto)); }

const memoAlvos = new Map<string, AlvoInteracao>();

/** Resolve o campo `with` em átomos explícitos. Memoizado. */
export function resolverAlvoInteracao(w: string): AlvoInteracao {
  const memo = memoAlvos.get(w);
  if (memo) return memo;
  const atomos: AtomoResolvido[] = [];
  const entidades = new Map<string, TipoCorrespondencia>();
  let grupoAberto = false;
  const registrar = (tipo: TipoCorrespondencia, ids: string[]) => { for (const id of ids) { const atual = entidades.get(id); if (atual === undefined || PRIORIDADE_CORRESPONDENCIA[tipo] < PRIORIDADE_CORRESPONDENCIA[atual]) entidades.set(id, tipo); } };

  if (PLACEHOLDER.test(normalizarAlvo(w)) || NAO_MEDICAMENTOSOS.includes(normalizarAlvo(w))) {
    const alvo: AlvoInteracao = { with: w, atomos: [{ texto: w, tipo: 'nao_medicamentoso', entidades: [] }], entidades, nao_resolvidos: [], descritores_nao_resolvidos: [], grupo_aberto: false, completo: true, nao_medicamentoso: true };
    memoAlvos.set(w, alvo); return alvo;
  }

  const segmentos = dividirSegmentos(w);
  let todosNaoMed = segmentos.length > 0;
  for (const seg of segmentos) {
    const m = /^(.*?)\s*\((.*)\)\s*$/.exec(seg);
    const rotuloBruto = m ? m[1] : seg;
    const paren = m ? m[2] : '';
    const rotulo = limparRotulo(rotuloBruto);
    const itens = paren ? itensDeEnumeracao(paren).filter(i => !QUALIFICADOR.test(i)) : [];

    if (NAO_MEDICAMENTOSOS.includes(rotulo) || NAO_MEDICAMENTOSOS.includes(normalizarAlvo(seg))) { atomos.push({ texto: seg, tipo: 'nao_medicamentoso', entidades: [] }); continue; }
    todosNaoMed = false;

    const r = rotulo ? resolverRotulo(rotulo) : null;
    if (r?.ambiguo) { atomos.push({ texto: seg, tipo: 'nao_resolvido', entidades: [], motivo: r.ambiguo }); continue; }
    if (r && r.tipos.size > 0) {
      const ids = [...r.tipos.keys()];
      const tipoAtomo = [...r.tipos.values()].reduce((m, t) => (PRIORIDADE_CORRESPONDENCIA[t] < PRIORIDADE_CORRESPONDENCIA[m] ? t : m));
      atomos.push({ texto: seg, tipo: tipoAtomo, entidades: ids, ...(r.grupo ? { grupo: r.grupo } : {}) });
      for (const [id, t] of r.tipos) registrar(t, [id]);
      // itens enumerados: membros adicionais EXPLÍCITOS do próprio texto (resolvidos exatamente)
      for (const it of itens) { const ri = resolverRotulo(it); if (ri && !ri.ambiguo) for (const [id, t] of ri.tipos) registrar(t === 'molecula_exata' || t === 'sinonimo_autorizado' || t === 'componente_combinacao' ? t : 'enumeracao_explicita', [id]); }
      continue;
    }
    // descritor sem definição própria: só vale pela enumeração explícita
    if (itens.length) {
      const idsEnum: string[] = []; const faltam: string[] = [];
      for (const it of itens) { const ri = resolverRotulo(it); if (ri && !ri.ambiguo && ri.tipos.size) { idsEnum.push(...ri.tipos.keys()); registrar('enumeracao_explicita', [...ri.tipos.keys()]); } else faltam.push(it); }
      grupoAberto = true;
      atomos.push({ texto: seg, tipo: idsEnum.length ? 'enumeracao_explicita' : 'nao_resolvido', entidades: [...new Set(idsEnum)], motivo: `descritor "${rotulo}" sem lista própria: vale apenas pelos membros enumerados${faltam.length ? ` (não resolvidos: ${faltam.join(', ')})` : ''}` });
      continue;
    }
    atomos.push({ texto: seg, tipo: 'nao_resolvido', entidades: [], motivo: `"${rotulo}" não é molécula, componente, sinônimo nem grupo controlado` });
  }
  const naoResolvidos = atomos.filter(a => a.tipo === 'nao_resolvido').map(a => a.texto);
  const alvo: AlvoInteracao = {
    with: w, atomos, entidades, nao_resolvidos: naoResolvidos, descritores_nao_resolvidos: naoResolvidos.filter(ehDescritorDeGrupo), grupo_aberto: grupoAberto,
    completo: naoResolvidos.length === 0, nao_medicamentoso: todosNaoMed && entidades.size === 0,
  };
  memoAlvos.set(w, alvo);
  return alvo;
}

/** Tipo da correspondência entre o alvo de uma interação e uma entidade prescrita (null = sem correspondência). */
export function correspondenciaDoAlvo(alvo: AlvoInteracao, entidadeId: string): TipoCorrespondencia | null {
  return alvo.entidades.get(entidadeId) ?? null;
}

export interface InteracaoResolvida {
  interacao: Interaction;
  alvo: AlvoInteracao;
}

const memoPorEntidade = new Map<string, InteracaoResolvida[]>();
/** Interações cadastradas de uma entidade com o alvo já resolvido. */
export function interacoesResolvidas(entidade: Pick<DrugEntity, 'id' | 'interactions'>): InteracaoResolvida[] {
  const m = memoPorEntidade.get(entidade.id);
  if (m) return m;
  const r = entidade.interactions.map(interacao => ({ interacao, alvo: resolverAlvoInteracao(interacao.with) }));
  memoPorEntidade.set(entidade.id, r);
  return r;
}

/** Todos os `with` distintos cadastrados (para auditoria e testes de cobertura). */
export function todosOsAlvosCadastrados(): AlvoInteracao[] {
  const w = new Set<string>();
  for (const e of indices().entidades) for (const i of e.interactions) w.add(i.with);
  return [...w].map(resolverAlvoInteracao);
}
