// RM-59 — Registro central de navegação (NAV_GROUPS): garante que toda
// entrada tem uma classificação válida e que `requerAvisoDeDemonstracao`
// reflete exatamente as classificações 'demonstracao' e 'hibrido'.
//
// O TypeScript já obriga `classification` em cada objeto literal do array
// (campo obrigatório na interface `NavItem`), mas isso só protege em tempo
// de compilação — este teste é o gate em tempo de execução equivalente,
// e também documenta o conjunto de valores válidos para quem adicionar uma
// página nova sem saber da convenção.
import { describe, it, expect } from 'vitest';
import {
  NAV_GROUPS,
  requerAvisoDeDemonstracao,
  type PageClassification,
} from '@/lib/clinical-nav-registry';

const CLASSIFICACOES_VALIDAS: PageClassification[] = [
  'operacional_real', 'referencia', 'demonstracao', 'hibrido',
];

describe('RM-59 — clinical-nav-registry', () => {
  const todosItens = NAV_GROUPS.flatMap(g => g.items);

  it('todo item de navegação tem um href, label e classification definidos', () => {
    expect(todosItens.length).toBeGreaterThan(0);
    for (const item of todosItens) {
      expect(item.href, `item sem href: ${JSON.stringify(item)}`).toBeTruthy();
      expect(item.label, `item sem label: ${item.href}`).toBeTruthy();
      expect(CLASSIFICACOES_VALIDAS, `classificação inválida em ${item.href}: ${item.classification}`)
        .toContain(item.classification);
    }
  });

  it('não há hrefs duplicados no registro (cada página aparece uma única vez)', () => {
    const hrefs = todosItens.map(i => i.href);
    const unicos = new Set(hrefs);
    expect(unicos.size, `hrefs duplicados: ${hrefs.filter((h, i) => hrefs.indexOf(h) !== i).join(', ')}`)
      .toBe(hrefs.length);
  });

  it('requerAvisoDeDemonstracao retorna true apenas para "demonstracao" e "hibrido"', () => {
    expect(requerAvisoDeDemonstracao('demonstracao')).toBe(true);
    expect(requerAvisoDeDemonstracao('hibrido')).toBe(true);
    expect(requerAvisoDeDemonstracao('operacional_real')).toBe(false);
    expect(requerAvisoDeDemonstracao('referencia')).toBe(false);
  });

  // RM-70: /validacao-real, /qualidade-hospital e /validacao-clinica foram
  // removidas do registro (decisão do dono do produto — RM-60 §10, maior
  // risco de interpretação enganosa e/ou página que não é de apoio à
  // decisão clínica). Lista cai de 17 para 14.
  it('a lista de páginas que exigem aviso corresponde ao levantamento desta RM (14 páginas)', () => {
    const exigemAviso = todosItens.filter(i => requerAvisoDeDemonstracao(i.classification)).map(i => i.href).sort();
    expect(exigemAviso).toEqual([
      '/atualizacoes-cientificas',
      '/comite',
      '/copilot',
      '/demo',
      '/digital-twin',
      '/explicabilidade',
      '/farma-analytics',
      '/governanca',
      '/insights',
      '/interoperabilidade',
      '/medicina-precisao',
      '/prognostico',
      '/rede-medica',
      '/rwe',
    ].sort());
  });

  it('apenas /explicabilidade está classificada como "hibrido" nesta rodada', () => {
    const hibridas = todosItens.filter(i => i.classification === 'hibrido').map(i => i.href);
    expect(hibridas).toEqual(['/explicabilidade']);
  });
});
