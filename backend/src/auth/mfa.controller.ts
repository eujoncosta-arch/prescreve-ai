import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AtivarMfaDto, DesativarMfaDto } from './dto/mfa.dto';

// Rate limit próprio, mais restritivo que o padrão global — mitiga força
// bruta de código TOTP (espaço de 6 dígitos) diretamente na camada HTTP,
// em complemento ao bloqueio persistente por usuário (MfaService).
const MFA_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth/mfa')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(private mfa: MfaService) {}

  @Post('setup')
  @Throttle(MFA_THROTTLE)
  iniciarAtivacao(@CurrentUser() user: { id: string }) {
    return this.mfa.iniciarAtivacao(user.id);
  }

  @Post('ativar')
  @Throttle(MFA_THROTTLE)
  @HttpCode(HttpStatus.OK)
  confirmarAtivacao(
    @Body() dto: AtivarMfaDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.mfa.confirmarAtivacao(user.id, dto.code);
  }

  @Post('desativar')
  @Throttle(MFA_THROTTLE)
  @HttpCode(HttpStatus.OK)
  async desativar(
    @Body() dto: DesativarMfaDto,
    @CurrentUser() user: { id: string },
  ) {
    await this.mfa.desativar(user.id, dto.senha, dto.code);
    return { message: 'MFA desativado com sucesso' };
  }
}
