# DATABASE_SYNC_REPORT

**Gerado:** 2026-07-13T22:51:01.153Z · **Publicação:** ✅ liberada

## Resumo

| Métrica | Valor |
|---|---|
| Total analisado | 367 |
| Compatíveis | 59 |
| Divergentes | 59 |
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
| medium | medicamento_ausente | mol:losartana-hidroclorotiazida | Eurofarma ✗ PHARMA_DB | "Losartana Potássica + Hidroclorotiazida" (Zart H®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:formoterol-propionato-fluticasona | Eurofarma ✗ PHARMA_DB | "Fumarato de Formoterol Diidratado + Propionato de Fluticasona" (Lugano®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:prednisona | Eurofarma ✗ PHARMA_DB | "Prednisona" (Prednisona Eurofarma) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:levocetirizina | Eurofarma ✗ PHARMA_DB | "Dicloridrato de Levocetirizina" (Zina®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:divalproato-sodio | Eurofarma ✗ PHARMA_DB | "Divalproato de Sódio" (GABA ER®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:montelucaste-levocetirizina | Eurofarma ✗ PHARMA_DB | "Montelucaste Sódico + Cloridrato de Levocetirizina" (Lemont®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:doxazosina-finasterida | Eurofarma ✗ PHARMA_DB | "Doxazosina + Finasterida" (Duomo HP®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:acido-ibandronico | Eurofarma ✗ PHARMA_DB | "Ácido Ibandrónico" (Iban®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:trimebutina | Eurofarma ✗ PHARMA_DB | "Maleato de Trimebutina" (Trimeb®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:tramadol-paracetamol | Eurofarma ✗ PHARMA_DB | "Tramadol + Paracetamol" (Gésico Duo®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:diosmina-hesperidina | Eurofarma ✗ PHARMA_DB | "Diosmina + Hesperidina" (Perivasc®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:betametasona-dissodico-betametasona | Eurofarma ✗ PHARMA_DB | "Dipropionato de Betametasona + Fosfato Dissódico de Betametasona" (BetaTrinta®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:etinilestradiol-ciproterona | Eurofarma ✗ PHARMA_DB | "Etinilestradiol + Acetato de Ciproterona" (Selene®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:clormadinona-etinilestradiol | Eurofarma ✗ PHARMA_DB | "Acetato de Clormadinona + Etinilestradiol" (Amora®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:desogestrel-etinilestradiol | Eurofarma ✗ PHARMA_DB | "Desogestrel + Etinilestradiol" (Primera 20®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:dienogeste | Eurofarma ✗ PHARMA_DB | "Dienogeste" (Pietra ED®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:colecalciferol | Eurofarma ✗ PHARMA_DB | "Colecalciferol (Vitamina D3)" (AltaD Caps®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:hidroxocobalamina | Eurofarma ✗ PHARMA_DB | "Hidroxocobalamina (Vitamina B12)" (Bedoze®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:cetoconazol-betametasona | Eurofarma ✗ PHARMA_DB | "Cetoconazol + Dipropionato de Betametasona" (Trok® Creme) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:betametasona-gentamicina | Eurofarma ✗ PHARMA_DB | "Dipropionato de Betametasona + Sulfato de Gentamicina" (Trok-G®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:cetoconazol-betametasona-neomicina | Eurofarma ✗ PHARMA_DB | "Cetoconazol + Dipropionato de Betametasona + Sulfato de Neomicina" (Trok-N®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:nitrato-fenticonazol | Eurofarma ✗ PHARMA_DB | "Nitrato de Fenticonazol" (Ginna®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:tinidazol-nitrato-miconazol | Eurofarma ✗ PHARMA_DB | "Tinidazol + Nitrato de Miconazol" (Crevagin®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:promestrieno | Eurofarma ✗ PHARMA_DB | "Promestrieno" (Antrofi®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| medium | medicamento_ausente | mol:canabidiol | Eurofarma ✗ PHARMA_DB | "Canabidiol" (Canabidiol Eurofarma®) existe no catálogo Eurofarma mas não no PHARMA_DB. | Cadastrar o princípio ativo no PHARMA_DB ou revisar o catálogo Eurofarma. |
| low | divergencia_nome | mol:losartana | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Losartana" vs Eurofarma="Losartana Potássica". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:olmesartana | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Olmesartana" vs Eurofarma="Olmesartana Medoxomila". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:enalapril | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Enalapril" vs Eurofarma="Maleato de Enalapril". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:anlodipino | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Anlodipino" vs Eurofarma="Besilato de Anlodipino". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:bisoprolol | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Bisoprolol" vs Eurofarma="Hemifumarato de Bisoprolol". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:metformina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Metformina" vs Eurofarma="Cloridrato de Metformina". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:formoterol | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Formoterol" vs Eurofarma="Fumarato de Formoterol". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:montelucaste | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Montelucaste" vs Eurofarma="Montelucaste Sódico". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:sertralina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Sertralina" vs Eurofarma="Cloridrato de Sertralina". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:escitalopram | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Escitalopram" vs Eurofarma="Oxalato de Escitalopram". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:amoxicilina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Amoxicilina" vs Eurofarma="Amoxicilina Tri-hidratada". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:azitromicina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Azitromicina" vs Eurofarma="Di-hidrato de Azitromicina". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:ciprofloxacino | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Ciprofloxacino" vs Eurofarma="Cloridrato de Ciprofloxacino". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:paracetamol | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Paracetamol" vs Eurofarma="Paracetamol (Acetaminofeno)". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:tramadol | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Tramadol" vs Eurofarma="Cloridrato de Tramadol". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:amoxicilina-clavulanato | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Amoxicilina + Clavulanato" vs Eurofarma="Amoxicilina + Clavulanato de Potássio". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:rosuvastatina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Rosuvastatina" vs Eurofarma="Rosuvastatina Cálcica". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:atorvastatina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Atorvastatina" vs Eurofarma="Atorvastatina Cálcica". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:clopidogrel | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Clopidogrel" vs Eurofarma="Bissulfato de Clopidogrel". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:vortioxetina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Vortioxetina" vs Eurofarma="Bromidrato de Vortioxetina". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:zolpidem | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Zolpidem" vs Eurofarma="Hemitartarato de Zolpidem". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:hidroxizina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Hidroxizina" vs Eurofarma="Dicloridrato de Hidroxizina". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:pramipexol | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Pramipexol" vs Eurofarma="Dicloridrato de Pramipexol". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:betaistina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Betaistina" vs Eurofarma="Dicloridrato de Betaistina". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:enoxaparina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Enoxaparina" vs Eurofarma="Enoxaparina Sódica". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:trimetazidina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Trimetazidina" vs Eurofarma="Dicloridrato de Trimetazidina". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:fexofenadina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Fexofenadina" vs Eurofarma="Cloridrato de Fexofenadina". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:valaciclovir | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Valaciclovir" vs Eurofarma="Cloridrato de Valaciclovir". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:moxifloxacino | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Moxifloxacino" vs Eurofarma="Cloridrato de Moxifloxacino". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:hidroxicloroquina | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Hidroxicloroquina" vs Eurofarma="Sulfato de Hidroxicloroquina". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |
| low | divergencia_nome | mol:risedronato | PHARMA_DB × Eurofarma | Nome do ativo difere: PHARMA_DB="Risedronato" vs Eurofarma="Risedronato Sódico". | Padronizar a DCB entre as fontes (o molecule_id já é o mesmo). |

---

*RM-24 Cross Database Validator · impede a publicação quando há achado crítico.*