# Aktivace Instagram feedu

Web používá oficiální Instagram API with Instagram Login a účet `@vevoda_vaclav`. Podporuje Creator a Business účet. Žádosti o data běží v GitHub Actions, veřejný prohlížeč dostane pouze uložené náhledy a příspěvky.

## Přístup pro načtení prvních příspěvků

Autorizované připojení Instagramu v ChatGPT umožní ověřit účet a přenést jeho poslední veřejné příspěvky do náhledu. Tento souhlas je přístupem připojené aplikace.

## Pravidelná synchronizace GitHub Actions

1. Otevři [Meta App Dashboard](https://developers.facebook.com/apps/) a aplikaci s nastaveným Instagram API with Instagram Login. Pro vlastní spravovaný účet stačí Standard Access. Potřebné oprávnění pro tento feed je `instagram_business_basic`.
2. V sekci Instagram API setup vygeneruj dlouhodobý token pro správný účet. Token z App Dashboardu platí 60 dní. Meta umožňuje jeho obnovu po prvních 24 hodinách platnosti.
3. Vlož token přímo do [Actions Secrets cílového repozitáře](https://github.com/GameFunns98/GameFunns98.github.io/settings/secrets/actions) pod názvem `INSTAGRAM_ACCESS_TOKEN`.
4. Spusť workflow **Refresh public profile data**. Plánované spuštění každých šest hodin začne fungovat po přidání workflow do výchozí větve.

Token patří do GitHub Actions Secrets. Při expiraci nebo odvolání přístupu získej nový token v Meta App Dashboardu a aktualizuj stejný secret.

Skript automaticky ověří uživatelské jméno a typ účtu. Zveřejní nejvýše šest posledních příspěvků. Příspěvky odkazují na skutečný Instagram permalink, videa používají své skutečné náhledy a carousel má náhled první dostupné položky.

Při výpadku zůstane poslední platný přehled včetně původního času aktualizace. Stránka označí neúspěšnou obnovu. Když token chybí, synchronizace se přeskočí. Žádné přístupové údaje se nevkládají do veřejného JSON, HTML ani JavaScriptu.

## Podklady

- [Oficiální zahájení práce s Instagram Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started)
- [Oprávnění a platnost tokenů](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login)
