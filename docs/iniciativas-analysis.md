# Iniciativas XVII - Data Analysis

Analysis of 808 legislative initiatives from Portuguese Parliament's XVII Legislature (2024-present).

## Dataset Overview

- **Total initiatives:** 808
- **Date range:** June 3, 2025 - December 29, 2025 (7 months)
- **With attachments:** 353 (43.7%)
- **Average events per initiative:** 6.0
- **All initiatives have events:** 808 (100%)

## Initiative Types

Legislative initiatives fall into 7 categories:

| Type | Count | % | Description |
|------|-------|---|-------------|
| **Projeto de Resolução** | 452 | 55.9% | Resolution projects (non-legislative recommendations) |
| **Projeto de Lei** | 289 | 35.8% | Law projects (legislative proposals from Parliament) |
| **Proposta de Lei** | 33 | 4.1% | Law proposals (from Government) |
| **Projeto de Deliberação** | 20 | 2.5% | Deliberation projects |
| **Inquérito Parlamentar** | 6 | 0.7% | Parliamentary inquiries |
| **Proposta de Resolução** | 5 | 0.6% | Resolution proposals (from Government) |
| **Apreciação Parlamentar** | 3 | 0.4% | Parliamentary reviews |

### Key Insight
- **Non-legislative (Resoluções):** 457 initiatives (56.6%) - recommendations to Government
- **Legislative (Leis):** 322 initiatives (39.9%) - actual law proposals
- **Other:** 29 initiatives (3.6%) - inquiries, reviews, deliberations

## Authorship

| Author Type | Count | % |
|-------------|-------|---|
| **Deputies** | 726 | 89.9% |
| **Parliamentary Groups** | 723 | 89.5% |
| **Government** | 27 | 3.3% |

**Note:** Many initiatives have multiple authors (deputy + group), so counts overlap.

### Parliamentary Groups Activity

Top 10 groups by number of initiatives:

| Group | Initiatives | Description |
|-------|-------------|-------------|
| **PAN** | 150 | Pessoas-Animais-Natureza |
| **CH** | 137 | Chega |
| **PCP** | 107 | Partido Comunista Português |
| **L** | 100 | Livre |
| **PS** | 82 | Partido Socialista |
| **BE** | 51 | Bloco de Esquerda |
| **IL** | 50 | Iniciativa Liberal |
| **CDS-PP** | 28 | CDS - Partido Popular |
| **PSD** | 18 | Partido Social Democrata |
| **JPP** | 10 | Juntos Pelo Povo |

## Temporal Distribution

### Submissions per Month

| Month | Submissions | Average per week |
|-------|-------------|------------------|
| 2025-06 | 187 | 46.8 |
| 2025-07 | 188 | 47.0 |
| 2025-08 | 62 | 15.5 |
| 2025-09 | 137 | 34.3 |
| 2025-10 | 93 | 23.3 |
| 2025-11 | 38 | 9.5 |
| 2025-12 | 103 | 25.8 |

**Pattern:** Peak activity in June-July (start of legislature), drop in August (summer recess), recovery in September.

### Most Active Days

All top 10 most active days are either **Friday** or **Monday/Tuesday**:

| Date | Weekday | Submissions |
|------|---------|-------------|
| 2025-07-04 | Friday | 64 |
| 2025-10-10 | Friday | 51 |
| 2025-06-27 | Friday | 47 |
| 2025-09-12 | Friday | 38 |
| 2025-06-20 | Friday | 36 |
| 2025-12-05 | Friday | 25 |
| 2025-09-16 | Tuesday | 22 |
| 2025-12-29 | Monday | 20 |
| 2025-09-08 | Monday | 18 |
| 2025-06-03 | Tuesday | 17 |

**Pattern:** Friday is the most popular day for submitting initiatives (before plenary sessions).

## Legislative Process - Phase Analysis

### Most Common Phases (60 unique phases total)

| Phase | Occurrences | Description |
|-------|-------------|-------------|
| **Entrada** | 808 | Submission/Entry |
| **Admissão** | 778 | Admission |
| **Anúncio** | 766 | Announcement |
| **Votação na generalidade** | 383 | General vote |
| **Baixa comissão distribuição inicial generalidade** | 329 | Sent to committee (initial) |
| **Baixa comissão para discussão** | 255 | Sent to committee (discussion) |
| **Apreciação** | 205 | Review |
| **Discussão generalidade** | 182 | General discussion |
| **Baixa comissão especialidade** | 146 | Sent to committee (specialty) |
| **Publicação** | 98 | Publication |
| **Envio INCM** | 95 | Sent to national press |
| **Votação Deliberação** | 95 | Deliberation vote |
| **Resolução (Publicação DAR)** | 83 | Resolution (Assembly diary) |
| **Resolução da AR (Publicação DR)** | 81 | Resolution (Official gazette) |

### Current Status Distribution

Based on the most recent event for each initiative:

| Current Phase | Count | % |
|---------------|-------|---|
| **Anúncio** | 183 | 22.6% |
| **Votação na generalidade** | 165 | 20.4% |
| **Discussão generalidade** | 82 | 10.1% |
| **Resolução da AR (Publicação DR)** | 75 | 9.3% |
| **Apreciação** | 60 | 7.4% |
| **Baixa comissão para discussão** | 36 | 4.5% |
| **Entrada** | 29 | 3.6% |
| **Votação Deliberação** | 26 | 3.2% |
| **Admissão** | 24 | 3.0% |
| **Publicação em Separata** | 21 | 2.6% |

**Insights:**
- **22.6%** are at "Anúncio" (announced, awaiting plenary)
- **20.4%** are at "Votação na generalidade" (awaiting general vote)
- **9.3%** have been approved as resolutions
- **Many** are still in early/middle phases (not yet voted)

## Data Structure Insights

### Available Fields for Web Display

**Basic Information:**
- `IniNr` - Initiative number
- `IniTipo` - Type code (P, R, L, etc.)
- `IniDescTipo` - Type description
- `IniTitulo` - Title
- `IniLinkTexto` - Link to PDF text

**Authorship:**
- `IniAutorDeputados` - Deputy authors (array)
- `IniAutorGruposParlamentares` - Parliamentary group authors (array)
- `IniAutorOutros` - Other authors (Government, Committees)

**Lifecycle:**
- `IniEventos` - Array of events/phases with:
  - `Fase` - Phase name
  - `DataFase` - Phase date
  - `CodigoFase` - Phase code
  - `Votacao` - Voting results (when applicable)
  - `TextosAprovados` - Approved texts

**Attachments:**
- `IniAnexos` - Array of attachments with:
  - `anexoNome` - Attachment name
  - `anexoFich` - Attachment URL

**Related Items:**
- `PropostasAlteracao` - Amendment proposals
- `Links` - Related links
- `Peticoes` - Related petitions

## Recommendations for Web Page

### Essential Features

1. **List View**
   - Filter by type (Lei vs Resolução)
   - Filter by parliamentary group
   - Filter by status/phase
   - Sort by date (newest/oldest)
   - Search by title

2. **Detail View**
   - Title and type
   - Authors (deputies + groups)
   - Current status badge
   - Timeline of events/phases
   - Link to PDF text
   - Attachments list
   - Voting results (when available)

3. **Visual Elements**
   - Status badges (colors for different phases)
   - Type icons (Lei vs Resolução)
   - Timeline visualization
   - Parliamentary group colors/logos

4. **Data to Emphasize**
   - **Current status** (most recent phase)
   - **Submission date** (from Entrada event)
   - **Type** (Lei has more impact than Resolução)
   - **Authors** (who proposed it)

### Status Classification

Simplify 60 phases into user-friendly categories:

| Category | Phases | Color |
|----------|--------|-------|
| **Submitted** | Entrada, Admissão | Gray |
| **In Discussion** | Anúncio, Discussão, Baixa comissão | Blue |
| **Voting** | Votação na generalidade, Votação especialidade | Orange |
| **Approved** | Publicação, Resolução da AR | Green |
| **Rejected** | Rejeitado, Caducado | Red |
| **Under Review** | Apreciação, Parecer comissão | Yellow |

### Sample Titles

1. **28/P** - Introduz o regime de grupos de IVA, que consiste na consolidação dos saldos do IVA...
2. **22/P** - Atribuição do subsídio de insularidade aos trabalhadores da administração central...
3. **9/R** - Pela adoção de um plano nacional de combate à violência sexual baseada em imagens...
4. **71/R** - Recomenda ao Governo soluções que promovem a autonomia energética nacional...
5. **217/R** - Recomenda ao Diretor do Serviço de Informações de Segurança que proponha...

## Next Steps

1. Create static HTML prototype showing initiative list
2. Implement filtering by type and group
3. Add detail view with timeline
4. Consider pagination (808 items is too many for one page)
5. Add monthly/weekly activity charts

## Files

- **Source data:** `data/raw/IniciativasXVII_json.txt` (17.82 MB, 808 items)
- **Schema:** `data/schemas/IniciativasXVII_schema.json`
- **This analysis:** `docs/iniciativas-analysis.md`
