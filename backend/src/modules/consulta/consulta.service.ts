import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, TTL } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import {
  CriarConsultaDto,
  CriarDiagnosticoDto,
  CriarPrescricaoDto,
  RiskScorePayloadDto,
} from './dto/consulta.dto';
import * as crypto from 'crypto';

function hashIntegridade(obj: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

function toJson(
  value: Record<string, unknown> | undefined,
): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

@Injectable()
export class ConsultaService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private audit: AuditService,
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

  async criarConsulta(dto: CriarConsultaDto, usuarioId: string) {
    const existente = await this.buscarPorIdempotencyKey(
      (key) =>
        this.prisma.consulta.findUnique({ where: { idempotency_key: key } }),
      dto.idempotency_key,
      (c) => c.usuario_id === usuarioId,
    );
    if (existente) return existente;

    let pacienteId: string | undefined;

    if (dto.paciente_hash) {
      const paciente = await this.prisma.paciente.upsert({
        where: { hash_identidade: dto.paciente_hash },
        create: {
          hash_identidade: dto.paciente_hash,
          idade: (dto.anamnese as { idade?: number })?.idade ?? 0,
          sexo: (dto.anamnese as { sexo?: string })?.sexo ?? 'M',
          comorbidades:
            (dto.anamnese as { comorbidades?: string[] })?.comorbidades ?? [],
        },
        update: {},
      });
      pacienteId = paciente.id;
    }

    const consulta = await this.prisma.consulta.create({
      data: {
        usuario_id: usuarioId,
        paciente_id: pacienteId,
        anamnese: dto.anamnese as object,
        idempotency_key: dto.idempotency_key,
      },
    });

    await this.audit.registrarAuditoria({
      usuario_id: usuarioId,
      tipo: 'consulta_criada',
      acao: `Consulta ${consulta.id} criada`,
      recurso: `consulta:${consulta.id}`,
    });

    return consulta;
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

  async buscarConsulta(id: string, usuarioId: string) {
    const consulta = await this.prisma.consulta.findFirst({
      where: { id, usuario_id: usuarioId, deletado_em: null },
      include: {
        diagnosticos: true,
        prescricoes: { include: { registros: true } },
        risco_scores: { take: 1, orderBy: { criado_em: 'desc' } },
        trust_scores: true,
      },
    });
    if (!consulta) throw new NotFoundException('Consulta não encontrada');
    return consulta;
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

    const diagnostico = await this.prisma.diagnostico.create({
      data: {
        consulta_id: dto.consulta_id,
        cid: dto.cid,
        descricao: dto.descricao,
        confianca: dto.confianca ?? 1.0,
        selecionado: dto.selecionado ?? false,
        idempotency_key: dto.idempotency_key,
      },
    });

    await this.audit.registrarAuditoria({
      usuario_id: usuarioId,
      tipo: 'diagnostico_selecionado',
      acao: `Diagnóstico ${dto.cid} registrado`,
      recurso: `diagnostico:${diagnostico.id}`,
      dados_entrada: { cid: dto.cid },
    });

    return diagnostico;
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

    const hash = hashIntegridade({
      ...dto,
      usuario_id: usuarioId,
      ts: Date.now(),
    });

    const prescricao = await this.prisma.prescricao.create({
      data: {
        consulta_id: dto.consulta_id,
        diagnostico_id: dto.diagnostico_id,
        medicamentos: dto.medicamentos.map((m) => ({ ...m })),
        orientacoes: dto.orientacoes,
        validade_dias: dto.validade_dias ?? 30,
        hash_integridade: hash,
        idempotency_key: dto.idempotency_key,
      },
    });

    await this.audit.registrarAuditoria({
      usuario_id: usuarioId,
      tipo: 'prescricao_gerada',
      acao: `Prescrição ${prescricao.id} gerada`,
      recurso: `prescricao:${prescricao.id}`,
      dados_entrada: { moleculas: dto.medicamentos.map((m) => m.molecula) },
    });

    return prescricao;
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

    return this.prisma.riskScore.create({
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
    });
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
