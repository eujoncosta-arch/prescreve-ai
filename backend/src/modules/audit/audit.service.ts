import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoAuditoria } from '@prisma/client';
import * as crypto from 'crypto';

export interface AuditoriaInput {
  usuario_id?: string;
  crm_hash?: string;
  tipo: TipoAuditoria;
  acao: string;
  recurso?: string;
  dados_entrada?: Record<string, unknown>;
  dados_saida?: Record<string, unknown>;
  ip?: string;
  guideline_ref?: string;
  evidencia_ref?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async registrarAuditoria(input: AuditoriaInput) {
    const { ip, ...rest } = input;
    const ip_hash = ip ? crypto.createHash('sha256').update(ip).digest('hex') : undefined;

    const payload = JSON.stringify({ ...rest, ip_hash, timestamp: Date.now() });
    const hash_integridade = crypto.createHash('sha256').update(payload).digest('hex');

    return this.prisma.auditoria.create({
      data: {
        usuario_id: input.usuario_id,
        crm_hash: input.crm_hash,
        tipo: input.tipo,
        acao: input.acao,
        recurso: input.recurso,
        dados_entrada: input.dados_entrada as object,
        dados_saida: input.dados_saida as object,
        ip_hash,
        guideline_ref: input.guideline_ref,
        evidencia_ref: input.evidencia_ref,
        hash_integridade,
      },
    });
  }

  async buscarAuditoria(filtros: {
    usuario_id?: string;
    tipo?: TipoAuditoria;
    de?: Date;
    ate?: Date;
    pagina?: number;
    limite?: number;
  }) {
    const { pagina = 1, limite = 50, ...where } = filtros;
    const skip = (pagina - 1) * limite;

    const [total, registros] = await Promise.all([
      this.prisma.auditoria.count({ where }),
      this.prisma.auditoria.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limite,
        select: {
          id: true, tipo: true, acao: true, recurso: true,
          ip_hash: true, hash_integridade: true, timestamp: true,
          crm_hash: true, guideline_ref: true, evidencia_ref: true,
        },
      }),
    ]);

    return { total, pagina, limite, registros };
  }

  async exportarAuditoria(usuario_id: string, formato: 'json' | 'csv' = 'json') {
    const registros = await this.prisma.auditoria.findMany({
      where: { usuario_id },
      orderBy: { timestamp: 'desc' },
      take: 10000,
    });

    if (formato === 'json') return JSON.stringify(registros, null, 2);

    // CSV
    const header = 'id,tipo,acao,recurso,hash_integridade,timestamp';
    const rows = registros.map(r =>
      `${r.id},${r.tipo},${r.acao},${r.recurso ?? ''},${r.hash_integridade},${r.timestamp.toISOString()}`
    );
    return [header, ...rows].join('\n');
  }
}
