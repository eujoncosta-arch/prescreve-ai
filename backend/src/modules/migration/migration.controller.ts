import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('api/migration')
@UseGuards(JwtAuthGuard)
export class MigrationController {
  constructor(private svc: MigrationService) {}

  @Post()
  migrar(
    @Body() dados: { prescricoes?: unknown[]; validacoes?: unknown[]; consultas?: unknown[] },
    @CurrentUser() user: { id: string },
  ) {
    return this.svc.migrarHistorico(user.id, dados as Parameters<MigrationService['migrarHistorico']>[1]);
  }

  @Get('status')
  status(@CurrentUser() user: { id: string }) {
    return this.svc.verificarStatusMigracao(user.id);
  }
}
