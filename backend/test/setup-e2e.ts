// Segredos de teste para os testes e2e — nunca usados fora do ambiente de
// teste. Necessário porque AuthService/JwtStrategy agora falham
// explicitamente (fail-fast) se JWT_SECRET/JWT_REFRESH_SECRET não estiverem
// definidos, em vez de usar um valor padrão hardcoded (correção de
// vulnerabilidade — ver src/auth/jwt-secrets.util.ts).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-secret';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'e2e-test-refresh-secret';
// 32 bytes em hex — apenas para teste (ver src/auth/mfa-crypto.util.ts).
process.env.MFA_ENCRYPTION_KEY =
  process.env.MFA_ENCRYPTION_KEY || 'b'.repeat(64);
