import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

// ============================================================
// PRESCREVE-AI — Filtro global de exceções (produção)
//
// GAP DE PRONTIDÃO DE PRODUÇÃO fechado aqui: antes desta RM, não havia
// nenhum `ExceptionFilter` global — erros inesperados (bug de programação,
// erro de driver do Postgres não tratado localmente, etc.) caíam no
// tratamento padrão do Nest, cujo formato de resposta e conteúdo NÃO são
// controlados explicitamente por este app. Um erro inesperado podia
// devolver `err.message`/stack trace do Node ao cliente, dependendo do
// tipo de exceção — um vazamento real de detalhe interno em produção.
//
// REGRA: `HttpException` (e suas subclasses — `NotFoundException`,
// `ForbiddenException`, os erros do `ValidationPipe`, etc.) são exceções
// DELIBERADAS já lançadas pelo próprio código com uma mensagem pensada
// para o cliente — passam adiante inalteradas. QUALQUER OUTRA coisa (erro
// não previsto) nunca expõe `.message`/stack ao cliente: vira sempre um
// 500 genérico, com o detalhe completo (redigido) só no log do servidor.
// ============================================================

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const message =
        typeof raw === 'string'
          ? raw
          : ((raw as { message?: string | string[] })?.message ??
            exception.message);
      const body: ErrorResponseBody = {
        statusCode: status,
        message,
        path: request.url,
        timestamp,
      };
      response.status(status).json(body);
      return;
    }

    // Erro não previsto — nunca vaza `.message`/stack ao cliente. O
    // detalhe completo vai só para o log do servidor (nunca para a
    // resposta HTTP), seguindo a mesma regra de `HttpLoggingInterceptor`:
    // nenhum corpo/campo de payload do request é logado aqui, só a rota e
    // a mensagem do erro em si (que é uma string de erro de sistema, não
    // dado clínico/paciente).
    const err =
      exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(
      `${request.method} ${request.url} — exceção não tratada: ${err.message}`,
      err.stack,
    );

    const body: ErrorResponseBody = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        'Erro interno do servidor. Tente novamente ou contate o suporte.',
      path: request.url,
      timestamp,
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
