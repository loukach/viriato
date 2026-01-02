# Dataset Relationships Map

## Core Entity: Deputies (Deputados)

Deputies are the central entity - almost everything connects to them.

```
DEPUTIES (Deputados)
├── Identified in: "Atividade dos Deputados", "Registo Biográfico"
└── Referenced by: Most other datasets
```

## Relationship Diagram

### 1. Legislative Flow

```
DEPUTIES
  ↓ (create)
INITIATIVES (Iniciativas)
  ↓ (referenced in)
AGENDA (Agenda Parlamentar)
  ↓ (discussed/voted)
ACTIVITIES (Atividades)
  ↓ (if approved, become)
DIPLOMAS APROVADOS (Approved Bills)
```

**Key identifiers**:
- Initiative ID (e.g., "BID=315636")
- Deputy ID
- Legislature number (e.g., "XVII")
- Date

### 2. Parliamentary Organization

```
INFORMATION BASE (Informação Base)
  ├── Legislatures
  ├── Sessions (Sessões)
  ├── Political Parties
  └── Electoral Districts
        ↓
     DEPUTIES
        ↓ (assigned to)
  ORGANS COMPOSITION (Composição de Órgãos)
     - Committees
     - Parliamentary groups
     - Leadership positions
```

**Key identifiers**:
- Deputy ID
- Legislature number
- Organ/Committee ID
- Party ID

### 3. Deputy Activity Tracking

```
DEPUTIES
  ├─→ INITIATIVES (Bills/Resolutions they authored)
  ├─→ PERGUNTAS E REQUERIMENTOS (Questions they asked)
  ├─→ INTERVENTIONS (Intervenções - Speeches they gave)
  ├─→ ACTIVITIES (Atividades - Votes, debates they participated in)
  └─→ COMMITTEES (Composição de Órgãos - Committees they serve on)
```

**Key identifiers**:
- Deputy ID
- Activity date
- Activity type
- Document ID

### 4. International Relations

```
DEPUTIES
  ↓ (participate in)
DELEGATIONS (Delegações Eventuais/Permanentes)
  ↓ (engage in)
COOPERATION AGREEMENTS (Cooperação Parlamentar)
FRIENDSHIP GROUPS (Grupos Parlamentares de Amizade)
```

**Key identifiers**:
- Deputy ID
- Delegation ID
- Country/Organization
- Date

### 5. Citizen Engagement

```
CITIZENS
  ↓ (submit)
PETITIONS (Petições)
  ↓ (assigned to)
COMMITTEES (Composição de Órgãos)
  ↓ (discussed in)
ACTIVITIES (Atividades)
  ↓ (may reference in)
AGENDA (Agenda Parlamentar)
```

**Key identifiers**:
- Petition ID
- Committee ID
- Date

### 6. Budget Process (Special Case)

```
GOVERNMENT
  ↓ (proposes)
STATE BUDGET (Orçamento do Estado)
  ↓ (amendments from)
DEPUTIES/PARTIES
  ↓ (discussed in)
COMMITTEES → PLENARY
  ↓ (becomes)
APPROVED BILL (Diploma Aprovado)
```

### 7. Official Record

```
All Parliamentary Activities
  ↓ (documented in)
PARLIAMENTARY JOURNAL (Diário da Assembleia)
  - Series I: Plenary sessions
  - Series II: Committee work
```

## Complete Dataset List with Relationships

| Dataset | Primary Entity | Links To | Common Identifiers |
|---------|---------------|----------|-------------------|
| **Informação Base** | Legislatures, Parties, Districts | All datasets | Legislature #, Party ID, District ID |
| **Registo Biográfico** | Deputies (biographical) | Atividade dos Deputados | Deputy ID |
| **Atividade dos Deputados** | Deputies (activity) | Initiatives, Questions, Interventions, Organs | Deputy ID, Initiative ID, Organ ID |
| **Composição de Órgãos** | Committees, Groups | Deputies, Agenda, Activities | Organ ID, Deputy ID, Legislature # |
| **Iniciativas** | Bills, Resolutions | Agenda, Activities, Deputies, Diplomas | Initiative ID (BID), Deputy ID, Date |
| **Agenda Parlamentar** | Upcoming events | Initiatives, Organs, Deputies | Initiative ID, Organ ID, Date |
| **Atividades** | Parliamentary actions | Deputies, Initiatives, Organs | Activity ID, Deputy ID, Initiative ID |
| **Diplomas Aprovados** | Approved legislation | Initiatives | Initiative ID → Diploma ID |
| **Perguntas e Requerimentos** | Parliamentary questions | Deputies, Government | Question ID, Deputy ID, Date |
| **Intervenções** | Plenary speeches | Deputies, Activities | Deputy ID, Session, Date |
| **Orçamento do Estado** | Budget proposals | Initiatives, Activities | Legislature #, Year, Amendment ID |
| **Petições** | Citizen petitions | Committees, Agenda, Deputies | Petition ID, Committee ID |
| **Cooperação Parlamentar** | Intl cooperation | Deputies, Delegations | Agreement ID, Deputy ID |
| **Delegações Eventuais** | Ad-hoc delegations | Deputies, Cooperation | Delegation ID, Deputy ID, Country |
| **Delegações Permanentes** | Standing delegations | Deputies | Delegation ID, Deputy ID, Organization |
| **Grupos Parlamentares de Amizade** | Friendship groups | Deputies | Group ID, Deputy ID, Country |
| **Reuniões/Visitas** | External meetings | Deputies, Organs | Meeting ID, Deputy ID, Date |
| **Diário da Assembleia** | Official journal | All activities | Date, Session, Legislature # |

## Data Flow for Your Use Case: "Important Decisions"

To answer **"What important decisions might impact Portugal?"**, you need:

### Minimum Viable Dataset Combination

```
1. AGENDA PARLAMENTAR (what we have)
   ↓ shows: upcoming votes/discussions
   ↓ contains: Initiative IDs

2. INICIATIVAS (what we're getting)
   ↓ shows: what's being proposed
   ↓ contains: full text, summary, authors

3. INFORMAÇÃO BASE (recommended next)
   ↓ shows: which legislature, parties involved
   ↓ provides: context about political landscape

4. COMPOSIÇÃO DE ÓRGÃOS (nice to have)
   ↓ shows: which committees handle which topics
   ↓ helps: identify if committees align with your interests
```

### Enhanced Version (for "influence deputies")

Add:
```
5. ATIVIDADE DOS DEPUTADOS
   ↓ shows: which deputies work on which issues

6. REGISTO BIOGRÁFICO
   ↓ shows: deputy contact info, backgrounds
```

### Complete Version (for "audit deputies")

Add all of:
```
7. ATIVIDADES (voting records)
8. INTERVENÇÕES (what they said)
9. PERGUNTAS E REQUERIMENTOS (what they asked government)
10. Compare against campaign promises (external data)
```

## Key Insight

**The datasets are highly relational:**
- You can't understand Agenda without Initiatives
- You can't understand Initiatives without Deputies
- You can't understand Deputies without Organs/Parties
- Everything ties back to Informação Base

**Recommendation**: Fetch datasets in this order based on your goals:
1. Agenda ✓ (have it)
2. Initiatives (next)
3. Informação Base (provides foundation)
4. Then expand based on which features you want to build
