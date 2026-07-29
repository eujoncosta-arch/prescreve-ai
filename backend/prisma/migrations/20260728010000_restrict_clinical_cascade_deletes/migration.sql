-- RM-52 (RM41-018/RM41-019): a cadeia clínica (Diagnostico/Prescricao/
-- RiskScore/MedicalTrust/GuidelineConflict/RecommendationRegistry) cascateava
-- de Consulta/Diagnostico/Prescricao — um hard-delete futuro destruiria
-- silenciosamente todo o histórico clínico e de auditoria associado,
-- inconsistente com o soft-delete (`deletado_em`) já adotado no schema.
-- MedicalValidation.prescricao_id usava o padrão implícito SetNull, o que
-- órfãa silenciosamente o registro de validação médica. Trocado para
-- RESTRICT em todos os 7 casos — não há hoje nenhum endpoint de hard-delete,
-- então esta migration não altera nenhum comportamento em produção, apenas
-- fecha a mina de schema para o futuro.

ALTER TABLE "diagnosticos" DROP CONSTRAINT "diagnosticos_consulta_id_fkey";
ALTER TABLE "diagnosticos" ADD CONSTRAINT "diagnosticos_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "prescricoes" DROP CONSTRAINT "prescricoes_consulta_id_fkey";
ALTER TABLE "prescricoes" ADD CONSTRAINT "prescricoes_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "risk_scores" DROP CONSTRAINT "risk_scores_consulta_id_fkey";
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "medical_trust" DROP CONSTRAINT "medical_trust_consulta_id_fkey";
ALTER TABLE "medical_trust" ADD CONSTRAINT "medical_trust_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "guideline_conflicts" DROP CONSTRAINT "guideline_conflicts_diagnostico_id_fkey";
ALTER TABLE "guideline_conflicts" ADD CONSTRAINT "guideline_conflicts_diagnostico_id_fkey" FOREIGN KEY ("diagnostico_id") REFERENCES "diagnosticos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "recommendation_registry" DROP CONSTRAINT "recommendation_registry_prescricao_id_fkey";
ALTER TABLE "recommendation_registry" ADD CONSTRAINT "recommendation_registry_prescricao_id_fkey" FOREIGN KEY ("prescricao_id") REFERENCES "prescricoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "medical_validations" DROP CONSTRAINT "medical_validations_prescricao_id_fkey";
ALTER TABLE "medical_validations" ADD CONSTRAINT "medical_validations_prescricao_id_fkey" FOREIGN KEY ("prescricao_id") REFERENCES "prescricoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
