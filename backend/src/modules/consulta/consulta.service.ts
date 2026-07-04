import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService, TTL } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { CriarConsultaDto, CriarDiagnosticoDto, CriarPrescricaoDto } from './dto/consulta.dto';
import * as crypto from 'crypto';

function hashIntegridade(obj: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

@Injectable()
export class ConsultaService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private audit: AuditService,
  ) {}

  // ── CONSULTA ──────────────────────────────────────────────

  async criarConsulta(dto: CriarConsultaDto, usuarioId: string) {
    let pacienteId: string | undefined;

    if (dto.paciente_hash) {
      const paciente = await this.prisma.paciente.upsert({
        where: { hash_identidade: dto.paciente_hash },
        create: {
          hash_identidade: dto.paciente_hash,
          idade: (dto.anamnese as { idade?: number })?.idade ?? 0,
          sexo: (dto.anamnese as { sexo?: string })?.sexo ?? 'M',
          comorbidades: (dto.anamnese as { comorbidades?: string[] })?.comorbidades ?? [],
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
      this.prisma.consulta.count({ where: { usuario_id: usuarioId, deletado_em: null } }),
      this.prisma.consulta.findMany({
        where: { usuario_id: usuarioId, deletado_em: null },
        orderBy: { criado_em: 'desc' },
        skip, take: limite,
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
    if (!consulta) throw new ForbiddenException('Consulta não pertence a este usuário');

    const diagnostico = await this.prisma.diagnostico.create({
      data: {
        consulta_id: dto.consulta_id,
        cid: dto.cid,
        descricao: dto.descricao,
        confianca: dto.confianca ?? 1.0,
        selecionado: dto.selecionado ?? false,
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

    const hash = hashIntegridade({ ...dto, usuario_id: usuarioId, ts: Date.now() });

    const prescricao = await this.prisma.prescricao.create({
      data: {
        consulta_id: dto.consulta_id,
        diagnostico_id: dto.diagnostico_id,
        medicamentos: dto.medicamentos as object,
        orientacoes: dto.orientacoes,
        validade_dias: dto.validade_dias ?? 30,
        hash_integridade: hash,
      },
    });

    await this.audit.registrarAuditoria({
      usuario_id: usuarioId,
      tipo: 'prescricao_gerada',
      acao: `Prescrição ${prescricao.id} gerada`,
      recurso: `prescricao:${prescricao.id}`,
      dados_entrada: { moleculas: dto.medicamentos.map(m => m.molecula) },
    });

    return prescricao;
  }

  // ── RISK / TRUST ──────────────────────────────────────────

  async salvarRiskScore(consultaId: string, score: Record<string, unknown>, usuarioId: string) {
    return this.prisma.riskScore.create({
      data: {
        consulta_id: consultaId,
        risco_global: (score.risco_global as string) as 'baixo' | 'intermediario' | 'alto' | 'muito_alto' | 'critico',
        score_global: Number(score.score_global ?? 0),
        alerta_vermelho: Boolean(score.alerta_vermelho),
        risco_cardiovascular: (score.risco_cardiovascular ?? {}) as object,
        risco_renal: (score.risco_renal ?? {}) as object,
        risco_hemorragico: (score.risco_hemorragico ?? {}) as object,
        risco_farmacologico: (score.risco_farmacologico ?? {}) as object,
        risco_interacao: (score.risco_interacao ?? {}) as object,
        risco_terapeutico: (score.risco_terapeutico ?? {}) as object,
        recomendacoes: (score.recomendacoes_prioritarias as string[]) ?? [],
      },
    });
  }

  // ── EVIDÊNCIAS ────────────────────────────────────────────

  async buscarEvidencias(cid: string) {
    const key = this.cache.key('evidence', cid);
    return this.cache.getOrSet(
      key,
      () => this.prisma.evidencia.findMany({
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
      () => this.prisma.rWE.findMany({ where: { cid }, orderBy: { criado_em: 'desc' } }),
      TTL.RWE,
    );
  }

  async buscarTimeline(usuarioId: string) {
    return this.prisma.consulta.findMany({
      where: { usuario_id: usuarioId, deletado_em: null },
      orderBy: { criado_em: 'desc' },
      take: 50,
      select: {
        id: true, status: true, criado_em: true,
        diagnosticos: { where: { selecionado: true }, select: { cid: true, descricao: true } },
      },
    });
  }
}
