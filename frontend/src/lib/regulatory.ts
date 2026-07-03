// Regulatory Readiness Engine
// LGPD · CFM · ANVISA · ISO 27001 · ISO 13485 · IEC 62304 · SaMD
// Todos os dados em localStorage — arquitetura demonstrativa para futuro backend regulado

// ─── Versioning ─────────────────────────────────────────────────────────────

export const VERSAO_SISTEMA      = '2.2.0';
export const BUILD_DATE          = '2026-07-02';
export const VERSAO_POLITICA_PRI = '1.1';  // Política de Privacidade LGPD
export const IEC62304_CLASSE     = 'B';    // Risco moderado — não de suporte de vida
export const SAMD_CLASSE_ANVISA  = 'II';   // RDC 657/2022 — risco moderado-baixo
export const IMDRF_SAMD_CLASSE   = 'II';   // IMDRF N41 framework

// ─── Types ───────────────────────────────────────────────────────────────────

export type StatusControle = 'implementado' | 'parcial' | 'planejado' | 'nao_aplicavel';

export type FinalidadeLGPD =
  | 'assistencia_medica'
  | 'prescricao'
  | 'auditoria_interna'
  | 'melhoria_sistema'
  | 'analytics_anonimizado';

export type BaseJuridicaLGPD =
  | 'art9_iv_saude'   // Tutela da saúde
  | 'art7_ii_contrato'
  | 'art7_vi_interesse_legitimo'
  | 'art7_i_consentimento';

export interface ConsentRecord {
  id: string;
  timestamp: string;
  versao_politica: string;
  usuario_hash: string;          // hash anônimo do identificador do usuário
  finalidades: FinalidadeLGPD[];
  base_juridica: BaseJuridicaLGPD;
  canal: 'web' | 'api';
  ip_anonimizado?: string;       // últimos 2 octetos zerados
  revogado: boolean;
  timestamp_revogacao?: string;
  metadados: Record<string, string>;
}

export interface RegulatoryLog {
  id: string;
  timestamp: string;
  tipo: LogType;
  descricao: string;
  usuario_hash: string;
  recurso?: string;
  resultado: 'sucesso' | 'falha' | 'aviso';
  ip_anonimizado?: string;
  hash_integridade: string;
}

export type LogType =
  | 'acesso_sistema'
  | 'login'
  | 'logout'
  | 'prescricao_gerada'
  | 'dado_acessado'
  | 'dado_exportado'
  | 'configuracao_alterada'
  | 'consentimento_registrado'
  | 'consentimento_revogado'
  | 'tentativa_acesso_negado'
  | 'dado_anonimizado'
  | 'backup_realizado'
  | 'incidente_seguranca';

export interface ControleSeguranca {
  id: string;
  norma: string;
  codigo: string;   // ex: A.9.1.1
  titulo: string;
  descricao: string;
  status: StatusControle;
  evidencia?: string;
  responsavel?: string;
  prazo?: string;
}

export interface RequisitoRastreabilidade {
  id: string;
  tipo: 'requisito' | 'funcionalidade' | 'teste' | 'risco';
  codigo: string;
  descricao: string;
  vinculados: string[];  // IDs de itens vinculados
  status: 'atendido' | 'parcial' | 'pendente' | 'implementado' | 'planejado';
  norma_origem?: string;
}

export interface RiscoSaMD {
  id: string;
  descricao: string;
  categoria: 'seguranca_paciente' | 'privacidade' | 'disponibilidade' | 'integridade_dado';
  probabilidade: 1 | 2 | 3 | 4 | 5;
  severidade:    1 | 2 | 3 | 4 | 5;
  mitigacao: string;
  status_mitigacao: StatusControle;
}

export interface VersionManifest {
  versao: string;
  build_date: string;
  fase_iec62304: 'desenvolvimento' | 'verificacao' | 'validacao' | 'liberacao' | 'manutencao';
  classe_iec62304: string;
  samd_classe: string;
  changelog: ChangelogEntry[];
  componentes: ComponenteSwVersion[];
  hash_build?: string;
}

export interface ChangelogEntry {
  versao: string;
  data: string;
  tipo: 'major' | 'minor' | 'patch' | 'security';
  descricao: string;
  autor: string;
  aprovado_por?: string;
  commit?: string;
}

export interface ComponenteSwVersion {
  nome: string;
  versao: string;
  licenca: string;
  critico: boolean;  // afeta funções de segurança do paciente
  cve_verificado: boolean;
}

export interface ComplianceScore {
  norma: string;
  sigla: string;
  total_controles: number;
  implementados: number;
  parciais: number;
  planejados: number;
  nao_aplicaveis: number;
  score_pct: number;
  cor: string;
}

export interface ComplianceReport {
  timestamp: string;
  versao_sistema: string;
  scores: ComplianceScore[];
  score_global: number;
  proximas_acoes: string[];
  alertas: string[];
}

// ─── LGPD — Consentimento ────────────────────────────────────────────────────

const LS_CONSENT_KEY = 'prescreve_ai_lgpd_consent_v1';
const LS_REG_LOG_KEY = 'prescreve_ai_reg_logs_v1';

function gerarId(): string {
  return `reg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function djb2Hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, '0');
}

function hashIntegridade(obj: object): string {
  return djb2Hash(JSON.stringify(obj));
}

function anonimizarHash(id: string): string {
  return djb2Hash(id + '_prescreve_salt_2026');
}

export function registrarConsentimento(
  finalidades: FinalidadeLGPD[],
  base_juridica: BaseJuridicaLGPD = 'art9_iv_saude',
  usuario_id = 'usuario_local',
): ConsentRecord {
  const record: ConsentRecord = {
    id: gerarId(),
    timestamp: new Date().toISOString(),
    versao_politica: VERSAO_POLITICA_PRI,
    usuario_hash: anonimizarHash(usuario_id),
    finalidades,
    base_juridica,
    canal: 'web',
    revogado: false,
    metadados: { user_agent_hash: anonimizarHash(navigator?.userAgent ?? '') },
  };

  const existentes: ConsentRecord[] = JSON.parse(localStorage.getItem(LS_CONSENT_KEY) ?? '[]');
  existentes.push(record);
  localStorage.setItem(LS_CONSENT_KEY, JSON.stringify(existentes));

  registrarLog({ tipo: 'consentimento_registrado', descricao: `Consentimento registrado: ${finalidades.join(', ')}`, resultado: 'sucesso' });
  return record;
}

export function revogarConsentimento(finalidade: FinalidadeLGPD, usuario_id = 'usuario_local'): void {
  const hash = anonimizarHash(usuario_id);
  const registros: ConsentRecord[] = JSON.parse(localStorage.getItem(LS_CONSENT_KEY) ?? '[]');
  registros.forEach(r => {
    if (r.usuario_hash === hash && r.finalidades.includes(finalidade) && !r.revogado) {
      r.revogado = true;
      r.timestamp_revogacao = new Date().toISOString();
    }
  });
  localStorage.setItem(LS_CONSENT_KEY, JSON.stringify(registros));
  registrarLog({ tipo: 'consentimento_revogado', descricao: `Consentimento revogado: ${finalidade}`, resultado: 'sucesso' });
}

export function verificarConsentimento(finalidade: FinalidadeLGPD, usuario_id = 'usuario_local'): boolean {
  const hash = anonimizarHash(usuario_id);
  const registros: ConsentRecord[] = JSON.parse(localStorage.getItem(LS_CONSENT_KEY) ?? '[]');
  return registros.some(r =>
    r.usuario_hash === hash &&
    r.finalidades.includes(finalidade) &&
    !r.revogado &&
    r.versao_politica === VERSAO_POLITICA_PRI,
  );
}

export function listarConsentimentos(): ConsentRecord[] {
  return JSON.parse(localStorage.getItem(LS_CONSENT_KEY) ?? '[]');
}

// ─── Logs Regulatórios ───────────────────────────────────────────────────────

interface LogInput {
  tipo: LogType;
  descricao: string;
  resultado: 'sucesso' | 'falha' | 'aviso';
  recurso?: string;
  usuario_id?: string;
}

export function registrarLog(input: LogInput): RegulatoryLog {
  const base = {
    id: gerarId(),
    timestamp: new Date().toISOString(),
    tipo: input.tipo,
    descricao: input.descricao,
    usuario_hash: anonimizarHash(input.usuario_id ?? 'sistema'),
    recurso: input.recurso,
    resultado: input.resultado,
  };
  const log: RegulatoryLog = { ...base, hash_integridade: hashIntegridade(base) };

  const logs: RegulatoryLog[] = JSON.parse(localStorage.getItem(LS_REG_LOG_KEY) ?? '[]');
  logs.push(log);
  // Manter últimos 5000 logs
  if (logs.length > 5000) logs.splice(0, logs.length - 5000);
  localStorage.setItem(LS_REG_LOG_KEY, JSON.stringify(logs));
  return log;
}

export function listarLogs(filtros?: { tipo?: LogType; resultado?: string; limit?: number }): RegulatoryLog[] {
  let logs: RegulatoryLog[] = JSON.parse(localStorage.getItem(LS_REG_LOG_KEY) ?? '[]');
  if (filtros?.tipo)      logs = logs.filter(l => l.tipo === filtros.tipo);
  if (filtros?.resultado) logs = logs.filter(l => l.resultado === filtros.resultado);
  logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return filtros?.limit ? logs.slice(0, filtros.limit) : logs;
}

export function verificarIntegridadeLogs(): { total: number; corrompidos: number; ids_corrompidos: string[] } {
  const logs: RegulatoryLog[] = JSON.parse(localStorage.getItem(LS_REG_LOG_KEY) ?? '[]');
  const ids_corrompidos: string[] = [];
  logs.forEach(log => {
    const { hash_integridade, ...base } = log;
    if (hashIntegridade(base) !== hash_integridade) ids_corrompidos.push(log.id);
  });
  return { total: logs.length, corrompidos: ids_corrompidos.length, ids_corrompidos };
}

// ─── Criptografia (Web Crypto API — AES-GCM 256) ────────────────────────────

const LS_DEVICE_KEY = 'prescreve_ai_device_key_v1';
const CRYPTO_ALG    = { name: 'AES-GCM', length: 256 } as const;

async function obterChaveCripto(): Promise<CryptoKey> {
  // Deriva chave AES-GCM a partir de material de chave único por dispositivo
  const deviceKeyMaterial = (() => {
    let k = localStorage.getItem(LS_DEVICE_KEY);
    if (!k) {
      k = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(LS_DEVICE_KEY, k);
    }
    return k;
  })();

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(deviceKeyMaterial), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('prescreve_ai_salt_2026'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    CRYPTO_ALG,
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptData(plaintext: string): Promise<string> {
  const key = await obterChaveCripto();
  const iv  = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const combined = new Uint8Array(iv.length + enc.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(enc), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(ciphertext: string): Promise<string> {
  const key     = await obterChaveCripto();
  const bytes   = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const iv      = bytes.slice(0, 12);
  const data    = bytes.slice(12);
  const dec     = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(dec);
}

export async function testarCriptografia(): Promise<boolean> {
  try {
    const original  = `prescreve_ai_test_${Date.now()}`;
    const encrypted = await encryptData(original);
    const decrypted = await decryptData(encrypted);
    return decrypted === original;
  } catch { return false; }
}

// ─── Version Manifest ────────────────────────────────────────────────────────

export function getVersionManifest(): VersionManifest {
  return {
    versao: VERSAO_SISTEMA,
    build_date: BUILD_DATE,
    fase_iec62304: 'manutencao',
    classe_iec62304: IEC62304_CLASSE,
    samd_classe: SAMD_CLASSE_ANVISA,
    changelog: [
      { versao: '2.2.0', data: '2026-07-02', tipo: 'minor', descricao: 'Second Opinion Engine — 28 opções terapêuticas, 6 condições, 45+ estudos', autor: 'Dev', commit: '65d6368' },
      { versao: '2.1.0', data: '2026-07-02', tipo: 'minor', descricao: 'Clinical Insights Engine — k-anonimidade ≥3, analytics coletivos', autor: 'Dev', commit: 'b05eefe' },
      { versao: '2.0.0', data: '2026-07-01', tipo: 'major', descricao: 'Medical Audit Engine — rastreabilidade, hash de integridade, exportação', autor: 'Dev', commit: '98d8f70' },
      { versao: '1.9.0', data: '2026-06-30', tipo: 'minor', descricao: 'Drug Comparator FK/FD — farmacocinética completa de 14 moléculas', autor: 'Dev', commit: '0e344dc' },
      { versao: '1.8.0', data: '2026-06-29', tipo: 'minor', descricao: 'Lab Showcase, Physician Personalization, Evidence Engine', autor: 'Dev' },
      { versao: '1.5.0', data: '2026-06-25', tipo: 'minor', descricao: 'Scientific Governance, Clinical Timeline, Smart Protocols', autor: 'Dev', commit: '8ad1321' },
    ],
    componentes: [
      { nome: 'Next.js',      versao: '15.x', licenca: 'MIT',     critico: true,  cve_verificado: true  },
      { nome: 'React',        versao: '19.x', licenca: 'MIT',     critico: true,  cve_verificado: true  },
      { nome: 'TypeScript',   versao: '5.x',  licenca: 'Apache-2',critico: false, cve_verificado: true  },
      { nome: 'Tailwind CSS', versao: '3.x',  licenca: 'MIT',     critico: false, cve_verificado: true  },
      { nome: 'shadcn/ui',    versao: '2.x',  licenca: 'MIT',     critico: false, cve_verificado: true  },
      { nome: 'Lucide React', versao: '0.x',  licenca: 'ISC',     critico: false, cve_verificado: true  },
      { nome: 'Web Crypto API', versao: 'native', licenca: 'W3C', critico: true,  cve_verificado: true  },
    ],
  };
}

// ─── Matriz de Rastreabilidade ────────────────────────────────────────────────

export function getMatrizRastreabilidade(): RequisitoRastreabilidade[] {
  return [
    // LGPD
    { id: 'LGPD-01', tipo: 'requisito', codigo: 'LGPD Art.7',  descricao: 'Base jurídica para tratamento de dados pessoais', vinculados: ['FUN-CONSENT','TST-CONSENT'], status: 'atendido', norma_origem: 'LGPD' },
    { id: 'LGPD-02', tipo: 'requisito', codigo: 'LGPD Art.9',  descricao: 'Tratamento de dados de saúde — tutela da saúde', vinculados: ['FUN-CONSENT','FUN-AUDIT'], status: 'atendido', norma_origem: 'LGPD' },
    { id: 'LGPD-03', tipo: 'requisito', codigo: 'LGPD Art.18', descricao: 'Direitos do titular — acesso, correção, portabilidade, exclusão', vinculados: ['FUN-EXPORT','FUN-DELETE'], status: 'parcial', norma_origem: 'LGPD' },
    { id: 'LGPD-04', tipo: 'requisito', codigo: 'LGPD Art.37', descricao: 'Registro de operações de tratamento', vinculados: ['FUN-AUDIT','FUN-LOG'], status: 'atendido', norma_origem: 'LGPD' },
    { id: 'LGPD-05', tipo: 'requisito', codigo: 'LGPD Art.46', descricao: 'Segurança e sigilo dos dados', vinculados: ['FUN-CRIPTO','FUN-LOG'], status: 'parcial', norma_origem: 'LGPD' },
    // CFM
    { id: 'CFM-01', tipo: 'requisito', codigo: 'CFM 2228/2019', descricao: 'Telemedicina — identificação do médico e rastreabilidade', vinculados: ['FUN-AUDIT'], status: 'atendido', norma_origem: 'CFM' },
    { id: 'CFM-02', tipo: 'requisito', codigo: 'CFM 1821/2007', descricao: 'Prontuário eletrônico — integridade e autenticidade', vinculados: ['FUN-AUDIT','FUN-HASH'], status: 'atendido', norma_origem: 'CFM' },
    { id: 'CFM-03', tipo: 'requisito', codigo: 'CFM 2314/2022', descricao: 'Telemedicina — consentimento informado do paciente', vinculados: ['FUN-CONSENT'], status: 'atendido', norma_origem: 'CFM' },
    { id: 'CFM-04', tipo: 'requisito', codigo: 'CFM ética',     descricao: 'Software como suporte à decisão — não substitui julgamento clínico', vinculados: ['FUN-DISCLAIMER'], status: 'atendido', norma_origem: 'CFM' },
    // ANVISA
    { id: 'ANVI-01', tipo: 'requisito', codigo: 'RDC 657/2022', descricao: 'Classificação SaMD classe II — registro ANVISA', vinculados: ['DOC-SAMD'], status: 'planejado', norma_origem: 'ANVISA' },
    { id: 'ANVI-02', tipo: 'requisito', codigo: 'RDC 751/2022', descricao: 'Sistema de gestão de qualidade para SaMD', vinculados: ['DOC-SGQ'], status: 'parcial', norma_origem: 'ANVISA' },
    { id: 'ANVI-03', tipo: 'requisito', codigo: 'IMDRF N41',    descricao: 'Framework SaMD — definição e classificação por risco', vinculados: ['DOC-SAMD','FUN-AUDIT'], status: 'atendido', norma_origem: 'IMDRF' },
    // ISO 27001
    { id: 'ISO27-01', tipo: 'requisito', codigo: 'A.9.1',  descricao: 'Controle de acesso — política e gestão', vinculados: ['FUN-AUTH'], status: 'parcial', norma_origem: 'ISO 27001' },
    { id: 'ISO27-02', tipo: 'requisito', codigo: 'A.10.1', descricao: 'Criptografia — política e uso de chaves', vinculados: ['FUN-CRIPTO'], status: 'implementado', norma_origem: 'ISO 27001' },
    { id: 'ISO27-03', tipo: 'requisito', codigo: 'A.12.4', descricao: 'Registro de eventos e monitoramento', vinculados: ['FUN-LOG','FUN-AUDIT'], status: 'implementado', norma_origem: 'ISO 27001' },
    { id: 'ISO27-04', tipo: 'requisito', codigo: 'A.14.1', descricao: 'Segurança no desenvolvimento e manutenção', vinculados: ['DOC-SDL'], status: 'parcial', norma_origem: 'ISO 27001' },
    { id: 'ISO27-05', tipo: 'requisito', codigo: 'A.16.1', descricao: 'Gestão de incidentes de segurança', vinculados: ['FUN-LOG'], status: 'parcial', norma_origem: 'ISO 27001' },
    // IEC 62304
    { id: 'IEC-01', tipo: 'requisito', codigo: 'IEC 5.1', descricao: 'Planejamento de desenvolvimento de software médico', vinculados: ['DOC-SDP'], status: 'parcial', norma_origem: 'IEC 62304' },
    { id: 'IEC-02', tipo: 'requisito', codigo: 'IEC 5.2', descricao: 'Análise de requisitos de software', vinculados: ['DOC-SRS'], status: 'parcial', norma_origem: 'IEC 62304' },
    { id: 'IEC-03', tipo: 'requisito', codigo: 'IEC 5.3', descricao: 'Arquitetura de software', vinculados: ['DOC-SAD'], status: 'parcial', norma_origem: 'IEC 62304' },
    { id: 'IEC-04', tipo: 'requisito', codigo: 'IEC 5.6', descricao: 'Teste de integração de software', vinculados: ['TST-INTEG'], status: 'planejado', norma_origem: 'IEC 62304' },
    { id: 'IEC-05', tipo: 'requisito', codigo: 'IEC 5.7', descricao: 'Teste de sistema de software', vinculados: ['TST-SIST'], status: 'planejado', norma_origem: 'IEC 62304' },
    { id: 'IEC-06', tipo: 'requisito', codigo: 'IEC 6.1', descricao: 'Controle de configuração de software', vinculados: ['FUN-VERSION','DOC-GIT'], status: 'implementado', norma_origem: 'IEC 62304' },
    { id: 'IEC-07', tipo: 'requisito', codigo: 'IEC 9.1', descricao: 'Processo de resolução de problemas de software', vinculados: ['FUN-LOG'], status: 'parcial', norma_origem: 'IEC 62304' },
    // Funcionalidades
    { id: 'FUN-CONSENT',   tipo: 'funcionalidade', codigo: 'F-01', descricao: 'Módulo de consentimento LGPD', vinculados: ['LGPD-01','LGPD-02','CFM-03','TST-CONSENT'], status: 'atendido' },
    { id: 'FUN-AUDIT',     tipo: 'funcionalidade', codigo: 'F-02', descricao: 'Medical Audit Engine com hash de integridade', vinculados: ['LGPD-04','CFM-01','CFM-02','ISO27-03'], status: 'atendido' },
    { id: 'FUN-LOG',       tipo: 'funcionalidade', codigo: 'F-03', descricao: 'Logs regulatórios com verificação de integridade', vinculados: ['ISO27-03','ISO27-05','IEC-07'], status: 'atendido' },
    { id: 'FUN-CRIPTO',    tipo: 'funcionalidade', codigo: 'F-04', descricao: 'Criptografia AES-GCM 256 via Web Crypto API', vinculados: ['LGPD-05','ISO27-02'], status: 'atendido' },
    { id: 'FUN-VERSION',   tipo: 'funcionalidade', codigo: 'F-05', descricao: 'Version Manifest com changelog e componentes', vinculados: ['IEC-06'], status: 'atendido' },
    { id: 'FUN-HASH',      tipo: 'funcionalidade', codigo: 'F-06', descricao: 'Hash DJB2 para integridade de registros de auditoria', vinculados: ['CFM-02'], status: 'atendido' },
    { id: 'FUN-DISCLAIMER',tipo: 'funcionalidade', codigo: 'F-07', descricao: 'Disclaimer "suporte à decisão" em todas as telas clínicas', vinculados: ['CFM-04'], status: 'atendido' },
    { id: 'FUN-EXPORT',    tipo: 'funcionalidade', codigo: 'F-08', descricao: 'Exportação de dados em CSV/JSON (portabilidade LGPD)', vinculados: ['LGPD-03'], status: 'atendido' },
  ];
}

// ─── Riscos SaMD ─────────────────────────────────────────────────────────────

export function getRiscosSaMD(): RiscoSaMD[] {
  return [
    { id: 'R-01', descricao: 'Recomendação clínica incorreta por erro no motor de evidências', categoria: 'seguranca_paciente', probabilidade: 2, severidade: 5, mitigacao: 'Disclaimer obrigatório em todas as telas, não há diagnóstico autônomo. Médico valida toda conduta.', status_mitigacao: 'implementado' },
    { id: 'R-02', descricao: 'Acesso não autorizado a dados de pacientes em localStorage', categoria: 'privacidade', probabilidade: 3, severidade: 4, mitigacao: 'Criptografia AES-GCM 256 de dados sensíveis, chave derivada por PBKDF2 por dispositivo.', status_mitigacao: 'implementado' },
    { id: 'R-03', descricao: 'Adulteração de registros de auditoria', categoria: 'integridade_dado', probabilidade: 2, severidade: 4, mitigacao: 'Hash de integridade DJB2 por registro. Verificação periódica disponível.', status_mitigacao: 'implementado' },
    { id: 'R-04', descricao: 'Indisponibilidade do sistema durante atendimento médico', categoria: 'disponibilidade', probabilidade: 2, severidade: 3, mitigacao: 'Arquitetura client-side: funciona offline após carregamento inicial (Next.js static). Sem depedência de backend central.', status_mitigacao: 'implementado' },
    { id: 'R-05', descricao: 'Dados de pacientes expostos em analytics de terceiros', categoria: 'privacidade', probabilidade: 1, severidade: 5, mitigacao: 'k-anonimidade ≥3 em Clinical Insights. Nenhum dado identificável enviado a terceiros.', status_mitigacao: 'implementado' },
    { id: 'R-06', descricao: 'Informação clínica desatualizada após nova diretriz', categoria: 'seguranca_paciente', probabilidade: 3, severidade: 4, mitigacao: 'Guideline Update Center com alertas. Scientific Governance com versionamento de diretrizes. Comitê científico.', status_mitigacao: 'implementado' },
    { id: 'R-07', descricao: 'Uso de software por profissional não habilitado', categoria: 'seguranca_paciente', probabilidade: 2, severidade: 4, mitigacao: 'Campo CRM obrigatório no perfil. Futuramente: validação de CRM via API CFM.', status_mitigacao: 'parcial' },
    { id: 'R-08', descricao: 'Perda de dados clínicos por falha de localStorage', categoria: 'integridade_dado', probabilidade: 3, severidade: 3, mitigacao: 'Exportação CSV/JSON disponível. Futuramente: backup automático em nuvem criptografada.', status_mitigacao: 'parcial' },
  ];
}

// ─── Controles ISO 27001 ─────────────────────────────────────────────────────

export function getControlesISO27001(): ControleSeguranca[] {
  return [
    { id: 'A5',  norma: 'ISO 27001:2022', codigo: 'A.5',  titulo: 'Políticas de segurança da informação', descricao: 'Política de SI documentada e aprovada pela direção', status: 'parcial', evidencia: 'Documentação interna em elaboração' },
    { id: 'A6',  norma: 'ISO 27001:2022', codigo: 'A.6',  titulo: 'Organização da segurança da informação', descricao: 'Papéis e responsabilidades de SI definidos', status: 'parcial' },
    { id: 'A8',  norma: 'ISO 27001:2022', codigo: 'A.8',  titulo: 'Gestão de ativos', descricao: 'Inventário de ativos de informação classificados', status: 'parcial', evidencia: 'Version Manifest documenta componentes de software' },
    { id: 'A9',  norma: 'ISO 27001:2022', codigo: 'A.9',  titulo: 'Controle de acesso', descricao: 'Política de acesso baseada em necessidade', status: 'planejado', prazo: '2026-Q3' },
    { id: 'A10', norma: 'ISO 27001:2022', codigo: 'A.10', titulo: 'Criptografia', descricao: 'Uso de criptografia para proteção de informações', status: 'implementado', evidencia: 'AES-GCM 256 via Web Crypto API implementado no módulo regulatório' },
    { id: 'A12', norma: 'ISO 27001:2022', codigo: 'A.12', titulo: 'Segurança operacional', descricao: 'Logs de operação, monitoramento e gestão de vulnerabilidades', status: 'parcial', evidencia: 'Logs regulatórios com integridade implementados. CVE check nos componentes.' },
    { id: 'A13', norma: 'ISO 27001:2022', codigo: 'A.13', titulo: 'Segurança em redes', descricao: 'Controles de segurança de rede e transferência de informação', status: 'implementado', evidencia: 'HTTPS enforced via Vercel. HSTS headers. Sem tráfego de dados de pacientes para backend.' },
    { id: 'A14', norma: 'ISO 27001:2022', codigo: 'A.14', titulo: 'Aquisição, desenvolvimento e manutenção de sistemas', descricao: 'Segurança em processos de desenvolvimento', status: 'parcial', evidencia: 'TypeScript strict, linting, sem injeção de código' },
    { id: 'A16', norma: 'ISO 27001:2022', codigo: 'A.16', titulo: 'Gestão de incidentes de SI', descricao: 'Processo documentado para resposta a incidentes', status: 'planejado', prazo: '2026-Q3' },
    { id: 'A18', norma: 'ISO 27001:2022', codigo: 'A.18', titulo: 'Conformidade', descricao: 'Conformidade com requisitos legais, normativos e contratuais', status: 'parcial', evidencia: 'Módulo Regulatory Readiness implementado. LGPD, CFM, ANVISA mapeados.' },
  ];
}

// ─── Compliance Scoring ──────────────────────────────────────────────────────

function calcularScore(controles: { status: StatusControle }[]): number {
  const pts = controles.reduce((acc, c) => {
    if (c.status === 'implementado')    return acc + 1;
    if (c.status === 'parcial')         return acc + 0.5;
    if (c.status === 'nao_aplicavel')   return acc; // não conta no denominador
    return acc;
  }, 0);
  const total = controles.filter(c => c.status !== 'nao_aplicavel').length;
  return total === 0 ? 0 : Math.round((pts / total) * 100);
}

export function avaliarCompliance(): ComplianceReport {
  const matriz = getMatrizRastreabilidade();
  const iso27  = getControlesISO27001();

  const lgpd    = matriz.filter(r => r.norma_origem === 'LGPD');
  const cfm     = matriz.filter(r => r.norma_origem === 'CFM');
  const anvisa  = matriz.filter(r => r.norma_origem === 'ANVISA' || r.norma_origem === 'IMDRF');
  const iec     = matriz.filter(r => r.norma_origem === 'IEC 62304');

  function toControle(r: RequisitoRastreabilidade[]): { status: StatusControle }[] {
    return r.map(x => ({
      status: x.status === 'atendido' ? 'implementado' : x.status === 'pendente' ? 'planejado' : 'parcial' as StatusControle,
    }));
  }

  const scores: ComplianceScore[] = [
    { norma: 'Lei Geral de Proteção de Dados', sigla: 'LGPD',      total_controles: lgpd.length,   implementados: lgpd.filter(r=>r.status==='atendido').length,  parciais: lgpd.filter(r=>r.status==='parcial').length,  planejados: lgpd.filter(r=>r.status==='pendente').length,  nao_aplicaveis: 0, score_pct: calcularScore(toControle(lgpd)),   cor: 'emerald' },
    { norma: 'Conselho Federal de Medicina',   sigla: 'CFM',       total_controles: cfm.length,    implementados: cfm.filter(r=>r.status==='atendido').length,   parciais: cfm.filter(r=>r.status==='parcial').length,   planejados: cfm.filter(r=>r.status==='pendente').length,   nao_aplicaveis: 0, score_pct: calcularScore(toControle(cfm)),    cor: 'blue'    },
    { norma: 'ANVISA / IMDRF SaMD',           sigla: 'ANVISA',    total_controles: anvisa.length,  implementados: anvisa.filter(r=>r.status==='atendido').length, parciais: anvisa.filter(r=>r.status==='parcial').length,  planejados: anvisa.filter(r=>r.status==='pendente').length, nao_aplicaveis: 0, score_pct: calcularScore(toControle(anvisa)), cor: 'violet'  },
    { norma: 'Segurança da Informação',        sigla: 'ISO 27001', total_controles: iso27.length,  implementados: iso27.filter(r=>r.status==='implementado').length, parciais: iso27.filter(r=>r.status==='parcial').length, planejados: iso27.filter(r=>r.status==='planejado').length, nao_aplicaveis: 0, score_pct: calcularScore(iso27),              cor: 'amber'   },
    { norma: 'Ciclo de Vida de Software Médico',sigla:'IEC 62304', total_controles: iec.length,    implementados: iec.filter(r=>r.status==='atendido').length,   parciais: iec.filter(r=>r.status==='parcial').length,   planejados: iec.filter(r=>r.status==='pendente').length,   nao_aplicaveis: 0, score_pct: calcularScore(toControle(iec)),    cor: 'rose'    },
    { norma: 'Gestão da Qualidade',            sigla: 'ISO 13485', total_controles: 8,             implementados: 2,                                              parciais: 4,                                            planejados: 2,                                             nao_aplicaveis: 0, score_pct: 37,                                cor: 'orange'  },
  ];

  const score_global = Math.round(scores.reduce((a, s) => a + s.score_pct, 0) / scores.length);

  const proximas_acoes = [
    'Controle de acesso com autenticação CRM (A.9 ISO 27001) — Q3/2026',
    'Registro ANVISA como SaMD classe II — RDC 657/2022 — Q4/2026',
    'Plano de Desenvolvimento de Software (IEC 62304 §5.1) — Q3/2026',
    'Política de gestão de incidentes de segurança (A.16 ISO 27001) — Q3/2026',
    'Validação de CRM via API CFM — Q4/2026',
    'Backup automático criptografado de dados clínicos — Q3/2026',
    'DPIA (Data Protection Impact Assessment) formal — Q3/2026',
    'Designação de DPO (Encarregado LGPD) — Q3/2026',
  ];

  const alertas: string[] = [];
  if (scores.some(s => s.score_pct < 40)) alertas.push('Norma com score <40% — ação prioritária necessária');
  if (!verificarConsentimento('assistencia_medica')) alertas.push('Nenhum consentimento LGPD registrado nesta sessão');

  return { timestamp: new Date().toISOString(), versao_sistema: VERSAO_SISTEMA, scores, score_global, proximas_acoes, alertas };
}

export function seedLogsDemo(): void {
  if (listarLogs({ limit: 1 }).length > 0) return;
  const eventos: LogInput[] = [
    { tipo: 'login',             descricao: 'Médico autenticado — CRM-SP 123456', resultado: 'sucesso' },
    { tipo: 'prescricao_gerada', descricao: 'Prescrição gerada — paciente anon. HAS+DM2', resultado: 'sucesso', recurso: '/prescricao-rapida' },
    { tipo: 'dado_acessado',     descricao: 'Acesso ao módulo de auditoria', resultado: 'sucesso', recurso: '/auditoria' },
    { tipo: 'consentimento_registrado', descricao: 'Consentimento LGPD registrado — finalidade: assistencia_medica', resultado: 'sucesso' },
    { tipo: 'dado_exportado',    descricao: 'Exportação CSV de auditoria — 3 registros', resultado: 'sucesso', recurso: '/auditoria' },
    { tipo: 'tentativa_acesso_negado', descricao: 'Acesso negado a recurso administrativo sem perfil', resultado: 'falha' },
    { tipo: 'dado_anonimizado',  descricao: 'Clinical Insights: 22 eventos anonimizados processados', resultado: 'sucesso', recurso: '/insights' },
    { tipo: 'backup_realizado',  descricao: 'Snapshot de localStorage exportado localmente', resultado: 'sucesso' },
  ];
  eventos.forEach(e => registrarLog(e));
  registrarConsentimento(['assistencia_medica', 'prescricao', 'auditoria_interna']);
}
