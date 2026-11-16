# GameFunns

Osobní portfolio Václava Dudy. Astro, TypeScript strict a Tailwind CSS. Výsledkem jsou statické stránky pro GitHub Pages.

## Vývoj

Použij Node.js 24 LTS a npm. Z kořene repozitáře spusť `npm ci`, potom `npm run dev`. Produkční verzi sestaví `npm run build` a spustí `npm run preview`.

Při nedostupnosti místního serveru vytvoří `node scripts/create-preview.mjs` po sestavení samostatný soubor `.preview/GameFunns-preview.html`. Obsahuje oba jazyky, motivy, média a fonty ze skutečného produkčního buildu. Otevři ho přímo v prohlížeči. Živé integrace stále potřebují připojení k internetu.

`npm run check` kontroluje Astro a TypeScript, `npm run lint` pravidla zdrojového kódu a `npm test` datové integrace. Pro testy prohlížeče nejdřív spusť `npx playwright install chromium`, potom `npm run test:browser`. Testy používají produkční build.

## Obsah

- `src/components/Portfolio.astro` skládá úvod, zájmy, vybrané projekty a sociální profily.
- `src/data/projects.ts` obsahuje výběr projektů a překlady jejich popisů.
- `src/data/favorites.ts` obsahuje ručně vybrané oblíbené hry. Prázdný seznam sekci skryje.
- `src/data/clips.ts` obsahuje vlastní veřejné klipy. Přidávej pouze skutečný klip a ověřený náhled. Délka se ručně neodhaduje.
- `src/data/activity-copy.ts` obsahuje překlady integrací.
- `src/styles/portfolio.css` definuje oba motivy, rozložení a pohyb.
- `src/layouts/Page.astro` nastavuje jazyk, SEO, bezpečnostní omezení a počáteční motiv.
- `public/` obsahuje veřejná média, fonty a poslední datové přehledy. Podrobnosti o právech jsou v `MEDIA.md`.

## Jazyky a motivy

`/cs/` a `/en/` jsou úplné statické verze. Kořen zvolí uložený jazyk nebo jazyk prohlížeče. Přímá jazyková adresa má přednost. Bez JavaScriptu se na kořeni zobrazí čeština.

Při první návštěvě se otevře tmavý motiv. Volby jazyka a motivu se ukládají v prohlížeči. Web respektuje `prefers-reduced-motion`.

## Steam

Data pocházejí z existujícího workflow v [GameFunns98/GameFunns98](https://github.com/GameFunns98/GameFunns98/blob/main/.github/workflows/metrics.yml). Zobrazuje se skutečný čas aktualizace a poslední hrané hry. Při návštěvě web nejvýše jednou za šest hodin kontroluje novou revizi veřejného `steam.svg`. Při výpadku nebo limitu API zachová poslední přehled.

`npm run sync:steam` aktualizuje přibalený soubor `public/data/steam.json`. Pro tuto cestu nejsou potřeba žádné nové klíče. Veřejný výstup obsahuje údaje, které zveřejňuje už existující Steam integrace.

## Discord

Klient čte veřejný Lanyard endpoint pro ID `922153911161323601`. Aktivace vyžaduje, aby vlastník byl na [serveru Lanyard](https://github.com/Phineas/lanyard#get-started-in--10-seconds). Služba vrací pouze dostupnou veřejnou aktivitu.

Stav se kontroluje až poblíž viditelné sekce a obnovuje se s prodlevou při chybách. Při opuštění záložky se dotazování pozastaví. Výpadek se zobrazí jako nedostupnost. Starý stav se neukládá do trvalé cache.

## Medal a Instagram

Medal galerie používá ručně spravovaný seznam vlastních klipů. Video se načítá až na přání návštěvníka. Zdroj je veřejná adresa videa ze skutečných metadat klipu. Při změně dostupnosti funguje odkaz na původní stránku. Oficiální profilový feed se nepoužívá.

Instagram má odkaz na `@vevoda_vaclav`. Pro budoucí automatický feed je potřeba účet Creator nebo Business a autorizace oficiálního Meta API. Token patří do GitHub Actions Secrets. Osobní účet aplikace sama nemění.

## Sestavení a publikace

Workflow Portfolio checks provádí typovou kontrolu, lint, testy, produkční build a testy Chromium včetně přístupnosti. Build je dostupný jako artefakt.

Implementace vzniká ve větvi `feature/personal-portfolio`. Publikace na `https://gamefunns98.github.io` čeká na samostatné schválení vlastníka. Pro uživatelský web se používá kořen `/`. Nasazení musí použít složku `dist/` a zdroj GitHub Actions v nastavení Pages.

## Bezpečnost

Klient používá veřejné endpointy a neobsahuje API tokeny. Externí data se vkládají jako text, zdrojová HTML ani SVG z API se do DOM nevkládají. Povoleny jsou jen známé zdroje médií a připojení. Licence MIT kódu se nevztahuje na portrét a převzatá média.
