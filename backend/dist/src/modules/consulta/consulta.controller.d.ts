import { ConsultaService } from './consulta.service';
import { CriarConsultaDto, CriarDiagnosticoDto, CriarPrescricaoDto } from './dto/consulta.dto';
export declare class ConsultaController {
    private svc;
    constructor(svc: ConsultaService);
    criarConsulta(dto: CriarConsultaDto, user: {
        id: string;
    }): Promise<{
        status: import("@prisma/client").$Enums.StatusConsulta;
        id: string;
        criado_em: Date;
        atualizado_em: Date;
        deletado_em: Date | null;
        usuario_id: string;
        anamnese: import("@prisma/client/runtime/client").JsonValue | null;
        paciente_id: string | null;
    }>;
    listarConsultas(user: {
        id: string;
    }, pagina?: string, limite?: string): Promise<{
        total: number;
        pagina: number;
        limite: number;
        consultas: ({
            diagnosticos: {
                id: string;
                criado_em: Date;
                consulta_id: string;
                cid: string;
                descricao: string;
                confianca: number;
                selecionado: boolean;
            }[];
            prescricoes: {
                status: import("@prisma/client").$Enums.StatusPrescricao;
                id: string;
            }[];
        } & {
            status: import("@prisma/client").$Enums.StatusConsulta;
            id: string;
            criado_em: Date;
            atualizado_em: Date;
            deletado_em: Date | null;
            usuario_id: string;
            anamnese: import("@prisma/client/runtime/client").JsonValue | null;
            paciente_id: string | null;
        })[];
    }>;
    buscarConsulta(id: string, user: {
        id: string;
    }): Promise<{
        diagnosticos: {
            id: string;
            criado_em: Date;
            consulta_id: string;
            cid: string;
            descricao: string;
            confianca: number;
            selecionado: boolean;
        }[];
        prescricoes: ({
            registros: {
                status: string;
                diretriz: string;
                id: string;
                criado_em: Date;
                hash_integridade: string;
                cid: string;
                versao: number;
                molecula: string;
                nivel_evidencia: import("@prisma/client").$Enums.NivelEvidencia;
                prescricao_id: string;
                classe_terapeutica: string;
                dose: string | null;
                via: string | null;
                duracao: string | null;
                justificativa: string | null;
                engine_versao: string;
            }[];
        } & {
            status: import("@prisma/client").$Enums.StatusPrescricao;
            id: string;
            criado_em: Date;
            atualizado_em: Date;
            deletado_em: Date | null;
            hash_integridade: string;
            consulta_id: string;
            diagnostico_id: string | null;
            orientacoes: string | null;
            validade_dias: number;
            medicamentos: import("@prisma/client/runtime/client").JsonValue;
            versao: number;
        })[];
        risco_scores: {
            id: string;
            criado_em: Date;
            consulta_id: string;
            risco_global: import("@prisma/client").$Enums.NivelRisco;
            score_global: number;
            alerta_vermelho: boolean;
            risco_cardiovascular: import("@prisma/client/runtime/client").JsonValue;
            risco_renal: import("@prisma/client/runtime/client").JsonValue;
            risco_hemorragico: import("@prisma/client/runtime/client").JsonValue;
            risco_farmacologico: import("@prisma/client/runtime/client").JsonValue;
            risco_interacao: import("@prisma/client/runtime/client").JsonValue;
            risco_terapeutico: import("@prisma/client/runtime/client").JsonValue;
            recomendacoes: string[];
        }[];
        trust_scores: {
            id: string;
            criado_em: Date;
            consulta_id: string;
            score_global: number;
            molecula: string;
            percentual: string;
            classificacao: string;
            resumo_executivo: string;
            limitacoes: string[];
            recomendacao_uso: string;
            dimensoes: import("@prisma/client/runtime/client").JsonValue;
        }[];
    } & {
        status: import("@prisma/client").$Enums.StatusConsulta;
        id: string;
        criado_em: Date;
        atualizado_em: Date;
        deletado_em: Date | null;
        usuario_id: string;
        anamnese: import("@prisma/client/runtime/client").JsonValue | null;
        paciente_id: string | null;
    }>;
    timeline(user: {
        id: string;
    }): Promise<{
        status: import("@prisma/client").$Enums.StatusConsulta;
        id: string;
        criado_em: Date;
        diagnosticos: {
            cid: string;
            descricao: string;
        }[];
    }[]>;
    criarDiagnostico(dto: CriarDiagnosticoDto, user: {
        id: string;
    }): Promise<{
        id: string;
        criado_em: Date;
        consulta_id: string;
        cid: string;
        descricao: string;
        confianca: number;
        selecionado: boolean;
    }>;
    criarPrescricao(dto: CriarPrescricaoDto, user: {
        id: string;
    }): Promise<{
        status: import("@prisma/client").$Enums.StatusPrescricao;
        id: string;
        criado_em: Date;
        atualizado_em: Date;
        deletado_em: Date | null;
        hash_integridade: string;
        consulta_id: string;
        diagnostico_id: string | null;
        orientacoes: string | null;
        validade_dias: number;
        medicamentos: import("@prisma/client/runtime/client").JsonValue;
        versao: number;
    }>;
    salvarRisco(body: {
        consulta_id: string;
        score: Record<string, unknown>;
    }, user: {
        id: string;
    }): Promise<{
        id: string;
        criado_em: Date;
        consulta_id: string;
        risco_global: import("@prisma/client").$Enums.NivelRisco;
        score_global: number;
        alerta_vermelho: boolean;
        risco_cardiovascular: import("@prisma/client/runtime/client").JsonValue;
        risco_renal: import("@prisma/client/runtime/client").JsonValue;
        risco_hemorragico: import("@prisma/client/runtime/client").JsonValue;
        risco_farmacologico: import("@prisma/client/runtime/client").JsonValue;
        risco_interacao: import("@prisma/client/runtime/client").JsonValue;
        risco_terapeutico: import("@prisma/client/runtime/client").JsonValue;
        recomendacoes: string[];
    }>;
    buscarEvidencias(cid: string): Promise<{
        id: string;
        criado_em: Date;
        atualizado_em: Date;
        cid: string;
        diretriz_id: string | null;
        molecula: string;
        indicacao: string;
        tipo_estudo: string;
        fonte: string;
        ano: number;
        doi: string | null;
        pmid: string | null;
        nivel_evidencia: import("@prisma/client").$Enums.NivelEvidencia;
        incidencia_trat: number;
        incidencia_ctrl: number;
        nnt: number | null;
        arr: number | null;
        rrr: number | null;
        mortalidade_trat: number | null;
        mortalidade_ctrl: number | null;
        beneficios: string[];
        riscos: string[];
    }[]>;
    buscarRWE(cid: string): Promise<{
        diagnostico: string;
        especialidade: string;
        id: string;
        criado_em: Date;
        hash_integridade: string;
        cid: string;
        medicamentos: string[];
        total_casos: number;
        periodo: string;
        populacao: string;
        idade_media: number;
        proporcao_feminino: number;
        taxa_sucesso: number;
        taxa_falha: number;
        mortalidade: number;
        reinternacao: number;
        eventos_adversos: number;
        eventos_adversos_graves: number;
        guideline_utilizada: string;
        adesao_guideline: number;
        score_evidencia: number;
        nivel_confianca: string;
        origem: string;
        instituicao: string | null;
    }[]>;
}
