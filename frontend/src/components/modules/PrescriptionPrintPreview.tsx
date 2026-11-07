'use client';

// ============================================================
// RM-105.2/105.2.1 — Impressão em DUAS PARTES INDEPENDENTES (opção B)
//   Parte 1: receita do paciente (`ReceitaPaciente`, sem dados técnicos) — comportamento PADRÃO.
//   Parte 2: anexo técnico do prescritor — NUNCA incluído automaticamente.
//
// RM-105.2.1: são dois comandos de impressão independentes, cada um gerando um trabalho de
// impressão próprio (`data-print-mode`): a receita e o anexo NUNCA saem no mesmo documento, então
// a proteção contra entrega indevida do anexo não depende de o usuário separar páginas à mão.
// O anexo só existe no DOM depois de uma ação explícita do prescritor (ver/imprimir anexo).
// O conteúdo é renderizado num portal em <body> (#print-root) para que a regra de impressão de
// globals.css oculte o resto da aplicação.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Printer, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SafetyCheckResult } from '@/lib/safety-rules';
import { montarAnexoTecnico } from '@/lib/safety-annex';
import { ReceitaPaciente, type ReceitaItem, type ReceitaMedico, type ReceitaPacienteInfo } from './ReceitaPaciente';
import { AnexoTecnicoPrescritor } from './AnexoTecnicoPrescritor';

export type ModoImpressao = 'receita' | 'anexo';

export function PrescriptionPrintPreview({
  patient, items, medico, onClose, avisoSeguranca, safetyResult, avaliadoEm,
}: {
  patient: ReceitaPacienteInfo;
  items: ReceitaItem[];
  medico: ReceitaMedico;
  onClose: () => void;
  /** RM-104: só preenchido quando a verificação NÃO foi completa. Aparece na tela, nunca na receita impressa. */
  avisoSeguranca?: string | null;
  /** Resultado da avaliação de segurança: usado SOMENTE no anexo técnico do prescritor. */
  safetyResult: SafetyCheckResult | null;
  avaliadoEm: string | null;
}) {
  /** Qual parte o próximo comando de impressão imprime. Sempre volta a 'receita' depois. */
  const [modo, setModo] = useState<ModoImpressao>('receita');
  /** O anexo só entra no DOM após ação explícita do prescritor. */
  const [anexoAberto, setAnexoAberto] = useState(false);
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const anexo = montarAnexoTecnico(safetyResult, avaliadoEm);

  useEffect(() => {
    const aoTerminar = () => setModo('receita');
    window.addEventListener('afterprint', aoTerminar);
    return () => window.removeEventListener('afterprint', aoTerminar);
  }, []);

  const imprimir = useCallback((alvo: ModoImpressao) => {
    // O DOM precisa refletir o modo ANTES de abrir a impressão.
    flushSync(() => {
      if (alvo === 'anexo') setAnexoAberto(true);
      setModo(alvo);
    });
    window.print();
  }, []);

  const conteudo = (
    <div
      id="print-root"
      data-print-mode={modo}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    >
      <div className="print-sheet bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-slate-200 print:hidden">
          <p className="font-semibold text-slate-800">Pré-visualização da Receita</p>
          {avisoSeguranca && (
            <p role="alert" data-testid="print-safety-warning" className="basis-full order-last text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded px-2 py-1 mt-2">
              ⚠ Verificação de segurança incompleta — {avisoSeguranca}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1 text-xs" data-testid="print-receita" onClick={() => imprimir('receita')}>
              <Printer className="w-3.5 h-3.5" />Imprimir receita do paciente
            </Button>
            <Button size="sm" variant="outline" onClick={onClose} aria-label="Fechar"><X className="w-4 h-4" /></Button>
          </div>
          <div className="basis-full order-last border-t border-dashed border-slate-300 pt-2 mt-1">
            <p className="text-[11px] text-slate-500 mb-1">
              Anexo técnico do prescritor: não é impresso com a receita. Use os comandos abaixo apenas para o seu registro; ele não se destina ao paciente.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1 text-xs" data-testid="toggle-annex" onClick={() => setAnexoAberto(a => !a)}>
                <FileText className="w-3.5 h-3.5" />{anexoAberto ? 'Ocultar anexo técnico' : 'Ver anexo técnico do prescritor'}
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs border-amber-400 text-amber-900" data-testid="print-anexo" onClick={() => imprimir('anexo')}>
                <Printer className="w-3.5 h-3.5" />Imprimir anexo técnico (uso exclusivo do prescritor)
              </Button>
            </div>
          </div>
        </div>

        {/* Parte 1 — receita do paciente */}
        <ReceitaPaciente patient={patient} items={items} medico={medico} hoje={hoje} />

        {/* Parte 2 — anexo técnico: só existe após ação explícita */}
        {anexoAberto && <AnexoTecnicoPrescritor anexo={anexo} />}
      </div>
    </div>
  );

  return typeof document === 'undefined' ? conteudo : createPortal(conteudo, document.body);
}
