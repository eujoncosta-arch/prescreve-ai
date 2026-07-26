import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MigrarHistoricoDto } from './dto/migration.dto';
import * as crypto from 'crypto';

export interface MigracaoResult {
  prescricoes_migradas: number;
  validacoes_migradas: number;
  erros: string[];
  duracao_ms: number;
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async migrarHistorico(
    usuarioId: string,
    dados: MigrarHistoricoDto,
  ): Promise<MigracaoResult> {
    const inicio = Date.now();
    const erros: string[] = [];
    let prescricoes_migradas = 0;
    let validacoes_migradas = 0;

    // ── Cria uma consulta de migração agrupadora ─────────────
    const consulta = await this.prisma.consulta.create({
      data: {
        usuario_id: usuarioId,
        status: 'concluida',
        anamnese: {
          origem: 'migracao_localStorage',
          dados: (dados.consultas ?? []) as object[],
        },
      },
    });

    // ── Migrar prescrições ────────────────────────────────────
    //
    // Integridade de persistência — a migração é reexecutável (o frontend
    // pode reenviar o mesmo lote de localStorage após uma falha parcial ou
    // timeout). Correção de bug: o hash anterior incluía `ts: Date.now()`,
    // então o MESMO item de localStorage produzia um hash DIFERENTE a cada
    // chamada — nunca detectava re-migração, criando uma prescrição
    // duplicada por reenvio. O hash agora é estável (determinístico pelo
    // conteúdo) e uma `idempotency_key` (escopada por usuário + id local do
    // item, com fallback no próprio hash quando o item não tem id) é
    // checada antes de criar — reenviar o mesmo lote nunca duplica.
    for (const rx of dados.prescricoes ?? []) {
      try {
        const hash = crypto
          .createHash('sha256')
          .update(JSON.stringify(rx))
          .digest('hex');
        const idempotencyKey = `migracao:${usuarioId}:${rx.id ?? hash}`;

        const existente = await this.prisma.prescricao.findUnique({
          where: { idempotency_key: idempotencyKey },
        });
        if (existente) {
          continue; // já migrada em uma tentativa anterior — não duplica
        }

        await this.prisma.prescricao.create({
          data: {
            consulta_id: consulta.id,
            medicamentos: (rx.medicamentos as object) ?? [],
            orientacoes: rx.orientacoes,
            hash_integridade: hash,
            idempotency_key: idempotencyKey,
            status: 'finalizada',
          },
        });
        prescricoes_migradas++;
      } catch (e) {
        erros.push(`Prescrição ${rx.id ?? '?'}: ${(e as Error).message}`);
      }
    }

    // ── Migrar validações ────────────────────────────────────
    for (const val of dados.validacoes ?? []) {
      try {
        await this.prisma.medicalValidation.create({
          data: {
            validador_id: usuarioId,
            crm_hash: val.crm_hash ?? 'migracao',
            especialidade: val.especialidade ?? 'clinica_medica',
            veredicto: val.veredicto,
            justificativa: val.justificativa,
            status: 'aprovado',
          },
        });
        validacoes_migradas++;
      } catch (e) {
        erros.push(`Validação ${val.id ?? '?'}: ${(e as Error).message}`);
      }
    }

    const duracao_ms = Date.now() - inicio;

    await this.audit.registrarAuditoria({
      usuario_id: usuarioId,
      tipo: 'migracao',
      acao: `Migração localStorage: ${prescricoes_migradas} prescrições, ${validacoes_migradas} validações`,
      dados_saida: { prescricoes_migradas, validacoes_migradas, erros },
    });

    this.logger.log(
      `Migração concluída: ${prescricoes_migradas}rx, ${validacoes_migradas}val, ${erros.length} erros — ${duracao_ms}ms`,
    );

    return { prescricoes_migradas, validacoes_migradas, erros, duracao_ms };
  }

  async verificarStatusMigracao(usuarioId: string): Promise<{
    migrado: boolean;
    prescricoes: number;
    validacoes: number;
  }> {
    const [prescricoes, validacoes] = await Promise.all([
      this.prisma.prescricao.count({
        where: { consulta: { usuario_id: usuarioId } },
      }),
      this.prisma.medicalValidation.count({
        where: { validador_id: usuarioId },
      }),
    ]);
    return {
      migrado: prescricoes > 0 || validacoes > 0,
      prescricoes,
      validacoes,
    };
  }
}
