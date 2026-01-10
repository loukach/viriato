#!/bin/bash
# Upload feature requests from docs/feature-requests.md to GitHub Issues
#
# Usage: GITHUB_TOKEN=your_token ./scripts/upload-feature-requests.sh
#
# Note: Feature request #1 (Pesquisa por Partido) is already covered by Issue #8

set -e

REPO="loukach/viriato"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN environment variable is required"
    echo "Usage: GITHUB_TOKEN=your_token $0"
    echo ""
    echo "To create a token: https://github.com/settings/tokens/new"
    echo "Required scope: 'repo' (for private repos) or 'public_repo' (for public repos)"
    exit 1
fi

echo "Uploading feature requests to GitHub Issues for $REPO..."
echo ""

# Feature Request #2: Tracker Parlamentar
echo "Creating Issue: Tracker Parlamentar - Dashboard Cidadão..."
curl -s -X POST "https://api.github.com/repos/$REPO/issues" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "title": "[Feature] Tracker Parlamentar - Dashboard Cidadão",
  "body": "## Descrição\n\nTransformar dados parlamentares em visualizações acessíveis e atraentes para o cidadão comum. Uma espécie de \"dashboard cidadão\" que responda às perguntas que as pessoas realmente querem saber.\n\n> \"Seria interessante poder utilizar estes dados para mostrar de forma 'fácil' e 'atraente' informações de interesse público. Estatísticas, criação de posters bonitos, onde está a ser alocado o nosso dinheiro, livro de ponto (presenças). Ou seja, ser como uma espécie de tracker do que andam a fazer estes caralhos na assembleia.\"\n\n## Componentes sugeridos\n\n### 1. Estatísticas\n- Número de iniciativas por partido/deputado\n- Taxa de aprovação de propostas\n- Comparações entre legislaturas\n\n### 2. Posters/Resumos Visuais\n- Infográficos partilháveis nas redes sociais\n- Resumos semanais/mensais do trabalho parlamentar\n- Design atraente que simplifique informação complexa\n\n### 3. Alocação de Dinheiro Público\n- Visualização do Orçamento de Estado\n- Onde vai o dinheiro dos impostos\n- Comparação entre orçamentado vs executado\n\n### 4. Livro de Ponto (Presenças)\n- Registo de presenças dos deputados\n- Participação em votações\n- Assiduidade nas comissões\n\n## Benefícios\n- Democratiza o acesso à informação parlamentar\n- Cria accountability - os cidadãos podem ver quem trabalha e quem não trabalha\n- Formato visual torna a política mais acessível\n- Potencial viral nas redes sociais aumenta o alcance\n\n---\n*Migrado de docs/feature-requests.md*",
  "labels": ["enhancement", "feature-request"]
}
EOF

if [ $? -eq 0 ]; then
    echo "✓ Created: Tracker Parlamentar"
else
    echo "✗ Failed to create: Tracker Parlamentar"
fi

echo ""

# Feature Request #3: Pesquisa por Tema
echo "Creating Issue: Pesquisa por Tema/Palavras-chave..."
curl -s -X POST "https://api.github.com/repos/$REPO/issues" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "title": "[Feature] Pesquisa por Tema/Palavras-chave",
  "body": "## Descrição\n\nPesquisa de iniciativas por tema ou palavras-chave no título/conteúdo. Permite encontrar iniciativas sobre temas específicos independentemente de quem as propôs.\n\n> \"Uma sugestão é procurar uma palavra específica no título ou no texto das diversas iniciativas parlamentares... Por exemplo, o que é que fizeram sobre taxas em vinho?\"\n\n> \"Para quem gosta mais de 'politics' do que de 'policies', pode ser interessante a hipótese de aceder rapidamente às iniciativas de um grupo parlamentar em específico... Não vá alguém querer saber o que o CHEGA andou a propor.\"\n\n## Exemplos de uso\n- Pesquisar \"taxas vinho\" → o que legislaram sobre taxas em vinho?\n- Pesquisar \"imigração\" → ver todas as propostas sobre o tema\n- Pesquisar \"IRS\" → encontrar iniciativas fiscais\n- Pesquisar \"habitação\" → acompanhar a crise da habitação no parlamento\n\n## Benefícios\n- Permite acompanhar temas de interesse pessoal\n- Facilita investigação jornalística e académica\n- Útil para quem quer seguir a \"política\" (drama partidário) além das \"policies\" (propostas concretas)\n- Complementa a pesquisa por autor com pesquisa por conteúdo\n\n---\n*Migrado de docs/feature-requests.md*",
  "labels": ["enhancement", "feature-request"]
}
EOF

if [ $? -eq 0 ]; then
    echo "✓ Created: Pesquisa por Tema"
else
    echo "✗ Failed to create: Pesquisa por Tema"
fi

echo ""
echo "Done! Check your issues at: https://github.com/$REPO/issues"
