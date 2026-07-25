import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, generateURI, verify } from 'otplib';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../modules/audit/audit.service';
import { encryptMfaSecret, decryptMfaSecret } from './mfa-crypto.util';
import type { Usuario } from '@prisma/client';

// ============================================================
// PRESCREVE-AI — MFA real (TOTP, RFC 6238)
//
// Substitui a validação anterior ("se mfa_code existe, aceitar") por
// verificação criptográfica real via TOTP (Time-based One-Time Password,
// RFC 6238 — compatível com Google Authenticator, Authy, 1Password etc.).
//
// FLUXO:
//   1) iniciarAtivacao()  → gera segredo (nunca exposto de novo depois
//      desta chamada), grava CRIPTOGRAFADO, mfa_ativo permanece false.
//   2) confirmarAtivacao() → exige um código TOTP válido gerado a partir
//      do segredo pendente; só então mfa_ativo vira true e os códigos de
//      recuperação são gerados (mostrados em texto puro apenas nesta
//      resposta — armazenados como hash bcrypt).
//   3) verificarCodigoLogin() → chamada pelo AuthService.login() quando
//      mfa_ativo=true; verifica o código TOTP real (com tolerância de
//      ±1 janela de 30s) OU um código de recuperação não utilizado.
//      Nunca aceita "qualquer código não vazio".
//   4) desativar() → exige reautenticação (senha + código MFA válido)
//      antes de desligar o MFA.
//
// BLOQUEIO: após MFA_MAX_FALHAS tentativas consecutivas malsucedidas,
// novas tentativas são recusadas por MFA_BLOQUEIO_MINUTOS sem sequer
// verificar o código enviado — mitigação de força bruta persistente por
// usuário (independente de rotação de IP).
// ============================================================

const TOTP_EPOCH_TOLERANCE_SEGUNDOS = 30; // ±1 janela de 30s (RFC 6238 usual)
const MFA_MAX_FALHAS = 5;
const MFA_BLOQUEIO_MINUTOS = 15;
const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BCRYPT_ROUNDS = 12;

export interface IniciarAtivacaoResult {
  otpauth_url: string;
  /** Segredo em Base32 para digitação manual — exposto APENAS nesta resposta, nunca mais. */
  secret_base32: string;
}

export interface ConfirmarAtivacaoResult {
  /** Códigos de recuperação em texto puro — exibidos UMA ÚNICA VEZ; apenas o hash é persistido. */
  recovery_codes: string[];
}

@Injectable()
export class MfaService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  // ── 1) INICIAR ATIVAÇÃO ───────────────────────────────────────

  async iniciarAtivacao(usuarioId: string): Promise<IniciarAtivacaoResult> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) throw new UnauthorizedException();
    if (usuario.mfa_ativo) {
      throw new ConflictException(
        'MFA já está ativo para este usuário — desative antes de reconfigurar.',
      );
    }

    const secret = generateSecret();
    const otpauth_url = generateURI({
      issuer: 'Prescreve-AI',
      label: usuario.email,
      secret,
    });

    const encrypted = encryptMfaSecret(this.config, secret);
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { mfa_secret: encrypted, mfa_ativo: false },
    });

    return { otpauth_url, secret_base32: secret };
  }

  // ── 2) CONFIRMAR ATIVAÇÃO ─────────────────────────────────────

  async confirmarAtivacao(
    usuarioId: string,
    code: string,
  ): Promise<ConfirmarAtivacaoResult> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) throw new UnauthorizedException();
    if (usuario.mfa_ativo) {
      throw new ConflictException('MFA já está ativo para este usuário.');
    }
    if (!usuario.mfa_secret) {
      throw new BadRequestException(
        'Nenhum enrollment de MFA pendente — chame /auth/mfa/setup primeiro.',
      );
    }

    const secret = decryptMfaSecret(this.config, usuario.mfa_secret);
    const resultado = await verify({
      secret,
      token: code,
      epochTolerance: TOTP_EPOCH_TOLERANCE_SEGUNDOS,
    });

    if (!resultado.valid) {
      await this.audit.registrarAuditoria({
        usuario_id: usuarioId,
        tipo: 'mfa_verificacao_falha',
        acao: 'Confirmação de ativação de MFA com código TOTP inválido',
      });
      throw new UnauthorizedException(
        'Código MFA inválido — verifique o aplicativo autenticador e tente novamente.',
      );
    }

    const recoveryCodesPlain = this.gerarCodigosRecuperacaoTexto();
    const hashes = await Promise.all(
      recoveryCodesPlain.map((c) =>
        bcrypt.hash(c, RECOVERY_CODE_BCRYPT_ROUNDS),
      ),
    );

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuarioId },
        data: {
          mfa_ativo: true,
          mfa_falhas_consecutivas: 0,
          mfa_bloqueado_ate: null,
        },
      }),
      this.prisma.mfaRecoveryCode.createMany({
        data: hashes.map((code_hash) => ({ usuario_id: usuarioId, code_hash })),
      }),
    ]);

    await this.audit.registrarAuditoria({
      usuario_id: usuarioId,
      tipo: 'mfa_ativado',
      acao: 'MFA (TOTP) ativado com sucesso',
    });

    return { recovery_codes: recoveryCodesPlain };
  }

  // ── 3) VERIFICAÇÃO NO LOGIN (E NA DESATIVAÇÃO) ───────────────

  /**
   * Verifica um código MFA (TOTP real OU código de recuperação de uso único)
   * para um usuário já autenticado por senha. Lança UnauthorizedException em
   * qualquer falha — NUNCA aceita um código apenas por estar presente.
   */
  async verificarCodigoLogin(usuario: Usuario, code: string): Promise<void> {
    if (!code || code.trim().length === 0) {
      throw new UnauthorizedException('Código MFA obrigatório');
    }
    if (!usuario.mfa_secret) {
      // mfa_ativo=true sem mfa_secret é um estado inconsistente — nunca deve
      // ocorrer, mas se ocorrer, falha fechada (nunca permite login).
      throw new UnauthorizedException(
        'Configuração de MFA inconsistente — contate o suporte.',
      );
    }

    if (usuario.mfa_bloqueado_ate && usuario.mfa_bloqueado_ate > new Date()) {
      throw new UnauthorizedException(
        'Muitas tentativas de MFA inválidas — tente novamente mais tarde.',
      );
    }

    const secret = decryptMfaSecret(this.config, usuario.mfa_secret);
    // Falha fechada: qualquer erro inesperado na verificação TOTP (ex.: token
    // em formato não numérico, como um código de recuperação) é tratado como
    // "não é um TOTP válido" — nunca propaga uma exceção não tratada que
    // poderia, por outro bug, ser interpretada como sucesso.
    const totpValido = await verify({
      secret,
      token: code,
      epochTolerance: TOTP_EPOCH_TOLERANCE_SEGUNDOS,
    })
      .then((r) => r.valid)
      .catch(() => false);

    if (totpValido) {
      await this.resetarFalhas(usuario.id);
      return;
    }

    if (await this.tentarConsumirCodigoRecuperacao(usuario.id, code)) {
      await this.resetarFalhas(usuario.id);
      await this.audit.registrarAuditoria({
        usuario_id: usuario.id,
        tipo: 'mfa_recovery_usado',
        acao: 'Login realizado com código de recuperação MFA (uso único consumido)',
      });
      return;
    }

    await this.registrarFalha(usuario.id);
    throw new UnauthorizedException('Código MFA inválido');
  }

  // ── 4) DESATIVAÇÃO (COM REAUTENTICAÇÃO) ──────────────────────

  async desativar(
    usuarioId: string,
    senhaAtual: string,
    code: string,
  ): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) throw new UnauthorizedException();
    if (!usuario.mfa_ativo) {
      throw new BadRequestException('MFA não está ativo para este usuário.');
    }

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha_hash);
    if (!senhaValida) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }

    // Reaproveita a MESMA verificação criptográfica real do login — nunca um
    // caminho "mais fraco" só porque é a rota de desativação.
    await this.verificarCodigoLogin(usuario, code);

    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: usuarioId },
        data: {
          mfa_ativo: false,
          mfa_secret: null,
          mfa_falhas_consecutivas: 0,
          mfa_bloqueado_ate: null,
        },
      }),
      this.prisma.mfaRecoveryCode.deleteMany({
        where: { usuario_id: usuarioId },
      }),
    ]);

    await this.audit.registrarAuditoria({
      usuario_id: usuarioId,
      tipo: 'mfa_desativado',
      acao: 'MFA desativado após reautenticação (senha + código MFA)',
    });
  }

  // ── HELPERS ───────────────────────────────────────────────────

  private gerarCodigosRecuperacaoTexto(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
      const raw = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 chars hex
      return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
    });
  }

  private async tentarConsumirCodigoRecuperacao(
    usuarioId: string,
    code: string,
  ): Promise<boolean> {
    const candidatos = await this.prisma.mfaRecoveryCode.findMany({
      where: { usuario_id: usuarioId, usado: false },
    });

    for (const candidato of candidatos) {
      const confere = await bcrypt.compare(code, candidato.code_hash);
      if (confere) {
        // updateMany com filtro usado:false previne corrida (dupla utilização concorrente do mesmo código).
        const atualizado = await this.prisma.mfaRecoveryCode.updateMany({
          where: { id: candidato.id, usado: false },
          data: { usado: true, usado_em: new Date() },
        });
        if (atualizado.count === 1) return true;
      }
    }
    return false;
  }

  private async resetarFalhas(usuarioId: string): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { mfa_falhas_consecutivas: 0, mfa_bloqueado_ate: null },
    });
  }

  private async registrarFalha(usuarioId: string): Promise<void> {
    const usuario = await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { mfa_falhas_consecutivas: { increment: 1 } },
    });

    await this.audit.registrarAuditoria({
      usuario_id: usuarioId,
      tipo: 'mfa_verificacao_falha',
      acao: `Código MFA inválido (falha ${usuario.mfa_falhas_consecutivas}/${MFA_MAX_FALHAS})`,
    });

    if (usuario.mfa_falhas_consecutivas >= MFA_MAX_FALHAS) {
      const bloqueado_ate = new Date(
        Date.now() + MFA_BLOQUEIO_MINUTOS * 60_000,
      );
      await this.prisma.usuario.update({
        where: { id: usuarioId },
        data: { mfa_bloqueado_ate: bloqueado_ate },
      });
      await this.audit.registrarAuditoria({
        usuario_id: usuarioId,
        tipo: 'mfa_bloqueado',
        acao: `MFA bloqueado por ${MFA_BLOQUEIO_MINUTOS} minutos após ${MFA_MAX_FALHAS} falhas consecutivas`,
      });
    }
  }
}
