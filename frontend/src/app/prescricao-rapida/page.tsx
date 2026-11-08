'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { LABORATORIOS } from '@/lib/utils';
import {
  searchDrugs, getBrandsForLab, getPreferredBrandForPatient, getPreferredConcentration,
  GESTANTE_LABELS,
  type QuickDrug, type QuickBrand,
} from '@/lib/pharma-database';
import {
  calcCrCl, calcBSA, calcIMC, calcWeightDose, convertDose,
  getAdjustmentForCrCl, checkBeersCriteria,
  type CrClResult, type FullDoseResult,
} from '@/lib/dose-calculator';
import { DoseCalcCard } from '@/components/modules/DoseCalcCard';
import { runSafetyCheck, SEVERITY_CONFIG, type QuickSafetyAlert, type SafetyCheckResult } from '@/lib/safety-rules';
import { coberturaIncompleta, rotuloAlertaNaoConfirmado, descreverClassificacaoAlerta } from '@/lib/safety-coverage';
import { SafetyCoverageNotice } from '@/components/modules/SafetyCoverageNotice';
import { AlergiasNotice } from '@/components/modules/AlergiasNotice';
import { normalizarIdade, formatarIdade, type UnidadeIdade } from '@/lib/age-contract';
import { dadosClinicosPreenchidos } from '@/lib/patient-session';
import { type PosologiaRegistrada, type OrigemDetalhe } from '@/lib/dose-contract';
import { registroDeResultadoMotorC, registroDeInclusaoComDosePreenchida, registroDeInclusaoComFonteDaDose, registrarEdicaoPosologica, semRegistroParaPersistir } from '@/lib/prescricao-proveniencia';
import { ROTULO_CAMPO } from '@/lib/safety-context';
import { PrescriptionPrintPreview } from '@/components/modules/PrescriptionPrintPreview';
import type { StatusAlergiasInformado, TipoAlergia, GravidadeAlergia, AlergiasInput } from '@/lib/safety-allergy';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import {
  Zap, Search, Pill, Calculator, Shield, Star, History,
  Plus, Trash2, Printer, ChevronDown, ChevronUp, AlertTriangle,
  Building2, User, BookOpen,
  X, FileText, ExternalLink,
  Library, FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── TIPOS LOCAIS ─────────────────────────────────────────────

interface PatientInfo {
  nome: string;
  idade: string;
  /** RM-105.2.2: unidade explícita da idade; '' = não escolhida (o valor NÃO é interpretado). */
  idade_unidade: '' | UnidadeIdade;
  sexo: 'M' | 'F' | '';
  peso: string;
  altura: string;
  creatinina: string;
  child_pugh: '' | 'A' | 'B' | 'C';
  diagnostico: string;
  observacoes: string;
  /** RM-105.2: tri-state — '' = NÃO informado (nunca interpretado como "não"). */
  gestante: '' | 'sim' | 'nao';
  lactante: '' | 'sim' | 'nao';
  /** RM-105.2: estado explícito das alergias. */
  alergias_status: StatusAlergiasInformado;
  alergias: AlergiaUI[];
}

interface AlergiaUI {
  id: string;
  substancia: string;
  tipo: TipoAlergia;
  gravidade: '' | GravidadeAlergia;
  reacao: string;
  registrado_em: string;
}

/** RM-105.2: monta o estado explícito de alergias para o motor de segurança. */
const ROTULO_UNIDADE: Record<UnidadeIdade, string> = { dias: 'Dias', meses: 'Meses', anos: 'Anos' };
const ROTULO_TRI: Record<string, string> = { nao_informado: 'Não informado', nao: 'Não', sim: 'Sim' };
const ROTULO_ALERGIAS: Record<StatusAlergiasInformado, string> = { nao_informado: 'Não informado', sem_alergias_conhecidas: 'Sem alergias conhecidas (informado)', informadas: 'Alergias informadas' };
const ROTULO_TIPO: Record<TipoAlergia, string> = { medicamento: 'Medicamento', alimento: 'Alimento', ambiental: 'Ambiental', outro: 'Outro' };
const ROTULO_GRAVIDADE: Record<string, string> = { nao_informada: 'Gravidade n/i', leve: 'Leve', moderada: 'Moderada', grave: 'Grave' };

function montarAlergiasInput(p: PatientInfo): AlergiasInput {
  if (p.alergias_status !== 'informadas') return { status: p.alergias_status };
  return {
    status: 'informadas',
    registros: p.alergias.map(a => ({
      substancia: a.substancia,
      tipo: a.tipo,
      gravidade: a.gravidade || undefined,
      reacao: a.reacao.trim() || undefined,
      origem: 'informado pelo prescritor na tela de prescrição rápida',
      registrado_em: a.registrado_em,
    })),
  };
}

interface RxItem {
  id: string;
  molecula: string;
  /** RM-105.1: ID da entidade farmacológica escolhida (QuickDrug.id). Ausente em protocolos antigos: identidade não confirmada. */
  entidade_id?: string;
  nome_comercial: string;
  laboratorio: string;
  concentracao: string;
  forma_farmaceutica: string;
  dose: string;
  via: string;
  frequencia: string;
  duracao: string;
  instrucoes: string;
  uso_continuo: boolean;
  tipo_receita: 'simples' | 'especial_branca' | 'especial_azul';
  produto_id?: string;
  bula_profissional?: string;
  bula_paciente?: string;
  /**
   * RM-107.1.1-E2: proveniência/avaliação da posologia, SOMENTE em memória. Ausente (item legado/de protocolo) ⇒ interpretado como `nao_avaliada`.
   * Nunca é gravado em favoritos (ver `saveFavorite`).
   */
  posologia_registrada?: PosologiaRegistrada;
}

interface FavoriteProtocol {
  id: string;
  nome: string;
  descricao: string;
  itens: RxItem[];
  criado_em: string;
}

const BLANK_PATIENT: PatientInfo = {
  nome: '', idade: '', idade_unidade: '', sexo: '', peso: '', altura: '',
  creatinina: '', child_pugh: '', diagnostico: '', observacoes: '',
  gestante: '', lactante: '', alergias_status: 'nao_informado', alergias: [],
};

const BLANK_ITEM: Omit<RxItem, 'id'> = {
  molecula: '', nome_comercial: '', laboratorio: '', concentracao: '',
  forma_farmaceutica: '', dose: '', via: 'VO', frequencia: '1x/dia',
  duracao: '30 dias', instrucoes: '', uso_continuo: false,
  tipo_receita: 'simples',
};

// Extrai só a porção numérica/fração inicial de uma concentração (ex.:
// "40/12,5 mg" → "40/12,5"; "40 mg" → "40"; "2 mg/mL" → "2"), descartando
// a unidade — usado para sincronizar o campo Dose com a concentração
// selecionada quando o valor de dose exibido ainda é o "auto" (número puro
// que reflete a concentração), nunca sobrescrevendo uma dose editada
// manualmente pelo médico.
function stripUnit(s: string): string {
  const m = s.match(/^[\d.,/]+/);
  return m ? m[0].trim() : s;
}

const FREQUENCIAS = ['1x/dia', '2x/dia (12/12h)', '3x/dia (8/8h)', '4x/dia (6/6h)', 'A cada 8h', 'A cada 12h', 'Dose única', 'Se necessário', 'À noite', 'Pela manhã', 'Com as refeições'];
const DURACOES = ['3 dias', '5 dias', '7 dias', '10 dias', '14 dias', '30 dias', '60 dias', '90 dias', 'Uso contínuo', 'Até retorno'];
const VIAS = ['VO', 'Sublingual', 'Inalatório', 'Tópico', 'IV', 'IM', 'SC', 'Retal', 'Ocular'];

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────

export default function PrescricaoRapida() {
  const { state } = useApp();
  const labPref = state.settings.preferencia_laboratorio;

  // ── State ──────────────────────────────────────────────────
  const [patient, setPatient] = useState<PatientInfo>(BLANK_PATIENT);
  const [patientExpanded, setPatientExpanded] = useState(true);
  // RM-105.2.2: a idade só é interpretada com UNIDADE explícita (dias | meses | anos). Valor sem unidade não vale.
  const idadeRes = useMemo(
    () => normalizarIdade(patient.idade.trim() === '' ? undefined : { valor: Number(patient.idade), unidade: patient.idade_unidade || undefined }),
    [patient.idade, patient.idade_unidade],
  );
  const idadeAnos: number | undefined = idadeRes.estado === 'informada' ? idadeRes.idade.anos : undefined;
  const idadeTexto = idadeRes.estado === 'informada' ? formatarIdade(idadeRes.idade) : '';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<QuickDrug[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<QuickDrug | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<QuickBrand | null>(null);
  const [selectedConcentration, setSelectedConcentration] = useState('');
  const [customDose, setCustomDose] = useState('');
  // RM-107.1.1-E2.3: fonte TECNICAMENTE comprovada do valor atual do campo de dose (preenchido pelo sistema × alterado no campo pelo prescritor).
  const [customDoseFonte, setCustomDoseFonte] = useState<OrigemDetalhe | 'digitada' | null>(null);
  const [rxItems, setRxItems] = useState<RxItem[]>([]);
  // RM-104: guarda o RESULTADO com cobertura (não só a lista de alertas): lista vazia ≠ "seguro".
  const [safetyResult, setSafetyResult] = useState<SafetyCheckResult | null>(null);
  const [avaliadoEm, setAvaliadoEm] = useState<string | null>(null);
  /** RM-105.2.1: aviso de que o protocolo recuperado traz só os itens — nunca alergias, contexto nem avaliação. */
  const [protocoloRecuperado, setProtocoloRecuperado] = useState<{ nome: string; criadoEm: string; semId: number; descartou: boolean } | null>(null);
  /** RM-105.2.2: protocolo aguardando confirmação para descartar os dados clínicos da sessão atual. */
  const [trocaPendente, setTrocaPendente] = useState<FavoriteProtocol | null>(null);
  const safetyAlerts: QuickSafetyAlert[] = safetyResult?.alertas ?? [];
  const [favorites, setFavorites] = useState<FavoriteProtocol[]>([]);
  const [activeTab, setActiveTab] = useState<'prescricao' | 'calculadora' | 'favoritos' | 'historico'>('prescricao');
  const [drugInfoExpanded, setDrugInfoExpanded] = useState(false);
  const [, setCalcResult] = useState<string[]>([]);
  const [crclResult, setCrclResult] = useState<CrClResult | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [convMg, setConvMg] = useState('');
  const [convConc, setConvConc] = useState('');

  // RM-52 (react-hooks/set-state-in-effect): estes 5 efeitos sincronizam
  // estado derivado (busca, marca/concentração preferidas, CrCl, alertas de
  // segurança) a partir de outras props/estado. Como os alvos (`selectedBrand`
  // etc.) também podem ser sobrescritos manualmente em handlers de clique
  // (não são só derivados), não dá para virar useMemo puro — em vez disso, o
  // setState de cada efeito é adiado para um microtask, removendo o
  // "cascading render síncrono" que a regra aponta, sem mudar o
  // comportamento (o auto-recálculo ainda ocorre sempre que as deps mudam).

  // ── Load favorites from localStorage ─────────────────────
  useEffect(() => {
    let cancelado = false;
    try {
      const stored = localStorage.getItem('prescreve-ai-favoritos');
      if (stored) {
        const parsed = JSON.parse(stored);
        queueMicrotask(() => { if (!cancelado) setFavorites(parsed); });
      }
    } catch {
      // ignore
    }
    return () => { cancelado = true; };
  }, []);

  // ── Search ────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    const results = searchQuery.length < 2 ? [] : searchDrugs(searchQuery, labPref).slice(0, 8);
    queueMicrotask(() => { if (!cancelado) setSearchResults(results); });
    return () => { cancelado = true; };
  }, [searchQuery, labPref]);

  // ── Re-selecionar forma líquida quando idade ou peso muda (paciente pediátrico) ─
  useEffect(() => {
    if (!selectedDrug) return;
    let cancelado = false;
    const preferred = getPreferredBrandForPatient(selectedDrug, labPref, idadeAnos);
    queueMicrotask(() => {
      if (cancelado) return;
      setSelectedBrand(preferred);
      if (preferred) {
        setSelectedConcentration(getPreferredConcentration(preferred, selectedDrug, idadeAnos));
      }
    });
    return () => { cancelado = true; };
  }, [idadeAnos, labPref, selectedDrug]);

  // ── CrCl auto-calc ────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    const result = (idadeAnos !== undefined && patient.peso && patient.creatinina && patient.sexo)
      ? calcCrCl({
          idade: idadeAnos,
          sexo: patient.sexo as 'M' | 'F',
          peso: Number(patient.peso),
          creatinina: Number(patient.creatinina),
        })
      : null;
    queueMicrotask(() => { if (!cancelado) setCrclResult(result); });
    return () => { cancelado = true; };
  }, [idadeAnos, patient.peso, patient.creatinina, patient.sexo]);

  // ── Safety check ─────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    const resultado = rxItems.length < 1 ? null : runSafetyCheck({
      moleculas: rxItems.map(i => i.molecula),
      entidade_ids: rxItems.map(i => i.entidade_id),
      // RM-105.2: '' (não informado) vira undefined — nunca "não gestante". Idade/peso vazios também ficam ausentes.
      gestante: patient.gestante === '' ? undefined : patient.gestante === 'sim',
      lactante: patient.lactante === '' ? undefined : patient.lactante === 'sim',
      // RM-105.2.2: idade com unidade explícita; sem unidade o motor marca a idade como inválida (não interpreta).
      idade: patient.idade.trim() === '' ? undefined : { valor: Number(patient.idade), unidade: (patient.idade_unidade || undefined) as UnidadeIdade },
      peso_kg: patient.peso.trim() === '' ? undefined : Number(patient.peso),
      sexo: patient.sexo === '' ? undefined : patient.sexo,
      alergias: montarAlergiasInput(patient),
      crclValue: crclResult?.crcl,
    });
    queueMicrotask(() => {
      if (cancelado) return;
      setSafetyResult(resultado);
      setAvaliadoEm(resultado ? new Date().toISOString() : null);
    });
    return () => { cancelado = true; };
  }, [rxItems, patient, crclResult]);

  // ── Select drug ───────────────────────────────────────────
  const selectDrug = useCallback((drug: QuickDrug) => {
    setSelectedDrug(drug);
    setSearchQuery(drug.molecula);
    setSearchResults([]);
    setDrugInfoExpanded(false);
    const preferred = getPreferredBrandForPatient(drug, labPref, idadeAnos);
    setSelectedBrand(preferred);
    const defaultConc = preferred
      ? getPreferredConcentration(preferred, drug, idadeAnos)
      : drug.dose_adulto.habitual + ' ' + drug.dose_adulto.unidade;
    setSelectedConcentration(defaultConc);
    setCustomDose(drug.dose_adulto.habitual);
    setCustomDoseFonte('catalogo_dose_habitual');

    // Auto-calc se peso disponível e tem dose pediátrica
    if (patient.peso && drug.dose_pediatrica && drug.dose_pediatrica.dose_por_kg > 0) {
      const result = calcWeightDose(
        drug.dose_pediatrica.dose_por_kg,
        Number(patient.peso),
        drug.dose_pediatrica.frequencia_divisoes,
        drug.dose_pediatrica.max_dose_dia,
        drug.dose_pediatrica.unidade,
      );
      setCalcResult(result.passo_a_passo);
      setCustomDose(String(result.dose_por_tomada));
      setCustomDoseFonte('calculo_peso_simples');
    }
  }, [labPref, patient.peso, idadeAnos]);

  // ── Add to prescription ───────────────────────────────────
  const addToRx = useCallback(() => {
    if (!selectedDrug) return;
    const brand = selectedBrand ?? selectedDrug.marcas[0];
    const item: RxItem = {
      ...BLANK_ITEM,
      id: Date.now().toString(),
      molecula: selectedDrug.molecula,
      entidade_id: selectedDrug.id,
      nome_comercial: brand?.nome ?? selectedDrug.molecula,
      laboratorio: brand?.laboratorio ?? '',
      concentracao: selectedConcentration,
      forma_farmaceutica: brand?.formas?.[0] ?? 'Comprimido',
      produto_id: brand?.produto_id,
      bula_profissional: brand?.bula_profissional,
      bula_paciente: brand?.bula_paciente,
      dose: customDose + ' ' + selectedDrug.dose_adulto.unidade,
      via: selectedDrug.dose_adulto.via,
      frequencia: selectedDrug.dose_adulto.frequencias[0] ?? '1x/dia',
      duracao: '30 dias',
      tipo_receita: selectedDrug.alertas_especiais.some(a => a.includes('RECEITA ESPECIAL')) ? 'especial_branca' : 'simples',
    };
    // RM-107.1.1-E2.1 (F3b): a dose vem pré-preenchida pelo sistema (catálogo/calcWeightDose) e pode ter sido editada no campo —
    // a origem não é determinável ⇒ `desconhecida`; SEMPRE não avaliada; nenhuma dose estruturada fabricada; valores do item inalterados.
    item.posologia_registrada = customDoseFonte
      ? registroDeInclusaoComFonteDaDose({ fonte: customDoseFonte, texto: item.dose, campos_padrao: ['via', 'frequencia', 'duracao'] })
      : registroDeInclusaoComDosePreenchida({ texto: item.dose, campos_padrao: ['via', 'frequencia', 'duracao'] });
    setRxItems(prev => [...prev, item]);
    toast.success(`${selectedDrug.molecula} adicionado à prescrição`);
    setSelectedDrug(null);
    setSearchQuery('');
    setCustomDose('');
    setCustomDoseFonte(null);
    setCalcResult([]);
  }, [selectedDrug, selectedBrand, selectedConcentration, customDose, customDoseFonte]);

  // ── Apply dose calc result → add to Rx ───────────────────
  const applyDoseCalc = useCallback((result: FullDoseResult, duracao?: string) => {
    if (!selectedDrug) return;
    const brand = selectedBrand ?? selectedDrug.marcas[0];
    const freqMap: Record<number, string> = {
      1: '1x/dia', 2: '2x/dia (12/12h)', 3: '3x/dia (8/8h)', 4: '4x/dia (6/6h)',
    };
    const doseTexto = result.volume_por_tomada !== undefined
      ? `${result.volume_por_tomada} mL (${result.dose_por_tomada} ${result.dose_unidade})`
      : `${result.dose_por_tomada} ${result.dose_unidade}`;
    const item: RxItem = {
      ...BLANK_ITEM,
      id: Date.now().toString(),
      molecula: selectedDrug.molecula,
      entidade_id: selectedDrug.id,
      nome_comercial: brand?.nome ?? selectedDrug.molecula,
      laboratorio: brand?.laboratorio ?? '',
      concentracao: selectedConcentration,
      forma_farmaceutica: brand?.formas?.[0] ?? 'Comprimido',
      produto_id: brand?.produto_id,
      bula_profissional: brand?.bula_profissional,
      bula_paciente: brand?.bula_paciente,
      dose: doseTexto,
      via: selectedDrug.dose_adulto.via,
      frequencia: freqMap[result.tomadas_dia] ?? `${result.tomadas_dia}x/dia`,
      duracao: duracao || (result.population.usar_dose_pediatrica ? '7 dias' : '30 dias'),
      instrucoes: result.ajuste_renal_texto
        ? `Ajuste renal: ${result.ajuste_renal_texto}`
        : '',
      uso_continuo: false,
      tipo_receita: selectedDrug.alertas_especiais.some(a => a.includes('RECEITA ESPECIAL')) ? 'especial_branca' : 'simples',
    };
    // RM-107.1.1-E2 (F3): proveniência do motor C. Os campos legados acima permanecem exatamente como antes.
    item.posologia_registrada = registroDeResultadoMotorC(result, { via: selectedDrug.dose_adulto.via }, {
      campos_padrao: [
        'via',
        ...(brand?.formas?.[0] ? [] : ['forma_farmaceutica']),
        ...(duracao ? [] : ['duracao']),
      ],
    });
    setRxItems(prev => [...prev, item]);
    toast.success(`${selectedDrug.molecula} adicionado — dose calculada automaticamente`);
    setSelectedDrug(null);
    setSearchQuery('');
    setCustomDose('');
    setCustomDoseFonte(null);
    setCalcResult([]);
  }, [selectedDrug, selectedBrand, selectedConcentration]);

  // ── Remove item ───────────────────────────────────────────
  const removeItem = (id: string) => {
    setRxItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof RxItem, value: string | boolean) => {
    // RM-107.1.1-E2 (F3c): o valor gravado é o mesmo de antes; só a proveniência é atualizada (invalida avaliação se a posologia mudou).
    setRxItems(prev => prev.map(i => i.id === id
      ? { ...i, [field]: value, posologia_registrada: registrarEdicaoPosologica(i.posologia_registrada, field, i[field], value) }
      : i));
  };

  // ── Save favorite ─────────────────────────────────────────
  const saveFavorite = () => {
    if (rxItems.length === 0) return;
    const nome = prompt('Nome do protocolo favorito:');
    if (!nome) return;
    const fav: FavoriteProtocol = {
      id: Date.now().toString(),
      nome,
      descricao: patient.diagnostico || '',
      itens: rxItems,
      criado_em: new Date().toISOString(),
    };
    // RM-107.1.1-E2: a proveniência é só em memória da prescrição atual — nunca entra nos favoritos (memória ou localStorage).
    const updated = [...favorites, { ...fav, itens: fav.itens.map(semRegistroParaPersistir) }];
    setFavorites(updated);
    localStorage.setItem('prescreve-ai-favoritos', JSON.stringify(updated));
    toast.success(`Protocolo "${nome}" salvo`);
  };

  /**
   * RM-105.2.2: aplica o protocolo. Com `descartar`, antes limpa TODOS os dados clínicos da sessão anterior
   * (paciente, contexto, alergias, resultado da avaliação) para que nada de um paciente seja tomado como de outro.
   * O protocolo traz somente itens; a avaliação é recalculada pelo efeito de segurança.
   */
  const aplicarProtocolo = (fav: FavoriteProtocol, descartar: boolean) => {
    if (descartar) {
      setPatient(BLANK_PATIENT);
      setCrclResult(null);
      setSafetyResult(null);
      setAvaliadoEm(null);
    }
    setRxItems(fav.itens);
    setTrocaPendente(null);
    setProtocoloRecuperado({ nome: fav.nome, criadoEm: fav.criado_em, semId: fav.itens.filter(i => !i.entidade_id).length, descartou: descartar });
    setActiveTab('prescricao');
    toast.success(`Protocolo "${fav.nome}" carregado`);
  };

  const loadFavorite = (fav: FavoriteProtocol) => {
    // Há dados clínicos de um paciente na sessão? Pede confirmação ANTES de qualquer descarte.
    if (dadosClinicosPreenchidos(patient).length > 0) {
      setTrocaPendente(fav);
      setActiveTab('favoritos');
      return;
    }
    aplicarProtocolo(fav, false);
  };

  const deleteFavorite = (id: string) => {
    const updated = favorites.filter(f => f.id !== id);
    setFavorites(updated);
    localStorage.setItem('prescreve-ai-favoritos', JSON.stringify(updated));
  };

  // ── IMC + BSA ──────────────────────────────────────────────
  const bmi = useMemo(() => {
    if (!patient.peso || !patient.altura) return null;
    return calcIMC(Number(patient.peso), Number(patient.altura));
  }, [patient.peso, patient.altura]);

  const bsa = useMemo(() => {
    if (!patient.peso || !patient.altura) return null;
    return calcBSA(Number(patient.peso), Number(patient.altura));
  }, [patient.peso, patient.altura]);

  // ── Renal adjustment for selected drug ───────────────────
  const renalAdj = useMemo(() => {
    if (!selectedDrug || !crclResult) return null;
    return getAdjustmentForCrCl(selectedDrug.ajuste_renal, crclResult.crcl);
  }, [selectedDrug, crclResult]);

  // ── Beers criteria ────────────────────────────────────────
  const beersAlert = useMemo(() => {
    if (!selectedDrug || !(idadeRes.estado === 'informada' && idadeRes.idade.idoso)) return null;
    return checkBeersCriteria(selectedDrug.molecula);
  }, [selectedDrug, idadeRes]);

  // ── mL conversion ────────────────────────────────────────
  const mlConversion = useMemo(() => {
    if (!convMg || !convConc) return null;
    return convertDose(Number(convMg), 'mg_to_mL', Number(convConc));
  }, [convMg, convConc]);

  // ── Critical alerts count ─────────────────────────────────
  const criticalCount = safetyAlerts.filter(a => a.severidade === 'critical' || a.severidade === 'danger').length;

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-purple-700 rounded-xl flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Prescrição Rápida</h1>
              <p className="text-xs text-slate-500">Prescritor inteligente — sem necessidade de consulta completa</p>
            </div>
          </div>
          <div className="flex gap-2">
            {rxItems.length > 0 && (
              <>
                <Button variant="outline" size="sm" className="gap-1" onClick={saveFavorite}>
                  <Star className="w-3.5 h-3.5 text-yellow-500" />
                  Salvar protocolo
                </Button>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1" onClick={() => setShowPrint(true)}>
                  <Printer className="w-3.5 h-3.5" />
                  Gerar receita
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Paciente — Collapsible */}
        <Card className="mb-4 border-violet-100">
          <CardHeader
            className="py-3 cursor-pointer"
            onClick={() => setPatientExpanded(!patientExpanded)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-violet-600" />
                Dados do Paciente
                {patient.nome && <span className="font-normal text-slate-500">— {patient.nome}{idadeTexto ? `, ${idadeTexto}` : ''}{patient.sexo ? ` (${patient.sexo})` : ''}{patient.peso ? `, ${patient.peso} kg` : ''}</span>}
              </CardTitle>
              {patientExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </CardHeader>

          {patientExpanded && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-6 gap-3 mb-3">
                <div className="col-span-2">
                  <Label className="text-xs text-slate-600">Nome do paciente</Label>
                  <Input className="mt-1 h-8 text-sm" placeholder="Nome completo" value={patient.nome} onChange={e => setPatient(p => ({ ...p, nome: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-slate-600">Idade (valor e unidade)</Label>
                  <div className="mt-1 flex gap-1">
                    <Input className="h-8 w-20 text-sm" placeholder="valor" type="number" min={0} data-testid="idade-valor" value={patient.idade} onChange={e => setPatient(p => ({ ...p, idade: e.target.value }))} />
                    <Select value={patient.idade_unidade} onValueChange={v => setPatient(p => ({ ...p, idade_unidade: v as UnidadeIdade }))}>
                      <SelectTrigger className="h-8 w-28 text-xs" data-testid="idade-unidade"><SelectValue>{patient.idade_unidade ? ROTULO_UNIDADE[patient.idade_unidade] : 'unidade'}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dias">Dias</SelectItem>
                        <SelectItem value="meses">Meses</SelectItem>
                        <SelectItem value="anos">Anos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {patient.idade.trim() !== '' && (
                    <p data-testid="idade-interpretacao" data-idade-estado={idadeRes.estado} className={`mt-1 text-[11px] ${idadeRes.estado === 'informada' ? 'text-slate-500' : 'text-red-600'}`}>
                      {idadeRes.estado === 'informada'
                        ? `Interpretada como ${idadeTexto} (≈ ${Number(idadeRes.idade.anos.toFixed(4))} anos; faixa ${idadeRes.idade.faixa})`
                        : idadeRes.estado === 'invalida' ? idadeRes.detalhe : ''}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Sexo</Label>
                  <Select value={patient.sexo} onValueChange={v => setPatient(p => ({ ...p, sexo: v as 'M' | 'F' }))}>
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Peso (kg)</Label>
                  <Input className="mt-1 h-8 text-sm" placeholder="kg" type="number" value={patient.peso} onChange={e => setPatient(p => ({ ...p, peso: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Altura (cm)</Label>
                  <Input className="mt-1 h-8 text-sm" placeholder="cm" type="number" value={patient.altura} onChange={e => setPatient(p => ({ ...p, altura: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-6 gap-3">
                <div>
                  <Label className="text-xs text-slate-600">Creatinina (mg/dL)</Label>
                  <Input className="mt-1 h-8 text-sm" placeholder="0.0" type="number" value={patient.creatinina} onChange={e => setPatient(p => ({ ...p, creatinina: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-slate-600">Child-Pugh</Label>
                  <Select value={patient.child_pugh || ''} onValueChange={v => setPatient(p => ({ ...p, child_pugh: v as '' | 'A' | 'B' | 'C' }))}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="—">—</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-slate-600">Diagnóstico / Hipótese</Label>
                  <Input className="mt-1 h-8 text-sm" placeholder="Opcional" value={patient.diagnostico} onChange={e => setPatient(p => ({ ...p, diagnostico: e.target.value }))} />
                </div>
                <div className="flex items-end gap-3 pb-0.5">
                  <div>
                    <Label className="text-xs text-slate-600">Gestante</Label>
                    <Select value={patient.gestante || 'nao_informado'} onValueChange={v => setPatient(p => ({ ...p, gestante: v === 'nao_informado' ? '' : (v as 'sim' | 'nao') }))}>
                      <SelectTrigger className="mt-1 h-8 w-28 text-xs" data-testid="gestante-select"><SelectValue>{ROTULO_TRI[patient.gestante || 'nao_informado']}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao_informado">Não informado</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Lactante</Label>
                    <Select value={patient.lactante || 'nao_informado'} onValueChange={v => setPatient(p => ({ ...p, lactante: v === 'nao_informado' ? '' : (v as 'sim' | 'nao') }))}>
                      <SelectTrigger className="mt-1 h-8 w-28 text-xs" data-testid="lactante-select"><SelectValue>{ROTULO_TRI[patient.lactante || 'nao_informado']}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao_informado">Não informado</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* IMC + CrCl inline */}
                <div className="flex items-end gap-3 text-xs">
                  {bmi && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">IMC: <strong>{bmi.imc}</strong></span>}
                  {bsa && <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">SC: <strong>{bsa.bsa} m²</strong></span>}
                  {crclResult && (
                    <span className={`px-2 py-1 rounded font-medium ${crclResult.crcl >= 60 ? 'bg-green-100 text-green-700' : crclResult.crcl >= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      CrCl: {crclResult.crcl} mL/min ({crclResult.ckd_stage})
                    </span>
                  )}
                </div>
              </div>

              {/* RM-105.2 — Alergias com estado explícito (ausência de informação ≠ ausência de alergia) */}
              <div className="mt-3 border-t border-slate-100 pt-3" data-testid="alergias-bloco">
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-slate-600">Alergias</Label>
                  <Select value={patient.alergias_status} onValueChange={v => setPatient(p => ({ ...p, alergias_status: v as StatusAlergiasInformado }))}>
                    <SelectTrigger className="h-8 w-72 text-xs" data-testid="alergias-status"><SelectValue>{ROTULO_ALERGIAS[patient.alergias_status]}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao_informado">Não informado</SelectItem>
                      <SelectItem value="sem_alergias_conhecidas">Sem alergias conhecidas (informado)</SelectItem>
                      <SelectItem value="informadas">Alergias informadas</SelectItem>
                    </SelectContent>
                  </Select>
                  {patient.alergias_status === 'informadas' && (
                    <Button
                      size="sm" variant="outline" className="h-8 text-xs gap-1" data-testid="alergia-adicionar"
                      onClick={() => setPatient(p => ({ ...p, alergias: [...p.alergias, { id: Date.now().toString(), substancia: '', tipo: 'medicamento', gravidade: '', reacao: '', registrado_em: new Date().toISOString() }] }))}
                    >
                      <Plus className="w-3 h-3" />Adicionar alergia
                    </Button>
                  )}
                </div>
                {patient.alergias_status === 'informadas' && (
                  <div className="mt-2 space-y-2">
                    {patient.alergias.length === 0 && <p className="text-xs text-amber-700">Nenhuma alergia listada: adicione ao menos um registro ou altere o estado.</p>}
                    {patient.alergias.map(a => (
                      <div key={a.id} className="grid grid-cols-12 gap-2 items-center" data-testid="alergia-linha">
                        <Input className="col-span-4 h-8 text-xs" placeholder="Substância / medicamento" value={a.substancia}
                          onChange={e => setPatient(p => ({ ...p, alergias: p.alergias.map(x => x.id === a.id ? { ...x, substancia: e.target.value } : x) }))} />
                        <Select value={a.tipo} onValueChange={v => setPatient(p => ({ ...p, alergias: p.alergias.map(x => x.id === a.id ? { ...x, tipo: v as TipoAlergia } : x) }))}>
                          <SelectTrigger className="col-span-2 h-8 text-xs"><SelectValue>{ROTULO_TIPO[a.tipo]}</SelectValue></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="medicamento">Medicamento</SelectItem>
                            <SelectItem value="alimento">Alimento</SelectItem>
                            <SelectItem value="ambiental">Ambiental</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={a.gravidade || 'nao_informada'} onValueChange={v => setPatient(p => ({ ...p, alergias: p.alergias.map(x => x.id === a.id ? { ...x, gravidade: v === 'nao_informada' ? '' : (v as GravidadeAlergia) } : x) }))}>
                          <SelectTrigger className="col-span-2 h-8 text-xs"><SelectValue>{ROTULO_GRAVIDADE[a.gravidade || 'nao_informada']}</SelectValue></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nao_informada">Gravidade n/i</SelectItem>
                            <SelectItem value="leve">Leve</SelectItem>
                            <SelectItem value="moderada">Moderada</SelectItem>
                            <SelectItem value="grave">Grave</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input className="col-span-3 h-8 text-xs" placeholder="Reação (opcional)" value={a.reacao}
                          onChange={e => setPatient(p => ({ ...p, alergias: p.alergias.map(x => x.id === a.id ? { ...x, reacao: e.target.value } : x) }))} />
                        <Button size="sm" variant="ghost" className="col-span-1 h-8 text-red-400 hover:text-red-600" aria-label="Remover alergia"
                          onClick={() => setPatient(p => ({ ...p, alergias: p.alergias.filter(x => x.id !== a.id) }))}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Main content */}
        <div className="grid grid-cols-12 gap-4">

          {/* ── Left: Search + Drug info ─────────────────────── */}
          <div className="col-span-5 space-y-3">

            {/* Busca */}
            <Card className="border-violet-100">
              <CardContent className="pt-4 pb-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar molécula, marca, classe... (ex: Losartana, Zart, IECA)"
                    className="pl-9 pr-4 text-sm"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) setSelectedDrug(null); }}
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSelectedDrug(null); setSearchResults([]); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Resultados da busca */}
                {searchResults.length > 0 && !selectedDrug && (
                  <div className="mt-2 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    {searchResults.map(drug => {
                      const prefBrand = getBrandsForLab(drug, labPref)[0];
                      return (
                        <button
                          key={drug.id}
                          onClick={() => selectDrug(drug)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-violet-50 text-left border-b border-slate-100 last:border-0 transition-colors"
                        >
                          <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Pill className="w-3.5 h-3.5 text-violet-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{drug.molecula}</p>
                            <p className="text-xs text-slate-500 truncate">{drug.classe}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {prefBrand && labPref !== 'sem_preferencia' && (
                              <p className="text-xs font-medium text-violet-700">{prefBrand.nome}</p>
                            )}
                            <p className="text-xs text-slate-400">{drug.dose_adulto.habitual} {drug.dose_adulto.unidade}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {searchQuery.length >= 2 && searchResults.length === 0 && !selectedDrug && (
                  <p className="mt-2 text-xs text-center text-slate-400 py-2">Nenhum resultado para &quot;{searchQuery}&quot;</p>
                )}
              </CardContent>
            </Card>

            {/* Medicamento selecionado */}
            {selectedDrug && (
              <Card className="border-violet-200 bg-violet-50/30">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-violet-900">{selectedDrug.molecula}</CardTitle>
                      <p className="text-xs text-violet-600 mt-0.5">{selectedDrug.classe}</p>
                    </div>
                    <button onClick={() => { setSelectedDrug(null); setSearchQuery(''); }}
                      className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">

                  {/* Alertas especiais inline */}
                  {beersAlert && (
                    <Alert className="border-orange-200 bg-orange-50 py-2">
                      <AlertDescription className="text-xs text-orange-700">{beersAlert}</AlertDescription>
                    </Alert>
                  )}
                  {selectedDrug.alertas_especiais.filter(a => a.startsWith('⚠')).map((a, i) => (
                    <Alert key={i} className="border-yellow-200 bg-yellow-50 py-2">
                      <AlertDescription className="text-xs text-yellow-700">{a}</AlertDescription>
                    </Alert>
                  ))}

                  {/* Marca preferida */}
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-1.5">
                      <Building2 className="w-3 h-3 inline mr-1" />
                      Marcas disponíveis
                      {labPref !== 'sem_preferencia' && <span className="text-violet-600 ml-1">(preferência: {LABORATORIOS[labPref]})</span>}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {getBrandsForLab(selectedDrug, labPref).map((brand, i) => (
                        <button
                          key={i}
                          onClick={() => { setSelectedBrand(brand); setSelectedConcentration(brand.concentracoes[0]); }}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                            selectedBrand?.nome === brand.nome
                              ? 'bg-violet-600 text-white border-violet-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                          }`}
                        >
                          {brand.verificado && <span className="text-emerald-400 mr-0.5">✓</span>}
                          {i === 0 && labPref !== 'sem_preferencia' && brand.laboratorio.toLowerCase() === labPref ? '★ ' : ''}{brand.nome}
                          <span className="opacity-60 ml-1">({brand.laboratorio})</span>
                        </button>
                      ))}
                    </div>

                    {/* Links para Biblioteca e Bulas — visível quando marca verificada */}
                    {selectedBrand?.produto_id && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          href={`/biblioteca?produto=${selectedBrand.produto_id}`}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 transition-colors"
                          target="_blank"
                        >
                          <Library className="w-3 h-3" />
                          Ver na Biblioteca
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </Link>
                        {selectedBrand.bula_profissional && (
                          <a
                            href={selectedBrand.bula_profissional}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <FileCheck className="w-3 h-3" />
                            Bula Profissional
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}
                        {selectedBrand.bula_paciente && (
                          <a
                            href={selectedBrand.bula_paciente}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            Bula Paciente
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Concentração */}
                  {selectedBrand && (
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1.5">Concentração</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedBrand.concentracoes.map(c => (
                          <button key={c} onClick={() => {
                            const doseAindaAuto = customDose === stripUnit(selectedConcentration);
                            setSelectedConcentration(c);
                            if (doseAindaAuto) { setCustomDose(stripUnit(c)); setCustomDoseFonte('sincronizada_com_concentracao'); }
                          }}
                            className={`text-xs px-2.5 py-1 rounded border transition-all ${
                              selectedConcentration === c
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                            }`}
                          >{c}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dose */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Dose</p>
                      <div className="flex items-center gap-1">
                        <Input className="h-8 text-sm" value={customDose}
                          onChange={e => { setCustomDose(e.target.value); setCustomDoseFonte('digitada'); }} placeholder="dose" />
                        <span className="text-xs text-slate-500 flex-shrink-0">{selectedDrug.dose_adulto.unidade}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Habitual: {selectedDrug.dose_adulto.habitual} | Máx: {selectedDrug.dose_adulto.max} {selectedDrug.dose_adulto.unidade}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1">Gestante/Lactante</p>
                      <p className={`text-xs font-medium ${GESTANTE_LABELS[selectedDrug.uso_gestante]?.color}`}>
                        Gestante: {GESTANTE_LABELS[selectedDrug.uso_gestante]?.label}
                      </p>
                      <p className={`text-xs ${GESTANTE_LABELS[selectedDrug.uso_lactante]?.color}`}>
                        Lactante: {GESTANTE_LABELS[selectedDrug.uso_lactante]?.label}
                      </p>
                    </div>
                  </div>

                  {/* Ajuste renal */}
                  {renalAdj && (
                    <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-xs font-semibold text-blue-800">Ajuste Renal (CrCl {crclResult?.crcl} mL/min)</p>
                      <p className="text-xs text-blue-700 mt-0.5">{renalAdj}</p>
                    </div>
                  )}

                  {/* Info colapsável */}
                  <button
                    onClick={() => setDrugInfoExpanded(!drugInfoExpanded)}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800"
                  >
                    <BookOpen className="w-3 h-3" />
                    {drugInfoExpanded ? 'Ocultar informações' : 'Ver contraindicações e interações'}
                    {drugInfoExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {drugInfoExpanded && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <p className="text-xs font-semibold text-red-700 mb-1">Contraindicações</p>
                        <ul className="space-y-0.5">
                          {selectedDrug.contraindicacoes_rapidas.map((c, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                              <span className="text-red-400">•</span>{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {selectedDrug.interacoes_importantes.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-orange-700 mb-1">Interações Principais</p>
                          <ul className="space-y-0.5">
                            {selectedDrug.interacoes_importantes.map((inter, i) => (
                              <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                                <span className={`flex-shrink-0 ${inter.severidade === 'contraindicado' ? 'text-red-500' : inter.severidade === 'grave' ? 'text-orange-500' : 'text-yellow-500'}`}>⇄</span>
                                <span><strong>{inter.com}</strong>: {inter.descricao}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card de cálculo automático (sempre que idade + peso disponíveis) */}
                  {patient.peso && idadeAnos !== undefined ? (
                    <DoseCalcCard
                      drug={selectedDrug}
                      concentracaoSelecionada={selectedConcentration || (selectedDrug.dose_adulto.habitual + ' ' + selectedDrug.dose_adulto.unidade)}
                      idadeAnos={idadeAnos}
                      pesoKg={Number(patient.peso)}
                      alturaM={patient.altura ? Number(patient.altura) / 100 : undefined}
                      crcl={crclResult?.crcl}
                      childPugh={patient.child_pugh || undefined}
                      gestante={patient.gestante === 'sim'}
                      lactante={patient.lactante === 'sim'}
                      onApply={applyDoseCalc}
                    />
                  ) : (
                    <>
                      <Button onClick={addToRx} className="w-full bg-violet-600 hover:bg-violet-700 gap-2 h-9">
                        <Plus className="w-4 h-4" />
                        Adicionar à prescrição
                      </Button>
                      <p className="text-[10px] text-center text-slate-400">
                        💡 Preencha <strong>idade</strong> e <strong>peso</strong> para cálculo automático de dose
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Calculadora */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  Calculadora Farmacológica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">

                {/* CrCl detalhado */}
                {crclResult && (
                  <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-xs font-semibold text-blue-800 mb-1">Clearance de Creatinina (Cockcroft-Gault)</p>
                    {crclResult.passo_a_passo.map((s, i) => (
                      <p key={i} className="text-[10px] text-blue-700 font-mono leading-relaxed">{s}</p>
                    ))}
                  </div>
                )}

                {/* IMC */}
                {bmi && (
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700">IMC: </span>
                    <span className="text-slate-600">{bmi.imc} kg/m² — {bmi.classificacao}</span>
                    {bsa && <span className="ml-3 text-slate-600">| SC: {bsa.bsa} m²</span>}
                  </div>
                )}

                {/* Conversor mg → mL */}
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-1.5">Conversor: mg → mL</p>
                  <div className="flex items-center gap-2">
                    <div>
                      <Input className="h-7 text-xs w-20" placeholder="dose mg" value={convMg} onChange={e => setConvMg(e.target.value)} />
                    </div>
                    <span className="text-xs text-slate-400">÷</span>
                    <div>
                      <Input className="h-7 text-xs w-24" placeholder="conc. mg/mL" value={convConc} onChange={e => setConvConc(e.target.value)} />
                    </div>
                    <span className="text-xs text-slate-400">=</span>
                    {mlConversion && (
                      <span className="text-sm font-bold text-emerald-600">{mlConversion.resultado} mL</span>
                    )}
                  </div>
                  {mlConversion && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {mlConversion.passo_a_passo[0]}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Prescrição + Segurança ─────────────────── */}
          <div className="col-span-7 space-y-3">

            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="prescricao" className="text-xs gap-1">
                  <FileText className="w-3 h-3" />
                  Prescrição
                  {rxItems.length > 0 && (
                    <span className="bg-violet-600 text-white text-[9px] px-1.5 rounded-full ml-0.5">{rxItems.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="calculadora" className="text-xs gap-1">
                  <Shield className="w-3 h-3" />
                  Segurança
                  {criticalCount > 0 && (
                    <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full ml-0.5">{criticalCount}</span>
                  )}
                  {coberturaIncompleta(safetyResult) && (
                    <span title="Verificação de segurança incompleta" className="bg-amber-500 text-white text-[9px] px-1.5 rounded-full ml-0.5">!</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="favoritos" className="text-xs gap-1">
                  <Star className="w-3 h-3" />
                  Favoritos
                  {favorites.length > 0 && (
                    <span className="bg-yellow-500 text-white text-[9px] px-1.5 rounded-full ml-0.5">{favorites.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="historico" className="text-xs gap-1">
                  <History className="w-3 h-3" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              {/* Prescrição */}
              <TabsContent value="prescricao" className="mt-3">
                {protocoloRecuperado && rxItems.length > 0 && (
                  <div data-testid="protocolo-recuperado" role="status" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                    <p className="font-semibold">Protocolo &quot;{protocoloRecuperado.nome}&quot; recuperado (salvo em {new Date(protocoloRecuperado.criadoEm).toLocaleDateString('pt-BR')})</p>
                    {protocoloRecuperado.descartou && <p className="mt-0.5" data-testid="dados-descartados">Os dados clínicos do paciente anterior (paciente, contexto e alergias) foram descartados.</p>}
                    <p className="mt-0.5">Apenas os itens da prescrição fazem parte do protocolo. Alergias, gestação, lactação, idade, função renal e a avaliação de segurança NÃO são recuperados: a avaliação foi refeita agora com os dados atuais da tela.{protocoloRecuperado.descartou ? '' : ' Confirme que os dados do paciente exibidos acima pertencem a este paciente.'}</p>
                    {safetyResult && safetyResult.cobertura_contextual.pendencias.length > 0 && (
                      <p className="mt-0.5" data-testid="a-preencher">Informações a preencher para este paciente: {safetyResult.cobertura_contextual.pendencias.map(p => ROTULO_CAMPO[p]).join(', ')}.</p>
                    )}
                    {protocoloRecuperado.semId > 0 && (
                      <p className="mt-0.5">{protocoloRecuperado.semId} item(ns) sem identificação de entidade (protocolo antigo): a identidade só é confirmada quando o nome corresponde a uma única entidade; reselecione o medicamento para confirmar.</p>
                    )}
                    <button type="button" className="mt-1 underline" onClick={() => setProtocoloRecuperado(null)}>Dispensar aviso</button>
                  </div>
                )}
                {rxItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                    <Pill className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Nenhum medicamento adicionado</p>
                    <p className="text-xs text-slate-300 mt-1">Use a busca ao lado para adicionar medicamentos</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rxItems.map((item, idx) => (
                      <RxItemCard
                        key={item.id}
                        item={item}
                        idx={idx + 1}
                        onUpdate={updateItem}
                        onRemove={removeItem}
                      />
                    ))}

                    {/* Botões de ação */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1 text-xs border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => { setRxItems([]); setProtocoloRecuperado(null); }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Limpar tudo
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-violet-600 hover:bg-violet-700 gap-1 text-xs"
                        onClick={() => setShowPrint(true)}
                      >
                        <Printer className="w-3 h-3" />
                        Gerar receita
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Segurança */}
              <TabsContent value="calculadora" className="mt-3">
                <div className="space-y-2">
                  <SafetyCoverageNotice result={safetyResult} itensNaReceita={rxItems.length} />
                  <AlergiasNotice result={safetyResult} itensNaReceita={rxItems.length} />
                  {safetyAlerts.map(alert => {
                      const cfg = SEVERITY_CONFIG[alert.severidade];
                      return (
                        <div key={alert.id} className={`p-3 rounded-lg border ${cfg.color}`}>
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.icon}`} />
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{alert.titulo}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{alert.descricao}</p>
                              {rotuloAlertaNaoConfirmado(safetyResult, alert.id) && (
                                <p className="text-[11px] font-medium text-amber-700 mt-1" data-testid="alerta-entrada-nao-verificada">{rotuloAlertaNaoConfirmado(safetyResult, alert.id)}</p>
                              )}
                              {(() => {
                                const cl = descreverClassificacaoAlerta(safetyResult, alert.id);
                                return cl ? (
                                  <div className="mt-1 space-y-0.5" data-testid="alerta-classificacao" data-pendente={cl.pendente ? 'sim' : 'nao'}>
                                    <p className="text-[11px] font-semibold text-slate-700">{cl.rotulo}</p>
                                    {cl.detalhes.map((d, k) => <p key={k} className="text-[11px] text-slate-500">{d}</p>)}
                                  </div>
                                ) : null;
                              })()}
                              <p className="text-xs font-medium text-slate-700 mt-1">→ {alert.acao}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto flex-shrink-0 ${cfg.icon} bg-white/50`}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      );
                  })}
                </div>
              </TabsContent>

              {/* Favoritos */}
              <TabsContent value="favoritos" className="mt-3">
                {trocaPendente && (
                  <div data-testid="troca-paciente" role="alertdialog" aria-label="Confirmar troca de protocolo" className="mb-3 rounded-lg border-2 border-amber-400 bg-amber-50 p-3 text-xs text-amber-900">
                    <p className="font-semibold">Há dados clínicos preenchidos nesta sessão: {dadosClinicosPreenchidos(patient).join(', ')}.</p>
                    <p className="mt-1">Carregar o protocolo &quot;{trocaPendente.nome}&quot; vai DESCARTAR esses dados, as alergias e a avaliação de segurança atuais, e substituir a prescrição atual. Os dados do paciente não fazem parte do protocolo: serão pedidos de novo para o próximo paciente.</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" data-testid="confirmar-troca" className="rounded bg-amber-600 px-3 py-1 text-white" onClick={() => aplicarProtocolo(trocaPendente, true)}>Descartar dados e carregar</button>
                      <button type="button" data-testid="cancelar-troca" className="rounded border border-amber-600 px-3 py-1" onClick={() => setTrocaPendente(null)}>Cancelar (manter a sessão atual)</button>
                    </div>
                  </div>
                )}
                {favorites.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                    <Star className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Nenhum protocolo salvo</p>
                    <p className="text-xs text-slate-300 mt-1">Monte uma prescrição e clique em &quot;Salvar protocolo&quot;</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {favorites.map(fav => (
                      <div key={fav.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-slate-800">{fav.nome}</p>
                          <div className="flex gap-1">
                            <button onClick={() => loadFavorite(fav)} className="text-xs text-violet-600 hover:text-violet-800 font-medium px-2 py-0.5 bg-white rounded border border-violet-200">
                              Carregar
                            </button>
                            <button onClick={() => deleteFavorite(fav.id)} className="text-xs text-red-500 hover:text-red-700 px-1.5">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {fav.descricao && <p className="text-xs text-slate-500 mb-1">{fav.descricao}</p>}
                        <div className="flex flex-wrap gap-1">
                          {fav.itens.map((item, i) => (
                            <span key={i} className="text-xs bg-white border border-yellow-200 px-2 py-0.5 rounded">
                              {item.molecula}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Salvo em {new Date(fav.criado_em).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Histórico (stub) */}
              <TabsContent value="historico" className="mt-3">
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                  <History className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Histórico de prescrições</p>
                  <p className="text-xs text-slate-300 mt-1">Disponível na próxima versão</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* ── Print Modal ───────────────────────────────────────── */}
      {showPrint && (
        <PrescriptionPrintPreview
          safetyResult={safetyResult}
          avaliadoEm={avaliadoEm}
          patient={{ nome: patient.nome, idade: idadeTexto, diagnostico: patient.diagnostico }}
          items={rxItems}
          medico={state.settings.medico}
          avisoSeguranca={coberturaIncompleta(safetyResult) ? safetyResult?.mensagem ?? 'Verificação de segurança incompleta.' : null}
          onClose={() => setShowPrint(false)}
        />
      )}
    </AppShell>
  );
}

// ─── RX ITEM CARD ─────────────────────────────────────────────

function RxItemCard({
  item, idx, onUpdate, onRemove,
}: {
  item: RxItem;
  idx: number;
  onUpdate: (id: string, field: keyof RxItem, value: string | boolean) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start gap-2 mb-2">
          <span className="w-6 h-6 bg-violet-600 text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0">
            {idx}
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">{item.molecula}</p>
            <p className="text-xs text-slate-500">{item.nome_comercial} · {item.laboratorio} · {item.concentracao}</p>
            {(item.produto_id || item.bula_profissional || item.bula_paciente) && (
              <div className="flex flex-wrap gap-2 mt-1">
                {item.produto_id && (
                  <a href={`/biblioteca?produto=${item.produto_id}`}
                    className="inline-flex items-center gap-0.5 text-[10px] text-violet-600 hover:underline">
                    <Library className="w-2.5 h-2.5" />Biblioteca
                  </a>
                )}
                {item.bula_profissional && (
                  <a href={item.bula_profissional} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline">
                    <FileCheck className="w-2.5 h-2.5" />Bula Prof.
                  </a>
                )}
                {item.bula_paciente && (
                  <a href={item.bula_paciente} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 hover:underline">
                    <FileText className="w-2.5 h-2.5" />Bula Pac.
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {item.tipo_receita !== 'simples' && (
              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">ESPECIAL</span>
            )}
            <button onClick={() => onRemove(item.id)} className="text-slate-300 hover:text-red-500 p-1">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs">
          <div>
            <Label className="text-[10px] text-slate-400">Dose</Label>
            <Input className="h-7 text-xs mt-0.5" value={item.dose}
              onChange={e => onUpdate(item.id, 'dose', e.target.value)} />
          </div>
          <div>
            <Label className="text-[10px] text-slate-400">Via</Label>
            <Select value={item.via} onValueChange={v => v && onUpdate(item.id, 'via', v)}>
              <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>{VIAS.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-slate-400">Frequência</Label>
            <Select value={item.frequencia} onValueChange={v => v && onUpdate(item.id, 'frequencia', v)}>
              <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>{FREQUENCIAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-slate-400">Duração</Label>
            <Select value={item.duracao} onValueChange={v => v && onUpdate(item.id, 'duracao', v)}>
              <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>{DURACOES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-2">
          <Input
            className="h-7 text-xs"
            placeholder="Instruções especiais (opcional)"
            value={item.instrucoes}
            onChange={e => onUpdate(item.id, 'instrucoes', e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Switch
            checked={item.uso_continuo}
            onCheckedChange={v => onUpdate(item.id, 'uso_continuo', v)}
          />
          <span className="text-xs text-slate-500">Uso contínuo</span>
        </div>
      </CardContent>
    </Card>
  );
}
