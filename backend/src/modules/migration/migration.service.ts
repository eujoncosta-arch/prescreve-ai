import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as crypto from 'crypto';

// Tipos que espelham o localStorage do frontend

interface LocalPrescricao {
  id?: string;
  medicamentos?: unknown[];
  orientacoes?: string;
  diagnostico?: string;
  criado_em?: string;
}

interface LocalValidacao {
  id?: string;
  crm_hash?: string;
  especialidade?: string;
  veredicto?: string;
  justificativa?: string;
}

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
    dados: {
      prescricoes?: LocalPrescricao[];
      validacoes?: LocalValidacao[];
      consultas?: unknown[];
    },
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
        anamnese: { origem: 'migracao_localStorage', dados: (dados.consultas ?? []) as object[] },
      },
    });

    // ── Migrar prescrições ────────────────────────────────────
    for (const rx of dados.prescricoes ?? []) {
      try {
        const hash = crypto.createHash('sha256')
          .update(JSON.stringify({ ...rx, ts: Date.now() }))
          .digest('hex');

        await this.prisma.prescricao.create({
          data: {
            consulta_id: consulta.id,
            medicamentos: (rx.medicamentos as object) ?? [],
            orientacoes: rx.orientacoes,
            hash_integridade: hash,
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

    this.logger.log(`Migração concluída: ${prescricoes_migradas}rx, ${validacoes_migradas}val, ${erros.length} erros — ${duracao_ms}ms`);

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
      this.prisma.medicalValidation.count({ where: { validador_id: usuarioId } }),
    ]);
    return { migrado: prescricoes > 0 || validacoes > 0, prescricoes, validacoes };
  }
}
