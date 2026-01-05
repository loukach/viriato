# Glossário: Tipos de Iniciativas Parlamentares

> Este glossário pode ser usado para contexto de desenvolvimento e como conteúdo para tooltips/página de ajuda na aplicação.

## Visão Geral

As iniciativas parlamentares portuguesas distinguem-se principalmente pela **origem** (quem propõe) e pelo **efeito jurídico** (consequências legais).

## Tipos de Iniciativas

### Projetos de Lei (J) - 289 iniciativas
**Origem:** Deputados ou grupos parlamentares
**Efeito:** Se aprovados, tornam-se **leis** que vinculam todos os cidadãos
**Impacto:** Criam direitos, deveres ou alteram legislação existente
**Relevância para o cidadão:** ⭐⭐⭐ Alta - afeta diretamente direitos e deveres

### Propostas de Lei (P) - 33 iniciativas
**Origem:** Governo
**Efeito:** Mesmo efeito que os projetos de lei (tornam-se leis)
**Impacto:** A iniciativa vem do executivo, não dos deputados
**Relevância para o cidadão:** ⭐⭐⭐ Alta - afeta diretamente direitos e deveres

### Projetos de Resolução (R) - 452 iniciativas
**Origem:** Deputados ou grupos parlamentares
**Efeito:** **Não têm força de lei**
**Impacto:** Servem para a Assembleia tomar posições políticas, fazer recomendações ao Governo, ou aprovar tratados internacionais
**Nota:** O Governo não é obrigado a cumprir recomendações
**Relevância para o cidadão:** ⭐ Baixa - não vinculativo

### Propostas de Resolução (S) - 5 iniciativas
**Origem:** Governo
**Efeito:** Não têm força de lei direta
**Impacto:** Normalmente para ratificar acordos internacionais ou convenções
**Relevância para o cidadão:** ⭐⭐ Média - acordos internacionais podem ter impacto

### Projetos de Deliberação (D) - 20 iniciativas
**Origem:** Deputados
**Efeito:** Questões internas da Assembleia
**Impacto:** Horários, organização de trabalhos, composição de comissões
**Relevância para o cidadão:** ⭐ Baixa - não afeta diretamente o cidadão

### Inquéritos Parlamentares (I) - 6 iniciativas
**Origem:** Deputados
**Efeito:** Investigações sobre atos do Governo ou da administração pública
**Impacto:** Podem expor problemas, mas não têm consequências jurídicas diretas
**Relevância para o cidadão:** ⭐⭐ Média - função de fiscalização

### Apreciações Parlamentares (A) - 3 iniciativas
**Origem:** Deputados
**Efeito:** Permitem à Assembleia modificar ou suspender decretos-lei do Governo
**Impacto:** Mecanismo de controlo parlamentar sobre legislação governamental
**Relevância para o cidadão:** ⭐⭐⭐ Alta - pode alterar legislação em vigor

## Resumo Prático

| Tipo | Código | Força de Lei | Origem | Impacto Cidadão |
|------|--------|--------------|--------|-----------------|
| Projetos de Lei | J | ✅ Sim | Parlamento | Alto |
| Propostas de Lei | P | ✅ Sim | Governo | Alto |
| Apreciações Parlamentares | A | ✅ Pode alterar | Parlamento | Alto |
| Propostas de Resolução | S | ❌ Não | Governo | Médio |
| Inquéritos Parlamentares | I | ❌ Não | Parlamento | Médio |
| Projetos de Resolução | R | ❌ Não | Parlamento | Baixo |
| Projetos de Deliberação | D | ❌ Não | Parlamento | Baixo |

## Conclusão

**Do ponto de vista prático:** Só os **Projetos de Lei (J)**, **Propostas de Lei (P)** e **Apreciações Parlamentares (A)** alteram efetivamente os direitos e deveres dos cidadãos. Os restantes são instrumentos políticos ou de controlo.

---

## Uso na Aplicação

### Tooltips (versões curtas)

```javascript
const tooltips = {
  'J': 'Proposto por deputados. Se aprovado, torna-se lei.',
  'P': 'Proposto pelo Governo. Se aprovado, torna-se lei.',
  'R': 'Recomendação política. Não tem força de lei.',
  'S': 'Proposto pelo Governo. Normalmente para ratificar acordos internacionais.',
  'D': 'Questões internas da Assembleia. Não afeta o cidadão.',
  'I': 'Investigação parlamentar. Fiscaliza o Governo.',
  'A': 'Pode modificar ou suspender decretos-lei do Governo.'
};
```

### Badges de Impacto

```javascript
const impactBadges = {
  'J': { level: 'high', label: 'Pode criar lei' },
  'P': { level: 'high', label: 'Pode criar lei' },
  'A': { level: 'high', label: 'Pode alterar lei' },
  'S': { level: 'medium', label: 'Acordos internacionais' },
  'I': { level: 'medium', label: 'Fiscalização' },
  'R': { level: 'low', label: 'Recomendação' },
  'D': { level: 'low', label: 'Interno AR' }
};
```
