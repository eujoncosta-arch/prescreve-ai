-- RM-49 (RM41-016): novo valor de enum para permitir que `salvarRiskScore`
-- registre auditoria (antes ele não gravava trilha alguma para essa escrita
-- clínica — achado crítico RM41-016).
ALTER TYPE "TipoAuditoria" ADD VALUE 'risk_score_calculado';
