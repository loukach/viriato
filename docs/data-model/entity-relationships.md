# Entity Relationships in Parliament Raw Data

## Overview

This document catalogs ALL relationships between key entities discovered in the raw Parliament API data. Understanding these relationships is crucial for extracting meaningful information from the data.

**Last Updated:** 2026-01-08

---

## Entity Types

| Entity | API Source | DB Table | Primary Key |
|--------|-----------|----------|-------------|
| Initiative | IniciativasXX_json.txt | iniciativas | IniId |
| Committee/Orgao | OrgaoComposicaoXX_json.txt | orgaos | idOrgao |
| Deputy | Within Orgao data | orgao_membros | depId |
| Agenda Event | Agenda API | agenda_events | Id |
| Initiative Event | Within Initiative data | iniciativa_events | EvtId + OevId |

---

## Relationship Map

```
                    ┌─────────────────┐
                    │   INICIATIVA    │
                    │   (Initiative)  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   COMISSAO    │   │ INICIATIVA    │   │   AGENDA      │
│  (Committee)  │   │  CONJUNTA     │   │   EVENT       │
│               │   │ (Joint Init)  │   │               │
└───────┬───────┘   └───────────────┘   └───────────────┘
        │
        ▼
┌───────────────┐
│   DEPUTADO    │
│   (Deputy)    │
└───────────────┘
```

---

## 1. Initiative → Committee Relationships

### 1.1 Committee as Author (Rare)

**Source:** `IniAutorOutros.iniAutorComissao`

When a committee creates an initiative (rare - mostly Comissao de Assuntos Europeus for EU-related matters).

```json
"IniAutorOutros": {
    "iniAutorComissao": "Comissao de Assuntos Europeus",
    "nome": "Comissoes",
    "sigla": "C"
}
```

| Field | Description | Example |
|-------|-------------|---------|
| sigla | Author type code ("C" = Committee) | "C" |
| iniAutorComissao | Committee name (no IdComissao available) | "Comissao de Assuntos Europeus" |

**Link Type:** `author`
**Frequency:** ~4 per legislature
**ID Matching:** Name only (no IdComissao in author data)

---

### 1.2 Committee Assignment (Lead/Secondary)

**Source:** `IniEventos[].Comissao[]`

The primary relationship - committees assigned to review initiatives.

```json
"IniEventos": [{
    "CodigoFase": "180",
    "Fase": "Baixa comissao distribuicao inicial generalidade",
    "DataFase": "2025-03-26",
    "Comissao": [{
        "Nome": "Comissao de Saude",
        "IdComissao": "8455",
        "Competente": "S",
        "DataDistribuicao": "2025-10-16",
        "Relatores": [...],
        "Votacao": [...],
        "Documentos": [...]
    }]
}]
```

| Field | Description | Matching |
|-------|-------------|----------|
| IdComissao | Committee API ID | **Direct match to orgaos.org_id** |
| Nome | Committee name (has trailing spaces!) | Trim before comparing |
| Competente | "S" = Lead, "N" = Secondary | Determines link_type |

**Link Types:**
- `lead` - Competente = "S" (primary reviewer)
- `secondary` - Competente = "N" (opinion only)

**Phase Codes Where Assignments Occur:**

| Phase | Name | Purpose | Count (XVII) |
|-------|------|---------|--------------|
| 180 | Baixa comissao distribuicao inicial generalidade | Initial assignment | 327 |
| 181 | Baixa comissao para discussao | Committee discussion | 255 |
| 240 | Nova apreciacao comissao generalidade | RE-evaluation | 14 |
| 270 | Baixa comissao especialidade | Detailed review | 146 |
| 348 | Envio a Comissao para fixacao da Redacao final | Final text | 79 |

**Key Insight:** Same initiative can be assigned to same committee at DIFFERENT phases - the unique key is (iniciativa_id, committee_name, link_type, phase_code).

---

### 1.3 Enrichment Data on Committee Links

Each committee assignment can have nested enrichment data:

#### Rapporteurs (Relatores)
```json
"Relatores": [{
    "id": "6864",
    "nome": "Ines de Sousa Real",
    "gp": "PAN",
    "dataNomeacao": null,
    "dataCessacao": null
}]
```
**Frequency:** 155 initiatives with rapporteurs (XVII)

#### Committee Votes (Votacao)
```json
"Votacao": [{
    "id": "139878",
    "data": "2025-10-15",
    "resultado": "Aprovado",
    "detalhe": "A Favor: CH, PS, PAN\nContra: PSD, IL",
    "reuniao": "20"
}]
```
**Frequency:** 112 initiatives with committee votes (XVII)

#### Documents (Documentos)
```json
"Documentos": [{
    "TituloDocumento": "Parecer",
    "Tipo": "Parecer",
    "URL": "https://..."
}]
```
**Document Types (XVII):** Link (317), Informacao (123), Parecer (110), Nota tecnica (104), Relatorio (102), Texto final (72)

#### Hearings (Audicoes) and Audiences (Audiencias)
```json
"Audicoes": [{"data": "2025-10-22", "id": "159582", "tipo": "AUP"}]
"Audiencias": [...]
```
**Frequency:** Audicoes: 4, Audiencias: 6 (XVII)

---

### 1.4 Subcommittee Distribution

**Source:** `IniEventos[].Comissao[].DistribuicaoSubcomissao`

```json
"DistribuicaoSubcomissao": [{
    "leg": "XVII",
    "nome": "Grupo de Trabalho - Audicoes sobre a alteracao a Lei da Nacionalidade",
    "num": "8",
    "orgId": "8469",
    "sigla": "GT-AALN"
}]
```

**Frequency:** 1 (XVII)
**Link Type:** `subcommittee`
**ID Matching:** orgId matches orgaos.org_id

---

## 2. Initiative → Initiative Relationships

### 2.1 Joint Initiatives (IniciativasConjuntas)

**Source:** `IniEventos[].IniciativasConjuntas`

When multiple initiatives are discussed/voted together.

```json
"IniciativasConjuntas": [
    {
        "id": "315034",
        "leg": "XVII",
        "nr": "1",
        "tipo": "J",
        "descTipo": "Projeto de Lei",
        "titulo": "Alarga as garantias de protecao as vitimas..."
    },
    {
        "id": "315090",
        "nr": "27",
        "tipo": "J",
        "titulo": "Reforca as medidas de protecao das vitimas..."
    }
]
```

| Field | Description |
|-------|-------------|
| id | IniId of related initiative (may not exist in our DB) |
| leg | Legislature |
| nr | Initiative number |
| tipo | Type code (J, P, R, etc.) |
| descTipo | Type description |
| titulo | Initiative title |

**Frequency:** 406 events with joint initiatives (XVII), 3000+ individual links
**Link Type:** `joint`
**Use Case:** Show related initiatives that address the same topic

---

## 3. Committee → Deputy Relationships

### 3.1 Committee Membership

**Source:** `OrgaoComposicaoXX_json.txt → Composicao[]`

```json
{
    "idOrgao": 8455,
    "siglaOrgao": "CS",
    "nomeSigla": "Comissao de Saude",
    "Composicao": [{
        "depId": 6921,
        "depNomeParlamentar": "Ana Paula Martins",
        "gpSigla": "PS",
        "depCargo": "Presidente",
        "sioTipMem": "Efetivo"
    }]
}
```

| Field | Description |
|-------|-------------|
| depId | Deputy API ID |
| depCadId | Biographical registry ID |
| gpSigla | Party abbreviation |
| depCargo | Role (Presidente, Vice-Presidente, etc.) |
| sioTipMem | Member type (Efetivo = full, Suplente = substitute) |

**Stored In:** orgao_membros table
**Current Data:** 843 memberships across 40 parliamentary bodies

---

## 4. Initiative → Author Relationships

### 4.1 Deputy Authors (ID-Based Matching)

**Source:** `IniAutorDeputados[]`

```json
"IniAutorDeputados": [{
    "idCadastro": "6864",
    "nome": "Inês de Sousa Real",
    "GP": "PAN"
}]
```

| Field | Description | Matching |
|-------|-------------|----------|
| idCadastro | Deputy cadastre ID | **Matches orgao_membros.dep_cad_id (98.7%)** |
| nome | Deputy name | Display/fallback |
| GP | Party at authorship time | Stored for historical accuracy |

**Link Type:** `deputy`
**Frequency:** 6,522 (XVII)
**Match Rate:** 100% ID match

---

### 4.2 Parliamentary Group Authors

**Source:** `IniAutorGruposParlamentares[]`

```json
"IniAutorGruposParlamentares": [{"GP": "PAN"}]
```

**Link Type:** `group`
**Frequency:** 733 (XVII)

---

### 4.3 Government Authors

**Source:** `IniAutorOutros` where `sigla = 'V'`

```json
"IniAutorOutros": {"nome": "Governo", "sigla": "V"}
```

**Link Type:** `government`
**Frequency:** 27 (XVII)

---

### 4.4 Committee Authors

**Source:** `IniAutorOutros` where `sigla = 'C'`

```json
"IniAutorOutros": {
    "sigla": "C",
    "nome": "Comissões",
    "iniAutorComissao": "Comissão de Assuntos Europeus"
}
```

**Link Type:** `committee`
**Frequency:** 4 (XVII)
**Matching:** Name-based to orgaos table (100% match)

---

### 4.5 Other Author Types

| Sigla | Type | Entity | Count (XVII) |
|-------|------|--------|--------------|
| R | `parliament` | PAR (Parliament) | 37 |
| M | `regional` | Madeira Regional Assembly | 8 |
| A | `regional` | Azores Regional Assembly | 3 |
| Z | `citizen` | Cidadãos (Citizens) | 3 |

---

## 5. Agenda → Initiative Relationships

### 5.1 BID References in Agenda HTML

**Source:** `agenda_events.description` (HTML content)

The agenda description field contains HTML that sometimes references initiatives using BID format:

```html
<a href="https://www.parlamento.pt/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=315045">
    Projeto de Lei n.o 11/XVII/1.a
</a>
```

**Extraction Method:** Parse HTML for BID links, extract IniId
**Confidence:** HIGH (1.00) - Direct link
**Limitation:** Only available for next 7-10 days of agenda

### 5.2 Committee + Date Matching

**Source:** Cross-reference agenda_events with iniciativa_events

If an agenda event mentions a committee and date, and an initiative has an event with the same committee and date, they may be related.

**Confidence:** MEDIUM (0.70) - Probabilistic match

---

## 5. ID Matching Reference

### Critical Discovery: IdComissao = org_id

The `IdComissao` field in initiative JSON **directly matches** `org_id` in the orgaos table:

```
JSON: "IdComissao": "8455"
  ↓
DB:   orgaos.org_id = 8455
```

This allows direct ID-based lookups instead of error-prone string matching.

**Verified:** 2026-01-08

### ID Fields Summary

| JSON Field | DB Column | Entity |
|------------|-----------|--------|
| IniId | iniciativas.ini_id | Initiative |
| IdComissao | orgaos.org_id | Committee |
| idOrgao | orgaos.org_id | Committee |
| depId | orgao_membros.dep_id | Deputy |
| EvtId + OevId | iniciativa_events composite | Event |

---

## 6. Data Quality Notes

1. **Committee names have trailing spaces** - Always trim before matching
2. **IdComissao changes between legislatures** - Same committee has different IDs in different legislatures
3. **XVII data is incomplete** - New legislature, many fields still empty
4. **Competente field** - "S" = lead, "N" = secondary
5. **Author committees lack IdComissao** - Must use name matching as fallback
6. **Joint initiatives may reference non-existent IniIds** - Related initiative may not be in our database

---

## 7. Database Schema

### Tables Storing Relationships

```sql
-- Committee-Initiative links
iniciativa_comissao (
    iniciativa_id → iniciativas.id,
    orgao_id → orgaos.id,
    link_type: 'author' | 'lead' | 'secondary',
    phase_code, phase_name,
    has_rapporteur, has_vote, vote_result,
    raw_data JSONB
)

-- Initiative-Initiative links
iniciativa_conjunta (
    iniciativa_id → iniciativas.id,
    related_ini_id VARCHAR,  -- May not exist in DB
    phase_code, phase_name,
    event_date
)

-- Agenda-Initiative links
agenda_initiative_links (
    agenda_event_id → agenda_events.id,
    iniciativa_id → iniciativas.id,
    link_type: 'bid_direct' | 'committee_date',
    link_confidence DECIMAL
)
```

---

## 8. Current Data Statistics

As of 2026-01-09:

| Relationship Type | Count | Match Rate |
|------------------|-------|------------|
| **Authorship** | | |
| - Deputy authors | 6,522 | 100% ID match |
| - Group authors | 733 | - |
| - Parliament authors | 37 | - |
| - Government authors | 27 | - |
| - Regional authors | 11 | - |
| - Committee authors | 4 | 100% orgao match |
| - Citizen authors | 3 | - |
| **Committee Links** | 833 | 100% orgao match |
| **Joint Initiative Links** | 3,028 | - |
| **Committee Memberships** | 843 | - |
| **Initiatives** | 6,748 | - |
| **Parliamentary Bodies** | 40 | - |

---

## 9. Future Enhancements

### Not Yet Implemented:
- **AnexosFase** - Phase-level attachments (deferred)
- **Document cross-references** - Parsing document titles for initiative references
- **Deputy-Initiative relationships** - Via rapporteur assignments
- **Historical committee tracking** - Same committee across legislatures
