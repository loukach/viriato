# Test Download: 2 Datasets

## Test Datasets

### 1. Iniciativas (Legislative Initiatives) - PRIORITY
**Why**: Referenced heavily in Agenda data, core to understanding what's being decided

**Steps to download**:
1. Go to: https://www.parlamento.pt/Cidadania/Paginas/DAIniciativas.aspx
2. Look for the XVII Legislature folder/link
3. Find and download: `IniciativasXVII_json.txt`
4. Save to: `data/raw/IniciativasXVII_json.txt`

### 2. Informação Base (Base Information) - FOUNDATION
**Why**: Contains foundational data (parties, legislatures, districts) needed to understand other datasets

**Steps to download**:
1. Go to: https://www.parlamento.pt/Cidadania/Paginas/DAInformacaoBase.aspx
2. Look for the XVII Legislature folder/link
3. Find and download: `InformacaoBaseXVII_json.txt` (or similar name)
4. Save to: `data/raw/InformacaoBaseXVII_json.txt`

## After Download

Once you have both files in `data/raw/`, let me know and I'll:
1. Verify the JSON structure
2. Extract schemas
3. Test cross-referencing with existing Agenda data
4. Confirm the approach works before downloading all 18 datasets

## Expected File Structure

```
data/
├── samples/
│   └── AgendaParlamentar.xml  (existing)
└── raw/
    ├── IniciativasXVII_json.txt
    └── InformacaoBaseXVII_json.txt
```
