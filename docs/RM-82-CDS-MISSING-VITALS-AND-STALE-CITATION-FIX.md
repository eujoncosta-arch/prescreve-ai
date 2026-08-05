# RM-82 — Nova varredura de qualidade: corrige antipadrão `?? valor-normal` remanescente e citação de HAS desatualizada em `clinical-decision-support.ts`

**Origem:** o usuário pediu explicitamente uma nova varredura de qualidade
("nova varredura de qualidade" — padrão RM-54), sem achado específico em
mãos. Reexecutados os gates do zero (todos verdes) e delegada uma
investigação read-only (Explore) para procurar, especificamente, os
mesmos padrões de problema já vistos nas RMs anteriores desta sessão:
citações suspeitas/inconsistentes entre arquivos, estatística fabricada
apresentada como real, e o antipadrão `?? valor-normal` que mascara dado
clínico ausente como se fosse um achado normal.

## Achados confirmados e corrigidos

### 1. Antipadrão `?? valor-normal` em `clinical-decision-support.ts` (não corrigido antes)

O projeto já havia corrigido este antipadrão em `clinical-risk-engine.ts`
(RM-39) e no motor de ICU, mas **`clinical-decision-support.ts`** — o
motor real de sugestão de hipóteses diagnósticas (`analyzeClinical`),
consumido por `DiagnosticPanel.tsx` — continuava usando a forma antiga em
~35 critérios/red_flags: `(sv(a).spo2 ?? 100) < 95`, `(sv(a).pa_sistolica
?? 0) >= 140`, `(lab(a, 'ldl') ?? 0) >= 130`, `(sv(a).glasgow ?? 15) <
13`, `(sv(a).temperatura ?? 36) >= 38`, `(lab(a, 'hdl') ?? 99) < 40`, etc.

Verificação cuidadosa mostrou que, em **todos** os casos deste arquivo,
o valor de fallback foi escolhido especificamente para nunca disparar o
critério (ex.: `spo2 ?? 100` num critério `< 95` — 100 nunca é `< 95`) —
ou seja, o comportamento observável (a suíte de 1102 testes já passava e
continua passando sem alteração) **não estava incorreto hoje**. O risco
real é de fragilidade futura: se alguém inverter o sinal de um operador
(`>=` → `<=`) ou ajustar um limiar sem perceber o valor de fallback
embutido, o comportamento pode mudar silenciosamente sem que nenhum teste
capture a intenção original. O próprio arquivo já usava a forma explícita
em 3 lugares (`const g = lab(a, 'glicemia'); return g !== undefined && g
>= 100 && g < 126;`, linhas 215/220/741) — só não tinha sido aplicada de
forma consistente ao restante.

**Corrigido:** todos os ~35 pontos reescritos para a forma explícita já
estabelecida no próprio arquivo: `const v = campo; return v !== undefined
&& v OP limiar;`. Nenhuma regra clínica, peso ou limiar foi alterado —
só a forma de checar ausência de dado. Cobre HAS (PA), DM2 (glicemia,
HbA1c, IMC), Dislipidemia (LDL, colesterol total, TG, HDL), Asma/DPOC/ICC
(SpO2, FR, Glasgow), SCA (PA, FC), Hipotireoidismo (TSH, FC, Glasgow) e
PAC (temperatura, FR, SpO2, leucócitos, PCR, CURB-65).

### 2. Citação de HAS desatualizada, não migrada no RM-81

`clinical-decision-support.ts` ainda citava **"7ª Diretriz Brasileira de
Hipertensão Arterial — SBC 2020"** (comentário de seção, campo
`guideline` e `raciocinio_base`), enquanto o RM-81 já havia atualizado
`evidence-engine.ts`, `scientific-repository.ts`,
`clinical-therapeutics.ts`, `mock-data.ts` e `governance.ts` para a
**Diretriz Brasileira de Hipertensão Arterial – 2025** (DBHA 2025,
SBC/SBN/SBH, DOI `10.36660/abc.20250624`). Este arquivo tinha ficado fora
do escopo do RM-81 porque a investigação da vez não cobriu
`clinical-decision-support.ts`.

**Corrigido:** `guideline.diretriz`/`sociedade`/`ano`/`link` atualizados
para DBHA 2025; `raciocinio_base` reescrito para citar DBHA 2025 e incluir
a meta pressórica universal `< 130/80 mmHg` e as classes preferenciais
(diurético tiazídico/similar, IECA/BRA, BCC) — mesma mudança clínica real
já documentada no RM-81. O critério diagnóstico numérico (`≥ 140/90
mmHg`) não mudou entre as edições, então nenhuma regra de pontuação foi
alterada.

## O que NÃO foi alterado

Nenhum peso, limiar numérico ou regra clínica nova. `clinical-therapeutics.ts`,
`evidence-engine.ts`, `governance.ts`, `mock-data.ts` e
`scientific-repository.ts` (já corrigidos no RM-81) não foram tocados
novamente. A linha 1104 (`(b.grau_confianca ?? 0) - (a.grau_confianca ??
0)`, comparador de ordenação por confiança calculada) foi deixada como
está — não é um sinal vital/exame, é um score já calculado pelo próprio
motor, fora do escopo deste achado.

## Achados investigados e não confirmados como bug (sem ação)

- **`multicentric-validation.ts` / `/validacao-real`**: já usa geração
  determinística claramente sintética (Kappa/IC95% fabricados via LCG) e
  já exibe `DemoDataNotice`. A investigação sinalizou que o nível de
  detalhe (nomes de especialidade reais, formatação de κ/IC95% com 2-3
  casas decimais) pode ainda ser arriscado apesar do aviso, mas isso é uma
  decisão de produto/UX já registrada no RM-60 §8 (achado de risco
  reputacional, não um bug de código) — sem ação nova nesta RM.
- Nenhum novo DOI fabricado ou não-verificável foi encontrado em
  `evidence-engine.ts`, `governance.ts`, `mock-data.ts`,
  `scientific-repository.ts` ou `guideline-class-validation.ts` além do já
  corrigido acima.

## Testes novos

`frontend/src/tests/rm82-cds-missing-vitals.test.ts` (8 testes): prova,
via `analyzeClinical()` real (não mock), que:
- SpO2/PA/labs ausentes nunca geram red flag falso nem falsa ausência de
  red flag por erro de sinal;
- os mesmos valores realmente anormais (SpO2 89%, PA 190/120, LDL 150)
  continuam disparando critérios e red flags exatamente como antes (sem
  regressão de comportamento);
- a hipótese de HAS agora cita a DBHA 2025 (`ano: 2025`, `diretriz`
  contém "2025", não contém "7ª").

## Gates executados

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Limpo (antes e depois da correção) |
| `npm run lint` | ✅ 0 problemas |
| `npx vitest run` (suíte completa) | ✅ **63 arquivos / 1110 testes** — todos passando (62/1102 antes + 1 arquivo novo/8 testes novos) |
| `npm run build` | ✅ Sucesso — 50 rotas geradas, nenhum erro |

`DATABASE_SYNC_REPORT.md`/`RM23_DRUG_CONSISTENCY_REPORT.md`, regenerados
como efeito colateral do build, foram revertidos (`git checkout --`).

---

## Arquivos alterados

**Novo:**
- `docs/RM-82-CDS-MISSING-VITALS-AND-STALE-CITATION-FIX.md` (este relatório)
- `frontend/src/tests/rm82-cds-missing-vitals.test.ts`

**Modificado:**
- `frontend/src/lib/clinical-decision-support.ts`

---

Não foi feito commit, push ou deploy nesta RM.
