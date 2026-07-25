import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MfaService } from './mfa.service';
import { MfaController } from './mfa.controller';
import { JwtStrategy } from './jwt.strategy';
import { getRequiredSecret } from './jwt-secrets.util';
import { AuditModule } from '../modules/audit/audit.module';

@Module({
  imports: [
    AuditModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // Sem fallback fixo — ver jwt-secrets.util.ts. AuthService.gerarTokens()
      // sempre passa `secret`/`refreshSecret` explicitamente por chamada; este
      // default de módulo só protege contra uso futuro de this.jwt.sign()/
      // verify() sem override explícito.
      useFactory: (config: ConfigService) => ({
        secret: getRequiredSecret(config, 'JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController, MfaController],
  providers: [AuthService, MfaService, JwtStrategy],
  exports: [AuthService, MfaService, JwtModule, PassportModule],
})
export class AuthModule {}
