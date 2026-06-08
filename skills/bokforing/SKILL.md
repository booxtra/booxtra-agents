# Bokföring

Skapa och validera verifikat.

## Flöde

1. **Identifiera verifikatstyp**: leverantörsfaktura, kundbetalning, banktransaktion, lönepost, eget uttag, övrigt.

2. **Satskänsliga belopp**: om verifikatet innehåller moms, representation eller anläggningstillgång — anropa `get_knowledge` för rätt regler *innan* du föreslår konton. Aldrig ur minnet.

3. **Validera före bokföring**: anropa `validate_journal_entry` med det föreslagna verifikatet. Åtgärda varningar och block som servern returnerar.

4. **Koppla underlag**: om ett kvitto eller dokument finns — anropa `upload_document` och notera dokument-ID. Länka ID:t i verifikatet.

5. **Bokför**: anropa `post_journal_entry`. Servern blockerar obalanserade verifikat hårt — de kan inte sparas.

## Vanliga konteringsregler

- Leverantörsfaktura: Debet kostnadskonto + Debet 2640 Ingående moms / Kredit 2440 Leverantörsskulder
- Betalning av leverantörsfaktura: Debet 2440 / Kredit 1930
- Kundbetalning: Debet 1930 / Kredit 1510 Kundfordringar
- Eget uttag (enskild firma): se `get_knowledge("eget-uttag")`
