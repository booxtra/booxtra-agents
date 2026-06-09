---
id: anlaggning-vs-forbrukning
title: Anläggningstillgång vs förbrukningsinventarie — gräns och avskrivning
keywords: [anläggningstillgång, fixed asset, förbrukningsinventarie, consumable inventory, avskrivning, depreciation, prisbasbelopp, inventarie]
version: 1
giltig_from: 2026-01-01
---

# Anläggningstillgång vs förbrukningsinventarie

> Booxtra kunskap: anlaggning-vs-forbrukning v1 (per 2026-01-01) — prisbasbeloppet fastställs årligen av regeringen, verifiera gränsen inför nytt räkenskapsår

## Gräns (satskänslig — verifiera vid nytt räkenskapsår)

En inventarie är **förbrukningsinventarie** (direktkostnadsförs) om minst ett av följande gäller:
1. Anskaffningsvärdet exkl. moms understiger **halvt prisbasbelopp** (29 600 kr för 2026; 29 400 kr för 2025)
2. Beräknad ekonomisk livslängd är **3 år eller kortare**

Annars är det en **anläggningstillgång** som aktiveras och skrivs av.

## Prisbasbelopp (satskänsligt)

| År | Prisbasbelopp | Halvt prisbasbelopp |
|----|---------------|---------------------|
| 2025 | 58 800 kr | 29 400 kr |
| 2026 | 59 200 kr | 29 600 kr |

## Avskrivning av anläggningstillgångar

Linjär avskrivning över nyttjandeperioden är vanligast (planenlig avskrivning).

Vanliga nyttjandeperioder:
- Datorer och IT-utrustning: 3–5 år
- Kontorsmöbler och inventarier: 5–10 år
- Maskiner: 5–10 år
- Fordon: 5 år

## BAS-konton

| Konto | Benämning |
|-------|-----------|
| 1210  | Maskiner och andra tekniska anläggningar |
| 1220  | Inventarier och verktyg |
| 1229  | Ackumulerade avskrivningar, inventarier och verktyg |
| 5410  | Förbrukningsinventarier och förbrukningsmaterial |
| 7832  | Avskrivningar på inventarier och verktyg |

## Bokföring

**Förbrukningsinventarie** (direktkostnadsförs vid köp):
- Debet 5410 Förbrukningsinventarier
- Kredit 1930 Företagskonto / 2440 Leverantörsskulder

**Anläggningstillgång** (aktiveras):
- Debet 1220 Inventarier och verktyg
- Kredit 1930 / 2440

**Avskrivning** (månadsvis eller årsvis):
- Debet 7832 Avskrivningar
- Kredit 1229 Ackumulerade avskrivningar
