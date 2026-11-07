// ============================================================
// RM-105.2 — Conteúdo do ANEXO TÉCNICO — USO EXCLUSIVO DO PRESCRITOR
//
// Lógica PURA (sem React): transforma o `SafetyCheckResult` em seções descritivas. É a ÚNICA fonte do
// texto técnico impresso. Linguagem estritamente descritiva: nunca afirma que a prescrição é segura,
// liberada, sem riscos ou certificada. Um alerta que depende de entrada não verificada nunca é
// apresentado como confirmado.
// ============================================================

import type { SafetyCheckResult, OrigemAlerta } from './safety-rules';
import { SEVERITY_CONFIG } from './safety-rules';
import { ROTULO_IDENTIFICACAO_ALERGENO, transparenciaAlergias } from './safety-allergy';
import { ROTULO_CLASSIFICACAO, ROTULO_CORRESPONDENCIA, NOTA_SEM_REGRA } from './interaction-contract';

export const ANEXO_TITULO = 'ANEXO TÉCNICO — USO EXCLUSIVO DO PRESCRITOR';
export const ANEXO_AVISO = 'Documento técnico de apoio à decisão. Não se destina ao paciente e não faz parte da receita.';

export interface AnexoSecao {
  id: string;
  titulo: string;
  linhas: string[];
}

export interface AnexoTecnico {
  titulo: string;
  aviso: string;
  avaliado_em: string | null;
  versao_contrato: string | null;
  /** Código do status do motor (ou 'nao_executada'). */
  status: string;
  rotulo_situacao: string;
  avaliacao_integral: boolean;
  rotulo_integral: string;
  secoes: AnexoSecao[];
}

const ROTULO_SITUACAO: Record<string, string> = {
  completa: 'Cobertura molecular completa (todas as moléculas informadas foram identificadas e verificadas)',
  parcial: 'Avaliação realizada com cobertura parcial',
  molecula_nao_reconhecida: 'Nenhuma molécula reconhecida — nada foi avaliado na base',
  dados_insuficientes: 'Dados insuficientes — nada foi avaliado',
  erro: 'Erro de avaliação — nenhuma conclusão é possível',
  nao_executada: 'Avaliação não executada',
};

const ROTULO_ORIGEM: Record<OrigemAlerta, string> = {
  base_cadastrada: 'base cadastrada',
  regra_fixa_par: 'regra fixa (par de alta relevância clínica)',
  regra_fixa_arm: 'regra fixa (antagonista de aldosterona / K+)',
  regra_fixa_montelucaste: 'regra fixa (montelucaste)',
  alergia_registrada: 'registro de alergia (identidade molecular)',
};

const ROTULO_ESTADO_DADO: Record<string, string> = {
  informado: 'informado',
  nao_informado: 'NÃO informado',
  nao_aplicavel: 'não aplicável',
  invalido: 'INVÁLIDO',
  nao_avaliado: 'NÃO avaliado',
};

const NOME_CAMPO: Record<string, string> = {
  gestacao: 'Gestação', lactacao: 'Lactação', idade_idoso: 'Idade', funcao_renal: 'Função renal', potassio: 'Potássio', alergias: 'Alergias', peso: 'Peso',
};

const ROTULO_ESTADO_ALERGIAS: Record<string, string> = {
  nao_informado: 'NÃO informadas (a avaliação não ocorreu; ausência de informação não significa ausência de alergia)',
  ausencia_informada: 'Ausência de alergias INFORMADA (declaração; não é uma verificação independente)',
  avaliada: 'Alergias registradas e cruzadas por identidade molecular',
  parcial: 'Avaliação de alergias PARCIAL (há cruzamentos não conclusivos)',
  invalida: 'Informação de alergias INVÁLIDA ou contraditória',
  nao_avaliada: 'Avaliação de alergias NÃO executada',
};


const ROTULO_RESULTADO: Record<string, string> = {
  correspondencia_molecular: 'correspondência molecular (identificação confirmada)',
  correspondencia_nao_confirmada: 'possível correspondência — identificação NÃO confirmada',
  sem_correspondencia_molecular: 'sem correspondência molecular (reatividade cruzada não avaliada)',
  nao_conclusivo: 'NÃO conclusivo',
};

function formatarDataHora(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  const d = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function montarAnexoTecnico(result: SafetyCheckResult | null | undefined, avaliadoEm?: Date | string | null): AnexoTecnico {
  const quando = formatarDataHora(avaliadoEm);
  const secoes: AnexoSecao[] = [];

  if (!result) {
    secoes.push({ id: 'situacao', titulo: 'Situação da avaliação', linhas: [ROTULO_SITUACAO.nao_executada + '. Nenhuma conclusão sobre a prescrição é possível a partir deste anexo.'] });
    secoes.push({ id: 'limitacoes', titulo: 'Limitações da avaliação', linhas: ['Não há resultado de avaliação disponível para esta prescrição.'] });
    return {
      titulo: ANEXO_TITULO, aviso: ANEXO_AVISO, avaliado_em: quando, versao_contrato: null, status: 'nao_executada',
      rotulo_situacao: ROTULO_SITUACAO.nao_executada, avaliacao_integral: false, rotulo_integral: 'Avaliação integral: NÃO realizada', secoes,
    };
  }

  const status = result.status;
  const rotuloSituacao = ROTULO_SITUACAO[status] ?? status;
  const integral = result.avaliacao_integral === true;
  const nRelevantes = result.detalhe_avaliacao?.limitacoes_relevantes ?? 0;
  const rotuloIntegral = integral
    ? 'Avaliação integral das verificações configuradas: todos os contextos exigidos foram informados e avaliados. É cobertura técnica, NÃO é homologação clínica.' + (nRelevantes ? ` Há ${nRelevantes} limitação(ões) relevante(s) conhecida(s) (ver "Limitações relevantes").` : '')
    : 'Avaliação integral: NÃO realizada (cobertura molecular não equivale a avaliação clínica integral)';

  secoes.push({
    id: 'identificacao',
    titulo: 'Identificação da avaliação',
    linhas: [
      'Data e horário da avaliação: ' + (quando ?? 'não registrado'),
      'Versão do contrato de avaliação: ' + (result.versao_contrato ?? 'não registrada'),
    ],
  });

  const linhasSituacao = [rotuloSituacao, rotuloIntegral];
  if (status === 'erro') linhasSituacao.push('Detalhe do erro: ' + (result.erro ?? 'não informado') + '. Este resultado NÃO é uma avaliação sem alertas.');
  else if (status === 'completa') linhasSituacao.push(`Verificação concluída para ${result.moleculas_verificadas.length} medicamento(s)/molécula(s) informado(s). Ausência de alerta indica apenas que nenhuma regra cadastrada foi acionada.`);
  else linhasSituacao.push(result.mensagem);
  linhasSituacao.push('Natureza da avaliação: cobertura técnica das verificações configuradas — NÃO é homologação clínica.');
  secoes.push({ id: 'situacao', titulo: 'Situação geral da avaliação', linhas: linhasSituacao });

  secoes.push({
    id: 'identificados',
    titulo: 'Medicamentos e moléculas identificados',
    linhas: result.moleculas_verificadas.length
      ? result.moleculas_verificadas.map(v =>
        `${v.entrada} → ${v.molecula} [${v.entidade_id}] — ${v.identidade_confirmada ? 'identidade confirmada' : 'identidade NÃO confirmada'} (${v.selecao === 'id_explicito' ? 'ID da entidade informado' : v.selecao === 'nome_unico' ? 'nome com correspondência única, sem ID' : 'sem ID: várias entidades possíveis, nenhuma foi escolhida com confirmação'})`
        + (v.contexto ? `; contexto: ${v.contexto}` : '')
        + (v.composicao === 'combinacao' ? '; combinação' : ''))
      : ['Nenhum medicamento foi identificado.'],
  });

  secoes.push({
    id: 'nao_identificados',
    titulo: 'Medicamentos ou moléculas não identificados',
    linhas: result.moleculas_nao_verificadas.length
      ? result.moleculas_nao_verificadas.map(n => {
        const quem = n.motivo === 'entrada_vazia' ? '(entrada vazia)' : n.entrada;
        const porque = n.motivo === 'nao_reconhecida' ? 'não reconhecido'
          : n.motivo === 'termo_nao_molecular' ? 'termo de classe/indicação/sintoma — não identifica uma molécula'
            : n.motivo === 'id_nao_encontrado' ? 'ID de entidade informado não existe'
              : n.motivo === 'entrada_invalida' ? 'entrada inválida' : 'entrada vazia';
        return `${quem} — ${porque}`;
      })
      : ['Nenhum.'],
  });

  secoes.push({
    id: 'combinacoes',
    titulo: 'Combinações não avaliadas',
    linhas: result.combinacoes_nao_avaliadas.length
      ? result.combinacoes_nao_avaliadas.map(c => `${c.a} + ${c.b} — ${c.motivo === 'molecula_nao_verificada' ? 'ao menos uma molécula não foi verificada' : 'identidade não confirmada (alertas apenas para a primeira correspondência)'}`)
      : ['Nenhuma.'],
  });

  // Alertas
  const linhasAlertas: string[] = [];
  if (status === 'erro') {
    linhasAlertas.push('Alertas indisponíveis: a avaliação não foi concluída.');
  } else {
    if (result.alertas.length === 0) {
      linhasAlertas.push(status === 'completa'
        ? 'Não foram identificados alertas nas verificações executadas.'
        : 'Nenhum alerta emitido, porém a avaliação NÃO foi completa: a ausência de alerta não indica ausência de risco.');
    }
    for (const a of result.alertas) {
      const rz = result.rastreio_alertas.find(r => r.alerta_id === a.id);
      const origem = rz ? ROTULO_ORIGEM[rz.origem] : 'origem não disponível';
      const estado = !rz
        ? 'estado de confirmação não disponível'
        : rz.interacao_confirmada
          ? 'baseado em moléculas identificadas'
          : rz.entradas_nao_verificadas.length
            ? `NÃO confirmado — depende de entrada não verificada (${rz.entradas_nao_verificadas.join(', ')})`
            : 'NÃO confirmado — identificação não confirmada';
      const reg = result.interacoes_avaliadas?.find(r => r.alerta_id === a.id);
      const cls = rz?.classificacao ? `; classificação: ${ROTULO_CLASSIFICACAO[rz.classificacao]}` : '';
      const corr = reg ? `; alvo cadastrado "${reg.alvo_cadastrado}" reconhecido como ${ROTULO_CORRESPONDENCIA[reg.tipo_correspondencia]}; fonte: ${reg.fonte ? reg.fonte.referencia : 'nenhuma registrada'}${reg.divergencia_de_gravidade ? `; gravidades cadastradas divergentes (${reg.divergencia_de_gravidade.a_para_b} × ${reg.divergencia_de_gravidade.b_para_a}), vale a mais grave` : ''}` : '';
      linhasAlertas.push(`[${SEVERITY_CONFIG[a.severidade].label}] ${a.titulo} — origem: ${origem}; estado: ${estado}${cls}${corr}`);
    }
  }
  secoes.push({ id: 'alertas', titulo: 'Alertas encontrados', linhas: linhasAlertas });

  // RM-106: pares de medicamentos identificados sem regra cadastrada encontrada
  {
    const sem = result.resumo_interacoes?.pares_sem_regra_encontrada ?? [];
    secoes.push({
      id: 'sem_regra',
      titulo: 'Pares sem regra de interação encontrada',
      linhas: status === 'erro'
        ? ['Indisponível: a avaliação não foi concluída.']
        : sem.length
          ? [...sem.map(p => `${p.a} + ${p.b} — nenhuma regra cadastrada encontrada${p.interacoes_com_alvo_nao_resolvido ? `; ${p.interacoes_com_alvo_nao_resolvido} interação(ões) cadastrada(s) com alvo não resolvido (podem incluir estes medicamentos)` : ''}`), NOTA_SEM_REGRA]
          : ['Nenhum par de medicamentos identificados ficou sem regra encontrada (ou há menos de dois medicamentos identificados). ' + NOTA_SEM_REGRA],
    });
  }

  // Contextos
  secoes.push({
    id: 'contextos',
    titulo: 'Contextos clínicos',
    linhas: [
      ...result.cobertura_contextual.itens.map(i => `${NOME_CAMPO[i.campo] ?? i.campo}: ${ROTULO_ESTADO_DADO[i.estado] ?? i.estado}${i.exigido ? '' : ' (não exigido por regra)'} — ${i.observacao}`),
      ...(result.cobertura_contextual.idade ? [`Idade normalizada: ${result.cobertura_contextual.idade.texto} (faixa ${result.cobertura_contextual.idade.faixa}); conversões: ${result.cobertura_contextual.idade.conversoes.join('; ')}.`] : []),
      ...result.cobertura_contextual.inconsistencias.map(x => 'Incoerência detectada: ' + x),
    ],
  });

  // Alergias
  const al = result.avaliacao_alergias;
  const linhasAl: string[] = [ROTULO_ESTADO_ALERGIAS[al.estado] ?? al.estado, ...transparenciaAlergias(al)];
  for (const r of al.registros) {
    linhasAl.push(`Registro ${r.indice + 1}: ${r.substancia || '(sem substância)'}`
      + (r.valido ? ` — ${ROTULO_IDENTIFICACAO_ALERGENO[r.identificacao_molecular]}${r.molecula ? ` (${r.molecula})` : ''}` : ` — INVÁLIDO: ${r.motivo_invalido}`)
      + (r.gravidade ? `; gravidade: ${r.gravidade}` : '; gravidade não informada')
      + (r.reacao ? `; reação: ${r.reacao}` : '')
      + (r.origem ? `; origem: ${r.origem}` : '; origem não informada'));
  }
  for (const c of al.cruzamentos) {
    linhasAl.push(`Cruzamento: "${c.substancia}"${c.item ? ' × ' + c.item : ''} — ${ROTULO_RESULTADO[c.resultado]}${c.motivo ? ` (${c.motivo.replace(/_/g, ' ')})` : ''}`);
  }
  secoes.push({ id: 'alergias', titulo: 'Situação da avaliação de alergias', linhas: linhasAl });

  // Limitações
  const limitacoes: string[] = [
    'Cobertura molecular não equivale a avaliação clínica integral.',
    'A avaliação é uma cobertura técnica das verificações configuradas; NÃO é homologação clínica.',
    ...(result.limitacoes_conhecidas ?? []).map(x => (x.severidade === 'relevante' ? 'RELEVANTE: ' : '') + x.descricao),
    ...al.limitacoes,
    'Verificações fora do escopo atual: ' + (result.detalhe_avaliacao?.verificacoes_fora_do_escopo ?? []).join('; ') + '.',
    'Este anexo é gerado no momento da impressão e não é armazenado automaticamente pelo sistema.',
  ];
  if (result.cobertura_contextual.pendencias.length) {
    limitacoes.push('Informações clínicas pendentes: ' + result.cobertura_contextual.pendencias.map(p => NOME_CAMPO[p] ?? p).join(', ') + '.');
  }
  if (result.combinacoes_nao_avaliadas.length) limitacoes.push('Existem combinações não avaliadas.');
  secoes.push({ id: 'limitacoes', titulo: 'Limitações relevantes', linhas: [...new Set(limitacoes)] });

  return {
    titulo: ANEXO_TITULO, aviso: ANEXO_AVISO, avaliado_em: quando, versao_contrato: result.versao_contrato ?? null, status,
    rotulo_situacao: rotuloSituacao, avaliacao_integral: integral, rotulo_integral: rotuloIntegral, secoes,
  };
}

/** Texto plano do anexo (usado em testes e para conferir ausência de expressões proibidas). */
export function anexoComoTexto(a: AnexoTecnico): string {
  return [a.titulo, a.aviso, a.rotulo_situacao, a.rotulo_integral, ...a.secoes.flatMap(s => [s.titulo, ...s.linhas])].join('\n');
}
