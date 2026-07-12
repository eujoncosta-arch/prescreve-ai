'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { LABORATORIOS } from '@/lib/utils';
import {
  searchDrugs, getDrugById, getBrandsForLab, getPreferredBrandForPatient, getPreferredConcentration,
  CATEGORIA_LABELS, GESTANTE_LABELS,
  type QuickDrug, type QuickBrand,
} from '@/lib/pharma-database';
import {
  calcCrCl, calcBSA, calcIMC, calcWeightDose, convertDose,
  getAdjustmentForCrCl, checkBeersCriteria,
  type PatientParams, type CrClResult, type FullDoseResult,
} from '@/lib/dose-calculator';
import { DoseCalcCard } from '@/components/modules/DoseCalcCard';
import { runSafetyCheck, SEVERITY_CONFIG, type QuickSafetyAlert } from '@/lib/safety-rules';
import { getAllProductsForMolecule, getPreferredBrandName } from '@/lib/drug-resolver';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  CheckCircle2, Building2, FlaskConical, User, BookOpen,
  ArrowRight, RefreshCw, X, Copy, FileText, ExternalLink,
  Library, FileCheck,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── TIPOS LOCAIS ─────────────────────────────────────────────

interface PatientInfo {
  nome: string;
  idade: string;
  sexo: 'M' | 'F' | '';
  peso: string;
  altura: string;
  creatinina: string;
  child_pugh: '' | 'A' | 'B' | 'C';
  diagnostico: string;
  observacoes: string;
  gestante: boolean;
  lactante: boolean;
}

interface RxItem {
  id: string;
  molecula: string;
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
}

interface FavoriteProtocol {
  id: string;
  nome: string;
  descricao: string;
  itens: RxItem[];
  criado_em: string;
}

const BLANK_PATIENT: PatientInfo = {
  nome: '', idade: '', sexo: '', peso: '', altura: '',
  creatinina: '', child_pugh: '', diagnostico: '', observacoes: '',
  gestante: false, lactante: false,
};

const BLANK_ITEM: Omit<RxItem, 'id'> = {
  molecula: '', nome_comercial: '', laboratorio: '', concentracao: '',
  forma_farmaceutica: '', dose: '', via: 'VO', frequencia: '1x/dia',
  duracao: '30 dias', instrucoes: '', uso_continuo: false,
  tipo_receita: 'simples',
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<QuickDrug[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<QuickDrug | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<QuickBrand | null>(null);
  const [selectedConcentration, setSelectedConcentration] = useState('');
  const [customDose, setCustomDose] = useState('');
  const [rxItems, setRxItems] = useState<RxItem[]>([]);
  const [safetyAlerts, setSafetyAlerts] = useState<QuickSafetyAlert[]>([]);
  const [favorites, setFavorites] = useState<FavoriteProtocol[]>([]);
  const [activeTab, setActiveTab] = useState<'prescricao' | 'calculadora' | 'favoritos' | 'historico'>('prescricao');
  const [drugInfoExpanded, setDrugInfoExpanded] = useState(false);
  const [calcResult, setCalcResult] = useState<string[]>([]);
  const [crclResult, setCrclResult] = useState<CrClResult | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [convMg, setConvMg] = useState('');
  const [convConc, setConvConc] = useState('');

  // ── Load favorites from localStorage ─────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem('prescreve-ai-favoritos');
      if (stored) setFavorites(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // ── Search ────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const results = searchDrugs(searchQuery, labPref);
    setSearchResults(results.slice(0, 8));
  }, [searchQuery, labPref]);

  // ── Re-selecionar forma líquida quando idade ou peso muda (paciente pediátrico) ─
  useEffect(() => {
    if (!selectedDrug) return;
    const idadeAnos = patient.idade ? Number(patient.idade) : undefined;
    const preferred = getPreferredBrandForPatient(selectedDrug, labPref, idadeAnos);
    setSelectedBrand(preferred);
    if (preferred) {
      setSelectedConcentration(getPreferredConcentration(preferred, selectedDrug, idadeAnos));
    }
  }, [patient.idade, labPref, selectedDrug]);

  // ── CrCl auto-calc ────────────────────────────────────────
  useEffect(() => {
    if (patient.idade && patient.peso && patient.creatinina && patient.sexo) {
      const params: PatientParams = {
        idade: Number(patient.idade),
        sexo: patient.sexo as 'M' | 'F',
        peso: Number(patient.peso),
        creatinina: Number(patient.creatinina),
      };
      setCrclResult(calcCrCl(params));
    } else {
      setCrclResult(null);
    }
  }, [patient.idade, patient.peso, patient.creatinina, patient.sexo]);

  // ── Safety check ─────────────────────────────────────────
  useEffect(() => {
    if (rxItems.length < 1) { setSafetyAlerts([]); return; }
    const alerts = runSafetyCheck({
      moleculas: rxItems.map(i => i.molecula),
      gestante: patient.gestante,
      lactante: patient.lactante,
      idoso: Number(patient.idade) >= 65,
      crclValue: crclResult?.crcl,
    });
    setSafetyAlerts(alerts);
  }, [rxItems, patient.gestante, patient.lactante, patient.idade, crclResult]);

  // ── Select drug ───────────────────────────────────────────
  const selectDrug = useCallback((drug: QuickDrug) => {
    setSelectedDrug(drug);
    setSearchQuery(drug.molecula);
    setSearchResults([]);
    setDrugInfoExpanded(false);
    const idadeAnos = patient.idade ? Number(patient.idade) : undefined;
    const preferred = getPreferredBrandForPatient(drug, labPref, idadeAnos);
    setSelectedBrand(preferred);
    const defaultConc = preferred
      ? getPreferredConcentration(preferred, drug, idadeAnos)
      : drug.dose_adulto.habitual + ' ' + drug.dose_adulto.unidade;
    setSelectedConcentration(defaultConc);
    setCustomDose(drug.dose_adulto.habitual);

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
    }
  }, [labPref, patient.peso, patient.idade]);

  // ── Add to prescription ───────────────────────────────────
  const addToRx = useCallback(() => {
    if (!selectedDrug) return;
    const brand = selectedBrand ?? selectedDrug.marcas[0];
    const item: RxItem = {
      ...BLANK_ITEM,
      id: Date.now().toString(),
      molecula: selectedDrug.molecula,
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
    setRxItems(prev => [...prev, item]);
    toast.success(`${selectedDrug.molecula} adicionado à prescrição`);
    setSelectedDrug(null);
    setSearchQuery('');
    setCustomDose('');
    setCalcResult([]);
  }, [selectedDrug, selectedBrand, selectedConcentration, customDose]);

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
    setRxItems(prev => [...prev, item]);
    toast.success(`${selectedDrug.molecula} adicionado — dose calculada automaticamente`);
    setSelectedDrug(null);
    setSearchQuery('');
    setCustomDose('');
    setCalcResult([]);
  }, [selectedDrug, selectedBrand, selectedConcentration]);

  // ── Remove item ───────────────────────────────────────────
  const removeItem = (id: string) => {
    setRxItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof RxItem, value: string | boolean) => {
    setRxItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
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
    const updated = [...favorites, fav];
    setFavorites(updated);
    localStorage.setItem('prescreve-ai-favoritos', JSON.stringify(updated));
    toast.success(`Protocolo "${nome}" salvo`);
  };

  const loadFavorite = (fav: FavoriteProtocol) => {
    setRxItems(fav.itens);
    setActiveTab('prescricao');
    toast.success(`Protocolo "${fav.nome}" carregado`);
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
    if (!selectedDrug || Number(patient.idade) < 65) return null;
    return checkBeersCriteria(selectedDrug.molecula);
  }, [selectedDrug, patient.idade]);

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
                {patient.nome && <span className="font-normal text-slate-500">— {patient.nome}{patient.idade ? `, ${patient.idade} anos` : ''}{patient.sexo ? ` (${patient.sexo})` : ''}{patient.peso ? `, ${patient.peso} kg` : ''}</span>}
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
                <div>
                  <Label className="text-xs text-slate-600">Idade</Label>
                  <Input className="mt-1 h-8 text-sm" placeholder="anos" type="number" value={patient.idade} onChange={e => setPatient(p => ({ ...p, idade: e.target.value }))} />
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
                <div className="flex items-end gap-4 pb-0.5">
                  <div className="flex items-center gap-2">
                    <Switch checked={patient.gestante} onCheckedChange={v => setPatient(p => ({ ...p, gestante: v }))} />
                    <span className="text-xs text-slate-600">Gestante</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={patient.lactante} onCheckedChange={v => setPatient(p => ({ ...p, lactante: v }))} />
                    <span className="text-xs text-slate-600">Lactante</span>
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
                  <p className="mt-2 text-xs text-center text-slate-400 py-2">Nenhum resultado para "{searchQuery}"</p>
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
                          <button key={c} onClick={() => setSelectedConcentration(c)}
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
                          onChange={e => setCustomDose(e.target.value)} placeholder="dose" />
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
                  {patient.peso && patient.idade ? (
                    <DoseCalcCard
                      drug={selectedDrug}
                      concentracaoSelecionada={selectedConcentration || (selectedDrug.dose_adulto.habitual + ' ' + selectedDrug.dose_adulto.unidade)}
                      idadeAnos={Number(patient.idade)}
                      pesoKg={Number(patient.peso)}
                      alturaM={patient.altura ? Number(patient.altura) / 100 : undefined}
                      crcl={crclResult?.crcl}
                      childPugh={patient.child_pugh || undefined}
                      gestante={patient.gestante}
                      lactante={patient.lactante}
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
                        onClick={() => setRxItems([])}
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
                  {safetyAlerts.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-green-100 rounded-xl">
                      <CheckCircle2 className="w-7 h-7 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-green-600 font-medium">Nenhum alerta de segurança</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {rxItems.length === 0 ? 'Adicione medicamentos para verificar interações' : 'Prescrição verificada'}
                      </p>
                    </div>
                  ) : (
                    safetyAlerts.map(alert => {
                      const cfg = SEVERITY_CONFIG[alert.severidade];
                      return (
                        <div key={alert.id} className={`p-3 rounded-lg border ${cfg.color}`}>
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.icon}`} />
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{alert.titulo}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{alert.descricao}</p>
                              <p className="text-xs font-medium text-slate-700 mt-1">→ {alert.acao}</p>
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto flex-shrink-0 ${cfg.icon} bg-white/50`}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              {/* Favoritos */}
              <TabsContent value="favoritos" className="mt-3">
                {favorites.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                    <Star className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Nenhum protocolo salvo</p>
                    <p className="text-xs text-slate-300 mt-1">Monte uma prescrição e clique em "Salvar protocolo"</p>
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
        <PrintPreview
          patient={patient}
          items={rxItems}
          medico={state.settings.medico}
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

// ─── PRINT PREVIEW ────────────────────────────────────────────

function PrintPreview({
  patient, items, medico, onClose,
}: {
  patient: PatientInfo;
  items: RxItem[];
  medico: { nome: string; crm: string; especialidade: string; endereco?: string; telefone?: string };
  onClose: () => void;
}) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 print:hidden">
          <p className="font-semibold text-slate-800">Pré-visualização da Receita</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />Imprimir
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Receipt */}
        <div className="p-8" id="print-area">
          {/* Header médico */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <h2 className="text-lg font-bold text-slate-900">{medico.nome || 'Dr. Médico'}</h2>
            <p className="text-sm text-slate-600">{medico.especialidade || 'Clínica Médica'} · CRM: {medico.crm || '000000'}</p>
            {medico.endereco && <p className="text-xs text-slate-500">{medico.endereco}</p>}
            {medico.telefone && <p className="text-xs text-slate-500">Tel: {medico.telefone}</p>}
          </div>

          {/* Dados do paciente */}
          <div className="mb-6">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Paciente:</span>
                <span className="font-semibold ml-1 text-slate-900">{patient.nome || '_______________'}</span>
              </div>
              {patient.idade && <div><span className="text-slate-500">Idade:</span><span className="font-medium ml-1">{patient.idade} anos</span></div>}
              {patient.diagnostico && <div><span className="text-slate-500">CID/Diagnóstico:</span><span className="font-medium ml-1 text-xs">{patient.diagnostico}</span></div>}
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-6">
            <p className="text-base font-bold text-slate-800 uppercase tracking-widest border border-slate-300 inline-block px-6 py-1 rounded">
              RECEITA MÉDICA
            </p>
          </div>

          {/* Medicamentos */}
          <div className="space-y-5">
            {items.map((item, i) => (
              <div key={item.id}>
                <p className="font-bold text-slate-900">
                  {i + 1}. {item.nome_comercial || item.molecula}
                  {item.concentracao && ` ${item.concentracao}`}
                  {item.forma_farmaceutica && ` — ${item.forma_farmaceutica}`}
                </p>
                <p className="text-sm text-slate-700 ml-4">
                  {item.dose} · {item.via} · {item.frequencia}
                  {item.duracao && ` · por ${item.duracao}`}
                  {item.uso_continuo && ' · USO CONTÍNUO'}
                </p>
                {item.instrucoes && (
                  <p className="text-xs text-slate-500 ml-4 italic">{item.instrucoes}</p>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-slate-200">
            <div className="flex justify-between text-sm text-slate-600">
              <div>
                <p className="text-xs text-slate-400">Gerado por PRESCREVE-AI</p>
                <p className="text-xs text-slate-300">Apoio à decisão clínica — responsabilidade do médico prescritor</p>
              </div>
              <div className="text-right">
                <p>{hoje}</p>
                <div className="mt-8 border-t border-slate-400 pt-1 w-48 text-center">
                  <p className="text-xs text-slate-500">Assinatura e carimbo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
