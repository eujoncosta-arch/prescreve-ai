'use client';

import { useState, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  EUROFARMA_CATALOG,
  CORRELACAO_TERAPEUTICA,
  SYNC_STATUS,
  AUDIT_TRAIL,
  searchCatalog,
  getCatalogoPorClasse,
} from '@/lib/eurofarma-sync';
import { BulaViewer } from '@/components/modules/BulaViewer';
import type { ProdutoComercial } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Library, Search, Building2, FlaskConical, Pill, BookOpen,
  AlertTriangle, RefreshCw, Clock, Shield,
  ChevronDown, ChevronUp, ArrowRight, GitBranch, Microscope,
  FileText, CheckCircle2,
} from 'lucide-react';

// ─── FILTROS ──────────────────────────────────────────────────

const CLASSES_RAPIDAS = [
  'Todos', 'BRA/SARA', 'IECA', 'Betabloqueador', 'BCC',
  'Diurético', 'Diabetes', 'Respiratório', 'Saúde Mental',
  'Antibiótico', 'IBP', 'Analgésico',
];

function matchFiltro(classe: string, filtro: string): boolean {
  if (filtro === 'Todos') return true;
  const c = classe.toLowerCase();
  const f = filtro.toLowerCase();
  if (c.includes(f)) return true;
  if (filtro === 'Diabetes') return c.includes('biguanida') || c.includes('sulfonilureia');
  if (filtro === 'Respiratório') return c.includes('cortico') || c.includes('laba') || c.includes('leucotrien') || c.includes('beta-2');
  if (filtro === 'Saúde Mental') return c.includes('isrs') || c.includes('irsn');
  if (filtro === 'Antibiótico') return c.includes('aminopenic') || c.includes('macrolídeo');
  if (filtro === 'IBP') return c.includes('bomba');
  if (filtro === 'Analgésico') return c.includes('analg') || c.includes('antitérmico');
  if (filtro === 'BCC') return c.includes('canal de cálcio');
  return false;
}

function getAreaColor(classe: string): string {
  const c = classe.toLowerCase();
  if (c.includes('bra') || c.includes('ieca') || c.includes('beta') || c.includes('bcc') || c.includes('diurético') || c.includes('aldos') || c.includes('canal'))
    return 'bg-red-50 border-red-100 text-red-700';
  if (c.includes('biguanida') || c.includes('sulfonilureia'))
    return 'bg-blue-50 border-blue-100 text-blue-700';
  if (c.includes('cortico') || c.includes('laba') || c.includes('beta-2') || c.includes('leucotrien'))
    return 'bg-sky-50 border-sky-100 text-sky-700';
  if (c.includes('isrs') || c.includes('irsn'))
    return 'bg-purple-50 border-purple-100 text-purple-700';
  if (c.includes('aminopenic') || c.includes('macrolídeo'))
    return 'bg-orange-50 border-orange-100 text-orange-700';
  if (c.includes('bomba'))
    return 'bg-emerald-50 border-emerald-100 text-emerald-700';
  return 'bg-slate-50 border-slate-100 text-slate-700';
}

function getAreaIcon(classe: string): string {
  const c = classe.toLowerCase();
  if (c.includes('bra') || c.includes('ieca') || c.includes('beta') || c.includes('canal') || c.includes('diurético') || c.includes('aldos')) return '❤️';
  if (c.includes('biguanida') || c.includes('sulfonilureia')) return '🩸';
  if (c.includes('cortico') || c.includes('laba') || c.includes('beta-2') || c.includes('leucotrien')) return '🫁';
  if (c.includes('isrs') || c.includes('irsn')) return '🧠';
  if (c.includes('penic') || c.includes('macrolídeo')) return '🦠';
  return '💊';
}

// ─── CARD PRODUTO ─────────────────────────────────────────────

function ProdutoCard({ produto }: { produto: ProdutoComercial }) {
  const [open, setOpen] = useState(false);
  const color = getAreaColor(produto.classe_terapeutica);

  return (
    <Card className="border border-slate-200 hover:border-slate-300 transition-all">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-slate-900">{produto.nome_comercial}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${color}`}>
                {getAreaIcon(produto.classe_terapeutica)} {produto.classe_terapeutica.split('(')[0].trim()}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{produto.molecula}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <BulaViewer produtoId={produto.id} trigger={
              <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-800">
                <BookOpen className="w-3 h-3" />Bula
              </span>
            } />
            {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Apresentações</p>
            <div className="flex flex-wrap gap-1.5">
              {produto.apresentacoes.map((ap, i) => (
                <div key={i} className="text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-semibold">{ap.concentracao}</span>
                  <span className="text-slate-400 ml-1">— {ap.forma_farmaceutica}</span>
                  <div className="text-slate-400 text-[10px]">{ap.embalagem}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Indicações ANVISA (CID-10)</p>
            <div className="flex flex-wrap gap-1">
              {produto.cids_aprovados.map(cid => (
                <span key={cid} className="text-xs font-mono bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded">
                  {cid}
                </span>
              ))}
            </div>
          </div>

          <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-[10px] font-semibold text-blue-700 mb-1">Posologia Aprovada (Bula)</p>
            <p className="text-xs text-blue-900">{produto.posologia_aprovada}</p>
          </div>

          {Object.keys(produto.uso_populacoes_especiais).length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(produto.uso_populacoes_especiais).map(([grupo, info]) => (
                <div key={grupo} className="p-2 bg-slate-50 rounded border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-600 capitalize">{grupo}</p>
                  <p className="text-[11px] text-slate-700 mt-0.5">{info}</p>
                </div>
              ))}
            </div>
          )}

          {produto.advertencias_principais.filter(a => a.startsWith('⚠') || a.startsWith('CONTRAINDICADO')).map((adv, i) => (
            <Alert key={i} className="border-amber-200 bg-amber-50 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <AlertDescription className="text-xs text-amber-700">{adv}</AlertDescription>
            </Alert>
          ))}

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            <span>Registro: {produto.data_registro}</span>
            <span>Atualização: {new Date(produto.data_ultima_atualizacao).toLocaleDateString('pt-BR')}</span>
            <span className="font-mono">{produto.versao_bula}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── CARD CORRELAÇÃO ──────────────────────────────────────────

function CorrelacaoCard({ correlacao }: { correlacao: typeof CORRELACAO_TERAPEUTICA[0] }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border border-slate-200">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              {correlacao.cid10.slice(0, 3).map(c => (
                <span key={c} className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c}</span>
              ))}
            </div>
            <p className="text-sm font-bold text-slate-900">{correlacao.diagnostico}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {correlacao.diretrizes.map(d => `${d.sociedade} ${d.ano}`).join(' · ')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {correlacao.classes.reduce((acc, c) => acc + c.moleculas.length, 0)} moléculas
            </span>
            {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 space-y-4">
          {correlacao.classes.map(cls => (
            <div key={cls.nome} className="pl-3 border-l-2 border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">{cls.nome}</span>
                <span className="text-[10px] text-slate-400 italic">{cls.posicao_terapeutica}</span>
              </div>

              {cls.moleculas.map(mol => {
                const produtos = mol.produtos_eurofarma
                  .map(id => EUROFARMA_CATALOG.find(p => p.id === id))
                  .filter(Boolean) as ProdutoComercial[];

                return (
                  <div key={mol.nome} className="ml-4 mb-2 pl-3 border-l border-dashed border-slate-200">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <FlaskConical className="w-3 h-3 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-800">{mol.nome}</span>
                      <Badge variant="outline" className="text-[10px] text-green-700 border-green-200">
                        Grau {mol.grau_recomendacao} · Nível {mol.nivel_evidencia}
                      </Badge>
                    </div>
                    <div className="ml-5 space-y-1">
                      {produtos.length > 0 ? produtos.map(produto => (
                        <div key={produto.id} className="flex items-center gap-2 p-1.5 bg-violet-50 border border-violet-100 rounded-lg">
                          <Building2 className="w-3 h-3 text-violet-500 flex-shrink-0" />
                          <span className="text-xs font-semibold text-violet-800">{produto.nome_comercial}</span>
                          <span className="text-[10px] text-violet-600">({produto.apresentacoes.map(a => a.concentracao).join(', ')})</span>
                          <span className="text-[10px] text-violet-400 ml-auto">Eurofarma</span>
                          <BulaViewer produtoId={produto.id} trigger={
                            <span className="text-[10px] text-indigo-500 font-medium underline cursor-pointer">bula</span>
                          } />
                        </div>
                      )) : (
                        <div className="text-[10px] text-slate-400 italic">Sem marca Eurofarma cadastrada</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
            <p className="text-[10px] font-semibold text-emerald-700 mb-1.5 flex items-center gap-1">
              <Microscope className="w-3 h-3" />Diretrizes
            </p>
            {correlacao.diretrizes.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-emerald-800 mb-1 flex-wrap">
                <span className="font-medium">{d.nome}</span>
                <span className="text-emerald-600">({d.sociedade}, {d.ano})</span>
                <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded">Nível {d.nivel_evidencia} · Grau {d.grau_recomendacao}</span>
              </div>
            ))}
          </div>

          {correlacao.notas_clinicas.length > 0 && (
            <ul className="space-y-1">
              {correlacao.notas_clinicas.map((nota, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                  <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>{nota}
                </li>
              ))}
            </ul>
          )}

          <Alert className="border-amber-200 bg-amber-50 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <AlertDescription className="text-[11px] text-amber-700">
              As classes e moléculas são recomendações científicas. As marcas Eurofarma são opções de prescrição — não alteram a indicação clínica.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}

// ─── PÁGINA ───────────────────────────────────────────────────

export default function BibliotecaPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroClasse, setFiltroClasse] = useState('Todos');
  const [showAudit, setShowAudit] = useState(false);

  const produtosFiltrados = useMemo(() => {
    let lista = searchQuery.length >= 2 ? searchCatalog(searchQuery) : EUROFARMA_CATALOG;
    if (filtroClasse !== 'Todos') lista = lista.filter(p => matchFiltro(p.classe_terapeutica, filtroClasse));
    return lista;
  }, [searchQuery, filtroClasse]);

  const catalogoPorClasse = useMemo(() => getCatalogoPorClasse(), []);
  const totalClasses = Object.keys(catalogoPorClasse).length;

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center shadow-sm">
              <Library className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Biblioteca Farmacológica Eurofarma</h1>
              <p className="text-xs text-slate-500">
                {EUROFARMA_CATALOG.length} produtos · {totalClasses} classes · Sincronizado com portal oficial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <div className={`w-2 h-2 rounded-full ${SYNC_STATUS.estado === 'success' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-xs font-medium ${SYNC_STATUS.estado === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {SYNC_STATUS.estado === 'success' ? 'Sincronizado' : 'Erro de sync'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {SYNC_STATUS.ultima_sync ? `Última sync: ${new Date(SYNC_STATUS.ultima_sync).toLocaleDateString('pt-BR')}` : '—'}
              </p>
              <p className="text-[10px] text-slate-400">v{SYNC_STATUS.versao_catalogo}</p>
            </div>
            <button
              onClick={() => setShowAudit(!showAudit)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-1.5 rounded-lg"
            >
              <Clock className="w-3 h-3" />Audit Trail
            </button>
          </div>
        </div>

        {/* Separação científico vs regulatório */}
        <Alert className="border-amber-200 bg-amber-50 mb-4">
          <Shield className="w-4 h-4 text-amber-500" />
          <AlertDescription className="text-xs text-amber-700">
            <strong>Transparência científica:</strong> Esta biblioteca contém dados <strong>regulatórios (bula ANVISA)</strong>.
            A recomendação clínica é sempre por classe e molécula com base em diretrizes.
            Consulte o <a href="/repositorio" className="underline font-medium">Repositório Científico</a> para evidências.
            A marca comercial nunca influencia a indicação baseada em evidências.
          </AlertDescription>
        </Alert>

        {/* Audit trail */}
        {showAudit && (
          <Card className="mb-4 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Histórico de Atualizações (Audit Trail)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {AUDIT_TRAIL.map(entry => (
                  <div key={entry.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      entry.tipo === 'sync_completo' ? 'bg-green-100' : 'bg-amber-100'
                    }`}>
                      {entry.tipo === 'sync_completo'
                        ? <RefreshCw className="w-3 h-3 text-green-600" />
                        : <FileText className="w-3 h-3 text-amber-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-700">{entry.produto_nome ?? entry.tipo.replace(/_/g, ' ')}</span>
                        <span className="text-slate-400">{new Date(entry.timestamp).toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{entry.descricao}</p>
                      <p className="text-slate-400 text-[10px] mt-0.5">{entry.fonte} · {entry.operador.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                <strong>Arquitetura de sync:</strong> Verificação automática diária (03:00 BRT) via{' '}
                <code className="bg-blue-100 px-1 rounded">/api/sync/eurofarma</code>.
                Em produção: scrape controlado + diff de conteúdo + persistência no banco.
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="catalogo">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="catalogo" className="gap-1.5 text-xs">
              <Library className="w-3.5 h-3.5" />
              Catálogo por Hierarquia
            </TabsTrigger>
            <TabsTrigger value="correlacao" className="gap-1.5 text-xs">
              <GitBranch className="w-3.5 h-3.5" />
              Correlação Diagnóstico → Marcas
            </TabsTrigger>
          </TabsList>

          {/* ABA CATÁLOGO */}
          <TabsContent value="catalogo">
            <div className="flex gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por molécula, marca, classe, CID-10..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {CLASSES_RAPIDAS.map(cls => (
                <button
                  key={cls}
                  onClick={() => setFiltroClasse(cls)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    filtroClasse === cls
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Produtos cadastrados', value: EUROFARMA_CATALOG.length, color: 'text-violet-600' },
                { label: 'Classes terapêuticas', value: totalClasses, color: 'text-blue-600' },
                { label: 'CIDs cobertos', value: new Set(EUROFARMA_CATALOG.flatMap(p => p.cids_aprovados)).size, color: 'text-emerald-600' },
                { label: 'Versão do catálogo', value: SYNC_STATUS.versao_catalogo, color: 'text-slate-600' },
              ].map(({ label, value, color }) => (
                <Card key={label} className="border-slate-200">
                  <CardContent className="pt-3 pb-3 text-center">
                    <p className={`text-lg font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-slate-500">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {searchQuery.length >= 2 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 mb-2">{produtosFiltrados.length} resultado(s) para "{searchQuery}"</p>
                {produtosFiltrados.length > 0 ? produtosFiltrados.map(p => <ProdutoCard key={p.id} produto={p} />) : (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                    <Search className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Nenhum produto encontrado</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(catalogoPorClasse)
                  .filter(([classe]) => matchFiltro(classe, filtroClasse))
                  .map(([classe, produtos]) => (
                    <div key={classe}>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-2 ${getAreaColor(classe)}`}>
                        <span>{getAreaIcon(classe)}</span>
                        <h3 className="text-xs font-bold">{classe}</h3>
                        <span className="ml-auto text-[10px] opacity-60">{produtos.length} produto(s)</span>
                      </div>
                      <div className="space-y-2 ml-2">
                        {produtos.map(p => <ProdutoCard key={p.id} produto={p} />)}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </TabsContent>

          {/* ABA CORRELAÇÃO */}
          <TabsContent value="correlacao">
            <Alert className="border-emerald-200 bg-emerald-50 mb-4">
              <GitBranch className="w-4 h-4 text-emerald-500" />
              <AlertDescription className="text-xs text-emerald-700">
                <strong>Motor de correlação clínica:</strong> Diagnóstico → Diretriz → Classe → Molécula → Marcas Eurofarma.
                A cadeia de recomendação é sempre <strong>científica</strong>. As marcas aparecem apenas no passo final como opção de prescrição.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              {CORRELACAO_TERAPEUTICA.map(cor => (
                <CorrelacaoCard key={cor.cid10[0]} correlacao={cor} />
              ))}
            </div>

            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs font-semibold text-slate-600 mb-3">Correlações em desenvolvimento:</p>
              <div className="grid grid-cols-3 gap-2">
                {['DPOC (J44)', 'FA (I48)', 'Hipotireoidismo (E03)', 'Dislipidemia (E78)', 'DRC (N18)', 'Gota (M10)', 'TOC (F42)', 'TEPT (F43)', 'Fibromialgia (M79)'].map(item => (
                  <div key={item} className="text-[11px] text-slate-400 p-2 border border-dashed border-slate-200 rounded text-center">{item}</div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Outros laboratórios */}
        <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" />
            Outros laboratórios (em desenvolvimento):
          </p>
          <div className="grid grid-cols-4 gap-2">
            {['EMS', 'Aché', 'Libbs', 'Biolab', 'Bayer', 'Pfizer', 'AstraZeneca', 'Novartis'].map(lab => (
              <div key={lab} className="text-xs text-slate-400 p-2 border border-dashed border-slate-200 rounded text-center opacity-60">{lab}</div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Arquitetura multi-lab pronta — cada laboratório é ativado via <code className="bg-slate-100 px-1 rounded">LABS[id].ativo = true</code>
          </p>
        </div>
      </div>
    </AppShell>
  );
}
