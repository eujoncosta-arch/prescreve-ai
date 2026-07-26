import { NivelRisco } from '@prisma/client';
export declare class CriarConsultaDto {
    paciente_hash?: string;
    anamnese?: Record<string, unknown>;
}
export declare class CriarDiagnosticoDto {
    consulta_id: string;
    cid: string;
    descricao: string;
    confianca?: number;
    selecionado?: boolean;
}
export declare class ItemMedicamentoDto {
    molecula: string;
    dose: string;
    via: string;
    frequencia: string;
    duracao: string;
    observacoes?: string;
}
export declare class CriarPrescricaoDto {
    consulta_id: string;
    diagnostico_id?: string;
    medicamentos: ItemMedicamentoDto[];
    orientacoes?: string;
    validade_dias?: number;
}
export declare class RiskScorePayloadDto {
    risco_global: NivelRisco;
    score_global: number;
    alerta_vermelho?: boolean;
    risco_cardiovascular?: Record<string, unknown>;
    risco_renal?: Record<string, unknown>;
    risco_hemorragico?: Record<string, unknown>;
    risco_farmacologico?: Record<string, unknown>;
    risco_interacao?: Record<string, unknown>;
    risco_terapeutico?: Record<string, unknown>;
    recomendacoes_prioritarias?: string[];
}
export declare class SalvarRiscoDto {
    consulta_id: string;
    score: RiskScorePayloadDto;
}
export declare class PaginacaoQueryDto {
    pagina?: number;
    limite?: number;
}
