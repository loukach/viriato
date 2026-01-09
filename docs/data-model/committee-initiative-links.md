# Committee-Initiative Relationships in Parliament Data

## Overview

This document catalogs all the ways committees (comissoes) and legislative initiatives are linked in the Parliament API data.

---

## 1. Committee as Author

**Source:** `IniAutorOutros.iniAutorComissao`

When a committee creates an initiative (rare - mostly Comissao de Assuntos Europeus for EU-related matters).

```json
"IniAutorOutros": {
    "iniAutorComissao": "Comissao de Assuntos Europeus",
    "nome": "Comissoes",
    "sigla": "C"
}
```

**Frequency:** ~4 initiatives in XVII legislature (all from Comissao de Assuntos Europeus)

**Link Type:** `author`

---

## 2. Committee Assignment (Lead)

**Source:** `IniEventos[].Comissao[].Competente = "S"`

The primary committee responsible for reviewing the initiative.

```json
"Comissao": [{
    "Nome": "Comissao de Saude",
    "IdComissao": "8455",
    "Competente": "S",
    "DataDistribuicao": "2025-10-16"
}]
```

**Frequency:** 704 assignments in XVII legislature (627 initiatives have at least one committee assignment)

**Link Type:** `lead`

---

## 3. Committee Assignment (Secondary/Consulting)

**Source:** `IniEventos[].Comissao[].Competente = "N"`

Secondary committees that provide opinions but aren't the lead.

**Frequency:** 117 assignments in XVII legislature

**Link Type:** `secondary`

---

## 4. Subcommittee Distribution

**Source:** `IniEventos[].Comissao[].DistribuicaoSubcomissao`

When work is delegated to a subcommittee or working group.

```json
"DistribuicaoSubcomissao": [{
    "leg": "XVII",
    "nome": "Grupo de Trabalho - Audicoes sobre a alteracao a Lei da Nacionalidade",
    "num": "8",
    "orgId": "8469",
    "sigla": "GT-AALN"
}]
```

**Frequency:** 1 in XVII legislature

**Link Type:** `subcommittee`

---

## 5. Rapporteur Assignment

**Source:** `IniEventos[].Comissao[].Relatores`

Deputies assigned to report on the initiative within a committee.

```json
"Relatores": [{
    "dataCessacao": null,
    "dataNomeacao": null,
    "gp": "PAN",
    "id": "6864",
    "motivoCessacao": null,
    "nome": "Ines de Sousa Real"
}]
```

**Frequency:** 155 initiatives with rapporteurs in XVII legislature

**Link Type:** `rapporteur` (enriches lead/secondary link)

---

## 6. Committee Vote

**Source:** `IniEventos[].Comissao[].Votacao`

Votes taken within the committee on the initiative.

```json
"Votacao": [{
    "ausencias": null,
    "data": "2025-10-15",
    "descricao": null,
    "detalhe": "A Favor: CH, PS, PAN\nContra: PSD, IL",
    "id": "139878",
    "resultado": "Aprovado",
    "reuniao": "20",
    "unanime": null
}]
```

**Frequency:** 112 initiatives with committee votes in XVII legislature

**Link Type:** `vote` (enriches lead/secondary link)

---

## 7. Hearings (Audicoes)

**Source:** `IniEventos[].Comissao[].Audicoes`

Public hearings held by the committee on the initiative.

```json
"Audicoes": [{
    "data": "2025-10-22",
    "id": "159582",
    "tipo": "AUP"
}]
```

**Frequency:** 4 in XVII legislature

**Link Type:** `hearing` (enriches lead/secondary link)

---

## 8. Audiences (Audiencias)

**Source:** `IniEventos[].Comissao[].Audiencias`

Formal audiences related to the initiative.

**Frequency:** 6 in XVII legislature

**Link Type:** `audience` (enriches lead/secondary link)

---

## 9. Committee Documents

**Source:** `IniEventos[].Comissao[].Documentos`

Documents produced by the committee regarding the initiative.

| Document Type | Count (XVII) |
|--------------|--------------|
| Link (audio/video) | 317 |
| Informacao | 123 |
| Parecer | 110 |
| Nota tecnica | 104 |
| Outro | 104 |
| Relatorio | 102 |
| Texto final | 72 |
| Redacao final | 65 |
| Proposta de alteracao | 28 |
| Parecer AP | 27 |

**Link Type:** Part of committee assignment, not separate link

---

## 10. Remessas (Submissions)

**Source:** `IniEventos[].Comissao[].Remessas`

Formal submissions between plenary and committee.

| Remessa Type | Count (XIV sample) |
|-------------|-------------------|
| Relatorio/Parecer | 119 |
| Redacao Final | 41 |
| Informacao | 34 |
| Texto Final | 32 |
| Texto de Substituicao | 3 |

---

## Summary: Link Types to Model

### Committee-Initiative Links

| Link Type | Source | Cardinality | Key Fields |
|-----------|--------|-------------|------------|
| `author` | IniAutorOutros.iniAutorComissao | 0..1 per initiative | committee_name |
| `lead` | Comissao[].Competente="S" | 1..N per initiative | committee_id, phase_code, distribution_date |
| `secondary` | Comissao[].Competente="N" | 0..N per initiative | committee_id, phase_code, distribution_date |
| `subcommittee` | Comissao[].DistribuicaoSubcomissao | 0..N per initiative | subcommittee_id, subcommittee_name |

**Note:** Lead/secondary links can occur at multiple phases (180, 181, 240, 270, 348), so the unique key is (initiative, committee, phase).

### Initiative-Initiative Links

| Link Type | Source | Cardinality | Key Fields |
|-----------|--------|-------------|------------|
| `joint` | IniEventos[].IniciativasConjuntas | 0..N per initiative | related_ini_id, phase_code |

### Enrichment Data (on lead/secondary links):
- `rapporteur`: Deputy assigned to report
- `vote_date`, `vote_result`: Committee voting outcome
- `hearing_dates`: Public hearings held
- `documents`: Parecer, relatorio, nota tecnica, etc.

---

## Phases Where Committee Assignments Occur

Committee assignments happen at different stages of the legislative workflow. An initiative can be assigned to the **same committee multiple times** at different phases.

| Phase Code | Phase Name | Purpose | Count (XVII) |
|------------|------------|---------|--------------|
| 180 | Baixa comissao distribuicao inicial generalidade | Initial assignment for generality review | 327 |
| 181 | Baixa comissao para discussao | Sent for committee discussion | 255 |
| 270 | Baixa comissao especialidade | Sent for speciality review (detailed analysis) | 146 |
| 348 | Envio a Comissao para fixacao da Redacao final | Sent to finalize text | 79 |
| 240 | Nova apreciacao comissao generalidade | **RE-sent** for new generality evaluation | 14 |

**Important:** The phase determines the PURPOSE of the committee assignment:
- **Generality (180, 240):** Committee evaluates general principles
- **Discussion (181):** Committee debates the content
- **Speciality (270):** Committee does detailed article-by-article review
- **Final text (348):** Committee finalizes wording

---

## 11. Joint Initiatives (IniciativasConjuntas)

**Source:** `IniEventos[].IniciativasConjuntas`

When multiple initiatives are discussed/voted together in committee or plenary.

```json
"IniciativasConjuntas": [
    {
        "id": "315034",
        "leg": "XVII",
        "nr": "1",
        "sel": "1",
        "tipo": "J",
        "descTipo": "Projeto de Lei",
        "titulo": "Alarga as garantias de proteção às vítimas de violência doméstica..."
    },
    {
        "id": "315090",
        "leg": "XVII",
        "nr": "27",
        "tipo": "J",
        "descTipo": "Projeto de Lei",
        "titulo": "Reforça as medidas de proteção das vítimas..."
    }
]
```

**Frequency:** 406 events with joint initiatives in XVII legislature

**Example:** Initiative 315045 was discussed jointly with 11 other initiatives (all related to domestic violence).

**Link Type:** `joint` (initiative-to-initiative, via committee/plenary work)

**Use Case:** Show related initiatives that address the same topic and were processed together.

---

## 12. Documents Referencing Multiple Initiatives

**Source:** `IniEventos[].Comissao[].Documentos[].TituloDocumento`

Sometimes document titles explicitly reference multiple initiatives:
```
"Texto final do PJR 331/XVII/1.ª (CDS-PP) e PJR n.º 376/XVII/1.ª (PSD)"
```

This is a secondary/implicit link - can be extracted via text parsing if needed.

---

## Data Quality Notes

1. **Committee names have trailing spaces** - Need to trim when matching
2. **IdComissao changes between legislatures** - Same committee has different IDs in different legislatures
3. **XVII data is incomplete** - New legislature, many fields still empty
4. **Competente field** - "S" = lead, "N" = secondary (parecer only)

---

## Proposed Schema

### Table 1: iniciativa_comissao (Committee-Initiative Links)

```sql
CREATE TABLE iniciativa_comissao (
    id SERIAL PRIMARY KEY,
    iniciativa_id INTEGER NOT NULL REFERENCES iniciativas(id),
    orgao_id INTEGER REFERENCES orgaos(id),

    -- Committee identification
    committee_name VARCHAR(200) NOT NULL,
    committee_api_id VARCHAR(20),           -- IdComissao from API

    -- Link type and role
    link_type VARCHAR(20) NOT NULL,         -- 'author', 'lead', 'secondary', 'subcommittee'

    -- Phase/workflow context
    phase_code VARCHAR(10),                  -- CodigoFase (180, 181, 240, 270, 348)
    phase_name VARCHAR(200),                 -- Fase ("Baixa comissão especialidade", etc.)

    -- Dates
    distribution_date DATE,                  -- DataDistribuicao
    event_date DATE,                         -- DataFase (when this event occurred)

    -- Enrichment (denormalized for query performance)
    has_rapporteur BOOLEAN DEFAULT FALSE,
    has_vote BOOLEAN DEFAULT FALSE,
    vote_result VARCHAR(50),                 -- 'Aprovado', 'Rejeitado', etc.
    vote_date DATE,
    has_documents BOOLEAN DEFAULT FALSE,

    -- Metadata
    raw_data JSONB,                          -- Full Comissao object for details
    created_at TIMESTAMP DEFAULT NOW(),

    -- Same initiative can go to same committee at different phases
    UNIQUE(iniciativa_id, committee_name, phase_code)
);

CREATE INDEX idx_ini_com_committee ON iniciativa_comissao(committee_name);
CREATE INDEX idx_ini_com_type ON iniciativa_comissao(link_type);
CREATE INDEX idx_ini_com_orgao ON iniciativa_comissao(orgao_id);
CREATE INDEX idx_ini_com_phase ON iniciativa_comissao(phase_code);
```

### Table 2: iniciativa_conjunta (Initiative-to-Initiative Links)

```sql
CREATE TABLE iniciativa_conjunta (
    id SERIAL PRIMARY KEY,
    iniciativa_id INTEGER NOT NULL REFERENCES iniciativas(id),
    related_ini_id VARCHAR(20) NOT NULL,     -- IniId of related initiative
    related_ini_nr VARCHAR(20),              -- Nr (e.g., "331")
    related_ini_tipo VARCHAR(10),            -- tipo (J, P, R)
    related_ini_titulo TEXT,                 -- titulo

    -- Context
    phase_code VARCHAR(10),                  -- Where the joint processing occurred
    phase_name VARCHAR(200),
    event_date DATE,

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(iniciativa_id, related_ini_id, phase_code)
);

CREATE INDEX idx_ini_conj_related ON iniciativa_conjunta(related_ini_id);
CREATE INDEX idx_ini_conj_phase ON iniciativa_conjunta(phase_code);
```
