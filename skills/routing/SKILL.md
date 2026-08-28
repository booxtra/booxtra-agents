---
name: routing
description: Identifierar användarens intent och delegerar till rätt Booxtra-skill. Använd när det är oklart vilket bokföringsområde en fråga gäller.
---

# Routing

Identifiera användarens intent och delegera till rätt skill.

| Intent | Skill |
|--------|-------|
| "bokföra", "verifikat", "leverantörsfaktura", "kvitto", "notera" | bokforing |
| "kundfaktura", "fakturera", "artikel", "prislista", "faktura betald" | fakturering |
| "moms", "skatt", "avdrag", "representationsregel", "anläggningstillgång" | regler |
| "rapport", "balansräkning", "resultaträkning", "ledger", "momsrapport" | rapporter |
| "ny", "kom igång", "räkenskapsår", "kontoplan", "första gången" | onboarding |
| "stänga period", "bokslut", "SIE", "export", "avskrivning" | avslut-och-export |

Ordet "faktura" ensamt är tvetydigt: en leverantörsfaktura som ska betalas hör till bokforing, en kundfaktura som ska skickas hör till fakturering. Fråga vilket det gäller om det inte framgår.

Om intent är oklart: fråga användaren vilket område det gäller.
