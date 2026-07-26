import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConsultaService } from './consulta.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ParseSafeIdPipe } from '../../common/pipes/parse-safe-id.pipe';
import {
  CriarConsultaDto,
  CriarDiagnosticoDto,
  CriarPrescricaoDto,
  SalvarRiscoDto,
  PaginacaoQueryDto,
} from './dto/consulta.dto';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class ConsultaController {
  constructor(private svc: ConsultaService) {}

  // ── Consulta ──────────────────────────────────────────────

  @Post('consulta')
  criarConsulta(
    @Body() dto: CriarConsultaDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.svc.criarConsulta(dto, user.id);
  }

  @Get('consultas')
  listarConsultas(
    @CurrentUser() user: { id: string },
    @Query() paginacao: PaginacaoQueryDto,
  ) {
    return this.svc.listarConsultas(
      user.id,
      paginacao.pagina ?? 1,
      paginacao.limite ?? 20,
    );
  }

  @Get('consulta/:id')
  buscarConsulta(
    @Param('id', ParseSafeIdPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.svc.buscarConsulta(id, user.id);
  }

  @Get('timeline')
  timeline(@CurrentUser() user: { id: string }) {
    return this.svc.buscarTimeline(user.id);
  }

  // ── Diagnóstico ───────────────────────────────────────────

  @Post('diagnostico')
  criarDiagnostico(
    @Body() dto: CriarDiagnosticoDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.svc.criarDiagnostico(dto, user.id);
  }

  // ── Prescrição ────────────────────────────────────────────

  @Post('prescricao')
  criarPrescricao(
    @Body() dto: CriarPrescricaoDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.svc.criarPrescricao(dto, user.id);
  }

  // ── Risco ─────────────────────────────────────────────────

  @Post('risco')
  @HttpCode(HttpStatus.OK)
  salvarRisco(
    @Body() body: SalvarRiscoDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.svc.salvarRiskScore(body.consulta_id, body.score, user.id);
  }

  // ── Evidências ────────────────────────────────────────────

  @Get('evidence/:cid')
  buscarEvidencias(@Param('cid', ParseSafeIdPipe) cid: string) {
    return this.svc.buscarEvidencias(cid);
  }

  @Get('rwe/:cid')
  buscarRWE(@Param('cid', ParseSafeIdPipe) cid: string) {
    return this.svc.buscarRWE(cid);
  }
}
