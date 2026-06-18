'use client';

import { useState } from 'react';
import type { TherapeuticSuggestion } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BookOpen,
  Users,
  ArrowLeftRight,
  ExternalLink,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { NIVEL_EVIDENCIA, GRAU_RECOMENDACAO } from '@/lib/utils';

interface Props {
  med: TherapeuticSuggestion;
}

const PERFIL_IDEAL: Record<string, string[]> = {
  enalapril: [
    'HAS com diabetes mellitus associado',
    'HAS com doença renal crônica (proteinúria)',
    'HAS com insuficiência cardíaca com FE reduzida',
    'HAS com infarto do miocárdio prévio',
    'Pacientes sem contraindicação a IECAs',
    'Preferência quando tosse não é preocupação',
  ],
  hctz: [
    'HAS sem contraindicações a tiazídicos',
    'HAS em pacientes > 60 anos (boa resposta)',
    'HAS com edema moderado',
    'Em combinação com IECA ou BRA (sinergia)',
    'HAS em pacientes de raça negra (em combinação)',
  ],
  metformina: [
    'DM2 recém-diagnosticado sem contraindicações',
    'DM2 com sobrepeso/obesidade',
    'DM2 com TFG ≥ 30 mL/min/1,73m²',
    'DM2 com risco cardiovascular moderado',
    'Paciente que não deseja injeções',
    'Início do tratamento farmacológico do DM2',
  ],
  empagliflozina: [
    'DM2 com doença cardiovascular aterosclerótica estabelecida',
    'DM2 com doença renal crônica (TFG > 20)',
    'DM2 com insuficiência cardíaca',
    'DM2 com obesidade (efeito de perda de peso)',
    'DM2 que necessita de redução da PA',
    'Em adição à metformina quando HbA1c acima da meta',
  ],
};

const BENEFICIOS: Record<string, string[]> = {
  enalapril: [
    'Redução de PA sistólica 10-15 mmHg (média)',
    'Redução de mortalidade cardiovascular (SAVE, SOLVD)',
    'Nefroproteção em DRC e DM2 (retarda progressão)',
    'Redução de proteinúria',
    'Redução de hospitalização por IC',
    'Redução de risco de AVC',
  ],
  hctz: [
    'Redução de PA 8-10 mmHg em monoterapia',
    'Redução de mortalidade cardiovascular (ALLHAT)',
    'Custo-efetividade elevado (medicamento genérico)',
    'Efeito sinérgico com IECA/BRA',
    'Redução de eventos coronarianos',
  ],
  metformina: [
    'Redução de HbA1c 1,0-1,5%',
    'Redução de mortalidade cardiovascular em DM2 (UKPDS)',
    'Neutro / redução modesta de peso',
    'Custo muito baixo (genérico amplamente disponível)',
    'Não causa hipoglicemia em monoterapia',
    'Benefício cardiovascular independente do controle glicêmico',
  ],
  empagliflozina: [
    'Redução de HbA1c 0,6-1,0%',
    'Redução de mortalidade cardiovascular 38% (EMPA-REG)',
    'Redução de hospitalização por IC 35%',
    'Redução de progressão da DRC 40%',
    'Perda de peso 2-3 kg',
    'Redução de PA sistólica 3-5 mmHg',
  ],
};

export function WhyThisRecommendation({ med }: Props) {
  const perfil = PERFIL_IDEAL[med.id] ?? [
    'Pacientes com indicação conforme diretriz vigente',
    'Ausência de contraindicações listadas',
    'Relação benefício/risco favorável para o caso específico',
  ];

  const beneficios = BENEFICIOS[med.id] ?? [
    'Controle da condição de base conforme evidência',
    'Redução de desfechos clínicos relevantes',
    'Perfil de segurança estabelecido em ECRs',
  ];

  return (
    <Dialog>
      <DialogTrigger>
        <span className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer">
          <HelpCircle className="w-3 h-3" />
          Por que esta recomendação?
        </span>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-blue-600" />
            </div>
            Por que {med.molecula}?
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">{med.classe_terapeutica}</p>
        </DialogHeader>

        <Tabs defaultValue="beneficios" className="mt-2">
          <TabsList className="grid grid-cols-5 text-xs">
            <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
            <TabsTrigger value="riscos">Riscos</TabsTrigger>
            <TabsTrigger value="perfil">Perfil Ideal</TabsTrigger>
            <TabsTrigger value="alternativas">Alternativas</TabsTrigger>
            <TabsTrigger value="evidencia">Evidência</TabsTrigger>
          </TabsList>

          {/* Benefícios */}
          <TabsContent value="beneficios" className="mt-4 space-y-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Benefícios Clínicos Demonstrados
              </p>
              <ul className="space-y-1.5">
                {beneficios.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-green-800">
                    <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
              <strong>Indicação clínica:</strong> {med.indicacao}
            </div>
          </TabsContent>

          {/* Riscos */}
          <TabsContent value="riscos" className="mt-4 space-y-3">
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs font-semibold text-orange-800 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Efeitos Adversos Relevantes
              </p>
              <ul className="space-y-1.5">
                {med.efeitos_adversos.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-orange-800">
                    <AlertTriangle className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Contraindicações
              </p>
              <ul className="space-y-1.5">
                {med.contraindicacoes.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-red-800">
                    <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          {/* Perfil Ideal */}
          <TabsContent value="perfil" className="mt-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" /> Perfil de Paciente Ideal
              </p>
              <ul className="space-y-1.5">
                {perfil.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-blue-800">
                    <CheckCircle2 className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {(med.dose.ajuste_renal || med.dose.ajuste_hepatico) && (
              <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-xs font-semibold text-yellow-800 mb-2">Ajustes Necessários</p>
                {med.dose.ajuste_renal && (
                  <p className="text-xs text-yellow-700"><strong>Renal:</strong> {med.dose.ajuste_renal}</p>
                )}
                {med.dose.ajuste_hepatico && (
                  <p className="text-xs text-yellow-700 mt-1"><strong>Hepático:</strong> {med.dose.ajuste_hepatico}</p>
                )}
              </div>
            )}
          </TabsContent>

          {/* Alternativas */}
          <TabsContent value="alternativas" className="mt-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                <ArrowLeftRight className="w-3 h-3" /> Alternativas Terapêuticas
              </p>
              <div className="space-y-2">
                {med.alternativas.map((alt, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200">
                    <ArrowLeftRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <p className="text-xs text-slate-700">{alt}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-700 border border-amber-200">
              <strong>Nota:</strong> A escolha entre alternativas deve considerar perfil do paciente, comorbidades,
              custo e preferência do médico. Todas as alternativas listadas possuem evidência científica para a indicação.
            </div>
          </TabsContent>

          {/* Evidência */}
          <TabsContent value="evidencia" className="mt-4 space-y-3">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-green-900">{med.evidencia.diretriz}</p>
                  <p className="text-xs text-green-700 mt-0.5">{med.evidencia.sociedade}</p>
                  <p className="text-xs text-green-600 mt-0.5">Ano: {med.evidencia.ano}</p>
                </div>
                <div className="flex gap-1.5">
                  <span className="text-xs font-bold bg-green-200 text-green-800 px-2 py-0.5 rounded">
                    Nível {med.evidencia.nivel_evidencia.nivel}
                  </span>
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    Grau {med.evidencia.nivel_evidencia.grau}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-green-200 space-y-1">
                <p className="text-xs font-medium text-green-800">O que significa:</p>
                <p className="text-xs text-green-700">{NIVEL_EVIDENCIA[med.evidencia.nivel_evidencia.nivel]}</p>
                <p className="text-xs text-green-700">{GRAU_RECOMENDACAO[med.evidencia.nivel_evidencia.grau]}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Citação científica
              </p>
              <p className="text-xs text-slate-600 italic">{med.evidencia.citacao}</p>
              {med.evidencia.doi && (
                <a
                  href={`https://doi.org/${med.evidencia.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                >
                  DOI: {med.evidencia.doi} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Governança Científica
              </p>
              <p className="text-xs text-blue-700">
                Esta recomendação é gerada com base em diretrizes atualizadas e revisadas por médicos especialistas.
                A evidência científica é independente de qualquer preferência comercial.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 text-center">
          Esta informação é um apoio à decisão clínica. A conduta final é de responsabilidade exclusiva do médico.
        </div>
      </DialogContent>
    </Dialog>
  );
}
