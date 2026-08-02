# DATABASE_SYNC_REPORT

**Gerado:** 2026-08-02T12:55:20.366Z · **Publicação:** ✅ liberada

## Resumo

| Métrica | Valor |
|---|---|
| Total analisado | 367 |
| Compatíveis | 117 |
| Divergentes (risco aberto) | 0 |
| Aceitos (decisão de escopo documentada — RM-54) | 14 |
| Críticos | 0 |

## Fontes comparadas

| Fonte | Princípios ativos |
|---|---|
| PHARMA_DB | 351 |
| Eurofarma | 101 |
| Clinical rules (pediatria) | 21 |
| Prescription engine | 18 |
| Lab catalog (ANVISA) | 32 |

## Achados

| Gravidade | Tipo | Chave | Fontes | Detalhe | Correção sugerida |
|---|---|---|---|---|---|
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