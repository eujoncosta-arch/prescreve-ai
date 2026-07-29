import { ConfigService } from '@nestjs/config';

// ============================================================
// PRESCREVE-AI — Inicialização determinística (auditoria RM-37)
//
// PROBLEMA: `PrismaService` construía seu adapter (`PrismaPg`) lendo
// `DATABASE_URL` diretamente do `process.env`, sem NENHUMA validação —
// se a variável estivesse ausente, `criarAdapter()` retornava
// `undefined` silenciosamente e o `PrismaClient` era instanciado sem
// adapter e sem qualquer URL de conexão. O app subia normalmente
// (health check passava) e só falhava, de forma confusa, na PRIMEIRA
// query real — o mesmo tipo de falha tardia e não determinística já
// corrigido para JWT_SECRET/MFA_ENCRYPTION_KEY/IDENTIFIER_HMAC_KEY
// (auditorias anteriores).
//
// CORREÇÃO: mesmo padrão fail-fast — valida no bootstrap (nunca numa
// requisição já em produção) que `DATABASE_URL` está presente e tem uma
// forma minimamente plausível de connection string PostgreSQL.
// ============================================================

export function validarDatabaseUrlConfigurada(config: ConfigService): void {
  const raw = config.get<string>('DATABASE_URL');
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      'Variável de ambiente DATABASE_URL não configurada — obrigatória para conectar ao PostgreSQL. ' +
        'Defina no .env (desenvolvimento) ou nas variáveis de ambiente do deploy (produção/Vercel). ' +
        'Ver README-DATABASE.md.',
    );
  }
  if (!/^postgres(ql)?:\/\//.test(raw.trim())) {
    throw new Error(
      'DATABASE_URL não parece ser uma connection string PostgreSQL válida — deve começar com "postgresql://" ou "postgres://".',
    );
  }
}
