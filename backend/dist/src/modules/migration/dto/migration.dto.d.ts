export declare class LocalPrescricaoDto {
    id?: string;
    medicamentos?: unknown[];
    orientacoes?: string;
    diagnostico?: string;
    criado_em?: string;
}
export declare class LocalValidacaoDto {
    id?: string;
    crm_hash?: string;
    especialidade?: string;
    veredicto?: string;
    justificativa?: string;
}
export declare class MigrarHistoricoDto {
    prescricoes?: LocalPrescricaoDto[];
    validacoes?: LocalValidacaoDto[];
    consultas?: unknown[];
}
