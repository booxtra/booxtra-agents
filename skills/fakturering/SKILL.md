---
name: fakturering
description: Kundfakturor och artikelregister. Använd när användaren vill lägga upp en artikel, fakturera en kund, skicka en kundfaktura eller registrera att en kundfaktura har betalats.
---

# Fakturering

Skapa artiklar och kundfakturor med AR-verktygen (`ar_*`).

## Kritisk regel

**Det finns ingen makulering.** `ar_send_invoice` tilldelar fakturanummer, renderar PDF, bokför och mejlar kunden i ett enda irreversibelt anrop — och statusen `cancelled` är ännu inte implementerad, så en felskickad faktura går inte att ångera. Din bekräftelse med användaren före anropet är hela skyddet.

**Ange alltid `accountNumber` explicit.** Verktygens dokumenterade default är 3001, ett konto som inte finns i den seedade BAS-kontoplanen. Felet slår först vid `ar_send_invoice` — eller, under kontantmetoden, först vid betalningen.

## Välj intäktskonto

Kontot följer momssatsen. En artikel med 6 % moms på ett 25 %-konto ger ett tyst felaktigt verifikat.

| `vatRate` | Tjänst | Vara |
|-----------|--------|------|
| 0.25 | 3040 | 3010 |
| 0.12 | 3041 | 3011 |
| 0.06 | 3042 | 3012 |
| 0 | 3051 | — |

Anta tjänst om användaren inte säger något annat, och säg vilket konto du valt. Anger användaren ett eget kontonummer: slå upp det med `get_chart_of_accounts` och kontrollera att det finns, att `type` är `intäkt` och att `vatCode` matchar momssatsen.

**Skapa aldrig ett konto för att komma vidare.** `create_account` kräver `type` och `vatCode` som inte går att gissa ur ett kontonummer. Ett felstavat nummer ska stoppa flödet — inte bli ett skräpkonto i kontoplanen.

## Flöde

1. **Artikel** — sök först med `ar_search_articles` eller `ar_list_articles`. Behövs en ny: `ar_create_article` med `accountNumber` enligt tabellen.
2. **Kund** — `get_party`, annars `create_party`. Utskick kräver postadress: komplettera med `ar_update_party` innan du går vidare.
3. **Utkast** — `ar_create_invoice`. Inget bokförs och inget fakturanummer tilldelas här.
4. **Bekräfta** — visa mottagare, rader, belopp, moms, förfallodatum och intäktskonto. Be om explicit godkännande.
5. **Skicka** — `ar_send_invoice`. Svaret säger vilken bokföringsmetod som tillämpades.
6. **Betalning** — `ar_mark_invoice_paid` är också irreversibelt. Bekräfta belopp och betaldatum med användaren först.

## Bokföringsmetod

- **Fakturametoden** — försäljningen bokförs vid utskicket; betalningen flyttar fordran från 1510 till 1930.
- **Kontantmetoden** — ingenting bokförs vid utskicket. Hela försäljningen inklusive moms bokförs först vid `ar_mark_invoice_paid`, vilket gör det steget lika tungt som utskicket.

`ar_get_invoice` och `ar_list_invoices` returnerar `posting.explanation` på svenska. Använd den när användaren undrar varför en skickad faktura inte syns i bokföringen.

## Röda flaggor

- "Kunden väntar, skicka bara" → utskicket går inte att ångera. Bekräfta ändå.
- Kontot finns inte → fråga användaren vilket som ska användas. Skapa det inte.
- Osäker på momssats → `search_knowledge("moms tjänster")`, aldrig ur minnet.
