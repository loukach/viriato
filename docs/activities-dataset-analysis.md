# Activities Dataset Analysis

**Investigation Date:** 2026-01-06
**Status:** Hypothesis Invalidated
**Question:** Can the Activities dataset bridge Agenda → Initiatives?

## Executive Summary

**Hypothesis:** The Activities dataset (`AtividadesXVII`) might link Agenda events to Initiatives via ActId or other identifiers.

**Result:** ❌ **INVALIDATED** - Activities does NOT bridge Agenda ↔ Initiatives.

**Key Finding:** The Activities dataset serves a different purpose - it tracks voting records, debates, hearings, and general parliamentary activities. It is NOT a calendar/scheduling system and does not link to agenda items.

## Investigation Details

### ID Ranges Analyzed

| Dataset | Field | ID Range | Example IDs | Purpose |
|---------|-------|----------|-------------|---------|
| **Agenda** | `Id` | 42xxx - 43xxx | 42593, 42725, 42730, 42734 | Calendar event identifier |
| **Initiatives (Events)** | `EvtId` | 1 - 200 | 1, 2, 3, 51, 126 | Sequential event within initiative |
| **Initiatives (Events)** | `OevId` | 162xxxx | 1627219, 1642062 | Global event identifier |
| **Initiatives (Events)** | `ActId` | 61xxx | 61082, 61117, 61374, 61384 | Activity reference (null in many cases) |
| **Activities (Hearings)** | `IDAudicao` | 159xxx | 159609, 159600, 159599 | Hearing identifier |
| **Activities (Audiences)** | `IDAudiencia` | 117xxx | 117597, 117504, 117586 | Audience identifier |
| **Activities (Debates)** | `DebateId` | 147xxx | 147416, 147443, 147436 | Debate identifier |
| **Activities (Events)** | `IDEvento` | 116xxx | 116679, 116678 | General event identifier |
| **Activities (Deslocacoes)** | `IDDeslocacao` | 137xxx | 137448, 137458, 137450 | Travel/delegation identifier |

### What We Searched For

```python
# Tested ActIds from initiatives
actids_to_find = ['61082', '61091', '61100', '61117', '61126']
# Result: NONE found in Activities

# Tested Agenda IDs
agenda_ids = ['42593', '42725', '42730', '42734']
# Result: One false positive (42593 was a page ID, not agenda ID)
```

### False Positive Explained

The number "42593" appeared in Activities, but it was **NOT** the agenda event ID:
```json
{
  "idPag": "42593",  // This is a PUBLICATION PAGE ID, not agenda ID
  "URLDiario": "https://debates.parlamento.pt/..."
}
```

This was found in the publication metadata of a vote, not as a reference to an agenda item.

## Activities Dataset Structure

### AtividadesGerais (General Activities)
**Count:** 311 items
**Purpose:** Parliamentary votes, government programs, project votes

**Key Fields:**
- `Assunto` - Subject/description
- `Tipo` - Activity type (PRG, VOT, etc.)
- `DescTipo` - Type description
- `DataAgendamentoDebate` - Debate scheduling date (potential link?)
- `DataEntrada` - Entry date
- `Legislatura` - Legislature (e.g., "XVII")
- `Sessao` - Session number
- `Numero` - Activity number (null for many items)
- `VotacaoDebate` - Voting details (when applicable)
  - `id` - Vote ID
  - `data` - Vote date
  - `resultado` - Result
  - `reuniao` - Meeting number

**Critical Finding:** No unique ID field at the activity level. Activities are identified by combination of `Tipo`, `Numero`, and `Legislatura`.

### Relatorios (Reports)
**Count:** 13 items
**Purpose:** External reports submitted to parliament

**Example:** "Relatório CASA 2024 - Caracterização Anual da Situação de Acolhimento das Crianças e Jovens"

### Audicoes (Hearings)
**Count:** 198 items
**Purpose:** Official hearings of government officials and entities

**Key Fields:**
- `IDAudicao` - Unique hearing ID
- `NumeroAudicao` - Hearing number (e.g., "10-CREPL-XVII")
- `Data` - Hearing date
- `Assunto` - Subject (often references initiatives)
- `Entidades` - Entities being heard

**Sample Data (Jan 6, 2026):**
```json
{
  "IDAudicao": 159667,
  "NumeroAudicao": "7-CCCJD-XVII",
  "Data": "2026-01-06",
  "Assunto": "Audição... do Conselho Geral Independente da Rádio e Televisão de Portugal",
  "Entidades": "Conselho Geral Independente da Rádio e Televisão de Portugal, S.A."
}
```

**Potential for linking:** Hearings contain `Assunto` field with text that may reference initiatives (e.g., "Proposta de Lei n.º 37/XVII").

### Audiencias (Audiences)
**Count:** 89 items
**Purpose:** Requested audiences with parliament

**Key Fields:**
- `IDAudiencia` - Unique audience ID
- `NumeroAudiencia` - Audience number
- `Data` - Audience date
- `Concedida` - Whether granted
- `Entidades` - Requesting entities

### Debates
**Count:** 41 items
**Purpose:** Debate records

**Key Fields:**
- `DebateId` - Unique debate ID (string)
- `TipoDebate` - Debate type code
- `TipoDebateDesig` - Debate type description
- `DataDebate` - Debate date
- `Intervencoes` - Array of intervention IDs

### Deslocacoes (Travel/Delegations)
**Count:** 87 items
**Purpose:** Parliamentary delegations and travel

**Key Fields:**
- `IDDeslocacao` - Unique ID
- `DataIni` / `DataFim` - Start/end dates
- `Designacao` - Designation/purpose
- `LocalEvento` - Event location

### Eventos (Events)
**Count:** 2 items
**Purpose:** General parliamentary events (ceremonies, etc.)

**Key Fields:**
- `IDEvento` - Unique event ID
- `Data` - Event date
- `TipoEvento` - Event type
- `Designacao` - Event name

### OrcamentoContasGerencia (Budget/Accounts)
**Count:** 1 item
**Purpose:** Parliament's own budget and accounts

## Relationships Found

### Within Activities Dataset

```
AtividadesGerais
  └─> VotacaoDebate
       └─> Publicacao (Publication references)

Audicoes
  └─> (Text references to initiatives in Assunto field)

Debates
  └─> Intervencoes (Intervention IDs)
       └─> Links to IntervencoesXVII dataset
```

### NO Direct Links Found To:
- ❌ Agenda events (AgendaParlamentar)
- ❌ Initiative events via ActId
- ❌ Any calendar-based scheduling system

## Why Activities Don't Link to Agenda

The Activities dataset serves these purposes:

1. **Record Keeping** - Official record of what happened
2. **Voting Records** - Track parliamentary votes and results
3. **Debate Transcription** - Link to intervention records
4. **External Relations** - Track hearings, audiences, delegations

The **Agenda** serves a different purpose:
1. **Forward-Looking** - Upcoming events
2. **Scheduling** - When and where meetings occur
3. **Meeting Agendas** - What will be discussed

These are fundamentally different temporal perspectives:
- **Agenda** = Future (scheduled events)
- **Activities** = Past (completed events)

## Potential Indirect Links

### 1. Date + Meeting Number Matching

**Agenda:**
```json
{
  "Id": 42593,
  "Title": "Plenário",
  "EventStartDate": "07/01/2026",
  "ReuNumero": 43
}
```

**Activities:**
```json
{
  "DataAgendamentoDebate": "2025-06-27",
  "reuniao": "6"
}
```

Could potentially match:
```sql
SELECT * FROM agenda_events ae
JOIN activities a ON
  ae.start_date = a.data_agendamento_debate AND
  ae.meeting_number = a.reuniao
```

**Limitation:** Many activities don't have meeting numbers.

### 2. Text-Based Initiative References

**Hearings (Audicoes)** often reference initiatives in their `Assunto` field:

```
"Assunto": "No âmbito da apreciação, na especialidade, da Proposta de Lei n.º 37/XVII/1.ª (GOV)..."
```

Could extract via regex:
```python
import re
pattern = r'(Proposta de Lei|Projeto de (?:Lei|Resolução)) n\.º (\d+)/XVII'
matches = re.findall(pattern, assunto)
```

**Limitation:** Not standardized, requires parsing.

## Recommendations for Linking Agenda → Initiatives

Based on this investigation, use a **multi-strategy approach**:

### Strategy 1: HTML Parsing (Primary)
**Coverage:** ~30-40% of agenda items
**Reliability:** High (direct BID references)

```python
import re

def extract_initiative_ids(html_description):
    """Extract BID references from agenda InternetText"""
    pattern = r'BID=(\d+)'
    return re.findall(pattern, html_description)
```

### Strategy 2: Committee + Date Matching (Secondary)
**Coverage:** Committee meetings without BID links
**Reliability:** Medium (may have false positives)

```sql
-- Match agenda to initiatives via committee and date
SELECT
    ae.id AS agenda_id,
    i.ini_id,
    ie.phase_name
FROM agenda_events ae
JOIN iniciativa_events ie ON
    ae.committee = ie.committee_name AND
    ae.start_date BETWEEN ie.event_date - INTERVAL '7 days'
                      AND ie.event_date + INTERVAL '7 days'
JOIN iniciativas i ON ie.iniciativa_id = i.id
WHERE ae.committee IS NOT NULL
  AND ie.phase_code IN ('126', '181')  -- Committee phases
```

### Strategy 3: Text Pattern Matching (Tertiary)
**Coverage:** Activities/hearings that reference initiatives
**Reliability:** Medium (requires NLP/regex)

```python
def extract_initiative_references(text):
    """Extract initiative references from Portuguese text"""
    patterns = {
        'proj_lei': r'Projeto de Lei n\.º (\d+)/XVII',
        'proj_res': r'Projeto de Resolução n\.º (\d+)/XVII',
        'prop_lei': r'Proposta de Lei n\.º (\d+)/XVII',
    }

    references = {}
    for key, pattern in patterns.items():
        matches = re.findall(pattern, text)
        if matches:
            references[key] = matches
    return references
```

### Strategy 4: Accept Gaps (Realistic)
**Coverage:** N/A
**Reliability:** High (factual)

Many agenda items will NOT link to initiatives:
- School visits
- Administrative meetings
- Ceremonial events
- External delegations
- General hearings (not about specific initiatives)

## Database Implementation

### Proposed Junction Table

```sql
CREATE TABLE agenda_initiative_links (
    id SERIAL PRIMARY KEY,
    agenda_event_id INTEGER REFERENCES agenda_events(id),
    iniciativa_id INTEGER REFERENCES iniciativas(id),
    link_type VARCHAR(50),  -- 'bid_direct', 'committee_date', 'text_reference'
    link_confidence DECIMAL(3,2),  -- 0.00 to 1.00
    extracted_text TEXT,  -- Evidence for the link
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agenda_ini_links_agenda ON agenda_initiative_links(agenda_event_id);
CREATE INDEX idx_agenda_ini_links_ini ON agenda_initiative_links(iniciativa_id);
CREATE INDEX idx_agenda_ini_links_type ON agenda_initiative_links(link_type);
```

### Population Script Priorities

1. **High Priority:** Parse BID from agenda HTML
2. **Medium Priority:** Match committee + date for phases 126, 181
3. **Low Priority:** Text extraction from hearings
4. **Accept:** ~40-50% of agenda items won't link to any initiative

## Future Dataset Relationship Mapping

This investigation is part of a larger effort to map all datasets. Key learnings:

### Investigation Template

For each dataset pair, document:
1. **ID ranges** - Do they overlap?
2. **Common fields** - Date, legislature, committee, etc.
3. **Direct links** - Foreign key relationships
4. **Indirect links** - Text references, date matching
5. **No links** - Different domains/purposes

### Next Datasets to Investigate

Priority order for relationship mapping:

1. **Iniciativas ↔ Diplomas Aprovados** (approved laws)
   - Expected: Direct link via IniId
   - Confidence: High

2. **Agenda ↔ Committees (OrgaoComposicaoXVII)**
   - Expected: Link via committee name
   - Confidence: High

3. **Initiatives ↔ Deputies (RegistoBiograficoXVII)**
   - Expected: Link via author information
   - Confidence: Medium (complex structure)

4. **Activities ↔ Interventions (IntervencoesXVII)**
   - Expected: Link via Debates.Intervencoes array
   - Confidence: High

5. **Initiatives ↔ Petitions (PeticoesXVII)**
   - Expected: Text references or joint initiatives
   - Confidence: Low

## Appendix: Search Methodology

### ActId Search
```python
# Searched for known ActIds from initiatives
actids = ['61082', '61091', '61100', '61117', '61126']

with open('data/raw/AtividadesXVII_json.txt', 'r') as f:
    content = f.read()

for actid in actids:
    if actid in content:
        print(f'Found: {actid}')
    # Result: NONE found
```

### Agenda ID Search
```python
# Searched for agenda event IDs
agenda_ids = ['42593', '42725', '42730', '42734']

for aid in agenda_ids:
    if aid in content:
        print(f'Found: {aid}')
        # Only 42593 found, but as a PAGE ID, not agenda ID
```

### Structure Analysis
```python
# Examined all top-level sections
import json

with open('data/raw/AtividadesXVII_json.txt') as f:
    data = json.load(f)

for section, content in data.items():
    if isinstance(content, dict):
        print(f'{section}:')
        for subsection in content:
            print(f'  {subsection}: {len(content[subsection])} items')
```

**Result:**
```
AtividadesGerais:
  Atividades: 311 items
  Relatorios: 13 items
Audicoes: 198 items
Audiencias: 89 items
Debates: 41 items
Deslocacoes: 87 items
Eventos: 2 items
OrcamentoContasGerencia: 1 item
```

## Conclusion

The Activities dataset is valuable for:
- ✅ Tracking what happened (voting records, debates)
- ✅ Linking debates to interventions
- ✅ Recording hearings and audiences
- ✅ External relations tracking

But it does NOT:
- ❌ Link agenda items to initiatives
- ❌ Serve as a calendar/scheduling system
- ❌ Bridge the gap between planned and completed events

**For agenda-to-initiative linking, we must rely on:**
1. HTML BID parsing (direct links)
2. Committee + date heuristics (indirect links)
3. Accept that many agenda items are independent of initiatives

---

**Next Steps:**
1. Implement HTML BID parsing in database load script
2. Create agenda_initiative_links junction table
3. Continue mapping other dataset relationships
4. Build comprehensive relationship diagram for all 17 datasets
