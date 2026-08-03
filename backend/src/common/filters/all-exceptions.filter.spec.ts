import {
  ArgumentsHost,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function buildHost(url = '/api/backend/consultas/123') {
  const json = jest.fn<void, [Record<string, unknown>]>();
  const status = jest.fn(() => ({ json }));
  const response = { status } as unknown;
  const request = { url, method: 'GET' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter — produção nunca vaza detalhe interno de erro não previsto', () => {
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // O filtro loga via Nest Logger — silenciado no output do teste, mas
    // verificado (chamado) para garantir que o erro real não desaparece
    // silenciosamente do lado do servidor.
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  it('HttpException (ex.: NotFoundException) passa adiante inalterada — status e mensagem originais preservados', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = buildHost();

    filter.catch(new NotFoundException('Consulta não encontrada'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Consulta não encontrada',
      }),
    );
  });

  it('ForbiddenException preserva status 403 e mensagem original (nunca rebaixado a 500 genérico)', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = buildHost();

    filter.catch(new ForbiddenException('Sem permissão'), host);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'Sem permissão' }),
    );
  });

  it('erro NÃO previsto (Error genérico — ex.: bug de programação) vira 500 com mensagem GENÉRICA — NUNCA expõe err.message/stack ao cliente', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = buildHost();

    filter.catch(
      new Error('cannot read property "x" of undefined (detalhe interno)'),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0] as { message: string };
    expect(body.message).not.toContain('cannot read property');
    expect(body.message).not.toContain('undefined');
    expect(typeof body.message).toBe('string');
  });

  it('erro não previsto ainda assim é logado server-side (detalhe não desaparece, só não vaza ao cliente)', () => {
    const filter = new AllExceptionsFilter();
    const { host } = buildHost();

    filter.catch(new Error('falha real de infraestrutura'), host);

    expect(loggerErrorSpy).toHaveBeenCalled();
    const [mensagemLogada] = loggerErrorSpy.mock.calls[0] as [string];
    expect(mensagemLogada).toContain('falha real de infraestrutura');
  });

  it('valor lançado que NÃO é uma instância de Error (ex.: string/objeto solto) ainda produz um 500 sanitizado, nunca quebra o próprio filtro', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = buildHost();

    expect(() =>
      filter.catch('string solta lançada por engano', host),
    ).not.toThrow();
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalled();
  });

  it('corpo da resposta sempre inclui path e timestamp rastreáveis, mesmo no caminho de erro genérico', () => {
    const filter = new AllExceptionsFilter();
    const { host, json } = buildHost('/api/backend/rwe/I10');

    filter.catch(new Error('erro qualquer'), host);

    const body = json.mock.calls[0][0] as { path: string; timestamp: string };
    expect(body.path).toBe('/api/backend/rwe/I10');
    expect(new Date(body.timestamp).toString()).not.toBe('Invalid Date');
  });
});
