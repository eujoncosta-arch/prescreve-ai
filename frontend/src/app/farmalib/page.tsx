'use client';

import { useState, useMemo } from 'react';
import {
  LABORATORIOS, BIBLIOTECA_FARMACEUTICA, buscarBiblioteca, filtrarPorLab,
  getAreasTerapeuticas, getClassesTerapeuticas, getProduto,
  FREQ_LABEL, FREQ_COR, GRAVIDEZ_COR,
  type LaboratorioId, type MarcaFarmaceuticaEnterprise, type Laboratorio,
} from '@/lib/pharma-library';
import {
  Building2, Search, X, ChevronDown, ChevronUp, ExternalLink,
  AlertTriangle, Info, Pill, BookOpen, FlaskConical, Users,
  CheckCircle, Shield, Clock, Stethoscope, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Disclaimer ──────────────────────────────────────────────────────────────

function DisclaimerBar() {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
      <Shield className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        <strong>Suporte à decisão clínica</strong> — Informação de referência sobre medicamentos registrados no Brasil.
        A recomendação clínica segue exclusivamente:
        <strong> Diretriz → Classe terapêutica → Molécula → Marca</strong>.
        A escolha da marca comercial nunca altera a evidência clínica.
      </span>
    </div>
  );
}

// ─── Lab Selector ─────────────────────────────────────────────────────────────

function LabTabs({ selected, onSelect }: { selected: LaboratorioId | 'todos'; onSelect: (id: LaboratorioId | 'todos') => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => onSelect('todos')}
        className={cn(
          'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
          selected === 'todos'
            ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-transparent shadow'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
        )}
      >
        Todos ({BIBLIOTECA_FARMACEUTICA.length})
      </button>
      {LABORATORIOS.map(lab => (
        <button
          key={lab.id}
          onClick={() => lab.status === 'ativo' ? onSelect(lab.id) : undefined}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border relative',
            lab.status !== 'ativo' && 'opacity-50 cursor-not-allowed',
            selected === lab.id
              ? 'bg-blue-600 text-white border-transparent shadow'
              : lab.status === 'ativo'
                ? 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600'
                : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800'
          )}
          title={lab.status !== 'ativo' ? 'Em breve' : lab.descricao}
        >
          {lab.nome_abreviado}
          {lab.status === 'em_breve' && (
            <span className="ml-1.5 text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1 py-0.5 rounded">
              Em breve
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Produto Card ─────────────────────────────────────────────────────────────

function ProdutoCard({ produto, onClick, active }: { produto: MarcaFarmaceuticaEnterprise; onClick: () => void; active: boolean }) {
  const lab = LABORATORIOS.find(l => l.id === produto.laboratorio_id);
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all',
        active
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-blue-300 hover:shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className={cn('text-sm font-bold', active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-slate-100')}>
            {produto.nome_comercial}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{produto.molecula}</p>
        </div>
        {lab && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0', lab.cor_badge)}>
            {lab.nome_abreviado}
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 line-clamp-1">{produto.classe_terapeutica}</p>
      <div className="flex flex-wrap gap-1">
        {produto.area_terapeutica.slice(0, 2).map(a => (
          <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {a}
          </span>
        ))}
        {produto.alertas_especiais && produto.alertas_especiais.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
            ⚠ Alerta
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Collapsible Section ─────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, defaultOpen = false, accent }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cn('border rounded-xl overflow-hidden', accent ?? 'border-slate-200 dark:border-slate-700')}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function ProdutoDetail({ produto }: { produto: MarcaFarmaceuticaEnterprise }) {
  const [tab, setTab] = useState<'paciente' | 'profissional' | 'apresentacoes' | 'evidencia'>('profissional');
  const lab = LABORATORIOS.find(l => l.id === produto.laboratorio_id);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-900 dark:to-slate-800 p-5 text-white">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold">{produto.nome_comercial}</h2>
            <p className="text-slate-300 text-sm">{produto.molecula}</p>
          </div>
          {lab && (
            <span className={cn('text-xs px-2 py-1 rounded-lg font-semibold', lab.cor_badge)}>
              {lab.nome_abreviado}
            </span>
          )}
        </div>
        <p className="text-slate-400 text-xs mb-3">{produto.classe_terapeutica}</p>
        <div className="flex flex-wrap gap-2">
          {produto.cids_aprovados.map(cid => (
            <span key={cid} className="text-xs px-2 py-0.5 bg-white/10 rounded-md font-mono">{cid}</span>
          ))}
          <span className={cn('text-xs px-2 py-0.5 rounded-md', GRAVIDEZ_COR[produto.bula_profissional.gravidez_categoria])}>
            Gravidez {produto.bula_profissional.gravidez_categoria}
          </span>
          {produto.classe_controle !== 'livre' && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-red-500/20 text-red-300">
              {produto.classe_controle}
            </span>
          )}
        </div>
      </div>

      {/* Black box warning */}
      {produto.black_box_warning && (
        <div className="flex gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-0.5">BLACK BOX WARNING</p>
            <p>{produto.black_box_warning}</p>
          </div>
        </div>
      )}

      {/* Diretrizes badge */}
      {produto.diretrizes_associadas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {produto.diretrizes_associadas.map((d, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
              {d.sociedade} {d.ano} · Classe {d.classe_recomendacao} · Nível {d.nivel_evidencia}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
        {(['profissional', 'paciente', 'apresentacoes', 'evidencia'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 text-xs py-1.5 rounded-md font-medium capitalize transition-all',
              tab === t
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {t === 'profissional' ? 'Profissional' : t === 'paciente' ? 'Paciente' : t === 'apresentacoes' ? 'Apresentações' : 'Evidência'}
          </button>
        ))}
      </div>

      {/* Tab: Bula Profissional */}
      {tab === 'profissional' && (
        <div className="flex flex-col gap-3">
          <Section title="Indicações aprovadas" icon={Stethoscope} defaultOpen>
            <ul className="space-y-1">
              {produto.bula_profissional.indicacoes.map((ind, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{ind}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Mecanismo de ação" icon={FlaskConical} defaultOpen>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{produto.bula_profissional.mecanismo_acao}</p>
          </Section>

          <Section title="Posologia" icon={Clock} defaultOpen>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {produto.bula_profissional.posologia_adulto && (
                <div>
                  <p className="font-semibold text-xs text-slate-500 uppercase mb-0.5">Adultos</p>
                  <p>{produto.bula_profissional.posologia_adulto}</p>
                </div>
              )}
              {produto.bula_profissional.posologia_pediatrica && (
                <div>
                  <p className="font-semibold text-xs text-slate-500 uppercase mb-0.5">Pediátrico</p>
                  <p>{produto.bula_profissional.posologia_pediatrica}</p>
                </div>
              )}
              {produto.bula_profissional.posologia_geriatrica && (
                <div>
                  <p className="font-semibold text-xs text-slate-500 uppercase mb-0.5">Idoso</p>
                  <p>{produto.bula_profissional.posologia_geriatrica}</p>
                </div>
              )}
              {produto.bula_profissional.ajuste_renal && (
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <p className="font-semibold text-xs text-amber-600 dark:text-amber-400 mb-0.5">Ajuste Renal</p>
                  <p className="text-amber-800 dark:text-amber-300">{produto.bula_profissional.ajuste_renal}</p>
                </div>
              )}
              {produto.bula_profissional.ajuste_hepatico && (
                <div className="p-2 rounded bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                  <p className="font-semibold text-xs text-orange-600 dark:text-orange-400 mb-0.5">Ajuste Hepático</p>
                  <p className="text-orange-800 dark:text-orange-300">{produto.bula_profissional.ajuste_hepatico}</p>
                </div>
              )}
            </div>
          </Section>

          <Section title="Contraindicações" icon={X} accent="border-red-200 dark:border-red-900">
            <ul className="space-y-1">
              {produto.bula_profissional.contraindicacoes.map((c, i) => (
                <li key={i} className="flex gap-2 text-sm text-red-700 dark:text-red-400">
                  <span className="text-red-500 font-bold flex-shrink-0">✕</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Advertências" icon={AlertTriangle} accent="border-amber-200 dark:border-amber-900">
            <ul className="space-y-1.5">
              {produto.bula_profissional.advertencias.map((a, i) => (
                <li key={i} className="text-sm text-amber-800 dark:text-amber-300 flex gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Interações medicamentosas" icon={Activity}>
            <ul className="space-y-1">
              {produto.bula_profissional.interacoes.map((int, i) => (
                <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                  <span className="text-slate-400 flex-shrink-0">·</span>
                  <span>{int}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Reações adversas" icon={Info}>
            <div className="space-y-1.5">
              {produto.bula_profissional.reacoes_adversas.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{r.descricao}</span>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded flex-shrink-0', FREQ_COR[r.frequencia])}>
                    {FREQ_LABEL[r.frequencia]}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {produto.bula_profissional.farmacocinetica && (
            <Section title="Farmacocinética" icon={FlaskConical}>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{produto.bula_profissional.farmacocinetica}</p>
            </Section>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
              <p className="text-slate-500 mb-0.5">Gestação</p>
              <span className={cn('font-bold px-1.5 py-0.5 rounded', GRAVIDEZ_COR[produto.bula_profissional.gravidez_categoria])}>
                Categoria {produto.bula_profissional.gravidez_categoria}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
              <p className="text-slate-500 mb-0.5">Lactação</p>
              <p className="text-slate-700 dark:text-slate-300">{produto.bula_profissional.lactacao}</p>
            </div>
          </div>

          {(produto.link_bula_profissional || produto.link_bula_paciente) && (
            <div className="flex gap-2">
              {produto.link_bula_profissional && (
                <a
                  href={produto.link_bula_profissional}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Bula Profissional (PDF)
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Bula Paciente */}
      {tab === 'paciente' && (
        <div className="flex flex-col gap-3">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase mb-2 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5" />
              Para que serve
            </p>
            <ul className="space-y-1">
              {produto.bula_paciente.para_que_serve.map((p, i) => (
                <li key={i} className="text-sm text-emerald-900 dark:text-emerald-200 flex gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase mb-2 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" />
              Quando NÃO usar
            </p>
            <ul className="space-y-1">
              {produto.bula_paciente.quando_nao_usar.map((c, i) => (
                <li key={i} className="text-sm text-red-800 dark:text-red-300 flex gap-2">
                  <span className="font-bold flex-shrink-0">✕</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase mb-2">Como usar</p>
            <p className="text-sm text-blue-900 dark:text-blue-200">{produto.bula_paciente.como_usar}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Possíveis efeitos colaterais
            </p>
            <ul className="space-y-1">
              {produto.bula_paciente.efeitos_adversos_principais.map((e, i) => (
                <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
                  <span className="text-amber-500 flex-shrink-0">·</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Se esquecer de tomar</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{produto.bula_paciente.o_que_fazer_se_esquecer}</p>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Conservação</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{produto.bula_paciente.conservacao}</p>
          </div>

          {produto.link_bula_paciente && (
            <a
              href={produto.link_bula_paciente}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors w-fit"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Bula para o Paciente (PDF)
            </a>
          )}
        </div>
      )}

      {/* Tab: Apresentações */}
      {tab === 'apresentacoes' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {produto.apresentacoes.length} apresentação(ões) registrada(s)
          </p>
          <div className="space-y-2">
            {produto.apresentacoes.map((ap, i) => (
              <div key={i} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {produto.nome_comercial} {ap.concentracao}
                  </p>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded',
                    ap.status === 'ativo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'
                  )}>
                    {ap.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{ap.forma_farmaceutica}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500">{ap.embalagem}</p>
                {ap.registro_anvisa && (
                  <p className="text-[10px] text-slate-400 font-mono mt-1">ANVISA: {ap.registro_anvisa}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Evidência */}
      {tab === 'evidencia' && (
        <div className="flex flex-col gap-3">
          <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Hierarquia Clínica
            </p>
            <div className="flex items-center gap-1.5 text-xs text-indigo-800 dark:text-indigo-300">
              <span className="px-2 py-0.5 bg-indigo-600 text-white rounded">Diretriz</span>
              <span>→</span>
              <span className="px-2 py-0.5 bg-indigo-500 text-white rounded">Classe</span>
              <span>→</span>
              <span className="px-2 py-0.5 bg-indigo-400 text-white rounded">Molécula</span>
              <span>→</span>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded">{produto.nome_comercial}</span>
            </div>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-2">
              A marca não altera a evidência. A classe terapêutica e a molécula são a unidade de evidência.
            </p>
          </div>

          {produto.diretrizes_associadas.length > 0 ? (
            <div className="space-y-2">
              {produto.diretrizes_associadas.map((d, i) => (
                <div key={i} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{d.nome}</p>
                    <div className="flex gap-1 flex-shrink-0">
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded font-bold',
                        d.classe_recomendacao === 'I' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        d.classe_recomendacao === 'IIa' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        d.classe_recomendacao === 'IIb' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        Classe {d.classe_recomendacao}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                        Nível {d.nivel_evidencia}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{d.sociedade} · {d.ano}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-500 dark:text-slate-400 text-center">
              Diretrizes detalhadas em enriquecimento progressivo da biblioteca.
              <br/>
              Classe terapêutica: <strong>{produto.classe_terapeutica}</strong>
            </div>
          )}

          {produto.observacao_evidencia && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold text-xs mb-1">Nota clínica sobre evidência</p>
              <p>{produto.observacao_evidencia}</p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Nível de evidência geral</p>
            <span className={cn(
              'text-sm font-bold px-2 py-0.5 rounded',
              produto.nivel_evidencia_geral === 'A' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
              produto.nivel_evidencia_geral === 'B' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-amber-100 text-amber-700'
            )}>
              Nível {produto.nivel_evidencia_geral}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FarmaLibPage() {
  const [labSel, setLabSel] = useState<LaboratorioId | 'todos'>('todos');
  const [query, setQuery] = useState('');
  const [areaSel, setAreaSel] = useState('');
  const [produtoSel, setProdutoSel] = useState<MarcaFarmaceuticaEnterprise | null>(null);

  const areas = useMemo(() => getAreasTerapeuticas(), []);

  const produtos = useMemo(() => {
    let list = labSel === 'todos' ? BIBLIOTECA_FARMACEUTICA : filtrarPorLab(labSel);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.nome_comercial.toLowerCase().includes(q) ||
        p.molecula.toLowerCase().includes(q) ||
        p.classe_terapeutica.toLowerCase().includes(q) ||
        p.cids_aprovados.some(c => c.toLowerCase().includes(q)) ||
        p.tags.some(t => t.includes(q))
      );
    }
    if (areaSel) {
      list = list.filter(p => p.area_terapeutica.some(a => a === areaSel));
    }
    return list;
  }, [labSel, query, areaSel]);

  const labAtivo = LABORATORIOS.find(l => l.id === labSel);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <DisclaimerBar />

      {/* Hero header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Biblioteca Farmacológica Enterprise
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-11 mb-4">
            Laboratório → Marca → Molécula → Classe → Diretriz → Indicação → Posologia → Bula
          </p>

          <LabTabs selected={labSel} onSelect={setLabSel} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Lab info banner */}
        {labSel !== 'todos' && labAtivo && (
          <div className="mb-5 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">{labAtivo.nome}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{labAtivo.descricao}</p>
              <div className="flex gap-2 mt-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{labAtivo.pais_sede}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{labAtivo.segmento}</span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded', labAtivo.cor_badge)}>{labAtivo.total_produtos_sistema} produtos no sistema</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por marca, molécula, CID, classe…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={areaSel}
            onChange={e => setAreaSel(e.target.value)}
            className="py-2 px-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div className="flex gap-4">
          {/* Product list */}
          <div className="w-80 flex-shrink-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              {produtos.length} produto(s) encontrado(s)
            </p>
            <div className="flex flex-col gap-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {produtos.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Nenhum produto encontrado.
                </div>
              ) : (
                produtos.map(p => (
                  <ProdutoCard
                    key={p.id}
                    produto={p}
                    onClick={() => setProdutoSel(p)}
                    active={produtoSel?.id === p.id}
                  />
                ))
              )}
            </div>
          </div>

          {/* Detail panel */}
          <div className="flex-1 min-w-0 max-h-[calc(100vh-280px)] overflow-y-auto">
            {produtoSel ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                <ProdutoDetail produto={produtoSel} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-600 gap-3">
                <Pill className="w-12 h-12" />
                <p className="text-sm">Selecione um produto para ver os detalhes</p>
                <p className="text-xs text-center max-w-xs">
                  Bula completa (paciente e profissional), posologia, ajustes por população e evidência clínica estruturada
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
