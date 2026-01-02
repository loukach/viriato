# Viriato

Exploring Portuguese Parliament open data to prototype civic engagement tools.

## Goals

- Map parliamentary open data sources
- Prototype features to help citizens:
  - View Parliament's agenda
  - Understand when to influence elected deputies
  - Audit deputies' contributions vs their promises

## Project Status

**Phase**: Data Discovery
Currently mapping available datasets from [parlamento.pt open data portal](https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx).

## Inspiration

Based on ideas from [adamastor](https://github.com/bcamarneiro/adamastor).

## Structure

```
viriato/
├── .mcp.json                 # MCP server configuration (Playwright)
├── data/
│   ├── raw/                  # Downloaded JSON datasets (45.6 MB, 17 files)
│   ├── schemas/              # Extracted dataset schemas (18 files)
│   ├── samples/              # Sample XML files for reference
│   ├── manifest.json         # Download metadata
│   └── Definicao da estrutura dos ficheiros.pdf
├── docs/                     # Documentation (5 markdown files)
│   ├── discovery-notes.md
│   ├── dataset-relationships.md
│   ├── schema-analysis.md
│   ├── agenda-parlamentar.md
│   └── using-playwright-to-find-dataset-urls.md
└── scripts/                  # Data utilities
    ├── download_datasets.py  # Automated dataset downloader
    └── extract_schemas.py    # Schema extraction tool
```

## Approach

Building in small, high-confidence steps. No code until we understand what data exists and what's actually useful.
