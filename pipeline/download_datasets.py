#!/usr/bin/env python3
"""
Download Portuguese Parliament Open Data datasets
"""
import requests
import json
import os
from pathlib import Path
from datetime import datetime

# Base directories
BASE_DIR = Path(__file__).parent.parent
RAW_DATA_DIR = BASE_DIR / "data" / "raw"

# Ensure directories exist
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Known download URLs (extracted from web navigation)
DATASET_URLS = {
    "IniciativasXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=8qAFYV%2bND88Tcu74CiYiRrJp3np5JFx8zP%2b4auPrYb2ffxez5eu2W2Okp1Rv7bvAtUPYSNjuONSqh0gLPeb5nEgZRR7FTuVIB9jzfjYENyFoghZ4wFzawnfDsVR0D9gyn98E8wGhR7HcMAxmA4rOQ%2bUzyU4l15zwAOmVsHw1395dSdpIHfRMhTJ2We%2fx9BtpcmL0BgGgFCoI112PBYTtY5hx%2bLCpe9MfzKWYqheiVv%2f2oLaJ3m2quCGCP4IlCSYkBppbjn6VrxMzZGrcFBN4zR1T4uGluS41EqNdVrki9EQHG%2fQQDd9PYakAtMSF%2f7Eg2m7uM%2fEmEhkHVePtUepC%2fS88MX9%2fD5GIv9d4Ihj%2b9%2fWq%2b%2fGScHLBm%2bvrJovAqzK1&fich=IniciativasXVII_json.txt&Inline=true",
        "filename": "IniciativasXVII_json.txt"
    },
    "DiplomasXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=ncEQj0BvVzq43cGPD0LnIHjkUhJsFH6c%2bzrHwvGS1w5uzSNaWr4BKC%2f2uYTIluy9GhrOD38lvhBFGLkz8Dh7b6BSXxSrlSFJaH0MwvIwWeutv3KSliye0xlUywLRak5I5DPNkom1XBR42g6hNVhlrEZCbIDplV796extuSb%2bGoZWN%2fduEfVpYlHrNJrEtIXwTQ2Rj7YPYzDSvrIAMxwzoB8sPikrA3s8NOfzzJwC663VHxbuXVAXDnMBObV0kUE7YCktzyllqtxzkAJusbMPNJNlQMgiDmEQw4o9RWhQDBgLGCBmTBBEqrSbxuV5SQPof%2b2Kq0%2fExQ31Cw7zZBXjFhf%2fIItcll1sxPqHL6NcOzxhX9%2bKJevT6B2uLhOa4NlY2NhHpnRPyBguYtoclF0HEQZOEYEm90EvUHYD5Zj1%2fAw%3d&fich=DiplomasXVII_json.txt&Inline=true",
        "filename": "DiplomasXVII_json.txt"
    },
    "AtividadeDeputadoXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=NEsnzvmAGsRIjf8%2bbjGSiNK3Ckru0IZNjnIUiF3BjozfWb9um5JU6q8GCc%2bOI%2bZGltDZF0NgF48HhVRoMzbaEkzzxnmF2axmmIDuiQDGnjL6rwJNvlrLdPjGTmgHJsWMSUoaXa40nBBYrHYOIzW1sCu8cCSYa5xPCM%2bOCFKpB63lF0Zm%2b8oL2Jq1JqhIJUQldPGJsnlcK0pjGU3oeFqSH%2bSS1BKK%2fbos6UPJMpZgxfQ9TaLGDNgM6YUeUCEBpOCQN8DllTXFn9WJG2HjEqXcHVmUe6EcR13BwnMW579vhNz%2bVAybZ9qKM6bFedMLjCEyXcsBb6VLkr512P6QnYXK%2fVIVQ%2bJND7Oq4r7JRTCw%2fbJDWushAF%2btJpJbpKhDnn52HurC62knz2BjWw84KqlRdz%2fF5QEpreuPgYvfrWaD7DRvUdEXzFVlqmfKQ3qjyHqS&fich=AtividadeDeputadoXVII_json.txt&Inline=true",
        "filename": "AtividadeDeputadoXVII_json.txt"
    },
    "AgendaParlamentar": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=Xgq6sgh%2bTN5pj9VfviNWS4KzdWqWuCpbuS3yBlPk0eDp6pPqdeMV1BxRQKnQZH95fRWfQ%2f5Sx%2bEc2zsH8B16hi%2feH%2fldpvNEk7XcuG31Q5mJForIip6M68wywSWtzjGo3imuSuXXTvK3gn%2bfKfmlJVWNaKv1YcirpuqJSTiFuOPwYWdjOuqb0ycM6mZ0bsk6als64hqpaBASStfx8PfV5ABBrTVlnr8fXDDVob%2bkkNZwF5QfBBcfzm%2bSRakaBq0YYWMahPADhJgTzD9CozMR%2f0FHrg7t1cq16ayVzlL3z6%2f7U2g5brHITmjKT6iBPulEB1SP7Ioqz2GL3MSBDXMwoJQDtlsLwZ4LJeQIRyJ9dvIcToIMi3CFutivv2f2OBpk1aZ%2fwbx18pvplzBXNqm%2bXg%3d%3d&fich=AgendaParlamentar_json.txt&Inline=true",
        "filename": "AgendaParlamentar_json.txt"
    },
    "OrgaoComposicaoXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=KxtiyWCVUBVnrnse497mvJ2rXFsgDH6SsTS3TmVuKUZ%2baLtoGjKlC8Kp%2fWf3xe1L1WkOMnGhBNflUrEK4IpGR9lD2dwMv2ozQH6NeNXLmN18chbPr8qLipFziYUD%2fWR9SsiQ2m9TlKAnCW43fzLsvItZvICtXQt9Dl4Y%2bo0Uw0KjjkclxaByt8ZZseBP2IgW1wU5uTRlT8qNX0IXYIZbfx2qJwGQ9PlBL3rf1EF2C0RPfwcqkB3zU2w94xZC%2b%2b8e%2f%2febQvqpzuzxaNuTvK7KRq1Eyg4NsgBKCsU0WZq8iSmLC5Jjp3qwLT4q80zX9WktTT20M2YhWzkUjeYiUbAtvU5oGLWZB%2ftx2yEwdKdM3iTK7uFttDykgXqxnN0zwpLFQFW3l0%2bBkawKf9G6OGysfEgSJDS5seXKc6kFXiR0wP0%3d&fich=OrgaoComposicaoXVII_json.txt&Inline=true",
        "filename": "OrgaoComposicaoXVII_json.txt"
    },
    "DelegacaoEventualXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=zR%2btpZ%2flX%2bOhIAv525yRZaZFPxfMW%2bjKH6VE47yqjLzMTkoqzwAXkI%2fWhGBpu1DgWJU2AMCSGkgMGtq1pLZgOQWQGshpBRCnz6PDFjyCPV6m0IuEcb3Qa7jaM6WeXBEg2n8s%2faRutD9q1cqnk2%2fwvq56Ak2tvxGSFlf2Z%2bNBlJCgUGf%2fmby%2b84FultUGiUynxMULvxS73B3PAj%2br8oAguyKDcJx%2ffmeg%2fms8haAnxsjy1lk7DQCfo0ljObs%2bahbp1Vh8hMik8g6Rw18uhtZccrbTBIgob40vTr10OoOcoF2vkpdPpFu1SXmeB917xJLocu6qZYrCZh8gxN41KAjH9nAJH79h5BEzRHyd5ievD%2fTF7Q6k9UY2Hs4%2fvsjqsdnHoqLnbtDd4VLpbmBr8aOh6kbRFZwoXHoEODNqUNtq0Bo%3d&fich=DelegacaoEventualXVII_json.txt&Inline=true",
        "filename": "DelegacaoEventualXVII_json.txt"
    },
    "DelegacaoPermanenteXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=6ieYHRJ5BiUmwMK2sPCwapyQCFO4SzyixGeOjkWgAFNTmImL6Jry6t61f%2fPLDa9OG9v%2bvbH3W5g5gUzyJ70hVAFxbp9dU8%2b%2b7%2fiquaBxleCjQ5%2b5A%2fouutAM2wWL2IYvJ7wfZOr3YRyxPrSR8alQSo%2fn7g4S8O9ORaDsKQzzcl6lfF5KcMepJYbuZJy8VjpFUv5tCH%2buAJPho3SWO2mL2Crutccyq7Pzene3Ezop%2fT00Wm34tTE3I821MRJCLX35UE%2fJLRkx%2f7Zp5SfDFPvmgnyPNdvTbnsflI5LX8TFontjcip%2fju9dlm7xOUo2Ts6z4PFZcdo4KsmmNd0tLb%2bEKf4LHtELRrmJSbznL%2fiIrBe7PWUmmd2KIOCfJUC5BqHNYLB51Z%2fM77cd45IS8wgJ53hE8Lw4o0oGnyxm7wDtd4A%3d&fich=DelegacaoPermanenteXVII_json.txt&Inline=true",
        "filename": "DelegacaoPermanenteXVII_json.txt"
    },
    "GrupoAmizadeXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=d43eKTKYYi%2bvQph3fdksytDQ4mZA64DfZi3Vk7W6ZUANqZxRjd495y85ExMibv0Bs3ASv6iE%2bKkt6W%2fZlWU2I%2fy89EPeyt3fTYi0YkQvWJmXune1Ov2OiwC9Yrvm%2bVkl4W55ccMiMlVT%2fF9JClwehAPT6QgS4yU4NGMfw5e2729iVtReRMyuXClLnTEQ17%2f89wmP6AgbX3LM8cb7n1nvVCfeQSL0q35BdOeegeDN5CT3b1VklG3inev1lnYkNyplpozmaPYgQReK1MiVwKgkzpXq7osohqmHclwNZGQ3J78V5oTdgg%2bJf9ArdBsqLbPnavn%2feEAZibBZFNpSq2s3aauNV99JNQ2ijRu7kFSbjkwTkrcvPvbQllN7ewxq9f8Upufc84RBUjkKHO%2fEF7618BTxiWWygtZ%2bCCJ9jxZlamA%3d&fich=GrupoDeAmizadeXVII_json.txt&Inline=true",
        "filename": "GrupoDeAmizadeXVII_json.txt"
    },
    "InformacaoBaseXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=7PIFfzejZ0pwn7eo1mHlAXIdA27v%2fzrta%2fir1T3heg6q45TFwPsu%2bbz9M6T3Vc4FpkKreeKDa7lEhBGKcVJ5N7t%2bS6HKM2wiXtdClWgiXssyJeu1YTAcyk3lOvMoMqWqRzzp9K91agGW0qJ4FkX%2f1iQA5zvlLVpwk0nq0cRdgH2hEsJw4vFnxyQaJWLA5l3sgck1kwcSWgTWWyK2E9fniFW9pPUfVCGZ1R4gPOVlyyHKd0JN1a4Za7pqfGTuew0mYf5K7PJFHZxxOqMQJYBf%2fpJ68d2hAlEd3kHTbmPIPeHOaIClPp7oWGFPPhgOoGCIcYeABfduHFPYo92YrgDNO9RnwBa7x%2fwt%2bemlDMBU%2by%2bVPesErm%2fhxU8b9Und9%2fFU&fich=InformacaoBaseXVII_json.txt&Inline=true",
        "filename": "InformacaoBaseXVII_json.txt"
    },
    "IntervencoesXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=olwhADKcX6saa0z%2fdzSSCOKWwQsEg%2fwqkkDEvF2KcVGAl3h8rntCFlLNRVCLcQ5rYJ7VNC5Lo%2bj5zNDF9PIKViGEBY%2fYOX8Bt2DTaiMCI%2f3vRrKG%2bu%2bXzGyiNcSIWPCEKuosH0FoRt%2bRG2aPiSwYPq9j%2bsomMLzxwSxng8X9zeFKwndiBSQpfBBUPcUDg5V%2bpOCn3sOb2A8xgBjT%2brZwaudXy3PxgYStycembfX%2feFtU72q23bP5LOH0llmBx0MJDImlk5Og2%2bEjGle9C4Sgq1lXPkh4W88stgp4h%2bMAWUS9m18ls63AG18To8thEKwHiKVq%2fmD2Rox0nMzGom%2bWBSVrmStdXflFZNHbZKtIkjcYRbIV9CuHpSDltoL5MJ2%2f&fich=IntervencoesXVII_json.txt&Inline=true",
        "filename": "IntervencoesXVII_json.txt"
    },
    "PeticoesXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=VegXspjhO5PrU7WQ5kcrzl9eMSyvDp535HErjFTK1EW77jWzp55W49y1eFPVxfSuvWqiDcBFmPchRGO%2fuauFA4w%2bsA%2fvVWKhxH%2fwz%2f%2faH4yvWDxX1NMdH2x%2f2hLjTIvjw%2b60mU1rv3qGPWG3AacOGuIxZaLIJFYPllR0r5N%2fXyNmyGNnNic%2f3A3TP4HrzEuHtQ%2b8CO92oxsYvqxqXqVYhnxLmSvwEQKl1GV5JSUbVTfPMldtKIT%2b%2bP%2f56Fp%2bCxMewgx3x6dwV3Znjv5v7Ip3s6xWbCyb%2b8AKVmZR3JGbiu52fpaRR%2ffOSUPcZdOQd%2f6ppoZpZZqY5PRI4fl%2bDcM9DbqqfxBIIPdGfThxQRmL0wVlqg4P%2bjOUPM9Czq7aDMUH&fich=PeticoesXVII_json.txt&Inline=true",
        "filename": "PeticoesXVII_json.txt"
    },
    "RequerimentosXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=iUXm7jxjaxCfv5GBXl16zH5I8Sl6woUKL0%2foP3ONljuxmNTJ73Fw3mL4lSEm%2bVVpLAtdR5GCQPMWgNG8h86IzR0WlGJJNyOY%2b0qQrpbvSQCJOJeOHZ78c8cKcN%2fMJRPVE%2ft3hUbSsVXCPzmCIJs43iQ2u9UH4ma1ZIkpsAz9zWpHXDa5Cei6ooZSQrq5WjFhu3c01t1WENGSEE7TXGO7f2u9rXV2YyH%2fKd6uNgn3En7Do5OmaT3ORe9Lz9gZ9WsFHxYHhZFDZq%2fSmLABRePJdjr9DYqnjE9Yk0TB9xRDubdRyzQs845xcHmoSq0i8ZQM%2ftzYJWn9c2%2bSs1hgkqUC1XsoAVFV5IiJiQskPOI5HRKLMG0gI9iP2wMhi3R7oj8STuGxirOoiPxlft%2f3J56VCQ%3d%3d&fich=RequerimentosXVII_json.txt&Inline=true",
        "filename": "RequerimentosXVII_json.txt"
    },
    "RegistoInteressesXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=f6V6wDpvE5C3BeYRDWuSMlv5bvWji7Tgc9MmhEtj1vN5zwLnf1vd3%2bzOsozQkgUpnzo16qW9ILO1APDWAVsyXOFuliI%2b8y0ZK2NqdLtDofsrtdjBAQzuLo21WwAcbJjHlMp5KLrh2qxksl%2bjXQ%2bMDazyHqLKR64zo%2f3k44sRxp1V9FswgTOkb4IQLWLCG2LnNhqB6tEkf0Raa8dxgaKfOUe5oHPD8U7rVy2myzKDpfh71YK%2fryWgc8QMi5N%2bJhur%2bc8KZchtCOldQr4dqPelWqfU1SSdIXdn9Fhk55sWyjcNJDTkeqRMsTjm%2bU3Vn3UtKLEBPXL65DQHlaE2ES2DPqmxrcm41H6RrFGUzmBFgmpZcaNI1MHvqBJrWISo%2frFPUEP0qbL4WS%2blBbXKczh%2faw%3d%3d&fich=RegistoInteressesXVII_json.txt&Inline=true",
        "filename": "RegistoInteressesXVII_json.txt"
    },
    "RegistoBiograficoXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=Eh7GMztBbJqTHKAXVNYoO0nCHFm4gApgxuE%2bvDcZB%2fv5OKAnJRIhYjksKB21YmyduBp5uuYUckbsAZ23DwNaP0IlKgRun12JOIdEVNi%2fqiMjZuWFnEuDXU2NKbHrUo%2fqPbVQHH73GpepyzbeRoa%2bTVBis%2fmYpATcUN9ubxpa3HczFhJOaSD51SFkxF7j%2b8IKc%2fqDCui%2fJobwjc0ls9CkGuhRQcSJPiNFnjRE447ScO3p6ttwtdTTeYMBaHr%2fLK5xS44pP1sstTzb2SqUfpUNAPk2a66S8wULHhC3f9KNLcg0ZYO%2fJb%2bvLqvcFKamVA6X%2bZjgiQrvcn6yjLk6AWwiXvF2pjUlcsaF9eo7sLeUhj59VjlEc5gOuGmmIR%2fr1AtZomvbckLUtvS6PXtcz8SPmajJhtLsBCAgB5Uf303DHXw%3d&fich=RegistoBiograficoXVII_json.txt&Inline=true",
        "filename": "RegistoBiograficoXVII_json.txt"
    },
    "ReunioesVisitasXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=3X36LcAWcIfqQc7NUOJFmEj9YJuJ72sdkqfcfNpFAzCiLXLgL5%2fPskDa68itCZ548MXiiPGFZlU6KijGs%2fPEAn7Nk7TuTnuacDAxHbJ6YFJuBoEeecrqGbyZwbnuGmRWx6OBV78ao2wO%2fxNjctzcQdqJV11a7oHskiDyRvzJGyhRQ8BLn%2bhfskrReqFzp%2bYEJieED436brSfqbDVqFhLUur1uM4fgf3zT%2bcug6qtIX1VXHsLFb%2fhZKO0EWvZt%2b5ORW0rSdZoK4vZDl9FiJh5OmNqbsCiPHx%2fvz%2f%2bmL%2fZVNFkm%2bg%2bzM6mB3XLIW9hhZ2QdbYYCw8M5Spz0AO%2bDg2NIUfXmVz%2fRH5epPF4dozj9AJ3cI0O7OjkkP7L2Tm2Y%2b%2bSRKL9AShllGNx0vMxWl6hgg%3d%3d&fich=ReunioesVisitasXVII_json.txt&Inline=true",
        "filename": "ReunioesVisitasXVII_json.txt"
    },
    "AtividadesXVII": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=%2bVwF5lc3LhRIZUmEWA%2buWgo7ATT4yjpkzD1D0iut6uu3hjLhblitjv9sVihy32gQhoFWHoDMQ%2boYMCCjeFKhRtqw0PK8L2vPYqMH%2bnQfkY1oCtuadhcGPvyNo9hrpjRYUdNf8S1rJcQAxE2nssh%2bFNFdnIkoxv9oMgdl4PROOApOAAh3uYqx4%2fi9fovRqi%2f2ZUejvvoBehtr5kTE%2faq2s0%2beqogAj76DOK9kLG%2bEQqgIeLn%2f94%2fVKBIErReiI5IKFp4Y2fa5r3WV9Ag0pRZx2%2fOusN08%2buz%2b7xV%2fJpRqaT2tARzjtptsWOsL9PZzXw%2fklM0td1%2fvzDTndP2SEHP6SJphrWXNci3AnfNxDuMf77c8kJhmcc1sJFIMWE0Dwahy&fich=AtividadesXVII_json.txt&Inline=true",
        "filename": "AtividadesXVII_json.txt"
    },
    "OrcamentoEstado2026": {
        "json": "https://app.parlamento.pt/webutils/docs/doc.txt?path=Arq2rveOwHK009xorKAWcWCsKns8WdTLwSTE5n0%2fc%2fS02wue%2bsDauzaq24lp5Z9BiKQYoknCx82SEBpHhqx765fguhOzgZ1RgeElgjfIjh%2b2Xl9IE1TCOl74AxLac2lLhTpelQRG6AteXB4zrD5PZ9EDyhHBnjRrvNswPYTw%2fY%2f8JCCCmQdj%2f5w4VhlDGDjw42rZaTDYQ4ddnlVPreeQvDyrExQwvC%2b%2f7NF4Q1L9znxFsDjhOI3icalH8FjE1aESOsSkbni3a0OpchBZBkEgUcLwLfZ%2fqQekrKrKdRh%2f%2b%2by7fIF9t0r6dkbLqPl5DRLcyz48idjUV4O5deSZlEguoxxslG9RxU26%2b6Qm2LUZNAFseyuqTdiBD91YlcXfCunL6SiRN9GMYGk8vffJ%2fihPDQ%3d%3d&fich=OE2026Or_json.txt&Inline=true",
        "filename": "OE2026Or_json.txt"
    },
    # Add more URLs as we discover them
}


def download_file(url, output_path, dataset_name):
    """
    Download a file from URL to output_path
    """
    print(f"Downloading {dataset_name}...")
    print(f"  URL: {url[:80]}...")
    print(f"  Output: {output_path}")

    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()

        # Save file
        with open(output_path, 'wb') as f:
            f.write(response.content)

        file_size = len(response.content)
        print(f"  [OK] Downloaded: {file_size:,} bytes ({file_size / 1024 / 1024:.2f} MB)")

        # Try to validate JSON
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            print(f"  [OK] Valid JSON: {len(data) if isinstance(data, list) else 'object'} items")
        except json.JSONDecodeError as e:
            print(f"  [WARN] Not valid JSON: {e}")

        return True

    except requests.exceptions.RequestException as e:
        print(f"  [ERROR] Error downloading: {e}")
        return False


def create_manifest(downloads):
    """
    Create a manifest file tracking what was downloaded
    """
    manifest_path = BASE_DIR / "data" / "manifest.json"

    manifest = {
        "download_date": datetime.now().isoformat(),
        "legislature": "XVII",
        "datasets": downloads
    }

    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print(f"\n[OK] Manifest created: {manifest_path}")


def main():
    """
    Main download function
    """
    print("=" * 60)
    print("Portuguese Parliament Data Downloader")
    print("=" * 60)
    print()

    downloads = []

    for dataset_name, dataset_info in DATASET_URLS.items():
        url = dataset_info["json"]
        filename = dataset_info["filename"]
        output_path = RAW_DATA_DIR / filename

        success = download_file(url, output_path, dataset_name)

        downloads.append({
            "name": dataset_name,
            "filename": filename,
            "success": success,
            "path": str(output_path.relative_to(BASE_DIR))
        })

        print()

    # Create manifest
    create_manifest(downloads)

    # Summary
    print("\n" + "=" * 60)
    print("Download Summary")
    print("=" * 60)
    successful = sum(1 for d in downloads if d["success"])
    print(f"Total datasets: {len(downloads)}")
    print(f"Successful: {successful}")
    print(f"Failed: {len(downloads) - successful}")
    print()

    if successful > 0:
        print("Downloaded files:")
        for d in downloads:
            if d["success"]:
                print(f"  [OK] {d['path']}")


if __name__ == "__main__":
    main()
