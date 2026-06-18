'use client';

import { useState } from 'react';
import type { DrugBrand } from '@/lib/types';
import { LABORATORIOS } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Building2, Search, Package, CheckCircle2, AlertTriangle } from 'lucide-react';

interface BrandComparatorProps {
  molecula: string;
  marcas: DrugBrand[];
  preferencia?: string;
}

export function BrandComparator({ molecula, marcas, preferencia = 'sem_preferencia' }: BrandComparatorProps) {
  const [search, setSearch] = useState('');

  const filtered = marcas.filter(m =>
    m.laboratorio.toLowerCase().includes(search.toLowerCase()) ||
    m.nome_comercial.toLowerCase().includes(search.toLowerCase())
  );

  const labPrefLabel = LABORATORIOS[preferencia] ?? 'Sem preferência';
  const marcaPref = marcas.find(m => m.laboratorio.toLowerCase().includes(labPrefLabel.toLowerCase()));

  return (
    <Dialog>
      <DialogTrigger>
        <span className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer transition-colors">
          <Building2 className="w-3 h-3" />
          Ver {marcas.length} marca{marcas.length !== 1 ? 's' : ''} disponíveis
        </span>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Package className="w-4 h-4 text-blue-600" />
            Marcas Disponíveis — {molecula}
          </DialogTitle>
          <p className="text-xs text-slate-500">
            A recomendação é pela molécula. Marcas são informação comercial complementar.
          </p>
        </DialogHeader>

        {/* Preferência ativa */}
        {preferencia !== 'sem_preferencia' && (
          <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-medium text-blue-800">Preferência ativa: {labPrefLabel}</span>
              {marcaPref ? (
                <span className="text-blue-600"> · {marcaPref.nome_comercial} ({marcaPref.apresentacoes.join(', ')})</span>
              ) : (
                <span className="text-slate-500"> · Sem marca disponível deste laboratório</span>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            className="pl-8 text-xs h-8"
            placeholder="Buscar por laboratório ou marca..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Brands list */}
        <div className="space-y-2">
          {filtered.map((marca, i) => {
            const isPref = preferencia !== 'sem_preferencia' &&
              marca.laboratorio.toLowerCase().includes(labPrefLabel.toLowerCase());
            return (
              <div
                key={i}
                className={`p-3 rounded-lg border transition-colors ${
                  isPref ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{marca.nome_comercial}</p>
                      {isPref && (
                        <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
                          Preferência
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {marca.laboratorio}
                    </p>
                    {marca.anvisa && (
                      <p className="text-xs text-slate-400 mt-0.5">ANVISA: {marca.anvisa}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Apresentações:</p>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {marca.apresentacoes.map((ap, j) => (
                        <span key={j} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          {molecula} {ap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-sm">
              Nenhuma marca encontrada
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Todas as marcas contêm a mesma molécula ativa. A escolha entre marcas não altera
            a indicação clínica. Dispensação sujeita à disponibilidade local.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
