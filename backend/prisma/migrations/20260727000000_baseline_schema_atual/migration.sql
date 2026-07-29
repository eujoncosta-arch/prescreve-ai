-- ============================================================
-- PRESCREVE-AI — Migração BASELINE (RM-37)
--
-- Este arquivo NÃO é uma alteração de schema — é uma FOTOGRAFIA do schema
-- que já estava em produção (Neon), aplicado historicamente via
-- `prisma db push` (sem migrations versionadas até agora). Gerado com:
--
--   npx prisma migrate diff --from-empty --to-schema=prisma/schema.prisma --script
--
-- ANTES de rodar `prisma migrate deploy` pela primeira vez contra o banco
-- de produção existente, esta migração deve ser marcada como JÁ APLICADA
-- (nunca executada de fato — as tabelas já existem):
--
--   npx prisma migrate resolve --applied 20260727000000_baseline_schema_atual
--
-- Rodar este SQL diretamente (via `migrate deploy` comum) em um banco que
-- JÁ TEM essas tabelas falhará (CREATE TABLE em objeto existente) — esse
-- é o comportamento esperado e correto: `migrate resolve --applied` é o
-- procedimento de baseline oficial do Prisma para adotar migrations em
-- um banco pré-existente, documentado em README-DATABASE.md.
--
-- Em um banco NOVO/VAZIO (ambiente local, CI, banco de teste), este
-- arquivo É a migração real — `prisma migrate deploy` a aplica
-- normalmente, criando o schema completo do zero.
-- ============================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('MEDICO', 'ADMIN', 'LABORATORIO', 'HOSPITAL', 'AUDITOR');

-- CreateEnum
CREATE TYPE "NivelRisco" AS ENUM ('baixo', 'intermediario', 'alto', 'muito_alto', 'critico');

-- CreateEnum
CREATE TYPE "StatusConsulta" AS ENUM ('em_andamento', 'concluida', 'cancelada');

-- CreateEnum
CREATE TYPE "StatusPrescricao" AS ENUM ('rascunho', 'finalizada', 'enviada', 'dispensada', 'cancelada');

-- CreateEnum
CREATE TYPE "NivelEvidencia" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "TipoAuditoria" AS ENUM ('login', 'consulta_criada', 'diagnostico_selecionado', 'prescricao_gerada', 'prescricao_enviada', 'validacao_medica', 'acesso_negado', 'dados_exportados', 'migracao', 'criacao_usuario_privilegiado', 'mfa_ativado', 'mfa_desativado', 'mfa_verificacao_falha', 'mfa_recovery_usado', 'mfa_bloqueado');

-- CreateEnum
CREATE TYPE "StatusValidacao" AS ENUM ('pendente', 'aprovado', 'rejeitado', 'modificado');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'MEDICO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "mfa_secret" TEXT,
    "mfa_ativo" BOOLEAN NOT NULL DEFAULT false,
    "mfa_falhas_consecutivas" INTEGER NOT NULL DEFAULT 0,
    "mfa_bloqueado_ate" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "deletado_em" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_recovery_codes" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "usado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "crm_hash" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "nome_social" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratorios" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "cnpj_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laboratorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospitais" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "cnpj_hash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "porte" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospitais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pacientes" (
    "id" TEXT NOT NULL,
    "hash_identidade" TEXT NOT NULL,
    "idade" INTEGER NOT NULL,
    "sexo" TEXT NOT NULL,
    "peso_kg" DOUBLE PRECISION,
    "altura_cm" DOUBLE PRECISION,
    "comorbidades" TEXT[],
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "deletado_em" TIMESTAMP(3),

    CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "paciente_id" TEXT,
    "status" "StatusConsulta" NOT NULL DEFAULT 'em_andamento',
    "anamnese" JSONB,
    "idempotency_key" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "deletado_em" TIMESTAMP(3),

    CONSTRAINT "consultas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnosticos" (
    "id" TEXT NOT NULL,
    "consulta_id" TEXT NOT NULL,
    "cid" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "confianca" DOUBLE PRECISION NOT NULL,
    "selecionado" BOOLEAN NOT NULL DEFAULT false,
    "idempotency_key" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnosticos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescricoes" (
    "id" TEXT NOT NULL,
    "consulta_id" TEXT NOT NULL,
    "diagnostico_id" TEXT,
    "status" "StatusPrescricao" NOT NULL DEFAULT 'rascunho',
    "medicamentos" JSONB NOT NULL,
    "orientacoes" TEXT,
    "validade_dias" INTEGER NOT NULL DEFAULT 30,
    "hash_integridade" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "deletado_em" TIMESTAMP(3),

    CONSTRAINT "prescricoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicamentos" (
    "id" TEXT NOT NULL,
    "nome_generico" TEXT NOT NULL,
    "nome_comercial" TEXT[],
    "principio_ativo" TEXT NOT NULL,
    "classe" TEXT NOT NULL,
    "subclasse" TEXT,
    "forma_farmaceutica" TEXT NOT NULL,
    "concentracoes" TEXT[],
    "dispensacao" TEXT NOT NULL,
    "disponivel_sus" BOOLEAN NOT NULL DEFAULT false,
    "custo_medio_brl" DOUBLE PRECISION,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diretrizes" (
    "id" TEXT NOT NULL,
    "sociedade" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "cids_cobertos" TEXT[],
    "resumo" TEXT NOT NULL,
    "principais_mudancas" TEXT[],
    "url_fonte" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diretrizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencias" (
    "id" TEXT NOT NULL,
    "diretriz_id" TEXT,
    "cid" TEXT NOT NULL,
    "molecula" TEXT NOT NULL,
    "indicacao" TEXT NOT NULL,
    "tipo_estudo" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "doi" TEXT,
    "pmid" TEXT,
    "nivel_evidencia" "NivelEvidencia" NOT NULL DEFAULT 'A',
    "incidencia_trat" DOUBLE PRECISION NOT NULL,
    "incidencia_ctrl" DOUBLE PRECISION NOT NULL,
    "nnt" INTEGER,
    "arr" DOUBLE PRECISION,
    "rrr" DOUBLE PRECISION,
    "mortalidade_trat" DOUBLE PRECISION,
    "mortalidade_ctrl" DOUBLE PRECISION,
    "beneficios" TEXT[],
    "riscos" TEXT[],
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rwe" (
    "id" TEXT NOT NULL,
    "cid" TEXT NOT NULL,
    "diagnostico" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "total_casos" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "populacao" TEXT NOT NULL,
    "idade_media" DOUBLE PRECISION NOT NULL,
    "proporcao_feminino" DOUBLE PRECISION NOT NULL,
    "taxa_sucesso" DOUBLE PRECISION NOT NULL,
    "taxa_falha" DOUBLE PRECISION NOT NULL,
    "mortalidade" DOUBLE PRECISION NOT NULL,
    "reinternacao" DOUBLE PRECISION NOT NULL,
    "eventos_adversos" DOUBLE PRECISION NOT NULL,
    "eventos_adversos_graves" DOUBLE PRECISION NOT NULL,
    "medicamentos" TEXT[],
    "guideline_utilizada" TEXT NOT NULL,
    "adesao_guideline" DOUBLE PRECISION NOT NULL,
    "score_evidencia" DOUBLE PRECISION NOT NULL,
    "nivel_confianca" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "instituicao" TEXT,
    "hash_integridade" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rwe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_twins" (
    "id" TEXT NOT NULL,
    "paciente_anonimizado" TEXT NOT NULL,
    "diagnostico_principal" TEXT NOT NULL,
    "perfil" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "digital_twins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outcomes" (
    "id" TEXT NOT NULL,
    "molecula" TEXT NOT NULL,
    "cid" TEXT NOT NULL,
    "indicacao" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "horizonte" TEXT NOT NULL,
    "arr" DOUBLE PRECISION NOT NULL,
    "rrr" DOUBLE PRECISION NOT NULL,
    "nnt" INTEGER NOT NULL,
    "nnh" INTEGER,
    "arr_mortalidade" DOUBLE PRECISION,
    "nnt_mortalidade" INTEGER,
    "custo_por_desfecho_evitado" DOUBLE PRECISION,
    "classificacao_beneficio" TEXT NOT NULL,
    "nivel_evidencia" "NivelEvidencia" NOT NULL DEFAULT 'A',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_scores" (
    "id" TEXT NOT NULL,
    "consulta_id" TEXT NOT NULL,
    "risco_global" "NivelRisco" NOT NULL,
    "score_global" DOUBLE PRECISION NOT NULL,
    "alerta_vermelho" BOOLEAN NOT NULL DEFAULT false,
    "risco_cardiovascular" JSONB NOT NULL,
    "risco_renal" JSONB NOT NULL,
    "risco_hemorragico" JSONB NOT NULL,
    "risco_farmacologico" JSONB NOT NULL,
    "risco_interacao" JSONB NOT NULL,
    "risco_terapeutico" JSONB NOT NULL,
    "recomendacoes" TEXT[],
    "idempotency_key" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_trust" (
    "id" TEXT NOT NULL,
    "consulta_id" TEXT NOT NULL,
    "molecula" TEXT NOT NULL,
    "score_global" DOUBLE PRECISION NOT NULL,
    "percentual" TEXT NOT NULL,
    "classificacao" TEXT NOT NULL,
    "resumo_executivo" TEXT NOT NULL,
    "limitacoes" TEXT[],
    "recomendacao_uso" TEXT NOT NULL,
    "dimensoes" JSONB NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_trust_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guideline_conflicts" (
    "id" TEXT NOT NULL,
    "diagnostico_id" TEXT NOT NULL,
    "diretriz_id" TEXT,
    "tipo_conflito" TEXT NOT NULL,
    "grau_conflito" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "recomendacao" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guideline_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_registry" (
    "id" TEXT NOT NULL,
    "prescricao_id" TEXT NOT NULL,
    "molecula" TEXT NOT NULL,
    "cid" TEXT NOT NULL,
    "diretriz" TEXT NOT NULL,
    "nivel_evidencia" "NivelEvidencia" NOT NULL,
    "classe_terapeutica" TEXT NOT NULL,
    "dose" TEXT,
    "via" TEXT,
    "duracao" TEXT,
    "justificativa" TEXT,
    "hash_integridade" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "engine_versao" TEXT NOT NULL DEFAULT '3.0.0',
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "crm_hash" TEXT,
    "tipo" "TipoAuditoria" NOT NULL,
    "acao" TEXT NOT NULL,
    "recurso" TEXT,
    "dados_entrada" JSONB,
    "dados_saida" JSONB,
    "ip_hash" TEXT,
    "user_agent_hash" TEXT,
    "guideline_ref" TEXT,
    "evidencia_ref" TEXT,
    "hash_integridade" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_validations" (
    "id" TEXT NOT NULL,
    "prescricao_id" TEXT,
    "validador_id" TEXT NOT NULL,
    "crm_hash" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "status" "StatusValidacao" NOT NULL DEFAULT 'pendente',
    "concordancia_global" DOUBLE PRECISION,
    "veredicto" TEXT,
    "justificativa" TEXT,
    "conduta_alternativa" TEXT,
    "tempo_revisao_seg" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_validations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_perfil_idx" ON "usuarios"("perfil");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuario_id_idx" ON "refresh_tokens"("usuario_id");

-- CreateIndex
CREATE INDEX "mfa_recovery_codes_usuario_id_idx" ON "mfa_recovery_codes"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "medicos_usuario_id_key" ON "medicos"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "medicos_crm_hash_key" ON "medicos"("crm_hash");

-- CreateIndex
CREATE INDEX "medicos_especialidade_idx" ON "medicos"("especialidade");

-- CreateIndex
CREATE UNIQUE INDEX "laboratorios_usuario_id_key" ON "laboratorios"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "laboratorios_cnpj_hash_key" ON "laboratorios"("cnpj_hash");

-- CreateIndex
CREATE UNIQUE INDEX "hospitais_usuario_id_key" ON "hospitais"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "hospitais_cnpj_hash_key" ON "hospitais"("cnpj_hash");

-- CreateIndex
CREATE UNIQUE INDEX "pacientes_hash_identidade_key" ON "pacientes"("hash_identidade");

-- CreateIndex
CREATE INDEX "pacientes_hash_identidade_idx" ON "pacientes"("hash_identidade");

-- CreateIndex
CREATE UNIQUE INDEX "consultas_idempotency_key_key" ON "consultas"("idempotency_key");

-- CreateIndex
CREATE INDEX "consultas_usuario_id_idx" ON "consultas"("usuario_id");

-- CreateIndex
CREATE INDEX "consultas_status_idx" ON "consultas"("status");

-- CreateIndex
CREATE INDEX "consultas_criado_em_idx" ON "consultas"("criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "diagnosticos_idempotency_key_key" ON "diagnosticos"("idempotency_key");

-- CreateIndex
CREATE INDEX "diagnosticos_consulta_id_idx" ON "diagnosticos"("consulta_id");

-- CreateIndex
CREATE INDEX "diagnosticos_cid_idx" ON "diagnosticos"("cid");

-- CreateIndex
CREATE UNIQUE INDEX "prescricoes_idempotency_key_key" ON "prescricoes"("idempotency_key");

-- CreateIndex
CREATE INDEX "prescricoes_consulta_id_idx" ON "prescricoes"("consulta_id");

-- CreateIndex
CREATE INDEX "prescricoes_status_idx" ON "prescricoes"("status");

-- CreateIndex
CREATE INDEX "medicamentos_principio_ativo_idx" ON "medicamentos"("principio_ativo");

-- CreateIndex
CREATE INDEX "medicamentos_classe_idx" ON "medicamentos"("classe");

-- CreateIndex
CREATE UNIQUE INDEX "medicamentos_nome_generico_principio_ativo_key" ON "medicamentos"("nome_generico", "principio_ativo");

-- CreateIndex
CREATE INDEX "diretrizes_sociedade_idx" ON "diretrizes"("sociedade");

-- CreateIndex
CREATE INDEX "diretrizes_ano_idx" ON "diretrizes"("ano");

-- CreateIndex
CREATE INDEX "diretrizes_ativa_idx" ON "diretrizes"("ativa");

-- CreateIndex
CREATE INDEX "evidencias_cid_idx" ON "evidencias"("cid");

-- CreateIndex
CREATE INDEX "evidencias_molecula_idx" ON "evidencias"("molecula");

-- CreateIndex
CREATE INDEX "evidencias_nivel_evidencia_idx" ON "evidencias"("nivel_evidencia");

-- CreateIndex
CREATE INDEX "rwe_cid_idx" ON "rwe"("cid");

-- CreateIndex
CREATE INDEX "rwe_origem_idx" ON "rwe"("origem");

-- CreateIndex
CREATE INDEX "digital_twins_paciente_anonimizado_idx" ON "digital_twins"("paciente_anonimizado");

-- CreateIndex
CREATE INDEX "outcomes_cid_idx" ON "outcomes"("cid");

-- CreateIndex
CREATE INDEX "outcomes_molecula_idx" ON "outcomes"("molecula");

-- CreateIndex
CREATE UNIQUE INDEX "outcomes_molecula_cid_horizonte_fonte_key" ON "outcomes"("molecula", "cid", "horizonte", "fonte");

-- CreateIndex
CREATE UNIQUE INDEX "risk_scores_idempotency_key_key" ON "risk_scores"("idempotency_key");

-- CreateIndex
CREATE INDEX "risk_scores_consulta_id_idx" ON "risk_scores"("consulta_id");

-- CreateIndex
CREATE INDEX "medical_trust_consulta_id_idx" ON "medical_trust"("consulta_id");

-- CreateIndex
CREATE INDEX "guideline_conflicts_diagnostico_id_idx" ON "guideline_conflicts"("diagnostico_id");

-- CreateIndex
CREATE INDEX "recommendation_registry_prescricao_id_idx" ON "recommendation_registry"("prescricao_id");

-- CreateIndex
CREATE INDEX "recommendation_registry_cid_idx" ON "recommendation_registry"("cid");

-- CreateIndex
CREATE INDEX "recommendation_registry_molecula_idx" ON "recommendation_registry"("molecula");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_tipo_idx" ON "auditoria"("tipo");

-- CreateIndex
CREATE INDEX "auditoria_timestamp_idx" ON "auditoria"("timestamp");

-- CreateIndex
CREATE INDEX "auditoria_crm_hash_idx" ON "auditoria"("crm_hash");

-- CreateIndex
CREATE INDEX "medical_validations_prescricao_id_idx" ON "medical_validations"("prescricao_id");

-- CreateIndex
CREATE INDEX "medical_validations_validador_id_idx" ON "medical_validations"("validador_id");

-- CreateIndex
CREATE INDEX "medical_validations_status_idx" ON "medical_validations"("status");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos" ADD CONSTRAINT "medicos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratorios" ADD CONSTRAINT "laboratorios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospitais" ADD CONSTRAINT "hospitais_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultas" ADD CONSTRAINT "consultas_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "pacientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnosticos" ADD CONSTRAINT "diagnosticos_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescricoes" ADD CONSTRAINT "prescricoes_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescricoes" ADD CONSTRAINT "prescricoes_diagnostico_id_fkey" FOREIGN KEY ("diagnostico_id") REFERENCES "diagnosticos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias" ADD CONSTRAINT "evidencias_diretriz_id_fkey" FOREIGN KEY ("diretriz_id") REFERENCES "diretrizes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_trust" ADD CONSTRAINT "medical_trust_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "consultas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guideline_conflicts" ADD CONSTRAINT "guideline_conflicts_diagnostico_id_fkey" FOREIGN KEY ("diagnostico_id") REFERENCES "diagnosticos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guideline_conflicts" ADD CONSTRAINT "guideline_conflicts_diretriz_id_fkey" FOREIGN KEY ("diretriz_id") REFERENCES "diretrizes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_registry" ADD CONSTRAINT "recommendation_registry_prescricao_id_fkey" FOREIGN KEY ("prescricao_id") REFERENCES "prescricoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_validations" ADD CONSTRAINT "medical_validations_prescricao_id_fkey" FOREIGN KEY ("prescricao_id") REFERENCES "prescricoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_validations" ADD CONSTRAINT "medical_validations_validador_id_fkey" FOREIGN KEY ("validador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

