from pathlib import Path
from datetime import date

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, Image, HRFlowable, Flowable
)


ROOT = Path("/Users/anthonyosei/Documents/ChatGPT/Nice2")
OUT = ROOT / "output/pdf/nice2_project_value_readiness_and_cost_report.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

PAGE_W, PAGE_H = A4
NAVY = colors.HexColor("#071B3D")
BLUE = colors.HexColor("#145DFF")
CYAN = colors.HexColor("#16B6F4")
ORANGE = colors.HexColor("#FF6B35")
GREEN = colors.HexColor("#1B8A5A")
RED = colors.HexColor("#B83A3A")
AMBER = colors.HexColor("#B56D00")
INK = colors.HexColor("#161A22")
MUTED = colors.HexColor("#5B6472")
LIGHT = colors.HexColor("#F3F6FA")
LINE = colors.HexColor("#D8DEE8")
WHITE = colors.white


def register_fonts():
    candidates = [
        ("Inter", "/System/Library/Fonts/Supplemental/Arial.ttf"),
        ("InterBold", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    ]
    for name, path in candidates:
        if Path(path).exists():
            pdfmetrics.registerFont(TTFont(name, path))
    return ("Inter" if "Inter" in pdfmetrics.getRegisteredFontNames() else "Helvetica",
            "InterBold" if "InterBold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold")


FONT, FONT_BOLD = register_fonts()

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverKicker", fontName=FONT_BOLD, fontSize=10, leading=13,
                          textColor=BLUE, spaceAfter=12, tracking=1.4))
styles.add(ParagraphStyle(name="CoverTitle", fontName=FONT_BOLD, fontSize=31, leading=34,
                          textColor=NAVY, spaceAfter=14))
styles.add(ParagraphStyle(name="CoverSub", fontName=FONT, fontSize=12, leading=18,
                          textColor=MUTED, spaceAfter=14))
styles.add(ParagraphStyle(name="H1x", fontName=FONT_BOLD, fontSize=22, leading=27,
                          textColor=NAVY, spaceAfter=10))
styles.add(ParagraphStyle(name="H2x", fontName=FONT_BOLD, fontSize=14, leading=18,
                          textColor=NAVY, spaceBefore=11, spaceAfter=7))
styles.add(ParagraphStyle(name="H3x", fontName=FONT_BOLD, fontSize=10.5, leading=14,
                          textColor=INK, spaceBefore=7, spaceAfter=4))
styles.add(ParagraphStyle(name="Bodyx", fontName=FONT, fontSize=9.2, leading=13.6,
                          textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="Smallx", fontName=FONT, fontSize=7.6, leading=10.5,
                          textColor=MUTED, spaceAfter=4))
styles.add(ParagraphStyle(name="Callout", fontName=FONT_BOLD, fontSize=12, leading=16,
                          textColor=NAVY, spaceAfter=4))
styles.add(ParagraphStyle(name="Metric", fontName=FONT_BOLD, fontSize=19, leading=22,
                          textColor=NAVY, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="MetricLabel", fontName=FONT, fontSize=7.3, leading=9.5,
                          textColor=MUTED, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="CoverMetric", fontName=FONT_BOLD, fontSize=19, leading=22,
                          textColor=NAVY, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="CoverMetricLabel", fontName=FONT, fontSize=7.3, leading=9.5,
                          textColor=MUTED, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="TableHead", fontName=FONT_BOLD, fontSize=7.4, leading=9,
                          textColor=WHITE))
styles.add(ParagraphStyle(name="TableCell", fontName=FONT, fontSize=7.4, leading=9.6,
                          textColor=INK))
styles.add(ParagraphStyle(name="TableCellBold", fontName=FONT_BOLD, fontSize=7.4, leading=9.6,
                          textColor=INK))
styles.add(ParagraphStyle(name="Fine", fontName=FONT, fontSize=6.5, leading=8.6,
                          textColor=MUTED))
styles.add(ParagraphStyle(name="TOC", fontName=FONT, fontSize=9, leading=13,
                          textColor=INK, leftIndent=3*mm))


def P(text, style="Bodyx"):
    return Paragraph(text, styles[style])


def money(value):
    return f"£{value:,.0f}"


def bullet(text, color=BLUE):
    t = Table([["", P(text, "Bodyx")]], colWidths=[3*mm, 166*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), color),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 0),
        ("LEFTPADDING", (1, 0), (1, 0), 6),
        ("RIGHTPADDING", (1, 0), (1, 0), 0),
    ]))
    return t


def section(title, subtitle=None):
    items = [P(title, "H1x")]
    if subtitle:
        items.append(P(subtitle, "Smallx"))
    items.append(HRFlowable(width="100%", thickness=1, color=LINE, spaceAfter=8))
    return items


def metric_row(metrics):
    cells = []
    for value, label, accent in metrics:
        box = Table([[P(value, "Metric")], [P(label, "MetricLabel")]], colWidths=[40*mm])
        box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
            ("BOX", (0, 0), (-1, -1), 0.8, accent),
            ("TOPPADDING", (0, 0), (-1, 0), 8),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
            ("TOPPADDING", (0, 1), (-1, 1), 1),
            ("BOTTOMPADDING", (0, 1), (-1, 1), 8),
        ]))
        cells.append(box)
    t = Table([cells], colWidths=[42.5*mm] * len(cells), hAlign="LEFT")
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (-1,-1), 2)]))
    return t


def data_table(rows, widths, header=True, alignments=None, repeatRows=1):
    cooked = []
    for r_i, row in enumerate(rows):
        cooked_row = []
        for c_i, val in enumerate(row):
            if isinstance(val, Flowable):
                cooked_row.append(val)
            else:
                cooked_row.append(P(str(val), "TableHead" if header and r_i == 0 else "TableCell"))
        cooked.append(cooked_row)
    t = Table(cooked, colWidths=widths, repeatRows=repeatRows if header else 0, hAlign="LEFT")
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY if header else WHITE),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if len(rows) > 1:
        for i in range(1, len(rows)):
            if i % 2 == 0:
                style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F8FAFC")))
    if alignments:
        for col, alignment in enumerate(alignments):
            style.append(("ALIGN", (col, 1 if header else 0), (col, -1), alignment))
    t.setStyle(TableStyle(style))
    return t


class ReadinessBars(Flowable):
    def __init__(self, items, width=168*mm, height=85*mm):
        super().__init__()
        self.items = items
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        y = self.height - 8
        bar_x = 48*mm
        bar_w = self.width - bar_x - 14*mm
        for label, score, color in self.items:
            c.setFont(FONT, 7.5)
            c.setFillColor(INK)
            c.drawString(0, y, label)
            c.setFillColor(colors.HexColor("#E7ECF3"))
            c.roundRect(bar_x, y-1, bar_w, 5, 2.5, fill=1, stroke=0)
            c.setFillColor(color)
            c.roundRect(bar_x, y-1, bar_w * score / 100, 5, 2.5, fill=1, stroke=0)
            c.setFont(FONT_BOLD, 7.3)
            c.setFillColor(NAVY)
            c.drawRightString(self.width, y, f"{score}%")
            y -= 8*mm


def footer(canvas, doc):
    canvas.saveState()
    if doc.page == 1:
        canvas.restoreState()
        return
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, 16*mm, PAGE_W-20*mm, 16*mm)
    canvas.setFont(FONT, 6.8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20*mm, 10.5*mm, "IntAillium | nice 2 network commercial assessment | 19 August 2026")
    canvas.drawRightString(PAGE_W-20*mm, 10.5*mm, f"{doc.page}")
    canvas.restoreState()


doc = SimpleDocTemplate(
    str(OUT), pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm, topMargin=20*mm, bottomMargin=22*mm,
    title="nice 2 network - Project Value, Readiness and Cost Report",
    author="IntAillium",
    subject="Work completed, operating cost, readiness, valuation and 10% buyout assessment",
)

story = []

# Cover
cover_bg = Table([[""]], colWidths=[170*mm], rowHeights=[247*mm])
cover_bg.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), WHITE), ("BOX", (0,0), (-1,-1), 0, WHITE)]))
cover_content = []
int_logo = ROOT / "public/brand/intaillium-wordmark.png"
if int_logo.exists():
    logo_card = Table([[Image(str(int_logo), width=69*mm, height=7.5*mm)]], colWidths=[79*mm])
    logo_card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), WHITE),
        ("BOX", (0, 0), (-1, -1), 0, WHITE),
        ("LEFTPADDING", (0, 0), (-1, -1), 5*mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5*mm),
        ("TOPPADDING", (0, 0), (-1, -1), 4*mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4*mm),
    ]))
    cover_content.append(logo_card)
cover_content += [Spacer(1, 29*mm), P("COMMERCIAL ASSESSMENT", "CoverKicker"),
                  P("nice 2 network", "CoverTitle"),
                  P("Project value, work completed, readiness, operating cost and 10% buyout", "CoverSub"),
                  Spacer(1, 10*mm)]
cover_metrics = Table([
    [P("£140k", "CoverMetric"), P("70%", "CoverMetric"), P("£14k", "CoverMetric")],
    [P("current project value", "CoverMetricLabel"), P("overall readiness", "CoverMetricLabel"), P("recommended 10% buyout now", "CoverMetricLabel")],
], colWidths=[43*mm]*3)
cover_metrics.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), LIGHT),
    ("BOX", (0,0), (-1,-1), 0.8, BLUE),
    ("INNERGRID", (0,0), (-1,-1), 0.5, LINE),
    ("TOPPADDING", (0,0), (-1,0), 10), ("BOTTOMPADDING", (0,0), (-1,0), 1),
    ("TOPPADDING", (0,1), (-1,1), 2), ("BOTTOMPADDING", (0,1), (-1,1), 10),
]))
cover_content += [cover_metrics, Spacer(1, 35*mm),
                  P("Prepared by IntAillium for the nice2 company", "CoverSub"),
                  P("Assessment date: 19 August 2026", "Smallx"),
                  P("Commercial planning document - figures exclude VAT and tax", "Smallx")]
overlay = Table([[cover_content]], colWidths=[154*mm], rowHeights=[225*mm])
overlay.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 12*mm), ("RIGHTPADDING", (0,0), (-1,-1), 12*mm), ("TOPPADDING", (0,0), (-1,-1), 12*mm), ("BACKGROUND", (0,0), (-1,-1), WHITE)]))
story += [overlay, PageBreak()]

# Executive summary
story += section("Executive summary", "A decision-ready view of what exists, what it is worth, and what remains.")
story.append(metric_row([
    ("197", "COMMITS REVIEWED", BLUE),
    ("114", "API ROUTES", CYAN),
    ("70", "DATA TABLES", ORANGE),
    ("230", "AUTOMATED TESTS", GREEN),
]))
story += [Spacer(1, 7*mm), P("Bottom line", "H2x"),
          P("nice 2 network is a substantial, working social and project collaboration platform, not a prototype landing page. The production build compiles, the data model is extensive, and the product includes authentication, profiles, projects, matching, messaging, meetings, administration, safety controls and analytics."),
          P("It is best classified as <b>controlled-beta ready</b>. It is not yet a clean public-launch release because one automated test fails in the current working tree, lint has 35 errors, deployment configuration and operational controls require completion, and the current media and live-meeting architecture will become inefficient as membership grows."),
          Spacer(1, 2*mm)]

summary_rows = [
    ["Commercial measure", "Recommended figure", "Meaning"],
    ["Equivalent work completed", "£134,250", "1,790 equivalent professional hours at a blended solo rate of £75/hour."],
    ["Current as-is project value", "£140,000", "Rounded replacement value including reusable IP, brand implementation and delivery acceleration."],
    ["10% handover buyout now", "£14,000", "Ten percent of current value for the coding handover and transfer of the agreed service projects to the nice2 founders."],
    ["Completion investment", "£45,713", "Estimated 530 hours plus 15% contingency, including technical SEO completion."],
    ["Completed project value", "£186,000", "Rounded replacement value after the priority completion plan is delivered and evidenced."],
    ["10% handover buyout at completion", "£18,600", "Ten percent of the estimated completed value."],
]
story += [data_table(summary_rows, [45*mm, 34*mm, 91*mm]), Spacer(1, 5*mm),
          P("Recommended commercial position", "H2x"),
          bullet("If the development work has <b>not</b> already been paid for, the present settlement is <b>£148,250</b>: £134,250 work-to-date fee plus £14,000 handover buyout."),
          bullet("If the work-to-date fee has already been paid, the current coding and service-project handover buyout is <b>£14,000</b> only."),
          bullet("If IntAillium completes the release-hardening programme before transfer, reprice the handover buyout against the completed value: <b>£18,600</b>, with completion work billed separately."),
          P("These are commercial planning figures, not a statutory valuation, tax opinion or legal opinion.", "Fine"), PageBreak()]

# Scope delivered
story += section("1. Work delivered so far", "Repository evidence as at 19 August 2026; active uncommitted work is included in readiness but not represented as a finished release.")
scope_rows = [
    ["Capability", "Delivered evidence", "State"],
    ["Identity and onboarding", "Credentials and OAuth foundations; verification, password reset, profile onboarding, session revocation and administrator MFA.", "Strong beta"],
    ["Member network", "Profiles, follow/request/block controls, visibility settings, people discovery, warm introductions and interactive network graph.", "Strong beta"],
    ["Projects", "Creation, drafts, roles, applications, invitations, teams, milestones, updates, completion, deletion lifecycle, funding interest and sharing.", "Strong beta"],
    ["Content and community", "Posts, threaded replies, likes, reposts, mentions, saved items, notifications and public previews.", "Strong beta"],
    ["Matching and AI", "Explainable scoring, people/project suggestions, vector embeddings, provider controls, blueprint generation and feedback records.", "Beta"],
    ["Messaging and meetings", "Direct/group messaging, attachments, typing state, invitations, calendar integration, in-person maps, video/podcast rooms and chat.", "Beta with scale limits"],
    ["Administration and safety", "Role hierarchy, audit log, moderation, sanctions, appeals, safety risks, official notices, analytics and algorithm controls.", "Substantial; sign-off pending"],
    ["SEO and discoverability", "Global/page metadata, canonical URLs, index controls, Open Graph/Twitter cards and dynamic profile/share preview images.", "Foundation present; technical SEO incomplete"],
    ["Platform foundation", "Next.js 16, React 19, Auth.js, Drizzle/PostgreSQL, Vercel deployment, Neon database, CI workflow and scheduled jobs.", "Deployable"],
]
story += [data_table(scope_rows, [34*mm, 104*mm, 32*mm]), Spacer(1, 6*mm)]
story.append(metric_row([
    ("34,084", "SOURCE / TEST / SQL LINES", BLUE),
    ("34", "DB MIGRATIONS", CYAN),
    ("63", "TEST FILES", ORANGE),
    ("8 days", "VISIBLE COMMIT WINDOW", GREEN),
]))
story += [Spacer(1, 5*mm), P("Evidence quality", "H2x"),
          bullet("Production build: <b>passes</b> with 70 generated routes/pages and successful TypeScript compilation."),
          bullet("Automated tests: <b>229 of 230 pass</b>. The failing assertion concerns the exact expression used for active-account verification."),
          bullet("Lint: <b>35 errors and 3 warnings</b>, mainly inaccessible label/control associations plus four unused imports."),
          bullet("Working tree: <b>22 modified tracked files plus new draft/content files and a new migration</b>. A release tag cannot be treated as immutable until this is reconciled and committed."),
          bullet("CI exists and is designed to run dependency audit, tests, lint, build and Playwright browser testing against PostgreSQL."),
          PageBreak()]

# Effort model
story += section("2. Cost of work completed", "Equivalent commercial effort, not a claim of stopwatch hours. Rate: £75/hour, solo blended product, design and engineering rate.")
effort = [
    ("Product discovery, requirements and architecture", 95),
    ("Brand application, UX, responsive UI and accessibility", 190),
    ("Frontend application and interaction design", 370),
    ("Backend APIs, authentication and permissions", 360),
    ("Database, search, analytics and recommendation systems", 225),
    ("Messaging, meetings and external integrations", 210),
    ("Administration, moderation, safety and security", 185),
    ("Testing, deployment, migration tooling and documentation", 155),
]
effort_rows = [["Workstream", "Hours", "Value @ £75/h", "% of total"]]
total_h = sum(h for _, h in effort)
for name, h in effort:
    effort_rows.append([name, f"{h:,}", money(h*75), f"{h/total_h:.0%}"])
effort_rows.append([P("Total equivalent work delivered", "TableCellBold"), P(f"{total_h:,}", "TableCellBold"), P(money(total_h*75), "TableCellBold"), P("100%", "TableCellBold")])
story += [data_table(effort_rows, [88*mm, 20*mm, 35*mm, 27*mm], alignments=["LEFT", "RIGHT", "RIGHT", "RIGHT"]),
          Spacer(1, 6*mm), P("Why replacement effort is the right lens", "H2x"),
          P("The Git history shows an AI-accelerated delivery period, but elapsed calendar time is not an appropriate valuation method. A buyer receives the functioning codebase, schema, workflows, brand implementation, test suite and accumulated product decisions. The table estimates what a competent solo product engineer would need to recreate that asset to the observed scope and quality."),
          P("The £75/hour rate is deliberately blended. It remains lower than separately procuring product strategy, UX, senior full-stack engineering, security, QA and DevOps specialists. It also prevents the estimate from assuming agency overhead or a multi-person delivery team."),
          Spacer(1, 3*mm),
          data_table([
              ["Sensitivity", "Rate", "Work-to-date value", "10% of rounded current value"],
              ["Conservative", "£65/h", "£116,350", "about £12,200"],
              ["Recommended", "£75/h", "£134,250", "£14,000"],
              ["Senior specialist", "£90/h", "£161,100", "about £16,800"],
          ], [44*mm, 28*mm, 49*mm, 49*mm], alignments=["LEFT", "RIGHT", "RIGHT", "RIGHT"]),
          P("The final 10% figure changes if the parties choose a different rate or valuation basis. The recommended figure in this report uses £75/hour and the current rounded value of £140,000.", "Fine"),
          PageBreak()]

# Readiness
story += section("3. Readiness assessment", "Two different questions matter: how much product exists, and how safely it can be operated for the public.")
readiness_items = [
    ("Product scope and user journeys", 86, GREEN),
    ("Engineering implementation", 82, GREEN),
    ("Data model and migrations", 84, GREEN),
    ("Security and permissions", 76, BLUE),
    ("Automated quality evidence", 74, BLUE),
    ("Accessibility and inclusive UX", 64, AMBER),
    ("Operations and observability", 55, AMBER),
    ("Scale architecture", 52, AMBER),
    ("Legal, safety and governance sign-off", 50, RED),
    ("SEO and organic discoverability", 58, AMBER),
]
story += [ReadinessBars(readiness_items), Spacer(1, 3*mm)]
score_rows = [
    ["Readiness view", "Score", "Interpretation"],
    ["Feature completion", "84%", "Most intended member, project, messaging, meeting, matching and admin journeys are represented."],
    ["Production readiness", "63%", "Buildable and deployable, but release gates, monitoring, storage, resilience and governance need completion."],
    ["Weighted overall", "70%", "Suitable for a controlled pilot with support; not yet a low-touch general public launch."],
]
story += [data_table(score_rows, [46*mm, 24*mm, 100*mm]), Spacer(1, 5*mm), P("What 'completion' means in this report", "H2x"),
          P("Completion means a reproducible, supported public-launch release: all release gates pass, production configuration is verified, media and live features have an explicit scaling design, incident and recovery procedures exist, legal/safety owners have approved the service, and a measured pilot has demonstrated acceptable reliability."),
          P("It does not mean the product will never need further development. A live member network is an ongoing service with moderation, support, security, analytics and product iteration costs."), PageBreak()]

# Gaps
story += section("4. Gaps before completion", "Priority work needed to convert the current late beta into an operationally complete launch.")
gap_rows = [
    ["Priority", "Gap and required outcome", "Effort", "Acceptance evidence"],
    ["P0", "Stabilise release: reconcile uncommitted work; commit migration; fix 1 failing test, 35 lint errors and warnings; run full CI and browser suite.", "70 h", "Green CI on a tagged release; migration rehearsal succeeds."],
    ["P0", "Production configuration: custom domain, verified email sender, OAuth applications, secret rotation, least-privilege access and spend alerts.", "30 h", "Production checklist signed; recovery contacts recorded."],
    ["P0", "Operational resilience: error tracking, uptime checks, structured logs, alerts, backup policy, restore drill and incident runbook.", "55 h", "Alert test and timed restore exercise completed."],
    ["P0", "Safety and data governance: accountable owner, processor register, DPIA/retention schedule, children's access/risk assessment and qualified UK review.", "60 h", "Approved records with review dates and escalation paths."],
    ["P1", "Move profile/content media from base64 database fields to object storage/CDN with validation, lifecycle and deletion controls.", "50 h", "Load test confirms smaller DB responses and safe uploads."],
    ["P1", "Live systems: replace database polling/mesh assumptions where required with managed real-time and SFU architecture, or explicitly cap rooms/pilot scope.", "120 h", "Concurrent room and message load tests meet SLOs."],
    ["P1", "Accessibility, privacy and device QA: resolve labels, keyboard/screen-reader audit, mobile browsers and consent validation.", "60 h", "Documented WCAG-oriented audit; zero blocker defects."],
    ["P1", "Performance and scale: representative seed data, query/index review, caching, queue/background job design and load tests.", "35 h", "P95 targets and capacity thresholds documented."],
    ["P1", "Technical SEO: add sitemap and robots routes, structured data, canonical audit, indexation rules, Search Console/Bing setup, Core Web Vitals review and an organic reporting baseline.", "30 h", "Valid crawl/index controls, schema checks and search dashboards."],
    ["P2", "Launch operations: analytics funnels, support workflow, moderation SLAs, user communications and launch dashboard.", "20 h", "Named owners, dashboards and weekly operating cadence."],
]
story += [data_table(gap_rows, [14*mm, 79*mm, 18*mm, 59*mm]), Spacer(1, 5*mm),
          P("Completion estimate", "H2x"),
          metric_row([("530 h", "BASE EFFORT", BLUE), ("£39,750", "BASE COST", CYAN), ("£5,963", "15% CONTINGENCY", ORANGE), ("£45,713", "TOTAL BUDGET", GREEN)]),
          Spacer(1, 5*mm),
          P("Likely calendar: 8-12 weeks for one focused senior builder, depending on external legal review, OAuth approvals, live-media provider choice and the depth of pilot feedback. A narrow invite-only pilot can begin earlier after the P0 gates are satisfied."), PageBreak()]

# Architecture and scale
story += section("5. Operating architecture and scale constraints", "The current stack is economical at pilot size, but member growth changes the dominant costs.")
arch_rows = [
    ["Layer", "Current implementation", "Scale implication"],
    ["Web and API", "Next.js on Vercel with server-rendered and API routes.", "Good elastic base. Costs follow requests, compute, memory and transfer."],
    ["Database", "Neon PostgreSQL with Drizzle, pgvector, 70 tables and pooled connections.", "Good early-stage base. Recommendation, graph and polling queries need measured indexing/caching."],
    ["Media", "Profile images and some attachments are stored as base64/data URLs in PostgreSQL.", "Base64 adds roughly one-third encoding overhead and makes DB rows/API responses expensive. Move to object storage before growth."],
    ["Messaging", "API polling for messages/typing and database-backed notifications.", "Polling multiplies requests and DB reads per active member. Managed realtime becomes economical as concurrency rises."],
    ["Video/podcast", "Peer-to-peer WebRTC with database-backed signalling; online-room default capacity 8.", "Mesh bandwidth grows rapidly with participants and does not provide TURN/SFU-grade reliability. Keep small or adopt a managed media layer."],
    ["AI", "OpenAI or Gemini blueprint generation plus embeddings and scheduled recommendation jobs.", "Embedding cost is low; repeated generation and re-index work need budgets, batching and per-member quotas."],
    ["Email", "Resend transactional delivery for verification, password recovery and reminders.", "Predictable until notification volume and marketing sends are added."],
    ["Operations", "Vercel analytics and scheduled jobs; no dedicated error tracker found in the repository.", "Add SLOs, alerting, trace/error correlation and spend alarms before public launch."],
]
story += [data_table(arch_rows, [30*mm, 62*mm, 78*mm]), Spacer(1, 5*mm),
          P("Primary cost equation", "H2x"),
          P("Monthly platform cost is driven by active usage, not registered-member count: <b>daily active members x requests per session x data returned</b>, plus database compute/storage, emails, AI calls, and live-media minutes. A dormant member costs almost nothing; a highly active video user can cost orders of magnitude more."),
          bullet("Set budgets against MAU, DAU, messages, uploads, AI generations and live-media participant-minutes."),
          bullet("At every stage, review actual Vercel and Neon usage before the next membership cohort is admitted."),
          PageBreak()]

# Costs
story += section("6. Monthly operating and scaling costs", "Planning ranges in GBP. Platform estimates include a production web plan, database, email, AI, monitoring, media/storage allowances and current architecture improvements where noted.")
cost_rows = [
    ["Stage", "Usage assumption", "Platform / month", "Human operations / month", "All-in / month", "Platform / MAU"],
    ["Controlled pilot", "250 MAU; 50 DAU; small rooms; <3k emails", "£35-£90", "£520 (8 h)", "£555-£610", "£0.14-£0.36"],
    ["Early growth", "2,500 MAU; 500 DAU; 2m requests; 10k emails", "£120-£350", "£1,040 (16 h)", "£1,160-£1,390", "£0.05-£0.14"],
    ["Growth", "10,000 MAU; 2,000 DAU; 12m requests; 50k emails", "£500-£1,800", "£1,950 (30 h)", "£2,450-£3,750", "£0.05-£0.18"],
    ["Scale", "100,000 MAU; 20,000 DAU; 120m requests; 500k emails", "£6,000-£20,000", "£20k-£45k team", "£26k-£65k", "£0.06-£0.20"],
]
story += [data_table(cost_rows, [25*mm, 48*mm, 29*mm, 31*mm, 24*mm, 20*mm]), Spacer(1, 5*mm),
          P("Expected cost mix", "H2x")]
mix_rows = [
    ["Cost centre", "Pilot", "10k MAU", "100k MAU", "Notes"],
    ["Vercel web/API", "£15-£40", "£100-£450", "£1,000-£5,000", "Pro starts at $20/month with usage credit; requests, compute and transfer grow with activity."],
    ["Neon PostgreSQL", "£10-£25", "£80-£350", "£700-£3,000", "Usage-based compute and storage; tune scale-to-zero, autoscaling and expensive queries."],
    ["Email", "£0-£15", "£15-£70", "£70-£450", "Resend free supports 3k emails; paid tiers start at $20 for 50k."],
    ["AI recommendations", "£2-£15", "£40-£250", "£400-£3,000", "Embeddings are cheap; blueprint generation and repeated jobs dominate."],
    ["Media, realtime and CDN", "£0-£10", "£150-£600", "£2,000-£9,000", "Depends heavily on video minutes, TURN/SFU use, uploads and retention."],
    ["Monitoring, security and support tools", "£8-£20", "£80-£150", "£1,000-£2,550", "Error monitoring, uptime, log retention, moderation and support tooling."],
]
story += [data_table(mix_rows, [42*mm, 24*mm, 25*mm, 29*mm, 50*mm]), Spacer(1, 5*mm),
          P("Important: these are scenario ranges, not vendor quotes. They use a planning conversion of US$1 = £0.76 and exclude VAT, payment processing, salaries outside the stated support allowance, marketing, insurance, legal advice and office costs." , "Fine"),
          P("Cost controls to implement", "H2x"),
          bullet("Cap uploads, move binaries to object storage, compress images and apply retention rules."),
          bullet("Use event-driven realtime instead of frequent polling; batch background recommendation jobs."),
          bullet("Place per-member and per-project limits on AI generation, video duration and reminder volume."),
          bullet("Set vendor spend alerts, database autoscaling ceilings and cohort-based launch gates."),
          PageBreak()]

# Valuation and buyout
story += section("7. Current value, completed value and buyout", "A replacement-cost approach is the most defensible while there is no revenue, audited user traction or arm's-length investment price.")
val_rows = [
    ["Valuation layer", "Current", "Completed", "Basis"],
    ["Direct equivalent build cost", "£134,250", "£174,000", "1,790 delivered hours plus 530 completion hours, at £75/hour."],
    ["Delivery contingency", "Included in rounding", "£5,963", "15% of remaining work to cover release and integration uncertainty."],
    ["Reusable IP / implementation uplift", "Included in rounding", "Included in rounding", "Working system, brand implementation, schema, test suite, workflows and delivery acceleration."],
    ["Recommended project value", "£140,000", "£186,000", "Rounded, commercially legible replacement value."],
    ["10% handover buyout", "£14,000", "£18,600", "Exact 10% of the recommended project value."],
]
story += [data_table(val_rows, [50*mm, 28*mm, 30*mm, 62*mm]), Spacer(1, 6*mm),
          P("Recommended buyout clause position", "H2x"),
          P("A current buyout price of <b>£14,000</b> is recommended for a documented coding handover and transfer of the nice2 deployment projects and connected services to accounts controlled by the nice2 founders. The transaction is an operational handover, not merely delivery of a source-code archive."),
          P("If development fees are unpaid, add the work-to-date fee. This produces a present total of <b>£148,250 excluding VAT</b>. If the buyer has already paid the build fees, charging them again would double count; only the agreed handover buyout and any post-transfer support fee should remain."),
          P("Do not transfer personal vendor accounts or secrets informally. Use an asset schedule, founder-owned accounts, credential rotation, documented acceptance tests and a signed effective-transfer date."),
          P("Handover scope", "H2x"),
          data_table([
              ["Asset / service", "Required handover action"],
              ["Source and history", "Transfer the Git repository, branches, release tag, documentation, schema, migrations, tests and agreed design/brand assets."],
              ["Vercel", "Transfer the nice2 project to the founders' Vercel team; verify domains, environment variables, cron jobs, analytics, deployment permissions and billing ownership."],
              ["Database", "Transfer or recreate the Neon project under founder control; verify pooled/unpooled connections, backups, restore access and migration state."],
              ["Email, identity and integrations", "Transfer Resend sender/domain configuration and recreate Google/Microsoft OAuth applications with founder-owned credentials and redirect URLs."],
              ["AI and external services", "Reissue OpenAI/Gemini and other provider keys under nice2 billing; set quotas, alerts and least-privilege access."],
              ["Domain, DNS and SEO", "Transfer registrar/DNS control, verify canonical production URL, Search Console/Bing ownership, analytics access and sitemap submission."],
              ["Security and acceptance", "Rotate every secret after transfer, remove IntAillium access when accepted, run smoke tests and sign an asset-and-access checklist."],
          ], [49*mm, 115*mm]),
          Spacer(1, 4*mm),
          KeepTogether([Table([[P("CURRENT", "MetricLabel"), P("AFTER COMPLETION", "MetricLabel")],
                               [P("£14,000", "Metric"), P("£18,600", "Metric")],
                               [P("10% handover buyout", "MetricLabel"), P("10% handover buyout", "MetricLabel")]], colWidths=[82*mm,82*mm], style=TableStyle([
                                   ("BACKGROUND", (0,0), (-1,-1), LIGHT), ("BOX", (0,0), (-1,-1), 1, BLUE),
                                   ("INNERGRID", (0,0), (-1,-1), 0.5, LINE), ("TOPPADDING", (0,0), (-1,-1), 7),
                                   ("BOTTOMPADDING", (0,0), (-1,-1), 7)
                               ]))]), Spacer(1, 8*mm)]

# Roadmap
story += section("8. Completion plan and release gates", "A practical sequence that protects value and prevents growth from magnifying known weaknesses.")
roadmap_rows = [
    ["Phase", "Timing", "Focus", "Exit gate"],
    ["1. Release stabilisation", "Weeks 1-2", "Freeze scope; reconcile tree; migrations; test/lint/E2E; production accounts; email/domain/OAuth.", "Tagged release with all automated gates green."],
    ["2. Operational readiness", "Weeks 2-4", "Monitoring, alerts, backup/restore, security access, spend controls, incident/support runbooks.", "Alert and restore drills passed; named owners on call."],
    ["3. Safety and governance", "Weeks 2-5", "DPIA, retention/processor register, children's assessment, moderation/appeal SLAs and qualified review.", "Signed governance pack and launch decision."],
    ["4. Scale and SEO foundations", "Weeks 4-8", "Object storage, realtime strategy, queue/jobs, load tests, query tuning, sitemap/robots, schema and search tooling.", "Capacity and technical SEO checks meet agreed thresholds."],
    ["5. Controlled pilot", "Weeks 8-10", "Invite cohort, support coverage, funnel/reliability measurement and incident learning.", "Two stable weeks against SLOs; blocker defects closed."],
    ["6. Public launch", "Weeks 10-12", "Cohort expansion, communications, moderation capacity and cost review.", "Formal go/no-go with budget and rollback plan."],
]
story += [data_table(roadmap_rows, [29*mm, 23*mm, 77*mm, 41*mm]), Spacer(1, 6*mm),
          P("Minimum launch KPIs", "H2x"),
          bullet("Availability and reliability: uptime target, error rate, P95 API latency and failed-job rate."),
          bullet("Safety and support: report response time, appeal handling, blocked abuse attempts and escalation time."),
          bullet("Product: onboarding completion, week-one activation, project application conversion and retained MAU."),
          bullet("Economics: platform cost per MAU, AI cost per generated blueprint, email per active member and live-media minutes."),
          bullet("Quality: zero release-blocking accessibility/security defects and no unresolved migration risk."),
          Spacer(1, 4*mm), P("Advisory notice", "H2x"),
          P("Proceed with a controlled pilot after Phase 1-3 gates. Do not market the platform as fully complete or admit unrestricted public growth until object storage, live-system capacity and operational governance are evidenced."),
          PageBreak()]

# Assumptions
story += section("9. Assumptions, exclusions and confidence", "How to use these figures responsibly in a proposal, invoice or negotiation.")
assumption_rows = [
    ["Area", "Assumption / limitation"],
    ["Time", "No timesheet was present. Hours are equivalent replacement effort based on observed scope, not actual time worked."],
    ["Rate", "£75/hour is the stated blended solo rate. Substitute a signed contractual rate only if the parties have already agreed one."],
    ["Valuation", "Replacement cost is used because no audited revenue, churn, MAU, signed contracts or financing benchmark was supplied."],
    ["Usage", "Operating ranges depend on MAU/DAU behaviour. Registered accounts alone are not a useful cost driver."],
    ["Vendor prices", "Prices were checked on 19 August 2026 and can change. USD items use a planning conversion, not an accounting FX rate."],
    ["Legal", "This report identifies governance work but is not legal advice. Qualified UK online-safety and data-protection review remains required."],
    ["Security", "This was a repository and build audit, not a penetration test, threat-model workshop or production access-control audit."],
    ["Live service", "No production billing exports, traffic analytics, database metrics or support data were supplied. Cost ranges should be replaced with actuals after the pilot."],
    ["Rights", "Buyout effectiveness depends on signed chain-of-title, third-party licence compliance, asset schedule and precise transfer terms."],
]
story += [data_table(assumption_rows, [38*mm, 132*mm]), Spacer(1, 6*mm),
          P("Confidence levels", "H2x"),
          bullet("<b>High:</b> repository scope, route/table/migration counts, build result, test/lint state and identified architecture patterns."),
          bullet("<b>Medium:</b> equivalent effort and remaining completion effort, because requirements and acceptance history were not supplied."),
          bullet("<b>Medium-low:</b> operating cost at 10k-100k MAU, because member behaviour, video use, content volume and service-level targets are unknown."),
          bullet("<b>Commercial recommendation:</b> £140,000 current value, £14,000 present handover buyout, and £186,000 completed value remain reasonable planning anchors under the stated assumptions."),
          PageBreak()]

# Sources
story += section("10. Evidence and source notes", "Primary technical evidence came from the local nice2 repository; vendor and regulatory figures use official sources.")
source_rows = [
    ["Source", "Used for"],
    ["Local repository: README, package.json, database schema, migrations, routes, tests, CI, Vercel configuration and production build output", "Scope, architecture, counts, feature evidence and current release readiness."],
    ["<a href='https://vercel.com/pricing' color='#145DFF'>Vercel pricing</a> and <a href='https://vercel.com/docs/functions/usage-and-pricing' color='#145DFF'>Fluid Compute pricing</a>", "Pro baseline, included usage model and compute/request cost drivers."],
    ["<a href='https://neon.com/pricing' color='#145DFF'>Neon pricing</a>", "Usage-based PostgreSQL compute, storage and representative load profiles."],
    ["<a href='https://resend.com/pricing' color='#145DFF'>Resend pricing</a>", "Transactional email free and paid tiers."],
    ["<a href='https://developers.openai.com/api/docs/models/gpt-4.1-mini' color='#145DFF'>OpenAI GPT-4.1 mini</a> and <a href='https://developers.openai.com/api/docs/models/text-embedding-3-small' color='#145DFF'>text-embedding-3-small</a>", "Configured AI model unit prices and the distinction between generation and embedding cost."],
    ["<a href='https://www.ofcom.org.uk/online-safety/protecting-children/protection-of-children-duties-under-the-online-safety-act' color='#145DFF'>Ofcom protection of children duties</a>", "Need for access assessment, risk assessment, protective measures and records where children are likely to access the service."],
    ["<a href='https://ico.org.uk/media/for-organisations/guide-to-data-protection/ico-codes-of-practice/age-appropriate-design-a-code-of-practice-for-online-services-2-1.pdf' color='#145DFF'>ICO Age Appropriate Design Code</a>", "Age-appropriate privacy and design review context."],
]
story += [data_table(source_rows, [63*mm, 107*mm]), Spacer(1, 7*mm),
          P("Prepared for discussion", "H2x"),
          P("This report is designed to support the coding and service-project handover to the nice2 founders, a commercial proposal or a buyout negotiation. Before signature, attach a detailed asset-and-access schedule and replace assumptions with payment history, production usage data and agreed acceptance criteria."),
          Spacer(1, 8*mm),
          HRFlowable(width="100%", thickness=2, color=BLUE, spaceAfter=8),
          P("IntAillium", "Callout"),
          P("Product strategy, design and engineering assessment for nice 2 network", "Smallx")]

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
