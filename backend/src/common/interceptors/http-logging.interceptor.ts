import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

// ============================================================
// PRESCREVE-AI — Auditoria de privacidade: log de aplicação
//
// REGRA ABSOLUTA, verificada nesta auditoria: este interceptor loga
// SOMENTE método, rota, status HTTP e duração — nunca o corpo da
// requisição/resposta, headers (Authorization inclusive), ou qualquer
// campo do payload. Isso é deliberado: o corpo de requisições deste
// backend pode conter senha, CPF, CRM, e conteúdo clínico (anamnese,
// medicamentos, diagnóstico) — nenhum desses pode chegar a um log de
// aplicação (diferente da tabela `Auditoria`, que é um registro
// estruturado e controlado, não um log solto de texto).
//
// Se este interceptor for estendido no futuro para incluir mais
// contexto, QUALQUER objeto estruturado deve passar por
// `common/logging/redact.util.ts` antes de chegar a `this.logger`.
// ============================================================

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<Response>();
          this.logger.log(
            `${method} ${url} ${res.statusCode} — ${Date.now() - now}ms`,
          );
        },
        error: (err: { status?: number }) => {
          const status = err?.status ?? 500;
          this.logger.error(
            `${method} ${url} ${status} — ${Date.now() - now}ms`,
          );
        },
      }),
    );
  }
}
