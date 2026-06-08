# Regler

Besvara frågor om bokförings- och skatteregler.

## Kritisk regel

**Satskänsliga belopp verifieras alltid via `get_knowledge` — aldrig ur minnet, och aldrig ur en bundlad kopia som kan vara inaktuell.**

## Flöde

1. Identifiera ämnet:
   - Moms / omvänd skattskyldighet → `get_knowledge("moms")`
   - Representation, gåvor → `get_knowledge("representation")`
   - Eget uttag, enskild firma → `get_knowledge("eget-uttag")`
   - Anläggningstillgång vs förbrukningsinventarie → `get_knowledge("anlaggning-vs-forbrukning")`

2. Om sökningen inte ger tydlig träff: anropa `get_knowledge` igen med ett av de returnerade ämnes-ID:na från index.

3. Presentera svaret för användaren och hänvisa till versionsstämpeln i referensen (t.ex. "moms v1 per 2026-01-01") — påminn om att satser kan ändras och att referensen verifieras årligen.

4. Applicera regeln i ett konkret exempel om användaren bokför — gå över till bokforing-skill för själva verifikatet.
