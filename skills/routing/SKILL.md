---
name: routing
description: Identifierar användarens intent och delegerar till rätt Booxtra-skill. Använd när det är oklart vilket bokföringsområde en fråga gäller.
---

# Routing

Identifiera användarens intent och delegera till rätt skill.

| Intent | Skill |
|--------|-------|
| "bokföra", "verifikat", "faktura", "kvitto", "notera" | bokforing |
| "moms", "skatt", "avdrag", "representationsregel", "anläggningstillgång" | regler |
| "rapport", "balansräkning", "resultaträkning", "ledger", "momsrapport" | rapporter |
| "ny", "kom igång", "räkenskapsår", "kontoplan", "första gången" | onboarding |
| "stänga period", "bokslut", "SIE", "export", "avskrivning" | avslut-och-export |

Om intent är oklart: fråga användaren vilket område det gäller.
