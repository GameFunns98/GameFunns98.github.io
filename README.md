# GameFunns

Osobní portfolio Václava Dudy. Astro, TypeScript strict a Tailwind CSS. Výsledkem jsou statické stránky pro GitHub Pages.

Vzhled pracuje s velkou patkovou typografií, obrysovým nápisem GameFunns, hvězdicovými akcenty a barevnými bloky podle dodané grafické předlohy. Výchozí tmavý lesní motiv a světlá sakura mají vlastní palety i obrazové scény. Písma Fraunces a Poppins jsou lokálně hostovanou vizuální aproximací předlohy.

## Vývoj

Použij Node.js 24 LTS a npm. Z kořene repozitáře spusť `npm ci`, potom `npm run dev`. Produkční verzi sestaví `npm run build` a spustí `npm run preview`.

Při nedostupnosti místního serveru vytvoří `node scripts/create-preview.mjs` po sestavení samostatný soubor `.preview/GameFunns-preview.html`. Obsahuje oba jazyky, motivy, média a fonty ze skutečného produkčního buildu. Otevři ho přímo v prohlížeči. Živé integrace stále potřebují připojení k internetu.

`npm run check` kontroluje Astro a TypeScript, `npm run lint` pravidla zdrojového kódu a `npm test` datové integrace. Pro testy prohlížeče nejdřív spusť `npx playwright install chromium`, potom `npm run test:browser`. Testy používají produkční build.

## Obsah

- `src/components/Portfolio.astro` skládá úvod, zájmy, vybrané projekty a sociální profily.
- `src/data/projects.ts` obsahuje výběr projektů a překlady jejich popisů.
- `src/data/favorites.ts` obsahuje ručně vybrané oblíbené hry. Prázdný seznam sekci skryje.
- `src/data/clips.ts` typuje ověřený přehled Medal; zdroj dat je `src/data/medal.json`. Délka se ručně neodhaduje.
- `src/data/medal.json` je ověřený přehled klipů z vlastního veřejného profilu Medal.
- `src/data/instagram.json` je uložený přehled skutečných Instagram příspěvků s časem aktualizace.
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

Medal galerie používá vlastní veřejný profil `GameFunns98`. `npm run sync:medal` načte odkazy zpřístupněné veřejnou stránkou profilu a ověří autora i identitu každého klipu přes Medal oEmbed. Kontroluje také předem vybraný klip a dosavadní přehled. Zpracuje nejvýše 12 klipů. Úplnost historie závisí na odkazech, které veřejný profil zpřístupní.

Video se načítá až na přání návštěvníka. Přehrávač používá skutečný veřejný MP4 stream a skutečný lokálně uložený náhled. Při výpadku funguje odkaz na původní klip. Při neúspěšné aktualizaci se zachová poslední přehled.

Instagram používá oficiální Instagram API with Instagram Login pro `@vevoda_vaclav`. `npm run sync:instagram` uloží až šest skutečných příspěvků a lokální náhledy. Aktivaci popisuje `INSTAGRAM_SETUP.md`. Přístupový token se vkládá do Actions Secret `INSTAGRAM_ACCESS_TOKEN`. První autorizované načtení již obsahuje šest skutečných příspěvků. Bez secretu se zachová tento datovaný přehled a synchronizace se přeskočí. Po prvním úspěšném připojení se při výpadku zachovají příspěvky s původním časem a označením neúspěšné obnovy.

Workflow **Refresh public profile data** provádí synchronizaci každých šest hodin po přidání do výchozí větve. Vytvoří nový přehled v repozitáři a sestaví kontrolní artefakt. Veřejná publikace patří do samostatně schváleného nasazení.

## Sestavení a publikace

Workflow Portfolio checks provádí typovou kontrolu, lint, testy, produkční build a testy Chromium včetně přístupnosti. Build je dostupný jako artefakt.

Implementace vzniká ve větvi `feature/personal-portfolio`. Publikace na `https://gamefunns98.github.io` čeká na samostatné schválení vlastníka. Pro uživatelský web se používá kořen `/`. Nasazení musí použít složku `dist/` a zdroj GitHub Actions v nastavení Pages.

## Bezpečnost

Klient používá veřejné endpointy a neobsahuje API tokeny. Externí data se vkládají jako text, zdrojová HTML ani SVG z API se do DOM nevkládají. Povoleny jsou jen známé zdroje médií a připojení. Licence MIT kódu se nevztahuje na portrét a převzatá média.
