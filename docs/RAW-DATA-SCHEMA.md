# Raw Data Schema Reference

This document provides a comprehensive analysis of all raw data files from the Portuguese Parliament Open Data API.

**Generated**: January 2026
**Legislature**: XVII (current)
**Total Files**: 17 datasets

---

## Table of Contents

1. [Entity Overview](#entity-overview)
2. [Key Identifiers](#key-identifiers)
3. [Entity Relationship Diagram](#entity-relationship-diagram)
4. [Detailed Schema by Category](#detailed-schema-by-category)
   - [Deputies (Deputados)](#deputies-deputados)
   - [Initiatives (Iniciativas)](#initiatives-iniciativas)
   - [Organs & Committees](#organs--committees)
   - [Activities & Events](#activities--events)
   - [Delegations & Groups](#delegations--groups)
   - [Budget](#budget)
5. [Relationship Matrix](#relationship-matrix)

---

## Entity Overview

| Category | File | Records | Description |
|----------|------|---------|-------------|
| **Deputies** | InformacaoBaseXVII | 1,446 | All deputies (elected, substitutes, suspended) |
| **Deputies** | RegistoBiograficoXVII | 330 | Biographical data for current legislature |
| **Deputies** | AtividadeDeputadoXVII | 1,446 | Deputy activity summary |
| **Deputies** | RegistoInteressesXVII | 1,446 | Financial declarations |
| **Initiatives** | IniciativasXVII | 808 | Bills, proposals, resolutions |
| **Initiatives** | DiplomasXVII | 236 | Approved legislation |
| **Initiatives** | RequerimentosXVII | 1,072 | Parliamentary questions |
| **Initiatives** | PeticoesXVII | 85 | Citizen petitions |
| **Organs** | OrgaoComposicaoXVII | 9 types | Committees, working groups, etc. |
| **Activities** | IntervencoesXVII | 2,133 | Plenary speeches |
| **Activities** | AtividadesXVII | multi | Hearings, debates, visits |
| **Activities** | AgendaParlamentar | 34 | Parliamentary calendar |
| **Activities** | ReunioesVisitasXVII | 74 | Meetings and visits |
| **Delegations** | DelegacaoPermanenteXVII | 77 | Permanent delegations |
| **Delegations** | DelegacaoEventualXVII | 35 | Occasional delegations |
| **Groups** | GrupoDeAmizadeXVII | 67 | Friendship groups |
| **Budget** | OE2026Or | 1 | State budget items |

---

## Key Identifiers

Understanding these identifiers is crucial for linking data across datasets:

| Identifier | Description | Found In |
|------------|-------------|----------|
| `DepId` | Deputy mandate ID (unique per legislature) | InformacaoBase, OrgaoComposicao, Intervencoes |
| `DepCadId` / `CadId` | Deputy person ID (permanent across legislatures) | InformacaoBase, RegistoBiografico, RegistoInteresses |
| `idCadastro` | Same as CadId, used in author references | Iniciativas, Requerimentos |
| `IniId` | Initiative ID | Iniciativas, Diplomas, Intervencoes |
| `OrgId` / `IdComissao` | Committee/Organ ID | OrgaoComposicao, Iniciativas |
| `PetId` | Petition ID | Peticoes |
| `Id` | Generic record ID | Various |

### Identifier Relationships

```
DepCadId (Person) ←→ CadId (Person) ←→ idCadastro (Author)
     ↓
   DepId (Mandate, legislature-specific)
```

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PARLIAMENT DATA MODEL                             │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   DEPUTADOS     │
                              │  (Deputies)     │
                              ├─────────────────┤
                              │ DepId (PK)      │
                              │ DepCadId (FK)   │──────────┐
                              │ Name            │          │
                              │ Party (GP)      │          │
                              │ Circulo         │          │
                              │ Situation       │          │
                              └────────┬────────┘          │
                                       │                   │
         ┌─────────────────────────────┼───────────────────┼─────────────────┐
         │                             │                   │                 │
         ▼                             ▼                   ▼                 ▼
┌─────────────────┐          ┌─────────────────┐  ┌───────────────┐  ┌───────────────┐
│   INICIATIVAS   │          │ ORGAO_MEMBROS   │  │ DEPUTADOS_BIO │  │ REG_INTERESSES│
│  (Initiatives)  │          │  (Committee     │  │ (Biographical)│  │ (Financial)   │
├─────────────────┤          │   Membership)   │  ├───────────────┤  ├───────────────┤
│ IniId (PK)      │          ├─────────────────┤  │ CadId (PK)    │  │ CadId (FK)    │
│ IniTipo         │          │ DepId (FK)      │  │ Gender        │  │ Declarations  │
│ IniNr           │          │ OrgId (FK)      │  │ BirthDate     │  │               │
│ Authors[]       │──────────│ Cargo           │  │ Profession    │  └───────────────┘
│ Events[]        │          │ GP              │  │ Education     │
└────────┬────────┘          └────────┬────────┘  └───────────────┘
         │                            │
         │                            ▼
         │                   ┌─────────────────┐
         │                   │    ORGAOS       │
         │                   │  (Committees)   │
         │                   ├─────────────────┤
         │                   │ OrgId (PK)      │
         ├───────────────────│ OrgNome         │
         │                   │ OrgSigla        │
         │                   │ OrgTipo         │
         │                   └─────────────────┘
         │
         ├─────────────────────────────────────────────────────────────┐
         │                                                             │
         ▼                                                             ▼
┌─────────────────┐                                          ┌─────────────────┐
│    DIPLOMAS     │                                          │  INTERVENCOES   │
│   (Approved     │                                          │   (Speeches)    │
│   Legislation)  │                                          ├─────────────────┤
├─────────────────┤                                          │ Id (PK)         │
│ Id (PK)         │                                          │ IniId (FK)      │
│ IniId (FK)      │                                          │ DepId (FK)      │
│ Tipo            │                                          │ Date            │
│ Titulo          │                                          │ Resumo          │
└─────────────────┘                                          └─────────────────┘

         │
         │
┌────────┴────────┐         ┌─────────────────┐         ┌─────────────────┐
│  REQUERIMENTOS  │         │    PETICOES     │         │  DELEGACOES     │
│   (Questions)   │         │   (Petitions)   │         │  (Delegations)  │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│ Id (PK)         │         │ PetId (PK)      │         │ Id (PK)         │
│ idCadastro (FK) │         │ PetNr           │         │ Nome            │
│ Assunto         │         │ PetAssunto      │         │ Composicao[]    │
│ Resposta        │         │ Situacao        │         │   └─DepId       │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

---

## Detailed Schema by Category

### Deputies (Deputados)

#### InformacaoBaseXVII (1,446 records)

The primary deputy dataset containing all individuals who held or could hold a seat.

```json
{
  "DepId": 15760,           // Unique mandate ID for this legislature
  "DepCadId": 9008,         // Person ID (links to bio, interests)
  "DepNomeParlamentar": "Francisco Lima",
  "DepNomeCompleto": "Francisco José Mota Lima",
  "LegDes": "XVII",
  "DepCPId": 7,             // Electoral circle ID
  "DepCPDes": "Faro",       // Electoral circle name
  "DepCargo": null,         // Leadership position if any
  "DepGP": [                // Party history
    {
      "gpId": "77",
      "gpSigla": "PS",
      "gpDtInicio": "2025-03-26",
      "gpDtFim": null       // null = currently active
    }
  ],
  "DepSituacao": [          // Situation history
    {
      "sioDes": "Efetivo",  // Efetivo, Suspenso, Suplente, Renunciou
      "sioDtInicio": "2025-03-26",
      "sioDtFim": null
    }
  ],
  "Videos": []              // Video links
}
```

**Situation Values and Meaning:**
| Situation | Count | Description |
|-----------|-------|-------------|
| Efetivo | 196 | Currently serving (elected) |
| Efetivo Temporário | 27 | Temporarily serving (substitute for suspended) |
| Efetivo Definitivo | 7 | Permanently serving (replaced resigned/deceased) |
| Suplente | 693 | Substitute (on waiting list) |
| Suspenso | 34 | Suspended (government duty, etc.) |
| Renunciou | 2 | Resigned |
| Falecido | 1 | Deceased |

**Serving Deputies** = Efetivo + Efetivo Temporário + Efetivo Definitivo = **230**

---

#### RegistoBiograficoXVII (330 records)

Biographical enrichment data, linked via `CadId` = `DepCadId`.

```json
{
  "CadId": 9649,
  "CadNomeCompleto": "Rui Ladeira Pereira",
  "CadSexo": "M",           // M or F
  "CadDtNascimento": "1975-03-15T00:00:00",
  "CadProfissao": "Advogado",
  "CadHabilitacoes": "Licenciatura em Direito",
  "CadObrasPublicadas": null,
  "CadCondecoracoes": null,
  "CadTitulos": null,
  "CadDeputadoLegis": [...],     // Past legislatures
  "CadCargosFuncoes": [...],     // Other political positions
  "CadActividadeOrgaos": [...]   // Committee memberships
}
```

---

#### AtividadeDeputadoXVII (1,446 records)

Activity summary per deputy, structure:

```json
{
  "Deputado": {
    "DepId": 15780,
    "DepCadId": 7351,
    "DepNomeParlamentar": "...",
    // ... same fields as InformacaoBase
  },
  "AtividadeDeputadoList": [
    {
      "Ini": [...],       // Initiatives authored
      "Req": [...],       // Questions submitted
      "Intev": [...],     // Plenary speeches
      "Cms": [...],       // Committee work
      "Rel": [...],       // Reports authored
      "Audicoes": [...],  // Hearings attended
      "Audiencias": [...],// Audiences
      "Deslocacoes": [...],// Travel
      "Eventos": [...],   // Events
      "Gpa": [...],       // Friendship groups
      "DlP": [...],       // Permanent delegations
      "DlE": [...],       // Occasional delegations
      "Scgt": [...],      // Subcommittees/working groups
      "ActP": [...],      // Plenary activities
      "ParlamentoJovens": [...], // Youth parliament
      "DadosLegisDeputado": {...} // Legislature summary
    }
  ]
}
```

---

#### RegistoInteressesXVII (1,446 records)

Financial interest declarations, multiple versions over time:

```json
{
  "RegistoInteressesV1": null,    // Older format
  "RegistoInteressesV2": null,    // Older format
  "RegistoInteressesV3": {        // Current format
    "FullName": "...",
    "DGFNumber": "...",
    "MaritalStatus": "...",
    "SpouseName": "...",
    "MatrimonialRegime": "...",
    "Exclusivity": "...",
    "RecordInterests": [...]
  },
  "RegistoInteressesV5": null     // Newer format
}
```

---

### Initiatives (Iniciativas)

#### IniciativasXVII (808 records)

Legislative initiatives (bills, proposals, resolutions):

```json
{
  "IniId": 315045,
  "IniNr": "1",
  "IniTipo": "PL",          // PL=Projeto Lei, PPL=Proposta Lei, R=Resolução
  "IniDescTipo": "Projeto de Lei",
  "IniTitulo": "...",
  "DataInicioleg": "2025-06-03",
  "DataFimleg": null,

  // Author types (mutually exclusive)
  "IniAutorDeputados": [
    {
      "idCadastro": "8196",   // Links to DepCadId
      "nome": "Ana Martins",
      "GP": "CH"
    }
  ],
  "IniAutorGruposParlamentares": [
    { "GP": "PS" }
  ],
  "IniAutorOutros": {
    "nome": "Governo",
    "sigla": "V"
  },

  "IniEventos": [             // Legislative process events
    {
      "EvtId": "1",
      "Fase": "Entrada",
      "CodigoFase": "10",
      "DataFase": "2025-08-29",
      "Comissao": null,
      "Votacao": null
    },
    {
      "EvtId": "9",
      "Fase": "Baixa comissão distribuição inicial generalidade",
      "CodigoFase": "180",
      "DataFase": "2025-09-17",
      "Comissao": [
        {
          "IdComissao": "8451",
          "Nome": "Comissão de Orçamento, Finanças e Administração Pública",
          "Competente": "S"    // Lead committee
        }
      ]
    }
  ],
  "IniAnexos": [...],         // Attached documents
  "IniciativasOrigem": [...], // Parent initiatives
  "IniciativasOriginadas": [...] // Child initiatives
}
```

**Initiative Types:**
| Code | Description | Count |
|------|-------------|-------|
| PL | Projeto de Lei (Deputy bill) | ~500 |
| PPL | Proposta de Lei (Government bill) | ~27 |
| R | Resolução (Resolution) | ~200 |
| PJR | Projeto de Resolução | |
| PAR | Proposta de Alteração | |

---

#### DiplomasXVII (236 records)

Approved legislation (output of initiatives):

```json
{
  "Id": 105111,
  "Tipo": "Resolução da Assembleia da República",
  "Numero": "123/2025",
  "Titulo": "Recomenda ao Governo a adoção de...",
  "Legislatura": "XVII",
  "Sessao": "1",
  "AnoCivil": "2025",
  "Publicacao": {...},        // Official publication info
  "LinkTexto": "...",
  "Iniciativas": [            // Source initiative(s)
    { "IniId": "315345", ... }
  ],
  "Actividades": [...]        // Related activities
}
```

---

#### RequerimentosXVII (1,072 records)

Parliamentary questions and requests:

```json
{
  "Id": 188248,
  "Nr": "1",
  "Tipo": "Pergunta",
  "ReqTipo": "P",
  "Assunto": "...",
  "Fundamentacao": "...",
  "DtEntrada": "2025-06-15",
  "DataEnvio": "2025-06-16",
  "Legislatura": "XVII",
  "Sessao": "1",
  "Autores": [
    {
      "idCadastro": "8196",   // Links to DepCadId
      "nome": "Ana Martins",
      "GP": "CH"
    }
  ],
  "Destinatarios": [...],     // Addressees (ministries, etc.)
  "RespostasSPerguntas": [...], // Responses
  "Ficheiro": "...",          // Document link
  "Publicacao": {...}
}
```

---

#### PeticoesXVII (85 records)

Citizen petitions:

```json
{
  "PetId": 1234,
  "PetNr": "1",
  "PetLeg": "XVII",
  "PetAssunto": "...",
  "PetAutor": "...",
  "PetDataEntrada": "2025-07-01",
  "PetNrAssinaturas": 5000,
  "PetNrAssinaturasInicial": 4500,
  "PetSituacao": "Em apreciação",
  "PetUrlTexto": "...",
  "DadosComissao": {...},      // Assigned committee
  "IniciativasConjuntas": [...], // Related initiatives
  "Iniciativasoriginadas": [...], // Initiatives it generated
  "Intervencoes": [...],       // Related speeches
  "DataDebate": "...",
  "Links": [...]
}
```

---

### Organs & Committees

#### OrgaoComposicaoXVII

Structured by organ type:

```json
{
  "Comissoes": [              // 18 parliamentary committees
    {
      "DetalheOrgao": {
        "idOrgao": "8451",
        "nomeSigla": "COFAP",
        "siglaOrgao": "COFAP",
        "siglaLegislatura": "XVII"
      },
      "HistoricoComposicao": [
        {
          "depId": 15780,
          "depCadId": 7351,
          "depNomeParlamentar": "...",
          "depCargo": "Presidente",  // Role in committee
          "depGP": "PS",
          "depSituacao": "Efetivo",
          "orgId": 8451,
          "legDes": "XVII"
        }
      ],
      "Reunioes": [...]       // Committee meetings
    }
  ],
  "GruposTrabalho": [...],    // 15 working groups
  "SubComissoes": [...],      // 2 subcommittees
  "MesaAR": [...],            // Parliament leadership
  "ConferenciaLideres": [...],// Leaders conference
  "ConferenciaPresidentesComissoes": [...],
  "ConselhoAdministracao": [...],
  "Plenario": [...],
  "ComissaoPermanente": [...]
}
```

**Committee Roles (depCargo):**
- Presidente (Chair)
- Vice-Presidente (Vice-Chair)
- Secretário (Secretary)
- Membro (Member)
- Relator (Rapporteur)

---

### Activities & Events

#### IntervencoesXVII (2,133 records)

Plenary speeches and interventions:

```json
{
  "Id": 12345,
  "Legislatura": "XVII",
  "Sessao": "1",
  "DataReuniaoPlenaria": "2025-09-15",
  "TipoIntervencao": "Intervenção",
  "TipoDebate": "Debate de Urgência",
  "FaseSessao": "...",
  "FaseDebate": "...",
  "Qualidade": "Deputado",
  "Resumo": "...",
  "Sumario": "...",
  "Deputados": [...],          // Speaking deputies
  "MembrosGoverno": [...],     // Speaking ministers
  "Iniciativas": [...],        // Related initiatives
  "Convidados": [...],         // Invited speakers
  "DadosAudiovisual": {...},   // Video links
  "Publicacao": {...}
}
```

---

#### AtividadesXVII

Aggregated activity data:

```json
{
  "AtividadesGerais": {
    "Atividades": [...],
    "Relatorios": [...]
  },
  "Audicoes": [...],           // 198 hearings
  "Audiencias": [...],         // 89 audiences
  "Debates": [...],
  "Deslocacoes": [...],        // Travel/visits
  "Eventos": [...],
  "OrcamentoContasGerencia": [...]
}
```

---

#### AgendaParlamentar (34 records)

Parliamentary calendar:

```json
{
  "Id": 1,
  "EventStartDate": "2025-09-15",
  "EventEndDate": "2025-09-15",
  "EventStartTime": "15:00",
  "EventEndTime": "18:00",
  "LegDes": "XVII",
  "OrgDes": "Plenário",
  "InternetText": "Sessão Plenária",
  "Local": "Hemiciclo",
  "Link": "...",
  "AllDayEvent": false
}
```

---

#### ReunioesVisitasXVII (74 records)

Meetings and visits:

```json
{
  "Id": 1,
  "Nome": "...",
  "Tipo": "Visita",
  "Legislatura": "XVII",
  "Sessao": "1",
  "DataInicio": "2025-07-10",
  "DataFim": "2025-07-10",
  "Local": "...",
  "Promotor": "...",
  "Participantes": [...]
}
```

---

### Delegations & Groups

#### DelegacaoPermanenteXVII (77 records)

Permanent international delegations:

```json
{
  "Id": 130,
  "Nome": "União Interparlamentar",
  "Legislatura": "XVII",
  "Sessao": "1",
  "DataEleicao": "2025-04-15",
  "Composicao": [
    {
      "DepId": 15780,
      "Nome": "...",
      "GP": "PS",
      "Cargo": "Presidente"
    }
  ],
  "Comissoes": [...],
  "Reunioes": [...]
}
```

---

#### DelegacaoEventualXVII (35 records)

Occasional/event delegations:

```json
{
  "Id": 1,
  "Nome": "Visita ao Parlamento Europeu",
  "Legislatura": "XVII",
  "Sessao": "1",
  "DataInicio": "2025-06-10",
  "DataFim": "2025-06-12",
  "Local": "Bruxelas",
  "Participantes": [...]
}
```

---

#### GrupoDeAmizadeXVII (67 records)

Bilateral friendship groups:

```json
{
  "Id": 613,
  "Nome": "Portugal - Guiné-Bissau",
  "Legislatura": "XVII",
  "Sessao": "1",
  "DataCriacao": "2025-05-20",
  "Composicao": [
    {
      "DepId": 15780,
      "Nome": "...",
      "GP": "PS",
      "Cargo": "Presidente"
    }
  ],
  "Reunioes": [...],
  "Visitas": [...]
}
```

---

### Budget

#### OE2026Or

State budget amendment proposals:

```json
{
  "#comment": "...",
  "Item": [
    {
      // Budget line items and amendments
    }
  ]
}
```

---

## Relationship Matrix

Shows how entities connect via foreign keys:

| From | To | Via | Relationship |
|------|----|-----|--------------|
| InformacaoBase | RegistoBiografico | DepCadId = CadId | 1:1 (optional) |
| InformacaoBase | RegistoInteresses | DepCadId = CadId | 1:1 |
| InformacaoBase | AtividadeDeputado | DepId | 1:1 |
| InformacaoBase | OrgaoComposicao | DepId | 1:N (committees) |
| Iniciativas | InformacaoBase | IniAutorDeputados.idCadastro = DepCadId | N:M |
| Iniciativas | OrgaoComposicao | IniEventos.Comissao.IdComissao = OrgId | N:M |
| Diplomas | Iniciativas | Iniciativas.IniId | N:M |
| Intervencoes | InformacaoBase | Deputados.DepId | N:M |
| Intervencoes | Iniciativas | Iniciativas.IniId | N:M |
| Requerimentos | InformacaoBase | Autores.idCadastro = DepCadId | N:M |
| Peticoes | Iniciativas | IniciativasConjuntas.IniId | N:M |
| DelegacaoPermanente | InformacaoBase | Composicao.DepId | N:M |
| DelegacaoEventual | InformacaoBase | Participantes.DepId | N:M |
| GrupoDeAmizade | InformacaoBase | Composicao.DepId | N:M |

---

## Data Quality Notes

1. **ID Consistency**: `DepCadId`, `CadId`, and `idCadastro` all refer to the same person identifier
2. **Nullable Fields**: Many fields are nullable, especially in older records
3. **Date Formats**: Dates use ISO 8601 format (`YYYY-MM-DDTHH:MM:SS`)
4. **Active Records**: `null` end dates indicate currently active status
5. **Nested Arrays**: Many-to-many relationships are represented as nested arrays

---

## Recommended Ingestion Order

For a clean database load, process files in this order:

1. **RegistoBiografico** → `deputados_bio` (persons, no dependencies)
2. **InformacaoBase** → `deputados` (mandates, references bio)
3. **OrgaoComposicao** → `orgaos` + `orgao_membros` (committees, references deputies)
4. **Iniciativas** → `iniciativas` (references deputies, committees)
5. **Diplomas** → `diplomas` (references initiatives)
6. **Requerimentos** → `requerimentos` (references deputies)
7. **Peticoes** → `peticoes` (references initiatives)
8. **Intervencoes** → `intervencoes` (references deputies, initiatives)
9. **Delegations/Groups** → various tables (references deputies)
