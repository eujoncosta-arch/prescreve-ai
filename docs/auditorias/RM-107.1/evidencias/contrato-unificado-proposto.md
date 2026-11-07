# RM-107.1 — Contrato unificado de dosagem (PROPOSTA; nada foi implementado)

> Especificação de arquitetura. Os tipos abaixo são **pseudo-TypeScript de especificação**, não código do repositório. Nenhum valor clínico, limite etário ou fonte é definido aqui: tudo que é decisão clínica aparece como **[DECISÃO CLÍNICA]** e fica fora da arquitetura.
> Princípio: **decisão de arquitetura ≠ decisão clínica.** O contrato só precisa ser capaz de *representar* a regra, a incerteza e a ausência de dado; escolher qual dose vale é tarefa da validação clínica.

## 0. O que o contrato precisa resolver (problemas observados)
1. Três engines + catálogo com IDs diferentes (`amoxicilina-clavulanato` × `amoxicilina_clavulanato`; `sulfametoxazol-trimetoprim` × `smz-tmp` × `smz_tmp`), sem vínculo de entidade.
2. Populações definidas de três maneiras (A em dias; B em meses; C em anos); lactente < 1 ano × < 2 anos; "adolescente" usa dose adulta em C.
3. Regra escolhida **silenciosamente**: A usa a primeira regra aplicável; B usa a primeira indicação cuja faixa casa (ou `indicacoes[0]`); C usa sempre a 1ª frequência/`habitual`.
4. Apresentação ignorada em C; via/forma/concentração não chegam aos motores de segurança.
5. Faixa etária pediátrica do catálogo é **texto livre** (20 de 20 regras); sem limite aplicado → dose adulta a neonato (cefalexina, SMZ-TMP, metformina) e dipirona calculada a 60 dias em C.
6. `max` adulto sem período em 152/382; unidade com semânticas mistas ("mg/kg/dose" aplicada a valor em mg).
7. Ajuste renal/hepático só como texto (C) ou booleano (A); B sem ajuste.
8. Resultado sem estado: `ok/erro` (A), alertas com prefixo "🚨/⚠" (B/C); a tela pinta de verde e rotula "Prescrição Sugerida" (C) ou "Dose validada" (A, apenas "não excede o máximo").
9. Fontes: C 0/402 linhas; A 37/54 (diretriz agregada); B 32/32 (lista de textos).

## 1. Camadas separadas (nunca misturar)
| Camada | Quem produz | Exemplos | Mutável pelo motor? |
|---|---|---|---|
| **1. Informado pelo prescritor** (`DoseRequest`) | usuário/tela | idade `{valor,unidade}`, peso, altura, indicação, via, forma, concentração, duração, dose desejada, confirmações explícitas | Não |
| **2. Recuperado do catálogo** (`CatalogoRef`) | catálogo de entidades | `entidade_id`, apresentações, concentrações, formas, vias | Não |
| **3. Regra clínica** (`DoseRule`) | governança clínica | escopo, posologia, limites, ajustes, restrições, **fontes e status** | Não (versionada) |
| **4. Dado calculado** (`Derivado`) | motor | idade em dias, população, BSA, TFG, dose absoluta, arredondamentos | Sim, com `formula` e `origem` |
| **5. Resultado** (`DoseResult`) | motor | estado do cálculo, estado da regra, posologia, limites aplicados, dados ausentes | Sim |
| **6. Alertas e bloqueios** | motor + regra | contraindicação, faixa etária, falta de dado, ajuste não aplicado | Sim |
Todo número exibido carrega `origem: 'informado' | 'confirmado_pelo_prescritor' | 'catalogo' | 'regra' | 'calculado'`.

## 2. Entrada (`DoseRequest`)
```ts
interface DoseRequest {
  contrato_versao: 'dose-1';
  identidade: { entidade_id: string;            // identidade por ID (RM-105.1); nome/marca não identifica
                apresentacao_id?: string };     // obrigatório quando a regra depende da apresentação
  paciente: {
    idade?: { valor: number; unidade: 'dias'|'meses'|'anos' };   // age-contract RM-105.2.2: SEMPRE com unidade; dias é a unidade canônica
    idade_gestacional_semanas?: number;         // ao nascimento
    idade_pos_natal_dias?: number;
    idade_pos_menstrual_semanas?: number;       // informada OU derivada (IG + pós-natal) — origem registrada
    peso_atual_kg?: number; peso_ao_nascer_g?: number; altura_cm?: number;
    sexo?: 'M'|'F'; gestante?: boolean; lactante?: boolean;     // 'não informado' ≠ false
    funcao_renal?: { tfg_ml_min?: number; metodo?: 'cockcroft_gault'|'schwartz'|'ckd_epi'|'informada'; creatinina_mg_dl?: number };
    child_pugh?: 'A'|'B'|'C';
  };
  contexto: { indicacao_id?: string; via?: Via; forma_farmaceutica?: string;
              concentracao?: { massa: number; unidade_massa: 'mg'|'mcg'|'g'|'UI'; por: number; unidade_por: 'mL'|'comprimido'|'dose'|'gota' };
              duracao?: { valor: number; unidade: 'dias'|'semanas'|'meses' } };
  dose_informada?: Posologia;                    // modo "verificar": o prescritor propôs uma dose; o motor NÃO a substitui
  confirmacoes_do_prescritor?: Array<{ campo: 'frequencia'|'indicacao'|'regra'; valor: string; em: string }>;  // padrão RM-84: nunca assumido
}
```
Regra de entrada: campo ausente é **ausente**, nunca valor-padrão (`gestante` ausente ≠ não gestante; idade sem unidade é inválida; peso 0 é inválido). A idade usa **exclusivamente** o contrato canônico em dias (365 dias/ano; 1 mês = 365/12 d), preservado integralmente.

## 3. Regra (`DoseRule`) — dado clínico versionado
```ts
interface DoseRule {
  regra_id: string; versao_regra: string; entidade_id: string;
  escopo: {
    populacao_rotulo?: string;                  // apenas rótulo de apresentação; NUNCA critério de seleção
    idade_dias?: { min_inclusivo?: number; max_exclusivo?: number };
    idade_gestacional_semanas?: Faixa; idade_pos_natal_dias?: Faixa; idade_pos_menstrual_semanas?: Faixa;
    peso_kg?: Faixa; superficie_corporal_m2?: Faixa;
    indicacao_id?: string; via: Via; formas?: string[]; apresentacao_ids?: string[];
  };
  posologia: {
    calculo: 'fixa'|'por_kg'|'por_m2'|'por_faixa_peso'|'por_faixa_idade'|'esquema';
    valor: { min?: number; max?: number }; unidade: UnidadeCanonica;      // mg | mcg | g | UI | mL | gotas ...
    base_tempo: 'por_tomada'|'por_dia';                                   // EXPLÍCITO (resolve a ambiguidade tomada × dia)
    substancia_referencia?: string;                                        // ex.: 'trimetoprima' | 'combinado'
    frequencia: { tipo: 'intervalo_h'|'vezes_dia'|'dose_unica'|'sos'|'continua'|'esquema'; valor?: number; faixa?: [number, number]; esquema?: Passo[] };
    duracao?: { min?: number; max?: number; unidade: string };
  };
  limites: { max_por_tomada?: Q; max_por_dia?: Q; max_por_kg_dia?: Q; min_por_tomada?: Q;
             arredondamento?: { alvo: 'dose'|'volume'|'comprimidos'|'gotas'; passo: number; modo: 'nearest'|'down'|'up' } };   // [DECISÃO CLÍNICA/FARMACÊUTICA]
  ajustes: { renal?: AjusteRenal[]; hepatico?: AjusteHepatico[] };
  restricoes: Array<{ tipo: 'contraindicacao'|'bloqueio'|'alerta'; condicao: Condicao; mensagem: string; bloqueia: boolean }>;
  governanca: Governanca;
}
interface AjusteRenal { metodo_tfg: string; faixa_tfg: Faixa; acao: 'sem_ajuste'|'reduzir_dose'|'aumentar_intervalo'|'evitar'|'texto_informativo'; parametros?: object; texto_original: string }
interface Governanca {
  status_validacao: 'sem_fonte'|'fonte_candidata'|'fonte_verificada_revisao_clinica_pendente'|'validada_clinicamente';
  fontes: FonteDose[];   // vazio ⇒ 'sem_fonte'
  limitacoes: string[]; revisao?: { revisor: string; cargo: 'medico'|'farmaceutico_clinico'; data: string; parecer: string };
}
interface FonteDose { instituicao: string; documento: string; url_ou_identificador: string; versao: string; data: string; secao: string; trecho: string;
                      populacao: string; indicacao: string; via: string; limitacoes_da_fonte: string[]; estado_de_revisao: 'candidata'|'verificada' }
```
Regras de integridade (verificadas em carga, como `validarFaixasDoseFixa` hoje): faixas de uma mesma (entidade, indicação, via, apresentação) **não se sobrepõem**; `base_tempo` obrigatório; `status_validacao='validada_clinicamente'` exige `revisao` e fonte `verificada` completa.

## 4. Resultado (`DoseResult`) — nunca confunde estados
```ts
interface DoseResult {
  contrato_versao: 'dose-1';
  estado_calculo: 'calculo_realizado'|'calculo_incompleto'|'dados_invalidos'|'regra_inexistente'|'bloqueado_por_seguranca';
  estado_regra: 'sem_fonte'|'pendente_validacao_clinica'|'fonte_verificada_revisao_clinica_pendente'|'validada_clinicamente'|'nao_aplicavel';
  rotulo_apresentacao: 'dose_calculada_nao_validada'|'dose_validada'|'nao_calculada'|'bloqueada';   // controla a UI
  homologacao_clinica: false;                    // literal, como em RM-105.2.2
  entradas_efetivas: Array<{ campo: string; valor: unknown; origem: Origem; formula?: string }>;    // idade em dias, população, peso, BSA...
  regra_aplicada?: { regra_id: string; versao_regra: string; escopo_casado: object };
  regras_candidatas: Array<{ regra_id: string; casou: boolean; motivo: string }>;                    // várias casam ⇒ incompleto (indicação), nunca "primeira"
  posologia?: { dose_por_tomada: Q; dose_dia: Q; frequencia: Freq; intervalo_h?: number; duracao?: Q; dispensacao?: { unidade: string; quantidade: number }; arredondamento_aplicado?: object };
  limites_aplicados: Array<{ tipo: string; valor: Q; antes: Q; depois: Q }>;       // clamp sempre visível, nunca silencioso
  ajustes: Array<{ tipo: 'renal'|'hepatico'; estado: 'aplicado'|'nao_aplicado_texto_informativo'|'nao_avaliado_falta_dado'; detalhe: string }>;
  dados_ausentes: Array<{ campo: string; necessario_para: string; efeito: 'bloqueia'|'limita' }>;
  alertas: Array<{ codigo: string; severidade: 'info'|'atencao'|'alerta'|'critico'; mensagem: string; bloqueia: boolean }>;
  limitacoes: string[]; passo_a_passo: Array<{ passo: string; formula?: string; valor?: unknown }>;
}
```
### 4.1 Mapeamento dos 7 estados pedidos
| Estado solicitado | Representação |
|---|---|
| Cálculo realizado | `estado_calculo = calculo_realizado` |
| Cálculo incompleto | `estado_calculo = calculo_incompleto` + `dados_ausentes` (inclui "indicação não informada com mais de uma regra possível") |
| Dados inválidos | `estado_calculo = dados_invalidos` (idade sem unidade, peso ≤ 0, unidade inválida) |
| Regra inexistente | `estado_calculo = regra_inexistente` (**nunca** cair na dose adulta) |
| Regra sem fonte | `estado_regra = sem_fonte` |
| Regra pendente de validação clínica | `estado_regra = pendente_validacao_clinica` / `fonte_verificada_revisao_clinica_pendente` |
| Resultado bloqueado por segurança | `estado_calculo = bloqueado_por_seguranca` + `alertas[].bloqueia = true` |
Invariante de apresentação: `rotulo_apresentacao = 'dose_validada'` **somente** se `estado_regra = validada_clinicamente` **e** `estado_calculo = calculo_realizado`. Qualquer outra combinação exibe "dose calculada pela regra cadastrada — não validada clínicamente", sem cor de aprovação, sem "recomendada/segura/validada" e sem botão que sugira aprovação.

## 5. Idade, populações especiais e neonatologia
- Idade canônica em **dias** (RM-105.2.2 preservado). `populacao_rotulo` é derivado só para exibição; **a regra seleciona por faixas em dias** (e, quando a regra exigir, IG/pós-natal/pós-menstrual/peso). Os cortes de lactente (1 × 2 anos), pré-escolar/escolar e adolescente-usa-dose-adulta são **[DECISÃO CLÍNICA]**; o contrato não os fixa.
- Regra com escopo neonatal/prematuro **exige** IG e idade pós-natal (e, quando definido, idade pós-menstrual e peso ao nascer). Ausentes ⇒ `calculo_incompleto` (não presumir termo, não usar apenas a idade cronológica). A idade corrigida de B (`IG + pós-natal − 40 sem`, meses = ⌊sem/4,33⌋) é um **derivado** com fórmula registrada, não um critério oculto.
- Limite superior de idade: regras pediátricas têm `idade_dias.max_exclusivo` explícito (B hoje não limita adultos: devolve doses mg/kg para 70 kg).
- Peso: `peso_atual_kg` para doses por kg; `peso_ao_nascer_g` só onde a regra pedir; BSA com **fórmula declarada na regra** (hoje há 5 implementações: Mosteller em A, B, C(delegando a A) e oncologia; DuBois em B e oncologia) **[DECISÃO CLÍNICA: fórmula por regra]**.

## 6. Compatibilidade com contratos existentes
| Contrato existente | Relação |
|---|---|
| `age-contract` (RM-105.2.2) | reutilizado sem mudança (`IdadeNormalizada.dias`) |
| Identidade por `entidade_id` (RM-105.1) | chave única; elimina o mapeamento de IDs por nome |
| `DoseEstruturada` front / `DoseEstruturadaDto` back (`valor`, `unidade` ∈ {mg,mcg,g,mL,gotas,UI,comprimido,...}, `frequencia` enum, `via`, `dose_por_kg_dia`, `dose_por_tomada`) | **adaptador de saída**: `DoseResult.posologia → DoseEstruturada`; frequência por `intervalo_h` via o mapeamento atual (`mapFrequenciaParaContrato`); recusa de persistência quando `estado_calculo ≠ calculo_realizado` |
| `SafetyCheckInput/Result` (interações) | mesma `entidade_id`; futura etapa pode passar via/forma/concentração ao motor de segurança |
| `interaction-contract` (padrão `SEM_FONTE`, `status_validacao`, estados) | mesmo desenho de governança de fonte |

## 7. Pontos que o contrato NÃO decide (dependem de decisão clínica)
Doses, intervalos, máximos, limites etários, faixas de peso, regra de arredondamento, fórmula de BSA, método de TFG por população, definição de neonato/prematuro/lactente por regra, tratamento do adolescente, quais ajustes renais/hepáticos viram cálculo.
