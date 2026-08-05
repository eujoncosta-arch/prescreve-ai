// ============================================================
// PRESCREVE-AI — Registro central de navegação clínica (RM-59)
//
// Fonte única da barra lateral (`Sidebar.tsx` importa `NAV_GROUPS`
// daqui — antes a lista vivia duplicada só no componente). Cada item
// agora carrega um campo OBRIGATÓRIO `classification` — o TypeScript
// recusa compilar um novo item de página sem essa classificação
// explícita, o que impede estruturalmente que uma página nova das
// seções "Científico"/"Inteligência" seja adicionada sem que alguém
// decida conscientemente se ela é real, híbrida, demonstrativa ou
// puramente referencial.
//
// Investigação RM-59 (revalidada nesta sessão, não herdada de RM-58):
// para cada página das seções Científico/Inteligência, verificado por
// leitura direta do código-fonte: uso de `useApp()`, uso de
// `useLocalStorage`/outro canal de estado real, chamadas a
// `seed*Demo()`, presença de perfis/pacientes/especialistas fabricados
// (`DEMO_*`, `PERFIL_DEMO`, especialistas com CRM/ORCID inventados),
// e se o conteúdo é referência curada real (base de evidência com
// citação de estudo real, ex. "ALLHAT 2002") ou simulação de atividade
// institucional fabricada.
//
// RM-60 (inventário) → RM-70 (decisão do dono do produto): `/validacao-real`
// e `/qualidade-hospital` foram removidas deste registro — maior risco de
// interpretação enganosa do levantamento (Kappa/IC95% e ranking hospitalar
// inteiramente fabricados, apresentados com rigor estatístico/institucional
// real). `/validacao-clinica` também foi removida — é um dashboard de
// execução de testes automatizados (QA), não uma ferramenta de apoio à
// decisão clínica, e não deveria estar ao lado de ferramentas reais no menu
// do médico. Nenhuma rota foi excluída do código-fonte, apenas desta
// navegação. `/comite` permanece (classificação `demonstracao` inalterada),
// mas suas credenciais fabricadas (CRM/ORCID/instituições reais) foram
// removidas em `lib/comite.ts` na mesma RM.
//
// RM-60 (§10, item 6) → RM-71: `/explicar` e `/explicabilidade` NÃO foram
// fundidas — investigação mostrou que resolvem problemas diferentes:
// `/explicar` é uma biblioteca de racional clínico POR CONDIÇÃO (busca/
// navega, nunca lê `useApp()`, sempre o mesmo conteúdo estático,
// classificação `referencia`); `/explicabilidade` é explicabilidade
// PERSONALIZADA por paciente (lê a consulta ativa real desde o RM-65,
// WHY NOT verifica contraindicação contra o perfil real, classificação
// `hibrido`). A sobreposição era só de nome/framing, não de motor ou
// dado — resolvida trocando os labels do menu (`Racional por Condição` /
// `Explicabilidade da Consulta`) e os títulos das próprias páginas.
//
// RM-60 (§10, item 7) → RM-72: `/atualizacoes-cientificas` foi removida
// deste registro — aqui a sobreposição com `/atualizacoes` era REAL, não
// só de nome: a aba "Diretrizes ativas" duplicava (de forma mais rasa,
// sem DOI/evidência por mudança) o que `/atualizacoes` já cobre melhor; a
// aba "Alertas" simulava monitoramento contínuo de 15 sociedades médicas
// (`DELTAS_DEMO`) sem nenhuma integração real de feed por trás — risco de
// o médico achar que existe vigilância ativa de diretrizes que não existe.
// `/atualizacoes` (curada, com DOI e evidência por mudança) permanece como
// única página do tópico.
//
// RM-60 (§10, item 10) → RM-73: escopo do `/copilot` definido formalmente
// como ferramenta de AUXÍLIO À REDAÇÃO — gera rascunho (SOAP, resumo,
// diferenciais, 2ª opinião, discussão, evolução) que o médico DEVE revisar
// e editar por completo antes de qualquer uso real; nunca populariza
// prescrição/prontuário automaticamente. Label do menu e banner de aviso
// na própria página reforçam isso explicitamente (nenhuma mudança de
// motor). Consistente com o restante do sistema (CDSS, decisão médica
// soberana).
//
// RM-60 (§10, itens 8/9) → RM-75: `/digital-twin` fica demonstrativo
// permanentemente — investigação confirmou que não há caminho de baixo
// esforço (precisaria de persistência de série temporal de sinais
// vitais/labs por paciente, infraestrutura que não existe hoje).
// `/medicina-precisao` foi RECLASSIFICADA de `demonstracao` para
// `hibrido` — diferente do digital-twin, esta já é uma calculadora real:
// o genótipo inicial é só um ponto de partida editável (o usuário altera
// alelo/fenótipo de cada gene na própria UI) e a base de evidência
// (`FARMACOGENOMICA_DB`) tem DOIs reais de guidelines CPIC. O único gap
// é a importação automática de um laboratório de genotipagem — não a
// funcionalidade em si, que já funciona com entrada manual (mesmo
// padrão de `/dosagem`, `referencia`).
//
// RM-60 (§10, item 5) → RM-80: `/repositorio` e `/evidence` NÃO foram
// fundidas, mesmo após reconciliação item a item (14 citações de
// `scientific-repository.ts` comparadas contra `EVIDENCE_DB`) — a
// investigação revelou que `/repositorio` NÃO é um subconjunto de
// `/evidence`: cobre uma condição inteira (Pneumonia/J18, diretriz SBPT)
// ausente em `/evidence`, e cita estudos reais (UKPDS 33, COPERNICUS)
// sem equivalente estruturado lá. Migrar essas condições/estudos exigiria
// criar categorias de diagnóstico novas com dados de estudo (N, NNT, HR)
// que não têm fonte verificada disponível nesta sessão — risco real de
// fabricar estatística clínica. Mantidas separadas e diferenciadas por
// escopo (`/repositorio` = mais condições, mais raso; `/evidence` = 12
// condições, mais profundo — inclui conflitos entre diretrizes), mesmo
// padrão de decisão do RM-71 (`/explicar` vs. `/explicabilidade`). Duas
// citações estavam desatualizadas (7ª→8ª diretriz de HAS, ESC-HF
// 2021→2023) — corrigidas nos RM-76/77, não uma questão de fusão.
//
// RM-60 (§10, item 5) → RM-80 (continuação): `/farmalib` foi removida
// deste registro — diferente de `/repositorio`/`/evidence`, aqui a fusão
// era segura: `pharma-library.ts` já importa `EUROFARMA_CATALOG` de
// `eurofarma-sync.ts` (não duplica dado), e `/biblioteca` já tinha uma
// seção "outros laboratórios" própria (lista hardcoded incompleta, 8 de
// 10 nomes, com nota de implementação desatualizada) — substituída pelo
// dado real de `LABORATORIOS`. Nenhum conteúdo único de `/farmalib` ficou
// para trás.
// ============================================================

import type { LucideIcon } from 'lucide-react';
import {
  Award, LayoutDashboard, FilePlus2, History, FileText, BookOpen, Shield,
  Sparkles, Settings, ShieldCheck, Library, BookMarked, Zap,
  Calculator, ClipboardList, GitBranch, TrendingUp, Users, Microscope,
  Building2, UserCircle, Scale, Brain, Lightbulb, Globe, Dna, Network,
  BarChart3, Activity, Clock, FlaskConical, Share2, Bot,
  Pill, HelpCircle, Beaker,
} from 'lucide-react';

/**
 * - `operacional_real`: consome `useApp()` (paciente/consulta real em
 *   atendimento) e persiste no backend real.
 * - `referencia`: conteúdo de consulta/catálogo/calculadora — nunca se
 *   apresenta como refletindo "este paciente" nem simula atividade
 *   institucional fabricada (ex.: biblioteca de bulas, comparador de
 *   moléculas, tabela de NNT com citação de estudo real).
 * - `demonstracao`: usa `seed*Demo()`/perfil-paciente-fabricado/
 *   especialistas fictícios — apresenta algo que PARECE atividade
 *   clínica/institucional real, mas é inteiramente sintético.
 * - `hibrido`: combina uma entrada real (ex.: última anamnese salva via
 *   `useLocalStorage`) com escolhas manuais/arbitrárias na própria
 *   página (diagnóstico/medicamento não vinculados à conduta real da
 *   consulta em atendimento).
 */
export type PageClassification = 'operacional_real' | 'referencia' | 'demonstracao' | 'hibrido';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge: string | null;
  classification: PageClassification;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Clínico',
    items: [
      { href: '/',                  label: 'Dashboard',             icon: LayoutDashboard, badge: null,    classification: 'referencia' },
      { href: '/consulta/nova',     label: 'Nova Consulta',         icon: FilePlus2,       badge: null,    classification: 'operacional_real' },
      { href: '/prescricao-rapida', label: 'Prescrição Rápida',     icon: Zap,             badge: 'NOVO',  classification: 'operacional_real' },
      { href: '/calculadoras',      label: 'Calculadoras',          icon: Calculator,      badge: 'NOVO',  classification: 'referencia' },
      { href: '/protocolos',        label: 'Protocolos',            icon: ClipboardList,   badge: 'NOVO',  classification: 'referencia' },
      { href: '/timeline',          label: 'Timeline Clínica',      icon: GitBranch,       badge: 'NOVO',  classification: 'operacional_real' },
      { href: '/demo',              label: 'Casos Demo',            icon: Sparkles,        badge: 'DEMO',  classification: 'demonstracao' },
      { href: '/historico',         label: 'Histórico',             icon: History,         badge: null,    classification: 'operacional_real' },
      { href: '/prescricoes',       label: 'Prescrições',           icon: FileText,        badge: null,    classification: 'operacional_real' },
    ],
  },
  {
    label: 'Científico',
    items: [
      { href: '/repositorio',   label: 'Repositório (todas as condições)',         icon: BookMarked,  badge: null,   classification: 'referencia' },
      { href: '/biblioteca',    label: 'Farmacológica',       icon: Library,     badge: 'EURO', classification: 'referencia' },
      { href: '/evidencias',    label: 'Evidências',          icon: BookOpen,    badge: null,   classification: 'referencia' },
      { href: '/evidence',      label: 'Evidence Engine (12 condições, em profundidade)',     icon: Microscope,  badge: 'NOVO', classification: 'referencia' },
      { href: '/comparador',       label: 'Comparador',          icon: Scale,       badge: 'NOVO', classification: 'referencia' },
      { href: '/insights',         label: 'Clinical Insights',   icon: Brain,       badge: 'NOVO', classification: 'demonstracao' },
      { href: '/segunda-opiniao',  label: 'Segunda Opinião',     icon: Lightbulb,   badge: 'NOVO', classification: 'referencia' },
      { href: '/dosagem',       label: 'Cálculo de Doses',    icon: Pill,        badge: 'NOVO', classification: 'referencia' },
      { href: '/eurofarma',     label: 'Eurofarma',           icon: Beaker,      badge: 'EURO', classification: 'referencia' },
      { href: '/explicar',      label: 'Racional por Condição', icon: HelpCircle,  badge: 'NOVO', classification: 'referencia' },
      { href: '/governanca',    label: 'Governança',          icon: ShieldCheck, badge: null,   classification: 'demonstracao' },
      { href: '/comite',        label: 'Comitê Científico',   icon: Users,       badge: 'NOVO', classification: 'demonstracao' },
      { href: '/atualizacoes',  label: 'Guideline Updates',   icon: TrendingUp,  badge: '2025', classification: 'referencia' },
    ],
  },
  {
    label: 'Inteligência',
    items: [
      { href: '/rwe',                      label: 'Real World Evidence',   icon: Globe,        badge: 'P12', classification: 'demonstracao' },
      { href: '/digital-twin',             label: 'Gêmeo Digital',         icon: Dna,          badge: 'P12', classification: 'demonstracao' },
      { href: '/rede-medica',              label: 'Rede Médica',           icon: Network,      badge: 'P12', classification: 'demonstracao' },
      { href: '/outcomes',                 label: 'Desfechos (NNT/NNH)',   icon: BarChart3,    badge: 'P12', classification: 'referencia' },
      { href: '/prognostico',              label: 'Prognose Preditiva',    icon: Activity,     badge: 'P12', classification: 'demonstracao' },
      { href: '/evidence-timeline',        label: 'Timeline Evidências',   icon: Clock,        badge: 'P12', classification: 'referencia' },
      { href: '/farma-analytics',          label: 'Farma Analytics',       icon: FlaskConical, badge: 'P12', classification: 'demonstracao' },
      { href: '/explicabilidade',          label: 'Explicabilidade da Consulta',   icon: Brain,        badge: 'P14', classification: 'hibrido' },
      { href: '/interoperabilidade',         label: 'Interoperabilidade',    icon: Share2,       badge: 'P17', classification: 'demonstracao' },
      { href: '/medicina-precisao',          label: 'Precision Medicine',    icon: Dna,          badge: 'P18', classification: 'hibrido' },
      { href: '/copilot',                    label: 'Copiloto — Rascunho Assistido',    icon: Bot,          badge: 'P19', classification: 'demonstracao' },
      { href: '/knowledge-graph',            label: 'Knowledge Graph',       icon: Network,      badge: 'P20', classification: 'referencia' },
    ],
  },
  {
    label: 'Institucional',
    items: [
      { href: '/showcase',       label: 'Lab Showcase',     icon: Building2,  badge: 'NOVO', classification: 'referencia' },
      { href: '/maturity-report',label: 'Maturity Report',  icon: Award,      badge: 'P20',  classification: 'referencia' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/auditoria',     label: 'Auditoria',     icon: Shield,     badge: 'NOVO', classification: 'operacional_real' },
      { href: '/regulatorio',   label: 'Regulatório',   icon: ShieldCheck, badge: 'NOVO', classification: 'referencia' },
      { href: '/perfil',        label: 'Meu Perfil',    icon: UserCircle, badge: null,    classification: 'operacional_real' },
      { href: '/configuracoes', label: 'Configurações', icon: Settings,   badge: null,    classification: 'operacional_real' },
    ],
  },
];

/** Páginas que devem exibir `DemoDataNotice` — 'demonstracao' e 'hibrido'. */
export function requerAvisoDeDemonstracao(classification: PageClassification): boolean {
  return classification === 'demonstracao' || classification === 'hibrido';
}
