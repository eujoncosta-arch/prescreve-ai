// ============================================================
// PRESCREVE-AI — Interoperability Engine (Phase 17)
// FHIR R4 · HL7 · TISS Brasil
// Suporte à decisão clínica — não substitui o médico
// ============================================================

// ══════════════════════════════════════════════════════════════
// TIPOS FHIR R4
// ══════════════════════════════════════════════════════════════

export type FHIRResourceType =
  | 'Patient' | 'Practitioner' | 'Organization'
  | 'Encounter' | 'Observation' | 'Condition'
  | 'Medication' | 'MedicationRequest' | 'MedicationStatement'
  | 'DiagnosticReport' | 'Composition'
  | 'Procedure' | 'AllergyIntolerance' | 'CarePlan';

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

// FHIR Practitioner (profissional de saúde)
export interface FHIRPractitioner {
  resourceType: 'Practitioner';
  id: string;
  identifier?: FHIRIdentifier[];
  name: { use?: string; family: string; given: string[]; prefix?: string[] }[];
  telecom?: { system: string; value: string }[];
  qualification?: {
    identifier?: FHIRIdentifier[];
    code: FHIRCodeableConcept;
    period?: FHIRPeriod;
    issuer?: FHIRReference;
  }[];
}

// FHIR Organization (estabelecimento de saúde)
export interface FHIROrganization {
  resourceType: 'Organization';
  id: string;
  identifier?: FHIRIdentifier[];
  active?: boolean;
  type?: FHIRCodeableConcept[];
  name: string;
  telecom?: { system: string; value: string }[];
  address?: { line?: string[]; city?: string; state?: string; postalCode?: string; country?: string }[];
}

// FHIR MedicationStatement (medicamento em uso pelo paciente)
export interface FHIRMedicationStatement {
  resourceType: 'MedicationStatement';
  id: string;
  status: 'active' | 'completed' | 'entered-in-error' | 'intended' | 'stopped' | 'on-hold';
  medicationCodeableConcept: FHIRCodeableConcept;
  subject: FHIRReference;
  effectiveDateTime?: string;
  dateAsserted?: string;
  informationSource?: FHIRReference;
  reasonCode?: FHIRCodeableConcept[];
  dosage?: { text: string; route?: FHIRCodeableConcept }[];
  note?: { text: string }[];
}

// FHIR DiagnosticReport (laudo de exame laboratorial/imagem)
export interface FHIRDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id: string;
  status: 'registered' | 'partial' | 'preliminary' | 'final' | 'amended' | 'corrected';
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  subject: FHIRReference;
  encounter?: FHIRReference;
  effectiveDateTime?: string;
  issued?: string;
  performer?: FHIRReference[];
  result?: FHIRReference[];              // referências a Observations
  conclusion?: string;
  conclusionCode?: FHIRCodeableConcept[];
}

// FHIR Composition (documento clínico estruturado — sumário de alta, prescrição)
export interface FHIRCompositionSection {
  title: string;
  code?: FHIRCodeableConcept;
  text?: { status: string; div: string };
  entry?: FHIRReference[];
}

export interface FHIRComposition {
  resourceType: 'Composition';
  id: string;
  status: 'preliminary' | 'final' | 'amended' | 'entered-in-error';
  type: FHIRCodeableConcept;            // tipo de documento (prescrição, sumário…)
  category?: FHIRCodeableConcept[];
  subject: FHIRReference;
  encounter?: FHIRReference;
  date: string;
  author: FHIRReference[];
  title: string;
  confidentiality?: string;
  attester?: { mode: string; time?: string; party?: FHIRReference }[];
  custodian?: FHIRReference;
  section: FHIRCompositionSection[];
}

// FHIR Bundle
export interface FHIRBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'document' | 'transaction' | 'searchset' | 'collection';
  timestamp: string;
  entry: {
    fullUrl?: string;
    resource: FHIRPatient | FHIRPractitioner | FHIROrganization
            | FHIREncounter | FHIRObservation | FHIRCondition
            | FHIRMedicationRequest | FHIRMedicationStatement
            | FHIRDiagnosticReport | FHIRComposition
            | FHIRAllergyIntolerance;
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
  // ── Expansão ETAPA 22.6D — cobertura de novos diagnósticos ──
  'E78':  { snomed: '55822004',  display: 'Hyperlipidemia' },
  'E78.5':{ snomed: '55822004',  display: 'Hyperlipidemia, unspecified' },
  'E78.0':{ snomed: '13644009',  display: 'Hypercholesterolemia' },
  'I48':  { snomed: '49436004',  display: 'Atrial fibrillation' },
  'I48.0':{ snomed: '282825002', display: 'Paroxysmal atrial fibrillation' },
  'I21.0':{ snomed: '304914007', display: 'Acute ST segment elevation myocardial infarction' },
  'I25':  { snomed: '53741008',  display: 'Coronary arteriosclerosis' },
  'I20':  { snomed: '194828000', display: 'Angina pectoris' },
  'I63.9':{ snomed: '422504002', display: 'Ischemic stroke' },
  'N18.1':{ snomed: '431855005', display: 'Chronic kidney disease stage 1' },
  'N18.2':{ snomed: '431857002', display: 'Chronic kidney disease stage 2' },
  'F33':  { snomed: '66344007',  display: 'Recurrent major depressive disorder' },
  'F41':  { snomed: '197480006', display: 'Anxiety disorder' },
  'F41.1':{ snomed: '21897009',  display: 'Generalized anxiety disorder' },
  'M81':  { snomed: '64859006',  display: 'Osteoporosis' },
  'M80':  { snomed: '432134008', display: 'Osteoporosis with pathological fracture' },
  'J18':  { snomed: '233604007', display: 'Pneumonia' },
  'J44.0':{ snomed: '195951007', display: 'Acute exacerbation of chronic obstructive airways disease' },
  'J44.9':{ snomed: '13645005',  display: 'Chronic obstructive lung disease' },
  'E03':  { snomed: '40930008',  display: 'Hypothyroidism' },
  'E05':  { snomed: '90739004',  display: 'Thyrotoxicosis' },
  'K21':  { snomed: '235595009', display: 'Gastroesophageal reflux disease' },
  'M10':  { snomed: '90560007',  display: 'Gout' },
  'G20':  { snomed: '49049000',  display: 'Parkinson disease' },
  'E66':  { snomed: '414916001', display: 'Obesity' },
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
  // ── Expansão ETAPA 22.6D — hematologia, coagulação, função hepática/tireoide, cardiologia ──
  'ureia':             { loinc: '3094-0',  display: 'Urea nitrogen [Mass/volume] in Serum or Plasma', unit: 'mg/dL' },
  'acido_urico':       { loinc: '3084-1',  display: 'Urate [Mass/volume] in Serum or Plasma', unit: 'mg/dL' },
  'calcio':            { loinc: '17861-6', display: 'Calcium [Mass/volume] in Serum or Plasma', unit: 'mg/dL' },
  'magnesio':          { loinc: '2601-3',  display: 'Magnesium [Moles/volume] in Serum or Plasma', unit: 'mg/dL' },
  'fosforo':           { loinc: '2777-1',  display: 'Phosphate [Mass/volume] in Serum or Plasma', unit: 'mg/dL' },
  'inr':               { loinc: '6301-6',  display: 'INR in Platelet poor plasma by Coagulation assay', unit: '{ratio}' },
  'tap':               { loinc: '5902-2',  display: 'Prothrombin time (PT)', unit: 's' },
  'ttpa':              { loinc: '14979-9', display: 'aPTT in Platelet poor plasma by Coagulation assay', unit: 's' },
  'plaquetas':         { loinc: '777-3',   display: 'Platelets [#/volume] in Blood by Automated count', unit: '10*3/uL' },
  'leucocitos':        { loinc: '6690-2',  display: 'Leukocytes [#/volume] in Blood by Automated count', unit: '10*3/uL' },
  'hematocrito':       { loinc: '4544-3',  display: 'Hematocrit [Volume Fraction] of Blood by Automated count', unit: '%' },
  'bilirrubina_total': { loinc: '1975-2',  display: 'Bilirubin.total [Mass/volume] in Serum or Plasma', unit: 'mg/dL' },
  'albumina':          { loinc: '1751-7',  display: 'Albumin [Mass/volume] in Serum or Plasma', unit: 'g/dL' },
  'fosfatase_alcalina':{ loinc: '6768-6',  display: 'Alkaline phosphatase [Enzymatic activity/volume] in Serum', unit: 'U/L' },
  'ggt':               { loinc: '2324-2',  display: 'Gamma glutamyl transferase [Enzymatic activity/volume] in Serum', unit: 'U/L' },
  't4_livre':          { loinc: '3024-7',  display: 'Thyroxine (T4) free [Mass/volume] in Serum or Plasma', unit: 'ng/dL' },
  't3':                { loinc: '3053-6',  display: 'Triiodothyronine (T3) [Mass/volume] in Serum or Plasma', unit: 'ng/dL' },
  'troponina':         { loinc: '6598-7',  display: 'Troponin T.cardiac [Mass/volume] in Serum or Plasma', unit: 'ng/mL' },
  'ck_mb':             { loinc: '13969-1', display: 'Creatine kinase.MB [Mass/volume] in Serum or Plasma', unit: 'ng/mL' },
  'ck_total':          { loinc: '2157-6',  display: 'Creatine kinase [Enzymatic activity/volume] in Serum', unit: 'U/L' },
  'microalbuminuria':  { loinc: '14957-5', display: 'Microalbumin [Mass/volume] in Urine', unit: 'mg/L' },
  'rac_urinario':      { loinc: '9318-7',  display: 'Albumin/Creatinine [Mass Ratio] in Urine', unit: 'mg/g' },
  'temperatura':       { loinc: '8310-5',  display: 'Body temperature', unit: 'Cel' },
  'spo2':              { loinc: '59408-5', display: 'Oxygen saturation in Arterial blood by Pulse oximetry', unit: '%' },
  'frequencia_respiratoria': { loinc: '9279-1', display: 'Respiratory rate', unit: '/min' },
  'vitamina_d':        { loinc: '35365-6', display: '25-hydroxyvitamin D3 [Mass/volume] in Serum or Plasma', unit: 'ng/mL' },
  'vitamina_b12':      { loinc: '2132-9',  display: 'Cobalamin (Vitamin B12) [Mass/volume] in Serum or Plasma', unit: 'pg/mL' },
  'ferritina':         { loinc: '2276-4',  display: 'Ferritin [Mass/volume] in Serum or Plasma', unit: 'ng/mL' },
  'hdl_ldl_ratio':     { loinc: '11054-4', display: 'Cholesterol in LDL/Cholesterol in HDL [Mass Ratio]', unit: '{ratio}' },
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
  'anlodipino':     { rxnorm: '17767',  atc: 'C08CA01' },
  'metoprolol':     { rxnorm: '41493',  atc: 'C07AB02' },
  'carvedilol':     { rxnorm: '20352',  atc: 'C07AG02' },
  'espironolactona':{ rxnorm: '9997',   atc: 'C03DA01' },
  'furosemida':     { rxnorm: '4603',   atc: 'C03CA01' },
  'insulina_glargina': { rxnorm: '274783', atc: 'A10AE04' },
  'omeprazol':      { rxnorm: '7646',   atc: 'A02BC01' },
  'sinvastatina':   { rxnorm: '36567',  atc: 'C10AA01' },
  // ── Expansão ETAPA 22.6D — RXCUIs de ingrediente (nível ingredient) ──
  'hidroclorotiazida': { rxnorm: '5487',    atc: 'C03AA03' },
  'clortalidona':   { rxnorm: '2409',   atc: 'C03BA04' },
  'valsartana':     { rxnorm: '69749',  atc: 'C09CA03' },
  'candesartana':   { rxnorm: '214354', atc: 'C09CA06' },
  'telmisartana':   { rxnorm: '73494',  atc: 'C09CA07' },
  'atenolol':       { rxnorm: '1202',   atc: 'C07AB03' },
  'bisoprolol':     { rxnorm: '19484',  atc: 'C07AB07' },
  'digoxina':       { rxnorm: '3407',   atc: 'C01AA05' },
  'amiodarona':     { rxnorm: '703',    atc: 'C01BD01' },
  'varfarina':      { rxnorm: '11289',  atc: 'B01AA03' },
  'clopidogrel':    { rxnorm: '32968',  atc: 'B01AC04' },
  'apixabana':      { rxnorm: '1364430',atc: 'B01AF02' },
  'rivaroxabana':   { rxnorm: '1114195',atc: 'B01AF01' },
  'dabigatrana':    { rxnorm: '1037045',atc: 'B01AE07' },
  'aspirina':       { rxnorm: '1191',   atc: 'B01AC06' },
  'ezetimiba':      { rxnorm: '341248', atc: 'C10AX09' },
  'semaglutida':    { rxnorm: '1991302',atc: 'A10BJ06' },
  'liraglutida':    { rxnorm: '475968', atc: 'A10BJ02' },
  'sitagliptina':   { rxnorm: '593411', atc: 'A10BH01' },
  'glibenclamida':  { rxnorm: '4815',   atc: 'A10BB01' },
  'levotiroxina':   { rxnorm: '10582',  atc: 'H03AA01' },
  'pantoprazol':    { rxnorm: '40790',  atc: 'A02BC02' },
  'sertralina':     { rxnorm: '36437',  atc: 'N06AB06' },
  'fluoxetina':     { rxnorm: '4493',   atc: 'N06AB03' },
  'escitalopram':   { rxnorm: '321988', atc: 'N06AB10' },
  'amoxicilina':    { rxnorm: '723',    atc: 'J01CA04' },
  'azitromicina':   { rxnorm: '18631',  atc: 'J01FA10' },
  'ciprofloxacino': { rxnorm: '2551',   atc: 'J01MA02' },
  'gabapentina':    { rxnorm: '25480',  atc: 'N03AX12' },
  'prednisona':     { rxnorm: '8640',   atc: 'H02AB07' },
  'salbutamol':     { rxnorm: '435',    atc: 'R03AC02' },
  'budesonida':     { rxnorm: '19831',  atc: 'R03BA02' },
  'tiotropio':      { rxnorm: '69120',  atc: 'R03BB04' },
  'alendronato':    { rxnorm: '46309',  atc: 'M05BA04' },
  'allopurinol':    { rxnorm: '519',    atc: 'M04AA01' },
};

// ══════════════════════════════════════════════════════════════
// RNDS — Rede Nacional de Dados em Saúde (Brasil / DATASUS)
// Namespaces e perfis oficiais para submissão à RNDS
// ══════════════════════════════════════════════════════════════

export const RNDS_NAMESPACES = {
  cns:       'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
  cpf:       'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
  cnes:      'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cnes',
  cnpj:      'http://www.receita.fazenda.gov.br/pessoajuridica/cnpj',
  crm:       'http://rnds.saude.gov.br/fhir/r4/NamingSystem/crm',
  gtin:      'http://rnds.saude.gov.br/fhir/r4/NamingSystem/gtin',      // medicamento (código de barras)
} as const;

// Perfis RNDS (StructureDefinition) por tipo de documento
export const RNDS_PROFILES = {
  patient:        'http://rnds.saude.gov.br/fhir/r4/StructureDefinition/BRIndividuo-1.0',
  practitioner:   'http://rnds.saude.gov.br/fhir/r4/StructureDefinition/BRProfissional-1.0',
  organization:   'http://rnds.saude.gov.br/fhir/r4/StructureDefinition/BREstabelecimentoSaude-1.0',
  sumario_alta:   'http://rnds.saude.gov.br/fhir/r4/StructureDefinition/BRSumarioAlta',
  prescricao:     'http://rnds.saude.gov.br/fhir/r4/StructureDefinition/BRPrescricaoMedicamento',
  resultado_exame:'http://rnds.saude.gov.br/fhir/r4/StructureDefinition/BRResultadoExameLaboratorial',
} as const;

export type RNDSDocumentoTipo = keyof typeof RNDS_PROFILES;

/**
 * Etiqueta um bundle FHIR com o perfil RNDS apropriado — sem alterar o conteúdo clínico.
 * Preserva perfis já existentes (não sobrescreve exportadores anteriores).
 */
export function aplicarPerfilRNDS(bundle: FHIRBundle, tipo: RNDSDocumentoTipo = 'sumario_alta'): FHIRBundle {
  const perfilRNDS = RNDS_PROFILES[tipo];
  const perfisAtuais = bundle.meta?.profile ?? [];
  const profile = perfisAtuais.includes(perfilRNDS) ? perfisAtuais : [...perfisAtuais, perfilRNDS];
  return { ...bundle, meta: { ...bundle.meta, profile } };
}

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

// Segmentos HL7 v2.x
export interface HL7SegmentPV1 {
  patient_class: 'I' | 'O' | 'E' | 'P' | 'R' | 'B' | 'N';  // Inpatient, Outpatient, Emergency…
  assigned_location?: string;    // ponto de atendimento / leito
  attending_doctor?: string;     // médico responsável
  admit_datetime?: string;
  discharge_datetime?: string;
  visit_number?: string;
}

export interface HL7SegmentORC {
  order_control: 'NW' | 'OK' | 'CA' | 'DC' | 'RP';  // New, OK, Cancel, Discontinue, Replace
  placer_order_number?: string;
  ordering_provider?: string;
  order_datetime?: string;
  order_status?: 'A' | 'CM' | 'DC' | 'HD';           // Active, Completed, Discontinued, On-Hold
}

export interface HL7SegmentRXE {
  give_code?: string;             // código do medicamento (RxNorm/ATC)
  give_amount?: string;           // dose
  give_units?: string;            // unidade (mg, mL…)
  molecula: string;               // princípio ativo
  route?: string;                 // via de administração
  frequency?: string;             // posologia
}

export interface HL7Message {
  msh: { sending_app: string; receiving_app: string; timestamp: string; message_type: string };
  pid?: { patient_id: string; name: string; dob: string; sex: string };
  pv1?: HL7SegmentPV1;
  orc?: HL7SegmentORC;
  rxe?: HL7SegmentRXE[];
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
  // OBX → Observations (comportamento original preservado)
  mensagem.obx?.forEach(obs => {
    const key = Object.entries(EXAME_LOINC_MAP).find(([, v]) => v.loinc === obs.loinc)?.[0];
    if (key && !isNaN(Number(obs.value))) {
      dados.exames![key] = Number(obs.value);
    }
  });
  // RXE → MedicationRequest (novo — segmento de prescrição farmacêutica)
  mensagem.rxe?.forEach(rx => {
    if (rx.molecula) dados.medicamentos.push(rx.molecula);
  });

  const bundle = gerarBundleClinico(dados);

  // PV1 → enriquecer o Encounter com classe de atendimento e período (novo)
  if (mensagem.pv1) {
    const enc = bundle.entry.find(e => e.resource.resourceType === 'Encounter')?.resource as FHIREncounter | undefined;
    if (enc) {
      const classMap: Record<string, FHIRCoding> = {
        I: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: 'inpatient encounter' },
        O: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
        E: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'EMER', display: 'emergency' },
      };
      enc.class = classMap[mensagem.pv1.patient_class] ?? enc.class;
      if (mensagem.pv1.admit_datetime || mensagem.pv1.discharge_datetime) {
        enc.period = { start: mensagem.pv1.admit_datetime, end: mensagem.pv1.discharge_datetime };
      }
    }
  }
  return bundle;
}

// ══════════════════════════════════════════════════════════════
// EXPORTAÇÃO HL7 v2.x — Mensagem ORM/ORU pipe-delimited
// Segmentos: MSH · PID · PV1 · ORC · RXE · OBR · OBX
// ══════════════════════════════════════════════════════════════

export interface DadosHL7v2 {
  paciente_id: string;
  nome: string;
  nascimento: string;              // YYYY-MM-DD
  sexo: 'M' | 'F';
  visita?: {
    classe?: HL7SegmentPV1['patient_class'];
    local?: string;
    medico?: string;
    admissao?: string;
    alta?: string;
    numero_visita?: string;
  };
  medicamentos?: { molecula: string; dose?: string; unidade?: string; via?: string; frequencia?: string }[];
  exames?: { nome: string; valor: number; flag?: 'N' | 'H' | 'L' | 'A' }[];
  ordering_provider?: string;
}

/** Formata timestamp ISO → HL7 v2 (YYYYMMDDHHMMSS). */
function hl7Timestamp(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Escapa o separador de componente HL7 e formata data de nascimento (YYYYMMDD). */
function hl7Date(iso: string): string {
  return iso.replace(/-/g, '').slice(0, 8);
}

/**
 * Gera uma mensagem HL7 v2.x pipe-delimited com segmentos
 * MSH · PID · PV1 · ORC · RXE · OBR · OBX.
 * Exportador NOVO — não altera exportadores FHIR/TISS existentes.
 */
export function exportarHL7v2(dados: DadosHL7v2): string {
  const ts = hl7Timestamp();
  const nomeParts = dados.nome.split(' ');
  const family = nomeParts.slice(-1)[0];
  const given = nomeParts.slice(0, -1).join(' ');
  const segs: string[] = [];

  // MSH — Message Header
  segs.push(`MSH|^~\\&|PRESCREVE-AI|PRESCREVE-AI|HIS|HOSPITAL|${ts}||ORU^R01|${Date.now()}|P|2.5.1`);

  // PID — Patient Identification
  segs.push(`PID|1||${dados.paciente_id}^^^PRESCREVE-AI^MR||${family}^${given}||${hl7Date(dados.nascimento)}|${dados.sexo}`);

  // PV1 — Patient Visit
  const v = dados.visita;
  segs.push(
    `PV1|1|${v?.classe ?? 'O'}|${v?.local ?? ''}|||||${v?.medico ?? ''}|||||||||||` +
    `${v?.numero_visita ?? ''}||||||||||||||||||||||` +
    `${v?.admissao ? hl7Timestamp(v.admissao) : ''}|${v?.alta ? hl7Timestamp(v.alta) : ''}`,
  );

  // ORC + RXE — um par por medicamento prescrito
  (dados.medicamentos ?? []).forEach((med, i) => {
    const rxnorm = MOLECULA_RXNORM_MAP[med.molecula.toLowerCase()];
    const giveCode = rxnorm
      ? `${rxnorm.rxnorm}^${med.molecula}^RxNorm`
      : `${med.molecula}^${med.molecula}^PRESCREVE-AI`;
    // ORC — Common Order
    segs.push(`ORC|NW|${dados.paciente_id}-${i + 1}|||A||||${ts}|||${dados.ordering_provider ?? ''}`);
    // RXE — Pharmacy/Treatment Encoded Order
    segs.push(
      `RXE||${giveCode}|${med.dose ?? ''}|${med.dose ?? ''}|${med.unidade ?? 'mg'}|` +
      `${med.via ?? 'PO'}|||||||${med.frequencia ?? ''}`,
    );
  });

  // OBR + OBX — painel de exames
  if ((dados.exames ?? []).length > 0) {
    segs.push(`OBR|1|${dados.paciente_id}-LAB|${dados.paciente_id}-LAB|26436-6^Laboratory studies^LN|||${ts}`);
    (dados.exames ?? []).forEach((ex, i) => {
      const loinc = EXAME_LOINC_MAP[ex.nome];
      const code = loinc ? `${loinc.loinc}^${loinc.display}^LN` : `${ex.nome}^${ex.nome}^L`;
      const unit = loinc?.unit ?? '';
      segs.push(`OBX|${i + 1}|NM|${code}||${ex.valor}|${unit}||${ex.flag ?? 'N'}|||F|||${ts}`);
    });
  }

  return segs.join('\r');
}

// ══════════════════════════════════════════════════════════════
// GERADORES DOS NOVOS RECURSOS FHIR R4
// ══════════════════════════════════════════════════════════════

export interface DadosProfissional {
  id:           string;
  nome:         string;
  crm:          string;
  uf_crm:       string;
  especialidade?: string;
  cns?:         string;
}

export interface DadosOrganizacao {
  id:    string;
  nome:  string;
  cnpj?: string;
  cnes?: string;
  tipo?: string;    // 'hospital' | 'clinica' | 'ups' | 'laboratorio'
  cidade?: string;
  uf?:   string;
}

export function gerarPractitioner(dados: DadosProfissional): FHIRPractitioner {
  const parts = dados.nome.split(' ');
  return {
    resourceType: 'Practitioner',
    id: dados.id,
    identifier: [
      { system: `http://cfm.org.br/crm/${dados.uf_crm}`, value: dados.crm },
      ...(dados.cns ? [{ system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns', value: dados.cns }] : []),
    ],
    name: [{
      use: 'official',
      family: parts.slice(-1)[0],
      given: parts.slice(0, -1),
      prefix: ['Dr.'],
    }],
    qualification: dados.especialidade ? [{
      code: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0360', code: 'MD', display: dados.especialidade }],
        text: dados.especialidade,
      },
      issuer: { reference: `Organization/cfm-${dados.uf_crm.toLowerCase()}`, display: `CFM-${dados.uf_crm}` },
    }] : undefined,
  };
}

export function gerarOrganization(dados: DadosOrganizacao): FHIROrganization {
  return {
    resourceType: 'Organization',
    id: dados.id,
    active: true,
    identifier: [
      ...(dados.cnpj ? [{ system: 'http://www.receita.fazenda.gov.br/pessoajuridica/cnpj', value: dados.cnpj }] : []),
      ...(dados.cnes ? [{ system: 'http://datasus.gov.br/cnes', value: dados.cnes }] : []),
    ],
    type: dados.tipo ? [{
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/organization-type', code: dados.tipo, display: dados.tipo }],
      text: dados.tipo,
    }] : undefined,
    name: dados.nome,
    address: dados.cidade ? [{ city: dados.cidade, state: dados.uf ?? '', country: 'BR' }] : undefined,
  };
}

export function gerarMedicationStatement(
  id: string,
  molecula: string,
  pacienteRef: string,
  status: FHIRMedicationStatement['status'] = 'active',
  posologia?: string,
): FHIRMedicationStatement {
  const rxnorm = MOLECULA_RXNORM_MAP[molecula.toLowerCase()];
  const ts = new Date().toISOString();
  return {
    resourceType: 'MedicationStatement',
    id,
    status,
    medicationCodeableConcept: {
      coding: rxnorm
        ? [
            { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: rxnorm.rxnorm },
            ...(rxnorm.atc ? [{ system: 'http://www.whocc.no/atc', code: rxnorm.atc }] : []),
          ]
        : [{ system: 'http://prescreve-ai.com.br/molecules', code: molecula }],
      text: molecula,
    },
    subject: { reference: pacienteRef },
    effectiveDateTime: ts,
    dateAsserted: ts,
    dosage: posologia ? [{ text: posologia }] : undefined,
  };
}

export function gerarDiagnosticReport(
  id: string,
  pacienteRef: string,
  encounterRef: string,
  resultRefs: string[],
  conclusao?: string,
): FHIRDiagnosticReport {
  const ts = new Date().toISOString();
  return {
    resourceType: 'DiagnosticReport',
    id,
    status: 'final',
    category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0074', code: 'LAB', display: 'Laboratory' }] }],
    code: {
      coding: [{ system: 'http://loinc.org', code: '26436-6', display: 'Laboratory studies (set)' }],
      text: 'Painel laboratorial clínico',
    },
    subject: { reference: pacienteRef },
    encounter: { reference: encounterRef },
    effectiveDateTime: ts,
    issued: ts,
    result: resultRefs.map(r => ({ reference: r })),
    conclusion: conclusao,
  };
}

export function gerarComposition(
  id: string,
  titulo: string,
  pacienteRef: string,
  authorRef: string,
  custodianRef: string,
  sections: FHIRCompositionSection[],
): FHIRComposition {
  return {
    resourceType: 'Composition',
    id,
    status: 'final',
    type: {
      coding: [{ system: 'http://loinc.org', code: '57016-8', display: 'Privacy policy acknowledgment Document' }],
      text: titulo,
    },
    subject: { reference: pacienteRef },
    date: new Date().toISOString(),
    author: [{ reference: authorRef }],
    title: titulo,
    custodian: { reference: custodianRef },
    section: sections,
  };
}

// ── Bundle completo com todos os 13 tipos de recursos ────────

export interface DadosBundleCompleto extends DadosClinicos {
  profissional:   DadosProfissional;
  organizacao:    DadosOrganizacao;
  medicamentos_em_uso: { molecula: string; posologia: string; status: FHIRMedicationStatement['status'] }[];
  exames_completos?: { nome: string; valor: number; loinc?: string }[];
  titulo_documento?: string;
}

export function gerarBundleCompleto(dados: DadosBundleCompleto): FHIRBundle {
  const pid   = `Patient/${dados.paciente_id}`;
  const prid  = `Practitioner/${dados.profissional.id}`;
  const orgId = `Organization/${dados.organizacao.id}`;
  const encId = `enc-${dados.paciente_id}`;
  const nowTs = new Date().toISOString();
  const entries: FHIRBundle['entry'] = [];

  // 1. Organization
  const org = gerarOrganization(dados.organizacao);
  entries.push({ fullUrl: orgId, resource: org });

  // 2. Practitioner
  const pract = gerarPractitioner(dados.profissional);
  entries.push({ fullUrl: prid, resource: pract });

  // 3. Patient
  const patient: FHIRPatient = {
    resourceType: 'Patient',
    id: dados.paciente_id,
    identifier: dados.cns ? [{ system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns', value: dados.cns }] : undefined,
    name: [{ use: 'official', family: dados.nome.split(' ').slice(-1)[0], given: dados.nome.split(' ').slice(0, -1) }],
    gender: dados.sexo === 'M' ? 'male' : 'female',
    birthDate: dados.nascimento,
  };
  entries.push({ fullUrl: pid, resource: patient });

  // 4. Encounter
  const encounter: FHIREncounter = {
    resourceType: 'Encounter',
    id: encId,
    status: 'finished',
    class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
    subject: { reference: pid, display: dados.nome },
    period: { start: nowTs, end: nowTs },
    reasonCode: dados.cids.length > 0 ? [{
      coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: dados.cids[0], display: dados.cids[0] }],
    }] : undefined,
  };
  entries.push({ fullUrl: `Encounter/${encId}`, resource: encounter });

  // 5. Conditions
  dados.cids.forEach((cid, i) => {
    const snomed = CID_SNOMED_MAP[cid];
    const condition: FHIRCondition = {
      resourceType: 'Condition',
      id: `cond-${i}`,
      clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
      verificationStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }] },
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }] }],
      code: {
        coding: [
          { system: 'http://hl7.org/fhir/sid/icd-10', code: cid, display: cid },
          ...(snomed ? [{ system: 'http://snomed.info/sct', code: snomed.snomed, display: snomed.display }] : []),
        ],
        text: cid,
      },
      subject: { reference: pid },
      onsetDateTime: nowTs,
    };
    entries.push({ fullUrl: `Condition/cond-${i}`, resource: condition });
  });

  // 6. MedicationRequests (prescrições novas)
  dados.medicamentos.forEach((mol, i) => {
    const rxnorm = MOLECULA_RXNORM_MAP[mol.toLowerCase()];
    const medReq: FHIRMedicationRequest = {
      resourceType: 'MedicationRequest',
      id: `medrq-${i}`,
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: {
        coding: rxnorm
          ? [
              { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: rxnorm.rxnorm },
              ...(rxnorm.atc ? [{ system: 'http://www.whocc.no/atc', code: rxnorm.atc }] : []),
            ]
          : [{ system: 'http://prescreve-ai.com.br/molecules', code: mol }],
        text: mol,
      },
      subject: { reference: pid },
      authoredOn: nowTs,
      reasonCode: dados.cids.length > 0 ? [{
        coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: dados.cids[0] }],
      }] : undefined,
    };
    entries.push({ fullUrl: `MedicationRequest/medrq-${i}`, resource: medReq });
  });

  // 7. MedicationStatements (medicamentos em uso prévio)
  dados.medicamentos_em_uso.forEach((m, i) => {
    const stmt = gerarMedicationStatement(`medstmt-${i}`, m.molecula, pid, m.status, m.posologia);
    entries.push({ fullUrl: `MedicationStatement/medstmt-${i}`, resource: stmt });
  });

  // 8. AllergyIntolerance
  (dados.alergias ?? []).forEach((al, i) => {
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
    entries.push({ fullUrl: `AllergyIntolerance/allergy-${i}`, resource: allergy });
  });

  // 9. Observations (vitais + exames)
  const obsRefs: string[] = [];

  if (dados.pa_sistolica) {
    const l = EXAME_LOINC_MAP['pa_sistolica'];
    const obs: FHIRObservation = { resourceType: 'Observation', id: 'obs-pa-s', status: 'final', category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }], code: { coding: [{ system: 'http://loinc.org', code: l.loinc, display: l.display }] }, subject: { reference: pid }, effectiveDateTime: nowTs, valueQuantity: { value: dados.pa_sistolica, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } };
    entries.push({ fullUrl: 'Observation/obs-pa-s', resource: obs });
    obsRefs.push('Observation/obs-pa-s');
  }
  if (dados.pa_diastolica) {
    const l = EXAME_LOINC_MAP['pa_diastolica'];
    const obs: FHIRObservation = { resourceType: 'Observation', id: 'obs-pa-d', status: 'final', category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }], code: { coding: [{ system: 'http://loinc.org', code: l.loinc, display: l.display }] }, subject: { reference: pid }, effectiveDateTime: nowTs, valueQuantity: { value: dados.pa_diastolica, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' } };
    entries.push({ fullUrl: 'Observation/obs-pa-d', resource: obs });
    obsRefs.push('Observation/obs-pa-d');
  }

  Object.entries(dados.exames ?? {}).forEach(([exame, valor], i) => {
    const loincEntry = EXAME_LOINC_MAP[exame];
    if (!loincEntry) return;
    const obsId = `obs-lab-${i}`;
    const obs: FHIRObservation = { resourceType: 'Observation', id: obsId, status: 'final', category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }], code: { coding: [{ system: 'http://loinc.org', code: loincEntry.loinc, display: loincEntry.display }] }, subject: { reference: pid }, effectiveDateTime: nowTs, valueQuantity: { value: valor, unit: loincEntry.unit ?? '', system: 'http://unitsofmeasure.org' } };
    entries.push({ fullUrl: `Observation/${obsId}`, resource: obs });
    obsRefs.push(`Observation/${obsId}`);
  });

  // 10. DiagnosticReport
  if (obsRefs.length > 0) {
    const diagReport = gerarDiagnosticReport(
      `dr-${dados.paciente_id}`,
      pid,
      `Encounter/${encId}`,
      obsRefs,
      'Painel laboratorial e sinais vitais — PRESCREVE-AI',
    );
    entries.push({ fullUrl: `DiagnosticReport/dr-${dados.paciente_id}`, resource: diagReport });
  }

  // 11. Composition (sumário clínico)
  const titulo = dados.titulo_documento ?? 'Sumário Clínico — PRESCREVE-AI';
  const sections: FHIRCompositionSection[] = [
    {
      title: 'Problemas Ativos',
      code: { coding: [{ system: 'http://loinc.org', code: '11450-4', display: 'Problem list - Reported' }] },
      entry: dados.cids.map((_, i) => ({ reference: `Condition/cond-${i}` })),
    },
    {
      title: 'Medicamentos Prescritos',
      code: { coding: [{ system: 'http://loinc.org', code: '10160-0', display: 'History of Medication use Narrative' }] },
      entry: dados.medicamentos.map((_, i) => ({ reference: `MedicationRequest/medrq-${i}` })),
    },
    {
      title: 'Resultados Laboratoriais',
      code: { coding: [{ system: 'http://loinc.org', code: '30954-2', display: 'Relevant diagnostic tests/laboratory data Narrative' }] },
      entry: obsRefs.map(r => ({ reference: r })),
    },
  ];

  const comp = gerarComposition(
    `comp-${dados.paciente_id}`,
    titulo,
    pid,
    prid,
    orgId,
    sections,
  );
  entries.push({ fullUrl: `Composition/comp-${dados.paciente_id}`, resource: comp });

  return {
    resourceType: 'Bundle',
    id: `bundle-completo-${dados.paciente_id}-${Date.now()}`,
    type: 'document',
    timestamp: nowTs,
    entry: entries,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Bundle', 'http://rnds.saude.gov.br/fhir/r4/StructureDefinition/BRSumarioAlta'],
      versionId: '1',
    },
  };
}

// ── Validação estendida para todos os tipos ───────────────────

export function validarBundleCompleto(bundle: Partial<FHIRBundle>): FHIRValidationResult {
  const base = validarFHIR(bundle);
  const erros = [...base.erros];
  const avisos = [...base.avisos];

  if (!bundle.entry) return { ...base, erros, avisos };

  const tipos = bundle.entry.map(e => e.resource?.resourceType ?? '') as string[];
  const obrigatorios = ['Patient', 'Practitioner', 'Organization', 'Encounter', 'Condition', 'MedicationRequest'];

  for (const t of obrigatorios) {
    if (!tipos.includes(t)) avisos.push(`Bundle sem ${t} — pode ser incompleto para troca interoperável`);
  }

  bundle.entry.forEach((entry, i) => {
    const r = entry.resource;
    if (!r) return;
    if (r.resourceType === 'Practitioner') {
      const p = r as FHIRPractitioner;
      if (!p.identifier?.length) avisos.push(`Practitioner[${i}]: sem CRM/identificador`);
      if (!p.qualification?.length) avisos.push(`Practitioner[${i}]: sem qualificação`);
    }
    if (r.resourceType === 'Organization') {
      const o = r as FHIROrganization;
      if (!o.identifier?.length) avisos.push(`Organization[${i}]: sem CNPJ/CNES`);
    }
    if (r.resourceType === 'MedicationStatement') {
      const ms = r as FHIRMedicationStatement;
      if (!ms.medicationCodeableConcept) erros.push(`MedicationStatement[${i}]: medicationCodeableConcept obrigatório`);
    }
    if (r.resourceType === 'DiagnosticReport') {
      const dr = r as FHIRDiagnosticReport;
      if (!dr.code) erros.push(`DiagnosticReport[${i}]: code obrigatório`);
      if (!dr.result?.length) avisos.push(`DiagnosticReport[${i}]: sem referências a Observations`);
    }
    if (r.resourceType === 'Composition') {
      const c = r as FHIRComposition;
      if (!c.author?.length) erros.push(`Composition[${i}]: author obrigatório`);
      if (!c.section?.length) avisos.push(`Composition[${i}]: sem seções`);
    }
  });

  const score = Math.max(0, 100 - erros.length * 15 - avisos.length * 3);
  return { valido: erros.length === 0, erros, avisos, score_conformidade: score, perfil_detectado: bundle.meta?.profile?.[0] ?? 'FHIR R4 genérico' };
}

// ─── Cross-engine: Medical Audit + Recommendation Registry ───

import { listarAudits } from './medical-audit';
import { listarRecomendacoes } from './recommendation-registry';

export interface FHIRAuditExport {
  paciente_id: string;
  bundle_fhir: FHIRBundle;
  total_audits: number;
  total_recomendacoes: number;
  gerado_em: string;
}

export function exportarHistoricoFHIR(paciente_id: string, cids: string[]): FHIRAuditExport {
  const audits  = listarAudits({ status: 'ativo' });
  const recs    = listarRecomendacoes();

  const medicamentos = recs
    .filter(r => r.status === 'ativa')
    .map(r => r.molecula)
    .filter((m, i, arr) => arr.indexOf(m) === i)
    .slice(0, 20);

  const dados: DadosClinicos = {
    paciente_id,
    nome: `Paciente ${paciente_id}`,
    nascimento: '1970-01-01',
    sexo: 'M',
    cids,
    medicamentos,
  };

  const bundle_fhir = gerarBundleClinico(dados);

  return {
    paciente_id,
    bundle_fhir,
    total_audits: audits.length,
    total_recomendacoes: recs.length,
    gerado_em: new Date().toISOString(),
  };
}
