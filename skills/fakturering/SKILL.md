---
name: fakturering
description: Kundfakturor och artikelregister. Använd när användaren vill lägga upp en artikel, fakturera en kund, skicka en kundfaktura eller registrera att en kundfaktura har betalats.
---

# Fakturering

Skapa artiklar och kundfakturor med AR-verktygen (`ar_*`).

## Kritisk regel

**Det finns ingen makulering.** `ar_send_invoice` tilldelar fakturanummer, renderar PDF, bokför och mejlar kunden i ett enda irreversibelt anrop — och statusen `cancelled` är ännu inte implementerad, så en felskickad faktura går inte att ångera. Din bekräftelse med användaren före anropet är hela skyddet.

**Inget skapas förrän intäktskontot är på plats.** Verktygens dokumenterade default-konto finns inte i den seedade BAS-kontoplanen, och felet slår först vid `ar_send_invoice` — eller, under kontantmetoden, först vid betalningen. Artikeln bär dessutom kontot vidare in i varje framtida faktura. Kontogrinden stänger därför före både artikel och utkast.

## Välj intäktskonto

Kontot härleds ur momssatsen och ur om raden avser en vara eller en tjänst. Aldrig ur minnet — den här skillen innehåller inga kontonummer.

1. Hämta kontoplanen med `get_chart_of_accounts`.
2. Sök ett konto med `type` `intäkt` och en `vatCode` som svarar mot momssatsen: S25 för 0.25, S12 för 0.12, S6 för 0.06. Vid 0 % moms: ett intäktskonto utan `vatCode`.
3. Skilj vara från tjänst på kontots benämning. Anta tjänst om användaren inte säger något annat, och säg alltid vilket konto du valt.
4. Matchar flera konton lika bra — fråga användaren. Matchar inget — se "Saknas kontot".

Använd ett befintligt konto som bär rätt kombination även om numret inte är det du väntade dig. Ett nytt konto vid sidan av ett som redan gör jobbet är en dubblett.

Anger användaren själv ett konto: kontrollera i kontoplanen att det finns, att `type` är `intäkt` och att `vatCode` matchar momssatsen. Avviker `vatCode` från satsen — stanna och fråga. En artikel med 6 % moms på ett 25 %-konto ger ett tyst felaktigt verifikat.

Osäker på vilken momssats som gäller: `search_knowledge("moms tjänster")` — aldrig ur minnet.

## Saknas kontot

`create_account` går inte att ångera. Servern har varken delete- eller deactivate-verktyg för konton, så ett felaktigt konto ligger kvar i kontoplanen, i rapporterna och i varje SIE-export. Källan till `type` och `vatCode` avgör om du får skapa.

**Härlett behov** — du känner momssatsen och vet om det gäller vara eller tjänst, men inget konto bär kombinationen. `type` och `vatCode` är då indata, inte gissningar. Slå upp benämningen med `search_knowledge` (t.ex. `"BAS-konto försäljning tjänster 25 % moms"`), skapa kontot och säg vilket du skapade.

**Nummer från användaren som inte finns** — skapa det inte reflexmässigt; ett felskrivet nummer ligger nära ett riktigt. Slå upp numret med `search_knowledge`. Ger sökningen en entydig benämning och kontotyp: visa den för användaren, bekräfta och skapa. Ger den inget: fråga vilket konto som ska användas, och skapa inget.

Skapa aldrig ett konto vars `type` eller `vatCode` du bara kan gissa ur numret.

## Flöde

1. **Konto** — säkerställ intäktskontot enligt ovan innan något annat skapas.
2. **Artikel** — sök först med `ar_search_articles` eller `ar_list_articles`. Behövs en ny: `ar_create_article` med kontot från steg 1.
3. **Kund** — `get_party`, annars `create_party`. Utskick kräver postadress: komplettera med `ar_update_party` innan du går vidare.
4. **Utkast** — `ar_create_invoice`. Inget bokförs och inget fakturanummer tilldelas här.
5. **Bekräfta** — visa mottagare, rader, belopp, moms, förfallodatum och intäktskonto. Be om explicit godkännande.
6. **Skicka** — `ar_send_invoice`. Svaret säger vilken bokföringsmetod som tillämpades.
7. **Betalning** — `ar_mark_invoice_paid` är också irreversibelt. Bekräfta belopp och betaldatum med användaren först.

Steg 2 och 3 är oberoende av varandra, men båda ska vara klara före steg 4.

## Bokföringsmetod

- **Fakturametoden** — försäljningen bokförs vid utskicket; betalningen flyttar fordran från kundfordringar till bankkontot.
- **Kontantmetoden** — ingenting bokförs vid utskicket. Hela försäljningen inklusive moms bokförs först vid `ar_mark_invoice_paid`, vilket gör det steget lika tungt som utskicket.

`ar_get_invoice` och `ar_list_invoices` returnerar `posting.explanation` på svenska. Använd den när användaren undrar varför en skickad faktura inte syns i bokföringen.

## Röda flaggor

- "Kunden väntar, skicka bara" → utskicket går inte att ångera. Bekräfta ändå.
- Kontot finns inte → härlett fall: skapa. Användarangivet nummer: slå upp och bekräfta först.
- Frestelsen att skriva ett kontonummer ur minnet → kontoplanen är källan, `search_knowledge` är reserven.
- Osäker på momssats → `search_knowledge("moms tjänster")`, aldrig ur minnet.
