# Dataset URL Collection Guide

## Progress: 3/18 Datasets Downloaded

✅ **Downloaded**:
1. IniciativasXVII
2. DiplomasXVII
3. AtividadeDeputadoXVII

⬜ **Remaining (15 datasets)**

## How to Find URLs

For each dataset below:
1. Click the "Main Page" link
2. Navigate to the "XVII Legislatura" folder
3. Look for the `*XVII_json.txt` file download link
4. **Right-click → Copy Link Address**
5. Paste the URL in the "URL" column below

## Datasets to Collect

### Priority 1: Core Legislative Data

| # | Dataset | Main Page | Expected File | URL |
|---|---------|-----------|---------------|-----|
| 4 | Agenda Parlamentar | [Link](https://www.parlamento.pt/Cidadania/Paginas/DABoletimInformativo.aspx) | `AgendaParlamentarXVII_json.txt` | _paste here_ |
| 5 | Atividades | [Link](https://www.parlamento.pt/Cidadania/Paginas/DAatividades.aspx) | `AtividadesXVII_json.txt` | _paste here_ |
| 6 | Composição de Órgãos | [Link](https://www.parlamento.pt/Cidadania/Paginas/DAComposicaoOrgaos.aspx) | `ComposicaoOrgaosXVII_json.txt` | _paste here_ |
| 7 | Informação Base | [Link](https://www.parlamento.pt/Cidadania/Paginas/DAInformacaoBase.aspx) | `InformacaoBaseXVII_json.txt` | _paste here_ |

### Priority 2: Activity Data

| # | Dataset | Main Page | Expected File | URL |
|---|---------|-----------|---------------|-----|
| 8 | Orçamento do Estado | [Link](https://www.parlamento.pt/Cidadania/Paginas/DAOrcamentoEstado.aspx) | `OrcamentoEstadoXVII_json.txt` | _paste here_ |
| 9 | Perguntas e Requerimentos | [Link](https://www.parlamento.pt/Cidadania/Paginas/DAPerguntasRequerimentos.aspx) | `PerguntasRequerimentosXVII_json.txt` | _paste here_ |

### Priority 3: Additional Context

| # | Dataset | Main Page | Expected File | URL |
|---|---------|-----------|---------------|-----|
| 10 | Registo Biográfico | [Link](https://www.parlamento.pt/Cidadania/Paginas/DARegistoBiografico.aspx) | `RegistoBiograficoXVII_json.txt` | _paste here_ |
| 11 | Intervenções | [Link](https://www.parlamento.pt/Cidadania/Paginas/DAIntervencoes.aspx) | `IntervencoesXVII_json.txt` | _paste here_ |
| 12 | Petições | [Link](https://www.parlamento.pt/Cidadania/Paginas/DAPeticoes.aspx) | `PeticoesXVII_json.txt` | _paste here_ |
| 13 | Diário da Assembleia | [Link](https://www.parlamento.pt/Cidadania/Paginas/DADiarioAssembleiaRepublica.aspx) | `DiarioAssembleiaXVII_json.txt` | _paste here_ |

### Priority 4: International & Administrative

| # | Dataset | Main Page | Expected File | URL |
|---|---------|-----------|---------------|-----|
| 14 | Cooperação Parlamentar | [Link](https://www.parlamento.pt/Cidadania/Paginas/DACooperacaoParlamentar.aspx) | `CooperacaoParlamentarXVII_json.txt` | _paste here_ |
| 15 | Delegações Eventuais | [Link](https://www.parlamento.pt/Cidadania/Paginas/DADelegacoesEventuais.aspx) | `DelegacoesEventuaisXVII_json.txt` | _paste here_ |
| 16 | Delegações Permanentes | [Link](https://www.parlamento.pt/Cidadania/Paginas/DADelegacoesPermanentes.aspx) | `DelegacoesPermanentesXVII_json.txt` | _paste here_ |
| 17 | Grupos Parlamentares de Amizade | [Link](https://www.parlamento.pt/Cidadania/Paginas/DAGruposParlamentaresAmizade.aspx) | `GruposAmizadeXVII_json.txt` | _paste here_ |
| 18 | Reuniões/Visitas | [Link](https://www.parlamento.pt/Cidadania/Paginas/DAReunioesVisitas.aspx) | `ReunioesVisitasXVII_json.txt` | _paste here_ |

## Example of What to Copy

When you find the download link, it should look like:
```
https://app.parlamento.pt/webutils/docs/doc.txt?path=<long-encoded-string>&fich=<filename>_json.txt&Inline=true
```

## Once You Have URLs

Share them with me and I'll:
1. Add them all to the download script
2. Download all 18 datasets
3. Verify the data
4. Proceed with building the data processing pipeline

## Notes

- Some datasets might not have XVII Legislature data (especially older systems)
- File sizes vary significantly (some >10MB)
- These URLs may expire/change periodically
