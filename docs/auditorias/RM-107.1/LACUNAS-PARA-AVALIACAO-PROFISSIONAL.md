# RM-107.1 — Lacunas que exigem avaliação profissional

> **Documental.** Este documento **não responde** às questões clínicas; apenas as organiza. Todas as decisões D1–D14 estão **PENDENTES**. Nenhum comportamento do sistema foi alterado. Detalhes técnicos: `MATRIZ-DELIBERACAO-D1-D14.md`; fontes: `MATRIZ-DE-FONTES-E-EVIDENCIAS.md` (**o catálogo não possui fontes verificadas para as regras avaliadas**); testes: `MATRIZ-DE-TESTES.md`.
> **Tipo de decisão:** MÉD = médica · FARM = farmacêutica · GOV = governança · PROD = produto · TEC = exclusivamente técnica.

## Riscos atuais de D1 e D2 (permanecem existentes até alteração aprovada)
**Os comportamentos abaixo existem hoje e continuarão existindo enquanto não houver alteração aprovada e autorizada.** Nada foi modificado nesta etapa.
- **D1 — fallback para dose adulta** (`dose-calculator`, tela `/prescricao-rapida`): em paciente pediátrico sem regra pediátrica utilizável, **207** medicamentos calculam dose adulta **sem bloqueio**; **125** só bloqueiam por frequência indeterminada (após confirmação manual do prescritor, o caminho de código usa a dose adulta — não executado); **5** medicamentos com regra pediátrica cadastrada a ignoram. O campo `uso_pediatrico = nao_aplicavel` (66 medicamentos) **não é consultado**; 55 desses estão entre os 207. A interface mostra cartão verde "Prescrição Sugerida" quando não há alerta.
- **D2 — adolescentes:** abaixo de 18 anos o `dose-calculator` não usa a regra pediátrica (0 dos 20 medicamentos com `dose_pediatrica` a usam aos 14 anos); o `dosing-engine` agrupa adolescente com adulto em 20 regras; o `pediatric-engine` não classifica adolescente.
- Medidas apenas com pacientes-padrão (neonato 14 d, lactente 6 m, criança 4 a, adolescente 14 a, adulto 40 a); relevância clínica de cada caso **não foi avaliada**.
- **Ações de mitigação não foram realizadas** (dependem de decisão formal e da autorização da etapa de contenção).

## Lacunas por decisão

### D1 — Ausência de regra pediátrica
- **Questão (MÉD + FARM + GOV):** o que o sistema deve fazer quando não há regra pediátrica aplicável; quais medicamentos têm uso pediátrico previsto.
- **Medicamentos:** 207 + 125 + 30 + 5 (lista em `evidencias/inventario-D1-por-medicamento.csv`).
- **Evidências técnicas:** `catalogo-dose-calculator-resumo.json`, `catalogo-uso-pediatrico-vs-calculo.json`.
- **Não se sabe:** quais dos 207 têm uso pediátrico legítimo; se a marca `nao_aplicavel` está completa e correta nos 66; o que ocorre clinicamente nos 125 após confirmação de frequência.
- **Especialidade:** pediatria, farmácia clínica; governança clínica.
- **Fontes necessárias:** bula profissional (população pediátrica) e diretriz pediátrica por molécula.
- **Consequência de manter:** o comportamento de risco acima segue ativo.
- **Testes após decisão:** `MATRIZ-DE-TESTES.md` § D1.

### D2 — Adolescentes e transição para dose adulta
- **Questão (MÉD + FARM):** transição por medicamento/indicação ou critério geral com exceções.
- **Medicamentos:** 20 regras de A; 20 medicamentos de C com `dose_pediatrica`; B (30 de 32 indicações sem idade máxima).
- **Evidências:** `resultados-comparados-pacientes-padrao.json` (adolescente 14 a/50 kg).
- **Não se sabe:** critério clínico adequado por medicamento; papel do peso/maturidade.
- **Especialidade:** pediatria/medicina do adolescente; farmácia clínica.
- **Fontes:** bula/diretriz por molécula. **Consequência de manter:** transição definida por convenção técnica. **Testes:** § D2.

### D3 — Faixas etárias e classificação populacional
- **Questão (MÉD + GOV + TEC):** faixas institucionais únicas ou por medicamento. (TEC: representação canônica em dias já existe — RM-105.2.2.)
- **Medicamentos:** todos com regra por população (A: 3 neonato, 12 lactente, 15 pediátrico); catálogo inteiro em C.
- **Evidências:** `classificacao-etaria-comparada.json`, `verificacoes-pontuais.json` (365–729 d: A pediátrico × C lactente; 12 meses = 360 × 365 d).
- **Não se sabe:** a definição institucional; qual divergência é intencional.
- **Especialidade:** pediatria/neonatologia; governança. **Fontes:** protocolo institucional, bula/diretriz. **Consequência:** a mesma criança muda de faixa conforme a tela. **Testes:** § D3.

### D4 — Idade mínima por medicamento
- **Questão (MÉD + FARM):** restrição etária por medicamento/indicação/via/forma.
- **Medicamentos:** dipirona, ibuprofeno, metformina, omeprazol, amoxicilina (neonato); azitromicina (B ≥ 6 m; A/C sem mínimo estruturado); concordantes A × B: amoxicilina + clavulanato e SMZ-TMP (~2 meses). Demais: não avaliados.
- **Evidências:** `divergencias-por-medicamento.md`; S-04 (dipirona 60 d: A e B bloqueiam, C calcula).
- **Não se sabe:** mínimos corretos; vias/formulações que alteram o limite.
- **Especialidade:** pediatria, farmácia. **Fontes:** bula (restrições etárias). **Consequência:** cálculo em idade que outro motor bloqueia. **Testes:** § D4.

### D5 — Dose pediátrica por indicação e peso
- **Questão (MÉD + FARM):** revisão por divergência, com fonte e justificativa.
- **Medicamentos:** cefalexina, amoxicilina, amoxicilina + clavulanato, ibuprofeno, omeprazol, dipirona, SMZ-TMP, paracetamol.
- **Evidências:** comparativo e tabelas (`COMPARATIVO-TRES-MOTORES.md`); achado de base temporal/faixa numérica em C (19 + 98 medicamentos; relevância não avaliada).
- **Não se sabe:** qual valor, se algum, é adequado; se as diferenças decorrem de indicação/apresentação; peso de referência.
- **Especialidade:** pediatria, infectologia (antimicrobianos), farmácia clínica. **Fontes:** bula + diretriz por indicação. **Consequência:** diferenças de até ~2× na dose diária derivada entre telas/motores. **Testes:** § D5.

### D6 — Intervalos e frequência
- **Questão (MÉD + FARM + TEC):** validar intervalos; estruturar frequência (TEC).
- **Medicamentos:** amoxicilina, ibuprofeno, paracetamol, dipirona (adulto em C), amoxicilina + clavulanato (por apresentação); 125 do catálogo com frequência indeterminada.
- **Não se sabe:** intervalo correto por indicação/população; equivalência entre esquemas. **Especialidade:** farmácia clínica, pediatria/clínica médica. **Fontes:** bula/diretriz. **Consequência:** frequência segue em texto livre; bloqueios por faixa. **Testes:** § D6.

### D7 — Dose máxima
- **Questão (MÉD + FARM):** limites e sua aplicabilidade; tipos de limite (tomada, dia, kg, absoluto).
- **Medicamentos:** paracetamol, dipirona, omeprazol, metformina, ibuprofeno (+ amox-clav, SMZ-TMP).
- **Evidências:** tabela D7 da matriz; `max` adulto de C não aplicado; 152/382 sem período.
- **Não se sabe:** limites adequados por população/indicação. **Especialidade:** farmácia clínica; médica por área. **Fontes:** bula (dose máxima). **Consequência:** selo "Dose validada" em `/dosagem` segue significando só "não excede o cadastrado". **Testes:** § D7.

### D8 — SMZ-TMP: substância de referência
- **Questão (FARM + MÉD + TEC):** convenção de cadastro, cálculo e exibição (TEC: campo de substância).
- **Medicamento:** sulfametoxazol + trimetoprima. **Evidências:** A/B base TMP; C `habitual "800/160 mg"` lido como 800.
- **Não se sabe:** qual substância o 800 representa em C; se há outras associações com o mesmo problema (não auditadas).
- **Especialidade:** farmácia clínica, infectologia. **Fontes:** bula das apresentações. **Consequência:** risco de confusão de unidade. **Testes:** § D8.

### D9 — Neonatologia e prematuridade
- **Questão (MÉD + FARM):** dados obrigatórios por medicamento/indicação; definições.
- **Medicamentos:** A (amoxicilina, paracetamol, fenitoína); B (ibuprofeno-PDA, aciclovir neonatal + 10 alertas); C (cafeína citrato, poractanto alfa, vitamina K1 neonatal, sildenafil neonatal, fenobarbital neonatal).
- **Evidências:** IPM e peso ao nascer inexistentes; B aplica idade corrigida a qualquer paciente com IG + pós-natal.
- **Não se sabe:** dados exigidos por regra; limiares de prematuridade. **Especialidade:** neonatologia, farmácia neonatal. **Fontes:** bula, diretriz neonatal. **Consequência:** cálculo neonatal com idade cronológica isolada. **Testes:** § D9.

### D10 — Arredondamento e apresentação farmacêutica
- **Questão (FARM + TEC):** critérios por forma/dispositivo; (TEC) tornar a apresentação parte do cálculo.
- **Medicamentos:** amoxicilina e amoxicilina + clavulanato (demonstrado); 266 com ≥ 2 concentrações (relevância clínica não confirmada nos demais).
- **Não se sabe:** em quais medicamentos a dose depende da apresentação. **Fontes:** bula (forma/administração), parecer farmacêutico. **Consequência:** a concentração escolhida não altera a dose. **Testes:** § D10.

### D11 — Superfície corporal e função renal
- **Questão (MÉD + FARM + TEC):** método por população/finalidade; (TEC) consolidar implementações após decisão.
- **Evidências:** 6 implementações de BSA, 5 de ClCr (+ CKD-EPI/MDRD); comparação numérica não executada.
- **Não se sabe:** equivalência numérica e adequação por população. **Fontes:** referência farmacológica/diretriz. **Consequência:** método não declarado por regra. **Testes:** § D11.

### D12 — Ajustes renais e hepáticos
- **Questão (MÉD + FARM):** quais ajustes viram cálculo, métodos, populações.
- **Evidências:** A 10 flags renais/1 hepático; C 364/382 e 382/382 em texto; nenhum altera a dose.
- **Não se sabe:** qualidade clínica dos textos; priorização. **Especialidade:** nefrologia/hepatologia, farmácia clínica. **Fontes:** bula (populações especiais). **Consequência:** texto informativo segue sem efeito no cálculo. **Testes:** § D12.

### D13 — Linguagem e sinalização
- **Questão (GOV + PROD):** política de estados e rótulos; remoção de verde/"validada" sem regra validada.
- **Evidências:** `/dosagem` (selos "Dose/tomada validada", "Dose diária validada"); `DoseCalcCard` ("Prescrição Sugerida", cartão/botão verdes).
- **Não se sabe:** texto institucional aprovado. **Fontes:** política de governança clínica. **Consequência:** a interface continua sugerindo validação não demonstrada. **Testes:** § D13.

### D14 — Escopo dos motores especializados
- **Questão (PROD + GOV):** quais módulos entram no 1º ciclo.
- **Evidências:** paliativo, UTI, oncologia, geriatria com funções de dose/BSA/ClCr; obstetrícia não confirmada.
- **Não se sabe:** inventário completo de dose desses módulos. **Especialidade:** respectivas áreas. **Consequência:** escopo indefinido. **Testes:** § D14.

## Síntese por tipo de decisão
| Tipo | Decisões |
|---|---|
| Médica | D1, D2, D3, D4, D5, D6, D7, D9, D11, D12 |
| Farmacêutica | D1, D2, D4, D5, D6, D7, D8, D9, D10, D11, D12 |
| Governança | D1, D3, D13, D14 |
| Produto | D13, D14 |
| Exclusivamente técnica | componentes de D3 (representação em dias, já existente), D6 (estruturar frequência), D8/D10 (campos), D11 (consolidação após decisão) — **somente após** decisão clínica correspondente |
