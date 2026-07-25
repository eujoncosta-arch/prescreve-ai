// Segredos de teste para os testes e2e — nunca usados fora do ambiente de
// teste. Necessário porque AuthService/JwtStrategy agora falham
// explicitamente (fail-fast) se JWT_SECRET/JWT_REFRESH_SECRET não estiverem
// definidos, em vez de usar um valor padrão hardcoded (correção de
// vulnerabilidade — ver src/auth/jwt-secrets.util.ts).
// >= 32 caracteres, entropia suficiente para passar em validarForcaDoSegredo()
// (ver src/auth/jwt-secrets.util.ts) — apenas para teste, nunca usados fora
// do ambiente de teste.
process.env.JWT_SECRET =
  process.env.JWT_SECRET ||
  'e2e-test-secret-abcdefghijklmnopqrstuvwxyz-0123456789';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  'e2e-test-refresh-secret-zyxwvutsrqponmlkjih-9876543210';
// 32 bytes em hex — apenas para teste (ver src/auth/mfa-crypto.util.ts).
process.env.MFA_ENCRYPTION_KEY =
  process.env.MFA_ENCRYPTION_KEY || 'b'.repeat(64);
