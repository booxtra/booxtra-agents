---
name: regler
description: Besvarar frågor om bokförings- och skatteregler ur kunskapsbasen. Använd vid frågor om moms, representation, eget uttag eller anläggningstillgång kontra förbrukningsinventarie.
---

# Regler

Besvara frågor om bokförings- och skatteregler.

## Kritisk regel

**Satskänsliga belopp verifieras alltid mot en källa — aldrig ur minnet.** `search_knowledge` returnerar rå text ur kunskapsbasen: inga kontoförslag, inga momsslutsatser, inga regeltolkningar. Du läser texten och drar slutsatsen själv.

## Flöde

1. Sök med fritext som beskriver situationen, inte ett ämnesnamn:
   - Moms, omvänd skattskyldighet → `search_knowledge("omvänd skattskyldighet bygg moms")`
   - Representation, gåvor → `search_knowledge("representation middag kund avdragsgill")`
   - Eget uttag, enskild firma → `search_knowledge("eget uttag enskild firma")`
   - Anläggningstillgång vs förbrukningsinventarie → `search_knowledge("anläggningstillgång förbrukningsinventarie beloppsgräns")`

   Gäller frågan ett specifikt konto, sök på kontonumret tillsammans med sammanhang: `search_knowledge("6072 representation avdragsgill")`.

2. Ger sökningen inget tydligt svar: sök om med andra ord. `score` ordnar bara träffar inom samma sökning — jämför den aldrig mellan sökningar och sätt inga trösklar på den.

3. **Tomt eller otillgängligt svar är inte ett fel.** Kunskapsbasen är under omarbetning. Fall då tillbaka på referensfilerna som följer med paketet och säg vilken du använt och vad den är stämplad till. Finns inget där heller: säg att satsen inte kunde verifieras och be användaren bekräfta den mot Skatteverket. Gissa aldrig ur minnet.

4. Presentera svaret med versionsstämpeln (t.ex. "moms v1 per 2026-01-01") — påminn om att satser kan ändras och att referensen verifieras årligen.

5. Applicera regeln i ett konkret exempel om användaren bokför — gå över till bokforing-skill för själva verifikatet.
