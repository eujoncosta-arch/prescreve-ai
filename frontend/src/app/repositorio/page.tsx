'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  SCIENTIFIC_REPOSITORY,
  TIPO_LABELS,
  TIPO_COLORS,
  getEvidenceForCondition,
  getEvidenceByType,
} from '@/lib/scientific-repository';
import type { ScientificEntry } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BookMarked,
  Search,
  Filter,
  ExternalLink,
  Calendar,
  FlaskConical,
  Pill,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const CID_GROUPS = [
  { label: 'Todos', cid: '' },
  { label: 'HAS (I10)', cid: 'I10' },
  { label: 'DM2 (E11)', cid: 'E11' },
  { label: 'IC (I50)', cid: 'I50' },
  { label: 'PAC (J18)', cid: 'J18' },
  { label: 'Asma (J45)', cid: 'J45' },
];

const TIPO_OPTIONS = [
  { label: 'Todos os tipos', value: '' },
  ...Object.entries(TIPO_LABELS).map(([value, label]) => ({ label, value })),
] as const;

const NIVEL_CORES: Record<string, string> = {
  A: 'bg-green-100 text-green-700 border-green-200',
  B: 'bg-blue-100 text-blue-700 border-blue-200',
  C: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

export default function Repositorio() {
  const [search, setSearch] = useState('');
  const [cidFilter, setCidFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SCIENTIFIC_REPOSITORY.filter(e => {
      const matchSearch = !q ||
        e.titulo.toLowerCase().includes(q) ||
        e.sociedade_ou_journal.toLowerCase().includes(q) ||
        e.moleculas_relacionadas.some(m => m.toLowerCase().includes(q)) ||
        e.classes_relacionadas.some(c => c.toLowerCase().includes(q)) ||
        e.resumo.toLowerCase().includes(q);
      const matchCid = !cidFilter ||
        e.cids_relacionados.some(c => c.startsWith(cidFilter.substring(0, 3)));
      const matchTipo = !tipoFilter || e.tipo === tipoFilter;
      return matchSearch && matchCid && matchTipo;
    });
  }, [search, cidFilter, tipoFilter]);

  const stats = useMemo(() => ({
    total: SCIENTIFIC_REPOSITORY.length,
    diretrizes: SCIENTIFIC_REPOSITORY.filter(e => e.tipo === 'diretriz').length,
    rcts: SCIENTIFIC_REPOSITORY.filter(e => e.tipo === 'ensaio_clinico').length,
    metaAnalises: SCIENTIFIC_REPOSITORY.filter(e => e.tipo === 'meta_analise').length,
    moleculas: new Set(SCIENTIFIC_REPOSITORY.flatMap(e => e.moleculas_relacionadas)).size,
  }), []);

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Repositório Científico</h1>
              <p className="text-sm text-slate-500">
                Diretrizes, meta-análises, RCTs e consensos que fundamentam as recomendações do PRESCREVE-AI
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[
              { label: 'Total', value: stats.total, color: 'bg-slate-100 text-slate-700', icon: BookMarked },
              { label: 'Diretrizes', value: stats.diretrizes, color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
              { label: 'RCTs', value: stats.rcts, color: 'bg-orange-100 text-orange-700', icon: FlaskConical },
              { label: 'Meta-análises', value: stats.metaAnalises, color: 'bg-green-100 text-green-700', icon: TrendingUp },
              { label: 'Moléculas', value: stats.moleculas, color: 'bg-purple-100 text-purple-700', icon: Pill },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className={`flex items-center gap-2 p-3 rounded-lg ${color}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold leading-none">{value}</p>
                  <p className="text-xs opacity-70">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Motor de correlação — explicação */}
          <Alert className="border-emerald-200 bg-emerald-50">
            <AlertCircle className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-xs text-emerald-700">
              <strong>Motor de correlação clínica:</strong> Diagnóstico → Diretriz → Classe terapêutica → Molécula → Marcas disponíveis.
              Cada recomendação do PRESCREVE-AI é rastreável até sua fonte científica aqui catalogada.
            </AlertDescription>
          </Alert>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por título, molécula, sociedade..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro CID */}
          <div className="flex gap-1 flex-wrap">
            {CID_GROUPS.map(({ label, cid }) => (
              <button
                key={cid}
                onClick={() => setCidFilter(cid)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                  cidFilter === cid
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 outline-none"
              value={tipoFilter}
              onChange={e => setTipoFilter(e.target.value)}
            >
              {TIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <span className="text-xs text-slate-400">{filtered.length} referências</span>
        </div>

        {/* Lista de referências */}
        <div className="space-y-3">
          {filtered.map(entry => (
            <ScientificCard key={entry.id} entry={entry} />
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <BookMarked className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhuma referência encontrada</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ScientificCard({ entry }: { entry: ScientificEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="hover:shadow-sm transition-shadow border-slate-200">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            {/* Tipo + Nível de evidência */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${TIPO_COLORS[entry.tipo]}`}>
                {TIPO_LABELS[entry.tipo]}
              </span>
              {entry.nivel_evidencia && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${NIVEL_CORES[entry.nivel_evidencia] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  Nível {entry.nivel_evidencia}
                </span>
              )}
              {entry.grau_recomendacao && (
                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                  Grau {entry.grau_recomendacao}
                </span>
              )}
            </div>

            {/* Título */}
            <p className="text-sm font-semibold text-slate-900 mb-0.5 leading-snug">
              {entry.titulo}
            </p>
            <p className="text-xs text-slate-500 mb-2">
              {entry.sociedade_ou_journal} · {entry.ano}
              {entry.doi && <span className="font-mono ml-1 text-slate-400">· {entry.doi}</span>}
            </p>

            {/* Resumo */}
            <p className={`text-xs text-slate-600 leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
              {entry.resumo}
            </p>
            {entry.resumo.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-emerald-600 hover:text-emerald-800 mt-1 font-medium"
              >
                {expanded ? 'Mostrar menos' : 'Ler mais'}
              </button>
            )}

            {/* Moléculas e CIDs */}
            <div className="mt-3 flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium">Moléculas:</span>
                {entry.moleculas_relacionadas.slice(0, 4).map(m => (
                  <span key={m} className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                    {m}
                  </span>
                ))}
                {entry.moleculas_relacionadas.length > 4 && (
                  <span className="text-[10px] text-slate-400">+{entry.moleculas_relacionadas.length - 4}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium">CIDs:</span>
                {entry.cids_relacionados.map(c => (
                  <span key={c} className="text-[10px] font-mono bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Calendar className="w-3 h-3" />
              {new Date(entry.data_inclusao).toLocaleDateString('pt-BR')}
            </div>
            {entry.doi && (
              <a
                href={`https://doi.org/${entry.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-3 h-3" />
                DOI
              </a>
            )}
            {entry.data_proxima_revisao && (
              <span className="text-[10px] text-slate-400">
                Revisão: {new Date(entry.data_proxima_revisao).getFullYear()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
