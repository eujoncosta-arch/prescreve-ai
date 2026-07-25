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
export declare class CriarPrescricaoDto {
    consulta_id: string;
    diagnostico_id?: string;
    medicamentos: {
        molecula: string;
        dose: string;
        via: string;
        frequencia: string;
        duracao: string;
        observacoes?: string;
    }[];
    orientacoes?: string;
    validade_dias?: number;
}
export declare class SalvarRiscoDto {
    consulta_id: string;
    score: Record<string, unknown>;
}
