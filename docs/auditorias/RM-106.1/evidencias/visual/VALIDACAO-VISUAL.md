# RM-106.1 — Validação visual real (fluxo completo da tela /prescricao-rapida)

Execução: `next dev` (porta 3000, `basePath` local `/prescreve-ai`), navegador do app (Browser pane). Fluxo: busca de medicamento → seleção → "Adicionar à prescrição" → aba "Segurança" (e "Gerar receita" → anexo técnico). Medicamentos adicionados pela interface real (clique), não por componente isolado. Cenário 4 usou protocolo antigo (favorito) no `localStorage`, que é a única via da tela para um item sem identidade.

| # | Cenário | Medicamentos | Resultado exibido (texto da tela) | Captura |
|---|---|---|---|---|
| 1 | Pendente por molécula exata | Enalapril + Espironolactona | "Interação identificada, validação clínica pendente" · "Regra cadastrada: "Espironolactona" — reconhecida como molécula exata." · "Sem fonte bibliográfica registrada para esta interação." Também o alerta ARM (regra fixa): "Regra fixa do sistema (sem fonte bibliográfica registrada por regra)." | 01 |
| 2 | Correspondência por classe | Prednisona + Celecoxibe | "Correspondência por CLASSE farmacológica (validação pendente)" · "Regra cadastrada: "AINEs" — reconhecida como classe farmacológica (lista controlada ATC)." · sem fonte registrada | 02 |
| 3 | Correspondência por grupo | Prednisona + Metformina | "Correspondência por GRUPO farmacológico (validação pendente)" · "Regra cadastrada: "Hipoglicemiantes / insulina" — reconhecida como grupo farmacológico (definição explícita ATC)." · sem fonte registrada | 03 |
| 4 | Molécula não reconhecida | "MoleculaNaoCadastradaZZ9" (sem ID) + Ibuprofeno + Enalapril | Aviso âmbar "Verificação PARCIAL — há itens não verificados"; "Não verificadas: … (não reconhecida)"; "Combinações não avaliadas…" ; "Os alertas abaixo (se houver) valem apenas para o que foi verificado." | 04 |
| 5/8 | Reconhecidos, sem regra; sem alertas, avaliação incompleta | Enalapril + Omeprazol | "Nenhum alerta nas regras cadastradas — alergias não avaliadas" (âmbar) · "Sem regra cadastrada encontrada para: Enalapril + Omeprazol." · "Interação não encontrada entre as regras cadastradas NÃO é prova de ausência de interação…" · "Cobertura molecular completa não é avaliação clínica integral." | 05 |
| 6 | Vários alertas simultâneos | Enalapril, Espironolactona, Ibuprofeno, Losartana, Prednisona, Metformina | 8 alertas, cada um com classificação própria (3 regras fixas por CLASSE; 2 por molécula exata; 1 por CLASSE cadastrada; 1 por GRUPO; 1 ARM); lista de 8 pares sem regra, com contagem de interações de alvo não resolvido | 06 |
| 7 | Divergência de gravidade | Cimetidina + Teofilina | "Gravidades cadastradas divergentes (grave × moderada): vale a mais grave." + classificação pendente + sem fonte | 07 |
| — | Anexo técnico | (cenário 6) | 10 seções, incluindo "Pares sem regra de interação encontrada" e a limitação "via de administração, forma farmacêutica, concentração e apresentação do item prescrito…" | 08 |
| — | Celular 375 px | Enalapril, Espironolactona, Ibuprofeno | Ver observação abaixo | 09 |

Capturas: `01-molecula-exata-e-regra-fixa-desktop.jpg`, `02-classe-desktop.jpg`, `03-grupo-desktop.jpg`, `04-molecula-nao-reconhecida-desktop.jpg`, `05-sem-regra-avaliacao-incompleta-desktop.jpg`, `06-multiplos-alertas-6-medicamentos-desktop.jpg`, `07-divergencia-de-gravidade-desktop.jpg`, `08-anexo-tecnico-pares-sem-regra-e-limitacao-via-formulacao-desktop.jpg`, `09-mobile-375px-sidebar-oculta-diagnostico.jpg`.

## Verificações transversais
- **Sem selo verde / indicação de segurança**: nos blocos de segurança, a cobertura "ok" usa cinza (slate) com ícone informativo; avisos incompletos usam âmbar. Varredura de classes `bg/text/border-(green|emerald|lime|teal)` encontrou apenas 2 selos `bg-emerald-600` de 8 px — são os rótulos "EURO" da navegação lateral (não pertencem à segurança).
- **Fonte não registrada** explícita em todos os cartões de interação cadastral; regras fixas indicam "sem fonte bibliográfica registrada por regra".
- **Nenhum cartão** mostrou "confirmada"; todos `data-pendente="sim"`.
- Console do navegador: sem erro da aplicação; apenas 404 de recursos e falha do websocket de HMR do servidor de desenvolvimento sob `basePath`.

## Observações e limitações encontradas (nenhuma corrigida nesta RM)
1. **Layout móvel não responsivo (pré-existente, não é do RM-106).** O shell tem barra lateral fixa de 224 px (`w-56`, sem recolhimento) e a página usa `grid-cols-12` sem breakpoints; em 375 px o painel de conteúdo fica com ~150 px, também em `/calculadoras` (confirmado). Para avaliar só os componentes do RM-106, a barra lateral foi ocultada **apenas na captura 09 (diagnóstico)**: mesmo assim a coluna de segurança fica estreita (~160 px) porque o grid mantém colunas; os blocos do RM-106 quebram texto sem estouro horizontal (`scrollWidth ≤ clientWidth`) e a severidade permanece visível. Legibilidade em celular: **insuficiente por causa do layout geral**, não dos componentes novos.
2. **Cabeçalho "Verificação concluída para todas as moléculas informadas"** (texto das RM-104/105, tom cinza informativo) aparece também quando há pares sem regra (ex.: cenário 6, 8 pares). O corpo explica que isso não é avaliação integral, mas o título isolado pode soar como conclusão. Recomendação: reformular em etapa futura (alterar exige revisão de muitos testes da RM-104).
3. Cosmético: título "Interação: Prednisona + ibuprofeno" usa o nome da entidade em minúsculas (dado do catálogo), enquanto outros aparecem capitalizados.
