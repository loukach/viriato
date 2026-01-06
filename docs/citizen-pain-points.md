# Citizen Pain Points: Problems Viriato Aims to Solve

> Understanding the "why" behind this project - the real problems citizens face when trying to engage with Portuguese parliamentary activity.

## Executive Summary

Portuguese citizens have a **right to know** what their elected representatives are doing, but the current state of parliamentary information creates significant barriers to civic engagement. Viriato aims to bridge this gap.

---

## Top Pain Points

### 1. 🔍 **Information is Hard to Find**
**Problem:** Parliamentary data exists on parlamento.pt, but it's buried in complex interfaces, PDFs, and requires knowing exactly what to search for.

**Citizen experience:** "I heard about a new housing law being discussed. Where do I even start looking?"

**Viriato solution:** Simple search, clear categories, human-readable summaries.

---

### 2. 📚 **Legislative Process is Incomprehensible**
**Problem:** 60+ different phases, 7 initiative types, technical terminology. Even educated citizens struggle to understand where an initiative stands.

**Citizen experience:** "It says 'Baixa comissão especialidade' - what does that mean? Is this law going to pass or not?"

**Viriato solution:**
- Visual lifecycle funnels showing progress
- Plain-language status descriptions
- Glossary with citizen-focused explanations

---

### 3. 🏛️ **Can't Track What Matters to Me**
**Problem:** If you care about healthcare, education, or environment, there's no easy way to follow relevant initiatives without manually checking every day.

**Citizen experience:** "I'm a teacher and want to know about education legislation, but I don't have time to check the parliament website daily."

**Viriato solution:** Topic-based filtering, future: email alerts for keywords.

---

### 4. 🗳️ **Don't Know How My Representative Voted**
**Problem:** Voting records exist but are buried in session minutes (PDFs). Connecting a deputy's name to their actual votes requires hours of research.

**Citizen experience:** "My MP said they support affordable housing. Did they actually vote for those measures?"

**Viriato solution:** Future feature - deputy voting records linked to initiatives.

---

### 5. 📊 **No Big Picture View**
**Problem:** Citizens can't easily see patterns: Which parties are most active? What topics dominate? How many initiatives actually become law?

**Citizen experience:** "Is parliament actually doing anything? It feels like nothing ever changes."

**Viriato solution:** Analytics widgets showing:
- Initiatives by type, party, origin
- Conversion rates (initiatives → laws)
- Activity over time

---

### 6. 🗣️ **Parliamentary Language is Alienating**
**Problem:** Technical jargon creates a barrier between citizens and their democracy. Terms like "Apreciação Parlamentar" or "Projeto de Deliberação" mean nothing to most people.

**Citizen experience:** "I tried to read about this initiative but gave up after the third term I didn't understand."

**Viriato solution:**
- Glossary with plain-language definitions
- Tooltips explaining terms in context
- Impact indicators (does this affect me?)

---

### 7. ⏰ **Information is Not Timely**
**Problem:** By the time citizens hear about legislation in the news, it's often already passed or rejected. No proactive communication.

**Citizen experience:** "I only found out about this law after it was approved. Why didn't anyone tell us it was being discussed?"

**Viriato solution:** Future feature - subscription to topics/keywords, push notifications.

---

### 8. 📱 **Not Mobile-Friendly**
**Problem:** Official parliament resources are designed for desktop bureaucrats, not citizens on their phones.

**Citizen experience:** "I tried to check something on my phone during lunch break - impossible to navigate."

**Viriato solution:** Mobile-first responsive design, works on any device.

---

### 9. 🔗 **Information is Fragmented**
**Problem:** To understand one initiative, you might need to check: the initiative page, committee reports, voting records, related petitions, media coverage - all in different places.

**Citizen experience:** "I spent 2 hours trying to understand what happened to one single initiative."

**Viriato solution:** Consolidated view - one initiative, all information in one place.

---

### 10. 🤷 **"Nothing Ever Changes" Feeling**
**Problem:** Most initiatives (especially Projetos de Resolução) are recommendations without legal force. Citizens don't understand why parliament seems to "approve" things that never happen.

**Citizen experience:** "Parliament approved a resolution about X months ago. Why hasn't anything changed?"

**Viriato solution:**
- Clear labeling of initiative types
- Impact indicators (⭐⭐⭐ = creates law, ⭐ = just a recommendation)
- Education about what different types actually mean

---

## Priority Matrix

| Pain Point | Severity | Current Status | Effort to Solve |
|------------|----------|----------------|-----------------|
| Information hard to find | High | ✅ Partially solved | Low |
| Process incomprehensible | High | ✅ Partially solved | Medium |
| Can't track topics | High | 🔜 Planned | Medium |
| Voting records | High | 🔜 Future | High |
| No big picture | Medium | ✅ Solved (widgets) | Low |
| Jargon alienating | Medium | ✅ Solved (glossary) | Low |
| Not timely | Medium | 🔜 Future | High |
| Not mobile-friendly | Medium | ✅ Solved | Low |
| Fragmented info | Medium | ✅ Partially solved | Medium |
| "Nothing changes" feeling | Low | ✅ Solved (types + impact) | Low |

---

## Design Principles Derived from Pain Points

1. **Clarity over completeness** - Better to show less clearly than everything confusingly
2. **Mobile-first** - Most citizens will access on phones
3. **Plain language** - No jargon without explanation
4. **Visual hierarchy** - Most important info (impact, status) immediately visible
5. **Progressive disclosure** - Simple overview first, details on demand
6. **Actionable insights** - Not just data, but "what does this mean for me?"

---

## Success Metrics

How do we know if we're solving these problems?

- **Time to answer:** How long does it take a citizen to find out the status of an initiative? (Target: < 30 seconds)
- **Comprehension:** Can users correctly identify if an initiative will become law? (Target: > 80%)
- **Return visits:** Do citizens come back? (Indicates value)
- **Search success:** Do searches return relevant results? (Target: > 90%)
- **Mobile usage:** What % of users are on mobile? (Expect > 60%)

---

## Future Features to Address Remaining Pain Points

1. **Topic subscriptions** - Follow "saúde", "educação", "habitação"
2. **Deputy profiles** - See all initiatives by a specific MP
3. **Voting records** - How did each party/deputy vote?
4. **Email digests** - Weekly summary of relevant activity
5. **Comparison tools** - Compare parties' positions on topics
6. **Petition integration** - Link citizen petitions to related initiatives
