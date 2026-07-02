'use client';

import { useState, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  User, Stethoscope, BookOpen, Building2, ClipboardList,
  FileText, Sliders, CheckCircle2, Save, AlertTriangle,
  PlusCircle, Trash2, Star, Award, ChevronDown,
  Brain, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  usePhysicianProfile,
  ESPECIALIDADE_LABEL,
  SUBESP_LABEL,
  AMBIENTE_LABEL,
  ESTILO_META,
  SOCIEDADE_META,
  PAIS_FLAG,
  ALL_SOCIEDADES,
  EspecialidadeMedica,
  SubespecialidadeMedica,
  AmbienteAtuacao,
  EstiloPrescricao,
  SociedadeDiretriz,
  PrescricaoFavorita,
} from '@/lib/physician-profile';

// ─── Sub-components ──────────────────────────────────────────

function SectionCard({ icon: Icon, title, sub, children, color = 'blue' }: {
  icon: React.ElementType;
  title: string;
  sub?: string;
  children: React.ReactNode;
  color?: 'blue' | 'purple' | 'teal' | 'rose' | 'amber' | 'emerald';
}) {
  const cls: Record<string, string> = {
    blue:    'text-blue-600',
    purple:  'text-purple-600',
    teal:    'text-teal-600',
    rose:    'text-rose-600',
    amber:   'text-amber-600',
    emerald: 'text-emerald-600',
  };
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start gap-3">
        <Icon className={cn('w-4.5 h-4.5 mt-0.5 flex-shrink-0', cls[color])} />
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h3>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
}

function SelectInput<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="w-full appearance-none px-3 py-2 pr-8 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
    </div>
  );
}

function Toggle({ checked, onChange, label, desc }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {desc && <p className="text-xs text-slate-500 mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500',
          checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
        )}
        style={{ minWidth: '2.5rem', height: '1.375rem' }}
      >
        <span className={cn(
          'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  );
}

// ─── Aviso de neutralidade ───────────────────────────────────

function NeutralidadeAviso() {
  return (
    <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
      <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-blue-800 dark:text-blue-300">
        <strong>Neutralidade científica garantida.</strong> As preferências abaixo personalizam a <em>exibição</em> e a <em>priorização</em> das informações.
        A recomendação clínica segue sempre: <strong>Diretriz → Classe terapêutica → Molécula</strong>.
        Nenhuma preferência comercial ou de laboratório altera a evidência científica apresentada.
      </p>
    </div>
  );
}

// ─── Aba: Identificação ──────────────────────────────────────

function TabIdentificacao({ draft, set }: { draft: ReturnType<typeof usePhysicianProfile>['profile']; set: (k: string, v: unknown) => void }) {
  const medicoSet = (k: string, v: string) => set('_medico_' + k, v);

  return (
    <div className="space-y-4">
      <SectionCard icon={User} title="Dados profissionais" color="blue">
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Nome completo">
            <TextInput value={draft.nome} onChange={v => set('nome', v)} placeholder="Dr. Nome Completo" />
          </FieldGroup>
          <FieldGroup label="CRM">
            <TextInput value={draft.crm} onChange={v => set('crm', v)} placeholder="123456" />
          </FieldGroup>
          <FieldGroup label="UF do CRM">
            <SelectInput
              value={draft.uf_crm as EspecialidadeMedica}
              onChange={v => set('uf_crm', v)}
              options={['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf => ({ value: uf as EspecialidadeMedica, label: uf }))}
            />
          </FieldGroup>
          <FieldGroup label="RQE (subespecialidade)">
            <TextInput value={draft.rqe ?? ''} onChange={v => set('rqe', v)} placeholder="12345 (opcional)" />
          </FieldGroup>
          <FieldGroup label="Titulação acadêmica">
            <SelectInput
              value={(draft.titulo_academico ?? '') as EspecialidadeMedica}
              onChange={v => set('titulo_academico', v || undefined)}
              options={[
                { value: '' as EspecialidadeMedica, label: 'Nenhuma' },
                { value: 'Especialista' as EspecialidadeMedica, label: 'Especialista' },
                { value: 'Mestre' as EspecialidadeMedica, label: 'Mestre' },
                { value: 'Doutor' as EspecialidadeMedica, label: 'Doutor(a)' },
                { value: 'Livre-Docente' as EspecialidadeMedica, label: 'Livre-Docente' },
                { value: 'Professor' as EspecialidadeMedica, label: 'Professor Titular' },
              ]}
            />
          </FieldGroup>
          <FieldGroup label="Instituição / Hospital">
            <TextInput value={draft.instituicao ?? ''} onChange={v => set('instituicao', v)} placeholder="InCor, HC-FMUSP…" />
          </FieldGroup>
          <FieldGroup label="E-mail">
            <TextInput value={draft.email ?? ''} onChange={v => set('email', v)} placeholder="medico@email.com" />
          </FieldGroup>
          <FieldGroup label="Telefone">
            <TextInput value={draft.telefone ?? ''} onChange={v => set('telefone', v)} placeholder="(11) 99999-9999" />
          </FieldGroup>
        </div>
        <FieldGroup label="Endereço do consultório">
          <TextInput value={draft.endereco_consultorio ?? ''} onChange={v => set('endereco_consultorio', v)} placeholder="Rua, nº, cidade - UF" />
        </FieldGroup>
      </SectionCard>
    </div>
  );
}

// ─── Aba: Especialidade ──────────────────────────────────────

function TabEspecialidade({ draft, set }: { draft: ReturnType<typeof usePhysicianProfile>['profile']; set: (k: string, v: unknown) => void }) {
  const subEspOptions = Object.entries(SUBESP_LABEL).map(([value, label]) => ({ value: value as SubespecialidadeMedica, label }));

  return (
    <div className="space-y-4">
      <SectionCard icon={Stethoscope} title="Especialidade e área de atuação" color="teal">
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Especialidade principal">
            <SelectInput
              value={draft.especialidade}
              onChange={v => set('especialidade', v)}
              options={Object.entries(ESPECIALIDADE_LABEL).map(([value, label]) => ({ value: value as EspecialidadeMedica, label }))}
            />
          </FieldGroup>
          <FieldGroup label="Subespecialidade / Área de interesse">
            <SelectInput
              value={(draft.subespecialidade ?? '') as EspecialidadeMedica}
              onChange={(v: EspecialidadeMedica) => set('subespecialidade', v || null)}
              options={[{ value: '' as EspecialidadeMedica, label: 'Nenhuma' }, ...subEspOptions.map(o => ({ value: o.value as unknown as EspecialidadeMedica, label: o.label }))]}
            />
          </FieldGroup>
          <FieldGroup label="Ambiente de atuação">
            <SelectInput
              value={draft.ambiente_atuacao}
              onChange={v => set('ambiente_atuacao', v)}
              options={Object.entries(AMBIENTE_LABEL).map(([value, label]) => ({ value: value as AmbienteAtuacao, label }))}
            />
          </FieldGroup>
          <FieldGroup label="Anos de formado">
            <input
              type="number"
              min={0}
              max={60}
              value={draft.anos_formado ?? ''}
              onChange={e => set('anos_formado', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Ex: 15"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FieldGroup>
        </div>

        {/* Preview do perfil */}
        <div className="mt-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 text-white">
          <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Preview da assinatura</p>
          <p className="font-black text-sm">
            {draft.titulo_academico ? `${draft.titulo_academico} ` : ''}{draft.nome}
          </p>
          <p className="text-xs text-slate-300">{ESPECIALIDADE_LABEL[draft.especialidade]}{draft.subespecialidade ? ` · ${SUBESP_LABEL[draft.subespecialidade]}` : ''}</p>
          <p className="text-xs text-slate-400">CRM-{draft.uf_crm} {draft.crm}{draft.rqe ? ` · RQE ${draft.rqe}` : ''}</p>
          {draft.instituicao && <p className="text-xs text-slate-400">{draft.instituicao}</p>}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Aba: Diretrizes ─────────────────────────────────────────

function TabDiretrizes({ draft, toggleSociedade, set }: {
  draft: ReturnType<typeof usePhysicianProfile>['profile'];
  toggleSociedade: (s: SociedadeDiretriz) => void;
  set: (k: string, v: unknown) => void;
}) {
  const byPais: Record<string, SociedadeDiretriz[]> = {};
  for (const s of ALL_SOCIEDADES) {
    const p = SOCIEDADE_META[s].pais;
    if (!byPais[p]) byPais[p] = [];
    byPais[p].push(s);
  }
  const paisOrder = ['Brasil', 'EUA', 'Europa', 'UK', 'Global'];

  return (
    <div className="space-y-4">
      <NeutralidadeAviso />

      <SectionCard
        icon={BookOpen}
        title="Diretrizes / Sociedades preferidas"
        sub="As diretrizes selecionadas são priorizadas no painel de evidências. Você pode selecionar mais de uma."
        color="purple"
      >
        {paisOrder.map(pais => (
          <div key={pais}>
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">
              {PAIS_FLAG[pais]} {pais}
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {byPais[pais]?.map(s => {
                const sel = draft.sociedades_preferidas.includes(s);
                const meta = SOCIEDADE_META[s];
                return (
                  <button
                    key={s}
                    onClick={() => toggleSociedade(s)}
                    title={meta.nome}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                      sel
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-600/20'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-purple-400 hover:text-purple-600'
                    )}
                  >
                    {sel && <CheckCircle2 className="w-3 h-3" />}
                    <span>{s}</span>
                    <span className={cn('text-[9px]', sel ? 'text-purple-200' : 'text-slate-400')}>{meta.area}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {draft.sociedades_preferidas.length > 0 && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mt-2">
            <p className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase mb-1.5">
              {draft.sociedades_preferidas.length} diretrizes selecionadas
            </p>
            <div className="flex flex-wrap gap-1">
              {draft.sociedades_preferidas.map(s => (
                <span key={s} className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold">{s}</span>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={Brain}
        title="Estilo de prescrição"
        sub="Define como o sistema prioriza e apresenta as recomendações terapêuticas"
        color="blue"
      >
        <div className="grid grid-cols-1 gap-2">
          {(Object.entries(ESTILO_META) as [EstiloPrescricao, typeof ESTILO_META[EstiloPrescricao]][]).map(([key, meta]) => {
            const sel = draft.estilo_prescricao === key;
            return (
              <button
                key={key}
                onClick={() => set('estilo_prescricao', key)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border text-left transition-all',
                  sel
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                )}
              >
                <span className="text-xl leading-none mt-0.5">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn('text-sm font-bold', sel ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200')}>
                      {meta.label}
                    </p>
                    {sel && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{meta.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Aba: Laboratórios ───────────────────────────────────────

function TabLaboratorios({ draft, toggleLab, set }: {
  draft: ReturnType<typeof usePhysicianProfile>['profile'];
  toggleLab: (id: string) => void;
  set: (k: string, v: unknown) => void;
}) {
  const labs = [
    { id: 'eurofarma', nome: 'Eurofarma', desc: 'Maior lab. brasileiro — Cardio, Endo, Resp.' },
    { id: 'ems',       nome: 'EMS',       desc: 'Amplo portfólio genéricos + especialidades' },
    { id: 'ache',      nome: 'Aché',      desc: 'Dermato, CNS, cardiologia' },
    { id: 'libbs',     nome: 'Libbs',     desc: 'Oncologia, biotecnologia, cardiologia' },
    { id: 'biolab',    nome: 'Biolab',    desc: 'Clínica médica, gineco, infectologia' },
    { id: 'bayer',     nome: 'Bayer',     desc: 'Cardio, oncologia, ginecologia' },
    { id: 'pfizer',    nome: 'Pfizer',    desc: 'Oncologia, hospital, vacinas' },
    { id: 'astrazeneca', nome: 'AstraZeneca', desc: 'Cardio, oncologia, diabetes' },
    { id: 'novartis',  nome: 'Novartis',  desc: 'Cardio, oftalmologia, dermatologia' },
    { id: 'sanofi',    nome: 'Sanofi',    desc: 'Diabetes, alergia, imunologia' },
    { id: 'roche',     nome: 'Roche',     desc: 'Oncologia, neurologia, imunologia' },
  ];

  return (
    <div className="space-y-4">
      <NeutralidadeAviso />

      <SectionCard
        icon={Building2}
        title="Laboratórios preferidos"
        sub="Quando existirem múltiplas marcas para a mesma molécula, as marcas dos laboratórios selecionados aparecem primeiro. A molécula recomendada não muda."
        color="emerald"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {labs.map(lab => {
            const sel = draft.laboratorios_preferidos.includes(lab.id);
            return (
              <button
                key={lab.id}
                onClick={() => toggleLab(lab.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                  sel
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                )}
              >
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0',
                  sel ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                )}>
                  {lab.nome.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={cn('text-sm font-bold', sel ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200')}>
                      {lab.nome}
                    </p>
                    {sel && <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{lab.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <Toggle
          checked={draft.exibir_marca_preferida_primeiro}
          onChange={v => set('exibir_marca_preferida_primeiro', v)}
          label="Exibir marca do laboratório preferido primeiro"
          desc="A evidência da molécula não muda — apenas a ordem de exibição das marcas comerciais"
        />
      </SectionCard>
    </div>
  );
}

// ─── Aba: Exibição CDS ───────────────────────────────────────

function TabExibicao({ draft, set }: { draft: ReturnType<typeof usePhysicianProfile>['profile']; set: (k: string, v: unknown) => void }) {
  return (
    <div className="space-y-4">
      <SectionCard
        icon={Sliders}
        title="Preferências de exibição no CDS"
        sub="Controla quais informações científicas são exibidas durante a consulta"
        color="blue"
      >
        <Toggle
          checked={draft.exibir_nivel_evidencia}
          onChange={v => set('exibir_nivel_evidencia', v)}
          label="Nível de evidência (A / B / C)"
          desc="Exibe badge Nível A/B/C e Grau I/IIa/IIb em cada recomendação"
        />
        <Toggle
          checked={draft.exibir_nnt_nnh}
          onChange={v => set('exibir_nnt_nnh', v)}
          label="NNT / NNH (número necessário para tratar)"
          desc="Exibe NNT e NNH dos principais estudos na tela de terapêutica"
        />
        <Toggle
          checked={draft.exibir_estudos_chave}
          onChange={v => set('exibir_estudos_chave', v)}
          label="Estudos clínicos de suporte"
          desc="Exibe nome e PMID dos estudos-chave ao lado de cada recomendação"
        />
        <Toggle
          checked={draft.exibir_alternativas}
          onChange={v => set('exibir_alternativas', v)}
          label="Alternativas terapêuticas"
          desc="Exibe opções alternativas de moléculas para a mesma indicação"
        />
        <Toggle
          checked={draft.alertar_atualizacao_diretriz}
          onChange={v => set('alertar_atualizacao_diretriz', v)}
          label="Alertar quando diretriz for atualizada"
          desc="Notifica quando uma das diretrizes preferenciais for revisada"
        />
      </SectionCard>
    </div>
  );
}

// ─── Aba: Favoritos ──────────────────────────────────────────

function TabFavoritos({ draft, removePrescricaoFavorita, addPrescricaoFavorita }: {
  draft: ReturnType<typeof usePhysicianProfile>['profile'];
  removePrescricaoFavorita: (id: string) => void;
  addPrescricaoFavorita: (p: Omit<PrescricaoFavorita, 'id' | 'adicionado_em' | 'vezes_usada'>) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', diagnostico: '', molecula: '', posologia: '', observacao: '' });

  const submit = () => {
    if (!form.nome || !form.molecula || !form.posologia) {
      toast.error('Preencha nome, molécula e posologia');
      return;
    }
    addPrescricaoFavorita(form);
    setForm({ nome: '', diagnostico: '', molecula: '', posologia: '', observacao: '' });
    setShowForm(false);
    toast.success('Prescrição favorita adicionada');
  };

  return (
    <div className="space-y-4">
      <SectionCard
        icon={FileText}
        title="Prescrições favoritas"
        sub="Posologias que você usa frequentemente — disponíveis para uso rápido durante a consulta"
        color="amber"
      >
        {draft.prescricoes_favoritas.length === 0 && !showForm && (
          <div className="text-center py-6 text-slate-400">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma prescrição favorita ainda.</p>
          </div>
        )}

        <div className="space-y-2">
          {draft.prescricoes_favoritas.map(p => (
            <div key={p.id} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{p.nome}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{p.molecula} · {p.posologia}</p>
                {p.diagnostico && <p className="text-[10px] text-slate-400 mt-0.5">Para: {p.diagnostico}</p>}
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Usado {p.vezes_usada}× na consulta</p>
              </div>
              <button
                onClick={() => removePrescricaoFavorita(p.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-dashed border-amber-300 dark:border-amber-700 rounded-xl hover:border-amber-500 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Adicionar prescrição favorita
          </button>
        ) : (
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Nova prescrição favorita</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 mb-1">Nome / apelido *</p>
                <TextInput value={form.nome} onChange={v => setForm(p => ({ ...p, nome: v }))} placeholder="Ex: HAS Estágio 1 — Enalapril" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Diagnóstico</p>
                <TextInput value={form.diagnostico} onChange={v => setForm(p => ({ ...p, diagnostico: v }))} placeholder="Hipertensão…" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-1">Molécula *</p>
                <TextInput value={form.molecula} onChange={v => setForm(p => ({ ...p, molecula: v }))} placeholder="Enalapril 10 mg" />
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 mb-1">Posologia *</p>
                <TextInput value={form.posologia} onChange={v => setForm(p => ({ ...p, posologia: v }))} placeholder="1 comprimido 12/12h" />
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-slate-500 mb-1">Observação</p>
                <TextInput value={form.observacao} onChange={v => setForm(p => ({ ...p, observacao: v }))} placeholder="Monitorar PA após 4 semanas…" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={submit} className="flex-1 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors">
                Salvar
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-300 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={ClipboardList}
        title="Protocolos favoritos"
        sub="Protocolos disponíveis em /protocolos — acesse para marcar seus favoritos"
        color="teal"
      >
        {draft.protocolos_favoritos.length === 0 ? (
          <div className="text-center py-4 text-slate-400">
            <ClipboardList className="w-7 h-7 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum protocolo favoritado ainda.</p>
            <a href="/protocolos" className="text-xs text-blue-500 hover:underline mt-1 inline-block">
              Ir para Protocolos →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {draft.protocolos_favoritos.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/10 rounded-xl">
                <Award className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p.nome}</p>
                  <p className="text-[10px] text-slate-400">{p.diagnostico} · {p.cid10}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

type Tab = 'identificacao' | 'especialidade' | 'diretrizes' | 'laboratorios' | 'exibicao' | 'favoritos';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'identificacao', label: 'Identificação',  icon: User         },
  { id: 'especialidade', label: 'Especialidade',  icon: Stethoscope  },
  { id: 'diretrizes',    label: 'Diretrizes',     icon: BookOpen     },
  { id: 'laboratorios',  label: 'Laboratórios',   icon: Building2    },
  { id: 'exibicao',      label: 'Exibição CDS',   icon: Sliders      },
  { id: 'favoritos',     label: 'Favoritos',      icon: Star         },
];

export default function PerfilPage() {
  const { profile, updateProfile, toggleSociedade, toggleLab, addPrescricaoFavorita, removePrescricaoFavorita } = usePhysicianProfile();
  const [draft, setDraft] = useState({ ...profile });
  const [tab, setTab] = useState<Tab>('identificacao');
  const [saved, setSaved] = useState(false);

  // Sync draft when profile loads from localStorage
  const synced = useRef(false);
  if (!synced.current) {
    synced.current = true;
    // draft already initialized from profile
  }

  const set = (key: string, value: unknown) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const save = () => {
    updateProfile(draft);
    setSaved(true);
    toast.success('Perfil salvo com sucesso');
    setTimeout(() => setSaved(false), 3000);
  };

  // For toggles that act immediately on the persisted profile
  const handleToggleSociedade = (s: SociedadeDiretriz) => {
    toggleSociedade(s);
    setDraft(prev => ({
      ...prev,
      sociedades_preferidas: prev.sociedades_preferidas.includes(s)
        ? prev.sociedades_preferidas.filter(x => x !== s)
        : [...prev.sociedades_preferidas, s],
    }));
  };

  const handleToggleLab = (id: string) => {
    toggleLab(id);
    setDraft(prev => ({
      ...prev,
      laboratorios_preferidos: prev.laboratorios_preferidos.includes(id)
        ? prev.laboratorios_preferidos.filter(x => x !== id)
        : [...prev.laboratorios_preferidos, id],
    }));
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-black text-slate-900 dark:text-white">Perfil Médico</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Personalização da experiência clínica · v{profile.versao_perfil}
            </p>
          </div>
          <button
            onClick={save}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all',
              saved
                ? 'bg-green-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
            )}
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Salvo!' : 'Salvar perfil'}
          </button>
        </div>

        {/* Aviso geral */}
        <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Personalizações neste perfil não alteram a recomendação baseada em evidências científicas.
            A cadeia <strong>Diretriz → Classe → Molécula</strong> permanece intacta.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors -mb-px',
                  tab === t.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === 'identificacao' && <TabIdentificacao draft={draft} set={set} />}
        {tab === 'especialidade' && <TabEspecialidade draft={draft} set={set} />}
        {tab === 'diretrizes'    && <TabDiretrizes draft={draft} toggleSociedade={handleToggleSociedade} set={set} />}
        {tab === 'laboratorios'  && <TabLaboratorios draft={draft} toggleLab={handleToggleLab} set={set} />}
        {tab === 'exibicao'      && <TabExibicao draft={draft} set={set} />}
        {tab === 'favoritos'     && (
          <TabFavoritos
            draft={draft}
            removePrescricaoFavorita={(id) => {
              removePrescricaoFavorita(id);
              setDraft(p => ({ ...p, prescricoes_favoritas: p.prescricoes_favoritas.filter(x => x.id !== id) }));
            }}
            addPrescricaoFavorita={(p) => {
              addPrescricaoFavorita(p);
              const nova = { ...p, id: `pf-${Date.now()}`, adicionado_em: new Date().toISOString(), vezes_usada: 0 };
              setDraft(prev => ({ ...prev, prescricoes_favoritas: [...prev.prescricoes_favoritas, nova] }));
            }}
          />
        )}

        {/* Footer save */}
        <div className="flex justify-end pt-2 pb-6">
          <button
            onClick={save}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all',
              saved
                ? 'bg-green-500 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20'
            )}
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Perfil salvo!' : 'Salvar perfil'}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
