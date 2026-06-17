#!/usr/bin/env python3
"""Build a short staff handout for the new dashboard control features."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)


DOCS = Path(__file__).resolve().parent
OUTPUT = DOCS / "GDD_Novas_Funcionalidades_Staff.pdf"

PAGE_W, PAGE_H = A4
MARGIN = 17 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

RED = colors.HexColor("#C8102E")
DARK = colors.HexColor("#0D0F14")
CARD = colors.HexColor("#161B22")
TEXT = colors.HexColor("#222833")
MUTED = colors.HexColor("#5D6572")
LIGHT = colors.HexColor("#D9E2EC")
WHITE = colors.white


def style(name, **kwargs):
    return ParagraphStyle(name, **kwargs)


TITLE = style(
    "Title",
    fontName="Helvetica-Bold",
    fontSize=26,
    leading=30,
    textColor=RED,
    alignment=TA_CENTER,
    spaceAfter=3,
)
SUBTITLE = style(
    "Subtitle",
    fontName="Helvetica",
    fontSize=10.5,
    leading=15,
    textColor=MUTED,
    alignment=TA_CENTER,
    spaceAfter=8,
)
SECTION = style(
    "Section",
    fontName="Helvetica-Bold",
    fontSize=15,
    leading=19,
    textColor=TEXT,
    spaceBefore=7,
    spaceAfter=4,
)
BODY = style(
    "Body",
    fontName="Helvetica",
    fontSize=9.8,
    leading=14,
    textColor=TEXT,
    spaceAfter=5,
)
BULLET = style(
    "Bullet",
    parent=BODY,
    leftIndent=11,
    firstLineIndent=-6,
    bulletIndent=1,
    spaceAfter=3,
)
SMALL = style(
    "Small",
    fontName="Helvetica",
    fontSize=8.4,
    leading=11,
    textColor=MUTED,
)
TAG = style(
    "Tag",
    fontName="Helvetica-Bold",
    fontSize=8,
    leading=10,
    textColor=RED,
)


def page_decor(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(DARK)
    canvas.rect(0, PAGE_H - 12 * mm, PAGE_W, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(RED)
    canvas.rect(0, PAGE_H - 12 * mm, PAGE_W, 1.6 * mm, fill=1, stroke=0)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(PAGE_W - MARGIN, 7 * mm, f"GDD Performance | Staff | {doc.page}")
    canvas.restoreState()


def section(title):
    return [
        Spacer(1, 2 * mm),
        Paragraph(title, SECTION),
        HRFlowable(width="100%", thickness=0.7, color=LIGHT, spaceAfter=3 * mm),
    ]


def feature_card(title, tag, body, bullets):
    rows = [
        [
            Paragraph(title, style("CardTitle", fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=WHITE)),
            Paragraph(tag.upper(), TAG),
        ],
        [Paragraph(body, style("CardBody", parent=BODY, textColor=colors.HexColor("#D4D7DE"))), ""],
    ]
    for item in bullets:
        rows.append([Paragraph(item, style("CardBullet", parent=BULLET, textColor=colors.HexColor("#D4D7DE"))), ""])

    table = Table(rows, colWidths=[CONTENT_W * 0.72, CONTENT_W * 0.20])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CARD),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#2B313C")),
        ("SPAN", (0, 1), (1, 1)),
        ("SPAN", (0, 2), (1, 2)),
        ("SPAN", (0, 3), (1, 3)),
        ("SPAN", (0, 4), (1, 4)),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def steps_table(rows):
    table_rows = [[Paragraph(n, TAG), Paragraph(text, BODY)] for n, text in rows]
    table = Table(table_rows, colWidths=[12 * mm, CONTENT_W - 12 * mm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, LIGHT),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def build():
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=MARGIN,
        leftMargin=MARGIN,
        topMargin=18 * mm,
        bottomMargin=15 * mm,
        title="GDD Performance - Novas Funcionalidades Staff",
    )

    story = [
        Paragraph("GDD Performance", TITLE),
        Paragraph("Novas funcionalidades para a equipa técnica", SUBTITLE),
        Paragraph(
            "Este documento resume as melhorias adicionadas ao menu de Staff para dar mais controlo operacional "
            "sobre presenças, exceções e alertas.",
            BODY,
        ),
    ]

    story += section("O que mudou")
    story += [
        feature_card(
            "Nova tab: Controlo",
            "Staff",
            "A dashboard passa a ter uma área própria para intervenções rápidas por atleta.",
            [
                "Pesquisar e selecionar qualquer atleta.",
                "Consultar o estado operacional atual.",
                "Corrigir presenças sem sair da dashboard.",
            ],
        ),
        Spacer(1, 5 * mm),
        feature_card(
            "Correção manual de presenças",
            "P1",
            "Quando um atleta falha o fluxo normal de check-in, a equipa pode corrigir o registo.",
            [
                "Escolher atleta e data.",
                "Adicionar check-in pela equipa.",
                "Remover check-ins criados por engano.",
            ],
        ),
        Spacer(1, 5 * mm),
        feature_card(
            "Estados operacionais do atleta",
            "P1",
            "Cada atleta pode ter uma classificação temporária para melhorar a leitura dos alertas.",
            [
                "Ativo, lesionado, justificado, limitado, follow-up ou ausente.",
                "Nota curta para contexto interno.",
                "Lesionado, justificado e ausente deixam de aparecer como falso alerta.",
            ],
        ),
    ]

    story += section("Como usar")
    story.append(steps_table([
        ("1", "Abrir a dashboard de Staff e entrar na tab <b>Controlo</b>."),
        ("2", "Pesquisar o atleta pelo nome e selecionar o resultado correto."),
        ("3", "Atualizar o <b>Estado</b> se existir uma exceção operacional. Usar a nota para explicar o motivo."),
        ("4", "Na área <b>Presenças</b>, escolher a data que precisa de correção."),
        ("5", "Carregar em <b>Adicionar check-in</b> para registar uma presença manual."),
        ("6", "Se houver um registo errado, usar <b>Remover</b> no check-in correspondente."),
    ]))

    story += section("Quando usar cada estado")
    status_rows = [
        ["Estado", "Quando usar", "Efeito nos alertas"],
        ["Ativo", "Atleta disponível, sem exceção.", "Conta normalmente."],
        ["Lesionado", "Atleta sem obrigação de presença por lesão.", "Fica fora dos alertas."],
        ["Justificado", "Ausência validada pela equipa.", "Fica fora dos alertas."],
        ["Limitado", "Treina com restrições, mas deve continuar acompanhado.", "Continua visível."],
        ["Follow-up", "Precisa de contacto ou acompanhamento.", "Continua visível."],
        ["Ausente", "Fora, indisponível ou afastado temporariamente.", "Fica fora dos alertas."],
    ]
    table = Table(status_rows, colWidths=[31 * mm, 81 * mm, CONTENT_W - 112 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.8),
        ("LEADING", (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 1), (-1, -1), TEXT),
        ("GRID", (0, 0), (-1, -1), 0.45, LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(table)

    story += section("Boas praticas")
    for item in [
        "Usar correção manual apenas quando o registo real de presença precisa de ser corrigido.",
        "Adicionar uma nota curta sempre que marcar lesionado, justificado, limitado, follow-up ou ausente.",
        "Rever estados temporários semanalmente para evitar exceções antigas.",
        "Confirmar a data antes de adicionar ou remover presenças.",
    ]:
        story.append(Paragraph(item, BULLET, bulletText="-"))

    story += [
        Spacer(1, 5 * mm),
        Paragraph(
            "Resumo: a nova tab Controlo transforma o menu de Staff num ponto de intervenção, não apenas de consulta.",
            SMALL,
        ),
    ]

    doc.build(story, onFirstPage=page_decor, onLaterPages=page_decor)
    print(OUTPUT)


if __name__ == "__main__":
    build()
