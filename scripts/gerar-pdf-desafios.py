# -*- coding: utf-8 -*-
"""
Gera o PDF com a lista de desafios da Missao 30, lendo direto do Supabase.

Uso:
    python scripts/gerar-pdf-desafios.py

Le a URL e a chave do arquivo .env do projeto.
"""

import json
import os
import sys
import urllib.request
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "supabase" / "missao-30-desafios.pdf"

# Paleta da festa
TIFFANY = colors.HexColor("#81D8D0")
GOLD = colors.HexColor("#C99A4A")
PINK = colors.HexColor("#E2336B")
CREAM = colors.HexColor("#F8F4EE")
PETROLEUM = colors.HexColor("#145A63")
CINZA = colors.HexColor("#6B7C7F")


def ler_env():
    env = {}
    caminho = RAIZ / ".env"
    if not caminho.exists():
        sys.exit("Nao achei o .env do projeto.")
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        if "=" in linha and not linha.strip().startswith("#"):
            k, v = linha.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def buscar_desafios(url, chave):
    req = urllib.request.Request(
        f"{url}/rest/v1/challenges"
        "?select=title,description,type,difficulty,sort_order&order=sort_order.asc",
        headers={"apikey": chave, "Authorization": f"Bearer {chave}"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


# Faixas de sort_order -> nome da secao no PDF
SECOES = [
    (0, 9, "Missões fixas — valem para todos"),
    (10, 39, "Sorteadas — as originais"),
    (40, 99, "18+ — as originais"),
    (100, 106, "Stand de bebidas"),
    (110, 117, "Banda de pagode"),
    (120, 125, "Piscina"),
    (130, 135, "Flamingo inflável"),
    (140, 145, "Futebol de sabão"),
    (150, 155, "Mesa de decoração"),
    (160, 164, "Mesa de lambe-lambe"),
    (170, 173, "Caderninho de memórias"),
    (180, 191, "Com a Larissa"),
    (200, 207, "Gente e grupos"),
    (210, 217, "Momentos que ninguém registra"),
    (220, 225, "18+ — os novos"),
]

NIVEL = {
    "easy": ("Fácil", TIFFANY),
    "medium": ("Médio", GOLD),
    "hard": ("Difícil", PINK),
    "adult": ("18+", PINK),
}


def main():
    env = ler_env()
    url = env.get("VITE_SUPABASE_URL")
    chave = env.get("VITE_SUPABASE_ANON_KEY")
    if not url or not chave:
        sys.exit("Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no .env")

    desafios = buscar_desafios(url, chave)
    print(f"{len(desafios)} desafios lidos do banco.")

    # Numeracao continua, na mesma ordem da lista e do CSV
    for i, d in enumerate(desafios, start=1):
        d["n"] = i

    ss = getSampleStyleSheet()
    est_titulo = ParagraphStyle(
        "TituloCapa", parent=ss["Title"], fontName="Times-Bold",
        fontSize=34, leading=38, textColor=PETROLEUM, spaceAfter=6,
    )
    est_sub = ParagraphStyle(
        "SubCapa", parent=ss["Normal"], fontName="Times-Bold",
        fontSize=15, leading=20, textColor=GOLD, alignment=TA_CENTER, spaceAfter=4,
    )
    est_capa_txt = ParagraphStyle(
        "CapaTxt", parent=ss["Normal"], fontSize=10.5, leading=16,
        textColor=CINZA, alignment=TA_CENTER,
    )
    est_secao = ParagraphStyle(
        "Secao", parent=ss["Heading2"], fontName="Times-Bold",
        fontSize=15, leading=19, textColor=PETROLEUM, spaceBefore=14, spaceAfter=2,
    )
    est_item = ParagraphStyle(
        "Item", parent=ss["Normal"], fontSize=10, leading=13.5, textColor=colors.HexColor("#1A2E31"),
    )
    est_desc = ParagraphStyle(
        "Desc", parent=ss["Normal"], fontSize=8.5, leading=11.5, textColor=CINZA,
    )
    est_num = ParagraphStyle(
        "Num", parent=ss["Normal"], fontName="Times-Bold", fontSize=11,
        leading=14, textColor=GOLD,
    )

    doc = SimpleDocTemplate(
        str(SAIDA), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=16 * mm,
        title="Missao 30 — Lista de desafios",
        author="Missao 30",
    )

    story = []

    # ---------- capa ----------
    story.append(Spacer(1, 42 * mm))
    story.append(Paragraph("Missão 30", est_titulo))
    story.append(Paragraph("The One Where Laris Turns Thirty", est_sub))
    story.append(Spacer(1, 6 * mm))
    story.append(HRFlowable(width="40%", thickness=1, color=GOLD, hAlign="CENTER"))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Lista completa dos desafios", est_capa_txt))

    total = len(desafios)
    fixos = sum(1 for d in desafios if d["type"] == "fixed")
    sorteio = sum(1 for d in desafios if d["type"] == "random")
    adultos = sum(1 for d in desafios if d["type"] == "adult")
    story.append(Spacer(1, 3 * mm))
    story.append(
        Paragraph(
            f"{total} no total &nbsp;·&nbsp; {fixos} fixos &nbsp;·&nbsp; "
            f"{sorteio} sorteados &nbsp;·&nbsp; {adultos} adultos",
            est_capa_txt,
        )
    )
    story.append(Spacer(1, 14 * mm))
    story.append(
        Paragraph(
            "Documento de trabalho: use para escolher o que fica, o que sai "
            "e o que vira missão fixa para todos os convidados.",
            est_capa_txt,
        )
    )
    story.append(PageBreak())

    # ---------- secoes ----------
    for ini, fim, nome in SECOES:
        grupo = [d for d in desafios if ini <= d["sort_order"] <= fim]
        if not grupo:
            continue

        bloco = [
            Paragraph(nome, est_secao),
            HRFlowable(width="100%", thickness=0.6, color=GOLD, spaceAfter=6),
        ]

        linhas = []
        for d in grupo:
            rotulo, cor = NIVEL.get(d["difficulty"], NIVEL["easy"])
            texto = f"<b>{d['title']}</b>"
            if d.get("description"):
                texto += f"<br/><font size=8.5 color='#6B7C7F'>{d['description']}</font>"
            linhas.append(
                [
                    Paragraph(str(d["n"]), est_num),
                    Paragraph(texto, est_item),
                    Paragraph(f"<font color='#{cor.hexval()[2:]}'><b>{rotulo}</b></font>", est_desc),
                ]
            )

        tab = Table(linhas, colWidths=[11 * mm, 133 * mm, 20 * mm], hAlign="LEFT")
        tab.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 2),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 2),
                    ("LINEBELOW", (0, 0), (-1, -2), 0.3, colors.HexColor("#E3DDD3")),
                    ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, CREAM]),
                ]
            )
        )
        bloco.append(tab)
        if len(grupo) <= 6:
            story.append(KeepTogether(bloco))
        else:
            story.extend(bloco)

    def rodape(canvas, documento):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(CINZA)
        canvas.drawString(18 * mm, 10 * mm, "Missão 30 — The One Where Laris Turns Thirty")
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"{documento.page}")
        canvas.setStrokeColor(GOLD)
        canvas.setLineWidth(0.5)
        canvas.line(18 * mm, 13 * mm, A4[0] - 18 * mm, 13 * mm)
        canvas.restoreState()

    doc.build(story, onFirstPage=lambda c, d: None, onLaterPages=rodape)
    print(f"PDF gerado: {SAIDA}")


if __name__ == "__main__":
    main()
