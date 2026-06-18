'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { AnamneseForm } from '@/components/modules/AnamneseForm';
import { DiagnosticPanel } from '@/components/modules/DiagnosticPanel';
import { TherapeuticPanel } from '@/components/modules/TherapeuticPanel';
import { PrescriptionPanel } from '@/components/modules/PrescriptionPanel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ClipboardList,
  Stethoscope,
  Pill,
  Shield,
  FileText,
  CheckCircle2,
  ChevronRight,
  User,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Step = 'paciente' | 'anamnese' | 'diagnostico' | 'terapeutico' | 'prescricao' | 'concluida';

const STEPS: { id: Step; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'paciente', label: 'Paciente', icon: User, description: 'Identificação' },
  { id: 'anamnese', label: 'Anamnese', icon: ClipboardList, description: 'Módulo 1' },
  { id: 'diagnostico', label: 'Diagnóstico', icon: Stethoscope, description: 'Módulo 2' },
  { id: 'terapeutico', label: 'Terapêutico', icon: Pill, description: 'Módulo 3' },
  { id: 'prescricao', label: 'Prescrição', icon: FileText, description: 'Módulo 5' },
  { id: 'concluida', label: 'Concluída', icon: CheckCircle2, description: 'Finalizada' },
];

export default function NovaConsulta() {
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [step, setStep] = useState<Step>('paciente');
  const [pacienteNome, setPacienteNome] = useState('');
  const [consultationId, setConsultationId] = useState<string | null>(null);

  const stepIndex = STEPS.findIndex(s => s.id === step);

  const initConsultation = () => {
    if (!pacienteNome.trim()) return;
    const id = Date.now().toString();
    setConsultationId(id);
    dispatch({
      type: 'NEW_CONSULTATION',
      payload: {
        id,
        status: 'anamnese',
        paciente_nome: pacienteNome,
        data: new Date().toISOString(),
      },
    });
    setStep('anamnese');
  };

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1 text-slate-500">
              <ArrowLeft className="w-3 h-3" /> Dashboard
            </Button>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <h1 className="text-xl font-bold text-slate-900">Nova Consulta</h1>
          {state.activeConsultation && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-slate-600">{state.activeConsultation.paciente_nome}</span>
            </>
          )}
        </div>

        {/* Progress steps */}
        <div className="flex items-center mb-8 relative">
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-200 z-0" />
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = s.id === step;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center relative z-10">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                    done
                      ? 'bg-green-500 border-green-500 text-white'
                      : active
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-slate-200 text-slate-400'
                  )}
                >
                  {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                </div>
                <p className={cn('text-xs font-medium mt-1', active ? 'text-blue-700' : done ? 'text-green-600' : 'text-slate-400')}>
                  {s.label}
                </p>
                <p className="text-xs text-slate-400">{s.description}</p>
              </div>
            );
          })}
        </div>

        {/* Content */}
        {step === 'paciente' && (
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Identificação do Paciente</h2>
                <p className="text-sm text-slate-500">Informe o nome do paciente para iniciar a consulta</p>
              </div>
              <div>
                <Label>Nome completo do paciente *</Label>
                <Input
                  className="mt-1"
                  placeholder="Ex: Maria Aparecida Santos"
                  value={pacienteNome}
                  onChange={e => setPacienteNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && initConsultation()}
                  autoFocus
                />
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 gap-2"
                onClick={initConsultation}
                disabled={!pacienteNome.trim()}
              >
                <ClipboardList className="w-4 h-4" />
                Iniciar Anamnese
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'anamnese' && consultationId && (
          <AnamneseForm
            consultationId={consultationId}
            onComplete={() => setStep('diagnostico')}
          />
        )}

        {step === 'diagnostico' && (
          <DiagnosticPanel onComplete={() => setStep('terapeutico')} />
        )}

        {step === 'terapeutico' && (
          <TherapeuticPanel onComplete={() => setStep('prescricao')} />
        )}

        {step === 'prescricao' && (
          <PrescriptionPanel onComplete={() => setStep('concluida')} />
        )}

        {step === 'concluida' && (
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Consulta Concluída!</h2>
              <p className="text-slate-500">
                A prescrição de <strong>{state.activeConsultation?.paciente_nome}</strong> foi emitida com sucesso.
              </p>
              <div className="flex gap-3 justify-center pt-4">
                <Link href="/">
                  <Button variant="outline">Ir ao Dashboard</Button>
                </Link>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setPacienteNome('');
                    setConsultationId(null);
                    setStep('paciente');
                  }}
                >
                  Nova Consulta
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
