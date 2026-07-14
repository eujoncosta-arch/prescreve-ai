// ============================================================
// PRESCREVE-AI — RM-25: adaptador DrugEntity → FHIR R4
//
// Conecta a Single Source of Truth (pharma-core) à camada de
// interoperabilidade. Uma prescrição FHIR passa a herdar automaticamente
// ATC, DCB, marca e apresentação canônicos do DrugEntity.
// ============================================================

import type { DrugEntity } from './types';

/** Sistema de codificação ATC (WHO). */
export const ATC_SYSTEM = 'http://www.whocc.no/atc';
/** Sistema local (DCB/Prescreve-AI) para o id canônico do medicamento. */
export const PRESCREVE_DRUG_SYSTEM = 'https://prescreve.ai/fhir/drug-id';

export interface FHIRCoding {
  system: string;
  code: string;
  display?: string;
}
export interface FHIRCodeableConcept {
  coding?: FHIRCoding[];
  text: string;
}
export interface FHIRMedicationIngredient {
  itemCodeableConcept: FHIRCodeableConcept;
  isActive: boolean;
}
export interface FHIRMedication {
  resourceType: 'Medication';
  id: string;
  status: 'active' | 'inactive' | 'entered-in-error';
  code: FHIRCodeableConcept;
  form?: FHIRCodeableConcept;
  ingredient: FHIRMedicationIngredient[];
}

function drugCoding(e: DrugEntity): FHIRCoding[] {
  const coding: FHIRCoding[] = [
    { system: PRESCREVE_DRUG_SYSTEM, code: e.id, display: e.activeIngredient.name },
  ];
  if (e.activeIngredient.atc) {
    coding.push({ system: ATC_SYSTEM, code: e.activeIngredient.atc, display: e.activeIngredient.name });
  }
  return coding;
}

/** CodeableConcept do medicamento — reutilizável em MedicationRequest/Statement. */
export function toMedicationCodeableConcept(e: DrugEntity): FHIRCodeableConcept {
  return { coding: drugCoding(e), text: e.activeIngredient.name };
}

/** Projeta um DrugEntity canônico em um recurso FHIR R4 `Medication`. */
export function toFHIRMedication(e: DrugEntity): FHIRMedication {
  const coding = drugCoding(e);
  const form = e.presentations[0]?.form;
  return {
    resourceType: 'Medication',
    id: e.id,
    status: 'active',
    code: { coding, text: e.activeIngredient.name },
    form: form ? { text: form } : undefined,
    ingredient: [
      {
        itemCodeableConcept: {
          coding: e.activeIngredient.atc
            ? [{ system: ATC_SYSTEM, code: e.activeIngredient.atc, display: e.activeIngredient.name }]
            : undefined,
          text: e.activeIngredient.fullName ?? e.activeIngredient.name,
        },
        isActive: true,
      },
    ],
  };
}
