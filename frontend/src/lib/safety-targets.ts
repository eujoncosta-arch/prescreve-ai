// ============================================================
// RM-105.1 — Alvos EXPLÍCITOS das regras fixas de segurança
//
// Substitui a correspondência por substring nos dois sentidos
// (`m.includes(alvo) || alvo.includes(m)`) que as regras fixas usavam
// (CRITICAL_PAIRS, ARM/K+, montelucaste). Cada regra agora declara QUAIS
// entidades ou classes reconhece; nada é aceito por fragmento de palavra.
//
// Três formas de reconhecer um alvo (todas por IGUALDADE, nunca por trecho):
//   1. entidade resolvida (por ID ou nome): o nome ativo da entidade — ou um
//      componente de combinação ("A + B", "A/B") — é igual a um nome declarado;
//   2. entidade resolvida: a classe terapêutica cadastrada COMEÇA pelo rótulo
//      declarado (ex.: "BRA — Bloqueador…", "BRA + Diurético…"), seguido de
//      fim de texto ou separador — nunca no meio de uma palavra;
//   3. entrada NÃO resolvida: o texto normalizado é IGUAL a um texto declarado
//      (sigla/alias aprovado). Esse caminho é sempre marcado como não verificado.
//
// Classes (ieca, bra, aine, isrs, imao, nitrato) são classes: o texto "isrs" nunca
// vira uma molécula. A lista de nomes do alvo "nitrato" é uma declaração de classe
// farmacológica que preserva o comportamento anterior para os nitratos orgânicos
// (nitroglicerina, mononitrato de isossorbida) e pende de aprovação clínica.
// ============================================================

export type TipoAlvo = 'classe' | 'molecula';

export interface AlvoRegra {
  chave: string;
  tipo: TipoAlvo;
  /** Nomes ativos normalizados (sem acento, minúsculos) comparados por igualdade com o nome ativo ou um componente da combinação. */
  nomes_ativos: string[];
  /** Rótulos da classe terapêutica cadastrada (prefixo + fronteira). */
  rotulos_classe: string[];
  /** Textos exatos aceitos para entradas NÃO resolvidas (siglas/aliases aprovados). */
  textos_exatos: string[];
}

export function normalizarAlvo(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function molecula(chave: string, nomes: string[] = [chave], textosExtra: string[] = []): AlvoRegra {
  const n = nomes.map(normalizarAlvo);
  return { chave, tipo: 'molecula', nomes_ativos: n, rotulos_classe: [], textos_exatos: [...new Set([...n, ...textosExtra.map(normalizarAlvo)])] };
}

function classe(chave: string, extras: Partial<Pick<AlvoRegra, 'nomes_ativos' | 'textos_exatos'>> = {}): AlvoRegra {
  const nomes = (extras.nomes_ativos ?? []).map(normalizarAlvo);
  return {
    chave, tipo: 'classe', nomes_ativos: nomes, rotulos_classe: [normalizarAlvo(chave)],
    textos_exatos: [...new Set([normalizarAlvo(chave), ...nomes, ...(extras.textos_exatos ?? []).map(normalizarAlvo)])],
  };
}

const NITRATOS = ['nitroglicerina', 'isossorbida mononitrato', 'mononitrato de isossorbida', 'isossorbida dinitrato', 'dinitrato de isossorbida', 'trinitrato de glicerila'];

/** Todos os alvos usados pelas regras fixas, por chave (as chaves dos pares são as mesmas de antes — ids de alerta preservados). */
export const ALVOS_REGRAS: Readonly<Record<string, AlvoRegra>> = Object.freeze({
  // classes cadastradas
  ieca: classe('ieca'),
  bra: classe('bra'),
  aine: classe('aine'),
  isrs: classe('isrs'),
  imao: classe('imao'),
  nitrato: classe('nitrato', { nomes_ativos: NITRATOS }),
  // contraste iodado: não há entidade cadastrada; só texto exato aprovado
  contraste: { chave: 'contraste', tipo: 'classe', nomes_ativos: [], rotulos_classe: [], textos_exatos: ['contraste', 'contraste iodado'] },
  // moléculas
  azitromicina: molecula('azitromicina'),
  amiodarona: molecula('amiodarona'),
  haloperidol: molecula('haloperidol'),
  hidroxicloroquina: molecula('hidroxicloroquina'),
  tramadol: molecula('tramadol'),
  sertralina: molecula('sertralina'),
  escitalopram: molecula('escitalopram'),
  fluoxetina: molecula('fluoxetina'),
  fenelzina: molecula('fenelzina'),
  metformina: molecula('metformina', ['metformina', 'metformin']),
  litio: molecula('litio', ['litio', 'carbonato de litio']),
  hidroclorotiazida: molecula('hidroclorotiazida'),
  varfarina: molecula('varfarina'),
  prednisolona: molecula('prednisolona'),
  // Variantes ortográficas DCB/DCI (…ina/…ino ↔ INN sem a vogal final): o casamento anterior as aceitava por
  // acidente (o texto era prefixo do alvo). Aqui são declaradas, e só elas. Preserva, p.ex., a entidade 'sildenafil'.
  moxifloxacino: molecula('moxifloxacino', ['moxifloxacino', 'moxifloxacin']),
  espironolactona: molecula('espironolactona'),
  tadalafila: molecula('tadalafila', ['tadalafila', 'tadalafil']),
  sildenafila: molecula('sildenafila', ['sildenafila', 'sildenafil']),
  vardenafila: molecula('vardenafila', ['vardenafila', 'vardenafil']),
  sacubitril: molecula('sacubitril'),
  // regras que não são pares
  arm: molecula('arm', ['espironolactona', 'eplerenona', 'finerenona']),
  montelucaste: molecula('montelucaste', ['montelucaste', 'montelucaste sodico', 'montelukast', 'montelukast sodium']),
});

export function alvoDe(chave: string): AlvoRegra {
  const a = ALVOS_REGRAS[chave];
  if (!a) throw new Error('Alvo de regra fixa não declarado: ' + chave);
  return a;
}

/** Como uma entrada resolvida foi reconhecida pelo alvo (ou null). */
export type ViaAlvo = 'nome_ativo' | 'componente_combinacao' | 'classe_cadastrada';

export function componentesDeNome(nome: string): string[] {
  return nome.split(/\s\+\s|\s\/\s|\+|\//).map(s => s.trim()).filter(Boolean);
}

function classeComecaPor(classeNorm: string, rotulo: string): boolean {
  if (!classeNorm.startsWith(rotulo)) return false;
  const prox = classeNorm.charAt(rotulo.length);
  return prox === '' || !/[a-z0-9]/.test(prox);
}

/** Entidade já resolvida (nome ativo + classe cadastrada) aciona o alvo? Igualdade/prefixo com fronteira, nunca substring livre. */
export function entidadeAciona(alvo: AlvoRegra, drug: { molecula: string; classe: string }): ViaAlvo | null {
  const nome = normalizarAlvo(drug.molecula);
  if (alvo.nomes_ativos.includes(nome)) return 'nome_ativo';
  if (componentesDeNome(nome).some(c => alvo.nomes_ativos.includes(c))) return 'componente_combinacao';
  const cl = normalizarAlvo(drug.classe);
  if (alvo.rotulos_classe.some(r => classeComecaPor(cl, r))) return 'classe_cadastrada';
  return null;
}

/** Texto de entrada NÃO resolvida aciona o alvo? Só igualdade exata com sigla/alias declarado. */
export function textoAciona(alvo: AlvoRegra, texto: string): boolean {
  return alvo.textos_exatos.includes(normalizarAlvo(texto));
}

export interface EntradaParaAlvo {
  texto: string;
  /** Presente quando a entrada foi resolvida a uma entidade (por ID ou nome). */
  drug?: { molecula: string; classe: string };
}

/** Uma entrada aciona o alvo: pela entidade, se resolvida; senão, pelo texto exato. */
export function entradaAciona(alvo: AlvoRegra, e: EntradaParaAlvo): { via: ViaAlvo | 'texto_exato_nao_resolvido' } | null {
  if (e.drug) {
    const v = entidadeAciona(alvo, e.drug);
    return v ? { via: v } : null;
  }
  return textoAciona(alvo, e.texto) ? { via: 'texto_exato_nao_resolvido' } : null;
}
