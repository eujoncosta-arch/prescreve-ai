// RM-59 — DemoDataNotice: renderização, semântica e acessibilidade.
//
// O projeto não tem @testing-library/react nem qualquer teste de renderização
// de componente pré-existente (só .test.ts, sem .tsx, no include do vitest).
// Usamos `renderToStaticMarkup` (react-dom/server) + `React.createElement`
// (sem sintaxe JSX, para permanecer um arquivo .ts puro) como forma mais
// simples de verificar o HTML gerado sem introduzir nova dependência.
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DemoDataNotice } from '@/components/clinical/DemoDataNotice';

describe('RM-59 — DemoDataNotice', () => {
  it('renderiza o texto padrão da variante "demo"', () => {
    const html = renderToStaticMarkup(React.createElement(DemoDataNotice));
    expect(html).toContain('Demonstração.');
    expect(html).toContain('não refletem o paciente em atendimento');
  });

  it('renderiza o texto padrão da variante "hybrid"', () => {
    const html = renderToStaticMarkup(React.createElement(DemoDataNotice, { variant: 'hybrid' }));
    expect(html).toContain('Parcialmente demonstrativo.');
    expect(html).toContain('última anamnese salva');
  });

  it('permite sobrescrever o texto via prop `description`', () => {
    const custom = 'Texto customizado para esta página específica.';
    const html = renderToStaticMarkup(React.createElement(DemoDataNotice, { description: custom }));
    expect(html).toContain(custom);
    expect(html).not.toContain('não refletem o paciente em atendimento');
  });

  it('usa role="note" (nunca role="alert") — não é um alerta clínico', () => {
    const html = renderToStaticMarkup(React.createElement(DemoDataNotice));
    expect(html).toContain('role="note"');
    expect(html).not.toContain('role="alert"');
  });

  it('expõe aria-label descrevendo a natureza do aviso', () => {
    const html = renderToStaticMarkup(React.createElement(DemoDataNotice));
    expect(html).toContain('aria-label="Aviso sobre a natureza dos dados desta página"');
  });

  it('marca a variante via atributo de dados, não apenas cor', () => {
    const demoHtml = renderToStaticMarkup(React.createElement(DemoDataNotice));
    const hybridHtml = renderToStaticMarkup(React.createElement(DemoDataNotice, { variant: 'hybrid' }));
    expect(demoHtml).toContain('data-demo-data-notice="demo"');
    expect(hybridHtml).toContain('data-demo-data-notice="hybrid"');
  });

  it('não usa as classes de cor reservadas para alertas clínicos (vermelho/laranja/âmbar)', () => {
    const html = renderToStaticMarkup(React.createElement(DemoDataNotice));
    expect(html).not.toMatch(/bg-red-|border-red-|bg-orange-|border-orange-|bg-amber-|border-amber-/);
  });

  it('renderiza o ícone informativo como decorativo (aria-hidden)', () => {
    const html = renderToStaticMarkup(React.createElement(DemoDataNotice));
    expect(html).toContain('aria-hidden="true"');
  });
});
