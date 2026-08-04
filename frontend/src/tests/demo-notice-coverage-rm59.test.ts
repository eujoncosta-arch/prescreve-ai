// RM-59 — Cobertura de sinalização: toda página classificada como
// 'demonstracao'/'hibrido' no registro central (`clinical-nav-registry.ts`)
// precisa efetivamente usar `<DemoDataNotice />` no seu código-fonte, e
// nenhuma página 'operacional_real' pode carregar esse aviso indevidamente.
//
// Não há harness de renderização para as ~30 páginas do App Router (muitas
// dependem de client-side state, hooks e providers que exigiriam mocks
// extensos) — por isso o teste verifica o USO do componente lendo o
// código-fonte de cada `page.tsx`, cruzando com a classificação declarada
// no registro. Isso também cumpre o pedido da RM-59 de um teste que impeça
// uma página demonstrativa nova de ser adicionada sem sinalização: se
// alguém marcar uma página como 'demonstracao'/'hibrido' no registro sem
// de fato renderizar o aviso, este teste falha.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { NAV_GROUPS, requerAvisoDeDemonstracao } from '@/lib/clinical-nav-registry';

const APP_DIR = join(__dirname, '..', 'app');

function pageFilePathFor(href: string): string {
  const relativo = href === '/' ? '' : href.replace(/^\//, '');
  return join(APP_DIR, relativo, 'page.tsx');
}

function lerFonteDaPagina(href: string): string {
  const caminho = pageFilePathFor(href);
  if (!existsSync(caminho)) {
    throw new Error(`Página referenciada no registro não encontrada em disco: ${caminho} (href: ${href})`);
  }
  return readFileSync(caminho, 'utf-8');
}

describe('RM-59 — cobertura de DemoDataNotice nas páginas do registro', () => {
  const todosItens = NAV_GROUPS.flatMap(g => g.items);

  it.each(
    todosItens
      .filter(i => requerAvisoDeDemonstracao(i.classification))
      .map(i => [i.href, i.classification] as const)
  )('página demonstrativa/híbrida %s (%s) usa <DemoDataNotice />', (href) => {
    const fonte = lerFonteDaPagina(href);
    expect(fonte, `${href} não importa DemoDataNotice`).toMatch(
      /import\s*\{\s*DemoDataNotice\s*\}\s*from\s*['"]@\/components\/clinical\/DemoDataNotice['"]/
    );
    expect(fonte, `${href} não renderiza <DemoDataNotice`).toMatch(/<DemoDataNotice\b/);
  });

  it.each(
    todosItens
      .filter(i => i.classification === 'operacional_real')
      .map(i => i.href)
  )('página operacional real %s NÃO usa <DemoDataNotice />', (href) => {
    const fonte = lerFonteDaPagina(href);
    expect(fonte, `${href} é operacional_real mas renderiza <DemoDataNotice> indevidamente`).not.toMatch(/<DemoDataNotice\b/);
  });

  it('nenhuma página classificada "referencia" usa <DemoDataNotice /> (evita banalizar o aviso)', () => {
    const referencia = todosItens.filter(i => i.classification === 'referencia');
    for (const item of referencia) {
      const fonte = lerFonteDaPagina(item.href);
      expect(fonte, `${item.href} é referencia mas renderiza <DemoDataNotice> — reclassifique ou remova o aviso`).not.toMatch(/<DemoDataNotice\b/);
    }
  });
});
