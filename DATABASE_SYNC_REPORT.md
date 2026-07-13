# DATABASE_SYNC_REPORT

**Gerado:** 2026-07-13T22:59:26.033Z · **Publicação:** ✅ liberada

## Resumo

| Métrica | Valor |
|---|---|
| Total analisado | 367 |
| Compatíveis | 90 |
| Divergentes | 28 |
| Críticos | 0 |

## Fontes comparadas

| Fonte | Princípios ativos |
|---|---|
| PHARMA_DB | 339 |
| Eurofarma | 100 |
| Clinical rules (pediatria) | 21 |
| Prescription engine | 18 |

## Achados

| Gravidade | Tipo | Chave | Fontes | Detalhe | Correção sugerida |
|---|---|---|---|---|---|
| high | medicamento_ausente | mol:sulfametoxazol-trimetoprim | Prescription engine ✗ PHARMA_DB | Motor de prescrição calcula dose para "Sulfametoxazol + Trimetoprim (SMX-TMP)" sem correspondência no PHARMA_DB. | Alinhar o identificador entre o motor de prescrição e o PHARMA_DB. |
| high | medicamento_ausente | mol:prednisona | Prescription engine ✗ PHARMA_DB | Motor de prescrição calcula dose para "Prednisona" sem correspondência no PHARMA_DB. | Alinhar o identificador entre o motor de prescrição e o PHARMA_DB. |
| high | medicamento_ausente | mol:atenolol | Prescription engine ✗ PHARMA_DB | Motor de prescrição calcula dose para "Atenolol" sem correspondência no PHARMA_DB. | Alinhar o identificador entre o motor de prescrição e o PHARMA_DB. |
| high | medicamento_ausente | mol:fenitoina | Prescription engine ✗ PHARMA_DB | Motor de prescrição calcula dose para "Fenitoína" sem correspondência no PHARMA_DB. | Alinhar o identificador entre o motor de prescrição e o PHARMA_DB. |
| high | medicamento_ausente | mol:dienogeste | Prescription engine ✗ PHARMA_DB | Motor de prescrição calcula dose para "Dienogeste" sem correspondência no PHARMA_DB. | Alinhar o identificador entre o motor de prescrição e o PHARMA_DB. |
| medium | medicamento_ausente | mol:prednisona | Eurofarma ✗ PHARMA_DB | "Prednisona" (Prednisona Eurofarma) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:levocetirizina | Eurofarma ✗ PHARMA_DB | "Dicloridrato de Levocetirizina" (Zina®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:divalproato-sodio | Eurofarma ✗ PHARMA_DB | "Divalproato de Sódio" (GABA ER®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:acido-ibandronico | Eurofarma ✗ PHARMA_DB | "Ácido Ibandrónico" (Iban®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:trimebutina | Eurofarma ✗ PHARMA_DB | "Maleato de Trimebutina" (Trimeb®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:dienogeste | Eurofarma ✗ PHARMA_DB | "Dienogeste" (Pietra ED®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:colecalciferol | Eurofarma ✗ PHARMA_DB | "Colecalciferol (Vitamina D3)" (AltaD Caps®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:hidroxocobalamina | Eurofarma ✗ PHARMA_DB | "Hidroxocobalamina (Vitamina B12)" (Bedoze®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:nitrato-fenticonazol | Eurofarma ✗ PHARMA_DB | "Nitrato de Fenticonazol" (Ginna®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:promestrieno | Eurofarma ✗ PHARMA_DB | "Promestrieno" (Antrofi®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:canabidiol | Eurofarma ✗ PHARMA_DB | "Canabidiol" (Canabidiol Eurofarma®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB (com fonte) ou revisar o catálogo Eurofarma. |
| low | medicamento_ausente | mol:losartana-hidroclorotiazida | Eurofarma ✗ PHARMA_DB | Combinação comercial "Losartana Potássica + Hidroclorotiazida" (Zart H®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:formoterol-propionato-fluticasona | Eurofarma ✗ PHARMA_DB | Combinação comercial "Fumarato de Formoterol Diidratado + Propionato de Fluticasona" (Lugano®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:montelucaste-levocetirizina | Eurofarma ✗ PHARMA_DB | Combinação comercial "Montelucaste Sódico + Cloridrato de Levocetirizina" (Lemont®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:doxazosina-finasterida | Eurofarma ✗ PHARMA_DB | Combinação comercial "Doxazosina + Finasterida" (Duomo HP®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:tramadol-paracetamol | Eurofarma ✗ PHARMA_DB | Combinação comercial "Tramadol + Paracetamol" (Gésico Duo®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:diosmina-hesperidina | Eurofarma ✗ PHARMA_DB | Combinação comercial "Diosmina + Hesperidina" (Perivasc®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:betametasona-dissodico-betametasona | Eurofarma ✗ PHARMA_DB | Combinação comercial "Dipropionato de Betametasona + Fosfato Dissódico de Betametasona" (BetaTrinta®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:etinilestradiol-ciproterona | Eurofarma ✗ PHARMA_DB | Combinação comercial "Etinilestradiol + Acetato de Ciproterona" (Selene®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:clormadinona-etinilestradiol | Eurofarma ✗ PHARMA_DB | Combinação comercial "Acetato de Clormadinona + Etinilestradiol" (Amora®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:desogestrel-etinilestradiol | Eurofarma ✗ PHARMA_DB | Combinação comercial "Desogestrel + Etinilestradiol" (Primera 20®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:cetoconazol-betametasona | Eurofarma ✗ PHARMA_DB | Combinação comercial "Cetoconazol + Dipropionato de Betametasona" (Trok® Creme) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:betametasona-gentamicina | Eurofarma ✗ PHARMA_DB | Combinação comercial "Dipropionato de Betametasona + Sulfato de Gentamicina" (Trok-G®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:cetoconazol-betametasona-neomicina | Eurofarma ✗ PHARMA_DB | Combinação comercial "Cetoconazol + Dipropionato de Betametasona + Sulfato de Neomicina" (Trok-N®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |
| low | medicamento_ausente | mol:tinidazol-nitrato-miconazol | Eurofarma ✗ PHARMA_DB | Combinação comercial "Tinidazol + Nitrato de Miconazol" (Crevagin®) fora do escopo do PHARMA_DB (moléculas isoladas). | Aceitável: PHARMA_DB indexa moléculas isoladas. Registrar a combinação apenas se for prescritível isoladamente. |

---

*RM-24 Cross Database Validator · impede a publicação quando há achado crítico.*