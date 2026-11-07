# RM-105.2.2 — Integridade entre pacientes, normalização da idade e precisão do contrato de avaliação

Estado: implementada e verificada tecnicamente. **Sem commit, push ou deploy. RM-106 e RM-107 não iniciadas.** Aprovação técnica não é homologação clínica.

## 1. Estado inicial

Branch `main`, commit `b36c639`, com alterações locais não commitadas das RM-104 a RM-105.2.1 (preservadas). Riscos herdados: (1) `loadFavorite` trocava só os itens e mantinha na tela nome, idade, contexto e alergias do paciente anterior; (2) a idade era um número solto "em anos" (digitar 28 pensando em dias valia 28 anos), com três representações incompatíveis nos motores; (3) `avaliacao_integral` podia ser lida como "tudo certo" mesmo havendo limitações conhecidas.

## 2. Arquivos alterados

Novos: `lib/age-contract.ts`, `lib/safety-limitations.ts`, `lib/patient-session.ts`, `tests/rm10522-troca-de-paciente-idade-e-contrato-de-avaliacao.test.tsx` (45 testes).
Alterados: `app/prescricao-rapida/page.tsx`, `lib/safety-context.ts`, `lib/safety-rules.ts` (só entrada/saída do contrato), `lib/safety-coverage.ts`, `lib/safety-annex.ts`, `components/modules/ReceitaPaciente.tsx` (texto da idade) e os testes `cj-009`, `rm1052`, `rm10521`.
Não alterados: doses, posologias, contraindicações, severidade de alertas, matriz de interações, regras de alergia, identidade molecular, catálogo, `dose-calculator.ts`, `dosing-engine.ts`, `pediatric-engine.ts`.

## 3. Fluxo de troca de pacientes

1. **Detecção** (`dadosClinicosPreenchidos`): nome, idade, sexo, peso, altura, creatinina, Child-Pugh, diagnóstico, observações, gestação, lactação, alergias. Espaços em branco não contam.
2. **Sem dados clínicos:** o protocolo carrega direto, como antes; o aviso de recuperação lista o que preencher.
3. **Com dados clínicos:** nada é alterado ainda. Aparece, na aba Favoritos, uma confirmação inline com os campos que serão descartados: "Descartar dados e carregar" ou "Cancelar (manter a sessão atual)".
4. **Cancelar:** sessão preservada integralmente (paciente, contexto, alergias, itens e avaliação). Verificado por teste e no navegador.
5. **Confirmar:** limpa paciente, contexto, alergias, CrCl, resultado e horário da avaliação; carrega só os itens; recalcula a avaliação; exibe "Os dados clínicos do paciente anterior … foram descartados" e "Informações a preencher para este paciente: gestação, lactação, idade, função renal, alergias" (lista dinâmica da avaliação).
6. A confirmação é um painel da própria tela (não `window.confirm`), testável e visível. Nada novo é persistido: o protocolo salvo continua com `id`, `nome`, `descricao`, `criado_em` e `itens`.

## 4. Contrato de idade

`{ valor, unidade: 'dias' | 'meses' | 'anos' }`; unidade canônica interna: **dias**.
- **Sem unidade, não interpreta:** número solto, texto, objeto sem unidade ou unidade vazia → idade inválida (`sem_unidade`), regra geriátrica **não avaliada** (nunca "não idoso"), avaliação nunca integral. Unidade desconhecida, valor negativo, NaN, infinito, texto e acima de 120 anos (em qualquer unidade) também são inválidos.
- **Convenção única:** 1 ano = 365 dias; 1 mês = 365/12 dias; sem ajuste de ano bissexto (erro máximo ~0,07%, ~1 dia a cada 4 anos). É a mesma convenção do corte neonatal de 28/365 ano do `dose-calculator` e dos 28 dias do `dosing-engine`.
- **Conversões rastreáveis:** cada normalização lista as contas (ex.: "28 dias → 0.0767 anos (÷ 365)"); o resumo (`cobertura_contextual.idade`) traz texto, unidade informada, dias, meses, anos, faixa e conversões, e vai para o anexo.
- **Faixa:** reutiliza `classifyPopulation` (a mesma da calculadora de dose desta tela): neonato < 28 dias, lactente < 2 anos, pré-escolar < 6, escolar < 12, adolescente < 18, adulto, idoso ≥ 65. Nenhuma faixa ou regra nova foi criada.
- **Verificado:** fronteiras exatas nas três unidades (27/28 dias; 23,99/24 meses; 729/730 dias; 12, 18 e 65 anos = 4380, 6570 e 23725 dias = 144, 216 e 780 meses); equivalência entre unidades sem erro de arredondamento; varredura de 0 a 800 dias monotônica e consistente com o classificador.
- **Interface:** o campo "Idade" passou a ter valor + unidade (sem unidade pré-escolhida, "unidade" como marcador). Mostra a interpretação ("Interpretada como 28 dias (≈ 0.0767 anos; faixa lactente)") ou o erro; sem unidade avisa que o valor não foi interpretado. A calculadora de dose, o CrCl, o Beers e a receita impressa passam a usar a idade normalizada (a receita imprime "Idade: 28 dias"). A calculadora de dose só abre com idade válida.
- **Compatibilidade:** `idade_anos` (numérico) continua aceito como formato legado (sempre anos), marcado como legado; `idade` e `idade_anos` contraditórios → inválido.
- **Divergência entre motores (documentada, NÃO resolvida):** `dose-calculator` lactente < 2 anos; `dosing-engine` lactente < 365 dias e pediátrico < 12 anos; `pediatric-engine` usa cortes em meses (12 e 156). Coincidem no corte neonatal e em 18 e 65 anos. Um teste prova a divergência (400 dias: lactente no contrato, pediátrico no `dosing-engine`). Unificar exige decisão clínica e fonte oficial.

## 5. Contrato de avaliação

Campos aditivos (os anteriores não mudam; `avaliacao_integral` mantém o significado "todas as verificações configuradas foram executadas"):
- `limitacoes_conhecidas`: lista `{ codigo, severidade: 'informativa' | 'relevante', descricao }`. Códigos: `regras_cadastradas_apenas` (sempre), `faixa_pediatrica_sem_regras_especificas` (idade < 18 anos), `idade_formato_legado`, `reatividade_cruzada_nao_avaliada`, `alergia_a_classe_sem_avaliacao_molecular`, `excipientes_nao_avaliados`.
- `detalhe_avaliacao`: `natureza = cobertura_tecnica_das_verificacoes_configuradas`; `homologacao_clinica: false` (sempre); `verificacoes_configuradas_executadas`; `contextos_nao_informados`, `contextos_invalidos`, `contextos_nao_avaliados`; `limitacoes_relevantes`; `faixa_etaria_sem_estratificacao`; `verificacoes_fora_do_escopo` (dose e posologia, função hepática/Child-Pugh, comorbidade, alimentos/fitoterápicos, regras por faixa pediátrica/neonatal, reatividade cruzada).
- **Tela:** o selo verde passa a dizer "Cobertura técnica das verificações configuradas; NÃO é validação clínica" e lista as limitações relevantes; **some** na faixa pediátrica ("Nenhum alerta nas regras cadastradas — faixa etária sem regras específicas").
- **Anexo:** novas linhas "Natureza da avaliação … NÃO é homologação clínica", contagem de limitações relevantes, "RELEVANTE: …" por limitação, "Verificações fora do escopo atual" e "Idade normalizada … conversões". Nenhuma expressão de segurança/liberação/certificação (teste varre os cenários).
- Resultado de erro também traz os campos novos, sem integral e sem homologação.

## 6. Testes

Novos: 45 em `rm10522-…` (contrato de idade, integração no motor, contrato de avaliação, detecção de dados, tela de idade, troca de pacientes: com dados, cancelar, confirmar, sem dados, dois consecutivos, protocolo antigo sem `entidade_id`, quantidades diferentes 3 → 1 → 2, persistência só de itens).
Ajustados por mudança intencional: `rm10521` (limitação pediátrica com novo texto; idade com unidade), `rm1052` (a página passa `idade` com unidade), `cj-009` (campo de idade por `data-testid`).
Cobertos pelos testes: troca com dados; cancelar sem perda; confirmar com limpeza; alergias, contextos e avaliação não herdados; protocolos antigos; idade em dias/meses/anos; conversões e limites; ausência de unidade; valores inválidos; limitações pediátricas; integral com limitações; separação cobertura técnica × homologação clínica.

## 7. Evidências visuais (navegador embutido, servidor de desenvolvimento)

- **Idade sem unidade:** "28" sem unidade → mensagem vermelha "Idade sem unidade … O valor não foi interpretado." (`data-idade-estado=invalida`).
- **Unidade Dias:** "Interpretada como 28 dias (≈ 0.0767 anos; faixa lactente)"; cabeçalho "Paciente A (lactente), 28 dias, 4 kg".
- **Troca (dados preenchidos):** painel "Há dados clínicos preenchidos nesta sessão: nome, idade, peso, altura." com os dois botões; os dados seguiam intactos.
- **Cancelar:** nome, idade, unidade, peso, altura e o item Losartana preservados; sem aviso de recuperação.
- **Confirmar:** nome, idade, unidade, peso, altura vazios; gestação e alergias "Não informado"; só "Paracetamol" na prescrição; "Os dados clínicos do paciente anterior … foram descartados" e "Informações a preencher: gestação, lactação, idade, função renal, alergias".
- **Pediatria (6 meses):** título "Nenhum alerta nas regras cadastradas — faixa etária sem regras específicas" (sem selo verde), limitação listada e painel "Alergias não informadas — não avaliadas".
- **Anexo:** natureza (não homologação), limitação "RELEVANTE: Faixa etária pediátrica/neonatal…", escopo, idade normalizada com conversões ("6 meses → 0.5 anos (÷ 12); 0.5 anos → 182.5 dias (× 365)") e a receita imprime "Idade: 6 meses".
- Dados de teste removidos do navegador; viewport restaurado; servidor parado.
- **Limitação:** as capturas de tela ficaram no ambiente da sessão (não foram gravadas no repositório); o registro é o texto lido do DOM acima. A impressão em PDF real não foi repetida nesta rodada (o fluxo de impressão não mudou além do texto da idade; a validação de PDF da RM-105.2.1 permanece válida). O estado visual do seletor de unidade mostrou, em um momento, a lista de opções aberta após cliques sintéticos; não reproduzível com interação normal.

## 8. Resultados dos gates

| Gate | Resultado |
|---|---|
| `tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| `vitest run` | **89 arquivos, 1.731 testes passando** (antes: 88 / 1.686) |
| `npm run build` | exit 0, 50/50 páginas |

Relatórios regenerados pelo build (`DATABASE_SYNC_REPORT.md`, `RM23_DRUG_CONSISTENCY_REPORT.md`) restaurados com `git checkout`.

## 9. Riscos residuais

- A confirmação de troca cobre apenas o carregamento de protocolo. Outras ações (recarregar a página, trocar manualmente o nome) não disparam descarte; os dados continuam só na memória da tela.
- Quem escolher a unidade errada ainda pode errar (ex.: "28 anos" em vez de "28 dias"); a tela mostra a interpretação ao lado, mas a decisão final é do prescritor.
- Idade fracionária em anos continua aceita (ex.: 0,5 ano) e é tratada como anos; o formato legado `idade_anos` segue existindo para compatibilidade.
- O `dosing-engine` e o `pediatric-engine` seguem fora desta tela e com cortes diferentes do `dose-calculator`.
- Protocolos antigos com nomes de variantes continuam em avaliação parcial até reselecionar o medicamento.

## 10. Pendências clínicas

1. Fronteira do lactente (1 × 2 anos) entre os motores: exige decisão e fonte oficial antes de unificar.
2. Necessidade de regras de segurança por faixa pediátrica/neonatal (hoje inexistentes; declarado como limitação).
3. Gravidade dos alertas de alergia (sem aprovação clínica, inalterada).
4. Limites de validade (120 anos, 500 kg) e limiar de idoso (65 anos).
5. Reatividade cruzada e excipientes (sem regras, declarados).

## 11. Itens não implementados e justificativas

- Unificação dos cortes etários entre os três motores e regras pediátricas/neonatais: dependem de fonte oficial e validação especializada.
- Persistência de dados do paciente/prontuário: fora do escopo.
- Descarte automático dos dados ao recarregar a página ou trocar de paciente por outras vias: não solicitado nesta etapa.

## 12. Confirmações

- **RM-106 e RM-107:** não foram iniciadas.
- **Commit, push e deploy:** não houve. O HEAD continua em `b36c639`.
