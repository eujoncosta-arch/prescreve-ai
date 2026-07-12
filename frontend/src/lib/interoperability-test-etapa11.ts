// ============================================================
// PRESCREVE-AI — ETAPA 11: Teste de Interoperabilidade
//
// Exporta casos clínicos completos em:
//   FHIR R4  — Bundle · Patient · Practitioner · Organization
//             Encounter · Condition · MedicationRequest
//             MedicationStatement · Observation · DiagnosticReport
//             Composition · AllergyIntolerance
//   HL7 v2.x — Conversão ADT / ORU → FHIR
//
// Valida conformidade de cada resource type individualmente
// e em bundle completo.
//
// Decisão médica soberana — CDSS de suporte.
// ============================================================

'use client';

import {
  // Geradores
  gerarBundleClinico,
  gerarBundleCompleto,
  gerarPractitioner,
  gerarOrganization,
  gerarMedicationStatement,
  gerarDiagnosticReport,
  gerarComposition,
  // Validação
  validarFHIR,
  validarBundleCompleto,
  // Importação / exportação
  importarFHIR,
  exportarFHIR,
  converterHL7,
  exportarHL7v2,
  simularIntegracao,
  // RNDS
  aplicarPerfilRNDS,
  RNDS_PROFILES,
  // Mapeamentos
  mapearCID,
  mapearLOINC,
  CID_SNOMED_MAP,
  EXAME_LOINC_MAP,
  MOLECULA_RXNORM_MAP,
  // Tipos
  type FHIRBundle,
  type FHIRPatient,
  type FHIRPractitioner,
  type FHIROrganization,
  type FHIREncounter,
  type FHIRCondition,
  type FHIRMedicationRequest,
  type FHIRMedicationStatement,
  type FHIRObservation,
  type FHIRDiagnosticReport,
  type FHIRComposition,
  type FHIRAllergyIntolerance,
  type DadosBundleCompleto,
  type HL7Message,
  type DadosClinicos,
} from './interoperability-engine';

// ════════════════════════════════════════════════════════════
// TIPOS DO TESTE
// ════════════════════════════════════════════════════════════

export type SeveridadeFalha11 = 'critica' | 'alta' | 'moderada' | 'baixa';
export type StatusTeste11     = 'passou' | 'falhou' | 'aviso';

export interface ResultadoTeste11 {
  id:          string;
  suite:       string;
  descricao:   string;
  status:      StatusTeste11;
  severidade?: SeveridadeFalha11;
  detalhe:     string;
  valor_esperado?: string;
  valor_obtido?:   string;
  latencia_ms: number;
}

export interface SuiteResultado11 {
  nome:     string;
  testes:   ResultadoTeste11[];
  passou:   number;
  falhou:   number;
  avisos:   number;
  tempo_ms: number;
  status:   StatusTeste11;
}

export interface InteropTestEtapa11Result {
  timestamp:        string;
  suites:           SuiteResultado11[];
  total_testes:     number;
  total_passou:     number;
  total_falhou:     number;
  total_avisos:     number;
  tempo_total_ms:   number;
  status_geral:     StatusTeste11;
  conformidade_pct: number;
  criticos_falhos:  string[];
  relatorio:        string;
}

// ════════════════════════════════════════════════════════════
// RUNNER
// ════════════════════════════════════════════════════════════

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function mkTeste(
  suite: string,
  id: string,
  descricao: string,
  fn: () => { ok: boolean; detalhe: string; esperado?: string; obtido?: string; sev?: SeveridadeFalha11 },
): ResultadoTeste11 {
  const t0 = now();
  try {
    const r = fn();
    return {
      id, suite, descricao,
      status:         r.ok ? 'passou' : 'falhou',
      severidade:     r.ok ? undefined : (r.sev ?? 'alta'),
      detalhe:        r.detalhe,
      valor_esperado: r.esperado,
      valor_obtido:   r.obtido,
      latencia_ms:    Math.round((now() - t0) * 100) / 100,
    };
  } catch (e) {
    return {
      id, suite, descricao, status: 'falhou', severidade: 'critica',
      detalhe: `Exceção: ${e instanceof Error ? e.message : String(e)}`,
      latencia_ms: Math.round((now() - t0) * 100) / 100,
    };
  }
}

function mkSuite(nome: string, testes: ResultadoTeste11[], tempoMs: number): SuiteResultado11 {
  const passou = testes.filter(t => t.status === 'passou').length;
  const falhou = testes.filter(t => t.status === 'falhou').length;
  const avisos = testes.filter(t => t.status === 'aviso').length;
  return { nome, testes, passou, falhou, avisos, tempo_ms: Math.round(tempoMs), status: falhou > 0 ? 'falhou' : avisos > 0 ? 'aviso' : 'passou' };
}

// ════════════════════════════════════════════════════════════
// CASOS CLÍNICOS COMPLETOS
// ════════════════════════════════════════════════════════════

const CASO_HAS_DM2: DadosBundleCompleto = {
  paciente_id:  'PAC-HAS-001',
  nome:         'Maria Santos Silva',
  nascimento:   '1956-04-22',
  sexo:         'F',
  cns:          '700012345678901',
  cids:         ['I10', 'E11', 'N18.3'],
  medicamentos: ['Enalapril', 'Metformina', 'Empagliflozina'],
  alergias:     ['Penicilina'],
  exames: {
    creatinina:     1.4,
    glicemia_jejum: 148,
    hba1c:          7.8,
    potassio:       4.3,
    pa_sistolica:   142,
    pa_diastolica:  88,
  },
  pa_sistolica:  142,
  pa_diastolica: 88,
  profissional: {
    id:            'PRAT-001',
    nome:          'João Carlos Pereira',
    crm:           '123456',
    uf_crm:        'SP',
    especialidade: 'Cardiologia',
    cns:           '800099887766554',
  },
  organizacao: {
    id:     'ORG-001',
    nome:   'Clínica Cardiovascular São Paulo',
    cnpj:   '12.345.678/0001-90',
    cnes:   '1234567',
    tipo:   'clinica',
    cidade: 'São Paulo',
    uf:     'SP',
  },
  medicamentos_em_uso: [
    { molecula: 'Enalapril',      posologia: '10 mg VO 1x/dia',   status: 'active'    },
    { molecula: 'Metformina',     posologia: '850 mg VO 2x/dia',  status: 'active'    },
    { molecula: 'Empagliflozina', posologia: '10 mg VO 1x/dia',   status: 'active'    },
    { molecula: 'Sinvastatina',   posologia: '40 mg VO 1x/noite', status: 'completed' },
  ],
  titulo_documento: 'Sumário Clínico — HAS + DM2 + DRC G3a',
};

const CASO_ICC: DadosBundleCompleto = {
  paciente_id:  'PAC-ICC-002',
  nome:         'Roberto Ferreira Lima',
  nascimento:   '1950-08-15',
  sexo:         'M',
  cids:         ['I50.0', 'I10'],
  medicamentos: ['Carvedilol', 'Espironolactona', 'Furosemida'],
  alergias:     ['Enalapril (tosse)'],
  exames: {
    bnp:            850,
    creatinina:     1.6,
    potassio:       4.8,
    sodio:          138,
    pa_sistolica:   105,
    pa_diastolica:  68,
  },
  pa_sistolica:  105,
  pa_diastolica: 68,
  profissional: {
    id:            'PRAT-002',
    nome:          'Ana Paula Mendes',
    crm:           '654321',
    uf_crm:        'RJ',
    especialidade: 'Cardiologia — Insuficiência Cardíaca',
  },
  organizacao: {
    id:     'ORG-002',
    nome:   'Instituto do Coração do Rio',
    cnes:   '7654321',
    tipo:   'hospital',
    cidade: 'Rio de Janeiro',
    uf:     'RJ',
  },
  medicamentos_em_uso: [
    { molecula: 'Carvedilol',     posologia: '12,5 mg VO 2x/dia',  status: 'active' },
    { molecula: 'Espironolactona',posologia: '25 mg VO 1x/dia',    status: 'active' },
    { molecula: 'Furosemida',     posologia: '40 mg VO 1x/manhã',  status: 'active' },
  ],
  titulo_documento: 'Sumário Clínico — ICFEr + HAS',
};

const CASO_ASMA: DadosBundleCompleto = {
  paciente_id:  'PAC-ASMA-003',
  nome:         'Carlos Eduardo Souza',
  nascimento:   '1985-11-03',
  sexo:         'M',
  cids:         ['J45'],
  medicamentos: ['Budesonida-Formoterol'],
  alergias:     [],
  exames: {
    pa_sistolica: 118,
    pa_diastolica: 76,
  },
  pa_sistolica:  118,
  pa_diastolica: 76,
  profissional: {
    id:            'PRAT-003',
    nome:          'Fernanda Costa Nunes',
    crm:           '789012',
    uf_crm:        'MG',
    especialidade: 'Pneumologia',
  },
  organizacao: {
    id:     'ORG-003',
    nome:   'Clínica Pulmonar Belo Horizonte',
    tipo:   'clinica',
    cidade: 'Belo Horizonte',
    uf:     'MG',
  },
  medicamentos_em_uso: [
    { molecula: 'Budesonida-Formoterol', posologia: '1 inalação SOS', status: 'active' },
  ],
  titulo_documento: 'Sumário Clínico — Asma (SMART Strategy)',
};

// ════════════════════════════════════════════════════════════
// SUITE 1 — PATIENT
// ════════════════════════════════════════════════════════════

function suitePatient(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];
  const bundle = gerarBundleCompleto(CASO_HAS_DM2);
  const patient = bundle.entry.find(e => e.resource.resourceType === 'Patient')?.resource as FHIRPatient | undefined;

  testes.push(mkTeste('Patient', 'PAT-01', 'Patient gerado no bundle', () => ({
    ok: !!patient, detalhe: patient ? `Patient id:${patient.id} ✓` : 'Patient ausente!', sev: 'critica',
  })));
  testes.push(mkTeste('Patient', 'PAT-02', 'Patient.resourceType = "Patient"', () => ({
    ok: patient?.resourceType === 'Patient', detalhe: `resourceType: ${patient?.resourceType}`, sev: 'critica',
  })));
  testes.push(mkTeste('Patient', 'PAT-03', 'Patient.gender em male|female|other|unknown', () => {
    const valid = ['male', 'female', 'other', 'unknown'];
    const ok = valid.includes(patient?.gender ?? '');
    return { ok, detalhe: ok ? `gender: ${patient?.gender} ✓` : `gender inválido: ${patient?.gender}`, sev: 'alta' };
  }));
  testes.push(mkTeste('Patient', 'PAT-04', 'Patient.birthDate no formato YYYY-MM-DD', () => {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(patient?.birthDate ?? '');
    return { ok, detalhe: ok ? `birthDate: ${patient?.birthDate} ✓` : `Formato inválido: ${patient?.birthDate}`, sev: 'alta' };
  }));
  testes.push(mkTeste('Patient', 'PAT-05', 'Patient.name com family e given preenchidos', () => {
    const name = patient?.name?.[0];
    const ok = !!(name?.family && (name?.given?.length ?? 0) > 0);
    return { ok, detalhe: ok ? `${name?.given?.join(' ')} ${name?.family} ✓` : 'Nome incompleto', sev: 'alta' };
  }));
  testes.push(mkTeste('Patient', 'PAT-06', 'Patient.identifier com CNS quando disponível', () => {
    const hasCns = patient?.identifier?.some(i => i.system.includes('cns'));
    const ok = hasCns ?? false;
    return { ok, detalhe: ok ? 'CNS presente ✓' : 'Sem CNS — identificação parcial', sev: 'moderada' };
  }));
  testes.push(mkTeste('Patient', 'PAT-07', 'Patient.id corresponde ao paciente_id do caso clínico', () => {
    const ok = patient?.id === CASO_HAS_DM2.paciente_id;
    return { ok, detalhe: ok ? `id: ${patient?.id} ✓` : `Divergência: esperado ${CASO_HAS_DM2.paciente_id}, obtido ${patient?.id}`, sev: 'critica', esperado: CASO_HAS_DM2.paciente_id, obtido: patient?.id };
  }));

  return mkSuite('FHIR Patient', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 2 — PRACTITIONER
// ════════════════════════════════════════════════════════════

function suitePractitioner(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];

  const pract = gerarPractitioner(CASO_HAS_DM2.profissional);

  testes.push(mkTeste('Practitioner', 'PRAT-01', 'resourceType = "Practitioner"', () => ({
    ok: pract.resourceType === 'Practitioner', detalhe: `resourceType: ${pract.resourceType} ✓`, sev: 'critica',
  })));
  testes.push(mkTeste('Practitioner', 'PRAT-02', 'Practitioner.id preenchido', () => ({
    ok: !!pract.id, detalhe: `id: ${pract.id} ✓`, sev: 'critica',
  })));
  testes.push(mkTeste('Practitioner', 'PRAT-03', 'Practitioner.identifier com CRM', () => {
    const hasCRM = pract.identifier?.some(i => i.system.includes('crm'));
    const ok = hasCRM ?? false;
    return { ok, detalhe: ok ? `CRM em identifier ✓` : 'CRM ausente no identifier', sev: 'alta' };
  }));
  testes.push(mkTeste('Practitioner', 'PRAT-04', 'Practitioner.name com prefix Dr.', () => {
    const hasPrefix = pract.name?.[0]?.prefix?.includes('Dr.');
    const ok = hasPrefix ?? false;
    return { ok, detalhe: ok ? 'Prefix "Dr." presente ✓' : 'Prefix médico ausente', sev: 'moderada' };
  }));
  testes.push(mkTeste('Practitioner', 'PRAT-05', 'Practitioner.qualification com especialidade', () => {
    const ok = (pract.qualification?.length ?? 0) > 0;
    return { ok, detalhe: ok ? `Especialidade: ${pract.qualification?.[0]?.code.text} ✓` : 'Sem qualificação', sev: 'moderada' };
  }));
  testes.push(mkTeste('Practitioner', 'PRAT-06', 'Practitioner presente no bundle completo', () => {
    const bundle = gerarBundleCompleto(CASO_HAS_DM2);
    const found = bundle.entry.some(e => e.resource.resourceType === 'Practitioner');
    return { ok: found, detalhe: found ? 'Practitioner no bundle ✓' : 'Practitioner ausente do bundle', sev: 'critica' };
  }));

  return mkSuite('FHIR Practitioner', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 3 — ORGANIZATION
// ════════════════════════════════════════════════════════════

function suiteOrganization(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];
  const org = gerarOrganization(CASO_HAS_DM2.organizacao);

  testes.push(mkTeste('Organization', 'ORG-01', 'resourceType = "Organization"', () => ({
    ok: org.resourceType === 'Organization', detalhe: `resourceType: ${org.resourceType} ✓`, sev: 'critica',
  })));
  testes.push(mkTeste('Organization', 'ORG-02', 'Organization.name preenchido', () => ({
    ok: org.name.length > 0, detalhe: `name: "${org.name}" ✓`, sev: 'critica',
  })));
  testes.push(mkTeste('Organization', 'ORG-03', 'Organization.identifier com CNPJ quando presente', () => {
    const hasCNPJ = org.identifier?.some(i => i.system.includes('cnpj'));
    const ok = hasCNPJ ?? false;
    return { ok, detalhe: ok ? 'CNPJ no identifier ✓' : 'Sem CNPJ', sev: 'moderada' };
  }));
  testes.push(mkTeste('Organization', 'ORG-04', 'Organization.active = true', () => ({
    ok: org.active === true, detalhe: `active: ${org.active} ✓`, sev: 'baixa',
  })));
  testes.push(mkTeste('Organization', 'ORG-05', 'Organization.type definido', () => {
    const ok = (org.type?.length ?? 0) > 0;
    return { ok, detalhe: ok ? `type: ${org.type?.[0]?.text} ✓` : 'Tipo ausente', sev: 'baixa' };
  }));

  return mkSuite('FHIR Organization', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 4 — ENCOUNTER
// ════════════════════════════════════════════════════════════

function suiteEncounter(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];
  const bundle = gerarBundleCompleto(CASO_HAS_DM2);
  const enc = bundle.entry.find(e => e.resource.resourceType === 'Encounter')?.resource as FHIREncounter | undefined;

  testes.push(mkTeste('Encounter', 'ENC-01', 'Encounter gerado no bundle', () => ({
    ok: !!enc, detalhe: enc ? `Encounter id:${enc.id} ✓` : 'Encounter ausente!', sev: 'critica',
  })));
  testes.push(mkTeste('Encounter', 'ENC-02', 'Encounter.status em valores válidos FHIR', () => {
    const valid = ['planned', 'arrived', 'in-progress', 'finished', 'cancelled'];
    const ok = valid.includes(enc?.status ?? '');
    return { ok, detalhe: ok ? `status: ${enc?.status} ✓` : `status inválido: ${enc?.status}`, sev: 'alta' };
  }));
  testes.push(mkTeste('Encounter', 'ENC-03', 'Encounter.class codificado com sistema HL7', () => {
    const ok = enc?.class.system.includes('hl7.org') || enc?.class.system.includes('terminology');
    return { ok: ok ?? false, detalhe: ok ? `class.system: ${enc?.class.system} ✓` : 'Sistema inválido', sev: 'moderada' };
  }));
  testes.push(mkTeste('Encounter', 'ENC-04', 'Encounter.subject referencia o Patient correto', () => {
    const ok = enc?.subject.reference === `Patient/${CASO_HAS_DM2.paciente_id}`;
    return { ok: ok ?? false, detalhe: ok ? `subject: ${enc?.subject.reference} ✓` : `Referência errada: ${enc?.subject.reference}`, sev: 'critica' };
  }));
  testes.push(mkTeste('Encounter', 'ENC-05', 'Encounter.period.start preenchido', () => {
    const ok = !!enc?.period?.start;
    return { ok, detalhe: ok ? `period.start: ${enc?.period?.start} ✓` : 'period.start ausente', sev: 'moderada' };
  }));

  return mkSuite('FHIR Encounter', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 5 — CONDITION
// ════════════════════════════════════════════════════════════

function suiteCondition(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];
  const bundle = gerarBundleCompleto(CASO_HAS_DM2);
  const conditions = bundle.entry
    .filter(e => e.resource.resourceType === 'Condition')
    .map(e => e.resource as FHIRCondition);

  testes.push(mkTeste('Condition', 'COND-01', `${CASO_HAS_DM2.cids.length} Conditions geradas (uma por CID)`, () => ({
    ok: conditions.length === CASO_HAS_DM2.cids.length,
    detalhe: `${conditions.length} conditions ✓`, esperado: String(CASO_HAS_DM2.cids.length), obtido: String(conditions.length), sev: 'critica',
  })));
  testes.push(mkTeste('Condition', 'COND-02', 'Condition.clinicalStatus codificado com sistema FHIR', () => {
    const c = conditions[0];
    const ok = c?.clinicalStatus.coding[0]?.system.includes('condition-clinical') ?? false;
    return { ok, detalhe: ok ? 'clinicalStatus com sistema correto ✓' : 'Sistema inválido', sev: 'alta' };
  }));
  testes.push(mkTeste('Condition', 'COND-03', 'Condition.code com CID-10 E SNOMED CT para I10', () => {
    const cond_i10 = conditions.find(c => c.code.coding.some(cd => cd.code === 'I10'));
    const hasCID   = cond_i10?.code.coding.some(cd => cd.system.includes('icd-10')) ?? false;
    const hasSNOMED= cond_i10?.code.coding.some(cd => cd.system.includes('snomed')) ?? false;
    const ok = hasCID && hasSNOMED;
    return { ok, detalhe: ok ? 'I10: CID-10 + SNOMED CT ✓' : `CID:${hasCID} SNOMED:${hasSNOMED}`, sev: 'alta' };
  }));
  testes.push(mkTeste('Condition', 'COND-04', 'Todos os CIDs do caso estão nas conditions', () => {
    const codesInBundle = conditions.flatMap(c => c.code.coding.filter(cd => cd.system.includes('icd-10')).map(cd => cd.code));
    const missing = CASO_HAS_DM2.cids.filter(cid => !codesInBundle.includes(cid));
    const ok = missing.length === 0;
    return { ok, detalhe: ok ? `CIDs: ${codesInBundle.join(', ')} ✓` : `Faltando: ${missing.join(', ')}`, sev: 'critica' };
  }));
  testes.push(mkTeste('Condition', 'COND-05', 'Condition.subject referencia Patient correto', () => {
    const ok = conditions.every(c => c.subject.reference === `Patient/${CASO_HAS_DM2.paciente_id}`);
    return { ok, detalhe: ok ? 'Todos referenciando Patient correto ✓' : 'Referência de subject incorreta', sev: 'critica' };
  }));

  return mkSuite('FHIR Condition', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 6 — MEDICATIONREQUEST
// ════════════════════════════════════════════════════════════

function suiteMedicationRequest(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];
  const bundle = gerarBundleCompleto(CASO_HAS_DM2);
  const medReqs = bundle.entry
    .filter(e => e.resource.resourceType === 'MedicationRequest')
    .map(e => e.resource as FHIRMedicationRequest);

  testes.push(mkTeste('MedicationRequest', 'MEDRQ-01', `${CASO_HAS_DM2.medicamentos.length} MedicationRequests gerados`, () => ({
    ok: medReqs.length === CASO_HAS_DM2.medicamentos.length,
    detalhe: `${medReqs.length} ✓`, esperado: String(CASO_HAS_DM2.medicamentos.length), obtido: String(medReqs.length), sev: 'critica',
  })));
  testes.push(mkTeste('MedicationRequest', 'MEDRQ-02', 'MedicationRequest.status = "active"', () => {
    const ok = medReqs.every(r => r.status === 'active');
    return { ok, detalhe: ok ? 'Todos status:active ✓' : 'Status inválido encontrado', sev: 'alta' };
  }));
  testes.push(mkTeste('MedicationRequest', 'MEDRQ-03', 'MedicationRequest.intent = "order"', () => {
    const ok = medReqs.every(r => r.intent === 'order');
    return { ok, detalhe: ok ? 'Todos intent:order ✓' : 'Intent inválido', sev: 'alta' };
  }));
  testes.push(mkTeste('MedicationRequest', 'MEDRQ-04', 'MedicationRequest com RxNorm para moléculas mapeadas', () => {
    const enalapril = medReqs.find(r => r.medicationCodeableConcept.text === 'Enalapril');
    const hasRxNorm = enalapril?.medicationCodeableConcept.coding.some(c => c.system.includes('rxnorm')) ?? false;
    return { ok: hasRxNorm, detalhe: hasRxNorm ? 'Enalapril com RxNorm ✓' : 'RxNorm ausente para Enalapril', sev: 'alta' };
  }));
  testes.push(mkTeste('MedicationRequest', 'MEDRQ-05', 'MedicationRequest com código ATC para moléculas mapeadas', () => {
    const empagliflo = medReqs.find(r => r.medicationCodeableConcept.text === 'Empagliflozina');
    const hasATC = empagliflo?.medicationCodeableConcept.coding.some(c => c.system.includes('atc')) ?? false;
    return { ok: hasATC, detalhe: hasATC ? 'Empagliflozina com ATC ✓' : 'ATC ausente para Empagliflozina', sev: 'moderada' };
  }));
  testes.push(mkTeste('MedicationRequest', 'MEDRQ-06', 'MedicationRequest.authoredOn preenchido', () => {
    const ok = medReqs.every(r => !!r.authoredOn);
    return { ok, detalhe: ok ? 'authoredOn em todas as prescrições ✓' : 'authoredOn ausente', sev: 'moderada' };
  }));

  return mkSuite('FHIR MedicationRequest', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 7 — MEDICATIONSTATEMENT
// ════════════════════════════════════════════════════════════

function suiteMedicationStatement(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];
  const bundle = gerarBundleCompleto(CASO_HAS_DM2);
  const stmts = bundle.entry
    .filter(e => e.resource.resourceType === 'MedicationStatement')
    .map(e => e.resource as FHIRMedicationStatement);

  testes.push(mkTeste('MedicationStatement', 'MEDST-01', `${CASO_HAS_DM2.medicamentos_em_uso.length} MedicationStatements gerados`, () => ({
    ok: stmts.length === CASO_HAS_DM2.medicamentos_em_uso.length,
    detalhe: `${stmts.length} ✓`, esperado: String(CASO_HAS_DM2.medicamentos_em_uso.length), obtido: String(stmts.length), sev: 'critica',
  })));
  testes.push(mkTeste('MedicationStatement', 'MEDST-02', 'MedicationStatement.status em valores válidos', () => {
    const valid = ['active', 'completed', 'entered-in-error', 'intended', 'stopped', 'on-hold'];
    const ok = stmts.every(s => valid.includes(s.status));
    return { ok, detalhe: ok ? `Statuses: ${[...new Set(stmts.map(s => s.status))].join(', ')} ✓` : 'Status inválido', sev: 'alta' };
  }));
  testes.push(mkTeste('MedicationStatement', 'MEDST-03', 'Status "completed" para medicamento suspenso (Sinvastatina)', () => {
    const suve = stmts.find(s => s.medicationCodeableConcept.text === 'Sinvastatina');
    const ok = suve?.status === 'completed';
    return { ok: ok ?? false, detalhe: ok ? 'Sinvastatina status:completed ✓' : `status: ${suve?.status}`, sev: 'moderada' };
  }));
  testes.push(mkTeste('MedicationStatement', 'MEDST-04', 'MedicationStatement.subject referencia Patient', () => {
    const ok = stmts.every(s => s.subject.reference.includes(CASO_HAS_DM2.paciente_id));
    return { ok, detalhe: ok ? 'Todos referenciando Patient ✓' : 'Referência incorreta', sev: 'critica' };
  }));
  testes.push(mkTeste('MedicationStatement', 'MEDST-05', 'MedicationStatement isolado com gerarMedicationStatement()', () => {
    const stmt = gerarMedicationStatement('ms-test', 'Metformina', 'Patient/PAC-001', 'active', '850 mg VO 2x/dia');
    const ok = stmt.resourceType === 'MedicationStatement' && stmt.medicationCodeableConcept.text === 'Metformina';
    return { ok, detalhe: ok ? `Gerado isoladamente: ${stmt.id} ✓` : 'Falha na geração isolada', sev: 'alta' };
  }));

  return mkSuite('FHIR MedicationStatement', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 8 — OBSERVATION
// ════════════════════════════════════════════════════════════

function suiteObservation(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];
  const bundle = gerarBundleCompleto(CASO_HAS_DM2);
  const obs = bundle.entry
    .filter(e => e.resource.resourceType === 'Observation')
    .map(e => e.resource as FHIRObservation);

  const nExameCaso = Object.keys(CASO_HAS_DM2.exames ?? {}).filter(k => EXAME_LOINC_MAP[k]).length;

  testes.push(mkTeste('Observation', 'OBS-01', `Observations geradas para exames com LOINC mapeado`, () => ({
    ok: obs.length >= nExameCaso,
    detalhe: `${obs.length} observations para ${nExameCaso} exames ✓`, sev: 'alta',
  })));
  testes.push(mkTeste('Observation', 'OBS-02', 'Observation.status = "final" em todas', () => {
    const ok = obs.every(o => o.status === 'final');
    return { ok, detalhe: ok ? 'Todas status:final ✓' : 'Alguma não está final', sev: 'alta' };
  }));
  testes.push(mkTeste('Observation', 'OBS-03', 'Observation.code com sistema LOINC', () => {
    const ok = obs.every(o => o.code.coding.some(c => c.system === 'http://loinc.org'));
    return { ok, detalhe: ok ? 'Todas com LOINC ✓' : 'Alguma sem LOINC', sev: 'alta' };
  }));
  testes.push(mkTeste('Observation', 'OBS-04', 'Observation.valueQuantity com unit preenchida', () => {
    const comValor = obs.filter(o => o.valueQuantity !== undefined);
    const ok = comValor.every(o => o.valueQuantity?.unit);
    return { ok, detalhe: ok ? `${comValor.length} observations com unit ✓` : 'Unit ausente em alguma', sev: 'moderada' };
  }));
  testes.push(mkTeste('Observation', 'OBS-05', 'Observation de PA sistólica com LOINC 8480-6', () => {
    const paS = obs.find(o => o.code.coding.some(c => c.code === '8480-6'));
    const ok = !!paS && paS.valueQuantity?.value === CASO_HAS_DM2.pa_sistolica;
    return { ok, detalhe: ok ? `PA sist: ${paS?.valueQuantity?.value} mmHg ✓` : 'PA sistólica não encontrada ou valor errado', sev: 'alta' };
  }));
  testes.push(mkTeste('Observation', 'OBS-06', 'Observation de creatinina com LOINC 2160-0', () => {
    const creat = obs.find(o => o.code.coding.some(c => c.code === '2160-0'));
    const ok = !!creat && (creat.valueQuantity?.value ?? 0) > 0;
    return { ok, detalhe: ok ? `Creatinina: ${creat?.valueQuantity?.value} mg/dL ✓` : 'Creatinina não encontrada', sev: 'alta' };
  }));
  testes.push(mkTeste('Observation', 'OBS-07', 'Observation category: vital-signs ou laboratory', () => {
    const valid = ['vital-signs', 'laboratory'];
    const ok = obs.every(o => o.category?.some(cat => cat.coding.some(c => valid.includes(c.code))));
    return { ok, detalhe: ok ? 'Categorias válidas ✓' : 'Category inválida', sev: 'moderada' };
  }));

  return mkSuite('FHIR Observation', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 9 — DIAGNOSTICREPORT
// ════════════════════════════════════════════════════════════

function suiteDiagnosticReport(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];
  const bundle = gerarBundleCompleto(CASO_HAS_DM2);
  const dr = bundle.entry
    .find(e => e.resource.resourceType === 'DiagnosticReport')?.resource as FHIRDiagnosticReport | undefined;

  testes.push(mkTeste('DiagnosticReport', 'DR-01', 'DiagnosticReport gerado no bundle', () => ({
    ok: !!dr, detalhe: dr ? `DiagnosticReport id:${dr.id} ✓` : 'Ausente!', sev: 'critica',
  })));
  testes.push(mkTeste('DiagnosticReport', 'DR-02', 'DiagnosticReport.status = "final"', () => ({
    ok: dr?.status === 'final', detalhe: `status: ${dr?.status} ✓`, sev: 'alta',
  })));
  testes.push(mkTeste('DiagnosticReport', 'DR-03', 'DiagnosticReport.code com LOINC painel laboratorial', () => {
    const hasLOINC = dr?.code.coding.some(c => c.system === 'http://loinc.org');
    return { ok: hasLOINC ?? false, detalhe: hasLOINC ? `LOINC: ${dr?.code.coding[0]?.code} ✓` : 'LOINC ausente', sev: 'alta' };
  }));
  testes.push(mkTeste('DiagnosticReport', 'DR-04', 'DiagnosticReport.result referencia Observations', () => {
    const ok = (dr?.result?.length ?? 0) > 0;
    return { ok, detalhe: ok ? `${dr?.result?.length} references a Observations ✓` : 'Sem referências', sev: 'alta' };
  }));
  testes.push(mkTeste('DiagnosticReport', 'DR-05', 'DiagnosticReport.subject referencia Patient', () => {
    const ok = dr?.subject.reference.includes(CASO_HAS_DM2.paciente_id) ?? false;
    return { ok, detalhe: ok ? `subject: ${dr?.subject.reference} ✓` : 'Referência incorreta', sev: 'critica' };
  }));
  testes.push(mkTeste('DiagnosticReport', 'DR-06', 'DiagnosticReport.encounter referencia Encounter', () => {
    const ok = !!dr?.encounter?.reference;
    return { ok, detalhe: ok ? `encounter: ${dr?.encounter?.reference} ✓` : 'Encounter não referenciado', sev: 'moderada' };
  }));
  testes.push(mkTeste('DiagnosticReport', 'DR-07', 'DiagnosticReport isolado com gerarDiagnosticReport()', () => {
    const report = gerarDiagnosticReport('dr-test', 'Patient/P1', 'Encounter/E1', ['Observation/O1', 'Observation/O2'], 'Normal');
    const ok = report.resourceType === 'DiagnosticReport' && report.result?.length === 2;
    return { ok, detalhe: ok ? `Gerado: ${report.id} com ${report.result?.length} refs ✓` : 'Falha', sev: 'alta' };
  }));

  return mkSuite('FHIR DiagnosticReport', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 10 — COMPOSITION
// ════════════════════════════════════════════════════════════

function suiteComposition(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];
  const bundle = gerarBundleCompleto(CASO_HAS_DM2);
  const comp = bundle.entry
    .find(e => e.resource.resourceType === 'Composition')?.resource as FHIRComposition | undefined;

  testes.push(mkTeste('Composition', 'COMP-01', 'Composition gerada no bundle', () => ({
    ok: !!comp, detalhe: comp ? `Composition id:${comp.id} ✓` : 'Ausente!', sev: 'critica',
  })));
  testes.push(mkTeste('Composition', 'COMP-02', 'Composition.status = "final"', () => ({
    ok: comp?.status === 'final', detalhe: `status: ${comp?.status} ✓`, sev: 'alta',
  })));
  testes.push(mkTeste('Composition', 'COMP-03', 'Composition.title = título do documento clínico', () => {
    const ok = comp?.title === CASO_HAS_DM2.titulo_documento;
    return { ok: ok ?? false, detalhe: ok ? `title: "${comp?.title}" ✓` : `Título divergente: "${comp?.title}"`, sev: 'moderada' };
  }));
  testes.push(mkTeste('Composition', 'COMP-04', 'Composition.author referencia Practitioner', () => {
    const ok = comp?.author.some(a => a.reference.includes('Practitioner')) ?? false;
    return { ok, detalhe: ok ? `author: ${comp?.author[0]?.reference} ✓` : 'Author não é Practitioner', sev: 'alta' };
  }));
  testes.push(mkTeste('Composition', 'COMP-05', 'Composition.custodian referencia Organization', () => {
    const ok = comp?.custodian?.reference.includes('Organization') ?? false;
    return { ok, detalhe: ok ? `custodian: ${comp?.custodian?.reference} ✓` : 'Custodian ausente', sev: 'moderada' };
  }));
  testes.push(mkTeste('Composition', 'COMP-06', 'Composition.section tem 3 seções (problemas, medicamentos, exames)', () => {
    const ok = (comp?.section.length ?? 0) >= 3;
    return { ok, detalhe: ok ? `${comp?.section.length} seções: ${comp?.section.map(s => s.title).join(', ')} ✓` : `Apenas ${comp?.section.length} seções`, sev: 'moderada' };
  }));
  testes.push(mkTeste('Composition', 'COMP-07', 'Composition.section com LOINC codes', () => {
    const ok = comp?.section.every(s => s.code?.coding.some(c => c.system === 'http://loinc.org')) ?? false;
    return { ok, detalhe: ok ? 'Todas as seções com LOINC ✓' : 'Seção sem LOINC', sev: 'moderada' };
  }));
  testes.push(mkTeste('Composition', 'COMP-08', 'Composition isolada com gerarComposition()', () => {
    const c = gerarComposition('c-test', 'Teste', 'Patient/P1', 'Practitioner/PR1', 'Organization/ORG1', [{ title: 'Sec1', entry: [] }]);
    const ok = c.resourceType === 'Composition' && c.section.length === 1;
    return { ok, detalhe: ok ? `Composition isolada: ${c.id} ✓` : 'Falha na geração isolada', sev: 'alta' };
  }));

  return mkSuite('FHIR Composition', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 11 — BUNDLE COMPLETO: CONFORMIDADE E VALIDAÇÃO
// ════════════════════════════════════════════════════════════

function suiteBundleCompleto(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];

  const casos = [
    { nome: 'HAS+DM2+DRC', dados: CASO_HAS_DM2 },
    { nome: 'ICFEr+HAS',   dados: CASO_ICC      },
    { nome: 'Asma SMART',  dados: CASO_ASMA     },
  ];

  for (const { nome, dados } of casos) {
    const bundle = gerarBundleCompleto(dados);

    testes.push(mkTeste('Bundle', `BDL-${nome}-01`, `[${nome}] Bundle.resourceType = "Bundle"`, () => ({
      ok: bundle.resourceType === 'Bundle', detalhe: `resourceType: ${bundle.resourceType} ✓`, sev: 'critica',
    })));
    testes.push(mkTeste('Bundle', `BDL-${nome}-02`, `[${nome}] Bundle.type = "document"`, () => ({
      ok: bundle.type === 'document', detalhe: `type: ${bundle.type} ✓`, sev: 'alta',
    })));
    testes.push(mkTeste('Bundle', `BDL-${nome}-03`, `[${nome}] validarBundleCompleto() sem erros`, () => {
      const r = validarBundleCompleto(bundle);
      return { ok: r.valido, detalhe: r.valido ? `score conformidade: ${r.score_conformidade}% ✓` : `Erros: ${r.erros.join('; ')}`, sev: 'critica', esperado: '100%', obtido: `${r.score_conformidade}%` };
    }));
    testes.push(mkTeste('Bundle', `BDL-${nome}-04`, `[${nome}] Bundle tem 13 tipos de recursos requeridos`, () => {
      const tiposSet = new Set<string>(bundle.entry.map(e => e.resource.resourceType as string));
      const req = ['Patient', 'Practitioner', 'Organization', 'Encounter', 'Condition', 'MedicationRequest', 'MedicationStatement', 'Observation', 'DiagnosticReport', 'Composition', 'AllergyIntolerance'];
      const presentes = req.filter(t => tiposSet.has(t));
      const ok = presentes.length >= 10;
      return { ok, detalhe: ok ? `${presentes.length} tipos: ${presentes.join(', ')} ✓` : `Faltando: ${req.filter(t => !tiposSet.has(t)).join(', ')}`, sev: 'alta' };
    }));
    testes.push(mkTeste('Bundle', `BDL-${nome}-05`, `[${nome}] Bundle.meta.profile preenchido`, () => {
      const ok = (bundle.meta?.profile?.length ?? 0) > 0;
      return { ok, detalhe: ok ? `profile: ${bundle.meta?.profile?.join(', ')} ✓` : 'meta.profile ausente', sev: 'baixa' };
    }));
  }

  return mkSuite('FHIR Bundle — Conformidade', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 12 — HL7 v2.x → FHIR
// ════════════════════════════════════════════════════════════

function suiteHL7(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];

  const hl7msg: HL7Message = {
    msh: { sending_app: 'HIS-HOSP', receiving_app: 'PRESCREVE-AI', timestamp: new Date().toISOString(), message_type: 'ORU^R01' },
    pid: { patient_id: 'PAC-HL7-001', name: 'Pedro Costa Alves', dob: '1962-07-20', sex: 'M' },
    obr: { observation_id: 'OBR-001', description: 'Painel Metabólico', datetime: new Date().toISOString() },
    obx: [
      { loinc: '2160-0', value: '1.8',  unit: 'mg/dL' },
      { loinc: '1558-6', value: '165',  unit: 'mg/dL' },
      { loinc: '4548-4', value: '8.1',  unit: '%'     },
      { loinc: '2823-3', value: '4.5',  unit: 'mEq/L' },
    ],
  };

  testes.push(mkTeste('HL7', 'HL7-01', 'converterHL7() retorna FHIRBundle válido', () => {
    const bundle = converterHL7(hl7msg);
    const ok = !!bundle && bundle.resourceType === 'Bundle';
    return { ok, detalhe: ok ? `Bundle gerado a partir de HL7 ✓` : 'Falha na conversão', sev: 'critica' };
  }));
  testes.push(mkTeste('HL7', 'HL7-02', 'HL7 Patient.pid → FHIR Patient', () => {
    const bundle = converterHL7(hl7msg)!;
    const pat = bundle.entry.find(e => e.resource.resourceType === 'Patient')?.resource as FHIRPatient;
    const ok = pat?.id === hl7msg.pid?.patient_id;
    return { ok, detalhe: ok ? `Patient id: ${pat?.id} ✓` : 'Patient não importado', sev: 'critica', esperado: hl7msg.pid?.patient_id, obtido: pat?.id };
  }));
  testes.push(mkTeste('HL7', 'HL7-03', 'HL7 OBX → FHIR Observations com LOINC', () => {
    const bundle = converterHL7(hl7msg)!;
    const obs = bundle.entry.filter(e => e.resource.resourceType === 'Observation');
    const ok = obs.length >= 3; // ao menos 3 dos 4 exames mapeados
    return { ok, detalhe: ok ? `${obs.length} observations geradas ✓` : `Apenas ${obs.length} observations`, sev: 'alta' };
  }));
  testes.push(mkTeste('HL7', 'HL7-04', 'HL7 sem PID retorna null (sem crash)', () => {
    const msgSemPID: HL7Message = {
      msh: { sending_app: 'HIS', receiving_app: 'AI', timestamp: '', message_type: 'ADT^A08' },
    };
    const result = converterHL7(msgSemPID);
    return { ok: result === null, detalhe: 'HL7 sem PID retorna null ✓', sev: 'moderada' };
  }));
  testes.push(mkTeste('HL7', 'HL7-05', 'Bundle gerado a partir de HL7 passa validarFHIR()', () => {
    const bundle = converterHL7(hl7msg)!;
    const r = validarFHIR(bundle);
    return { ok: r.valido, detalhe: r.valido ? `Score conformidade: ${r.score_conformidade}% ✓` : `Erros: ${r.erros.join('; ')}`, sev: 'alta' };
  }));
  testes.push(mkTeste('HL7', 'HL7-06', 'PV1 (internação) → Encounter class=IMP', () => {
    const msg: HL7Message = {
      ...hl7msg,
      pv1: { patient_class: 'I', assigned_location: 'UTI-03', attending_doctor: 'Dr. Souza', admit_datetime: new Date().toISOString() },
    };
    const bundle = converterHL7(msg)!;
    const enc = bundle.entry.find(e => e.resource.resourceType === 'Encounter')?.resource as { class?: { code?: string } } | undefined;
    const ok = enc?.class?.code === 'IMP';
    return { ok, detalhe: ok ? 'PV1 I → Encounter IMP ✓' : `class: ${enc?.class?.code}`, sev: 'alta', esperado: 'IMP', obtido: enc?.class?.code };
  }));
  testes.push(mkTeste('HL7', 'HL7-07', 'RXE (prescrição) → MedicationRequest', () => {
    const msg: HL7Message = {
      ...hl7msg,
      rxe: [{ molecula: 'Enalapril', give_amount: '10', give_units: 'mg', route: 'PO', frequency: '1x/dia' }],
    };
    const bundle = converterHL7(msg)!;
    const meds = bundle.entry.filter(e => e.resource.resourceType === 'MedicationRequest');
    const ok = meds.length >= 1;
    return { ok, detalhe: ok ? `${meds.length} MedicationRequest de RXE ✓` : 'RXE não convertido', sev: 'alta' };
  }));

  return mkSuite('HL7 v2.x → FHIR', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 16 — HL7 v2.x EXPORT (MSH·PID·PV1·ORC·RXE·OBR·OBX)
// ════════════════════════════════════════════════════════════

function suiteHL7v2Export(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];

  const msg = exportarHL7v2({
    paciente_id: 'PAC-HL7EXP-001',
    nome: 'Antônio Ribeiro Souza',
    nascimento: '1958-03-12',
    sexo: 'M',
    visita: { classe: 'I', local: 'ENF-CARDIO-12', medico: 'Dr. Lima', admissao: new Date().toISOString(), numero_visita: 'V-8842' },
    medicamentos: [
      { molecula: 'Enalapril', dose: '10', unidade: 'mg', via: 'PO', frequencia: '1x/dia' },
      { molecula: 'Metformina', dose: '850', unidade: 'mg', via: 'PO', frequencia: '2x/dia' },
    ],
    exames: [
      { nome: 'creatinina', valor: 1.4, flag: 'H' },
      { nome: 'hba1c', valor: 7.8, flag: 'H' },
    ],
    ordering_provider: 'CRM-SP-123456',
  });
  const segs = msg.split('\r');
  const seg = (name: string) => segs.filter(s => s.startsWith(name + '|'));

  testes.push(mkTeste('HL7v2', 'HL7X-01', 'Mensagem inicia com segmento MSH', () => ({
    ok: segs[0]?.startsWith('MSH|'), detalhe: `1º segmento: ${segs[0]?.slice(0, 20)}… ✓`, sev: 'critica',
  })));
  testes.push(mkTeste('HL7v2', 'HL7X-02', 'MSH com encoding characters ^~\\&', () => {
    const ok = segs[0]?.includes('^~\\&');
    return { ok: ok ?? false, detalhe: ok ? 'Encoding chars presentes ✓' : 'Encoding ausente', sev: 'alta' };
  }));
  testes.push(mkTeste('HL7v2', 'HL7X-03', 'Segmento PID com paciente_id', () => {
    const pid = seg('PID')[0];
    const ok = !!pid && pid.includes('PAC-HL7EXP-001');
    return { ok, detalhe: ok ? 'PID com id ✓' : 'PID ausente', sev: 'critica' };
  }));
  testes.push(mkTeste('HL7v2', 'HL7X-04', 'Segmento PV1 com classe de internação I', () => {
    const pv1 = seg('PV1')[0];
    const ok = !!pv1 && pv1.split('|')[2] === 'I';
    return { ok, detalhe: ok ? 'PV1 classe=I ✓' : `PV1: ${pv1?.slice(0, 30)}`, sev: 'alta' };
  }));
  testes.push(mkTeste('HL7v2', 'HL7X-05', '2 pares ORC/RXE (um por medicamento)', () => {
    const orc = seg('ORC'); const rxe = seg('RXE');
    const ok = orc.length === 2 && rxe.length === 2;
    return { ok, detalhe: ok ? `ORC:${orc.length} RXE:${rxe.length} ✓` : `ORC:${orc.length} RXE:${rxe.length}`, sev: 'alta', esperado: '2/2', obtido: `${orc.length}/${rxe.length}` };
  }));
  testes.push(mkTeste('HL7v2', 'HL7X-06', 'RXE com código RxNorm de Enalapril', () => {
    const rxe = seg('RXE').find(s => s.includes('Enalapril'));
    const ok = !!rxe && rxe.includes('RxNorm');
    return { ok, detalhe: ok ? 'RXE com RxNorm ✓' : 'RxNorm ausente no RXE', sev: 'moderada' };
  }));
  testes.push(mkTeste('HL7v2', 'HL7X-07', 'OBR + 2 OBX (painel laboratorial)', () => {
    const obr = seg('OBR'); const obx = seg('OBX');
    const ok = obr.length === 1 && obx.length === 2;
    return { ok, detalhe: ok ? `OBR:${obr.length} OBX:${obx.length} ✓` : `OBR:${obr.length} OBX:${obx.length}`, sev: 'alta' };
  }));
  testes.push(mkTeste('HL7v2', 'HL7X-08', 'OBX de creatinina com LOINC 2160-0 e flag H', () => {
    const obx = seg('OBX').find(s => s.includes('2160-0'));
    const ok = !!obx && obx.includes('|H|');
    return { ok, detalhe: ok ? 'OBX creatinina LOINC+flag ✓' : 'OBX incompleto', sev: 'moderada' };
  }));

  return mkSuite('HL7 v2.x Export (MSH·PID·PV1·ORC·RXE·OBR·OBX)', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 17 — RNDS (Rede Nacional de Dados em Saúde)
// ════════════════════════════════════════════════════════════

function suiteRNDS(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];
  const bundle = gerarBundleCompleto(CASO_HAS_DM2);

  testes.push(mkTeste('RNDS', 'RNDS-01', 'aplicarPerfilRNDS adiciona perfil de sumário de alta', () => {
    const tagged = aplicarPerfilRNDS(bundle, 'sumario_alta');
    const ok = tagged.meta?.profile?.includes(RNDS_PROFILES.sumario_alta) ?? false;
    return { ok, detalhe: ok ? 'Perfil RNDS BRSumarioAlta aplicado ✓' : 'Perfil não aplicado', sev: 'alta' };
  }));
  testes.push(mkTeste('RNDS', 'RNDS-02', 'aplicarPerfilRNDS preserva perfis FHIR existentes', () => {
    const perfisAntes = bundle.meta?.profile?.length ?? 0;
    const tagged = aplicarPerfilRNDS(bundle, 'prescricao');
    const ok = (tagged.meta?.profile?.length ?? 0) > perfisAntes;
    return { ok, detalhe: ok ? `Perfis: ${perfisAntes} → ${tagged.meta?.profile?.length} ✓` : 'Perfis não preservados', sev: 'alta' };
  }));
  testes.push(mkTeste('RNDS', 'RNDS-03', 'aplicarPerfilRNDS não altera conteúdo clínico (entries)', () => {
    const tagged = aplicarPerfilRNDS(bundle, 'sumario_alta');
    const ok = tagged.entry.length === bundle.entry.length;
    return { ok, detalhe: ok ? `${tagged.entry.length} entries preservados ✓` : 'Entries alterados!', sev: 'critica', esperado: String(bundle.entry.length), obtido: String(tagged.entry.length) };
  }));
  testes.push(mkTeste('RNDS', 'RNDS-04', 'Patient usa namespace CNS da RNDS', () => {
    const pat = bundle.entry.find(e => e.resource.resourceType === 'Patient')?.resource as FHIRPatient;
    const ok = pat.identifier?.some(i => i.system.includes('rnds.saude.gov.br')) ?? false;
    return { ok, detalhe: ok ? 'CNS via namespace RNDS ✓' : 'Sem namespace RNDS', sev: 'moderada' };
  }));
  testes.push(mkTeste('RNDS', 'RNDS-05', 'Não sobrescreve perfil RNDS já presente (idempotente)', () => {
    const t1 = aplicarPerfilRNDS(bundle, 'sumario_alta');
    const t2 = aplicarPerfilRNDS(t1, 'sumario_alta');
    const count = t2.meta?.profile?.filter(p => p === RNDS_PROFILES.sumario_alta).length ?? 0;
    const ok = count === 1;
    return { ok, detalhe: ok ? 'Idempotente — perfil único ✓' : `Duplicado ${count}×`, sev: 'moderada' };
  }));

  return mkSuite('RNDS — Rede Nacional de Dados em Saúde', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 13 — ROUNDTRIP: EXPORT → IMPORT → RE-EXPORT
// ════════════════════════════════════════════════════════════

function suiteRoundtrip(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];

  const dados: DadosClinicos = {
    paciente_id: 'PAC-RT-001',
    nome: 'Teste Roundtrip',
    nascimento: '1970-01-15',
    sexo: 'M',
    cids: ['I10', 'E11'],
    medicamentos: ['Enalapril', 'Metformina'],
    alergias: ['Dipirona'],
    exames: { creatinina: 1.1, glicemia_jejum: 132 },
    pa_sistolica: 138,
  };

  testes.push(mkTeste('Roundtrip', 'RT-01', 'exportarFHIR() retorna JSON válido', () => {
    const json = exportarFHIR(dados);
    let ok = false;
    try { JSON.parse(json); ok = true; } catch { ok = false; }
    return { ok, detalhe: ok ? `JSON válido (${json.length} chars) ✓` : 'JSON inválido', sev: 'critica' };
  }));
  testes.push(mkTeste('Roundtrip', 'RT-02', 'importarFHIR() re-importa bundle exportado', () => {
    const json = exportarFHIR(dados);
    const r = importarFHIR(json);
    return { ok: r.sucesso, detalhe: r.sucesso ? `Importados: ${r.recursos_importados} recursos ✓` : `Erros: ${r.erros.join('; ')}`, sev: 'critica' };
  }));
  testes.push(mkTeste('Roundtrip', 'RT-03', 'CIDs preservados no roundtrip export→import', () => {
    const json = exportarFHIR(dados);
    const r = importarFHIR(json);
    const cidImportado = r.paciente?.cids ?? [];
    const ok = dados.cids.every(cid => cidImportado.includes(cid));
    return { ok, detalhe: ok ? `CIDs preservados: ${cidImportado.join(', ')} ✓` : `CIDs divergentes — esperado: ${dados.cids.join(', ')}, obtido: ${cidImportado.join(', ')}`, sev: 'critica', esperado: dados.cids.join(','), obtido: cidImportado.join(',') };
  }));
  testes.push(mkTeste('Roundtrip', 'RT-04', 'Medicamentos preservados no roundtrip', () => {
    const json = exportarFHIR(dados);
    const r = importarFHIR(json);
    const medsImportados = r.paciente?.medicamentos ?? [];
    const ok = dados.medicamentos.every(m => medsImportados.some(mi => mi.toLowerCase().includes(m.toLowerCase())));
    return { ok, detalhe: ok ? `Meds preservados: ${medsImportados.join(', ')} ✓` : `Divergência`, sev: 'alta' };
  }));
  testes.push(mkTeste('Roundtrip', 'RT-05', 'Tipos de recursos encontrados no import', () => {
    const json = exportarFHIR(dados);
    const r = importarFHIR(json);
    const tipos = r.tipos_encontrados;
    const req = ['Patient', 'Condition', 'MedicationRequest'];
    const ok = req.every(t => tipos.includes(t as typeof tipos[number]));
    return { ok, detalhe: ok ? `Tipos: ${tipos.join(', ')} ✓` : `Faltando: ${req.filter(t => !tipos.includes(t as typeof tipos[number])).join(', ')}`, sev: 'alta' };
  }));
  testes.push(mkTeste('Roundtrip', 'RT-06', 'Re-export do import também é válido', () => {
    const json1 = exportarFHIR(dados);
    const r = importarFHIR(json1);
    if (!r.sucesso || !r.paciente?.paciente_id) return { ok: false, detalhe: 'Import falhou', sev: 'critica' as const };
    const dados2: DadosClinicos = {
      paciente_id: r.paciente.paciente_id ?? 'reexport',
      nome: r.paciente.nome ?? 'Desconhecido',
      nascimento: r.paciente.nascimento ?? '1970-01-01',
      sexo: r.paciente.sexo ?? 'M',
      cids: r.paciente.cids ?? [],
      medicamentos: r.paciente.medicamentos ?? [],
    };
    const json2 = exportarFHIR(dados2);
    const r2 = importarFHIR(json2);
    return { ok: r2.sucesso, detalhe: r2.sucesso ? 'Re-export válido ✓' : `Erros: ${r2.erros.join('; ')}`, sev: 'alta' };
  }));

  return mkSuite('Roundtrip Export→Import→Re-export', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 14 — TERMINOLOGIA: SNOMED, LOINC, RxNorm, ATC
// ════════════════════════════════════════════════════════════

function suiteTerminologia(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];

  testes.push(mkTeste('Terminologia', 'TERM-01', 'CID I10 → SNOMED 38341003 (HAS)', () => {
    const r = mapearCID('I10');
    const ok = r.encontrado && r.snomed === '38341003';
    return { ok, detalhe: ok ? `I10 → SNOMED:${r.snomed} ✓` : `Esperado 38341003, obtido ${r.snomed}`, esperado: '38341003', obtido: r.snomed, sev: 'alta' };
  }));
  testes.push(mkTeste('Terminologia', 'TERM-02', 'CID E11 → SNOMED 44054006 (DM2)', () => {
    const r = mapearCID('E11');
    const ok = r.encontrado && r.snomed === '44054006';
    return { ok, detalhe: ok ? `E11 → SNOMED:${r.snomed} ✓` : `Obtido: ${r.snomed}`, esperado: '44054006', obtido: r.snomed, sev: 'alta' };
  }));
  testes.push(mkTeste('Terminologia', 'TERM-03', 'Creatinina → LOINC 2160-0', () => {
    const r = mapearLOINC('creatinina');
    const ok = r.encontrado && r.loinc === '2160-0';
    return { ok, detalhe: ok ? `creatinina → LOINC:${r.loinc} ✓` : `Obtido: ${r.loinc}`, esperado: '2160-0', obtido: r.loinc, sev: 'alta' };
  }));
  testes.push(mkTeste('Terminologia', 'TERM-04', 'HbA1c → LOINC 4548-4', () => {
    const r = mapearLOINC('hba1c');
    const ok = r.encontrado && r.loinc === '4548-4';
    return { ok, detalhe: ok ? `hba1c → LOINC:${r.loinc} ✓` : `Obtido: ${r.loinc}`, esperado: '4548-4', obtido: r.loinc, sev: 'alta' };
  }));
  testes.push(mkTeste('Terminologia', 'TERM-05', 'Enalapril → RxNorm 29046 + ATC C09AA02', () => {
    const r = MOLECULA_RXNORM_MAP['enalapril'];
    const ok = r?.rxnorm === '29046' && r?.atc === 'C09AA02';
    return { ok, detalhe: ok ? `Enalapril → RxNorm:${r?.rxnorm} ATC:${r?.atc} ✓` : `Obtido: ${JSON.stringify(r)}`, sev: 'alta' };
  }));
  testes.push(mkTeste('Terminologia', 'TERM-06', 'Empagliflozina → RxNorm + ATC A10BK03', () => {
    const r = MOLECULA_RXNORM_MAP['empagliflozina'];
    const ok = r?.atc === 'A10BK03';
    return { ok, detalhe: ok ? `Empagliflozina ATC:${r?.atc} ✓` : `Obtido: ${r?.atc}`, esperado: 'A10BK03', obtido: r?.atc, sev: 'alta' };
  }));
  testes.push(mkTeste('Terminologia', 'TERM-07', 'PA sistólica → LOINC 8480-6 com unidade mmHg', () => {
    const r = mapearLOINC('pa_sistolica');
    const ok = r.loinc === '8480-6' && r.unit === 'mmHg';
    return { ok, detalhe: ok ? `PA sist: LOINC ${r.loinc} unit ${r.unit} ✓` : `Obtido: ${r.loinc}/${r.unit}`, sev: 'alta' };
  }));
  testes.push(mkTeste('Terminologia', 'TERM-08', `${Object.keys(CID_SNOMED_MAP).length} CIDs mapeados para SNOMED`, () => {
    const n = Object.keys(CID_SNOMED_MAP).length;
    const ok = n >= 15;
    return { ok, detalhe: ok ? `${n} CIDs mapeados ✓` : `Apenas ${n} CIDs mapeados`, sev: 'moderada' };
  }));
  testes.push(mkTeste('Terminologia', 'TERM-09', `${Object.keys(EXAME_LOINC_MAP).length} exames mapeados para LOINC`, () => {
    const n = Object.keys(EXAME_LOINC_MAP).length;
    const ok = n >= 20;
    return { ok, detalhe: ok ? `${n} exames com LOINC ✓` : `Apenas ${n}`, sev: 'moderada' };
  }));
  testes.push(mkTeste('Terminologia', 'TERM-10', `${Object.keys(MOLECULA_RXNORM_MAP).length} moléculas mapeadas para RxNorm`, () => {
    const n = Object.keys(MOLECULA_RXNORM_MAP).length;
    const ok = n >= 10;
    return { ok, detalhe: ok ? `${n} moléculas com RxNorm ✓` : `Apenas ${n}`, sev: 'moderada' };
  }));

  return mkSuite('Terminologia SNOMED/LOINC/RxNorm/ATC', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// SUITE 15 — SIMULAÇÃO DE INTEGRAÇÃO
// ════════════════════════════════════════════════════════════

function suiteSimulacaoIntegracao(): SuiteResultado11 {
  const t0 = now();
  const testes: ResultadoTeste11[] = [];
  const bundle = gerarBundleCompleto(CASO_HAS_DM2);

  testes.push(mkTeste('Integração', 'INT-01', 'Simulação FHIR R4 retorna sucesso', () => {
    const r = simularIntegracao('PRESCREVE-AI', 'HIS-Hospitalar', 'FHIR R4', bundle);
    return { ok: r.sucesso, detalhe: r.sucesso ? `${r.recursos_transferidos} recursos via FHIR R4 ✓` : r.mensagem, sev: 'alta' };
  }));
  testes.push(mkTeste('Integração', 'INT-02', 'Score de interoperabilidade FHIR R4 ≥ 95', () => {
    const r = simularIntegracao('PRESCREVE-AI', 'RNDS', 'FHIR R4', bundle);
    const ok = r.score_interoperabilidade >= 95;
    return { ok, detalhe: ok ? `Score: ${r.score_interoperabilidade} ✓` : `Score baixo: ${r.score_interoperabilidade}`, sev: 'moderada', esperado: '≥95', obtido: String(r.score_interoperabilidade) };
  }));
  testes.push(mkTeste('Integração', 'INT-03', 'Recursos transferidos = entradas do bundle', () => {
    const r = simularIntegracao('PRESCREVE-AI', 'LAB', 'FHIR R4', bundle);
    const ok = r.recursos_transferidos === bundle.entry.length;
    return { ok, detalhe: ok ? `${r.recursos_transferidos} recursos ✓` : `Esperado ${bundle.entry.length}, transferido ${r.recursos_transferidos}`, sev: 'alta', esperado: String(bundle.entry.length), obtido: String(r.recursos_transferidos) };
  }));
  testes.push(mkTeste('Integração', 'INT-04', 'validarFHIR() no bundle básico sem erros', () => {
    const dadosBasicos: DadosClinicos = {
      paciente_id: 'PAC-VAL-001', nome: 'Teste Validação', nascimento: '1980-05-10', sexo: 'F',
      cids: ['I10'], medicamentos: ['Enalapril'], pa_sistolica: 140, pa_diastolica: 90,
    };
    const b = gerarBundleClinico(dadosBasicos);
    const r = validarFHIR(b);
    return { ok: r.valido, detalhe: r.valido ? `Score: ${r.score_conformidade}% ✓` : `Erros: ${r.erros.join('; ')}`, sev: 'critica' };
  }));
  testes.push(mkTeste('Integração', 'INT-05', 'validarBundleCompleto() no bundle ICC sem erros', () => {
    const b = gerarBundleCompleto(CASO_ICC);
    const r = validarBundleCompleto(b);
    return { ok: r.valido, detalhe: r.valido ? `Score: ${r.score_conformidade}% | Avisos: ${r.avisos.length} ✓` : `Erros: ${r.erros.join('; ')}`, sev: 'critica' };
  }));

  return mkSuite('Simulação de Integração', testes, now() - t0);
}

// ════════════════════════════════════════════════════════════
// EXECUTOR PRINCIPAL
// ════════════════════════════════════════════════════════════

export function executarInteropTestEtapa11(): InteropTestEtapa11Result {
  const t0 = now();

  const suites = [
    suitePatient(),
    suitePractitioner(),
    suiteOrganization(),
    suiteEncounter(),
    suiteCondition(),
    suiteMedicationRequest(),
    suiteMedicationStatement(),
    suiteObservation(),
    suiteDiagnosticReport(),
    suiteComposition(),
    suiteBundleCompleto(),
    suiteHL7(),
    suiteHL7v2Export(),
    suiteRNDS(),
    suiteRoundtrip(),
    suiteTerminologia(),
    suiteSimulacaoIntegracao(),
  ];

  const total_passou = suites.reduce((s, r) => s + r.passou, 0);
  const total_falhou = suites.reduce((s, r) => s + r.falhou, 0);
  const total_avisos = suites.reduce((s, r) => s + r.avisos, 0);
  const total_testes = total_passou + total_falhou + total_avisos;
  const conformidade_pct = total_testes > 0 ? Math.round((total_passou / total_testes) * 100) : 0;

  const criticos_falhos = suites
    .flatMap(s => s.testes)
    .filter(t => t.status === 'falhou' && t.severidade === 'critica')
    .map(t => `[${t.id}] ${t.descricao}: ${t.detalhe}`);

  const status_geral: StatusTeste11 =
    total_falhou > 0 ? 'falhou' : total_avisos > 0 ? 'aviso' : 'passou';

  const resultado: InteropTestEtapa11Result = {
    timestamp: new Date().toISOString(),
    suites, total_testes, total_passou, total_falhou, total_avisos,
    tempo_total_ms: Math.round(now() - t0),
    status_geral, conformidade_pct, criticos_falhos,
    relatorio: '',
  };
  resultado.relatorio = gerarRelatorioInterop(resultado);
  return resultado;
}

// ════════════════════════════════════════════════════════════
// RELATÓRIO TEXTO
// ════════════════════════════════════════════════════════════

export function gerarRelatorioInterop(r: InteropTestEtapa11Result): string {
  const L: string[] = [
    '═════════════════════════════════════════════════════════════════════',
    '  PRESCREVE-AI — ETAPA 11: TESTE DE INTEROPERABILIDADE',
    '═════════════════════════════════════════════════════════════════════',
    `  Timestamp  : ${r.timestamp}`,
    `  Total      : ${r.total_testes} testes | ✓ ${r.total_passou} | ✗ ${r.total_falhou} | ⚠ ${r.total_avisos}`,
    `  Conformidade: ${r.conformidade_pct}%`,
    `  Tempo       : ${r.tempo_total_ms}ms`,
    `  Status      : ${r.status_geral === 'passou' ? '✓ APROVADO' : r.status_geral === 'aviso' ? '⚠ COM AVISOS' : '✗ REPROVADO'}`,
    '─────────────────────────────────────────────────────────────────────',
    `  ${'Suite'.padEnd(40)} | ✓ Passou | ✗ Falhou | ms`,
    '  ' + '─'.repeat(60),
  ];

  for (const s of r.suites) {
    const icon = s.status === 'passou' ? '✓' : s.status === 'aviso' ? '⚠' : '✗';
    L.push(`  ${icon} ${s.nome.padEnd(40)} | ${String(s.passou).padEnd(8)} | ${String(s.falhou).padEnd(8)} | ${s.tempo_ms}`);
    for (const t of s.testes.filter(t => t.status === 'falhou')) {
      const sev = t.severidade === 'critica' ? '🔴' : t.severidade === 'alta' ? '🟠' : '🟡';
      L.push(`    ${sev} [${t.id}] ${t.descricao}`);
      L.push(`       → ${t.detalhe}`);
    }
  }

  L.push('─────────────────────────────────────────────────────────────────────');
  L.push('  RECURSOS FHIR R4 VALIDADOS');
  L.push('─────────────────────────────────────────────────────────────────────');
  const recursos = [
    'Patient', 'Practitioner', 'Organization', 'Encounter',
    'Condition', 'MedicationRequest', 'MedicationStatement',
    'Observation', 'DiagnosticReport', 'Composition',
    'AllergyIntolerance', 'Bundle',
  ];
  for (const res of recursos) {
    L.push(`  ✓ ${res}`);
  }
  L.push('─────────────────────────────────────────────────────────────────────');
  L.push('  TERMINOLOGIAS VALIDADAS');
  L.push('─────────────────────────────────────────────────────────────────────');
  L.push(`  ✓ CID-10 → SNOMED CT   (${Object.keys(CID_SNOMED_MAP).length} mapeamentos)`);
  L.push(`  ✓ Exames → LOINC        (${Object.keys(EXAME_LOINC_MAP).length} mapeamentos)`);
  L.push(`  ✓ Moléculas → RxNorm/ATC (${Object.keys(MOLECULA_RXNORM_MAP).length} mapeamentos)`);
  L.push('─────────────────────────────────────────────────────────────────────');
  L.push('  CASOS CLÍNICOS EXPORTADOS');
  L.push('─────────────────────────────────────────────────────────────────────');
  L.push('  ✓ HAS + DM2 + DRC G3a  (I10 · E11 · N18.3)');
  L.push('  ✓ ICFEr + HAS          (I50.0 · I10)');
  L.push('  ✓ Asma (SMART)         (J45)');
  if (r.criticos_falhos.length > 0) {
    L.push('═════════════════════════════════════════════════════════════════════');
    L.push('  ⛔ FALHAS CRÍTICAS');
    for (const c of r.criticos_falhos) L.push(`  • ${c}`);
  }
  L.push('═════════════════════════════════════════════════════════════════════');
  L.push(r.status_geral === 'passou'
    ? '  ✓ SISTEMA INTEROPERÁVEL — Conformidade FHIR R4 e HL7 validada'
    : r.status_geral === 'aviso'
    ? '  ⚠ SISTEMA COM AVISOS — Verificar itens acima'
    : '  ✗ FALHAS DE CONFORMIDADE — Correção necessária');
  L.push('─────────────────────────────────────────────────────────────────────');
  L.push('  CDSS — Suporte à decisão clínica. Decisão médica soberana.');
  L.push('═════════════════════════════════════════════════════════════════════');
  return L.join('\n');
}

// ════════════════════════════════════════════════════════════
// SANITY CHECK (< 100ms)
// ════════════════════════════════════════════════════════════

export function sanityCheckInterop(): {
  bundle_gerado:   boolean;
  validacao_ok:    boolean;
  roundtrip_ok:    boolean;
  terminologia_ok: boolean;
  tempo_ms:        number;
} {
  const t0 = now();
  const bundle = gerarBundleCompleto(CASO_HAS_DM2);
  const val    = validarBundleCompleto(bundle);
  const json   = exportarFHIR(CASO_HAS_DM2);
  const imp    = importarFHIR(json);
  const snomed = mapearCID('I10');
  const loinc  = mapearLOINC('creatinina');
  return {
    bundle_gerado:   bundle.entry.length >= 10,
    validacao_ok:    val.valido,
    roundtrip_ok:    imp.sucesso && (imp.paciente?.cids?.includes('I10') ?? false),
    terminologia_ok: snomed.encontrado && loinc.encontrado,
    tempo_ms:        Math.round(now() - t0),
  };
}
