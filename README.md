# Text Scrubber

Text Scrubber je jednoduchá webová aplikace (napsaná v TypeScriptu s využitím Vite), která slouží k čištění zkopírovaného formátovaného textu (např. z MS Word nebo Google Docs) do čistého HTML formátu. Tento čistý formát je ideální pro další vložení do WYSIWYG editorů, jako je například TinyMCE.

## Funkce

V aplikaci můžete jednoduše nastavit, které prvky a styly chcete v textu zachovat a které se mají automaticky vyčistit. Podporované přepínače pro zachování prvků:
- **Tučné** (Bold)
- **Kurzíva** (Italic)
- **Odkazy** (Links)
- **Seznamy** (Lists)
- **Detekce seznamů** (Pokusí se automaticky detekovat odrážky vložené jako běžný text a převede je na správné HTML seznamy `<ul><li>`)
- **Nadpisy** (Headings)
- **Tabulky** (Tables)
- **Barvy** (Colors)
- **Fonty** (Fonts)
- **Zarovnání** (Alignment)

Jakékoli inline styly, prázdné tagy (`<span>`, `<b>`) a specifické formátovací prvky MS Word (`o:p`) jsou automaticky odstraněny pro zajištění maximálně čistého výstupu.

## Jak to funguje

1. V levém panelu (Vstup) si vyberte, které styly chcete zachovat.
2. Vložte zkopírovaný text do textového pole (Ctrl+V / Cmd+V).
3. Aplikace text okamžitě zpracuje a vyčistí.
4. V pravém panelu (Výstup) si můžete vyčištěný výsledek jedním kliknutím zkopírovat zpět do schránky (kopíruje se jako formátovaný Rich Text i jako čistý text pro maximální kompatibilitu).

## Lokální vývoj

Projekt využívá [Vite](https://vitejs.dev/).

### Instalace závislostí
```bash
npm install
```

### Spuštění vývojového serveru
```bash
npm run dev
```

### Sestavení pro produkci
```bash
npm run build
```

## Nasazení na GitHub Pages

Projekt je připravený pro nasazení přes balíček `gh-pages` a skript `npm run deploy`.

### První nasazení

1. Ověřte, že v `package.json` je správně vyplněná hodnota `homepage`:
 - `https://UZIVATEL.github.io/REPOZITAR`
2. Nainstalujte závislosti:

```bash
npm install
```

1. Spusťte nasazení:

```bash
npm run deploy
```

Skript provede build a publikuje obsah složky `dist` do větve `gh-pages`.

### Nastavení GitHub Pages v repozitáři

1. Otevřete repozitář na GitHubu.
2. Přejděte do **Settings -> Pages**.
3. Jako zdroj zvolte **Deploy from a branch**.
4. Vyberte větev **gh-pages** a složku **/(root)**.
5. Uložte změny.

### Další nasazení

Pro každou další aktualizaci stačí:

```bash
npm run deploy
```
