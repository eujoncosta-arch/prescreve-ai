import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  LoginDto,
  RegisterDto,
  CriarUsuarioPrivilegiadoDto,
} from './dto/login.dto';
import { Perfil, TipoAuditoria } from '@prisma/client';
import { getRequiredSecret } from './jwt-secrets.util';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// ── Hash utilities ─────────────────────────────────────────────

function hashSHA256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function djb2Hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) + h + s.charCodeAt(i);
    h |= 0;
  }
  return `H${Math.abs(h).toString(36).toUpperCase().padStart(8, '0')}`;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ── REGISTER (público) ───────────────────────────────────────
  //
  // REGRA DE SEGURANÇA (auditoria de autorização): o cadastro público NUNCA
  // aceita `perfil` do cliente. `RegisterDto` nem declara esse campo — e o
  // perfil é SEMPRE 'MEDICO' aqui, fixado no servidor. Perfis privilegiados
  // (ADMIN/AUDITOR/HOSPITAL/LABORATORIO) só podem ser criados via
  // `criarUsuarioPrivilegiado()`, chamado exclusivamente pelo endpoint
  // administrativo protegido por RolesGuard (@Roles(Perfil.ADMIN)).

  async register(dto: RegisterDto) {
    const existing = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const senha_hash = await bcrypt.hash(dto.senha, 12);
    const perfil: Perfil = 'MEDICO';

    const usuario = await this.prisma.usuario.create({
      data: {
        email: dto.email,
        senha_hash,
        perfil,
        ...(dto.crm && {
          medico: {
            create: {
              crm_hash: djb2Hash(dto.crm),
              especialidade: dto.especialidade ?? 'clinica_medica',
              uf: dto.uf ?? 'SP',
            },
          },
        }),
      },
      include: { medico: true },
    });

    return this.gerarTokens(usuario.id, usuario.email, usuario.perfil);
  }

  // ── CRIAÇÃO DE USUÁRIO PRIVILEGIADO (fluxo administrativo) ───
  //
  // Só é alcançável via POST /auth/admin/usuarios, protegido no controller
  // por JwtAuthGuard + RolesGuard + @Roles(Perfil.ADMIN) — um MEDICO comum
  // nunca chega a este método. `criadorId` vem do JWT do chamador
  // (@CurrentUser, nunca do payload) e é registrado na auditoria para
  // rastreabilidade de quem concedeu o privilégio.

  async criarUsuarioPrivilegiado(
    dto: CriarUsuarioPrivilegiadoDto,
    criadorId: string,
  ) {
    const existing = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const senha_hash = await bcrypt.hash(dto.senha, 12);

    const usuario = await this.prisma.usuario.create({
      data: {
        email: dto.email,
        senha_hash,
        perfil: dto.perfil,
        ...(dto.perfil === 'MEDICO' &&
          dto.crm && {
            medico: {
              create: {
                crm_hash: djb2Hash(dto.crm),
                especialidade: dto.especialidade ?? 'clinica_medica',
                uf: dto.uf ?? 'SP',
              },
            },
          }),
      },
      include: { medico: true },
    });

    await this.registrarAuditoria(
      criadorId,
      'criacao_usuario_privilegiado',
      `Usuário ${usuario.id} (${usuario.email}) criado com perfil ${usuario.perfil} por ${criadorId}`,
    );

    return {
      id: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
    };
  }

  // ── LOGIN ────────────────────────────────────────────────────

  async login(dto: LoginDto, ip?: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (!usuario || !usuario.ativo)
      throw new UnauthorizedException('Credenciais inválidas');

    const senhaValida = await bcrypt.compare(dto.senha, usuario.senha_hash);
    if (!senhaValida) {
      await this.registrarAuditoria(
        usuario.id,
        'login',
        'FALHA — senha incorreta',
        ip,
      );
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // MFA
    if (usuario.mfa_ativo && !dto.mfa_code) {
      throw new UnauthorizedException('Código MFA obrigatório');
    }

    await this.registrarAuditoria(usuario.id, 'login', 'SUCESSO', ip);
    return this.gerarTokens(usuario.id, usuario.email, usuario.perfil);
  }

  // ── REFRESH TOKEN ────────────────────────────────────────────

  async refresh(token: string) {
    const hash = hashSHA256(token);
    const rt = await this.prisma.refreshToken.findUnique({
      where: { token_hash: hash },
      include: { usuario: true },
    });

    if (!rt || rt.revogado || rt.expira_em < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    // Rotação: revogar o antigo
    await this.prisma.refreshToken.update({
      where: { id: rt.id },
      data: { revogado: true },
    });

    return this.gerarTokens(rt.usuario.id, rt.usuario.email, rt.usuario.perfil);
  }

  // ── LOGOUT ──────────────────────────────────────────────────

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { usuario_id: userId, revogado: false },
      data: { revogado: true },
    });
    return { message: 'Logout realizado com sucesso' };
  }

  // ── HELPERS ─────────────────────────────────────────────────

  private async gerarTokens(userId: string, email: string, perfil: Perfil) {
    const payload = { sub: userId, email, perfil };
    const secret = getRequiredSecret(this.config, 'JWT_SECRET');
    const refreshSecret = getRequiredSecret(this.config, 'JWT_REFRESH_SECRET');

    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(payload, { secret, expiresIn: '15m' }),
      this.jwt.signAsync(payload, { secret: refreshSecret, expiresIn: '7d' }),
    ]);

    // Salvar refresh token (hash)
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    await this.prisma.refreshToken.create({
      data: {
        token_hash: hashSHA256(refresh_token),
        usuario_id: userId,
        expira_em: expiry,
      },
    });

    return { access_token, refresh_token, perfil };
  }

  /**
   * Correção de bug pré-existente (auditoria de autorização): o campo `tipo`
   * gravado no banco estava hardcoded como 'login' independentemente do
   * argumento recebido — toda chamada (incluindo a nova auditoria de
   * criação de usuário privilegiado) era registrada como se fosse um
   * evento de login, corrompendo a trilha de auditoria. Corrigido para
   * persistir o `tipo` real recebido.
   */
  private async registrarAuditoria(
    userId: string,
    tipo: TipoAuditoria,
    acao: string,
    ip?: string,
  ) {
    const dados = JSON.stringify({ userId, tipo, acao });
    const hash = hashSHA256(dados + Date.now().toString());
    await this.prisma.auditoria.create({
      data: {
        usuario_id: userId,
        tipo,
        acao,
        ip_hash: ip ? hashSHA256(ip) : null,
        hash_integridade: hash,
      },
    });
  }
}
