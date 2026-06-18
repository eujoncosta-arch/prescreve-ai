'use client';

import { useState } from 'react';
import { getBula } from '@/lib/bula-database';
import { getProductById } from '@/lib/lab-catalog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BookOpen,
  AlertTriangle,
  Pill,
  Users,
  ClipboardList,
  Shield,
  Calendar,
} from 'lucide-react';

interface BulaViewerProps {
  produtoId: string;
  trigger?: React.ReactNode;
}

export function BulaViewer({ produtoId, trigger }: BulaViewerProps) {
  const [open, setOpen] = useState(false);
  const bula = getBula(produtoId);
  const produto = getProductById(produtoId);

  if (!bula || !produto) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <span
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={e => e.key === 'Enter' && setOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer font-medium underline-offset-2 hover:underline"
        >
          <BookOpen className="w-3 h-3" />
          {trigger ?? 'Ver bula'}
        </span>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pill className="w-5 h-5 text-indigo-600" />
            {bula.produto_nome}
            <span className="text-slate-400 font-normal">({bula.molecula})</span>
          </DialogTitle>
        </DialogHeader>

        {/* Aviso de separação científico vs regulatório */}
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <AlertDescription className="text-xs text-amber-700">
            <strong>Informação regulatória (bula ANVISA)</strong> — Este conteúdo é distinto da
            evidência científica. A recomendação clínica é baseada em diretrizes e evidências.
            Informações de bula refletem o registro regulatório do produto.
          </AlertDescription>
        </Alert>

        {/* Header regulatório */}
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-lg border">
          <Badge variant="outline" className="text-xs font-mono">
            {produto.fonte_regulatoria}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            Reg.: {new Date(produto.data_registro).toLocaleDateString('pt-BR')}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="w-3 h-3" />
            Atualização: {new Date(produto.data_ultima_atualizacao).toLocaleDateString('pt-BR')}
          </div>
          <span className="text-xs text-slate-500">{bula.versao}</span>
        </div>

        <Tabs defaultValue="resumo">
          <TabsList className="grid grid-cols-4 text-xs">
            <TabsTrigger value="resumo" className="text-xs">
              <Pill className="w-3 h-3 mr-1" />Resumo
            </TabsTrigger>
            <TabsTrigger value="posologia" className="text-xs">
              <ClipboardList className="w-3 h-3 mr-1" />Posologia
            </TabsTrigger>
            <TabsTrigger value="seguranca" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />Segurança
            </TabsTrigger>
            <TabsTrigger value="populacoes" className="text-xs">
              <Users className="w-3 h-3 mr-1" />Populações
            </TabsTrigger>
          </TabsList>

          {/* Aba: Resumo */}
          <TabsContent value="resumo" className="space-y-3 mt-3">
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <p className="text-xs font-semibold text-indigo-800 mb-1">Classe Terapêutica</p>
              <p className="text-sm text-indigo-700">{produto.classe_terapeutica}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">Apresentações Disponíveis</p>
              <div className="flex flex-wrap gap-2">
                {produto.apresentacoes.map((ap, i) => (
                  <div key={i} className="p-2 bg-white border border-slate-200 rounded-lg text-xs">
                    <span className="font-semibold text-slate-800">{ap.concentracao}</span>
                    <span className="text-slate-500"> — {ap.forma_farmaceutica}</span>
                    <div className="text-slate-400">{ap.embalagem}</div>
                    {ap.registro_anvisa && (
                      <div className="text-slate-300 font-mono text-[10px]">ANVISA: {ap.registro_anvisa}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">CIDs Aprovados pela ANVISA</p>
              <div className="flex gap-2 flex-wrap">
                {produto.cids_aprovados.map(cid => (
                  <span key={cid} className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {cid}
                  </span>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Aba: Posologia */}
          <TabsContent value="posologia" className="mt-3">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                <ClipboardList className="w-3 h-3" />
                Posologia Aprovada (Bula)
              </p>
              <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-line">
                {produto.posologia_aprovada}
              </p>
            </div>

            {/* Bula profissional — seções relevantes */}
            {bula.bula_profissional
              .filter(s => s.titulo.toLowerCase().includes('posolog'))
              .map((s, i) => (
                <div key={i} className="mt-3 p-3 bg-white border border-slate-200 rounded-lg">
                  <p className="text-xs font-semibold text-slate-700 mb-2">{s.titulo}</p>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{s.conteudo}</p>
                </div>
              ))
            }
          </TabsContent>

          {/* Aba: Segurança */}
          <TabsContent value="seguranca" className="space-y-3 mt-3">
            <div>
              <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Contraindicações (Bula)
              </p>
              <ul className="space-y-1">
                {produto.contraindicacoes_bula.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-orange-700 mb-2">Advertências Principais</p>
              <ul className="space-y-1">
                {produto.advertencias_principais.map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                    <span className="text-orange-400 mt-0.5 flex-shrink-0">⚠</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-yellow-700 mb-2">Interações Medicamentosas</p>
              <ul className="space-y-1">
                {produto.interacoes_principais.map((inter, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                    <span className="text-yellow-500 mt-0.5 flex-shrink-0">⇄</span>
                    {inter}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          {/* Aba: Populações Especiais */}
          <TabsContent value="populacoes" className="space-y-2 mt-3">
            {Object.entries(produto.uso_populacoes_especiais).map(([grupo, info]) => {
              const labels: Record<string, { label: string; color: string }> = {
                renal: { label: 'Insuficiência Renal', color: 'bg-blue-50 border-blue-200' },
                hepatico: { label: 'Insuficiência Hepática', color: 'bg-yellow-50 border-yellow-200' },
                pediatrico: { label: 'Uso Pediátrico', color: 'bg-green-50 border-green-200' },
                gestante: { label: 'Gestação', color: 'bg-pink-50 border-pink-200' },
                idoso: { label: 'Idosos', color: 'bg-purple-50 border-purple-200' },
              };
              const cfg = labels[grupo] ?? { label: grupo, color: 'bg-slate-50 border-slate-200' };
              return (
                <div key={grupo} className={`p-3 rounded-lg border ${cfg.color}`}>
                  <p className="text-xs font-semibold text-slate-800 mb-1">{cfg.label}</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{info}</p>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>

        {/* Bula completa — paciente */}
        <div className="mt-2 pt-3 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-600 mb-2">Bula para o Paciente</p>
          <div className="space-y-2">
            {bula.bula_paciente.map((s, i) => (
              <div key={i} className="p-2.5 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-700 mb-1">{s.titulo}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{s.conteudo}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer regulatório */}
        <div className="mt-2 pt-2 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400">
            Informações conforme bula registrada na ANVISA · {bula.versao} ·
            Consulte sempre a bula completa mais recente
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
