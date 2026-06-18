'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { getProdutosByMolecula, EUROFARMA_CATALOG } from '@/lib/eurofarma-sync';
import { BulaViewer } from './BulaViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2, FlaskConical, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronUp, BookOpen, Shield,
} from 'lucide-react';

interface MedRef {
  molecula: string;
  classe_terapeutica: string;
  evidencia?: {
    fonte: string;
    nivel: string;
    grau: string;
  };
}

interface PrescricaoPorMarcaProps {
  med: MedRef;
  onChoice: (choice: { tipo: 'molecula' | 'marca'; marca?: string; laboratorio?: string; produto_id?: string }) => void;
}

export function PrescricaoPorMarca({ med, onChoice }: PrescricaoPorMarcaProps) {
  const { state } = useApp();
  const labPref = state.settings.preferencia_laboratorio;
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<'molecula' | 'marca' | null>(null);
  const [selectedProduto, setSelectedProduto] = useState<string | null>(null);

  // Busca produtos Eurofarma para esta molécula
  const produtos = getProdutosByMolecula(med.molecula);

  // Ordena: preferência do médico primeiro
  const produtosOrdenados = [...produtos].sort((a, b) => {
    const aPref = labPref !== 'sem_preferencia' && a.lab_id === labPref ? -1 : 0;
    const bPref = labPref !== 'sem_preferencia' && b.lab_id === labPref ? -1 : 0;
    return aPref - bPref;
  });

  const handleSelectMolecula = () => {
    setSelected('molecula');
    setSelectedProduto(null);
    onChoice({ tipo: 'molecula' });
  };

  const handleSelectMarca = (produtoId: string) => {
    const produto = EUROFARMA_CATALOG.find(p => p.id === produtoId);
    if (!produto) return;
    setSelected('marca');
    setSelectedProduto(produtoId);
    onChoice({
      tipo: 'marca',
      marca: produto.nome_comercial,
      laboratorio: produto.lab_id,
      produto_id: produto.id,
    });
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-violet-600 hover:text-violet-800 font-medium w-full"
      >
        <Building2 className="w-3.5 h-3.5" />
        Prescrever por molécula ou marca?
        {selected && (
          <span className="ml-2 text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
            {selected === 'molecula' ? '✓ Molécula' : `✓ ${EUROFARMA_CATALOG.find(p => p.id === selectedProduto)?.nome_comercial}`}
          </span>
        )}
        <span className="ml-auto">{expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {/* Alerta de separação */}
          <Alert className="border-amber-200 bg-amber-50 py-2">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <AlertDescription className="text-[11px] text-amber-700">
              A recomendação clínica é pela <strong>classe e molécula</strong>.
              A marca é apenas uma opção de prescrição e <strong>não altera a evidência científica</strong>.
            </AlertDescription>
          </Alert>

          {/* Contexto científico sempre visível */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500">Molécula:</span>
              <span className="font-semibold text-slate-800">{med.molecula}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Classe:</span>
              <span className="text-slate-700">{med.classe_terapeutica}</span>
              {med.evidencia && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">Evidência:</span>
                  <Badge variant="outline" className="text-[10px] text-green-700 border-green-200">
                    Nível {med.evidencia.nivel} • Grau {med.evidencia.grau}
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Opção: Molécula */}
          <button
            onClick={handleSelectMolecula}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
              selected === 'molecula'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selected === 'molecula' ? 'bg-emerald-500' : 'bg-slate-200'}`}>
              {selected === 'molecula'
                ? <CheckCircle2 className="w-4 h-4 text-white" />
                : <FlaskConical className="w-4 h-4 text-slate-500" />
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Molécula (genérico/similar)</p>
              <p className="text-xs text-slate-500">{med.molecula} — qualquer fabricante</p>
            </div>
          </button>

          {/* Opção: Marcas */}
          {produtosOrdenados.length > 0 ? (
            <div>
              <p className="text-xs text-slate-500 mb-1.5 ml-1">
                Marcas disponíveis{labPref !== 'sem_preferencia' ? ` (preferência: ${labPref})` : ''}:
              </p>
              <div className="space-y-1.5">
                {produtosOrdenados.map(produto => {
                  const isPreferred = labPref !== 'sem_preferencia' && produto.lab_id === labPref;
                  const isSelected = selectedProduto === produto.id;
                  return (
                    <button
                      key={produto.id}
                      onClick={() => handleSelectMarca(produto.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-violet-200 bg-white'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-violet-500' : 'bg-slate-100'}`}>
                        {isSelected
                          ? <CheckCircle2 className="w-4 h-4 text-white" />
                          : <Building2 className="w-4 h-4 text-slate-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800">{produto.nome_comercial}</p>
                          {isPreferred && (
                            <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-medium">★ Preferência</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {produto.lab_id.charAt(0).toUpperCase() + produto.lab_id.slice(1)} ·{' '}
                          {produto.apresentacoes.map(a => a.concentracao).join(', ')}
                        </p>
                      </div>
                      <BulaViewer produtoId={produto.id} trigger={
                        <span className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700">
                          <BookOpen className="w-3 h-3" />Bula
                        </span>
                      } />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                Nenhuma marca cadastrada para {med.molecula} na Biblioteca Eurofarma.
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulte a <a href="/biblioteca" className="text-violet-600 underline">Biblioteca Farmacológica</a>.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
