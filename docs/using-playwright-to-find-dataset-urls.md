# Using Playwright to Find Dataset Download URLs

## Overview

The Portuguese Parliament's open data portal uses dynamic URLs with encoded paths that cannot be easily extracted through static web scraping. This guide documents how to use Playwright (via MCP) to navigate the portal and extract JSON download URLs.

## Prerequisites

1. **Playwright MCP Server configured** in `.mcp.json`:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "cmd",
      "args": ["/c", "npx", "@playwright/mcp@latest"]
    }
  }
}
```

2. **Claude Code** with Playwright MCP tools available

## The Problem

Dataset URLs on https://www.parlamento.pt have this structure:
```
https://app.parlamento.pt/webutils/docs/doc.txt?path=<ENCODED_PATH>&fich=<FILENAME>&Inline=true
```

Where:
- `<ENCODED_PATH>`: Long Base64-encoded path parameter that changes per dataset
- `<FILENAME>`: Dataset filename (e.g., `IniciativasXVII_json.txt`)

These URLs are **not exposed in page source** and require interactive navigation to discover.

## Solution: Using Playwright MCP

### Step 1: Navigate to the Dataset Category Page

Start from the main open data page or navigate directly to the category:

```javascript
// Navigate to main open data page
mcp__playwright__browser_navigate("https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx")

// Or navigate directly to a category (e.g., Cooperação Parlamentar)
mcp__playwright__browser_navigate("https://www.parlamento.pt/Cidadania/Paginas/DACooperacaoParlamentar.aspx")
```

### Step 2: Identify Navigation Elements

Use `mcp__playwright__browser_snapshot` (automatically returned after navigation) to find:
- Folder links for legislatures (e.g., "XVII Legislatura")
- File download links (JSON, XML, PDF)

Look for elements like:
```yaml
- link "XVII Legislatura" [ref=e52] [cursor=pointer]:
  - /url: /Cidadania/Paginas/DA...?t=...&Path=...
```

### Step 3: Click Through to Legislature Folders

```javascript
// Click on the legislature folder
mcp__playwright__browser_click({
  element: "XVII Legislatura folder",
  ref: "e52"  // Reference from snapshot
})
```

### Step 4: Extract JSON Download URLs

Look for JSON file links in the snapshot:
```yaml
- link "IniciativasXVII_json.txt" [ref=e65] [cursor=pointer]:
  - /url: https://app.parlamento.pt/webutils/docs/doc.txt?path=...&fich=IniciativasXVII_json.txt&Inline=true
```

The full URL in the `/url` field is what you need for the download script.

### Step 5: Close Browser When Done

```javascript
mcp__playwright__browser_close()
```

## Common Patterns

### Pattern 1: Main Data Categories

Most datasets follow this navigation path:
1. Open Data homepage → Category "Recursos" link
2. Legislature folder (VI, VII, ..., XVII)
3. JSON file link

**Example categories:**
- Iniciativas: `/Cidadania/Paginas/DAIniciativas.aspx`
- Deputados: `/Cidadania/Paginas/DAatividadeDeputado.aspx`
- Petições: `/Cidadania/Paginas/DAPeticoes.aspx`

### Pattern 2: Special Cases - Multiple Files per Category

Some categories have multiple files:

**Orçamento do Estado:**
- Has yearly files: `OE2026Or_json.txt`, `OE2025Or_json.txt`
- Also includes amendment proposals: `OEPropostasAlteracao2026Or_json.txt`

**Diário da Assembleia:**
- Has multiple series folders (I, II-A, II-B, II-C, etc.)
- Each series contains hundreds of numbered session files
- Generally skipped for data collection due to size/complexity

### Pattern 3: Empty Legislatures

Some datasets may not have data for recent legislatures:
```yaml
- generic: Não foram encontrados documentos nem sub-pastas.
```

This means:
- The legislature is too recent
- No activities of that type have occurred yet
- Data may not be published yet

**Solution:** Navigate to previous legislature (e.g., XVI instead of XVII)

## Example: Finding Orçamento do Estado URL

```javascript
// 1. Navigate to category
mcp__playwright__browser_navigate(
  "https://www.parlamento.pt/Cidadania/Paginas/DAOE.aspx?t=...&Path=..."
)

// 2. Snapshot shows available files
// Look for: OE2026Or_json.txt

// 3. Extract URL from snapshot
// URL: https://app.parlamento.pt/webutils/docs/doc.txt?path=Arq2rveOwHK...&fich=OE2026Or_json.txt&Inline=true
```

## Example: Handling Empty Legislature Folders

```javascript
// 1. Navigate to Cooperação Parlamentar XVII
mcp__playwright__browser_click({element: "XVII Legislatura", ref: "e52"})

// 2. Snapshot shows: "Não foram encontrados documentos nem sub-pastas"

// 3. Go back and try XVI instead
mcp__playwright__browser_navigate_back()
mcp__playwright__browser_click({element: "XVI Legislatura", ref: "e55"})

// 4. Extract URL from XVI data
```

## Dataset URL Collection Checklist

When collecting URLs for a new dataset:

- [ ] Navigate to category page from DadosAbertos.aspx
- [ ] Identify latest legislature folder with data (usually XVII)
- [ ] Click into legislature folder
- [ ] Locate JSON file link (usually ends in `_json.txt`)
- [ ] Extract full URL including `path`, `fich`, and `Inline` parameters
- [ ] Add URL to `scripts/download_datasets.py`
- [ ] Verify filename matches expected pattern (`<DatasetName>XVII_json.txt`)
- [ ] Close browser when done

## Troubleshooting

**Issue:** "No open tabs" error
- **Solution:** Use `mcp__playwright__browser_navigate` first to open a page

**Issue:** Click on wrong element
- **Solution:** Check `ref` ID carefully in snapshot, use descriptive `element` name

**Issue:** Cannot find JSON link
- **Solution:**
  - Check if you're in the right legislature folder
  - Look for both XML and JSON versions (JSON files end with `_json.txt`)
  - Some categories may have multiple files per legislature

**Issue:** Legislature folder is empty
- **Solution:** Navigate to previous legislature (XVI, XV, etc.)

## File Naming Conventions

Expected JSON filenames follow this pattern:
```
<DatasetName><LegislatureNumber>_json.txt
```

Examples:
- `IniciativasXVII_json.txt` (Initiatives for Legislature XVII)
- `DiplomasXVII_json.txt` (Approved laws for Legislature XVII)
- `OE2026Or_json.txt` (State Budget for 2026 - special case with year)
- `AgendaParlamentar_json.txt` (Parliamentary Agenda - no legislature suffix)

## Related Files

- **Download script:** `scripts/download_datasets.py`
- **Dataset relationships:** `docs/dataset-relationships.md`
- **MCP config:** `.mcp.json`
