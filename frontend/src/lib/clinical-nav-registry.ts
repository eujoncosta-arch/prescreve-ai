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
// ============================================================

import type { LucideIcon } from 'lucide-react';
import {
  Award, LayoutDashboard, FilePlus2, History, FileText, BookOpen, Shield,
  Sparkles, Settings, ShieldCheck, Library, BookMarked, Zap,
  Calculator, ClipboardList, GitBranch, TrendingUp, Users, Microscope,
  Building2, UserCircle, Scale, Brain, Lightbulb, Globe, Dna, Network,
  BarChart3, Activity, Clock, FlaskConical, Share2, Bot,
  Pill, HelpCircle, Package, Beaker,
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
      { href: '/repositorio',   label: 'Repositório',         icon: BookMarked,  badge: null,   classification: 'referencia' },
      { href: '/biblioteca',    label: 'Farmacológica',       icon: Library,     badge: 'EURO', classification: 'referencia' },
      { href: '/evidencias',    label: 'Evidências',          icon: BookOpen,    badge: null,   classification: 'referencia' },
      { href: '/evidence',      label: 'Evidence Engine',     icon: Microscope,  badge: 'NOVO', classification: 'referencia' },
      { href: '/comparador',       label: 'Comparador',          icon: Scale,       badge: 'NOVO', classification: 'referencia' },
      { href: '/insights',         label: 'Clinical Insights',   icon: Brain,       badge: 'NOVO', classification: 'demonstracao' },
      { href: '/segunda-opiniao',  label: 'Segunda Opinião',     icon: Lightbulb,   badge: 'NOVO', classification: 'referencia' },
      { href: '/dosagem',       label: 'Cálculo de Doses',    icon: Pill,        badge: 'NOVO', classification: 'referencia' },
      { href: '/farmalib',      label: 'Farmacoteca',         icon: Package,     badge: 'NOVO', classification: 'referencia' },
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
      { href: '/medicina-precisao',          label: 'Precision Medicine',    icon: Dna,          badge: 'P18', classification: 'demonstracao' },
      { href: '/copilot',                    label: 'AI Medical Copilot',    icon: Bot,          badge: 'P19', classification: 'demonstracao' },
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
