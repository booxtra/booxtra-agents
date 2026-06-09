# Bokföring

Skapa och validera verifikat.

## Flöde

1. **Identifiera verifikatstyp**: leverantörsfaktura, kundbetalning, banktransaktion, lönepost, eget uttag, övrigt.

2. **Satskänsliga belopp**: om verifikatet innehåller moms, representation eller anläggningstillgång — anropa `get_knowledge` för rätt regler *innan* du föreslår konton. Aldrig ur minnet.

3. **Identifiera motpart (obligatoriskt före bokföring)**: ta reda på kund/leverantör. Slå upp med `get_party(orgNumber)` (namnsökning endast som reserv). Saknas parten — `create_party` och använd det returnerade id:t. Skicka alltid `partyId` till `post_journal_entry`. Utelämna `partyId` endast när det saknas identifierbar motpart (t.ex. rena bankavgifter).

4. **Validera före bokföring**: anropa `validate_journal_entry` med det föreslagna verifikatet. Servern kontrollerar balans, att kontona finns, att perioden är öppen, momskonsistens (`vatCode` och `vatAmount` måste antingen båda anges eller båda utelämnas) och att inga nollrader finns. Åtgärda alla fel innan du går vidare.

5. **Bokför**: anropa `post_journal_entry` med `partyId`, `agentName` (t.ex. "Claude Desktop"), `aiModel` (t.ex. "claude-opus-4-8") och `vatCode` (S25/S12/S6) på momsrader. Servern blockerar obalanserade verifikat hårt — de kan inte sparas.

6. **Koppla underlag (efter bokföring)**: anropa `upload_document(journalEntryId, filename, mimeType)` *efter* att verifikatet skapats — det genererar en uppladdningslänk. Försök aldrig läsa eller koda in filen själv. Presentera länken för användaren: "Ladda upp kvittot via denna länk: [uploadUrl]. Länken gäller i 24 timmar." När användaren bekräftar — anropa `get_document_status(journalEntryId)` för att verifiera att dokumentet kopplades.

## Vanliga konteringsregler

- Leverantörsfaktura: Debet kostnadskonto + Debet 2640 Ingående moms / Kredit 2440 Leverantörsskulder
- Betalning av leverantörsfaktura: Debet 2440 / Kredit 1930
- Kundbetalning: Debet 1930 / Kredit 1510 Kundfordringar
- Eget uttag (enskild firma): se `get_knowledge("eget-uttag")`
