# Agenda Parlamentar (Parliamentary Agenda)

## Overview

**Source**: https://agenda.parlamento.pt/
**Formats**: XML, JSON
**Sample file**: `data/samples/AgendaParlamentar.xml`
**Last updated**: 2026-01-02

## Description

Contains information about upcoming parliamentary activities including:
- Committee meetings
- Plenary sessions
- Parliamentary group hearings
- Visits to São Bento Palace
- Other parliamentary events

## Data Structure

### Root Element
`ArrayOfAgendaParlamentar` - Contains multiple `AgendaParlamentar` items

### AgendaParlamentar Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `Id` | Integer | Unique event identifier | 42725 |
| `SectionId` | Integer | Section category ID | 7 |
| `Section` | String | Section name | "Comissões Parlamentares" |
| `ThemeId` | Integer | Theme category ID | 2 |
| `Theme` | String | Theme description | "Comissões Parlamentares" |
| `OrderValue` | Integer | Display order value | 0 |
| `ParlamentGroup` | Integer | Parliamentary group ID (0 if not applicable) | 0, 7266 |
| `AllDayEvent` | Boolean | Whether event spans entire day | false |
| `EventStartDate` | String (dd/MM/yyyy) | Event start date | "02/01/2026" |
| `EventStartTime` | String (HH:mm:ss) | Event start time (nullable) | "15:00:00" |
| `EventEndDate` | String (dd/MM/yyyy) | Event end date | "02/01/2026" |
| `EventEndTime` | String (HH:mm:ss) | Event end time | "23:59:00" |
| `Title` | String | Event title | "Comissão de Orçamento, Finanças..." |
| `Subtitle` | String | Event subtitle (nullable) | "Reunião n.º 3" |
| `InternetText` | String (HTML-encoded) | Detailed agenda content as HTML | HTML with meeting details, links to initiatives |
| `Local` | String | Location (nullable) | "Sala 7" |
| `Link` | String | Reference link (nullable) | null |
| `LegDes` | String | Legislature designation | "XVII" |
| `OrgDes` | String | Organization/Committee name (nullable) | "Comissão de Orçamento..." |
| `ReuNumero` | Integer | Meeting number (nullable) | 3 |
| `SelNumero` | Integer | Session number (nullable) | 1 |
| `PostPlenary` | Boolean | Whether event follows plenary session | false |
| `AnexosComissaoPermanente` | Array | Committee attachments (nullable) | null |
| `AnexosPlenario` | Array | Plenary attachments (nullable) | null |

## Section Types Observed

1. **Comissões Parlamentares** (Parliamentary Committees)
   - Committee meetings with detailed agendas
   - Discussions of legislative initiatives
   - Hearings of government officials and entities

2. **Visitas ao Palácio de S. Bento** (Visits to São Bento Palace)
   - Guided tours for schools and groups

3. **Grupos Parlamentares / Partidos / DURP / Ninsc** (Parliamentary Groups)
   - Hearings organized by parliamentary groups
   - Party-specific activities

## InternetText Content

The `InternetText` field contains HTML-encoded content that typically includes:
- Numbered agenda items
- References to legislative initiatives with links (format: `/ActividadeParlamentar/Paginas/DetalheIniciativa.aspx?BID=XXXXX`)
- References to petitions with links (format: `/ActividadeParlamentar/Paginas/DetalhePeticao.aspx?BID=XXXXX`)
- Names of entities/people being heard
- Meeting procedures and voting items
- Links to supporting documents (PDF files via `app.parlamento.pt/webutils/docs/`)

### Link Patterns in InternetText

**Legislative Initiatives**:
- Draft resolutions: `Projeto de Resolução n.º XXX/XVII/1.ª`
- Draft laws: `Projeto de Lei n.º XXX/XVII/1.ª`
- Government proposals: `Proposta de Lei n.º XX/XVII/1.ª`

**Other References**:
- Petitions: `Petição n.º XX/XVII/1.ª`
- Voting projects: `Projeto de Voto n.º XXX/XVII/1.ª`
- State accounts: `Conta Geral do Estado de YYYY`

**Parliamentary Groups Mentioned**:
- PS (Partido Socialista)
- PSD (Partido Social Democrata)
- CH (Chega)
- IL (Iniciativa Liberal)
- BE (Bloco de Esquerda)
- PCP (Partido Comunista Português)
- L (Livre)
- PAN (Pessoas-Animais-Natureza)

## Potential Uses for Civic Engagement

### 1. Agenda Visibility
- Show upcoming committee meetings by topic
- Alert citizens about specific legislative initiatives being discussed
- Calendar integration for relevant events

### 2. Influence Opportunities
- Identify when specific topics will be voted on
- Show which committees are handling initiatives on specific themes
- Map which deputies are in which committees (requires Deputies dataset)

### 3. Deputy Auditing
- Track which meetings deputies should attend (requires Deputies + Attendance data)
- Cross-reference initiatives with deputy promises (requires Initiatives + Biographical data)
- Monitor committee participation patterns

## Missing Information

To build complete civic engagement features, we would also need:
- **Deputies dataset**: Who are the deputies? Which committees are they on?
- **Initiatives dataset**: Full text of legislative proposals referenced in agendas
- **Voting records**: How did deputies vote on each initiative?
- **Biographical data**: What did deputies promise during campaigns?
- **Attendance data**: Which deputies actually attended which meetings?

## Data Quality Notes

- HTML encoding: Content in `InternetText` uses double-encoded HTML entities (e.g., `&amp;lt;` instead of `<`)
- Nullable fields: Many fields can be null (indicated by `xsi:nil="true"`)
- Date format: Portuguese format (dd/MM/yyyy)
- Links: Many relative URLs require base domain `https://www.parlamento.pt` or `https://app.parlamento.pt`
