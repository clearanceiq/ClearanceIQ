import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, ListFlowable, ListItem

OUT = r"C:\Users\Najmi\Documents\Tycoon\site\public\kit"
os.makedirs(OUT, exist_ok=True)

NAVY = colors.HexColor("#0f172a")
BLUE = colors.HexColor("#2563eb")
MUTED = colors.HexColor("#475569")
LINE = colors.HexColor("#cbd5e1")

ss = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=ss["Heading1"], textColor=NAVY, fontSize=18, spaceAfter=6)
H2 = ParagraphStyle("H2", parent=ss["Heading2"], textColor=BLUE, fontSize=13, spaceBefore=10, spaceAfter=4)
BODY = ParagraphStyle("BODY", parent=ss["BodyText"], textColor=colors.HexColor("#1e293b"), fontSize=10, leading=14)
SMALL = ParagraphStyle("SMALL", parent=ss["BodyText"], textColor=MUTED, fontSize=8, leading=10)
DISC = ParagraphStyle("DISC", parent=BODY, textColor=MUTED, fontSize=8, leading=11, spaceBefore=10)

def header(title, sub):
    return [Paragraph(title, H1), Paragraph(sub, SMALL), Spacer(1, 8)]

def bullets(items):
    return ListFlowable([ListItem(Paragraph(t, BODY), leftIndent=10) for t in items], bulletType="bullet", start="square")

def footer(c, d=None):
    c.setFont("Helvetica", 7)
    c.setFillColor(MUTED)
    c.drawString(0.75*inch, 0.5*inch, "ClearanceIQ - educational toolkit. Not legal advice. Verify with a licensed broker / CBP before filing.")
    c.drawRightString(LETTER[0]-0.75*inch, 0.5*inch, "clearance-iq.com")

def build(name, title, sub, blocks):
    doc = SimpleDocTemplate(os.path.join(OUT, name), pagesize=LETTER,
                            leftMargin=0.75*inch, rightMargin=0.75*inch, topMargin=0.8*inch, bottomMargin=0.7*inch,
                            title=title)
    flow = header(title, sub)
    for b in blocks:
        if isinstance(b, tuple) and b[0] == "h": flow.append(Paragraph(b[1], H2))
        elif isinstance(b, tuple) and b[0] == "p": flow.append(Paragraph(b[1], BODY))
        elif isinstance(b, tuple) and b[0] == "list": flow.append(bullets(b[1]))
        elif isinstance(b, tuple) and b[0] == "table":
            t = Table(b[1], colWidths=b[2]); t.setStyle(TableStyle([
                ("GRID",(0,0),(-1,-1),0.5,LINE),("BACKGROUND",(0,0),(-1,0),colors.HexColor("#e2e8f0")),
                ("FONTSIZE",(0,0),(-1,-1),8),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),4),("TOPPADDING",(0,0),(-1,-1),3)])); flow.append(t)
        flow.append(Spacer(1,6))
    flow.append(Paragraph("ClearanceIQ is an independent educational platform. Not affiliated with CBP, FDA, USDA, or any government agency.", DISC))
    doc.build(flow, onFirstPage=footer, onLaterPages=footer)

# 1
build("supplier-verification-worksheet.pdf","Supplier Verification Worksheet","ClearanceIQ Import Kit · Supplier Due Diligence",[
 ("p","Use this worksheet before you send a deposit. Complete one row per supplier you are seriously considering."),
 ("h","Red flags (stop and get answers first)"),
 ("list",["No business license / import-export code provided","Refuses video call or factory tour","Only accepts irreversible payment (T/T to personal account)","Prices far below market with no explanation","No HTS or country-of-origin documentation"]),
 ("h","Verification checklist"),
 ("table",[["Check","Pass?","Notes"],["Business registration verified","","",],["Product matches description/spec","","",],["Sample shipment inspected","","",],["HTS code provided by supplier","","",],["Country of origin declared","","",]],None),
])
# 2
build("commercial-invoice-checklist.pdf","Commercial Invoice Checklist","ClearanceIQ Import Kit · CBP Entry Accuracy",[
 ("p","CBP uses the commercial invoice to classify and value your goods. Errors trigger holds and penalties."),
 ("h","Required invoice fields"),
 ("list",["Seller & buyer complete names/addresses","Detailed product description (not just 'parts')","Quantity + unit price","Total value in USD","Incoterms (FOB, CIF, DDP...)","Country of origin per line","HTS code if known","Currency + exchange basis"]),
 ("h","Common mistakes that cause holds"),
 ("list",["Generic descriptions ('gift', 'sample', 'parts')","Value that doesn't match payment records","Missing origin → full exam","Mismatched weights vs packing list"]),
])
# 3
build("hts-classification-worksheet.pdf","HTS Classification Worksheet","ClearanceIQ Import Kit · Tariff Codes",[
 ("p","Correct HTS = correct duty. Use this to document your classification rationale (reasonable care)."),
 ("h","Classification inputs"),
 ("list",["What is it made of? (material composition)","What is its principal use?","How is it presented/packed?","Technical specs / model"]),
 ("h","Worksheet"),
 ("table",[["Field","Your entry"],["Proposed HTS","",],["Description used","",],["Duty rate found","",],["Why this code (cite GRI)","",]],None),
 ("p","Cross-check with the free HTS lookup at clearance-iq.com before you commit."),
])
# 4
build("isf-tracker.pdf","ISF 10+2 Filing Tracker","ClearanceIQ Import Kit · Importer Security Filing",[
 ("p","ISF must be filed 24h before cargo is laden abroad. Missing it = $5,000 CBP penalty per shipment."),
 ("h","ISF 10 data elements (importer)"),
 ("list",["Manufacturer name/address","Seller name/address","Buyer name/address","Ship-to party","Container stuffing location","Consolidator","Buyer's employer ID (IRS)","Country of origin","Commodity HTS (6-digit)","Vessel/booking #"]),
 ("h","2 carrier elements (auto from carrier)"),
 ("list",["Vessel stow plan","Container status messages"]),
 ("h","Tracker"),
 ("table",[["Element","Status","Filed by"],["ISF 10 (you)","",""],["Carrier 2","auto","carrier"]],None),
])
# 5
build("bond-estimator-worksheet.pdf","Bond Estimator Worksheet","ClearanceIQ Import Kit · Customs Bonds",[
 ("p","You need a bond to clear customs. Use this to size a continuous vs single-entry bond."),
 ("h","Inputs"),
 ("list",["Estimated annual import value ($)","Number of entries / year","Highest single shipment value ($)"]),
 ("h","Rule of thumb"),
 ("list",["Continuous bond ≈ max($50,000, 10% of annual duties+ taxes)","Single-entry ≈ ~$7–$11 per $1,000 shipment value (min ~$65)","Continuous wins above ~3 shipments/year"]),
 ("table",[["Scenario","Pick"],["1–2 entries/yr","Single-entry"],["3+ entries/yr","Continuous"]],None),
])
# 6
build("cbp-hold-response-template.pdf","CBP Hold Response Template","ClearanceIQ Import Kit · When CBP Holds Your Cargo",[
 ("p","Stay calm, respond fast. Most holds are fixable with the right paperwork."),
 ("h","Step-by-step"),
 ("list",["Get the hold type + cited reason from your broker (ACE)","Collect the matching document (invoice, license, origin proof)","Send to broker same day — CBP clocks run","If disputed, request correct ruling in writing"]),
 ("h","Response letter skeleton"),
 ("p","Re: Entry XXX / Hold ref YYY — We provide the following to resolve [reason]: [doc list]. Goods described as [HTS + origin]. Request release upon acceptance. — [name, company, phone]"),
 ("h","Hold types"),
 ("list",["EXAM (intensive) — documents + possible inspection","MAP (marking/appraisement) — value/origin proof","FDA / USDA — agency clearance","PGA (partner gov agency) — license/permit"]),
])
# 7
build("entry-summary-error-log.pdf","Entry Summary Error Log","ClearanceIQ Import Kit · 7501 Reconciliation",[
 ("p","Track discrepancies between your documents and CBP's Entry Summary (CBP Form 7501)."),
 ("h","Watch for"),
 ("list",["Duty paid differs from your estimate","HTS on 7501 ≠ what you expected","Weight/value mismatch vs invoice","Unknown fees / HMF / MPF errors"]),
 ("h","Log"),
 ("table",[["Field","Expected","CBP shows","Action"],["HTS","","","",],["Duty","","","",],["Value","","","",],["Fees","","","",]],None),
 ("p","Dispute within 90 days via Post-Summary Correction or protest (CF 19)."),
])
# 8
build("reasonable-care-cover-sheet.pdf","Reasonable Care Cover Sheet","ClearanceIQ Import Kit · Importer Obligations",[
 ("p","As importer of record you owe CBP 'reasonable care' — duty to get classification/value right."),
 ("h","Your reasonable-care file should contain"),
 ("list",["Completed HTS Classification Worksheet","Commercial invoice + packing list","Proof of value (payment records)","Origin declaration","Any ruling requests / broker correspondence","This cover sheet signed + dated"]),
 ("h","Attestation"),
 ("p","I certify the information provided for entry is true and accurate to the best of my knowledge. Signed: ____________ Date: __________ Co: __________"),
])

print("PDFs built.")
