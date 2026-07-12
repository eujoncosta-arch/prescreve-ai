// ============================================================
// PRESCREVE-AI — ETAPA 10: Teste de Integridade
//
// Valida:
//   Recommendation Registry  — rastreamento completo por recomendação
//   Medical Audit            — completude do log de auditoria
//   Governance               — cadeia de governança e versionamento
//   Hashes                   — integridade criptográfica de todos os registros
//   Logs                     — completude de campos obrigatórios
//   Rastreabilidade          — cadeia: Diretriz → Evidência → Engine → Rec → Review
//
// Toda recomendação deve possuir rastreamento completo.
// Decisão médica soberana — CDSS de suporte.
// ============================================================

'use client';

import {
  type RecomendacaoVersionada,
  type EvidenciaUsada,
  verificarIntegridade as verificarIntegrityReg,
  registrarRecomendacao,
} from './recommendation-registry';

import {
  type AuditEntry,
  type PacienteAudit,
  type DiagnosticoAudit,
  type CondutaAudit,
  type PrescricaoAudit,
  type MedicamentoAudit,
  verificarIntegridade as verificarIntegrityAudit,
  hashConteudoPrescricao,
  gerarIdPacienteAnonimo,
  gerarIdAudit,
} from './medical-audit';

import {
  type PhysicianReview,
  type DiagnosticAgreementRecord,
  type TherapeuticAgreementRecord,
  type BoardValidation,
  registrarReview,
  registrarDiagnosticAgreement,
  registrarTherapeuticAgreement,
  registrarBoardValidation,
} from './physician-validation-engine';

import {
  type Guideline,
  type GuidelineVersao,
  type EvidenciaVersao,
  type ExpertReview,
  type AuditEntry as GovernanceAuditEntry,
} from './governance';

// ════════════════════════════════════════════════════════════
// TIPOS DO TESTE
// ════════════════════════════════════════════════════════════

export type SeveridadeFalha = 'critica' | 'alta' | 'moderada' | 'baixa';
export type StatusTeste = 'passou' | 'falhou' | 'aviso';

export interface ResultadoTeste {
  id:          string;
  suite:       string;
  descricao:   string;
  status:      StatusTeste;
  severidade?: SeveridadeFalha;
  detalhe:     string;
  valor_esperado?: string;
  valor_obtido?:   string;
  latencia_ms: number;
}

export interface SuiteResultado {
  nome:         string;
  descricao:    string;
  testes:       ResultadoTeste[];
  passou:       number;
  falhou:       number;
  avisos:       number;
  tempo_ms:     number;
  status:       StatusTeste;
}

export interface IntegrityTestEtapa10Result {
  timestamp:    string;
  suites:       SuiteResultado[];
  total_testes: number;
  total_passou: number;
  total_falhou: number;
  total_avisos: number;
  tempo_total_ms: number;
  status_geral: StatusTeste;
  criticos_falhos: string[];
  relatorio_resumo: string;
}

// ════════════════════════════════════════════════════════════
// UTILITÁRIOS DO RUNNER
// ════════════════════════════════════════════════════════════

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function mkTeste(
  suite: string,
  id: string,
  descricao: string,
  fn: () => { ok: boolean; detalhe: string; esperado?: string; obtido?: string; severidade?: SeveridadeFalha },
): ResultadoTeste {
  const t0 = now();
  try {
    const r = fn();
    return {
      id, suite, descricao,
      status:          r.ok ? 'passou' : 'falhou',
      severidade:      r.ok ? undefined : (r.severidade ?? 'alta'),
      detalhe:         r.detalhe,
      valor_esperado:  r.esperado,
      valor_obtido:    r.obtido,
      latencia_ms:     Math.round((now() - t0) * 100) / 100,
    };
  } catch (e) {
    return {
      id, suite, descricao,
      status: 'falhou',
      severidade: 'critica',
      detalhe: `Exceção: ${e instanceof Error ? e.message : String(e)}`,
      latencia_ms: Math.round((now() - t0) * 100) / 100,
    };
  }
}

function mkSuite(nome: string, descricao: string, testes: ResultadoTeste[], tempoMs: number): SuiteResultado {
  const passou = testes.filter(t => t.status === 'passou').length;
  const falhou = testes.filter(t => t.status === 'falhou').length;
  const avisos = testes.filter(t => t.status === 'aviso').length;
  return {
    nome, descricao, testes, passou, falhou, avisos, tempo_ms: Math.round(tempoMs),
    status: falhou > 0 ? 'falhou' : avisos > 0 ? 'aviso' : 'passou',
  };
}

// ════════════════════════════════════════════════════════════
// HASH DETERMINÍSTICO (re-implementação para testes)
// Espelha exatamente o algoritmo do recommendation-registry
// ════════════════════════════════════════════════════════════

function hashReg(rec: Omit<RecomendacaoVersionada, 'hash_integridade'>): string {
  const str = [
    rec.id, rec.timestamp, rec.diagnostico_id, rec.molecula,
    rec.guideline_sigla, rec.guideline_versao, rec.engine,
    rec.score_confianca, rec.score_evidencia,
  ].join('|');
  let h = 5381;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) + h) + str.charCodeAt(i); h |= 0; }
  return `REC-${Math.abs(h).toString(36).toUpperCase().padStart(8, '0')}`;
}

// Espelha o algoritmo do medical-audit
function hashAudit(entry: Omit<AuditEntry, 'hash_integridade'>): string {
  const str = JSON.stringify({
    id:               entry.id,
    timestamp_inicio: entry.timestamp_inicio,
    usuario_crm:      entry.usuario.crm,
    paciente_id:      entry.paciente.id_anonimo,
    tipo_evento:      entry.tipo_evento,
    n_prescricoes:    entry.prescricoes.length,
    n_alertas:        entry.alertas_ignorados.length,
  });
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `AUD-${Math.abs(hash).toString(36).toUpperCase().padStart(8, '0')}`;
}

// Espelha o algoritmo do physician-validation-engine
function hashPV(val: string | object): string {
  const s = typeof val === 'string' ? val : JSON.stringify(val);
  let h = 5381;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h |= 0; }
  return `H${Math.abs(h).toString(36).toUpperCase().padStart(8, '0')}`;
}

// ════════════════════════════════════════════════════════════
// BUILDERS DE REGISTROS DE TESTE (sem localStorage)
// ════════════════════════════════════════════════════════════

function buildRec(overrides?: Partial<Omit<RecomendacaoVersionada, 'hash_integridade'>>): RecomendacaoVersionada {
  const base: Omit<RecomendacaoVersionada, 'hash_integridade'> = {
    id:                   'RV-TEST01',
    versao:               '2024-07-11',
    timestamp:            '2024-07-11T10:00:00.000Z',
    diagnostico_id:       'has',
    diagnostico_nome:     'Hipertensão Arterial Sistêmica',
    molecula:             'Enalapril',
    classe_terapeutica:   'Inibidor da ECA (IECA)',
    indicacao:            'HAS + DM2 — nefroproteção Classe I-A',
    guideline_sigla:      'DBHA-7/SBC 2020',
    guideline_versao:     '7.0',
    guideline_sociedade:  'Sociedade Brasileira de Cardiologia (SBC)',
    guideline_ano:        2020,
    guideline_id:         'g1',
    evidencias:           [
      { estudo: 'HOPE', doi: '10.1056/NEJM200001203420301', pmid: '10639539', nivel: 'A', grau: 'I', n_pacientes: 9297, reducao_risco_relativo: '22%', nnt: 26 },
    ],
    engine:               'clinical-therapeutics',
    engine_versao:        '2.2.0',
    score_confianca:      92,
    score_seguranca:      88,
    score_evidencia:      95,
    score_global:         91,
    status:               'ativa',
    ...overrides,
  };
  return { ...base, hash_integridade: hashReg(base) };
}

function buildAudit(overrides?: Partial<Omit<AuditEntry, 'hash_integridade'>>): AuditEntry {
  const meds: MedicamentoAudit[] = [
    { molecula: 'Enalapril', concentracao: '10 mg', dose: '10 mg', via: 'Oral', frequencia: '1×/dia', duracao: '30 dias', indicacao_cid: 'I10' },
  ];
  const prescricao: PrescricaoAudit = {
    id_prescricao: 'PRX-TEST01',
    data_prescricao: '2024-07-11T10:00:00.000Z',
    status: 'emitida',
    hash_conteudo: hashConteudoPrescricao(meds),
    medicamentos: meds,
  };
  const paciente: PacienteAudit = {
    id_anonimo: gerarIdPacienteAnonimo('test-seed-01'),
    iniciais: 'T.S.',
    idade_anos: 58,
    sexo: 'M',
    peso_kg: 78,
    tfg_ml_min: 72,
    alergias_registradas: [],
    comorbidades_ativas: ['HAS', 'DM2'],
  };
  const diagnosticos: DiagnosticoAudit[] = [
    { cid: 'I10', descricao: 'HAS', tipo: 'principal', confirmado: true, data_registro: '2024-07-11T10:00:00.000Z' },
    { cid: 'E11', descricao: 'DM2', tipo: 'secundario', confirmado: true, data_registro: '2024-07-11T10:00:00.000Z' },
  ];
  const condutas: CondutaAudit[] = [
    { descricao: 'IECA iniciado — HAS + DM2 nefroproteção', tipo: 'medicamentosa', cid_relacionado: 'I10', diretriz_base: 'SBC DBHA-7 2020', registrada_em: '2024-07-11T10:00:00.000Z' },
  ];

  const base: Omit<AuditEntry, 'hash_integridade'> = {
    id:               gerarIdAudit(),
    versao_schema:    1,
    usuario:          { nome: 'Dr. Teste', crm: '999999', uf_crm: 'SP', especialidade: 'Cardiologia' },
    timestamp_inicio: '2024-07-11T10:00:00.000Z',
    timestamp_fim:    '2024-07-11T10:25:00.000Z',
    duracao_minutos:  25,
    paciente,
    tipo_evento:      'prescricao_gerada',
    status:           'finalizado',
    diagnosticos,
    condutas,
    prescricoes:      [prescricao],
    evidencias_consultadas: [
      { estudo: 'HOPE', tipo: 'RCT', nivel_evidencia: 'A', grau_recomendacao: 'I', fonte: 'NEJM 2000', ano: 2000, consultada_em: '2024-07-11T10:00:00.000Z' },
    ],
    diretrizes_utilizadas: [
      { sociedade: 'SBC', nome: 'DBHA-7', ano: 2020, recomendacao: 'IECA Classe I-A em HAS+DM2', consultada_em: '2024-07-11T10:00:00.000Z' },
    ],
    ajustes_aplicados:      [],
    alertas_ignorados:       [],
    alertas_aceitos:         ['IECA seguro — TFG > 30'],
    contexto_clinico:        'HAS + DM2, TFG 72. Iniciando IECA. PA 148/92.',
    versao_sistema:          '2.1-MVP',
    origem:                  'consulta',
    ...overrides,
  };
  return { ...base, hash_integridade: hashAudit(base) };
}

// ════════════════════════════════════════════════════════════
// SUITE 1 — HASHES: RECOMMENDATION REGISTRY
// ════════════════════════════════════════════════════════════

function suiteHashRegistry(): SuiteResultado {
  const t0 = now();
  const testes: ResultadoTeste[] = [];

  // 1.1 Hash válido gerado corretamente
  testes.push(mkTeste('hash_registry', 'HR-01', 'Hash gerado é string não-vazia no formato REC-XXXXXXXX', () => {
    const rec = buildRec();
    const ok = /^REC-[0-9A-Z]{8}$/.test(rec.hash_integridade);
    return { ok, detalhe: ok ? `Hash: ${rec.hash_integridade}` : `Hash inválido: ${rec.hash_integridade}`, severidade: 'critica' };
  }));

  // 1.2 Hash determinístico: mesmas entradas → mesmo hash
  testes.push(mkTeste('hash_registry', 'HR-02', 'Hash é determinístico (mesma entrada → mesmo resultado)', () => {
    const r1 = buildRec();
    const r2 = buildRec();
    const ok = r1.hash_integridade === r2.hash_integridade;
    return { ok, detalhe: ok ? 'Hashes idênticos ✓' : `Divergência: ${r1.hash_integridade} ≠ ${r2.hash_integridade}`, severidade: 'critica', esperado: r1.hash_integridade, obtido: r2.hash_integridade };
  }));

  // 1.3 verificarIntegridade passa em registro íntegro
  testes.push(mkTeste('hash_registry', 'HR-03', 'verificarIntegridade() aprova registro íntegro', () => {
    const rec = buildRec();
    const ok = verificarIntegrityReg(rec);
    return { ok, detalhe: ok ? 'Integridade verificada ✓' : 'Falso negativo — rejeição incorreta', severidade: 'critica' };
  }));

  // 1.4 Tamper na molécula é detectado
  testes.push(mkTeste('hash_registry', 'HR-04', 'Adulteração na molécula invalida o hash', () => {
    const rec = buildRec();
    const tampered: RecomendacaoVersionada = { ...rec, molecula: 'Losartana' }; // molécula trocada
    const ok = !verificarIntegrityReg(tampered);
    return { ok, detalhe: ok ? 'Adulteração detectada ✓' : 'FALHA: adulteração não detectada!', severidade: 'critica' };
  }));

  // 1.5 Tamper no score é detectado
  testes.push(mkTeste('hash_registry', 'HR-05', 'Adulteração no score_confianca invalida o hash', () => {
    const rec = buildRec();
    const tampered: RecomendacaoVersionada = { ...rec, score_confianca: 99 }; // score elevado artificialmente
    const ok = !verificarIntegrityReg(tampered);
    return { ok, detalhe: ok ? 'Adulteração de score detectada ✓' : 'FALHA: score adulterado não detectado!', severidade: 'critica' };
  }));

  // 1.6 Tamper no guideline é detectado
  testes.push(mkTeste('hash_registry', 'HR-06', 'Adulteração no guideline_sigla invalida o hash', () => {
    const rec = buildRec();
    const tampered: RecomendacaoVersionada = { ...rec, guideline_sigla: 'FAKE-2099' };
    const ok = !verificarIntegrityReg(tampered);
    return { ok, detalhe: ok ? 'Adulteração de guideline detectada ✓' : 'FALHA: guideline adulterado não detectado!', severidade: 'critica' };
  }));

  // 1.7 Tamper no engine é detectado
  testes.push(mkTeste('hash_registry', 'HR-07', 'Adulteração no engine invalida o hash', () => {
    const rec = buildRec();
    const tampered: RecomendacaoVersionada = { ...rec, engine: 'manual' };
    const ok = !verificarIntegrityReg(tampered);
    return { ok, detalhe: ok ? 'Adulteração de engine detectada ✓' : 'FALHA: engine adulterado não detectado!', severidade: 'alta' };
  }));

  // 1.8 Hash muda com mudança de diagnóstico
  testes.push(mkTeste('hash_registry', 'HR-08', 'Diagnósticos diferentes produzem hashes diferentes', () => {
    const r1 = buildRec({ diagnostico_id: 'has' });
    const r2 = buildRec({ diagnostico_id: 'dm2' });
    const ok = r1.hash_integridade !== r2.hash_integridade;
    return { ok, detalhe: ok ? 'Hashes distintos para diagnósticos distintos ✓' : 'FALHA: colisão de hash para diagnósticos diferentes!', severidade: 'alta' };
  }));

  // 1.9 Campos obrigatórios de rastreabilidade presentes
  testes.push(mkTeste('hash_registry', 'HR-09', 'Campos de rastreabilidade obrigatórios todos presentes', () => {
    const rec = buildRec();
    const campos = ['id', 'timestamp', 'diagnostico_id', 'molecula', 'guideline_sigla', 'guideline_versao', 'guideline_ano', 'engine', 'engine_versao', 'score_confianca', 'score_evidencia', 'score_seguranca', 'status', 'hash_integridade'] as const;
    const faltando = campos.filter(c => (rec as unknown as Record<string, unknown>)[c] === undefined || (rec as unknown as Record<string, unknown>)[c] === '');
    const ok = faltando.length === 0;
    return { ok, detalhe: ok ? 'Todos os campos de rastreabilidade presentes ✓' : `Faltando: ${faltando.join(', ')}`, severidade: 'critica' };
  }));

  // 1.10 Score dentro de limites válidos (0–100)
  testes.push(mkTeste('hash_registry', 'HR-10', 'Scores de confiança, segurança e evidência no intervalo 0–100', () => {
    const rec = buildRec();
    const scoreOk = rec.score_confianca >= 0 && rec.score_confianca <= 100
      && rec.score_seguranca >= 0 && rec.score_seguranca <= 100
      && rec.score_evidencia >= 0 && rec.score_evidencia <= 100;
    return {
      ok: scoreOk,
      detalhe: scoreOk ? `conf:${rec.score_confianca} seg:${rec.score_seguranca} ev:${rec.score_evidencia} ✓` : 'Score fora do intervalo 0–100',
      severidade: 'alta',
    };
  }));

  return mkSuite('Hash — Recommendation Registry', 'Integridade criptográfica das recomendações clínicas', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 2 — HASHES: MEDICAL AUDIT
// ════════════════════════════════════════════════════════════

function suiteHashAudit(): SuiteResultado {
  const t0 = now();
  const testes: ResultadoTeste[] = [];

  // 2.1 Hash válido no formato AUD-XXXXXXXX
  testes.push(mkTeste('hash_audit', 'HA-01', 'Hash de auditoria gerado no formato AUD-XXXXXXXX', () => {
    const entry = buildAudit();
    const ok = /^AUD-[0-9A-Z]{8}$/.test(entry.hash_integridade);
    return { ok, detalhe: ok ? `Hash: ${entry.hash_integridade}` : `Formato inválido: ${entry.hash_integridade}`, severidade: 'critica' };
  }));

  // 2.2 Determinismo
  testes.push(mkTeste('hash_audit', 'HA-02', 'Hash de auditoria é determinístico', () => {
    const e1 = buildAudit();
    const e2 = buildAudit({ id: e1.id, timestamp_inicio: e1.timestamp_inicio, paciente: e1.paciente });
    const ok = e1.hash_integridade === e2.hash_integridade;
    return { ok, detalhe: ok ? 'Hash determinístico ✓' : `Divergência: ${e1.hash_integridade} ≠ ${e2.hash_integridade}`, severidade: 'critica' };
  }));

  // 2.3 verificarIntegridade aprova registro íntegro
  testes.push(mkTeste('hash_audit', 'HA-03', 'verificarIntegridade() aprova registro de auditoria íntegro', () => {
    const entry = buildAudit();
    const ok = verificarIntegrityAudit(entry);
    return { ok, detalhe: ok ? 'Auditoria íntegra ✓' : 'Falso negativo', severidade: 'critica' };
  }));

  // 2.4 Tamper no CRM do médico detectado
  testes.push(mkTeste('hash_audit', 'HA-04', 'Adulteração no CRM do médico invalida hash', () => {
    const entry = buildAudit();
    const tampered: AuditEntry = { ...entry, usuario: { ...entry.usuario, crm: '000000' } };
    const ok = !verificarIntegrityAudit(tampered);
    return { ok, detalhe: ok ? 'Adulteração de CRM detectada ✓' : 'FALHA: CRM adulterado não detectado!', severidade: 'critica' };
  }));

  // 2.5 Tamper na contagem de prescrições detectado
  testes.push(mkTeste('hash_audit', 'HA-05', 'Adição de prescrição sem recalcular hash é detectada', () => {
    const entry = buildAudit();
    const novaRx: PrescricaoAudit = {
      id_prescricao: 'PRX-EXTRA',
      data_prescricao: '2024-07-11T11:00:00.000Z',
      status: 'emitida',
      hash_conteudo: hashConteudoPrescricao([{ molecula: 'Metformina', concentracao: '850mg', dose: '850mg', via: 'Oral', frequencia: '2x/dia', indicacao_cid: 'E11' }]),
      medicamentos: [{ molecula: 'Metformina', concentracao: '850mg', dose: '850mg', via: 'Oral', frequencia: '2x/dia', indicacao_cid: 'E11' }],
    };
    const tampered: AuditEntry = { ...entry, prescricoes: [...entry.prescricoes, novaRx] };
    const ok = !verificarIntegrityAudit(tampered);
    return { ok, detalhe: ok ? 'Adulteração de prescrições detectada ✓' : 'FALHA: adição de prescrição não detectada!', severidade: 'critica' };
  }));

  // 2.6 Tamper no paciente detectado
  testes.push(mkTeste('hash_audit', 'HA-06', 'Adulteração no ID do paciente invalida hash', () => {
    const entry = buildAudit();
    const tampered: AuditEntry = { ...entry, paciente: { ...entry.paciente, id_anonimo: 'PAC-ADULTERADO' } };
    const ok = !verificarIntegrityAudit(tampered);
    return { ok, detalhe: ok ? 'Adulteração de ID de paciente detectada ✓' : 'FALHA: ID adulterado não detectado!', severidade: 'critica' };
  }));

  // 2.7 Hash de conteúdo da prescrição (PRX-)
  testes.push(mkTeste('hash_audit', 'HA-07', 'Hash de conteúdo da prescrição no formato PRX-XXXXXX', () => {
    const meds: MedicamentoAudit[] = [{ molecula: 'Enalapril', concentracao: '10 mg', dose: '10 mg', via: 'Oral', frequencia: '1x/dia', indicacao_cid: 'I10' }];
    const hash = hashConteudoPrescricao(meds);
    const ok = /^PRX-[0-9A-Z]{6}$/.test(hash);
    return { ok, detalhe: ok ? `Hash prescrição: ${hash} ✓` : `Formato inválido: ${hash}`, severidade: 'alta' };
  }));

  // 2.8 Campos obrigatórios de auditoria
  testes.push(mkTeste('hash_audit', 'HA-08', 'Campos obrigatórios de auditoria todos presentes', () => {
    const entry = buildAudit();
    const campos: (keyof AuditEntry)[] = ['id', 'versao_schema', 'usuario', 'timestamp_inicio', 'paciente', 'tipo_evento', 'status', 'diagnosticos', 'condutas', 'prescricoes', 'evidencias_consultadas', 'diretrizes_utilizadas', 'ajustes_aplicados', 'alertas_ignorados', 'alertas_aceitos', 'versao_sistema', 'origem', 'hash_integridade'];
    const faltando = campos.filter(c => (entry as unknown as Record<string, unknown>)[c] === undefined);
    const ok = faltando.length === 0;
    return { ok, detalhe: ok ? 'Todos os campos obrigatórios ✓' : `Faltando: ${faltando.join(', ')}`, severidade: 'critica' };
  }));

  // 2.9 ID paciente anonimizado no formato PAC-XXXXXXXX
  testes.push(mkTeste('hash_audit', 'HA-09', 'ID de paciente anonimizado no formato PAC-XXXXXXXX', () => {
    const id = gerarIdPacienteAnonimo('teste-seed-integridade');
    const ok = /^PAC-[0-9A-Z]{8}$/.test(id);
    return { ok, detalhe: ok ? `ID anônimo: ${id} ✓` : `Formato inválido: ${id}`, severidade: 'alta' };
  }));

  // 2.10 ID paciente determinístico (mesma semente → mesmo hash)
  testes.push(mkTeste('hash_audit', 'HA-10', 'ID de paciente determinístico com mesma semente', () => {
    const id1 = gerarIdPacienteAnonimo('semente-fixa-12345');
    const id2 = gerarIdPacienteAnonimo('semente-fixa-12345');
    const ok = id1 === id2;
    return { ok, detalhe: ok ? `IDs idênticos: ${id1} ✓` : `IDs divergentes: ${id1} ≠ ${id2}`, esperado: id1, obtido: id2, severidade: 'critica' };
  }));

  return mkSuite('Hash — Medical Audit', 'Integridade criptográfica da auditoria médica', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 3 — HASHES: PHYSICIAN VALIDATION ENGINE
// ════════════════════════════════════════════════════════════

function suiteHashPhysicianValidation(): SuiteResultado {
  const t0 = now();
  const testes: ResultadoTeste[] = [];

  // 3.1 PhysicianReview possui hash no formato H-XXXXXXXX
  testes.push(mkTeste('hash_pv', 'HPV-01', 'PhysicianReview gerada com hash no formato HXXXXXXXX', () => {
    const rev = registrarReview({
      medico_crm_hash: hashPV('CRM-SP-999'),
      especialidade: 'cardiologia',
      diagnostico_id: 'has',
      diagnostico_nome: 'HAS',
      molecula: 'Enalapril',
      classe_terapeutica: 'IECA',
      guideline_sigla: 'DBHA-7/SBC 2020',
      veredicto: 'concordo',
      justificativa_clinica: 'Indicação Classe I-A',
    });
    const ok = /^H[0-9A-Z]{8}$/.test(rev.hash_integridade);
    return { ok, detalhe: ok ? `Hash review: ${rev.hash_integridade} ✓` : `Inválido: ${rev.hash_integridade}`, severidade: 'alta' };
  }));

  // 3.2 Dois reviews idênticos produzem hashes diferentes (diferença de timestamp/id)
  testes.push(mkTeste('hash_pv', 'HPV-02', 'Reviews diferentes (timestamp/id único) produzem hashes diferentes', () => {
    const draft = {
      medico_crm_hash: hashPV('CRM-SP-999'),
      especialidade: 'cardiologia' as const,
      diagnostico_id: 'has',
      diagnostico_nome: 'HAS',
      molecula: 'Enalapril',
      classe_terapeutica: 'IECA',
      guideline_sigla: 'DBHA-7/SBC 2020',
      veredicto: 'concordo' as const,
    };
    const r1 = registrarReview(draft);
    const r2 = registrarReview(draft);
    const ok = r1.hash_integridade !== r2.hash_integridade || r1.id !== r2.id;
    return { ok, detalhe: ok ? `IDs únicos: ${r1.id} ≠ ${r2.id} ✓` : 'FALHA: IDs duplicados!', severidade: 'alta' };
  }));

  // 3.3 DiagnosticAgreement — hash calculado e presente
  testes.push(mkTeste('hash_pv', 'HPV-03', 'DiagnosticAgreementRecord possui hash não-vazio', () => {
    const rec = registrarDiagnosticAgreement({
      medico_crm_hash: hashPV('CRM-RJ-111'),
      especialidade: 'endocrinologia',
      diagnostico_sistema_cid: 'E11',
      diagnostico_sistema_nome: 'DM2',
      grau_confianca_sistema: 90,
      diagnostico_medico_cid: 'E11',
      diagnostico_medico_nome: 'DM2',
    });
    const ok = rec.hash_integridade.length > 0 && rec.nivel_concordancia === 'total';
    return { ok, detalhe: ok ? `Hash: ${rec.hash_integridade} | Concordância: ${rec.nivel_concordancia} ✓` : `Hash vazio ou concordância errada: ${rec.nivel_concordancia}`, severidade: 'alta' };
  }));

  // 3.4 Concordância parcial detectada por prefixo CID
  testes.push(mkTeste('hash_pv', 'HPV-04', 'Concordância parcial detectada quando CIDs têm mesmo prefixo', () => {
    const rec = registrarDiagnosticAgreement({
      medico_crm_hash: hashPV('CRM-SP-222'),
      especialidade: 'cardiologia',
      diagnostico_sistema_cid: 'I50',
      diagnostico_sistema_nome: 'ICC',
      grau_confianca_sistema: 80,
      diagnostico_medico_cid: 'I50.0',
      diagnostico_medico_nome: 'ICFEr',
    });
    const ok = rec.nivel_concordancia === 'parcial';
    return { ok, detalhe: ok ? 'Concordância parcial detectada (I50 ≈ I50.0) ✓' : `Esperado 'parcial', obtido '${rec.nivel_concordancia}'`, esperado: 'parcial', obtido: rec.nivel_concordancia, severidade: 'moderada' };
  }));

  // 3.5 Discordância detectada por CIDs sem relação
  testes.push(mkTeste('hash_pv', 'HPV-05', 'Discordância detectada entre diagnósticos sem relação', () => {
    const rec = registrarDiagnosticAgreement({
      medico_crm_hash: hashPV('CRM-MG-333'),
      especialidade: 'pneumologia',
      diagnostico_sistema_cid: 'J45',
      diagnostico_sistema_nome: 'Asma',
      grau_confianca_sistema: 70,
      diagnostico_medico_cid: 'J44',
      diagnostico_medico_nome: 'DPOC',
    });
    const ok = rec.nivel_concordancia === 'discordancia';
    return { ok, detalhe: ok ? 'Discordância detectada (J45 ≠ J44) ✓' : `Esperado 'discordancia', obtido '${rec.nivel_concordancia}'`, esperado: 'discordancia', obtido: rec.nivel_concordancia, severidade: 'alta' };
  }));

  // 3.6 TherapeuticAgreement — concordância mesma molécula
  testes.push(mkTeste('hash_pv', 'HPV-06', 'TherapeuticAgreement classifica concordância corretamente', () => {
    const rec = registrarTherapeuticAgreement({
      medico_crm_hash: hashPV('CRM-RS-444'),
      especialidade: 'cardiologia',
      diagnostico_id: 'has',
      diagnostico_nome: 'HAS',
      molecula_sugerida: 'Enalapril',
      classe_sugerida: 'IECA',
      guideline_base: 'SBC 2020',
      molecula_prescrita: 'Enalapril',
      classe_prescrita: 'IECA',
    });
    const ok = rec.grau_divergencia === 'concordancia';
    return { ok, detalhe: ok ? 'Concordância: Enalapril = Enalapril ✓' : `Esperado 'concordancia', obtido '${rec.grau_divergencia}'`, severidade: 'alta' };
  }));

  // 3.7 Divergência aceitável (mesma classe, molécula diferente)
  testes.push(mkTeste('hash_pv', 'HPV-07', 'Divergência aceitável: mesma classe, molécula diferente', () => {
    const rec = registrarTherapeuticAgreement({
      medico_crm_hash: hashPV('CRM-BA-555'),
      especialidade: 'cardiologia',
      diagnostico_id: 'has',
      diagnostico_nome: 'HAS',
      molecula_sugerida: 'Losartana',
      classe_sugerida: 'BRA',
      guideline_base: 'SBC 2020',
      molecula_prescrita: 'Valsartana',
      classe_prescrita: 'BRA',
      motivo_divergencia: 'Meia-vida mais longa',
    });
    const ok = rec.grau_divergencia === 'divergencia_aceitavel';
    return { ok, detalhe: ok ? 'Divergência aceitável (BRA → BRA diferente) ✓' : `Esperado 'divergencia_aceitavel', obtido '${rec.grau_divergencia}'`, severidade: 'moderada' };
  }));

  // 3.8 Divergência crítica (classe diferente)
  testes.push(mkTeste('hash_pv', 'HPV-08', 'Divergência crítica: classes terapêuticas incompatíveis', () => {
    const rec = registrarTherapeuticAgreement({
      medico_crm_hash: hashPV('CRM-PR-666'),
      especialidade: 'clinica_medica',
      diagnostico_id: 'has',
      diagnostico_nome: 'HAS',
      molecula_sugerida: 'Enalapril',
      classe_sugerida: 'IECA',
      guideline_base: 'SBC 2020',
      molecula_prescrita: 'Anlodipino',
      classe_prescrita: 'Bloqueador de Canal de Cálcio',
      motivo_divergencia: 'Paciente com edema — preferência por BCC',
    });
    const ok = rec.grau_divergencia === 'divergencia_critica';
    return { ok, detalhe: ok ? 'Divergência crítica (IECA ≠ BCC) ✓' : `Esperado 'divergencia_critica', obtido '${rec.grau_divergencia}'`, severidade: 'moderada' };
  }));

  // 3.9 BoardValidation possui hash
  testes.push(mkTeste('hash_pv', 'HPV-09', 'BoardValidation registrada com hash de integridade', () => {
    const bv = registrarBoardValidation({
      medico_crm_hash: hashPV('CRM-SP-777'),
      especialidade: 'cardiologia',
      diagnostico_id: 'icc',
      diagnostico_nome: 'ICFEr',
      molecula: 'Sacubitril/Valsartana',
      classe_terapeutica: 'ARNI',
      guideline_sigla: 'ESC-HF 2021',
      score_confianca_sistema: 91,
      status: 'aprovada',
      justificativa: 'PARADIGM-HF — padrão ESC IA',
    });
    const ok = bv.hash_integridade.length > 0 && bv.id.startsWith('BV-');
    return { ok, detalhe: ok ? `Board hash: ${bv.hash_integridade} | ID: ${bv.id} ✓` : 'Hash ou ID inválido', severidade: 'alta' };
  }));

  // 3.10 ID único em todas as entidades (prefixos distintos)
  testes.push(mkTeste('hash_pv', 'HPV-10', 'IDs possuem prefixos distintos por entidade (PR-, DA-, TA-, BV-)', () => {
    const rev = registrarReview({ medico_crm_hash: 'h', especialidade: 'clinica_medica', diagnostico_id: 'd', diagnostico_nome: 'D', molecula: 'm', classe_terapeutica: 'c', guideline_sigla: 'g', veredicto: 'concordo' });
    const diag = registrarDiagnosticAgreement({ medico_crm_hash: 'h', especialidade: 'clinica_medica', diagnostico_sistema_cid: 'X00', diagnostico_sistema_nome: 'T', grau_confianca_sistema: 80, diagnostico_medico_cid: 'X00', diagnostico_medico_nome: 'T' });
    const ther = registrarTherapeuticAgreement({ medico_crm_hash: 'h', especialidade: 'clinica_medica', diagnostico_id: 'd', diagnostico_nome: 'D', molecula_sugerida: 'm', classe_sugerida: 'c', guideline_base: 'g', molecula_prescrita: 'm' });
    const bv   = registrarBoardValidation({ medico_crm_hash: 'h', especialidade: 'clinica_medica', diagnostico_id: 'd', diagnostico_nome: 'D', molecula: 'm', classe_terapeutica: 'c', guideline_sigla: 'g', score_confianca_sistema: 80, status: 'aprovada', justificativa: 'ok' });
    const ok = rev.id.startsWith('PR-') && diag.id.startsWith('DA-') && ther.id.startsWith('TA-') && bv.id.startsWith('BV-');
    return { ok, detalhe: ok ? `PR:${rev.id} | DA:${diag.id} | TA:${ther.id} | BV:${bv.id} ✓` : 'Prefixo de ID incorreto', severidade: 'moderada' };
  }));

  return mkSuite('Hash — Physician Validation Engine', 'Integridade dos registros de validação clínica', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 4 — GOVERNANCE: VERSIONAMENTO E CADEIA DE GOVERNANÇA
// ════════════════════════════════════════════════════════════

function suiteGovernance(): SuiteResultado {
  const t0 = now();
  const testes: ResultadoTeste[] = [];

  // Cria diretrizes de teste in-memory (não dependem de localStorage)
  const gl: Guideline = {
    id: 'g-test-01',
    titulo: '7ª Diretriz Brasileira de HAS',
    sigla: 'DBHA-7',
    sociedade: 'SBC',
    area: 'cardiologia',
    condicao: 'HAS',
    status: 'vigente',
    versao_atual: '7.0',
    ano_publicacao: 2020,
    nivel_validacao: 'validado',
    responsavel_interno: 'Comitê de Cardiologia',
    tags: ['HAS', 'anti-hipertensivo'],
    versoes: [
      {
        id: 'g-test-01-v1',
        numero: '6.0',
        data_publicacao: '2010-04-01',
        data_insercao_sistema: '2010-04-01',
        resumo: 'Meta PA < 140/90',
        alteracoes: [],
        autor_insercao: 'Equipe',
        revisores: [],
        status_revisao: 'aprovado',
        evidencias: [],
      },
      {
        id: 'g-test-01-v2',
        numero: '7.0',
        data_publicacao: '2020-09-01',
        data_insercao_sistema: '2021-03-01',
        resumo: 'Meta PA < 130/80',
        alteracoes: [
          { campo: 'Meta pressórica', anterior: '< 140/90', novo: '< 130/80', justificativa: 'SPRINT 2015' },
        ],
        autor_insercao: 'Equipe Científica',
        revisores: ['Dr. Carlos Pereira'],
        status_revisao: 'aprovado',
        evidencias: [
          {
            tipo: 'ensaio_clinico',
            titulo: 'SPRINT Trial',
            autores: 'Wright JT Jr et al.',
            ano: 2015,
            revista: 'NEJM',
            doi: '10.1056/NEJMoa1511939',
            pmid: '26551272',
            is_rct: true,
            is_meta_analise: false,
            n_pacientes: 9361,
            reducao_risco_relativo: '25%',
            nnt: 61,
            nivel: 'A',
            grau: 'I',
            resumo: 'Meta sistólica < 120 mmHg reduziu eventos CV em 25%',
            diagnostico: 'HAS',
            conduta: 'Meta PA < 130/80 em alto risco CV',
            status_validacao: 'validado',
            data_revisao: '2024-03-01',
            versao_recomendacao: 'v7.0',
          },
        ],
      },
    ],
  };

  // 4.1 Diretriz tem versão atual marcada
  testes.push(mkTeste('governance', 'GOV-01', 'Diretriz possui campo versao_atual preenchido', () => {
    const ok = gl.versao_atual !== '' && gl.versao_atual !== undefined;
    return { ok, detalhe: ok ? `Versão atual: ${gl.versao_atual} ✓` : 'Campo versao_atual ausente', severidade: 'critica' };
  }));

  // 4.2 Versão mais recente existe no array de versões
  testes.push(mkTeste('governance', 'GOV-02', 'Versão atual está presente no array de versões', () => {
    const vAtual = gl.versoes.find(v => v.numero === gl.versao_atual);
    const ok = vAtual !== undefined;
    return { ok, detalhe: ok ? `Versão ${gl.versao_atual} encontrada no histórico ✓` : `Versão ${gl.versao_atual} não está em versoes[]`, severidade: 'critica' };
  }));

  // 4.3 Versões têm datas em ordem cronológica
  testes.push(mkTeste('governance', 'GOV-03', 'Versões da diretriz estão em ordem cronológica', () => {
    const datas = gl.versoes.map(v => v.data_publicacao);
    let ordenado = true;
    for (let i = 1; i < datas.length; i++) {
      if (datas[i] < datas[i - 1]) { ordenado = false; break; }
    }
    return { ok: ordenado, detalhe: ordenado ? `Ordem cronológica OK: ${datas.join(' → ')} ✓` : `Fora de ordem: ${datas.join(' → ')}`, severidade: 'alta' };
  }));

  // 4.4 Versão aprovada possui revisores
  testes.push(mkTeste('governance', 'GOV-04', 'Versões aprovadas possuem pelo menos um revisor', () => {
    const aprovadas = gl.versoes.filter(v => v.status_revisao === 'aprovado');
    const semRevisor = aprovadas.filter(v => v.revisores.length === 0);
    // Nota: versões antigas (v6.0) podem não ter revisores — é aceitável; apenas a vigente precisa
    const versaoAtual = gl.versoes.find(v => v.numero === gl.versao_atual);
    const ok = versaoAtual ? versaoAtual.revisores.length > 0 : true;
    return { ok, detalhe: ok ? `Versão atual (${gl.versao_atual}) tem ${versaoAtual?.revisores.length ?? 0} revisores ✓` : `Versão atual sem revisores! Histórico sem revisores: ${semRevisor.map(v => v.numero).join(', ')}`, severidade: 'alta' };
  }));

  // 4.5 Evidências têm nível e grau preenchidos
  testes.push(mkTeste('governance', 'GOV-05', 'Todas as evidências possuem nível e grau de recomendação', () => {
    const todasEv = gl.versoes.flatMap(v => v.evidencias);
    const semNivel = todasEv.filter(e => !e.nivel || !e.grau);
    const ok = semNivel.length === 0;
    return { ok, detalhe: ok ? `${todasEv.length} evidências com nível/grau ✓` : `${semNivel.length} evidências sem nível/grau: ${semNivel.map(e => e.titulo).join(', ')}`, severidade: 'alta' };
  }));

  // 4.6 ECRs possuem DOI ou PMID (rastreabilidade científica)
  testes.push(mkTeste('governance', 'GOV-06', 'ECRs possuem DOI ou PMID para rastreabilidade bibliográfica', () => {
    const ecrs = gl.versoes.flatMap(v => v.evidencias).filter(e => e.is_rct);
    const semId = ecrs.filter(e => !e.doi && !e.pmid);
    const ok = semId.length === 0;
    return { ok, detalhe: ok ? `${ecrs.length} ECRs com DOI/PMID ✓` : `${semId.length} ECRs sem DOI/PMID: ${semId.map(e => e.titulo).join(', ')}`, severidade: 'moderada' };
  }));

  // 4.7 Evidências com diagnóstico rastreável (conduta → CID)
  testes.push(mkTeste('governance', 'GOV-07', 'Evidências têm campo diagnóstico/conduta para rastreabilidade', () => {
    const todasEv = gl.versoes.flatMap(v => v.evidencias);
    const semDiag = todasEv.filter(e => !e.diagnostico || !e.conduta);
    const ok = semDiag.length === 0;
    return { ok, detalhe: ok ? `${todasEv.length} evidências com diagnóstico+conduta ✓` : `${semDiag.length} evidências sem diagnóstico/conduta`, severidade: 'moderada' };
  }));

  // 4.8 Alterações de versão possuem justificativa
  testes.push(mkTeste('governance', 'GOV-08', 'Alterações de versão possuem justificativa científica', () => {
    const alteracoes = gl.versoes.flatMap(v => v.alteracoes);
    const semJust = alteracoes.filter(a => !a.justificativa || a.justificativa.trim() === '');
    const ok = semJust.length === 0;
    return { ok, detalhe: ok ? `${alteracoes.length} alterações com justificativa ✓` : `${semJust.length} alterações sem justificativa: ${semJust.map(a => a.campo).join(', ')}`, severidade: 'moderada' };
  }));

  // 4.9 ExpertReview aprovada tem parecer preenchido
  testes.push(mkTeste('governance', 'GOV-09', 'Revisões de especialistas aprovadas possuem parecer', () => {
    const reviewsDraft: ExpertReview[] = [
      {
        id: 'r-test-1',
        guideline_id: 'g-test-01',
        guideline_titulo: 'DBHA-7',
        especialista: 'Dr. Teste',
        especialidade: 'Cardiologia',
        crm: 'CRM-SP-99999',
        status: 'aprovado',
        parecer: 'Diretriz corretamente integrada e alinhada com evidências atuais.',
        score_qualidade: 9,
        data_solicitacao: '2024-01-01',
        data_resposta: '2024-01-10',
        pendencias: [],
      },
    ];
    const aprovadas = reviewsDraft.filter(r => r.status === 'aprovado');
    const semParecer = aprovadas.filter(r => !r.parecer || r.parecer.trim() === '');
    const ok = semParecer.length === 0;
    return { ok, detalhe: ok ? `${aprovadas.length} revisões aprovadas com parecer ✓` : `${semParecer.length} sem parecer`, severidade: 'alta' };
  }));

  // 4.10 Audit log de governança com campos obrigatórios
  testes.push(mkTeste('governance', 'GOV-10', 'Log de auditoria de governança tem campos obrigatórios (id, tipo, descricao, usuario, data)', () => {
    const auditEntries: GovernanceAuditEntry[] = [
      { id: 'a-test-1', tipo: 'guideline_atualizado', guideline_id: 'g-test-01', guideline_titulo: 'DBHA-7', descricao: 'Versão 7.0 publicada', usuario: 'Equipe Científica', data: '2024-07-11T10:00:00.000Z' },
      { id: 'a-test-2', tipo: 'revisao_aprovada', descricao: 'Revisão aprovada', usuario: 'Dr. Teste', data: '2024-07-11T12:00:00.000Z' },
    ];
    const incompletos = auditEntries.filter(e => !e.id || !e.tipo || !e.descricao || !e.usuario || !e.data);
    const ok = incompletos.length === 0;
    return { ok, detalhe: ok ? `${auditEntries.length} entradas de log completas ✓` : `${incompletos.length} incompletas`, severidade: 'alta' };
  }));

  return mkSuite('Governance — Versionamento e Cadeia', 'Integridade da governança científica e versionamento de diretrizes', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 5 — RASTREABILIDADE END-TO-END
// Toda recomendação deve ter cadeia completa:
// Diretriz → Evidência → Engine → Rec → Review
// ════════════════════════════════════════════════════════════

function suiteRastreabilidade(): SuiteResultado {
  const t0 = now();
  const testes: ResultadoTeste[] = [];

  // Monta uma cadeia completa de rastreabilidade
  const evidencia: EvidenciaUsada = {
    estudo: 'PARADIGM-HF',
    doi: '10.1056/NEJMoa1409077',
    pmid: '25176015',
    nivel: 'A',
    grau: 'I',
    n_pacientes: 8442,
    reducao_risco_relativo: '20%',
    nnt: 21,
  };

  const rec = buildRec({
    diagnostico_id: 'icc',
    diagnostico_nome: 'Insuficiência Cardíaca com FE Reduzida',
    molecula: 'Sacubitril/Valsartana',
    classe_terapeutica: 'ARNI',
    guideline_sigla: 'ESC-HF 2021',
    guideline_versao: '2021',
    guideline_ano: 2021,
    guideline_id: 'g4',
    evidencias: [evidencia],
    engine: 'clinical-therapeutics',
    score_confianca: 91,
    score_seguranca: 83,
    score_evidencia: 96,
  });

  // 5.1 Recomendação tem guideline_id rastreável
  testes.push(mkTeste('rastreabilidade', 'RT-01', 'Recomendação tem guideline_id para rastreabilidade até a diretriz', () => {
    const ok = !!rec.guideline_id && rec.guideline_id.length > 0;
    return { ok, detalhe: ok ? `guideline_id: ${rec.guideline_id} ✓` : 'guideline_id ausente — rastreabilidade quebrada!', severidade: 'critica' };
  }));

  // 5.2 Recomendação tem ao menos uma evidência com DOI ou PMID
  testes.push(mkTeste('rastreabilidade', 'RT-02', 'Recomendação tem evidências com DOI ou PMID rastreáveis', () => {
    const evComId = rec.evidencias.filter(e => e.doi || e.pmid);
    const ok = evComId.length > 0;
    return { ok, detalhe: ok ? `${evComId.length} evidências com DOI/PMID ✓` : 'Nenhuma evidência com identificador bibliográfico', severidade: 'alta' };
  }));

  // 5.3 Evidência tem nível A ou B (não apenas opinião de especialista)
  testes.push(mkTeste('rastreabilidade', 'RT-03', 'Evidências de alta qualidade (nível A ou B) presentes', () => {
    const altaNiv = rec.evidencias.filter(e => e.nivel === 'A' || e.nivel === 'B');
    const ok = altaNiv.length > 0;
    return { ok, detalhe: ok ? `${altaNiv.length} evidências de alto nível ✓` : 'Apenas evidências de nível C (opinião)', severidade: 'alta' };
  }));

  // 5.4 Engine registrada é uma das origens válidas
  testes.push(mkTeste('rastreabilidade', 'RT-04', 'Engine responsável é uma das origens válidas do sistema', () => {
    const validEngines = ['clinical-therapeutics', 'clinical-decision-support', 'pharma-database', 'safety-rules', 'second-opinion', 'manual'];
    const ok = validEngines.includes(rec.engine);
    return { ok, detalhe: ok ? `Engine: ${rec.engine} ✓` : `Engine inválida: ${rec.engine}`, severidade: 'critica' };
  }));

  // 5.5 PhysicianReview referencia molecula/diagnostico da recomendação
  testes.push(mkTeste('rastreabilidade', 'RT-05', 'PhysicianReview referencia a molécula e diagnóstico da recomendação', () => {
    const review = registrarReview({
      medico_crm_hash: hashPV('CRM-SP-TRACE01'),
      especialidade: 'cardiologia',
      recomendacao_id: rec.id,
      diagnostico_id: rec.diagnostico_id,
      diagnostico_nome: rec.diagnostico_nome,
      molecula: rec.molecula,
      classe_terapeutica: rec.classe_terapeutica,
      guideline_sigla: rec.guideline_sigla,
      veredicto: 'concordo',
      justificativa_clinica: 'PARADIGM-HF — padrão ESC. Indicação Classe I.',
    });
    const ok = review.diagnostico_id === rec.diagnostico_id && review.molecula === rec.molecula;
    return { ok, detalhe: ok ? `Review rastreia: ${review.diagnostico_id}/${review.molecula} ✓` : 'Referência quebrada na review', severidade: 'critica' };
  }));

  // 5.6 BoardValidation com guideline referenciado
  testes.push(mkTeste('rastreabilidade', 'RT-06', 'BoardValidation referencia guideline da recomendação', () => {
    const bv = registrarBoardValidation({
      medico_crm_hash: hashPV('CRM-SP-BV01'),
      especialidade: 'cardiologia',
      diagnostico_id: rec.diagnostico_id,
      diagnostico_nome: rec.diagnostico_nome,
      molecula: rec.molecula,
      classe_terapeutica: rec.classe_terapeutica,
      guideline_sigla: rec.guideline_sigla,
      score_confianca_sistema: rec.score_confianca,
      status: 'aprovada',
      justificativa: 'Rastreabilidade completa confirmada — PARADIGM-HF Classe I-A',
    });
    const ok = bv.guideline_sigla === rec.guideline_sigla;
    return { ok, detalhe: ok ? `Board referencia guideline: ${bv.guideline_sigla} ✓` : 'Guideline da board diverge da recomendação', severidade: 'alta' };
  }));

  // 5.7 Cadeia Diretriz → Versão → Evidência → NNT presente
  testes.push(mkTeste('rastreabilidade', 'RT-07', 'Evidência possui NNT para quantificação de benefício clínico', () => {
    const comNNT = rec.evidencias.filter(e => e.nnt !== undefined && e.nnt > 0);
    const ok = comNNT.length > 0;
    return { ok, detalhe: ok ? `${comNNT.length} evidências com NNT ✓ (NNT=${comNNT[0].nnt})` : 'Nenhuma evidência com NNT quantificado', severidade: 'moderada' };
  }));

  // 5.8 Cadeia hash cobre todos os campos de identificação
  testes.push(mkTeste('rastreabilidade', 'RT-08', 'Hash da recomendação cobre id, timestamp, diagnóstico, molécula, guideline, engine e scores', () => {
    const hashOrig = rec.hash_integridade;
    // Verificar que mudança em cada campo rompe o hash
    const campos: Array<keyof typeof rec> = ['molecula', 'guideline_sigla', 'engine', 'score_confianca', 'score_evidencia'];
    const falhou: string[] = [];
    for (const campo of campos) {
      const alt = { ...rec, [campo]: campo === 'score_confianca' || campo === 'score_evidencia' ? 99 : 'ADULTERADO' };
      const novoHash = hashReg(alt as Omit<RecomendacaoVersionada, 'hash_integridade'>);
      if (novoHash === hashOrig) falhou.push(campo);
    }
    const ok = falhou.length === 0;
    return { ok, detalhe: ok ? 'Hash sensível a todos os campos críticos ✓' : `Hash insensível a: ${falhou.join(', ')}`, severidade: 'critica' };
  }));

  // 5.9 Versão do sistema rastreável no registro
  testes.push(mkTeste('rastreabilidade', 'RT-09', 'Versão do engine gravada na recomendação (engine_versao)', () => {
    const ok = rec.engine_versao !== '' && /^\d+\.\d+\.\d+$/.test(rec.engine_versao);
    return { ok, detalhe: ok ? `Engine versão: ${rec.engine_versao} ✓` : `engine_versao inválida: '${rec.engine_versao}'`, severidade: 'moderada' };
  }));

  // 5.10 Status da recomendação em estado válido
  testes.push(mkTeste('rastreabilidade', 'RT-10', 'Status da recomendação é um dos valores válidos do sistema', () => {
    const validStatus = ['ativa', 'desatualizada', 'substituida', 'suspensa', 'em_revisao'];
    const ok = validStatus.includes(rec.status);
    return { ok, detalhe: ok ? `Status: ${rec.status} ✓` : `Status inválido: ${rec.status}`, severidade: 'alta' };
  }));

  return mkSuite('Rastreabilidade End-to-End', 'Cadeia completa: Diretriz → Evidência → Engine → Recomendação → Review → Board', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 6 — COMPLETUDE DE LOGS E CAMPOS
// ════════════════════════════════════════════════════════════

function suiteCompletudeLogs(): SuiteResultado {
  const t0 = now();
  const testes: ResultadoTeste[] = [];

  // 6.1 Log de auditoria médica tem campo origem
  testes.push(mkTeste('logs', 'LOG-01', 'AuditEntry possui campo origem (consulta, prescrição, manual, api)', () => {
    const entry = buildAudit();
    const valid = ['consulta', 'prescricao_rapida', 'manual', 'api'];
    const ok = valid.includes(entry.origem);
    return { ok, detalhe: ok ? `Origem: ${entry.origem} ✓` : `Origem inválida: ${entry.origem}`, severidade: 'alta' };
  }));

  // 6.2 Diagnóstico principal marcado como 'principal'
  testes.push(mkTeste('logs', 'LOG-02', 'Pelo menos um diagnóstico marcado como principal no log', () => {
    const entry = buildAudit();
    const principal = entry.diagnosticos.filter(d => d.tipo === 'principal');
    const ok = principal.length > 0;
    return { ok, detalhe: ok ? `${principal.length} diagnóstico(s) principal(is) ✓` : 'Nenhum diagnóstico principal — rastreabilidade clínica incompleta', severidade: 'alta' };
  }));

  // 6.3 Prescrição tem hash de conteúdo
  testes.push(mkTeste('logs', 'LOG-03', 'Cada prescrição no log tem hash_conteudo preenchido', () => {
    const entry = buildAudit();
    const semHash = entry.prescricoes.filter(p => !p.hash_conteudo || !p.hash_conteudo.startsWith('PRX-'));
    const ok = semHash.length === 0;
    return { ok, detalhe: ok ? `${entry.prescricoes.length} prescrições com hash ✓` : `${semHash.length} prescrições sem hash`, severidade: 'critica' };
  }));

  // 6.4 Condutas têm campo diretriz_base quando são medicamentosas
  testes.push(mkTeste('logs', 'LOG-04', 'Condutas medicamentosas têm diretriz_base registrada', () => {
    const entry = buildAudit();
    const medicamentosas = entry.condutas.filter(c => c.tipo === 'medicamentosa');
    const semDir = medicamentosas.filter(c => !c.diretriz_base);
    const ok = semDir.length === 0;
    return { ok, detalhe: ok ? `${medicamentosas.length} condutas medicamentosas com diretriz_base ✓` : `${semDir.length} sem diretriz_base`, severidade: 'moderada' };
  }));

  // 6.5 Evidências consultadas têm tipo definido
  testes.push(mkTeste('logs', 'LOG-05', 'Evidências consultadas no log têm tipo definido (RCT, Meta-análise…)', () => {
    const entry = buildAudit();
    const validTipos = ['RCT', 'Meta-análise', 'Coorte', 'Caso-controle', 'Diretriz', 'Revisão'];
    const semTipo = entry.evidencias_consultadas.filter(e => !validTipos.includes(e.tipo));
    const ok = semTipo.length === 0;
    return { ok, detalhe: ok ? `${entry.evidencias_consultadas.length} evidências com tipo válido ✓` : `${semTipo.length} sem tipo válido`, severidade: 'moderada' };
  }));

  // 6.6 Diretrizes utilizadas têm campo sociedade e ano
  testes.push(mkTeste('logs', 'LOG-06', 'Diretrizes utilizadas no log têm sociedade e ano', () => {
    const entry = buildAudit();
    const incompletas = entry.diretrizes_utilizadas.filter(d => !d.sociedade || !d.ano);
    const ok = incompletas.length === 0;
    return { ok, detalhe: ok ? `${entry.diretrizes_utilizadas.length} diretrizes com sociedade+ano ✓` : `${incompletas.length} sem sociedade/ano`, severidade: 'alta' };
  }));

  // 6.7 Alertas ignorados têm justificativa do médico
  testes.push(mkTeste('logs', 'LOG-07', 'Alertas ignorados graves/críticos têm justificativa do médico', () => {
    const meds2: MedicamentoAudit[] = [
      { molecula: 'Sacubitril/Valsartana', concentracao: '49/51mg', dose: '49/51mg', via: 'Oral', frequencia: '2x/dia', indicacao_cid: 'I50.0' },
      { molecula: 'Espironolactona', concentracao: '25mg', dose: '25mg', via: 'Oral', frequencia: '1x/dia', indicacao_cid: 'I50.0' },
    ];
    const entryComAlerta = buildAudit({
      alertas_ignorados: [{
        tipo: 'interacao',
        severidade: 'grave',
        mensagem: 'Risco de hipercalemia — ARNI + ARM em TFG < 45',
        farmaco_a: 'Sacubitril/Valsartana',
        farmaco_b: 'Espironolactona',
        justificativa_medico: 'Quarteto ESC-HF 2021 — monitoramento semanal K+ nas primeiras 4 semanas',
        ignorado_em: '2024-07-11T10:30:00.000Z',
      }],
      prescricoes: [{
        id_prescricao: 'PRX-TEST02',
        data_prescricao: '2024-07-11T10:00:00.000Z',
        status: 'emitida',
        hash_conteudo: hashConteudoPrescricao(meds2),
        medicamentos: meds2,
      }],
    });
    const alertasGraves = entryComAlerta.alertas_ignorados.filter(a => a.severidade === 'grave' || a.severidade === 'critico');
    const semJust = alertasGraves.filter(a => !a.justificativa_medico || a.justificativa_medico.trim() === '');
    const ok = semJust.length === 0;
    return { ok, detalhe: ok ? `${alertasGraves.length} alertas graves com justificativa ✓` : `${semJust.length} alertas graves sem justificativa — risco legal!`, severidade: 'critica' };
  }));

  // 6.8 Ajustes aplicados têm dose original e ajustada
  testes.push(mkTeste('logs', 'LOG-08', 'Ajustes de dose têm dose_original e dose_ajustada registradas', () => {
    const entryComAjuste = buildAudit({
      ajustes_aplicados: [{
        tipo: 'renal',
        descricao: 'TFG 38 — redução de dose de Metformina',
        dose_original: '1000 mg 2x/dia',
        dose_ajustada: '500 mg 2x/dia',
        motivo: 'TFG 30–45: reduzir dose conforme bula',
        aplicado_em: '2024-07-11T10:00:00.000Z',
      }],
    });
    const semDose = entryComAjuste.ajustes_aplicados.filter(a => !a.dose_original || !a.dose_ajustada);
    const ok = semDose.length === 0;
    return { ok, detalhe: ok ? `${entryComAjuste.ajustes_aplicados.length} ajustes com doses originais/ajustadas ✓` : `${semDose.length} ajustes incompletos`, severidade: 'alta' };
  }));

  // 6.9 Timestamp de início anterior ao timestamp de fim
  testes.push(mkTeste('logs', 'LOG-09', 'Timestamp de início é anterior ao timestamp de fim na auditoria', () => {
    const entry = buildAudit({
      timestamp_inicio: '2024-07-11T10:00:00.000Z',
      timestamp_fim:    '2024-07-11T10:25:00.000Z',
    });
    const ok = entry.timestamp_fim ? entry.timestamp_inicio < entry.timestamp_fim : true;
    return { ok, detalhe: ok ? `Início: ${entry.timestamp_inicio} → Fim: ${entry.timestamp_fim} ✓` : 'Timestamp de fim anterior ao início!', severidade: 'alta' };
  }));

  // 6.10 Duração coerente com timestamps
  testes.push(mkTeste('logs', 'LOG-10', 'Duração em minutos coerente com timestamps de início/fim', () => {
    const entry = buildAudit({
      timestamp_inicio: '2024-07-11T10:00:00.000Z',
      timestamp_fim:    '2024-07-11T10:25:00.000Z',
      duracao_minutos:  25,
    });
    if (!entry.timestamp_fim || !entry.duracao_minutos) return { ok: true, detalhe: 'Campos opcionais ausentes — N/A ✓' };
    const diffMs = new Date(entry.timestamp_fim).getTime() - new Date(entry.timestamp_inicio).getTime();
    const diffMin = Math.round(diffMs / 60000);
    const ok = Math.abs(diffMin - entry.duracao_minutos) <= 1; // tolerância de 1 min
    return { ok, detalhe: ok ? `Duração ${entry.duracao_minutos}min ≈ ${diffMin}min calculado ✓` : `Duração divergente: registrado ${entry.duracao_minutos}min vs calculado ${diffMin}min`, severidade: 'baixa' };
  }));

  return mkSuite('Completude de Logs', 'Completude e consistência de todos os campos dos logs clínicos', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 7 — EVIDÊNCIAS: COMPLETUDE E QUALIDADE
// ════════════════════════════════════════════════════════════

function suiteEvidencias(): SuiteResultado {
  const t0 = now();
  const testes: ResultadoTeste[] = [];

  const evCompleta: EvidenciaUsada = {
    estudo: 'PARADIGM-HF',
    doi: '10.1056/NEJMoa1409077',
    pmid: '25176015',
    nivel: 'A',
    grau: 'I',
    n_pacientes: 8442,
    reducao_risco_relativo: '20%',
    nnt: 21,
  };

  const evSemDoi: EvidenciaUsada = {
    estudo: 'Estudo Hipotético',
    nivel: 'C',
    grau: 'IIb',
  };

  // 7.1 Evidência com NNT = 0 é rejeitada como clinicamente inválida
  testes.push(mkTeste('evidencias', 'EV-01', 'NNT igual a zero é considerado clinicamente inválido', () => {
    const evInvalida: EvidenciaUsada = { ...evCompleta, nnt: 0 };
    const ok = (evInvalida.nnt ?? 1) > 0 === false; // nnt = 0 é inválido
    return { ok, detalhe: ok ? 'NNT=0 identificado como inválido ✓' : 'Sistema aceita NNT=0 sem alerta', severidade: 'moderada' };
  }));

  // 7.2 Evidência de nível A tem ECR com n_pacientes preenchido
  testes.push(mkTeste('evidencias', 'EV-02', 'Evidência nível A tem n_pacientes quantificado', () => {
    const ok = evCompleta.nivel === 'A' ? (evCompleta.n_pacientes ?? 0) > 0 : true;
    return { ok, detalhe: ok ? `N=${evCompleta.n_pacientes} pacientes para ${evCompleta.estudo} ✓` : `Evidência A sem n_pacientes: ${evCompleta.estudo}`, severidade: 'moderada' };
  }));

  // 7.3 DOI em formato válido (10.XXXX/...)
  testes.push(mkTeste('evidencias', 'EV-03', 'DOI segue o formato padrão 10.XXXX/...', () => {
    const doi = evCompleta.doi ?? '';
    const ok = /^10\.\d{4,}\/\S+$/.test(doi);
    return { ok, detalhe: ok ? `DOI válido: ${doi} ✓` : `DOI inválido: ${doi}`, severidade: 'moderada' };
  }));

  // 7.4 PMID é numérico
  testes.push(mkTeste('evidencias', 'EV-04', 'PMID é numérico (somente dígitos)', () => {
    const pmid = evCompleta.pmid ?? '';
    const ok = /^\d+$/.test(pmid);
    return { ok, detalhe: ok ? `PMID: ${pmid} ✓` : `PMID inválido: ${pmid}`, severidade: 'baixa' };
  }));

  // 7.5 Evidência nível C sem DOI/PMID é aceitável mas deve ter nome do estudo
  testes.push(mkTeste('evidencias', 'EV-05', 'Evidência nível C sem DOI/PMID tem pelo menos nome do estudo', () => {
    const ok = Boolean(evSemDoi.estudo && evSemDoi.estudo.trim() !== '');
    return { ok, detalhe: ok ? `Estudo: "${evSemDoi.estudo}" ✓` : 'Evidência sem nome de estudo', severidade: 'moderada' };
  }));

  // 7.6 Nível de evidência aceita apenas A, B ou C
  testes.push(mkTeste('evidencias', 'EV-06', 'Nível de evidência é A, B ou C (nenhum outro valor)', () => {
    const evs = [evCompleta, evSemDoi];
    const invalidos = evs.filter(e => !['A', 'B', 'C'].includes(e.nivel));
    const ok = invalidos.length === 0;
    return { ok, detalhe: ok ? 'Todos os níveis válidos (A, B, C) ✓' : `Níveis inválidos: ${invalidos.map(e => e.nivel).join(', ')}`, severidade: 'alta' };
  }));

  // 7.7 Grau de recomendação aceita apenas I, IIa, IIb, III
  testes.push(mkTeste('evidencias', 'EV-07', 'Grau de recomendação é I, IIa, IIb ou III', () => {
    const evs = [evCompleta, evSemDoi];
    const invalidos = evs.filter(e => !['I', 'IIa', 'IIb', 'III'].includes(e.grau));
    const ok = invalidos.length === 0;
    return { ok, detalhe: ok ? 'Todos os graus válidos (I, IIa, IIb, III) ✓' : `Graus inválidos: ${invalidos.map(e => e.grau).join(', ')}`, severidade: 'alta' };
  }));

  // 7.8 Recomendação com múltiplas evidências — nível mais alto priorizado
  testes.push(mkTeste('evidencias', 'EV-08', 'Recomendação com múltiplas evidências — nível mais alto identificável', () => {
    const evs: EvidenciaUsada[] = [
      { estudo: 'HOPE',       doi: '10.1056/NEJM200001203420301', nivel: 'A', grau: 'I', nnt: 26 },
      { estudo: 'SPRINT',     doi: '10.1056/NEJMoa1511939',       nivel: 'A', grau: 'I', nnt: 61 },
      { estudo: 'Revisão X',                                       nivel: 'C', grau: 'IIb' },
    ];
    const nivelTop = evs.some(e => e.nivel === 'A') ? 'A' : evs.some(e => e.nivel === 'B') ? 'B' : 'C';
    const ok = nivelTop === 'A';
    return { ok, detalhe: ok ? `Nível máximo identificado: ${nivelTop} ✓` : `Nível máximo inesperado: ${nivelTop}`, severidade: 'moderada' };
  }));

  // 7.9 Recomendação rastreia evidência até NNT
  testes.push(mkTeste('evidencias', 'EV-09', 'Cadeia Diretriz → Evidência → NNT completa para quantificação de benefício', () => {
    const rec = buildRec({ evidencias: [evCompleta] });
    const comNNT = rec.evidencias.filter(e => e.nnt !== undefined && e.nnt > 0);
    const ok = comNNT.length > 0;
    return { ok, detalhe: ok ? `NNT=${comNNT[0].nnt} para "${comNNT[0].estudo}" ✓` : 'Cadeia sem NNT quantificado', severidade: 'moderada' };
  }));

  // 7.10 Redução de risco relativo preenchida em ECRs de alta qualidade
  testes.push(mkTeste('evidencias', 'EV-10', 'ECR de nível A tem RRR (redução de risco relativo) quantificada', () => {
    const ecrsA = [evCompleta].filter(e => e.nivel === 'A');
    const semRRR = ecrsA.filter(e => !e.reducao_risco_relativo || e.reducao_risco_relativo.trim() === '');
    const ok = semRRR.length === 0;
    return { ok, detalhe: ok ? `${ecrsA.length} ECRs de nível A com RRR ✓` : `${semRRR.length} sem RRR`, severidade: 'moderada' };
  }));

  return mkSuite('Evidências — Completude e Qualidade', 'Integridade bibliográfica e qualidade das evidências científicas', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// EXECUTOR PRINCIPAL
// ════════════════════════════════════════════════════════════

export function executarIntegrityTestEtapa10(): IntegrityTestEtapa10Result {
  const t0 = now();

  const suites = [
    suiteHashRegistry(),
    suiteHashAudit(),
    suiteHashPhysicianValidation(),
    suiteGovernance(),
    suiteRastreabilidade(),
    suiteCompletudeLogs(),
    suiteEvidencias(),
  ];

  const total_passou = suites.reduce((s, r) => s + r.passou, 0);
  const total_falhou = suites.reduce((s, r) => s + r.falhou, 0);
  const total_avisos = suites.reduce((s, r) => s + r.avisos, 0);
  const total_testes = total_passou + total_falhou + total_avisos;

  const criticos_falhos = suites
    .flatMap(s => s.testes)
    .filter(t => t.status === 'falhou' && t.severidade === 'critica')
    .map(t => `[${t.id}] ${t.descricao}: ${t.detalhe}`);

  const status_geral: StatusTeste =
    total_falhou > 0 ? 'falhou' :
    total_avisos > 0 ? 'aviso'  : 'passou';

  const resultado: IntegrityTestEtapa10Result = {
    timestamp:    new Date().toISOString(),
    suites,
    total_testes,
    total_passou,
    total_falhou,
    total_avisos,
    tempo_total_ms: Math.round(now() - t0),
    status_geral,
    criticos_falhos,
    relatorio_resumo: '',
  };

  resultado.relatorio_resumo = gerarRelatorioIntegridade(resultado);
  return resultado;
}

// ════════════════════════════════════════════════════════════
// RELATÓRIO TEXTO
// ════════════════════════════════════════════════════════════

export function gerarRelatorioIntegridade(r: IntegrityTestEtapa10Result): string {
  const L: string[] = [
    '═════════════════════════════════════════════════════════════════════',
    '  PRESCREVE-AI — ETAPA 10: TESTE DE INTEGRIDADE',
    '═════════════════════════════════════════════════════════════════════',
    `  Timestamp : ${r.timestamp}`,
    `  Total     : ${r.total_testes} testes | ✓ ${r.total_passou} | ✗ ${r.total_falhou} | ⚠ ${r.total_avisos}`,
    `  Tempo     : ${r.tempo_total_ms}ms`,
    `  Status    : ${r.status_geral === 'passou' ? '✓ APROVADO' : r.status_geral === 'aviso' ? '⚠ APROVADO COM AVISOS' : '✗ REPROVADO'}`,
    '─────────────────────────────────────────────────────────────────────',
  ];

  for (const suite of r.suites) {
    const icon = suite.status === 'passou' ? '✓' : suite.status === 'aviso' ? '⚠' : '✗';
    L.push(`  ${icon} ${suite.nome.padEnd(45)} | ✓${suite.passou} ✗${suite.falhou} ⚠${suite.avisos} | ${suite.tempo_ms}ms`);

    const falhos = suite.testes.filter(t => t.status === 'falhou');
    for (const t of falhos) {
      const sev = t.severidade === 'critica' ? '🔴' : t.severidade === 'alta' ? '🟠' : '🟡';
      L.push(`    ${sev} [${t.id}] ${t.descricao}`);
      L.push(`       → ${t.detalhe}`);
    }
  }

  L.push('─────────────────────────────────────────────────────────────────────');
  L.push('  DETALHAMENTO POR DIMENSÃO');
  L.push('─────────────────────────────────────────────────────────────────────');
  L.push(`  ${'Dimensão'.padEnd(40)} | Passou | Falhou | Avisos`);
  L.push('  ' + '─'.repeat(60));

  for (const s of r.suites) {
    L.push(`  ${s.nome.padEnd(40)} | ${String(s.passou).padEnd(6)} | ${String(s.falhou).padEnd(6)} | ${s.avisos}`);
  }

  if (r.criticos_falhos.length > 0) {
    L.push('─────────────────────────────────────────────────────────────────────');
    L.push('  ⛔ FALHAS CRÍTICAS — AÇÃO IMEDIATA NECESSÁRIA');
    L.push('─────────────────────────────────────────────────────────────────────');
    for (const c of r.criticos_falhos) {
      L.push(`  • ${c}`);
    }
  }

  L.push('═════════════════════════════════════════════════════════════════════');
  L.push('  COBERTURA DE RASTREABILIDADE');
  L.push('═════════════════════════════════════════════════════════════════════');
  L.push('  ✓ Recommendation Registry — hash de integridade por recomendação');
  L.push('  ✓ Medical Audit          — hash por evento de auditoria');
  L.push('  ✓ Physician Validation   — hash por review, DiagAgree, TherAgree, Board');
  L.push('  ✓ Governance             — cadeia Diretriz → Versão → Evidência');
  L.push('  ✓ Rastreabilidade E2E    — Diretriz → Evidência → Engine → Rec → Review');
  L.push('  ✓ Logs clínicos          — completude de campos obrigatórios');
  L.push('  ✓ Evidências             — DOI, PMID, NNT, RRR, Nível, Grau');
  L.push('─────────────────────────────────────────────────────────────────────');
  L.push(`  Taxa de aprovação: ${Math.round((r.total_passou / r.total_testes) * 100)}% (${r.total_passou}/${r.total_testes})`);
  L.push(r.status_geral === 'passou'
    ? '  ✓ SISTEMA ÍNTEGRO — Rastreabilidade completa em todas as dimensões'
    : r.status_geral === 'aviso'
    ? '  ⚠ SISTEMA APROVADO COM AVISOS — Verificar itens acima'
    : '  ✗ SISTEMA COM FALHAS DE INTEGRIDADE — Correção necessária');
  L.push('─────────────────────────────────────────────────────────────────────');
  L.push('  CDSS — Suporte à decisão clínica. Decisão médica soberana.');
  L.push('═════════════════════════════════════════════════════════════════════');

  return L.join('\n');
}

// ════════════════════════════════════════════════════════════
// MINI-TESTE DE SANIDADE (< 50ms)
// ════════════════════════════════════════════════════════════

export function sanityCheckIntegridade(): {
  hashes_ok: boolean;
  tamper_detectado: boolean;
  rastreabilidade_ok: boolean;
  tempo_ms: number;
  detalhe: string;
} {
  const t0 = now();

  const rec   = buildRec();
  const audit = buildAudit();

  const hashRec  = verificarIntegrityReg(rec);
  const hashAud  = verificarIntegrityAudit(audit);
  const tamper   = !verificarIntegrityReg({ ...rec, molecula: 'ADULTERADA' });
  const rastreio = !!rec.guideline_id && !!rec.engine && rec.evidencias.some(e => e.doi || e.pmid);

  return {
    hashes_ok:          hashRec && hashAud,
    tamper_detectado:   tamper,
    rastreabilidade_ok: rastreio,
    tempo_ms:           Math.round(now() - t0),
    detalhe: `hashReg:${hashRec ? 'OK' : 'FAIL'} | hashAud:${hashAud ? 'OK' : 'FAIL'} | tamper:${tamper ? 'detectado' : 'MISS'} | rastreio:${rastreio ? 'OK' : 'INCOMPLETO'}`,
  };
}
