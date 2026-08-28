---
name: avslut-och-export
description: Bokför avskrivningar, stänger perioder och exporterar SIE4-filer. Använd vid bokslut, periodstängning eller när revisorn behöver en SIE-fil.
---

# Avslut och export

Stäng perioder, bokför avskrivningar och exportera SIE-filer.

## Flöde

1. **Avskrivningar** — anropa `post_depreciation` för att bokföra planerade avskrivningar på anläggningstillgångar för perioden. Granska output och bekräfta att rätt tillgångar skrevs av.

2. **Granska resultaträkning** — anropa `get_income_statement` för perioden. Kontrollera att inga uppenbara poster saknas (t.ex. avsättningar, periodiseringar).

3. **Stäng period** — `close_period` är **irreversibelt**. Bekräfta alltid med användaren innan anrop. Visa vilken period som stängs och be om explicit godkännande.

4. **Exportera SIE4** — anropa `export_sie4` för den stängda perioden. SIE-filen kan laddas upp till revisorn eller Skatteverket.

## Viktigt

`close_period` låser perioden permanent — inga verifikat kan ändras eller läggas till i en stängd period. Kör alltid `get_income_statement` och `get_balance_sheet` och låt användaren godkänna siffrorna innan stängning.
