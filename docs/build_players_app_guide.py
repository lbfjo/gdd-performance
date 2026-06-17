#!/usr/bin/env python3
"""Build a short athlete-facing guide for the GDD players app."""

from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)


DOCS = Path(__file__).resolve().parent
SCREENS = DOCS / "manual-screens"
UPDATE_SCREENS = DOCS / "athlete-update-slides"
LOGO = DOCS.parent / "public" / "logo.png"
OUTPUT = DOCS / "GDD_App_Atletas_Guia_Rapido.pdf"

PAGE_W, PAGE_H = A4
MARGIN = 17 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

RED = colors.HexColor("#C8102E")
DARK = colors.HexColor("#0D0F14")
CARD = colors.HexColor("#161B22")
MUTED = colors.HexColor("#6B7280")
TEXT = colors.HexColor("#222833")
LIGHT = colors.HexColor("#D9E2EC")
WHITE = colors.white


def style(name, **kwargs):
    return ParagraphStyle(name, **kwargs)


TITLE = style("Title", fontName="Helvetica-Bold", fontSize=27, leading=31, textColor=RED, alignment=TA_CENTER)
SUBTITLE = style("Subtitle", fontName="Helvetica", fontSize=11, leading=15, textColor=MUTED, alignment=TA_CENTER)
H1 = style("H1", fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=TEXT, spaceAfter=4)
H2 = style("H2", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=RED, spaceBefore=5, spaceAfter=2)
BODY = style("Body", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=TEXT, spaceAfter=4)
BULLET = style("Bullet", parent=BODY, leftIndent=10, firstLineIndent=-5, bulletIndent=1, spaceAfter=2)
CAPTION = style("Caption", fontName="Helvetica", fontSize=7.6, leading=10, textColor=MUTED, alignment=TA_CENTER)
SMALL = style("Small", fontName="Helvetica", fontSize=8.3, leading=11, textColor=MUTED)
TAG = style("Tag", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=RED)


def page_decor(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(DARK)
    canvas.rect(0, PAGE_H - 11 * mm, PAGE_W, 11 * mm, fill=1, stroke=0)
    canvas.setFillColor(RED)
    canvas.rect(0, PAGE_H - 11 * mm, PAGE_W, 1.5 * mm, fill=1, stroke=0)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(PAGE_W - MARGIN, 7 * mm, f"GDD Performance | Atletas | {doc.page}")
    canvas.restoreState()


def logo_block():
    if not LOGO.exists():
        return Spacer(1, 8 * mm)
    pil = PILImage.open(LOGO)
    width = 31 * mm
    height = width * pil.size[1] / pil.size[0]
    table = Table([[Image(str(LOGO), width=width, height=height)]], colWidths=[CONTENT_W])
    table.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    return table


def section(title):
    return [
        Spacer(1, 3 * mm),
        Paragraph(title, H1),
        HRFlowable(width="100%", thickness=0.7, color=LIGHT, spaceAfter=3 * mm),
    ]


def screen_image(path, max_h=104 * mm, max_w=CONTENT_W * 0.45):
    if not path.exists():
        return Spacer(1, max_h)
    pil = PILImage.open(path)
    ratio = pil.size[0] / pil.size[1]
    height = max_h
    width = height * ratio
    if width > max_w:
        width = max_w
        height = width / ratio
    return Image(str(path), width=width, height=height)


def two_screens(left, right, left_caption, right_caption, max_h=108 * mm):
    img_left = screen_image(left, max_h=max_h)
    img_right = screen_image(right, max_h=max_h)
    table = Table(
        [[img_left, img_right], [Paragraph(left_caption, CAPTION), Paragraph(right_caption, CAPTION)]],
        colWidths=[CONTENT_W * 0.5, CONTENT_W * 0.5],
    )
    table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return table


def quick_card(title, body, bullets):
    rows = [
        [Paragraph(title, style("CardTitle", fontName="Helvetica-Bold", fontSize=11.4, leading=14, textColor=WHITE))],
        [Paragraph(body, style("CardBody", parent=BODY, textColor=colors.HexColor("#D4D7DE")))],
    ]
    for bullet in bullets:
        rows.append([Paragraph(bullet, style("CardBullet", parent=BULLET, textColor=colors.HexColor("#D4D7DE")), bulletText="-")])
    table = Table(rows, colWidths=[CONTENT_W])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CARD),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#2B313C")),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def steps(rows):
    table_rows = [[Paragraph(n, TAG), Paragraph(text, BODY)] for n, text in rows]
    table = Table(table_rows, colWidths=[10 * mm, CONTENT_W - 10 * mm])
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.45, LIGHT),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def build():
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=17 * mm,
        bottomMargin=15 * mm,
        title="GDD App Atletas - Guia Rápido",
        author="GDD Performance",
    )

    story = [
        logo_block(),
        Spacer(1, 5 * mm),
        Paragraph("GDD App Atletas", TITLE),
        Paragraph("Guia rápido de utilização", SUBTITLE),
        Spacer(1, 5 * mm),
        Paragraph(
            "Este guia explica como usar a área pessoal do atleta para check-in, reservas, ranking, histórico "
            "e acompanhamento de nutrição.",
            BODY,
        ),
    ]

    story += section("Rotina do atleta")
    story.append(quick_card(
        "O essencial",
        "A app deve ser usada antes, durante e depois das sessões no ginásio.",
        [
            "Antes do treino: confirmar ou fazer reserva, quando aplicável.",
            "Ao chegar ao ginásio: fazer check-in.",
            "Durante a semana: acompanhar o objetivo semanal e o ranking.",
            "Nutrição: registar peso e consultar plano/consultas quando disponível.",
        ],
    ))

    story += section("Primeiro acesso e PIN")
    story.append(steps([
        ("1", "Abrir a app em <b>gdd-gym.web.app</b>."),
        ("2", "Pesquisar o nome e selecionar o atleta correto."),
        ("3", "No primeiro acesso, definir um PIN pessoal de 4 dígitos e confirmar."),
        ("4", "Nos acessos seguintes, usar o mesmo PIN para entrar na área pessoal."),
        ("5", "Se esqueceres o PIN, falar com o staff para fazer reset."),
    ]))
    story.append(Spacer(1, 4 * mm))
    story.append(two_screens(
        SCREENS / "player-05-athlete-login.png",
        SCREENS / "player-02-pin-entry.png",
        "Entrada na área pessoal",
        "PIN pessoal de 4 dígitos",
        max_h=102 * mm,
    ))

    story.append(PageBreak())
    story += section("Check-in e progresso semanal")
    story.append(Paragraph(
        "O check-in regista a presença no ginásio. Cada presença entra no total semanal e no histórico do atleta.",
        BODY,
    ))
    story.append(steps([
        ("1", "Entrar na área pessoal ou usar o kiosk de check-in."),
        ("2", "Confirmar o check-in quando chegar ao treino."),
        ("3", "Ver o progresso semanal no ecrã Início."),
        ("4", "Se estiver sem ligação, o check-in fica pendente e sincroniza quando voltar a existir internet."),
    ]))
    story.append(Spacer(1, 4 * mm))
    story.append(two_screens(
        SCREENS / "player-03-checkin-button.png",
        SCREENS / "player-06-athlete-home.png",
        "Botão de check-in",
        "Resumo semanal e objetivo",
        max_h=105 * mm,
    ))

    story.append(PageBreak())
    story += section("Histórico, ranking e reservas")
    story.append(KeepTogether([
        Paragraph("Histórico", H2),
        Paragraph("Mostra as presenças já registadas, organizadas por data.", BODY),
        Paragraph("Ranking", H2),
        Paragraph("Permite comparar sessões acumuladas com o grupo. O ranking ajuda a acompanhar consistência.", BODY),
        Paragraph("Reservas", H2),
        Paragraph(
            "Mostra os dias úteis disponíveis e os slots de treino. Algumas reservas só abrem 24h antes. "
            "Quando a reserva ainda pode ser cancelada, aparece a opção Cancelar.",
            BODY,
        ),
    ]))
    story.append(Spacer(1, 4 * mm))
    story.append(two_screens(
        SCREENS / "player-07-athlete-history.png",
        SCREENS / "player-08-athlete-ranking.png",
        "Histórico de presenças",
        "Ranking do grupo",
        max_h=100 * mm,
    ))
    story.append(Spacer(1, 4 * mm))
    story.append(two_screens(
        SCREENS / "player-09-athlete-bookings.png",
        UPDATE_SCREENS / "05-reservations-24h.png",
        "Reservas de treino",
        "Slots disponíveis 24h antes",
        max_h=92 * mm,
    ))

    story.append(PageBreak())
    story += section("Nutrição, peso e plano alimentar")
    story.append(Paragraph(
        "A área de Nutrição concentra o peso, o plano alimentar e as consultas quando a equipa abre vagas.",
        BODY,
    ))
    story.append(steps([
        ("1", "No Início, registar o peso do dia em kg, idealmente em jejum."),
        ("2", "Na tab Nutrição, consultar o plano alimentar atribuído pelo staff."),
        ("3", "Ver o histórico recente de peso para acompanhar evolução."),
        ("4", "Quando existirem vagas de nutrição, reservar uma consulta disponível."),
        ("5", "Se já não puderes ir à consulta, cancelar a marcação para libertar a vaga."),
    ]))
    story.append(Spacer(1, 4 * mm))
    story.append(two_screens(
        UPDATE_SCREENS / "02-checkin-success-weight.png",
        UPDATE_SCREENS / "03-weight-entry.png",
        "Peso associado à rotina diária",
        "Registo de peso",
        max_h=98 * mm,
    ))
    story.append(Spacer(1, 4 * mm))
    story.append(two_screens(
        UPDATE_SCREENS / "04-reservations-open.png",
        SCREENS / "player-06-athlete-home.png",
        "Reservas/consultas abertas",
        "Plano e progresso no Início",
        max_h=88 * mm,
    ))

    story.append(PageBreak())
    story += section("Privacidade e problemas comuns")
    privacy_rows = [
        ["Tema", "O que o atleta deve saber"],
        ["PIN", "O PIN é pessoal. Se for esquecido, o staff pode gerar um novo."],
        ["Staff", "A equipa consegue ver presenças, reservas, peso registado e plano alimentar."],
        ["Check-in errado", "Falar com o staff para corrigir o registo."],
        ["Reserva errada", "Cancelar na app se ainda estiver disponível; caso contrário, avisar o staff."],
        ["Peso errado", "Atualizar o registo do dia ou avisar a equipa se for necessário corrigir."],
        ["Nome não aparece", "Confirmar com o staff se o atleta está ativo na plataforma."],
    ]
    table = Table(privacy_rows, colWidths=[34 * mm, CONTENT_W - 34 * mm], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.8),
        ("LEADING", (0, 0), (-1, -1), 11.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), TEXT),
        ("GRID", (0, 0), (-1, -1), 0.45, LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(table)
    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph(
        "Resumo: reservar quando necessário, fazer check-in ao chegar, acompanhar o objetivo semanal e manter "
        "a nutrição atualizada.",
        SMALL,
    ))

    doc.build(story, onFirstPage=page_decor, onLaterPages=page_decor)
    print(OUTPUT)


if __name__ == "__main__":
    build()
