'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/lib/store';
import type { Consultation, PrescriptionItem, DoseEstruturada } from '@/lib/types';
import { classificarSincronizacaoPrescricao } from '@/lib/sincronizacao-prescricao';
import { avaliarIntegridadeDto } from '@/lib/posologia-consistencia';
import { itemParaRevisao, prepararItemParaStore, reconfirmarDoseEstruturada, registrarEdicaoPosologica } from '@/lib/prescricao-proveniencia';
import { registrarEventoSessao } from '@/lib/trilha-sessao-posologia';
import { normalizarProveniencia, ROTULO_ORIGEM, ROTULO_ESTRUTURA } from '@/lib/proveniencia-persistida';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CloudOff } from 'lucide-react';

/**
 * RM-107.1.1-E2.4 — Prescrições finalizadas SOMENTE neste dispositivo (bloqueadas por integridade, com falha ou ainda não confirmadas).
 * Independe do `PrescriptionPanel` original (que é desmontado ao finalizar): trabalha apenas com o que está no store/localStorage.
 * Nada é enviado automaticamente; reutilizar a dose estruturada anterior é decisão explícita do prescritor e não valida clinicamente a dose.
 */

type ItemRevisao = ReturnType<typeof itemParaRevisao<PrescriptionItem>>;

function formatarDto(d: DoseEstruturada): string {
  const freq = d.frequencia_detalhe ? `${d.frequencia} (${d.frequencia_detalhe})` : d.frequencia;
  return `${d.valor} ${d.unidade} · ${freq} · via ${d.via}`;
}

/** Quatro blocos SEPARADOS: proveniência original · histórico de recuperação · declaração do prescritor · estado atual da estrutura de dose. */
function ProvenienciaDoItem({ item, estadoAtual, idx }: { item: ItemRevisao; estadoAtual: keyof typeof ROTULO_ESTRUTURA; idx: number }) {
  const prov = normalizarProveniencia(item.proveniencia);
  const reuso = item.posologia_registrada.reconfirmacoes_dose?.at(-1);
  return (
    <dl className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-x-2 gap-y-0.5" data-testid={`proveniencia-${idx}`}>
      <dt className="font-medium">Proveniência original:</dt>
      <dd data-testid={`prov-original-${idx}`}>{prov?.original.conhecida ? `${ROTULO_ORIGEM[prov.original.origem]}${prov.original.detalhe ? ` (${prov.original.detalhe})` : ''}` : 'não conhecida (o registro anterior não tinha proveniência)'}</dd>
      <dt className="font-medium">Histórico de recuperação:</dt>
      <dd data-testid={`prov-recuperacao-${idx}`}>{prov?.recuperacao.length ? `${prov.recuperacao.length} revisão(ões) salva(s) anteriormente` : 'nenhuma revisão salva anteriormente'}</dd>
      <dt className="font-medium">Declaração do prescritor:</dt>
      <dd data-testid={`prov-declaracao-${idx}`}>{reuso ? 'reutilização da dose estruturada anterior decidida nesta revisão (não é validação)' : prov?.declaracao_prescritor ? `reutilização da dose estruturada anterior registrada (${prov.declaracao_prescritor.vigente ? 'vigente' : 'invalidada por alteração posterior'}; não é validação)` : 'nenhuma'}</dd>
      <dt className="font-medium">Estado atual da estrutura de dose:</dt>
      <dd data-testid={`prov-estado-${idx}`}>{ROTULO_ESTRUTURA[estadoAtual]}</dd>
    </dl>
  );
}

function RevisaoDaPrescricao({ c, onFechar }: { c: Consultation; onFechar: () => void }) {
  const { dispatch } = useApp();
  const [itens, setItens] = useState<ItemRevisao[]>(() => (c.prescricao?.itens ?? []).map(i => itemParaRevisao(i)));
  const [salvo, setSalvo] = useState(false);

  const editarTexto = (id: string, texto: string) => {
    setSalvo(false);
    setItens(prev => prev.map(i => i.id === id ? { ...i, posologia: texto, posologia_registrada: registrarEdicaoPosologica(i.posologia_registrada, 'posologia', i.posologia, texto) ?? i.posologia_registrada } : i));
  };
  const reutilizar = (id: string) => {
    setSalvo(false);
    setItens(prev => prev.map(i => i.id === id ? { ...i, posologia_registrada: reconfirmarDoseEstruturada(i.posologia_registrada) ?? i.posologia_registrada } : i));
  };
  const salvar = () => {
    if (!c.prescricao) return;
    const preparados = itens.map(prepararItemParaStore) as PrescriptionItem[];
    registrarEventoSessao({ tipo: 'revisao_salva', consulta_id: c.id, detalhe: `itens=${preparados.length};ainda_bloqueados=${preparados.filter(i => i.bloqueio_dto).length}` });
    dispatch({ type: 'REVIEW_PRESCRIPTION', payload: { consultaId: c.id, prescricao: { ...c.prescricao, itens: preparados } } });
    setSalvo(true);
    // Recomeça a revisão a partir do que foi salvo (o envelope já incorpora as alterações/reutilização desta sessão — evita contá-las duas vezes).
    setItens(preparados.map(i => itemParaRevisao(i)));
  };
  const cancelar = () => {
    registrarEventoSessao({ tipo: 'revisao_cancelada', consulta_id: c.id });
    onFechar();   // descarta apenas a revisão em edição: a prescrição guardada no dispositivo permanece intacta
  };

  return (
    <div className="mt-3 space-y-3 border-t border-slate-200 pt-3" data-testid="revisao-prescricao">
      {itens.map((item, idx) => {
        const parecer = avaliarIntegridadeDto(item);
        const dto = item.dose_estruturada;
        const divergenteComDto = parecer.estado === 'divergente' && !!dto && !!item.posologia_registrada.dose_divergente;
        return (
          <div key={item.id} className="rounded-md border border-slate-200 p-3 space-y-2 text-sm" data-testid={`item-revisao-${idx}`}>
            <p className="font-medium text-slate-800">Item {idx + 1} — {item.medicamento || '(sem nome)'}</p>
            <label className="block text-xs text-slate-500" htmlFor={`poso-${c.id}-${item.id}`}>Texto atual da posologia</label>
            <Textarea id={`poso-${c.id}-${item.id}`} rows={2} className="text-sm" value={item.posologia} onChange={e => editarTexto(item.id, e.target.value)} />
            <ProvenienciaDoItem item={item} estadoAtual={parecer.estado} idx={idx} />
            <p className="text-xs text-slate-600" data-testid={`dto-preservado-${idx}`}>
              Dose estruturada preservada: {dto ? formatarDto(dto) : '(não há dose estruturada preservada)'}
            </p>
            {divergenteComDto && (
              <div className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 space-y-1.5" role="alert">
                <p>
                  O sistema <strong>não verificou</strong> se o texto atual e essa dose estruturada correspondem. Ela <strong>não será enviada ao servidor</strong> enquanto
                  você não decidir reutilizá-la. Reutilizar é uma decisão sua e não equivale a validar clinicamente a dose. Qualquer nova alteração da posologia
                  invalida a reutilização.
                </p>
                <Button type="button" variant="outline" size="sm" className="h-auto min-h-7 whitespace-normal text-left text-xs" onClick={() => reutilizar(item.id)}>
                  Reutilizar a dose estruturada anterior
                </Button>
              </div>
            )}
            {!dto && (
              <p className="text-xs text-red-700" role="alert">Não há dose estruturada preservada para reutilizar: a prescrição não pode ser enviada ao servidor enquanto este item não tiver dose estruturada (o sistema não a reconstrói a partir do texto).</p>
            )}
            {parecer.estado !== 'divergente' && !!dto && (
              <p className="text-xs text-slate-500">
                {item.posologia_registrada.reconfirmacoes_dose?.length ? 'Reutilização da dose estruturada anterior registrada nesta revisão (decisão do prescritor; sem validação clínica).' : 'Sem bloqueio de integridade neste item.'}
              </p>
            )}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={salvar}>Salvar revisão neste dispositivo</Button>
        <Button type="button" variant="outline" size="sm" onClick={cancelar}>Cancelar revisão</Button>
      </div>
      {salvo && (
        <p className="text-xs text-slate-600" data-testid="revisao-salva">
          Revisão salva somente neste dispositivo. A prescrição <strong>ainda não foi enviada ao servidor</strong>; o envio é uma ação separada e manual.
        </p>
      )}
    </div>
  );
}

export function PrescricoesLocaisPendentes() {
  const { state, auth, retrySync } = useApp();
  const [revisandoId, setRevisandoId] = useState<string | null>(null);

  const pendentes = useMemo(() => state.consultations
    .map(c => ({ c, parecer: classificarSincronizacaoPrescricao(c, { backendMode: auth.backendMode }) }))
    .filter(({ parecer }) => parecer.estado !== 'sincronizada' && parecer.estado !== 'sem_prescricao_local'
      // Sem backend (local/demonstração) toda prescrição é "somente no dispositivo": só interessa o que está BLOQUEADO.
      && (auth.backendMode || parecer.estado === 'bloqueada_por_integridade')),
  [state.consultations, auth.backendMode]);

  if (pendentes.length === 0) return null;

  return (
    <section className="mb-6 space-y-3" aria-label="Prescrições finalizadas somente neste dispositivo" data-testid="prescricoes-locais-pendentes">
      <div className="flex items-center gap-2 text-slate-800">
        <CloudOff className="w-4 h-4 text-amber-600" />
        <h2 className="text-base font-semibold">Prescrições somente neste dispositivo (não confirmadas pelo servidor)</h2>
      </div>
      {pendentes.map(({ c, parecer }) => (
        <Card key={c.id} className={parecer.exige_revisao ? 'border-red-300' : 'border-amber-300'} data-testid={`pendente-${c.id}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 break-words">{c.paciente_nome}</p>
                <p className="text-xs text-slate-500">{c.prescricao?.itens.length ?? 0} medicamento(s)</p>
                <p className={`mt-1 text-sm font-medium ${parecer.exige_revisao ? 'text-red-700' : 'text-amber-700'}`} data-testid="rotulo-sync">
                  {parecer.exige_revisao && <AlertTriangle className="inline w-3.5 h-3.5 mr-1" />}
                  {parecer.rotulo}
                </p>
                <p className="text-xs text-slate-600 mt-0.5" data-testid="detalhe-sync">{parecer.detalhe}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {parecer.exige_revisao && (
                  <Button size="sm" variant="outline" onClick={() => { registrarEventoSessao({ tipo: 'revisao_aberta', consulta_id: c.id }); setRevisandoId(c.id); }}>
                    Revisar prescrição
                  </Button>
                )}
                {parecer.pode_reenviar && (
                  <Button size="sm" variant="outline" onClick={() => { registrarEventoSessao({ tipo: 'reenvio_manual', consulta_id: c.id }); void retrySync(c.id); }}>
                    Reenviar ao servidor
                  </Button>
                )}
              </div>
            </div>
            {revisandoId === c.id && <RevisaoDaPrescricao c={c} onFechar={() => setRevisandoId(null)} />}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
