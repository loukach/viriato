# Feature Request Prioritization

Proposta de priorização das funcionalidades pedidas pela comunidade.

**Data:** 2026-01-10
**Issues analisadas:** #8, #9, #10, #11, #12

---

## Resumo Executivo

| Prioridade | Issue | Funcionalidade | Esforço | Impacto |
|------------|-------|----------------|---------|---------|
| **P1** | #8 | Pesquisa por Partido/Autor | Baixo | Alto |
| **P2** | #12 | Pesquisa por Tema/Palavras-chave | Médio | Alto |
| **P3** | #10 | Digests por Tema | Médio | Médio |
| **P4** | #9 | Subscrição de Tópicos | Alto | Médio |
| **P5** | #11 | Tracker Parlamentar (Dashboard) | Muito Alto | Alto |

---

## Análise Detalhada

### P1: Pesquisa por Partido/Autor (#8)

**Pedido:** "Procurar iniciativas por partido, por entidade"

**Justificação para Prioridade Máxima:**
- **Infraestrutura já existe:** Os dados de autor/partido já estão na base de dados
- **Esforço mínimo:** Adicionar filtro dropdown no frontend + query parameter na API
- **Maior pedido:** Mencionado em múltiplos feedbacks como funcionalidade essencial
- **Impacto imediato:** Cidadãos podem finalmente acompanhar partidos específicos

**Implementação sugerida:**
1. Adicionar endpoint `/api/iniciativas?autor=PS` ou `?partido=PS`
2. Dropdown/autocomplete no frontend com lista de partidos
3. Combinar com filtros existentes (legislatura, tipo)

**Tempo estimado:** 1-2 dias

---

### P2: Pesquisa por Tema/Palavras-chave (#12)

**Pedido:** Pesquisar palavras no título/conteúdo das iniciativas

**Justificação:**
- **Base técnica pronta:** Full-text search em PostgreSQL já implementado
- **Extensão natural:** Expandir pesquisa atual para incluir corpo do texto
- **Alta utilidade:** Jornalistas, investigadores, cidadãos interessados em temas
- **Complementa #8:** Pesquisa por conteúdo + pesquisa por autor = solução completa

**Implementação sugerida:**
1. Adicionar coluna de texto completo ao índice de pesquisa
2. Melhorar UI de pesquisa com sugestões/autocomplete
3. Destacar termos encontrados nos resultados

**Tempo estimado:** 3-5 dias

---

### P3: Digests por Tema (#10)

**Pedido:** "Resumo das iniciativas relativas a grandes temas" (Educação, Ambiente, etc.)

**Justificação:**
- **Depende de #12:** Precisa de pesquisa por tema funcional primeiro
- **Valor editorial:** Curadoria de temas aumenta engagement
- **Pode ser semi-automático:** Categorização por palavras-chave predefinidas

**Implementação sugerida:**
1. Definir taxonomia de temas (Educação, Saúde, Ambiente, Habitação, Finanças...)
2. Classificar iniciativas automaticamente por palavras-chave
3. Página dedicada "Temas" com resumos e estatísticas

**Tempo estimado:** 1-2 semanas

---

### P4: Subscrição de Tópicos (#9)

**Pedido:** Seguir temas favoritos e votos de deputados específicos

**Justificação:**
- **Requer infraestrutura nova:** Sistema de autenticação, notificações, emails
- **Alto valor para users engaged:** Transforma visitantes em utilizadores regulares
- **Complexidade elevada:** Email delivery, gestão de preferências, GDPR

**Implementação sugerida:**
1. Sistema de autenticação (email magic links ou OAuth)
2. Página de preferências (temas, deputados, partidos a seguir)
3. Serviço de notificações (email digest semanal)
4. Integração com sistema de pesquisa (#12)

**Tempo estimado:** 3-4 semanas

---

### P5: Tracker Parlamentar - Dashboard Cidadão (#11)

**Pedido:** Dashboard com estatísticas, presenças, alocação de dinheiro

**Justificação para Prioridade Mais Baixa:**
- **Escopo muito amplo:** Inclui 4+ sub-funcionalidades independentes
- **Dados adicionais necessários:** Presenças, orçamento, votações nominais
- **Alto esforço de design:** Infográficos, visualizações complexas
- **Mas alto impacto potencial:** Funcionalidade "wow" que pode viralizar

**Recomendação:** Dividir em fases:

**Fase 1 - Estatísticas básicas (após P1-P2):**
- Número de iniciativas por partido/deputado
- Taxa de aprovação de propostas
- Gráficos simples

**Fase 2 - Presenças (dados novos necessários):**
- Scraping de dados de votações do parlamento.pt
- Visualização de participação

**Fase 3 - Orçamento (projeto separado):**
- Integração com dados do Portal da Transparência
- Visualizações de alocação de dinheiro

**Tempo estimado total:** 2-3 meses

---

## Roadmap Proposto

```
Janeiro 2026
├── Semana 2: P1 - Filtro por Partido (#8) ✓
│
Fevereiro 2026
├── Semana 1-2: P2 - Pesquisa por Tema (#12)
├── Semana 3-4: P3 - Digests por Tema (#10)
│
Março 2026
├── Semana 1-4: P4 - Subscrições (#9)
│
Abril-Maio 2026
└── P5 - Dashboard Cidadão (#11) - Fase 1
```

---

## Critérios de Priorização Utilizados

1. **Esforço vs Impacto:** Funcionalidades de baixo esforço e alto impacto primeiro
2. **Dependências técnicas:** Construir base antes de funcionalidades avançadas
3. **Infraestrutura existente:** Aproveitar o que já está implementado
4. **Feedback recorrente:** Priorizar pedidos mencionados múltiplas vezes
5. **Viabilidade de dados:** Funcionalidades que usam dados já disponíveis primeiro

---

## Próximos Passos

1. **Validar priorização** com stakeholders
2. **Criar milestones** no GitHub para cada fase
3. **Começar por #8** - filtro por partido (quick win)
4. **Documentar decisões** técnicas em issues
