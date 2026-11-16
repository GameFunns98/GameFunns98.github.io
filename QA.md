# Ověření implementace

Kontrola proběhla dne 16. 11. 2026 nad produkčním statickým buildem ve větvi `feature/personal-portfolio`.

## Automatické kontroly

- Astro a TypeScript strict bez chyb a varování.
- ESLint bez chyb.
- Osm testů skutečného datového formátu Steamu, obnovy dat a chyb API.
- Testy Chromium pro češtinu a angličtinu, přepínání a uchování motivu, mobilní navigaci, klávesnici, přístupnost WCAG A/AA, omezený pohyb a výpadek Discordu.
- Ověření načítání klipu na vyžádání a funkčního odkazu při chybě videa.
- Samostatný HTML náhled ověřený v Chromium včetně fontů, skutečných obrázků, obou jazyků a motivů.
- Vizuální kontrola tmavého a světlého motivu na desktopu a světlého motivu na telefonu. Česká diakritika se vykresluje správně.

## Skutečné veřejné služby

- Steam přehled vychází z existujícího veřejného `steam.svg` a ověřené revize zdroje. Obnova používá veřejné GitHub API a poslední platná data při výpadku.
- Lanyard vrátil platná data pro správné Discord ID. Přítomnost se úspěšně načetla také v Chromium.
- Medal přehrál skutečný vybraný klip v Chromium. Zjištěné rozměry videa jsou 1280 × 720 a délka přibližně 19,87 sekundy. V rozhraní se používají údaje přehrávače.

## Zbývající kroky

- Oblíbené hry může vlastník doplnit v `src/data/favorites.ts`.
- Instagram obsahuje funkční odkaz na profil. Automatický feed vyžaduje účet Creator nebo Business a autorizaci vlastníka.
- Publikace GitHub Pages a kontrola veřejné URL vyžadují samostatné schválení vlastníka.
- Místní server nebyl z prohlížeče tohoto pracovního prostředí dostupný. Připravený samostatný HTML náhled umožňuje přezkoušení bez serveru. Standardní serverový build byl testovaný v Chromium v CI.
