import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

class ReadinessException extends HttpException {
  constructor() {
    super(
      {
        status: 'error',
        database: 'down',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Liveness — "o processo Node está de pé?". Deliberadamente barato e sem
  // dependência externa (nunca falha por causa do banco) — usado por
  // orquestradores para decidir se o processo precisa ser reiniciado, não
  // se ele está pronto para tráfego real.
  @Get('health')
  getHealth(): object {
    return {
      status: 'ok',
      service: 'prescreve-ai-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  // Readiness — "o processo consegue de fato servir uma requisição real
  // hoje?". Gap de prontidão de produção fechado aqui: antes desta RM,
  // `/health` sempre respondia `status: 'ok'` mesmo com o Postgres
  // inacessível — um load balancer/orquestrador roteando por `/health`
  // continuaria mandando tráfego para uma instância que só consegue
  // devolver 500 em toda rota real. `SELECT 1` é a checagem de
  // conectividade mais barata que existe — não consulta nenhuma tabela de
  // domínio, só confirma que a conexão/pool está viva.
  @Get('health/ready')
  @HttpCode(HttpStatus.OK)
  async getReadiness(): Promise<{
    status: string;
    database: string;
    timestamp: string;
  }> {
    const timestamp = new Date().toISOString();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up', timestamp };
    } catch {
      // Nunca propaga o erro do driver (endereço/porta/credenciais do
      // banco) na resposta — só o status. Detalhe completo já vai para o
      // log via AllExceptionsFilter caso o erro escape, mas aqui é
      // capturado deliberadamente para responder 503 (não 500).
      throw new ReadinessException();
    }
  }
}
