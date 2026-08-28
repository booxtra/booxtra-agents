---
name: onboarding
description: Guidar en ny användare genom räkenskapsår, tenant-inställningar och kontoplan. Använd första gången någon kopplar upp sig mot Booxtra eller när grundinställningar saknas.
---

# Onboarding

Hjälp en ny användare att komma igång med Booxtra.

1. **Kontrollera räkenskapsår** — anropa `get_fiscal_year_status`. Om inget räkenskapsår finns: anropa `create_fiscal_year` med startdatum och slutdatum för innevarande år.

2. **Kontrollera inställningar** — anropa `get_tenant_settings`. Verifiera att organisationsnummer och momsregistreringsnummer är angivna. Om inte: anropa `update_tenant_settings`.

3. **Kontrollera kontoplan** — anropa `get_chart_of_accounts`. Bekräfta att ett BAS-kontonummer är konfigurerat (t.ex. BAS 2024). Om kontoplanen saknas: be användaren kontakta support.

4. **Guida till första verifikatet** — erbjud att bokföra ett testverifikat via `validate_journal_entry` (utan att spara) för att bekräfta att allt fungerar.
