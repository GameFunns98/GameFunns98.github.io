# Ověření implementace

Kontrola nového grafického vzhledu proběhla dne 17. 11. 2026 nad produkčním statickým buildem ve větvi `feature/personal-portfolio`.

## Automatické kontroly

- Astro a TypeScript strict bez chyb a varování.
- ESLint bez chyb.
- Osm testů skutečného datového formátu Steamu, obnovy dat a chyb API.
- Testy Chromium pro češtinu a angličtinu, přepínání a uchování motivu, mobilní navigaci, klávesnici, přístupnost WCAG A/AA, omezený pohyb a výpadek Discordu.
- Ověření načítání klipu na vyžádání a funkčního odkazu při chybě videa.
- Samostatný HTML náhled ověřený v Chromium včetně fontů, skutečných obrázků, obou jazyků a motivů.
- Vizuální kontrola tmavého a světlého motivu na desktopu a světlého motivu na telefonu. Česká diakritika se vykresluje správně.
- Celkem prochází 16 datových a devět prohlížečových testů včetně šířek 320, 360, 768 a 1024 px.
- Soubory Fraunces a Poppins mají ověřenou přítomnost českých znaků ve všech použitých řezech. Licence SIL OFL 1.1 jsou součástí repozitáře. Přesná rodina písma původní grafické předlohy zůstává neověřená.
- Připojení Medal má dva testy rozpoznání veřejných klipů a ověření vlastníka. Veřejný profil a oba skutečné video streamy byly ověřeny 17. 11. 2026.
- Synchronizace Instagramu má šest testů včetně ochrany tokenu, nesprávného účtu, videa a carouselu, výpadku a uchování posledního přehledu. Autorizovaný Creator účet byl ověřen 17. 11. 2026 a načteno šest skutečných příspěvků, včetně jednoho Reelu.

## Skutečné veřejné služby

Samostatná kontrola skutečných veřejných služeb proběhla 16. 11. 2026. Při úpravě vzhledu byly znovu testované úspěšné odpovědi i výpadky v prohlížeči.

- Steam přehled vychází z existujícího veřejného `steam.svg` a ověřené revize zdroje. Obnova používá veřejné GitHub API a poslední platná data při výpadku.
- Lanyard vrátil platná data pro správné Discord ID. Přítomnost se úspěšně načetla také v Chromium.
- Medal přehrál skutečný vybraný klip v Chromium. Zjištěné rozměry videa jsou 1280 × 720 a délka přibližně 19,87 sekundy. V rozhraní se používají údaje přehrávače.

## Zbývající kroky

- Oblíbené hry může vlastník doplnit v `src/data/favorites.ts`.
- Instagram má šest ověřených příspěvků načtených po autorizaci vlastníka. Secret `INSTAGRAM_ACCESS_TOKEN` je dostupný, ale Meta při skutečné obnově 17. 11. 2026 vrátila HTTP 400, kód 190. Poslední platný přehled zůstává zachovaný; k aktivaci obnovy je potřeba nový platný Instagram User token.
- Publikace GitHub Pages a kontrola veřejné URL vyžadují samostatné schválení vlastníka.
- Místní server nebyl z prohlížeče tohoto pracovního prostředí dostupný. Připravený samostatný HTML náhled umožňuje přezkoušení bez serveru. Standardní serverový build byl testovaný v Chromium v CI.
