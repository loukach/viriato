# Discovery Notes

## Session 1: Initial Data Mapping (2026-01-02)

### What We Learned

**Available Datasets** (from https://www.parlamento.pt/Cidadania/Paginas/DadosAbertos.aspx):
1. Agenda Parlamentar ✓ *documented*
2. Atividades (Parliamentary Activities)
3. Atividade dos Deputados (Deputies' Activity)
4. Composição de Órgãos (Organs Composition)
5. Iniciativas (Legislative Initiatives)
6. Perguntas e Requerimentos (Questions and Requests)
7. Cooperação Parlamentar (Parliamentary Cooperation)
8. Delegações (Delegations)
9. Diário da Assembleia (Parliamentary Journal)
10. Diplomas Aprovados (Approved Bills)
11. Petições (Petitions)
12. Registo Biográfico (Biographical Records)

**Data Access Methods**:
- Each dataset available in XML and JSON formats
- Web interface exports from agenda.parlamento.pt
- No formal API documentation found
- Individual dataset pages are navigation portals, not API docs

**Adamastor Approach**:
- Daily automated data collection via GitHub Actions
- Combines official open data API with web scraping
- Focuses on deputies, initiatives, and attendance

### Agenda Parlamentar Analysis

**What it contains**:
- Committee meetings with detailed agendas
- References to legislative initiatives being discussed
- Names of entities/officials being heard
- Parliamentary group activities
- Scheduled visits

**Key insight**: The agenda contains rich cross-references to other datasets:
- Initiative IDs (Projetos de Lei, Projetos de Resolução)
- Petition IDs
- Deputy names (in committee contexts)
- Document links

**Limitation**: Without other datasets, we can:
- Show what's on the agenda
- See which topics are being discussed
- Identify which committees handle which themes

But we cannot:
- Show which deputies are involved
- Display full initiative content
- Track voting patterns
- Audit deputy participation

### What's Actually Useful?

For stated goals:
1. **Show Parliament's agenda** ✓ Can do with current data
2. **Help citizens know when to influence deputies** → Need Deputies + Initiatives datasets
3. **Audit deputies' contributions vs promises** → Need Deputies + Initiatives + Voting + Biographical datasets

### Next Steps (When Needed)

**Before fetching more data, answer**:
1. Which specific feature do we want to prototype first?
2. What's the minimum dataset combination needed for that feature?

**If we choose "Agenda Viewer"**:
- Current data is sufficient
- Focus: Make agenda readable and filterable
- No additional datasets needed yet

**If we choose "Influence Opportunities"**:
- Need: Initiatives dataset (to see what's being voted on)
- Need: Deputies dataset (to know who to contact)
- Need: Composição de Órgãos (to map deputies to committees)

**If we choose "Deputy Auditing"**:
- Need: All of the above plus Voting records and Biographical data
- Most complex, requires most datasets

## Decisions Made

- ✓ Start with minimal viable structure
- ✓ Document only what we have (Agenda data)
- ✓ Avoid building code until we know what we're building
- ✓ Map data dependencies before fetching more datasets

## Open Questions

1. Which civic engagement feature should we prototype first?
2. Do we need historical data or just current legislature (XVII)?
3. Should we scrape additional context like adamastor does, or stick to official open data?
