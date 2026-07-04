// ============================================================
// PRESCREVE-AI — Interoperability Engine (Phase 17)
// FHIR R4 · HL7 · TISS Brasil
// Suporte à decisão clínica — não substitui o médico
// ============================================================

// ══════════════════════════════════════════════════════════════
// TIPOS FHIR R4
// ══════════════════════════════════════════════════════════════

export type FHIRResourceType =
  | 'Patient' | 'Encounter' | 'Observation' | 'Condition'
  | 'Medication' | 'MedicationRequest' | 'MedicationStatement'
  | 'DiagnosticReport' | 'Procedure' | 'AllergyIntolerance' | 'CarePlan';

export interface FHIRCoding {
  system: string;
  code: string;
  display?: string;
}

export interface FHIRCodeableConcept {
  coding: FHIRCoding[];
  text?: string;
}

export interface FHIRReference {
  reference: string;
  display?: string;
}

export interface FHIRIdentifier {
  system: string;
  value: string;
}

export interface FHIRPeriod {
  start?: string;
  end?: string;
}

export interface FHIRQuantity {
  value: number;
  unit: string;
  system?: string;
  code?: string;
}

// FHIR Patient
export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  identifier?: FHIRIdentifier[];
  name: { use?: string; family: string; given: string[] }[];
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  address?: { city?: string; state?: string; country?: string }[];
  telecom?: { system: string; value: string }[];
}

// FHIR Encounter
export interface FHIREncounter {
  resourceType: 'Encounter';
  id: string;
  status: 'planned' | 'arrived' | 'in-progress' | 'finished' | 'cancelled';
  class: FHIRCoding;
  type?: FHIRCodeableConcept[];
  subject: FHIRReference;
  period?: FHIRPeriod;
  reasonCode?: FHIRCodeableConcept[];
}

// FHIR Observation
export interface FHIRObservation {
  resourceType: 'Observation';
  id: string;
  status: 'final' | 'preliminary' | 'amended' | 'corrected';
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  effectiveDateTime?: string;
  valueQuantity?: FHIRQuantity;
  valueString?: string;
  interpretation?: FHIRCodeableConcept[];
}

// FHIR Condition
export interface FHIRCondition {
  resourceType: 'Condition';
  id: string;
  clinicalStatus: FHIRCodeableConcept;
  verificationStatus: FHIRCodeableConcept;
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  onsetDateTime?: string;
  note?: { text: string }[];
}

// FHIR MedicationRequest
export interface FHIRMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'stopped';
  intent: 'proposal' | 'plan' | 'order';
  medicationCodeableConcept: FHIRCodeableConcept;
  subject: FHIRReference;
  authoredOn?: string;
  dosageInstruction?: {
    text?: string;
    doseAndRate?: { doseQuantity?: FHIRQuantity }[];
    route?: FHIRCodeableConcept;
    frequency?: number;
    period?: number;
    periodUnit?: string;
  }[];
  reasonCode?: FHIRCodeableConcept[];
}

// FHIR AllergyIntolerance
export interface FHIRAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id: string;
  clinicalStatus: FHIRCodeableConcept;
  type?: 'allergy' | 'intolerance';
  category?: ('food' | 'medication' | 'environment' | 'biologic')[];
  criticality?: 'low' | 'high' | 'unable-to-assess';
  code: FHIRCodeableConcept;
  patient: FHIRReference;
  reaction?: { manifestation: FHIRCodeableConcept[]; severity?: 'mild' | 'moderate' | 'severe' }[];
}

// FHIR Bundle
export interface FHIRBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'document' | 'transaction' | 'searchset' | 'collection';
  timestamp: string;
  entry: {
    fullUrl?: string;
    resource: FHIRPatient | FHIREncounter | FHIRObservation | FHIRCondition |
              FHIRMedicationRequest | FHIRAllergyIntolerance;
  }[];
  meta?: { profile?: string[]; versionId?: string };
}

// ══════════════════════════════════════════════════════════════
// TIPOS TISS
// ══════════════════════════════════════════════════════════════

export type TISSTransacaoTipo = 'consulta' | 'procedimento' | 'exame' | 'internacao' | 'prescricao';

export interface TISSBeneficiario {
  numero_carteira: string;
  nome: string;
  data_nascimento: string;
  cns?: string;
}

export interface TISSPrestador {
  codigo_operadora: string;
  cnpj: string;
  nome: string;
  cnes: string;
}

export interface TISSProcedimento {
  codigo_tuss: string;
  descricao: string;
  quantidade: number;
  valor_unitario?: number;
  data_realizacao: string;
}

export interface TISSGuia {
  id: string;
  tipo: TISSTransacaoTipo;
  numero_guia: string;
  data_autorizacao?: string;
  beneficiario: TISSBeneficiario;
  prestador: TISSPrestador;
  procedimentos: TISSProcedimento[];
  cid_principal?: string;
  cid_secundarios?: string[];
  total_valor?: number;
  status: 'pendente' | 'autorizado' | 'negado' | 'executado';
}

// ══════════════════════════════════════════════════════════════
// MAPEAMENTOS DE TERMINOLOGIA
// ══════════════════════════════════════════════════════════════

// CID-10 → SNOMED CT (seleção clínica relevante)
export const CID_SNOMED_MAP: Record<string, { snomed: string; display: string }> = {
  'I10':  { snomed: '38341003',  display: 'Hypertensive disorder, systemic arterial' },
  'E11':  { snomed: '44054006',  display: 'Diabetes mellitus type 2' },
  'E11.0':{ snomed: '420270002', display: 'Type 2 DM with hyperosmolarity' },
  'I50':  { snomed: '84114007',  display: 'Heart failure' },
  'I50.0':{ snomed: '48447003',  display: 'Chronic heart failure' },
  'J45':  { snomed: '195967001', display: 'Asthma' },
  'J45.0':{ snomed: '389145006', display: 'Allergic asthma' },
  'J44':  { snomed: '13645005',  display: 'Chronic obstructive lung disease' },
  'N18':  { snomed: '709044004', display: 'Chronic kidney disease' },
  'N18.3':{ snomed: '433144002', display: 'Chronic kidney disease stage 3' },
  'N18.4':{ snomed: '431856006', display: 'Chronic kidney disease stage 4' },
  'N18.5':{ snomed: '433146000', display: 'Chronic kidney disease stage 5' },
  'K74':  { snomed: '19943007',  display: 'Cirrhosis of liver' },
  'F32':  { snomed: '35489007',  display: 'Depressive disorder' },
  'F20':  { snomed: '58214004',  display: 'Schizophrenia' },
  'I21':  { snomed: '22298006',  display: 'Myocardial infarction' },
  'I63':  { snomed: '230690007', display: 'Cerebral infarction' },
  'G30':  { snomed: '26929004',  display: 'Alzheimer disease' },
  'C34':  { snomed: '363358000', display: 'Malignant neoplasm of lung' },
  'Z87.891': { snomed: '160303001', display: 'Family history of diabetes mellitus' },
};

// Exames → LOINC
export const EXAME_LOINC_MAP: Record<string, { loinc: string; display: string; unit?: string }> = {
  'glicemia_jejum':    { loinc: '1558-6',  display: 'Glucose [Mass/volume] in Serum or Plasma --fasting', unit: 'mg/dL' },
  'hba1c':             { loinc: '4548-4',  display: 'Hemoglobin A1c/Hemoglobin.total in Blood', unit: '%' },
  'creatinina':        { loinc: '2160-0',  display: 'Creatinine [Mass/volume] in Serum or Plasma', unit: 'mg/dL' },
  'tfg':               { loinc: '62238-1', display: 'Glomerular filtration rate/1.73 sq M.predicted', unit: 'mL/min/1.73m2' },
  'potassio':          { loinc: '2823-3',  display: 'Potassium [Moles/volume] in Serum or Plasma', unit: 'mEq/L' },
  'sodio':             { loinc: '2951-2',  display: 'Sodium [Moles/volume] in Serum or Plasma', unit: 'mEq/L' },
  'colesterol_total':  { loinc: '2093-3',  display: 'Cholesterol [Mass/volume] in Serum or Plasma', unit: 'mg/dL' },
  'ldl':               { loinc: '2089-1',  display: 'Cholesterol in LDL [Mass/volume] in Serum or Plasma', unit: 'mg/dL' },
  'hdl':               { loinc: '2085-9',  display: 'Cholesterol in HDL [Mass/volume] in Serum or Plasma', unit: 'mg/dL' },
  'triglicerides':     { loinc: '2571-8',  display: 'Triglyceride [Mass/volume] in Serum or Plasma', unit: 'mg/dL' },
  'tsh':               { loinc: '3016-3',  display: 'Thyrotropin [Units/volume] in Serum or Plasma', unit: 'mUI/L' },
  'bnp':               { loinc: '30934-4', display: 'Natriuretic peptide B [Mass/volume] in Serum or Plasma', unit: 'pg/mL' },
  'nt_probnp':         { loinc: '33762-6', display: 'NT-proBNP [Mass/volume] in Serum or Plasma', unit: 'pg/mL' },
  'pa_sistolica':      { loinc: '8480-6',  display: 'Systolic blood pressure', unit: 'mmHg' },
  'pa_diastolica':     { loinc: '8462-4',  display: 'Diastolic blood pressure', unit: 'mmHg' },
  'frequencia_cardiaca': { loinc: '8867-4', display: 'Heart rate', unit: '/min' },
  'peso':              { loinc: '29463-7', display: 'Body weight', unit: 'kg' },
  'altura':            { loinc: '8302-2',  display: 'Body height', unit: 'cm' },
  'imc':               { loinc: '39156-5', display: 'Body mass index (BMI) [Ratio]', unit: 'kg/m2' },
  'hemoglobina':       { loinc: '718-7',   display: 'Hemoglobin [Mass/volume] in Blood', unit: 'g/dL' },
  'pcr':               { loinc: '1988-5',  display: 'C reactive protein [Mass/volume] in Serum or Plasma', unit: 'mg/L' },
  'alt':               { loinc: '1742-6',  display: 'Alanine aminotransferase [Enzymatic activity/volume] in Serum', unit: 'U/L' },
  'ast':               { loinc: '1920-8',  display: 'Aspartate aminotransferase [Enzymatic activity/volume] in Serum', unit: 'U/L' },
};

// Medicamentos → RxNorm
export const MOLECULA_RXNORM_MAP: Record<string, { rxnorm: string; atc?: string }> = {
  'enalapril':      { rxnorm: '29046',  atc: 'C09AA02' },
  'ramipril':       { rxnorm: '35296',  atc: 'C09AA05' },
  'losartana':      { rxnorm: '203160', atc: 'C09CA01' },
  'metformina':     { rxnorm: '6809',   atc: 'A10BA02' },
  'empagliflozina': { rxnorm: '1592779',atc: 'A10BK03' },
  'dapagliflozina': { rxnorm: '1488564',atc: 'A10BK01' },
  'rosuvastatina':  { rxnorm: '301542', atc: 'C10AA07' },
  'atorvastatina':  { rxnorm: '83367',  atc: 'C10AA05' },
  'amlodipina':     { rxnorm: '17767',  atc: 'C08CA01' },
  'metoprolol':     { rxnorm: '41493',  atc: 'C07AB02' },
  'carvedilol':     { rxnorm: '20352',  atc: 'C07AG02' },
  'espironolactona':{ rxnorm: '9997',   atc: 'C03DA01' },
  'furosemida':     { rxnorm: '4603',   atc: 'C03CA01' },
  'insulina_glargina': { rxnorm: '274783', atc: 'A10AE04' },
  'omeprazol':      { rxnorm: '7646',   atc: 'A02BC01' },
  'sinvastatina':   { rxnorm: '36567',  atc: 'C10AA01' },
};

// ══════════════════════════════════════════════════════════════
// VALIDAÇÃO FHIR
// ══════════════════════════════════════════════════════════════

export interface FHIRValidationResult {
  valido: boolean;
  erros: string[];
  avisos: string[];
  score_conformidade: number;  // 0–100
  perfil_detectado?: string;
}

export function validarFHIR(bundle: Partial<FHIRBundle>): FHIRValidationResult {
  const erros: string[] = [];
  const avisos: string[] = [];

  if (!bundle.resourceType || bundle.resourceType !== 'Bundle') erros.push('resourceType deve ser "Bundle"');
  if (!bundle.id) erros.push('Bundle.id é obrigatório');
  if (!bundle.type) erros.push('Bundle.type é obrigatório');
  if (!bundle.timestamp) erros.push('Bundle.timestamp é obrigatório');
  if (!bundle.entry || bundle.entry.length === 0) avisos.push('Bundle sem entries — verifique o conteúdo');

  bundle.entry?.forEach((entry, i) => {
    if (!entry.resource) { erros.push(`entry[${i}]: resource ausente`); return; }
    const r = entry.resource;
    if (!r.id) avisos.push(`entry[${i}] (${r.resourceType}): id ausente`);
    if (r.resourceType === 'Patient') {
      const p = r as FHIRPatient;
      if (!p.birthDate) avisos.push('Patient: birthDate ausente');
      if (!p.gender) avisos.push('Patient: gender ausente');
    }
    if (r.resourceType === 'MedicationRequest') {
      const m = r as FHIRMedicationRequest;
      if (!m.medicationCodeableConcept) erros.push('MedicationRequest: medicationCodeableConcept obrigatório');
    }
  });

  const score_conformidade = Math.max(0, 100 - erros.length * 15 - avisos.length * 5);
  return {
    valido: erros.length === 0,
    erros,
    avisos,
    score_conformidade,
    perfil_detectado: bundle.meta?.profile?.[0] ?? 'FHIR R4 genérico',
  };
}

// ══════════════════════════════════════════════════════════════
// GERAÇÃO DE BUNDLE CLÍNICO
// ══════════════════════════════════════════════════════════════

export interface DadosClinicos {
  paciente_id: string;
  nome: string;
  nascimento: string;
  sexo: 'M' | 'F';
  cns?: string;
  cids: string[];
  medicamentos: string[];
  alergias?: string[];
  exames?: Record<string, number>;
  pa_sistolica?: number;
  pa_diastolica?: number;
}

export function gerarBundleClinico(dados: DadosClinicos): FHIRBundle {
  const pid = `Patient/${dados.paciente_id}`;
  const now = new Date().toISOString();
  const entries: FHIRBundle['entry'] = [];

  // Patient
  const patient: FHIRPatient = {
    resourceType: 'Patient',
    id: dados.paciente_id,
    identifier: dados.cns ? [{ system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns', value: dados.cns }] : undefined,
    name: [{ use: 'official', family: dados.nome.split(' ').slice(-1)[0], given: dados.nome.split(' ').slice(0, -1) }],
    gender: dados.sexo === 'M' ? 'male' : 'female',
    birthDate: dados.nascimento,
  };
  entries.push({ fullUrl: `urn:uuid:${dados.paciente_id}`, resource: patient });

  // Encounter
  const encounter: FHIREncounter = {
    resourceType: 'Encounter',
    id: `enc-${dados.paciente_id}`,
    status: 'finished',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
    subject: { reference: pid, display: dados.nome },
    period: { start: now },
  };
  entries.push({ fullUrl: `urn:uuid:enc-${dados.paciente_id}`, resource: encounter });

  // Conditions (CIDs)
  dados.cids.forEach((cid, i) => {
    const snomed = CID_SNOMED_MAP[cid];
    const condition: FHIRCondition = {
      resourceType: 'Condition',
      id: `cond-${i}`,
      clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
      verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
      code: {
        coding: [
          { system: 'http://hl7.org/fhir/sid/icd-10', code: cid, display: cid },
          ...(snomed ? [{ system: 'http://snomed.info/sct', code: snomed.snomed, display: snomed.display }] : []),
        ],
        text: cid,
      },
      subject: { reference: pid },
      onsetDateTime: now,
    };
    entries.push({ resource: condition });
  });

  // MedicationRequests
  dados.medicamentos.forEach((mol, i) => {
    const rxnorm = MOLECULA_RXNORM_MAP[mol.toLowerCase()];
    const medReq: FHIRMedicationRequest = {
      resourceType: 'MedicationRequest',
      id: `medrq-${i}`,
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        coding: [
          ...(rxnorm ? [
            { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: rxnorm.rxnorm },
            ...(rxnorm.atc ? [{ system: 'http://www.whocc.no/atc', code: rxnorm.atc }] : []),
          ] : [{ system: 'http://prescreve-ai.com.br/molecules', code: mol }]),
        ],
        text: mol,
      },
      subject: { reference: pid },
      authoredOn: now,
    };
    entries.push({ resource: medReq });
  });

  // Allergies
  dados.alergias?.forEach((al, i) => {
    const allergy: FHIRAllergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      id: `allergy-${i}`,
      clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical', code: 'active' }] },
      type: 'allergy',
      category: ['medication'],
      criticality: 'high',
      code: { coding: [{ system: 'http://prescreve-ai.com.br/allergens', code: al }], text: al },
      patient: { reference: pid },
    };
    entries.push({ resource: allergy });
  });

  // Observations (vitais + exames)
  if (dados.pa_sistolica) {
    const loinc = EXAME_LOINC_MAP['pa_sistolica'];
    const obs: FHIRObservation = {
      resourceType: 'Observation',
      id: `obs-pa-s`,
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: loinc.loinc, display: loinc.display }] },
      subject: { reference: pid },
      effectiveDateTime: now,
      valueQuantity: { value: dados.pa_sistolica, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' },
    };
    entries.push({ resource: obs });
  }

  Object.entries(dados.exames ?? {}).forEach(([exame, valor], i) => {
    const loincEntry = EXAME_LOINC_MAP[exame];
    if (!loincEntry) return;
    const obs: FHIRObservation = {
      resourceType: 'Observation',
      id: `obs-lab-${i}`,
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: loincEntry.loinc, display: loincEntry.display }] },
      subject: { reference: pid },
      effectiveDateTime: now,
      valueQuantity: { value: valor, unit: loincEntry.unit ?? '', system: 'http://unitsofmeasure.org' },
    };
    entries.push({ resource: obs });
  });

  return {
    resourceType: 'Bundle',
    id: `bundle-${dados.paciente_id}-${Date.now()}`,
    type: 'document',
    timestamp: now,
    entry: entries,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Bundle'],
      versionId: '1',
    },
  };
}

// ══════════════════════════════════════════════════════════════
// IMPORTAÇÃO FHIR
// ══════════════════════════════════════════════════════════════

export interface ImportacaoFHIRResult {
  sucesso: boolean;
  paciente?: Partial<DadosClinicos>;
  recursos_importados: number;
  tipos_encontrados: FHIRResourceType[];
  avisos: string[];
  erros: string[];
}

export function importarFHIR(jsonStr: string): ImportacaoFHIRResult {
  const avisos: string[] = [];
  const erros: string[] = [];
  const tipos_encontrados: FHIRResourceType[] = [];
  let paciente: Partial<DadosClinicos> = {};
  let recursos_importados = 0;

  let bundle: FHIRBundle;
  try {
    bundle = JSON.parse(jsonStr) as FHIRBundle;
  } catch {
    return { sucesso: false, recursos_importados: 0, tipos_encontrados: [], avisos, erros: ['JSON inválido'] };
  }

  const validacao = validarFHIR(bundle);
  if (!validacao.valido) {
    return { sucesso: false, recursos_importados: 0, tipos_encontrados: [], avisos, erros: validacao.erros };
  }

  const cids: string[] = [];
  const medicamentos: string[] = [];
  const alergias: string[] = [];

  bundle.entry.forEach(entry => {
    const r = entry.resource;
    if (!r?.resourceType) return;
    recursos_importados++;
    if (!tipos_encontrados.includes(r.resourceType as FHIRResourceType)) {
      tipos_encontrados.push(r.resourceType as FHIRResourceType);
    }

    if (r.resourceType === 'Patient') {
      const p = r as FHIRPatient;
      paciente.paciente_id = p.id;
      paciente.nome = [...(p.name[0]?.given ?? []), p.name[0]?.family].filter(Boolean).join(' ');
      paciente.nascimento = p.birthDate;
      paciente.sexo = p.gender === 'male' ? 'M' : 'F';
    }

    if (r.resourceType === 'Condition') {
      const c = r as FHIRCondition;
      const icd = c.code.coding.find(x => x.system.includes('icd-10'));
      if (icd) cids.push(icd.code);
    }

    if (r.resourceType === 'MedicationRequest') {
      const m = r as FHIRMedicationRequest;
      const txt = m.medicationCodeableConcept.text;
      if (txt) medicamentos.push(txt);
    }

    if (r.resourceType === 'AllergyIntolerance') {
      const a = r as FHIRAllergyIntolerance;
      alergias.push(a.code.text ?? a.code.coding[0]?.display ?? 'desconhecido');
    }
  });

  if (cids.length) paciente.cids = cids;
  if (medicamentos.length) paciente.medicamentos = medicamentos;
  if (alergias.length) paciente.alergias = alergias;
  if (!paciente.paciente_id) avisos.push('Nenhum recurso Patient encontrado no bundle');

  return { sucesso: true, paciente, recursos_importados, tipos_encontrados, avisos, erros };
}

// ══════════════════════════════════════════════════════════════
// EXPORTAÇÃO FHIR
// ══════════════════════════════════════════════════════════════

export function exportarFHIR(dados: DadosClinicos): string {
  const bundle = gerarBundleClinico(dados);
  return JSON.stringify(bundle, null, 2);
}

// ══════════════════════════════════════════════════════════════
// MAPEAMENTOS DE TERMINOLOGIA
// ══════════════════════════════════════════════════════════════

export function mapearCID(cid: string): { snomed?: string; display?: string; encontrado: boolean } {
  const entry = CID_SNOMED_MAP[cid];
  if (!entry) return { encontrado: false };
  return { snomed: entry.snomed, display: entry.display, encontrado: true };
}

export function mapearLOINC(exame: string): { loinc?: string; display?: string; unit?: string; encontrado: boolean } {
  const entry = EXAME_LOINC_MAP[exame.toLowerCase()];
  if (!entry) return { encontrado: false };
  return { loinc: entry.loinc, display: entry.display, unit: entry.unit, encontrado: true };
}

export function mapearSNOMED(cid: string): { snomed?: string; display?: string; encontrado: boolean } {
  return mapearCID(cid);
}

// ══════════════════════════════════════════════════════════════
// TISS — GERAÇÃO DE GUIA
// ══════════════════════════════════════════════════════════════

export function gerarGuiaTISS(
  tipo: TISSTransacaoTipo,
  beneficiario: TISSBeneficiario,
  prestador: TISSPrestador,
  procedimentos: TISSProcedimento[],
  cid_principal?: string,
): TISSGuia {
  const num = `TISS${Date.now()}`;
  const total = procedimentos.reduce((s, p) => s + (p.valor_unitario ?? 0) * p.quantidade, 0);
  return {
    id: `guia-${Date.now()}`,
    tipo,
    numero_guia: num,
    beneficiario,
    prestador,
    procedimentos,
    cid_principal,
    total_valor: total || undefined,
    status: 'pendente',
  };
}

// ══════════════════════════════════════════════════════════════
// SIMULADOR DE INTEGRAÇÃO HOSPITALAR
// ══════════════════════════════════════════════════════════════

export interface SimulacaoIntegracao {
  sistema_origem: string;
  sistema_destino: string;
  protocolo: 'FHIR R4' | 'HL7 v2.x' | 'TISS 3.x' | 'RNDS';
  recursos_transferidos: number;
  duracao_ms: number;
  sucesso: boolean;
  erros_encontrados: number;
  score_interoperabilidade: number;
  mensagem: string;
}

export function simularIntegracao(
  origem: string,
  destino: string,
  protocolo: SimulacaoIntegracao['protocolo'],
  bundle?: FHIRBundle,
): SimulacaoIntegracao {
  const recursos = bundle?.entry.length ?? 0;
  const duracao = 120 + Math.round(Math.random() * 80);
  const erros = protocolo === 'FHIR R4' ? 0 : Math.round(Math.random() * 2);
  const score = Math.min(100, 95 + (protocolo === 'FHIR R4' ? 4 : 0) - erros * 5);
  return {
    sistema_origem: origem,
    sistema_destino: destino,
    protocolo,
    recursos_transferidos: recursos,
    duracao_ms: duracao,
    sucesso: erros === 0,
    erros_encontrados: erros,
    score_interoperabilidade: score,
    mensagem: erros === 0
      ? `Integração concluída — ${recursos} recursos transferidos via ${protocolo}`
      : `Integração com ${erros} erro(s) — verifique mapeamento de terminologia`,
  };
}

// ══════════════════════════════════════════════════════════════
// CONVERSOR HL7 v2.x → FHIR
// ══════════════════════════════════════════════════════════════

export interface HL7Message {
  msh: { sending_app: string; receiving_app: string; timestamp: string; message_type: string };
  pid?: { patient_id: string; name: string; dob: string; sex: string };
  obr?: { observation_id: string; description: string; datetime: string };
  obx?: { loinc?: string; value: string; unit: string; flag?: string }[];
}

export function converterHL7(mensagem: HL7Message): FHIRBundle | null {
  if (!mensagem.pid) return null;
  const dados: DadosClinicos = {
    paciente_id: mensagem.pid.patient_id,
    nome: mensagem.pid.name,
    nascimento: mensagem.pid.dob,
    sexo: mensagem.pid.sex === 'M' ? 'M' : 'F',
    cids: [],
    medicamentos: [],
    exames: {},
  };
  mensagem.obx?.forEach(obs => {
    const key = Object.entries(EXAME_LOINC_MAP).find(([, v]) => v.loinc === obs.loinc)?.[0];
    if (key && !isNaN(Number(obs.value))) {
      dados.exames![key] = Number(obs.value);
    }
  });
  return gerarBundleClinico(dados);
}
