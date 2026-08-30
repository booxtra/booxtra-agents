---
name: bokforing
description: Skapar och validerar verifikat. Använd när användaren vill bokföra en leverantörsfaktura, kundbetalning, banktransaktion, lönepost eller eget uttag.
---

# Bokföring

Skapa och validera verifikat.

## Flöde

1. **Identifiera verifikatstyp**: leverantörsfaktura, kundbetalning, banktransaktion, lönepost, eget uttag, övrigt.

2. **Satskänsliga belopp**: om verifikatet innehåller moms, representation eller anläggningstillgång — anropa `search_knowledge` med en fritextfråga (t.ex. `"representation middag kund"`) *innan* du föreslår konton. Aldrig ur minnet. Verktyget returnerar rå text utan slutsatser; läs den och dra slutsatsen själv. Tomt svar är inte ett fel — fortsätt, men säg att satsen inte kunde verifieras.

3. **Säkerställ kontona**: slå upp varje konto verifikatet ska röra enligt "Välj konton" nedan. Saknas något — se "Saknas kontot". Gör det innan du föreslår en kontering för användaren.

4. **Identifiera motpart (obligatoriskt före bokföring)**: ta reda på kund/leverantör. Slå upp med `get_party(orgNumber)` (namnsökning endast som reserv). Saknas parten — `create_party` och använd det returnerade id:t. Skicka alltid `partyId` till `post_journal_entry`. Utelämna `partyId` endast när det saknas identifierbar motpart (t.ex. rena bankavgifter).

5. **Validera före bokföring**: anropa `validate_journal_entry` med det föreslagna verifikatet. Servern kontrollerar balans, att kontona finns, att perioden är öppen, momskonsistens (`vatCode` och `vatAmount` måste antingen båda anges eller båda utelämnas) och att inga nollrader finns. Åtgärda alla fel innan du går vidare.

6. **Bokför**: anropa `post_journal_entry` med `partyId`, `agentName` (t.ex. "Claude Desktop"), `aiModel` (t.ex. "claude-opus-4-8") och `vatCode` (S25/S12/S6) på momsrader. Servern blockerar obalanserade verifikat hårt — de kan inte sparas.

7. **Koppla underlag (efter bokföring)**: anropa `upload_document(journalEntryId, filename, mimeType)` *efter* att verifikatet skapats — det genererar en uppladdningslänk. Försök aldrig läsa eller koda in filen själv. Presentera länken för användaren: "Ladda upp kvittot via denna länk: [uploadUrl]. Länken gäller i 24 timmar." När användaren bekräftar — anropa `get_document_status(journalEntryId)` för att verifiera att dokumentet kopplades.

## Välj konton

Den här skillen innehåller inga kontonummer. Varje konto slås upp i `get_chart_of_accounts` innan det används — aldrig ur minnet.

**Kostnadskontot avgörs av vad som köpts**, inte av momssatsen: en representationsmiddag och en förbrukningsinventarie kan bära samma moms och hör ändå till olika konton. Fråga `search_knowledge` vilket kontobegrepp som gäller för situationen, och bekräfta sedan i kontoplanen att ett konto med den innebörden finns hos tenanten.

**Momskontot följer `vatCode`.** Sök i kontoplanen på den `vatCode` som svarar mot satsen — S25, S12 eller S6 — och skilj ingående från utgående moms på benämningen. Välj kontot vars `vatCode` faktiskt matchar satsen; ett samlingskonto för moms utan `vatCode` är inte samma sak och ger ett verifikat som inte går att stämma av mot momsrapporten.

**Balanskontona slås upp på `type` och benämning:** leverantörsskuld respektive kundfordran på motpartssidan, bankkonto eller kassa på betalningssidan. Har tenanten flera bankkonton — fråga användaren vilket det gäller, gissa inte.

Konteringsmönstren:

- Leverantörsfaktura: Debet kostnadskonto + Debet ingående moms / Kredit leverantörsskulder
- Betalning av leverantörsfaktura: Debet leverantörsskulder / Kredit bankkonto
- Kundbetalning: Debet bankkonto / Kredit kundfordringar
- Eget uttag (enskild firma): se `search_knowledge("eget uttag enskild firma")`

## Saknas kontot

`create_account` går inte att ångera. Servern har varken delete- eller deactivate-verktyg för konton, så ett felaktigt konto ligger kvar i kontoplanen, i rapporterna och i varje SIE-export. Källan till `type` och `vatCode` avgör om du får skapa.

**Härlett behov** — `search_knowledge` har gett dig kontobegreppet och därmed `type`, och momssatsen ger `vatCode` när kontot är momspliktigt. `type` och `vatCode` är då indata, inte gissningar. Skapa kontot med benämningen ur sökträffen och säg vilket du skapade.

**Nummer från användaren som inte finns** — skapa det inte reflexmässigt; ett felskrivet nummer ligger nära ett riktigt. Slå upp numret med `search_knowledge`. Ger sökningen en entydig benämning och kontotyp: visa den för användaren, bekräfta och skapa. Ger den inget: fråga vilket konto som ska användas, och skapa inget.

Skapa aldrig ett konto vars `type` eller `vatCode` du bara kan gissa ur numret.
