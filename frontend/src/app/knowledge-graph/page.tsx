'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Network, Search, Filter, ZoomIn, ZoomOut, RotateCcw,
  AlertTriangle, CheckCircle2, Info, TrendingUp, Target,
  Layers, GitBranch, Cpu, ChevronRight,
} from 'lucide-react';
import {
  gerarMapaConhecimento, calcularCentralidade, encontrarLacunas,
  buscarRelacionamentos, detectarConflitos, prepararVisualizacao,
  type TipoEntidade, type TipoRelacao,
} from '@/lib/medical-knowledge-graph';

type Aba = 'grafo' | 'centralidade' | 'lacunas' | 'conflitos' | 'busca' | 'stats';

const ABAS = [
  { id: 'grafo' as Aba,       label: 'Visualização',  icon: <Network size={13} /> },
  { id: 'centralidade' as Aba,label: 'Centralidade',  icon: <TrendingUp size={13} /> },
  { id: 'lacunas' as Aba,     label: 'Lacunas',       icon: <AlertTriangle size={13} /> },
  { id: 'conflitos' as Aba,   label: 'Conflitos',     icon: <GitBranch size={13} /> },
  { id: 'busca' as Aba,       label: 'Busca',         icon: <Search size={13} /> },
  { id: 'stats' as Aba,       label: 'Estatísticas',  icon: <Layers size={13} /> },
];

const TIPO_COR: Record<TipoEntidade, string> = {
  diagnostico:    '#6366f1', medicamento:    '#10b981', guideline:     '#f59e0b',
  mecanismo:      '#8b5cf6', estudo:         '#3b82f6', biomarcador:   '#ec4899',
  sintoma:        '#ef4444', sinal:          '#f43f5e', exame:         '#06b6d4',
  especialidade:  '#84cc16', evento_adverso: '#f97316', prognostico:   '#6b7280',
  marca:          '#a78bfa', cid:            '#6366f1', laboratorio:   '#14b8a6',
};

const TIPO_LABEL: Partial<Record<TipoEntidade, string>> = {
  diagnostico: 'Diagnóstico', medicamento: 'Medicamento', guideline: 'Diretriz',
  mecanismo: 'Mecanismo', estudo: 'Estudo', biomarcador: 'Biomarcador',
  sintoma: 'Sintoma', exame: 'Exame', especialidade: 'Especialidade',
  evento_adverso: 'Evento Adverso', prognostico: 'Prognóstico', marca: 'Marca',
};

const RELACAO_LABEL: Partial<Record<TipoRelacao, string>> = {
  DIAGNOSTICO_DIRETRIZ: 'Diretriz', DIAGNOSTICO_MEDICAMENTO: 'Tratamento',
  MEDICAMENTO_MECANISMO: 'Mecanismo', MEDICAMENTO_ESTUDO: 'Estudo',
  ESTUDO_GUIDELINE: 'Guideline', MEDICAMENTO_MARCA: 'Marca',
  SINTOMA_DIAGNOSTICO: 'Sugere', BIOMARCADOR_DIAGNOSTICO: 'Indica',
  MEDICAMENTO_EVENTO_ADVERSO: 'Adverso', EXAME_DIAGNOSTICO: 'Confirma',
  PACIENTE_PROGNOSTICO: 'Prognóstico',
};

// ── Componente SVG do grafo ────────────────────────────────────
function GrafoSVG({
  dados, noSelecionado, onSelect,
}: {
  dados: ReturnType<typeof prepararVisualizacao>;
  noSelecionado: string | null;
  onSelect: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPan(p => ({ x: p.x + e.clientX - lastMouse.current.x, y: p.y + e.clientY - lastMouse.current.y }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseUp = () => { dragging.current = false; };

  const nosMap = useMemo(() => new Map(dados.nos.map(n => [n.id, n])), [dados.nos]);

  const arestasRender = dados.arestas.slice(0, 120);
  const nosRender = dados.nos;

  return (
    <div className="relative bg-gray-900 rounded-2xl overflow-hidden" style={{ height: 480 }}>
      {/* Controles */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button onClick={() => setZoom(z => Math.min(2, z + 0.15))} className="w-8 h-8 bg-gray-800 text-white rounded-lg flex items-center justify-center hover:bg-gray-700"><ZoomIn size={13} /></button>
        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} className="w-8 h-8 bg-gray-800 text-white rounded-lg flex items-center justify-center hover:bg-gray-700"><ZoomOut size={13} /></button>
        <button onClick={() => { setZoom(0.75); setPan({ x: 0, y: 0 }); }} className="w-8 h-8 bg-gray-800 text-white rounded-lg flex items-center justify-center hover:bg-gray-700"><RotateCcw size={13} /></button>
      </div>

      <svg
        width="100%" height="100%"
        viewBox="0 0 800 480"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        style={{ cursor: dragging.current ? 'grabbing' : 'grab' }}
      >
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Arestas */}
          {arestasRender.map((a, i) => {
            const o = nosMap.get(a.origem);
            const d = nosMap.get(a.destino);
            if (!o?.x || !d?.x) return null;
            const isHighlighted = noSelecionado === a.origem || noSelecionado === a.destino;
            return (
              <line key={i}
                x1={o.x} y1={o.y} x2={d.x} y2={d.y}
                stroke={isHighlighted ? '#ffffff' : '#374151'}
                strokeWidth={isHighlighted ? 1.5 : 0.8}
                strokeOpacity={isHighlighted ? 0.9 : 0.4}
              />
            );
          })}
          {/* Nós */}
          {nosRender.map(no => {
            const cor = TIPO_COR[no.tipo] ?? '#6b7280';
            const r = 4 + (no.centralidade / 100) * 10;
            const isSelected = noSelecionado === no.id;
            const isRelated = noSelecionado
              ? dados.arestas.some(a => (a.origem === noSelecionado && a.destino === no.id) || (a.destino === noSelecionado && a.origem === no.id))
              : false;

            return (
              <g key={no.id} style={{ cursor: 'pointer' }} onClick={() => onSelect(no.id)}>
                <circle
                  cx={no.x} cy={no.y} r={isSelected ? r + 3 : r}
                  fill={cor}
                  fillOpacity={noSelecionado && !isSelected && !isRelated ? 0.3 : 1}
                  stroke={isSelected ? '#ffffff' : 'transparent'}
                  strokeWidth={2}
                />
                {(isSelected || no.centralidade >= 40) && (
                  <text x={no.x} y={(no.y ?? 0) + r + 9} textAnchor="middle"
                    fontSize={isSelected ? 9 : 7} fill="#e5e7eb" fontWeight={isSelected ? 'bold' : 'normal'}>
                    {no.label.length > 18 ? no.label.slice(0, 16) + '…' : no.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legenda */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 max-w-md">
        {Object.entries(TIPO_LABEL).slice(0, 8).map(([tipo, label]) => (
          <div key={tipo} className="flex items-center gap-1 bg-gray-800 bg-opacity-90 rounded-md px-2 py-1">
            <div className="w-2 h-2 rounded-full" style={{ background: TIPO_COR[tipo as TipoEntidade] }} />
            <span className="text-xs text-gray-300">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KnowledgeGraphPage() {
  const [aba, setAba] = useState<Aba>('grafo');
  const [noSelecionado, setNoSelecionado] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<TipoEntidade[]>([]);
  const [buscaTermo, setBuscaTermo] = useState('');

  const grafo = useMemo(() => gerarMapaConhecimento(), []);
  const centralidade = useMemo(() => calcularCentralidade(20), []);
  const lacunas = useMemo(() => encontrarLacunas(), []);
  const dadosViz = useMemo(() => prepararVisualizacao(filtroTipo.length ? filtroTipo : undefined), [filtroTipo]);
  const conflitos = useMemo(() => {
    const meds = grafo.nos.filter(n => n.tipo === 'medicamento').map(n => n.id);
    return detectarConflitos(meds);
  }, [grafo]);

  const relacionamentos = useMemo(() => noSelecionado ? buscarRelacionamentos(noSelecionado, undefined, 1) : [], [noSelecionado]);

  const noSelecionadoObj = useMemo(() => grafo.nos.find(n => n.id === noSelecionado), [noSelecionado, grafo]);

  const resultadosBusca = useMemo(() =>
    buscaTermo.length >= 2
      ? grafo.nos.filter(n => n.label.toLowerCase().includes(buscaTermo.toLowerCase()) || n.id.toLowerCase().includes(buscaTermo.toLowerCase())).slice(0, 15)
      : [],
    [buscaTermo, grafo],
  );

  const tiposUnicos = useMemo(() => [...new Set(grafo.nos.map(n => n.tipo))].sort(), [grafo]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Network size={18} className="text-cyan-600" />
              <h1 className="text-lg font-bold text-gray-900">Medical Knowledge Graph</h1>
              <span className="px-2 py-0.5 text-xs font-bold bg-cyan-100 text-cyan-700 rounded">Phase 20</span>
            </div>
            <p className="text-xs text-gray-500">{grafo.total_nos} entidades · {grafo.total_arestas} relações · {dadosViz.stats.densidade}% densidade</p>
          </div>
          <div className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
            <Cpu size={12} className="text-cyan-600" />
            <span className="text-gray-600">v{grafo.versao}</span>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-5xl mx-auto flex gap-1 overflow-x-auto">
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${aba === a.id ? 'border-cyan-500 text-cyan-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {a.icon}{a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* VISUALIZAÇÃO */}
        {aba === 'grafo' && (
          <div className="space-y-4">
            {/* Filtros por tipo */}
            <div className="flex flex-wrap gap-1.5 bg-white border border-gray-200 rounded-2xl p-3">
              <p className="text-xs font-bold text-gray-500 self-center mr-1">Filtro:</p>
              <button onClick={() => setFiltroTipo([])}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${filtroTipo.length === 0 ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600'}`}>
                Todos
              </button>
              {tiposUnicos.map(t => (
                <button key={t} onClick={() => setFiltroTipo(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${filtroTipo.includes(t) ? 'text-white' : 'bg-gray-100 text-gray-600'}`}
                  style={filtroTipo.includes(t) ? { background: TIPO_COR[t] } : {}}>
                  {TIPO_LABEL[t] ?? t} {dadosViz.stats.por_tipo[t] ? `(${dadosViz.stats.por_tipo[t]})` : ''}
                </button>
              ))}
            </div>

            <GrafoSVG dados={dadosViz} noSelecionado={noSelecionado} onSelect={setNoSelecionado} />

            {/* Detalhes do nó selecionado */}
            {noSelecionadoObj && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: TIPO_COR[noSelecionadoObj.tipo] }} />
                  <p className="text-sm font-black text-gray-800">{noSelecionadoObj.label}</p>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-bold">{noSelecionadoObj.tipo}</span>
                </div>
                {noSelecionadoObj.descricao && <p className="text-xs text-gray-600 mb-2">{noSelecionadoObj.descricao}</p>}
                {noSelecionadoObj.metadados && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {Object.entries(noSelecionadoObj.metadados).map(([k, v]) => (
                      <span key={k} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                        <strong>{k}:</strong> {String(v)}
                      </span>
                    ))}
                  </div>
                )}
                {relacionamentos.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">{relacionamentos.length} relacionamentos diretos</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {relacionamentos.slice(0, 12).map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-gray-100">
                          <span className="text-gray-600 flex-1">{r.no_origem.label}</span>
                          <span className="text-gray-400 font-mono">{RELACAO_LABEL[r.aresta.tipo] ?? r.aresta.tipo}</span>
                          <ChevronRight size={10} className="text-gray-400" />
                          <span className="text-gray-600 flex-1">{r.no_destino.label}</span>
                          <span className="text-gray-400">{r.aresta.peso}★</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CENTRALIDADE */}
        {aba === 'centralidade' && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <p className="text-sm font-bold text-gray-700">Top 20 entidades mais conectadas (centralidade de grau)</p>
            </div>
            <div className="divide-y divide-gray-100">
              {centralidade.map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-black text-gray-300 w-6">{c.rank}</span>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: TIPO_COR[c.no.tipo] }} />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-700">{c.no.label}</p>
                    <p className="text-xs text-gray-400">{c.no.tipo} · {c.grau} conexões · peso {c.peso_total}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${c.centralidade_normalizada}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-600 w-8 text-right">{c.centralidade_normalizada}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LACUNAS */}
        {aba === 'lacunas' && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700">Lacunas de conhecimento identificadas no grafo. Priorizar o preenchimento para aumentar a completude do mapa médico.</p>
            </div>
            {lacunas.map((lacuna, i) => (
              <div key={i} className={`bg-white border rounded-2xl p-4 ${lacuna.prioridade === 'alta' ? 'border-red-200' : lacuna.prioridade === 'media' ? 'border-amber-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-bold text-gray-800">{lacuna.tipo.replace(/_/g, ' ')}</p>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${lacuna.prioridade === 'alta' ? 'bg-red-100 text-red-700' : lacuna.prioridade === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                    {lacuna.prioridade}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{lacuna.descricao}</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {lacuna.nos_afetados.slice(0, 6).map((n, j) => (
                    <span key={j} className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-0.5 text-gray-600">{n}</span>
                  ))}
                  {lacuna.nos_afetados.length > 6 && <span className="text-xs text-gray-400">+{lacuna.nos_afetados.length - 6}</span>}
                </div>
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <p className="text-xs text-blue-700"><strong>Sugestão:</strong> {lacuna.sugestao}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CONFLITOS */}
        {aba === 'conflitos' && (
          <div className="space-y-3">
            {conflitos.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                <CheckCircle2 size={24} className="text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-emerald-700">Nenhum conflito detectado no conjunto atual de nós</p>
              </div>
            ) : (
              conflitos.map((c, i) => (
                <div key={i} className={`bg-white border-2 rounded-2xl p-4 ${c.severidade === 'critica' ? 'border-red-300' : c.severidade === 'moderada' ? 'border-amber-300' : 'border-blue-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className={c.severidade === 'critica' ? 'text-red-600' : 'text-amber-600'} />
                    <p className="text-sm font-bold text-gray-800">{c.tipo.replace(/_/g, ' ')}</p>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${c.severidade === 'critica' ? 'bg-red-100 text-red-700' : c.severidade === 'moderada' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{c.severidade}</span>
                  </div>
                  <p className="text-xs text-gray-700 mb-2">{c.descricao}</p>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                    <p className="text-xs text-emerald-700"><strong>Resolução:</strong> {c.resolucao}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* BUSCA */}
        {aba === 'busca' && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <input value={buscaTermo} onChange={e => setBuscaTermo(e.target.value)}
                placeholder="Buscar entidade no grafo (ex: enalapril, I10, GINA...)"
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
            </div>
            {resultadosBusca.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {resultadosBusca.map((no, i) => {
                    const rels = buscarRelacionamentos(no.id);
                    return (
                      <div key={i} className="px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => { setNoSelecionado(no.id); setAba('grafo'); }}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full" style={{ background: TIPO_COR[no.tipo] }} />
                          <p className="text-sm font-bold text-gray-800">{no.label}</p>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{no.tipo}</span>
                          <span className="text-xs text-gray-400 ml-auto">{rels.length} relações</span>
                        </div>
                        {no.descricao && <p className="text-xs text-gray-500 ml-5">{no.descricao}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {buscaTermo.length >= 2 && resultadosBusca.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">Nenhuma entidade encontrada para "{buscaTermo}"</div>
            )}
          </div>
        )}

        {/* STATS */}
        {aba === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Entidades', val: grafo.total_nos, cor: 'cyan' },
                { label: 'Relações', val: grafo.total_arestas, cor: 'blue' },
                { label: 'Lacunas', val: lacunas.length, cor: 'amber' },
                { label: 'Conflitos', val: conflitos.length, cor: 'red' },
              ].map((s, i) => (
                <div key={i} className={`bg-${s.cor}-50 border border-${s.cor}-200 rounded-2xl p-4 text-center`}>
                  <p className={`text-3xl font-black text-${s.cor}-700`}>{s.val}</p>
                  <p className={`text-xs text-${s.cor}-600 font-semibold`}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Distribuição por Tipo de Entidade</p>
              <div className="space-y-2">
                {Object.entries(dadosViz.stats.por_tipo).sort(([,a],[,b]) => b-a).map(([tipo, count]) => (
                  <div key={tipo} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: TIPO_COR[tipo as TipoEntidade] ?? '#6b7280' }} />
                    <p className="text-xs text-gray-600 w-32 flex-shrink-0">{TIPO_LABEL[tipo as TipoEntidade] ?? tipo}</p>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(count / grafo.total_nos) * 100}%`, background: TIPO_COR[tipo as TipoEntidade] ?? '#6b7280' }} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Top Tipos de Relação</p>
              {(() => {
                const counts: Record<string, number> = {};
                grafo.arestas.forEach(a => { counts[a.tipo] = (counts[a.tipo] ?? 0) + 1; });
                return Object.entries(counts).sort(([,a],[,b]) => b-a).slice(0, 8).map(([tipo, count]) => (
                  <div key={tipo} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0 text-xs">
                    <span className="text-gray-600">{RELACAO_LABEL[tipo as TipoRelacao] ?? tipo.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-gray-800">{count}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
