'use client';

import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/lib/store';
import { DEMO_CASES, getCaseData } from '@/lib/demo-cases';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PlayCircle,
  Sparkles,
  ChevronRight,
  Stethoscope,
  Clock,
  BookOpen,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

export default function DemoPage() {
  const router = useRouter();
  const { dispatch } = useApp();

  const launchCase = (caseId: string) => {
    const demoCase = DEMO_CASES.find(c => c.id === caseId);
    if (!demoCase) return;

    const { diagnostic, therapeutic, safety } = getCaseData(caseId);
    const id = `demo_${caseId}_${Date.now()}`;

    dispatch({
      type: 'NEW_CONSULTATION',
      payload: {
        id,
        status: 'terapeutico',
        paciente_nome: demoCase.paciente.nome,
        data: new Date().toISOString(),
        apoio_diagnostico: diagnostic,
        diagnostico_selecionado: demoCase.diagnostico,
        plano_terapeutico: therapeutic,
        seguranca: safety,
      },
    });

    router.push('/consulta/nova');
  };

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Ambiente de Demonstração
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Casos Clínicos</h1>
          <p className="text-slate-500 mt-2 max-w-2xl">
            Explore o PRESCREVE-AI com casos clínicos reais simulados. Cada caso demonstra o fluxo
            completo: anamnese → diagnóstico diferencial → protocolo terapêutico baseado em evidências
            → prescrição digital.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { icon: Stethoscope, label: 'Casos disponíveis', value: DEMO_CASES.length.toString() },
            { icon: BookOpen, label: 'Diretrizes integradas', value: '12+' },
            { icon: Shield, label: 'Verificações de segurança', value: 'Automáticas' },
            { icon: Clock, label: 'Tempo médio por consulta', value: '< 5 min' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Cases grid */}
        <div className="grid grid-cols-2 gap-4">
          {DEMO_CASES.map(c => (
            <Card
              key={c.id}
              className="hover:shadow-md transition-all cursor-pointer border-2 hover:border-blue-200 group"
            >
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{c.icone}</div>
                  <Badge variant="outline" className="text-xs text-slate-500 border-slate-200">
                    {c.especialidade}
                  </Badge>
                </div>

                <h3 className="font-bold text-slate-900 mb-1">{c.titulo}</h3>
                <p className="text-xs text-slate-500 mb-2">
                  {c.paciente.nome} · {c.paciente.idade} anos · {c.paciente.sexo === 'M' ? 'Masculino' : 'Feminino'}
                </p>

                <div className="p-2.5 bg-slate-50 rounded-lg mb-3">
                  <p className="text-xs font-medium text-slate-700 mb-0.5">Queixa principal:</p>
                  <p className="text-xs text-slate-600">{c.queixa}</p>
                </div>

                <p className="text-xs text-slate-500 mb-3 leading-relaxed">{c.descricao}</p>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                    CID-10: {c.cid10}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => launchCase(c.id)}
                    className="bg-blue-600 hover:bg-blue-700 gap-1.5 text-xs group-hover:gap-2 transition-all"
                  >
                    <PlayCircle className="w-3 h-3" />
                    Iniciar caso
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">Pronto para uma consulta real?</p>
              <p className="text-blue-100 text-sm mt-1">
                Inicie uma nova consulta com dados do seu paciente
              </p>
            </div>
            <Link href="/consulta/nova">
              <Button className="bg-white text-blue-600 hover:bg-blue-50 gap-2 font-semibold">
                <Stethoscope className="w-4 h-4" />
                Nova Consulta
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Todos os casos são simulados para fins de demonstração.
          Os dados não representam pacientes reais.
        </p>
      </div>
    </AppShell>
  );
}
