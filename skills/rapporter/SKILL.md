# Rapporter

Hämta och presentera boksluts- och löpande rapporter.

## Tillgängliga rapporter

| Rapport | Verktyg |
|---------|---------|
| Balansräkning | `get_balance_sheet(period)` |
| Resultaträkning | `get_income_statement(period)` |
| Huvudbok / kontoutdrag | `get_ledger(account, period)` |
| Momsrapport | `get_vat_summary(period)` |
| Kontosaldo | `get_account_balance(account, period)` |

## Flöde

1. Fråga användaren om period (månad, kvartal, räkenskapsår) om det inte framgår.
2. Anropa rätt rapportverktyg.
3. Presentera siffrorna tydligt. Notera vilket räkenskapsår och period rapporten avser.
4. Om siffror ser oansenliga ut (t.ex. negativt eget kapital, ovanligt hög kostnad): påpeka och erbjud att granska relevanta verifikat via `get_ledger`.
