import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, TTL } from '../cache/cache.service';
import { AuditService, AuditoriaInput } from '../audit/audit.service';
import {
  CriarConsultaDto,
  CriarDiagnosticoDto,
  CriarPrescricaoDto,
  RiskScorePayloadDto,
} from './dto/consulta.dto';
import { hmacIdentifier } from '../../common/crypto/identifier-hash.util';
import * as crypto from 'crypto';

function hashIntegridade(obj: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

function toJson(
  value: Record<string, unknown> | undefined,
): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

// ============================================================
// RM-43 — Detalhe completo de consulta (recuperação de prescrição real)
//
// `buscarConsulta` já existia, já exige autenticação (JwtAuthGuard no
// controller) e já filtra por `usuario_id` (nunca vaza consulta de
// terceiro — ver ownership-authorization.e2e-spec.ts). O objeto Prisma
// bruto retornado antes desta RM incluía campos puramente internos
// (`usuario_id` redundante ao contexto de auth, `idempotency_key` e
// `hash_integridade` — mecanismo de integridade/dedup do servidor, sem
// valor para o cliente) — a resposta abaixo expõe explicitamente só os
// campos que o frontend precisa para reconstruir o histórico clínico
// real (incluindo `Prescricao.medicamentos`, a fonte de verdade da
// prescrição — nunca reconstituída a partir de outro lugar).
// ============================================================

interface DiagnosticoDetalheResponse {
  id: string;
  cid: string;
  descricao: string;
  confianca: number;
  selecionado: boolean;
  criado_em: Date;
}

interface PrescricaoDetalheResponse {
  id: string;
  status: string;
  /** Array real de `ItemMedicamentoDto` (molecula/dose estruturada/duração/observações) — nunca fabricado. */
  medicamentos: Prisma.JsonValue;
  orientacoes: string | null;
  validade_dias: number;
  diagnostico_id: string | null;
  criado_em: Date;
}

// RM-53 (RM41-023): o risco clínico calculado no frontend nunca era
// persistido nem recuperável — `salvarRiskScore` existia e já era testado
// isoladamente, mas (a) nada no fluxo real da consulta o invocava e (b)
// `buscarConsulta`/`mapConsultaDetalhe` nem sequer incluíam a relação
// `risco_scores`, então mesmo se o frontend passasse a chamar o endpoint,
// o dado nunca voltaria na recuperação do detalhe. Ambos os lados
// corrigidos juntos — persistir sem poder recuperar não fecha o risco.
interface RiscoScoreDetalheResponse {
  id: string;
  risco_global: string;
  score_global: number;
  alerta_vermelho: boolean;
  risco_cardiovascular: Prisma.JsonValue;
  risco_renal: Prisma.JsonValue;
  risco_hemorragico: Prisma.JsonValue;
  risco_farmacologico: Prisma.JsonValue;
  risco_interacao: Prisma.JsonValue;
  risco_terapeutico: Prisma.JsonValue;
  recomendacoes: string[];
  criado_em: Date;
}

export interface ConsultaDetalheResponse {
  id: string;
  status: string;
  anamnese: Prisma.JsonValue;
  criado_em: Date;
  atualizado_em: Date;
  diagnosticos: DiagnosticoDetalheResponse[];
  prescricoes: PrescricaoDetalheResponse[];
  risco_scores: RiscoScoreDetalheResponse[];
}

type ConsultaComRelacoes = {
  id: string;
  status: string;
  anamnese?: Prisma.JsonValue;
  criado_em?: Date;
  atualizado_em?: Date;
  diagnosticos?: {
    id: string;
    cid: string;
    descricao: string;
    confianca: number;
    selecionado: boolean;
    criado_em: Date;
  }[];
  prescricoes?: {
    id: string;
    status: string;
    medicamentos: Prisma.JsonValue;
    orientacoes: string | null;
    validade_dias: number;
    diagnostico_id: string | null;
    criado_em: Date;
  }[];
  risco_scores?: {
    id: string;
    risco_global: string;
    score_global: number;
    alerta_vermelho: boolean;
    risco_cardiovascular: Prisma.JsonValue;
    risco_renal: Prisma.JsonValue;
    risco_hemorragico: Prisma.JsonValue;
    risco_farmacologico: Prisma.JsonValue;
    risco_interacao: Prisma.JsonValue;
    risco_terapeutico: Prisma.JsonValue;
    recomendacoes: string[];
    criado_em: Date;
  }[];
};

function mapConsultaDetalhe(
  consulta: ConsultaComRelacoes,
): ConsultaDetalheResponse {
  return {
    id: consulta.id,
    status: consulta.status,
    anamnese: consulta.anamnese ?? null,
    criado_em: consulta.criado_em as Date,
    atualizado_em: consulta.atualizado_em as Date,
    diagnosticos: (consulta.diagnosticos ?? []).map((d) => ({
      id: d.id,
      cid: d.cid,
      descricao: d.descricao,
      confianca: d.confianca,
      selecionado: d.selecionado,
      criado_em: d.criado_em,
    })),
    prescricoes: (consulta.prescricoes ?? []).map((p) => ({
      id: p.id,
      status: p.status,
      medicamentos: p.medicamentos,
      orientacoes: p.orientacoes,
      validade_dias: p.validade_dias,
      diagnostico_id: p.diagnostico_id,
      criado_em: p.criado_em,
    })),
    risco_scores: (consulta.risco_scores ?? []).map((r) => ({
      id: r.id,
      risco_global: r.risco_global,
      score_global: r.score_global,
      alerta_vermelho: r.alerta_vermelho,
      risco_cardiovascular: r.risco_cardiovascular,
      risco_renal: r.risco_renal,
      risco_hemorragico: r.risco_hemorragico,
      risco_farmacologico: r.risco_farmacologico,
      risco_interacao: r.risco_interacao,
      risco_terapeutico: r.risco_terapeutico,
      recomendacoes: r.recomendacoes,
      criado_em: r.criado_em,
    })),
  };
}

@Injectable()
export class ConsultaService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private audit: AuditService,
    private config: ConfigService,
  ) {}

  // ── CONSULTA ──────────────────────────────────────────────

  /**
   * Integridade de persistência — idempotência: se `idempotency_key` já
   * existir para este usuário/escopo, retorna o registro já criado em vez
   * de criar um duplicado. Cobre retry de rede, timeout, duplo clique e
   * reenvio pela fila de sincronização do frontend. `existente` pertencer a
   * outro dono é tratado como erro (chave nunca deveria colidir entre
   * usuários — UUID gerado no cliente — mas nunca se confia nisso).
   */
  private async buscarPorIdempotencyKey<
    T extends { usuario_id?: string; consulta_id?: string },
  >(
    finder: (key: string) => Promise<T | null>,
    idempotencyKey: string | undefined,
    ownerCheck: (registro: T) => boolean,
  ): Promise<T | null> {
    if (!idempotencyKey) return null;
    const existente = await finder(idempotencyKey);
    if (!existente) return null;
    if (!ownerCheck(existente)) {
      throw new ForbiddenException(
        'Chave de idempotência já utilizada em outro escopo',
      );
    }
    return existente;
  }

  /**
   * Correção de bug real (auditoria de segurança final, PERSIST-01): o
   * fluxo de idempotência era "findUnique → se nulo, create", sem
   * proteção contra corrida — duas requisições genuinamente concorrentes
   * com a MESMA idempotency_key (retry automático, duplo clique) podiam
   * ambas passar pelo `findUnique` antes de qualquer `create` comitar; a
   * perdedora da corrida colidia com a constraint `@unique` do banco
   * (Prisma P2002) e recebia um 500 não tratado em vez do MESMO registro
   * já criado pela vencedora — quebrando exatamente a garantia de
   * "retry-safe" que a idempotency_key existe para prover. Agora, ao
   * detectar P2002 no `create`, busca e retorna o registro que a outra
   * requisição concorrente acabou de criar.
   */
  private async criarComIdempotenciaSobColisao<T>(
    criar: () => Promise<T>,
    buscarExistente: () => Promise<T | null>,
  ): Promise<T> {
    try {
      return await criar();
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const existente = await buscarExistente();
        if (existente) return existente;
      }
      throw e;
    }
  }

  /**
   * RM41-016/RM41-017/RM-49: fecha os dois achados críticos de auditoria
   * do RM-41 numa única primitiva reutilizável.
   *
   * (016) toda escrita clínica passada aqui SEMPRE grava um registro de
   * auditoria — não é mais possível persistir uma consulta/diagnóstico/
   * prescrição/risk score sem trilha, como acontecia antes em
   * `salvarRiskScore` (nenhuma chamada a `registrarAuditoria` existia).
   *
   * (017) a escrita clínica e a escrita de auditoria acontecem dentro do
   * MESMO `prisma.$transaction(async (tx) => ...)` — uma commita com a
   * outra, ou nenhuma das duas persiste. Isso resolve o gap real: antes,
   * uma falha do processo (crash, timeout de conexão) entre o `create` da
   * consulta e a chamada separada a `registrarAuditoria` deixava a
   * consulta permanentemente sem trilha de auditoria, sem qualquer sinal.
   *
   * Nota sobre o retry de idempotência: se `criar` colidir com a unique
   * constraint (P2002) — outra requisição concorrente com a MESMA
   * `idempotency_key` venceu a corrida — a transação inteira é abortada
   * (nada fica parcialmente persistido) e o registro do vencedor é
   * buscado FORA da transação (ele já está garantidamente commitado: em
   * Postgres, um conflito de unique constraint só é observável depois que
   * a transação concorrente que o causou termina). Não se tenta reutilizar
   * `tx` após um erro de constraint — Postgres aborta a transação inteira
   * no primeiro erro; qualquer comando adicional na mesma tx falharia com
   * "current transaction is aborted".
   */
  private async escreverComAuditoriaAtomica<T>(
    criar: (tx: Prisma.TransactionClient) => Promise<T>,
    montarAuditoria: (registro: T) => AuditoriaInput,
    buscarExistenteAposColisao: () => Promise<T | null>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const registro = await criar(tx);
        await this.audit.registrarAuditoria(montarAuditoria(registro), tx);
        return registro;
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const existente = await buscarExistenteAposColisao();
        if (existente) return existente;
      }
      throw e;
    }
  }

  async criarConsulta(dto: CriarConsultaDto, usuarioId: string) {
    const existente = await this.buscarPorIdempotencyKey(
      (key) =>
        this.prisma.consulta.findUnique({ where: { idempotency_key: key } }),
      dto.idempotency_key,
      (c) => c.usuario_id === usuarioId,
    );
    if (existente) return existente;

    let pacienteId: string | undefined;

    // Pseudonimização de CPF — CRÍTICO: o hash nunca é calculado pelo
    // cliente (um segredo HMAC não pode viver em código de navegador). O
    // CPF chega aqui em texto puro, só em memória, e é imediatamente
    // transformado em HMAC-SHA256 server-side. `dto.paciente_cpf` NUNCA é
    // persistido nem passado a `registrarAuditoria`/logger — só a variável
    // local `hashIdentidade` (irreversível sem a chave do servidor) toca o
    // banco.
    if (dto.paciente_cpf) {
      const hashIdentidade = hmacIdentifier(
        this.config,
        'cpf',
        dto.paciente_cpf,
      );
      const paciente = await this.prisma.paciente.upsert({
        where: { hash_identidade: hashIdentidade },
        create: {
          hash_identidade: hashIdentidade,
          idade: (dto.anamnese as { idade?: number })?.idade ?? 0,
          sexo: (dto.anamnese as { sexo?: string })?.sexo ?? 'M',
          comorbidades:
            (dto.anamnese as { comorbidades?: string[] })?.comorbidades ?? [],
        },
        update: {},
      });
      pacienteId = paciente.id;
    }

    return this.escreverComAuditoriaAtomica(
      (tx) =>
        tx.consulta.create({
          data: {
            usuario_id: usuarioId,
            paciente_id: pacienteId,
            anamnese: dto.anamnese as object,
            idempotency_key: dto.idempotency_key,
          },
        }),
      (consulta) => ({
        usuario_id: usuarioId,
        tipo: 'consulta_criada',
        acao: `Consulta ${consulta.id} criada`,
        recurso: `consulta:${consulta.id}`,
      }),
      () =>
        dto.idempotency_key
          ? this.prisma.consulta.findUnique({
              where: { idempotency_key: dto.idempotency_key },
            })
          : Promise.resolve(null),
    );
  }

  async listarConsultas(usuarioId: string, pagina = 1, limite = 20) {
    const skip = (pagina - 1) * limite;
    const [total, consultas] = await Promise.all([
      this.prisma.consulta.count({
        where: { usuario_id: usuarioId, deletado_em: null },
      }),
      this.prisma.consulta.findMany({
        where: { usuario_id: usuarioId, deletado_em: null },
        orderBy: { criado_em: 'desc' },
        skip,
        take: limite,
        include: {
          diagnosticos: { where: { selecionado: true }, take: 1 },
          prescricoes: { take: 1, select: { id: true, status: true } },
        },
      }),
    ]);
    return { total, pagina, limite, consultas };
  }

  async buscarConsulta(
    id: string,
    usuarioId: string,
  ): Promise<ConsultaDetalheResponse> {
    const consulta = await this.prisma.consulta.findFirst({
      where: { id, usuario_id: usuarioId, deletado_em: null },
      include: {
        diagnosticos: true,
        prescricoes: true,
        risco_scores: true,
      },
    });
    if (!consulta) throw new NotFoundException('Consulta não encontrada');
    return mapConsultaDetalhe(consulta);
  }

  // ── DIAGNÓSTICO ───────────────────────────────────────────

  async criarDiagnostico(dto: CriarDiagnosticoDto, usuarioId: string) {
    const consulta = await this.prisma.consulta.findFirst({
      where: { id: dto.consulta_id, usuario_id: usuarioId },
    });
    if (!consulta)
      throw new ForbiddenException('Consulta não pertence a este usuário');

    const existente = await this.buscarPorIdempotencyKey(
      (key) =>
        this.prisma.diagnostico.findUnique({ where: { idempotency_key: key } }),
      dto.idempotency_key,
      (d) => d.consulta_id === dto.consulta_id,
    );
    if (existente) return existente;

    return this.escreverComAuditoriaAtomica(
      (tx) =>
        tx.diagnostico.create({
          data: {
            consulta_id: dto.consulta_id,
            cid: dto.cid,
            descricao: dto.descricao,
            confianca: dto.confianca ?? 1.0,
            selecionado: dto.selecionado ?? false,
            idempotency_key: dto.idempotency_key,
          },
        }),
      (diagnostico) => ({
        usuario_id: usuarioId,
        tipo: 'diagnostico_selecionado',
        acao: `Diagnóstico ${dto.cid} registrado`,
        recurso: `diagnostico:${diagnostico.id}`,
        dados_entrada: { cid: dto.cid },
      }),
      () =>
        dto.idempotency_key
          ? this.prisma.diagnostico.findUnique({
              where: { idempotency_key: dto.idempotency_key },
            })
          : Promise.resolve(null),
    );
  }

  // ── PRESCRIÇÃO ────────────────────────────────────────────

  async criarPrescricao(dto: CriarPrescricaoDto, usuarioId: string) {
    const consulta = await this.prisma.consulta.findFirst({
      where: { id: dto.consulta_id, usuario_id: usuarioId },
    });
    if (!consulta) throw new ForbiddenException();

    // Integridade de persistência — CRÍTICO: uma prescrição nunca pode ser
    // duplicada por reenvio (retry de rede, timeout, fila de sincronização
    // do frontend, duplo clique). idempotency_key é gerada uma única vez no
    // cliente no momento em que o médico finaliza a prescrição e reutilizada
    // em toda tentativa subsequente da MESMA operação.
    const existente = await this.buscarPorIdempotencyKey(
      (key) =>
        this.prisma.prescricao.findUnique({ where: { idempotency_key: key } }),
      dto.idempotency_key,
      (p) => p.consulta_id === dto.consulta_id,
    );
    if (existente) return existente;

    // Correção de vulnerabilidade (auditoria de segurança final, OWN-01):
    // `dto.diagnostico_id` é opcional e vinha do cliente sem NENHUMA
    // verificação de que pertence à mesma consulta (e portanto ao mesmo
    // usuário) — só `dto.consulta_id` era checado. Como `Diagnostico.id` é
    // um cuid global (não escopado por consulta), qualquer id de
    // diagnóstico de OUTRO usuário obtido/adivinhado podia ser vinculado à
    // própria prescrição, quebrando a fronteira de tenant que o resto deste
    // método (corretamente) impõe. Mesmo padrão de ownership já usado para
    // `consulta_id` acima e para RiskScore abaixo.
    if (dto.diagnostico_id) {
      const diagnostico = await this.prisma.diagnostico.findFirst({
        where: { id: dto.diagnostico_id, consulta_id: dto.consulta_id },
      });
      if (!diagnostico) {
        throw new ForbiddenException(
          'Diagnóstico não pertence a esta consulta',
        );
      }
    }

    const hash = hashIntegridade({
      ...dto,
      usuario_id: usuarioId,
      ts: Date.now(),
    });

    return this.escreverComAuditoriaAtomica(
      (tx) =>
        tx.prescricao.create({
          data: {
            consulta_id: dto.consulta_id,
            diagnostico_id: dto.diagnostico_id,
            // `{...m}` (spread raso) preserva `dose` como instância de
            // DoseEstruturadaDto — estruturalmente idêntica a um objeto
            // plano em runtime, mas o TS não reconhece isso como
            // atribuível a Prisma.InputJsonValue. Round-trip via JSON
            // produz um objeto plano real, sem alterar o conteúdo.
            medicamentos: JSON.parse(
              JSON.stringify(dto.medicamentos),
            ) as Prisma.InputJsonValue,
            orientacoes: dto.orientacoes,
            validade_dias: dto.validade_dias ?? 30,
            hash_integridade: hash,
            idempotency_key: dto.idempotency_key,
          },
        }),
      (prescricao) => ({
        usuario_id: usuarioId,
        tipo: 'prescricao_gerada',
        acao: `Prescrição ${prescricao.id} gerada`,
        recurso: `prescricao:${prescricao.id}`,
        dados_entrada: { moleculas: dto.medicamentos.map((m) => m.molecula) },
      }),
      () =>
        dto.idempotency_key
          ? this.prisma.prescricao.findUnique({
              where: { idempotency_key: dto.idempotency_key },
            })
          : Promise.resolve(null),
    );
  }

  // ── RISK / TRUST ──────────────────────────────────────────

  /**
   * Correção de vulnerabilidade (IDOR / acesso horizontal indevido): este
   * método gravava um RiskScore em QUALQUER `consulta_id` informado pelo
   * cliente, sem verificar se a consulta pertence ao usuário autenticado —
   * diferente de `criarDiagnostico`/`criarPrescricao`, que já faziam essa
   * checagem de ownership corretamente. Um usuário autenticado conseguia
   * escrever um risk score na consulta de OUTRO usuário apenas conhecendo o
   * `consulta_id`. Corrigido para exigir a mesma checagem de propriedade.
   */
  async salvarRiskScore(
    consultaId: string,
    score: RiskScorePayloadDto,
    usuarioId: string,
    idempotencyKey?: string,
  ) {
    const consulta = await this.prisma.consulta.findFirst({
      where: { id: consultaId, usuario_id: usuarioId, deletado_em: null },
    });
    if (!consulta)
      throw new ForbiddenException('Consulta não pertence a este usuário');

    const existente = await this.buscarPorIdempotencyKey(
      (key) =>
        this.prisma.riskScore.findUnique({ where: { idempotency_key: key } }),
      idempotencyKey,
      (r) => r.consulta_id === consultaId,
    );
    if (existente) return existente;

    return this.escreverComAuditoriaAtomica(
      (tx) =>
        tx.riskScore.create({
          data: {
            consulta_id: consultaId,
            risco_global: score.risco_global,
            score_global: score.score_global,
            alerta_vermelho: score.alerta_vermelho ?? false,
            risco_cardiovascular: toJson(score.risco_cardiovascular),
            risco_renal: toJson(score.risco_renal),
            risco_hemorragico: toJson(score.risco_hemorragico),
            risco_farmacologico: toJson(score.risco_farmacologico),
            risco_interacao: toJson(score.risco_interacao),
            risco_terapeutico: toJson(score.risco_terapeutico),
            recomendacoes: score.recomendacoes_prioritarias ?? [],
            idempotency_key: idempotencyKey,
          },
        }),
      (risk) => ({
        usuario_id: usuarioId,
        tipo: 'risk_score_calculado',
        acao: `Risk score ${risk.id} gravado (global: ${score.risco_global})`,
        recurso: `risk_score:${risk.id}`,
        dados_entrada: { consulta_id: consultaId },
      }),
      () =>
        idempotencyKey
          ? this.prisma.riskScore.findUnique({
              where: { idempotency_key: idempotencyKey },
            })
          : Promise.resolve(null),
    );
  }

  // ── EVIDÊNCIAS ────────────────────────────────────────────

  async buscarEvidencias(cid: string) {
    const key = this.cache.key('evidence', cid);
    return this.cache.getOrSet(
      key,
      () =>
        this.prisma.evidencia.findMany({
          where: { cid },
          orderBy: [{ nivel_evidencia: 'asc' }, { ano: 'desc' }],
        }),
      TTL.EVIDENCE,
    );
  }

  async buscarRWE(cid: string) {
    const key = this.cache.key('rwe', cid);
    return this.cache.getOrSet(
      key,
      () =>
        this.prisma.rWE.findMany({
          where: { cid },
          orderBy: { criado_em: 'desc' },
        }),
      TTL.RWE,
    );
  }

  async buscarTimeline(usuarioId: string) {
    return this.prisma.consulta.findMany({
      where: { usuario_id: usuarioId, deletado_em: null },
      orderBy: { criado_em: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        criado_em: true,
        diagnosticos: {
          where: { selecionado: true },
          select: { cid: true, descricao: true },
        },
      },
    });
  }
}
