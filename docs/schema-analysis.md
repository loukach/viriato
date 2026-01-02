# Portuguese Parliament Dataset Schema Analysis

## Overview

Analysis of 17 datasets from the Portuguese Parliament covering Legislature XVII (2024-present).

**Total size:** 45.64 MB
**Total items:** 7,843 records (excluding object-type datasets)

## Dataset Inventory

### Core Legislative Activity
| Dataset | Items | Size | Description |
|---------|-------|------|-------------|
| **IniciativasXVII** | 808 | 17.82 MB | Legislative initiatives (bills, proposals) |
| **DiplomasXVII** | 236 | 0.45 MB | Approved laws and diplomas |
| **RequerimentosXVII** | 1,072 | 2.41 MB | Requests and questions to Government |
| **PeticoesXVII** | 85 | 0.23 MB | Petitions submitted to Parliament |

### Deputy Activity
| Dataset | Items | Size | Description |
|---------|-------|------|-------------|
| **AtividadeDeputadoXVII** | 1,446 | 13.31 MB | Deputy activities (per deputy) |
| **IntervencoesXVII** | 2,133 | 4.40 MB | Deputy interventions in plenary |
| **RegistoBiograficoXVII** | 330 | 0.64 MB | Deputy biographical records |
| **RegistoInteressesXVII** | 1,446 | 0.41 MB | Deputy declarations of interest |

### Parliamentary Structure
| Dataset | Items | Size | Description |
|---------|-------|------|-------------|
| **OrgaoComposicaoXVII** | object | 2.16 MB | Committee and body compositions |
| **InformacaoBaseXVII** | object | 0.53 MB | Base information (legislatures, sessions, groups) |
| **AtividadesXVII** | object | 0.53 MB | General parliamentary activities |

### International Relations
| Dataset | Items | Size | Description |
|---------|-------|------|-------------|
| **DelegacaoEventualXVII** | 35 | 0.02 MB | Ad-hoc parliamentary delegations |
| **DelegacaoPermanenteXVII** | 77 | 0.01 MB | Permanent international delegations |
| **GrupoAmizadeXVII** | 67 | 0.01 MB | Friendship groups with other parliaments |
| **ReunioesVisitasXVII** | 74 | 0.02 MB | Meetings and visits |

### Current Events & Budget
| Dataset | Items | Size | Description |
|---------|-------|------|-------------|
| **AgendaParlamentar** | 34 | 0.13 MB | Upcoming parliamentary agenda |
| **OrcamentoEstado2026** | object | 2.56 MB | State Budget 2026 |

## Key Schema Patterns

### 1. Initiatives (IniciativasXVII)

**Primary Key:** `IniId` (string)

**Key Fields:**
- `IniId`: Initiative ID
- `IniNr`: Initiative number
- `IniTipo`: Type code (P=Proposal, PJ=Project, etc.)
- `IniDescTipo`: Type description
- `IniTitulo`: Title
- `IniLeg`: Legislature (XVII)
- `DataInicioleg`: Start date

**Nested Arrays:**
- `IniAnexos`: Attachments (PDFs)
- `IniEventos`: Events/phases in legislative process
  - `EvtId`: Event ID
  - `OevId`: Activity event ID
  - `CodigoFase`: Phase code
  - `Fase`: Phase name
  - `DataFase`: Phase date

**Relationships:**
- References `ActId` in events (links to activities)
- Contains deputy/group author information
- Links to approved texts via `TextosAprovados`

### 2. Agenda (AgendaParlamentar)

**Primary Key:** `Id` (integer)

**Key Fields:**
- `Id`: Agenda item ID
- `LegDes`: Legislature (XVII)
- `Section`: Category (Comissões, Plenário, etc.)
- `OrgDes`: Organ description (committee name)
- `ReuNumero`: Meeting number
- `EventStartDate`, `EventEndDate`: Date/time

**Relationships:**
- Links to committees via `OrgDes`
- References legislature via `LegDes`

### 3. Deputy Activities (AtividadeDeputadoXVII)

**Primary Key:** Combination of deputy info

**Structure:** Array of deputy records, each containing:
- Deputy identification (name, ID, party)
- Lists of:
  - Initiatives authored
  - Questions asked
  - Interventions made
  - Committee memberships
  - Activities participated in

**Relationships:**
- Links to IniciativasXVII via initiative IDs
- Links to committees
- Links to interventions

### 4. Interventions (IntervencoesXVII)

**Primary Key:** `Id` (needs verification)

**Key Fields:**
- Deputy information
- `Tipo`: Intervention type
- `DataInt`: Intervention date
- `Texto`: Full text of intervention
- Legislative phase information

**Relationships:**
- Links to deputies
- Links to initiatives/diplomas being discussed

### 5. Committees (OrgaoComposicaoXVII)

**Structure:** Object-based (not array)

**Contains:**
- Committee compositions
- Member lists
- Roles and positions

**Relationships:**
- Links to deputies
- Referenced by AgendaParlamentar
- Referenced by initiatives

### 6. Base Information (InformacaoBaseXVII)

**Structure:** Object-based reference data

**Likely contains:**
- Legislatures list
- Legislative sessions
- Parliamentary groups
- Electoral circles
- Deputy directory

**Relationships:**
- Referenced by all other datasets for lookups

## Cross-Dataset Relationships

### Primary Relationship Graph

```
InformacaoBaseXVII (Reference Data)
  ├─> Deputies
  ├─> Parliamentary Groups
  ├─> Legislatures
  └─> Electoral Circles

Deputies (via RegistoBiograficoXVII)
  ├─> AtividadeDeputadoXVII (activities)
  ├─> IntervencoesXVII (speeches)
  ├─> RegistoInteressesXVII (declarations)
  └─> Initiatives (as authors)

Initiatives (IniciativasXVII)
  ├─> Events (IniEventos)
  ├─> Authors (deputies/groups)
  ├─> DiplomasXVII (approved laws)
  └─> AgendaParlamentar (when discussed)

Committees (OrgaoComposicaoXVII)
  ├─> Deputies (members)
  ├─> AgendaParlamentar (meetings)
  └─> Initiatives (committee work)

AgendaParlamentar (Current Events)
  ├─> Committees
  ├─> Initiatives (on agenda)
  └─> Deputies (participants)
```

### Foreign Key Fields

| Source Dataset | Field | Target Dataset | Target Field |
|----------------|-------|----------------|--------------|
| IniciativasXVII | IniId | DiplomasXVII | Initiative reference |
| IniciativasXVII | IniEventos.ActId | AtividadesXVII | Activity ID |
| IntervencoesXVII | Deputy info | RegistoBiograficoXVII | Deputy ID |
| AgendaParlamentar | OrgDes | OrgaoComposicaoXVII | Committee name |
| AtividadeDeputadoXVII | Deputy ID | RegistoBiograficoXVII | Deputy ID |
| All datasets | LegDes/IniLeg | InformacaoBaseXVII | Legislature |

## Data Types and Structures

### Date Formats
- **ISO format:** `YYYY-MM-DD` (IniciativasXVII)
- **Portuguese format:** `DD/MM/YYYY` (AgendaParlamentar)
- **Time format:** `HH:MM:SS`

### ID Formats
- **String IDs:** Most datasets use string IDs (e.g., "315506")
- **Integer IDs:** Some use integers (AgendaParlamentar.Id)
- **Composite keys:** Deputies often identified by combination of fields

### Common Patterns

**Nullable fields:**
- Many fields can be `null`
- Arrays can be empty `[]`
- Objects can be `null` when not applicable

**Nested structures:**
- Events within initiatives
- Attachments as arrays
- Sub-activities within activities

**HTML content:**
- Some text fields contain HTML formatting
- Encoded entities (e.g., `&lt;`, `&amp;`)

## Schema Peculiarities

### Object-Type Datasets
Some datasets are objects rather than arrays:
- `InformacaoBaseXVII`
- `OrgaoComposicaoXVII`
- `AtividadesXVII`
- `OrcamentoEstado2026`

These are **reference/lookup datasets** with complex nested structures.

### Missing Data
Some datasets have no items for Legislature XVII yet:
- Cooperação Parlamentar (international cooperation)

This is expected for new legislatures with limited activity.

### Multiple Legislature Coverage
- Most datasets: Legislature XVII only
- Some may span multiple legislatures (needs verification)

## Recommendations for Webapp

### Essential Relationships to Implement

1. **Deputy → Activities**
   - Navigate from deputy profile to all their activities
   - Link: RegistoBiograficoXVII → AtividadeDeputadoXVII

2. **Initiative → Events → Agenda**
   - Track initiative lifecycle
   - Link: IniciativasXVII → IniEventos → AgendaParlamentar

3. **Committee → Deputies → Meetings**
   - Show committee composition and schedule
   - Link: OrgaoComposicaoXVII → Deputies → AgendaParlamentar

4. **Deputy → Interventions**
   - Display all speeches by a deputy
   - Link: RegistoBiograficoXVII → IntervencoesXVII

### Data Processing Priorities

**Phase 1: Core entities**
- Deputies (RegistoBiograficoXVII)
- Initiatives (IniciativasXVII)
- Committees (OrgaoComposicaoXVII)

**Phase 2: Activities**
- Deputy activities (AtividadeDeputadoXVII)
- Interventions (IntervencoesXVII)
- Agenda (AgendaParlamentar)

**Phase 3: Supplementary**
- Questions/petitions
- International relations
- State Budget

### Denormalization Opportunities

For better webapp performance, consider pre-computing:
- Deputy initiative counts
- Committee activity summaries
- Initiative status rollups
- Most active deputies by metric

## Next Steps

1. **Extract detailed schemas** for object-type datasets
2. **Validate foreign keys** by sampling actual data
3. **Build relationship graph** with actual ID matching
4. **Create normalized database** schema or GraphQL types
5. **Design API** for webapp queries

## Files Generated

- Individual schemas: `data/schemas/*_schema.json`
- Combined schemas: `data/schemas/all_schemas.json`
- This analysis: `docs/schema-analysis.md`
