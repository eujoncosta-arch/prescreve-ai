import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { MigrarHistoricoDto } from './dto/migration.dto';

@Controller('api/migration')
@UseGuards(JwtAuthGuard)
export class MigrationController {
  constructor(private svc: MigrationService) {}

  @Post()
  migrar(
    @Body() dados: MigrarHistoricoDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.svc.migrarHistorico(user.id, dados);
  }

  @Get('status')
  status(@CurrentUser() user: { id: string }) {
    return this.svc.verificarStatusMigracao(user.id);
  }
}
