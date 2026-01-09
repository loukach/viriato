# Viriato Data Dictionary

> Consolidated reference mapping raw Parliament data to database tables, including extraction strategies and ID matching.

**Last Updated:** 2026-01-09

---

## Quick Reference

### Data Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RAW DATA FILES                                  │
│  data/raw/*.json                                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LOADER SCRIPTS                                  │
│  scripts/load_*.py                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL TABLES                               │
│  9 tables in Render database                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Current Status

| Raw File | Loader | DB Table | Status |
|----------|--------|----------|--------|
| IniciativasXX_json.txt | load_to_postgres.py | iniciativas, iniciativa_events | **Loaded** (XVII) |
| IniciativasXX_json.txt | load_committee_links.py | iniciativa_comissao, iniciativa_conjunta | **Loaded** (XVII) |
| IniciativasXX_json.txt | load_authors.py | iniciativa_autores | **Loaded** (XVII) |
| OrgaoComposicaoXX_json.txt | load_orgaos.py | orgaos, orgao_membros | **Loaded** (XVII) |
| AgendaParlamentar_json.txt | load_to_postgres.py | agenda_events | **Loaded** |
| - | - | agenda_initiative_links | Not implemented |

---

## 1. Initiatives (Iniciativas)

### Source File
`data/raw/IniciativasXX_json.txt` (XX = legislature: XIV, XV, XVI, XVII)

### Loader Script
`scripts/load_to_postgres.py`

### Database Tables

#### Table: `iniciativas`
| DB Column | JSON Field | Type | Description |
|-----------|------------|------|-------------|
| id | (auto) | SERIAL | Database primary key |
| ini_id | IniId | VARCHAR(20) | **Primary key from API** |
| legislature | (from filename) | VARCHAR(10) | "XIV", "XV", "XVI", "XVII" |
| number | IniNr | VARCHAR(10) | Initiative number |
| type | IniTipo | VARCHAR(10) | P, R, J, D, etc. |
| type_description | IniDescTipo | VARCHAR(100) | "Proposta de Lei", etc. |
| title | IniTitulo | TEXT | Initiative title |
| author_type | (derived) | VARCHAR(50) | "Government", "Deputy Group", etc. |
| author_name | (derived) | VARCHAR(200) | Extracted author name |
| start_date | DataInicioleg | DATE | Legislature start date |
| end_date | DataFimleg | DATE | Legislature end date |
| current_status | (trigger) | VARCHAR(100) | Latest phase name |
| current_phase_code | (trigger) | VARCHAR(10) | Latest phase code |
| is_completed | (trigger) | BOOLEAN | True if final state reached |
| text_link | IniLinkTexto | TEXT | PDF link |
| raw_data | (full object) | JSONB | Complete JSON for future extraction |

#### Table: `iniciativa_events`
| DB Column | JSON Field | Type | Description |
|-----------|------------|------|-------------|
| id | (auto) | SERIAL | Database primary key |
| iniciativa_id | (FK) | INTEGER | Links to iniciativas.id |
| evt_id | IniEventos[].EvtId | VARCHAR(20) | Event ID |
| oev_id | IniEventos[].OevId | VARCHAR(20) | Sub-event ID |
| phase_code | IniEventos[].CodigoFase | VARCHAR(10) | Phase code (10, 20, 180...) |
| phase_name | IniEventos[].Fase | VARCHAR(200) | Phase description |
| event_date | IniEventos[].DataFase | DATE | Event date |
| committee | (derived) | VARCHAR(200) | Committee name if applicable |
| observations | IniEventos[].ObsFase | TEXT | Observations |
| order_index | (computed) | INTEGER | Event sequence (0, 1, 2...) |
| raw_data | IniEventos[] | JSONB | Full event JSON with nested data |

### Key JSON Structures

```json
{
  "IniId": "315506",
  "IniNr": "28",
  "IniTipo": "P",
  "IniDescTipo": "Proposta de Lei",
  "IniTitulo": "Aprova a Lei do Orçamento do Estado para 2026",
  "DataInicioleg": "2025-03-26",
  "IniAutorGruposParlamentares": [{"GP": "PS"}],
  "IniAutorDeputados": [{"idCadastro": "6864", "nome": "...", "GP": "PAN"}],
  "IniAutorOutros": {"sigla": "V", "nome": "Governo"},
  "IniEventos": [{
    "CodigoFase": "180",
    "Fase": "Baixa comissão distribuição inicial generalidade",
    "DataFase": "2025-03-26",
    "Comissao": [{...}],
    "IniciativasConjuntas": [{...}]
  }]
}
```

---

## 2. Committee-Initiative Links

### Source File
Same as above: `IniciativasXX_json.txt`

### Loader Script
`scripts/load_committee_links.py`

### Database Tables

#### Table: `iniciativa_comissao`
| DB Column | JSON Path | Type | Match Strategy |
|-----------|-----------|------|----------------|
| iniciativa_id | (FK) | INTEGER | Via IniId lookup |
| orgao_id | Comissao[].IdComissao | INTEGER | **Direct ID match** (100%) |
| committee_name | Comissao[].Nome | VARCHAR(200) | Trimmed string |
| committee_api_id | Comissao[].IdComissao | VARCHAR(20) | API committee ID |
| link_type | Comissao[].Competente | VARCHAR(20) | S=lead, N=secondary |
| phase_code | IniEventos[].CodigoFase | VARCHAR(10) | 180, 181, 240, 270, 348 |
| phase_name | IniEventos[].Fase | VARCHAR(200) | Phase description |
| distribution_date | Comissao[].DataDistribuicao | DATE | When distributed |
| event_date | IniEventos[].DataFase | DATE | Phase date |
| has_rapporteur | Comissao[].Relatores | BOOLEAN | Has assigned rapporteur |
| has_vote | Comissao[].Votacao | BOOLEAN | Committee voted |
| vote_result | Votacao[].resultado | VARCHAR(50) | Aprovado, Rejeitado |
| vote_date | Votacao[].data | DATE | Vote date |
| has_documents | Comissao[].Documentos | BOOLEAN | Has documents |
| document_count | (count) | INTEGER | Number of documents |
| raw_data | Comissao[] | JSONB | Full committee object |

**Link Types:**
- `lead` - Competente = "S" (primary reviewer)
- `secondary` - Competente = "N" (opinion only)
- `author` - IniAutorOutros.sigla = "C" (committee authored - rare)

**Phase Codes:**
| Code | Name | Purpose |
|------|------|---------|
| 180 | Baixa comissão distribuição inicial | Initial assignment |
| 181 | Baixa comissão para discussão | Committee discussion |
| 240 | Nova apreciação comissão generalidade | Re-evaluation |
| 270 | Baixa comissão especialidade | Detailed review |
| 348 | Envio à Comissão para fixação da Redação final | Final text |

#### Table: `iniciativa_conjunta`
| DB Column | JSON Path | Type | Description |
|-----------|-----------|------|-------------|
| iniciativa_id | (FK) | INTEGER | Source initiative |
| related_ini_id | IniciativasConjuntas[].id | VARCHAR(20) | Related IniId |
| related_ini_nr | IniciativasConjuntas[].nr | VARCHAR(20) | Initiative number |
| related_ini_leg | IniciativasConjuntas[].leg | VARCHAR(10) | Legislature |
| related_ini_tipo | IniciativasConjuntas[].tipo | VARCHAR(10) | Type code |
| related_ini_desc_tipo | IniciativasConjuntas[].descTipo | VARCHAR(100) | Type description |
| related_ini_titulo | IniciativasConjuntas[].titulo | TEXT | Initiative title |
| phase_code | IniEventos[].CodigoFase | VARCHAR(10) | When joint processing occurred |

### ID Matching Strategy

```
JSON: "IdComissao": "8455"
         ↓
         Direct match
         ↓
DB:   orgaos.org_id = 8455
         ↓
FK:   iniciativa_comissao.orgao_id = orgaos.id
```

**Match Rate:** 100% for lead/secondary assignments

---

## 3. Initiative Authorship

### Source File
Same: `IniciativasXX_json.txt`

### Loader Script
`scripts/load_authors.py`

### Database Table

#### Table: `iniciativa_autores`
| DB Column | JSON Path | Type | Match Strategy |
|-----------|-----------|------|----------------|
| iniciativa_id | (FK) | INTEGER | Via IniId lookup |
| author_type | (derived) | VARCHAR(20) | See mapping below |
| dep_cad_id | IniAutorDeputados[].idCadastro | INTEGER | **ID match** (100%) |
| deputy_name | IniAutorDeputados[].nome | VARCHAR(200) | Display name |
| party | IniAutorDeputados[].GP or GP | VARCHAR(20) | Party at authorship |
| orgao_id | (via name match) | INTEGER | For committee authors |
| entity_name | IniAutorOutros.nome | VARCHAR(200) | Entity name |
| entity_code | IniAutorOutros.sigla | VARCHAR(10) | Entity code |

### Author Type Mapping

| Source | Sigla | author_type | Match Strategy |
|--------|-------|-------------|----------------|
| IniAutorDeputados[] | - | `deputy` | idCadastro → dep_cad_id (100%) |
| IniAutorGruposParlamentares[] | - | `group` | Party acronym stored |
| IniAutorOutros | V | `government` | Fixed entity |
| IniAutorOutros | C | `committee` | Name → orgaos (100%) |
| IniAutorOutros | R | `parliament` | PAR |
| IniAutorOutros | M | `regional` | Madeira Assembly |
| IniAutorOutros | A | `regional` | Azores Assembly |
| IniAutorOutros | Z | `citizen` | Citizens |
| IniAutorOutros | G | (skip) | Duplicates group array |
| IniAutorOutros | D | (skip) | Duplicates deputy array |

### ID Matching Strategy

```
JSON: "idCadastro": "6864"
         ↓
         Direct match
         ↓
DB:   orgao_membros.dep_cad_id = 6864
```

**Match Rate:** 100% for deputy authors

---

## 4. Parliamentary Bodies (Orgaos)

### Source File
`data/raw/OrgaoComposicaoXX_json.txt`

### Loader Script
`scripts/load_orgaos.py`

### Database Tables

#### Table: `orgaos`
| DB Column | JSON Field | Type | Description |
|-----------|------------|------|-------------|
| id | (auto) | SERIAL | Database primary key |
| org_id | idOrgao | INTEGER | **API ID - used for matching** |
| legislature | (from filename) | VARCHAR(10) | "XVII" |
| name | nomeSigla | VARCHAR(300) | Full committee name |
| acronym | siglaOrgao | VARCHAR(50) | Abbreviation (CACDLG) |
| org_type | (derived) | VARCHAR(50) | comissao, grupo_trabalho, etc. |
| number | numeroOrgao | INTEGER | Committee number |
| raw_data | (full object) | JSONB | Complete JSON |

#### Table: `orgao_membros`
| DB Column | JSON Field | Type | Description |
|-----------|------------|------|-------------|
| id | (auto) | SERIAL | Database primary key |
| orgao_id | (FK) | INTEGER | Links to orgaos.id |
| dep_id | Composicao[].depId | INTEGER | Deputy ID |
| dep_cad_id | Composicao[].depCadId | INTEGER | **Cadastre ID - for author matching** |
| deputy_name | Composicao[].depNomeParlamentar | VARCHAR(200) | Deputy name |
| party | Composicao[].gpSigla | VARCHAR(20) | Party abbreviation |
| role | Composicao[].depCargo | VARCHAR(100) | Presidente, etc. |
| member_type | Composicao[].sioTipMem | VARCHAR(50) | Efetivo, Suplente |
| start_date | (from history) | DATE | Membership start |
| end_date | (from history) | DATE | Membership end |
| raw_data | Composicao[] | JSONB | Full member JSON |

### Key JSON Structure

```json
{
  "idOrgao": 8455,
  "siglaOrgao": "CS",
  "nomeSigla": "Comissão de Saúde",
  "numeroOrgao": 12,
  "Composicao": [{
    "depId": 6921,
    "depCadId": 6921,
    "depNomeParlamentar": "Ana Paula Martins",
    "gpSigla": "PS",
    "depCargo": "Presidente",
    "sioTipMem": "Efetivo"
  }]
}
```

---

## 5. Agenda Events

### Source File
`data/raw/AgendaParlamentar_json.txt`

### Loader Script
`scripts/load_to_postgres.py`

### Database Table

#### Table: `agenda_events`
| DB Column | JSON Field | Type | Description |
|-----------|------------|------|-------------|
| id | (auto) | SERIAL | Database primary key |
| event_id | Id | INTEGER | API event ID |
| legislature | (derived) | VARCHAR(10) | From current session |
| title | Titulo | VARCHAR(500) | Event title |
| subtitle | Subtitulo | VARCHAR(500) | Event subtitle |
| section | Seccao | VARCHAR(200) | Comissões, Plenário, etc. |
| theme | Tema | VARCHAR(200) | Event theme |
| location | Local | VARCHAR(200) | Room location |
| start_date | DataInicio | DATE | Event date |
| start_time | HoraInicio | TIME | Start time |
| end_date | DataFim | DATE | End date |
| end_time | HoraFim | TIME | End time |
| is_all_day | (derived) | BOOLEAN | All-day event |
| description | InternetText | TEXT | HTML content |
| committee | OrgDes | VARCHAR(200) | Committee name |
| meeting_number | ReuNumero | VARCHAR(20) | Meeting number |
| session_number | SelNumero | VARCHAR(20) | Session number |
| raw_data | (full object) | JSONB | Complete JSON |

**Note:** Agenda data only covers next 7-10 days (rolling window)

---

## 6. ID Matching Reference

### Cross-Table ID Relationships

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   iniciativas   │     │     orgaos      │     │  orgao_membros  │
│                 │     │                 │     │                 │
│  id ←───────────┼──┐  │  id ←───────────┼──┐  │  dep_cad_id ────┼──┐
│  ini_id         │  │  │  org_id ←───────┼──┼──│  orgao_id ──────┼──┤
└─────────────────┘  │  └─────────────────┘  │  └─────────────────┘  │
                     │                       │                       │
                     │  ┌─────────────────┐  │                       │
                     │  │iniciativa_comissao│  │                       │
                     │  │                 │  │                       │
                     └──┼─ iniciativa_id  │  │                       │
                        │  orgao_id ──────┼──┘                       │
                        │  committee_api_id = IdComissao = org_id    │
                        └─────────────────┘                          │
                                                                     │
                        ┌─────────────────┐                          │
                        │iniciativa_autores│                          │
                        │                 │                          │
                        │  dep_cad_id ────┼──────────────────────────┘
                        │  = idCadastro from JSON
                        └─────────────────┘
```

### Key ID Fields

| JSON Field | Matches | Match Rate |
|------------|---------|------------|
| IdComissao | orgaos.org_id | 100% |
| idCadastro | orgao_membros.dep_cad_id | 98.7% |
| IniId | iniciativas.ini_id | 100% |
| idOrgao | orgaos.org_id | 100% |

---

## 7. Raw Files Not Yet Processed

| File | Entity | Priority | Notes |
|------|--------|----------|-------|
| RegistoBiograficoXX_json.txt | Deputy biographies | Medium | Links via CadId |
| AtividadeDeputadoXX_json.txt | Deputy activity summaries | Medium | Aggregated stats |
| IntervencoesXX_json.txt | Plenary speeches | Low | 2,133 records |
| RequerimentosXX_json.txt | Written questions | Low | 1,072 records |
| PeticoesXX_json.txt | Citizen petitions | Low | 85 records |
| DiplomasXX_json.txt | Published laws | Medium | Links to initiatives |
| AtividadesXX_json.txt | Activities | Low | Similar to agenda |
| InformacaoBaseXX_json.txt | Base info | Low | Reference data |

---

## 8. Loader Scripts Reference

| Script | Input | Output Tables | Run Command |
|--------|-------|---------------|-------------|
| load_to_postgres.py | Iniciativas, Agenda | iniciativas, iniciativa_events, agenda_events | `python scripts/load_to_postgres.py` |
| load_orgaos.py | OrgaoComposicao | orgaos, orgao_membros | `python scripts/load_orgaos.py` |
| load_committee_links.py | Iniciativas | iniciativa_comissao, iniciativa_conjunta | `python scripts/load_committee_links.py` |
| load_authors.py | Iniciativas | iniciativa_autores | `python scripts/load_authors.py` |
| apply_schema.py | schema.sql | (creates tables) | `python scripts/apply_schema.py` |

### Load Order

```bash
# 1. Create/update schema
python scripts/apply_schema.py

# 2. Load base data
python scripts/load_orgaos.py          # Committees first (for FK)
python scripts/load_to_postgres.py     # Initiatives and events

# 3. Load relationships (requires initiatives and orgaos)
python scripts/load_committee_links.py
python scripts/load_authors.py
```

---

## 9. Data Quality Notes

1. **Committee names have trailing spaces** - Always trim
2. **IdComissao changes between legislatures** - Same committee, different IDs
3. **Some deputies not in orgao_membros** - 3 out of 235 author IDs (98.7% match)
4. **Agenda only covers 7-10 days** - Rolling window
5. **XVII data is newest** - Most complete, use as primary
6. **Joint initiative IniIds may not exist** - Related initiative might not be in DB

---

## 10. Environment Setup

```bash
# Required environment variable
DATABASE_URL=postgresql://user:pass@host:5432/viriato

# Optional: Load from .env file
pip install python-dotenv
```
