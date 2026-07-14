# Interoperabilidade — FHIR R4 / HL7 / RNDS

**Módulos:** [`interoperability-engine.ts`](../frontend/src/lib/interoperability-engine.ts) · adaptador [`pharma-core/fhir.ts`](../frontend/src/lib/pharma-core/fhir.ts)

> Camada de interoperabilidade do Prescreve-AI, agora conectada à Single Source of Truth (RM-06) via adaptador `DrugEntity → FHIR`.

---

## 1. Recursos FHIR R4 suportados

`interoperability-engine.ts` implementa os recursos FHIR R4 e utilitários brasileiros:

- **Clínicos:** Patient, Encounter, Observation, Condition, **MedicationRequest**, MedicationStatement, AllergyIntolerance, DiagnosticReport, Composition, **Bundle**.
- **Administrativos:** Practitioner, Organization.
- **Brasil:** TISS (ANS) — Beneficiário/Prestador/Procedimento/Guia.
- **Terminologias:** mapa **CID-10 → SNOMED CT** e **exame → LOINC**.
- Validação estrutural de recursos.

## 2. Adaptador DrugEntity → FHIR (RM-25)

`pharma-core/fhir.ts` conecta a base canônica à interoperabilidade:

```ts
import { drugRepository, toFHIRMedication, toMedicationCodeableConcept } from '@/lib/pharma-core';

const e = drugRepository.getById('enalapril')!;
const med = toFHIRMedication(e);
// → { resourceType: 'Medication', id: 'enalapril',
//     code: { coding: [{ system: 'https://prescreve.ai/fhir/drug-id', ... },
//                       { system: 'http://www.whocc.no/atc', code: 'C09AA02' }],
//             text: 'Enalapril' },
//     form: { text: 'Comprimido' },
//     ingredient: [{ itemCodeableConcept: { ... }, isActive: true }] }
```

- **Codificação ATC** (`http://www.whocc.no/atc`) + id canônico (`https://prescreve.ai/fhir/drug-id`).
- `toMedicationCodeableConcept(e)` — para embutir em `MedicationRequest.medicationCodeableConcept`.
- Toda prescrição FHIR herda automaticamente ATC/DCB/forma canônicos — pré-requisito para integração com a **RNDS**.

## 3. Prontidão e próximos passos

- ✅ Recursos FHIR R4 + TISS + SNOMED/LOINC implementados.
- ✅ Adaptador `DrugEntity → Medication` (RM-25) — a interoperabilidade consome a fonte única.
- ⏭️ Próximos: `toMedicationRequest(entity, patient, posologia)` completo; envio autenticado à RNDS; mapeamento de apresentação/embalagem (EAN/registro ANVISA) quando disponível.

---

*Documento — Prescreve-AI · Interoperabilidade FHIR/HL7.*
