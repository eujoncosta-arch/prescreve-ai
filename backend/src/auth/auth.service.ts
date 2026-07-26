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
import { hmacIdentifier } from '../common/crypto/identifier-hash.util';
import { MfaService } from './mfa.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// ── Hash utilities ─────────────────────────────────────────────
//
// Auditoria de privacidade — CRM: hash NÃO CRIPTOGRÁFICO (`djb2Hash`,
// removido) foi substituído por HMAC-SHA256 com segredo server-side
// (`hmacIdentifier`, ver common/crypto/identifier-hash.util.ts). IP: idem,
// SHA-256 sem segredo trocado por HMAC (IPv4 tem só 2^32 valores — um
// rainbow table completo é trivial sem uma chave). Refresh token: continua
// SHA-256 simples DE PROPÓSITO — é o hash de um segredo aleatório de alta
// entropia (~256 bits) gerado pelo próprio servidor, não um identificador
// pessoal de baixa entropia; HMAC não traria proteção adicional aqui.
function hashSHA256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mfa: MfaService,
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
              crm_hash: hmacIdentifier(this.config, 'crm', dto.crm),
              especialidade: dto.especialidade ?? 'clinica_medica',
              uf: dto.uf ?? 'SP',
            },
          },
        }),
      },
      // Minimização de dados: `medico`/`senha_hash` nunca são usados após
      // a criação — não faz sentido trazê-los do banco para a memória do
      // processo só para descartá-los.
      select: { id: true, email: true, perfil: true },
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
                crm_hash: hmacIdentifier(this.config, 'crm', dto.crm),
                especialidade: dto.especialidade ?? 'clinica_medica',
                uf: dto.uf ?? 'SP',
              },
            },
          }),
      },
      select: { id: true, email: true, perfil: true },
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

    // MFA — verificação criptográfica REAL (TOTP/RFC 6238 ou código de
    // recuperação de uso único), nunca "código presente = aceitar".
    // MfaService.verificarCodigoLogin() lança UnauthorizedException em
    // qualquer caso de falha (ausente, inválido, expirado, bloqueado).
    if (usuario.mfa_ativo) {
      try {
        await this.mfa.verificarCodigoLogin(usuario, dto.mfa_code ?? '');
      } catch (e) {
        await this.registrarAuditoria(
          usuario.id,
          'login',
          'FALHA — MFA inválido',
          ip,
        );
        throw e;
      }
    }

    await this.registrarAuditoria(usuario.id, 'login', 'SUCESSO', ip);
    return this.gerarTokens(usuario.id, usuario.email, usuario.perfil);
  }

  // ── REFRESH TOKEN ────────────────────────────────────────────
  //
  // Hardening de infraestrutura — detecção de REUSO: um refresh token só
  // pode ser apresentado uma vez (rotação obrigatória a cada uso). Se um
  // token JÁ REVOGADO (seja por rotação anterior ou por logout explícito)
  // for apresentado novamente, isso é tratado como sinal de possível
  // comprometimento (token roubado sendo reproduzido) — TODAS as sessões
  // ativas do usuário são revogadas imediatamente, forçando novo login em
  // todos os dispositivos, e o evento é auditado.

  async refresh(token: string, ip?: string) {
    const hash = hashSHA256(token);
    const rt = await this.prisma.refreshToken.findUnique({
      where: { token_hash: hash },
      // Minimização de dados: só id/email/perfil do usuário são usados
      // abaixo — nunca senha_hash/mfa_secret precisam sair do banco aqui.
      select: {
        id: true,
        usuario_id: true,
        revogado: true,
        expira_em: true,
        usuario: { select: { id: true, email: true, perfil: true } },
      },
    });

    if (!rt) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    if (rt.revogado) {
      await this.prisma.refreshToken.updateMany({
        where: { usuario_id: rt.usuario_id, revogado: false },
        data: { revogado: true },
      });
      await this.registrarAuditoria(
        rt.usuario_id,
        'acesso_negado',
        'Reuso de refresh token já revogado detectado — todas as sessões do usuário foram revogadas por precaução',
        ip,
      );
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    if (rt.expira_em < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    // Rotação: revogar o antigo antes de emitir o novo par de tokens.
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

  /**
   * Bug real encontrado ao escrever a suíte de regressão de segurança
   * (auth-flows.e2e-spec.ts): sem um `jti` (identificador único por
   * token), dois tokens emitidos para o MESMO usuário dentro do MESMO
   * segundo (`iat` do JWT tem granularidade de segundos) são
   * byte-a-byte IDÊNTICOS — mesmo header, payload e assinatura. Como
   * `RefreshToken.token_hash` é `@unique` no schema, dois logins/refreshes
   * rápidos o suficiente (ex.: duplo clique, retry automático) podiam
   * colidir e o segundo `create()` falhar com violação de unicidade em
   * produção. `jti` aleatório garante que cada token emitido é sempre
   * único, mesmo no mesmo segundo, para o mesmo usuário.
   */
  private async gerarTokens(userId: string, email: string, perfil: Perfil) {
    const jti = crypto.randomUUID();
    const payload = { sub: userId, email, perfil, jti };
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
        ip_hash: ip ? hmacIdentifier(this.config, 'ip', ip) : null,
        hash_integridade: hash,
      },
    });
  }
}
