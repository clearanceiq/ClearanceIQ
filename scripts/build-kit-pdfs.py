import os
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, ListFlowable, ListItem
import zipfile, glob

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
            data = b[1]
            col_widths = b[2] if len(b) > 2 else None
            t = Table(data, colWidths=col_widths); t.setStyle(TableStyle([
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
 ("table",[["Check","Pass?","Notes"],["Business registration verified","",""],["Product matches description/spec","",""],["Sample shipment inspected","",""],["HTS code provided by supplier","",""],["Country of origin declared","",""]],None),
])
# 2
build("commercial-invoice-checklist.pdf","Commercial Invoice Checklist","ClearanceIQ Import Kit · CBP Entry Accuracy",[
 ("p","CBP uses the commercial invoice to classify and value your goods. Errors trigger holds and penalties."),
 ("h","Required invoice fields"),
 ("list",["Seller & buyer complete names/addresses","Detailed product description (not just 'parts')","Quantity + unit price","Total value in USD","Incoterms (FOB, CIF, DDP...)","Country of origin per line","HTS code if known","Currency + exchange basis"]),
 ("h","Common mistakes that cause holds"),
 ("list",["Generic descriptions ('gift', 'sample', 'parts')","Value that doesn't match payment records","Missing origin leads to full exam","Mismatched weights vs packing list"]),
])
# 3
build("hts-classification-worksheet.pdf","HTS Classification Worksheet","ClearanceIQ Import Kit · Tariff Codes",[
 ("p","Correct HTS = correct duty. Use this to document your classification rationale (reasonable care)."),
 ("h","Classification inputs"),
 ("list",["What is it made of? (material composition)","What is its principal use?","How is it presented/packed?","Technical specs / model"]),
 ("h","Worksheet"),
 ("table",[["Field","Your entry"],["Proposed HTS",""],["Description used",""],["Duty rate found",""],["Why this code (cite GRI)",""]],None),
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
 ("list",["Continuous bond = max($50,000, 10% of annual duties + taxes)","Single-entry = ~$7-$11 per $1,000 shipment value (min ~$65)","Continuous wins above ~3 shipments/year"]),
 ("table",[["Scenario","Pick"],["1-2 entries/yr","Single-entry"],["3+ entries/yr","Continuous"]],None),
])
# 6
build("cbp-hold-response-template.pdf","CBP Hold Response Template","ClearanceIQ Import Kit · When CBP Holds Your Cargo",[
 ("p","Stay calm, respond fast. Most holds are fixable with the right paperwork."),
 ("h","Step-by-step"),
 ("list",["Get the hold type + cited reason from your broker (ACE)","Collect the matching document (invoice, license, origin proof)","Send to broker same day - CBP clocks run","If disputed, request correct ruling in writing"]),
 ("h","Response letter skeleton"),
 ("p","Re: Entry XXX / Hold ref YYY - We provide the following to resolve [reason]: [doc list]. Goods described as [HTS + origin]. Request release upon acceptance. - [name, company, phone]"),
 ("h","Hold types"),
 ("list",["EXAM (intensive) - documents + possible inspection","MAP (marking/appraisement) - value/origin proof","FDA / USDA - agency clearance","PGA (partner gov agency) - license/permit"]),
])
# 7
build("entry-summary-error-log.pdf","Entry Summary Error Log","ClearanceIQ Import Kit · 7501 Reconciliation",[
 ("p","Track discrepancies between your documents and CBP's Entry Summary (CBP Form 7501)."),
 ("h","Watch for"),
 ("list",["Duty paid differs from your estimate","HTS on 7501 != what you expected","Weight/value mismatch vs invoice","Unknown fees / HMF / MPF errors"]),
 ("h","Log"),
 ("table",[["Field","Expected","CBP shows","Action"],["HTS","","",""],["Duty","","",""],["Value","","",""],["Fees","","",""]],None),
 ("p","Dispute within 90 days via Post-Summary Correction or protest (CF 19)."),
])
# 8
build("reasonable-care-cover-sheet.pdf","Reasonable Care Cover Sheet","ClearanceIQ Import Kit · Importer Obligations",[
 ("p","As importer of record you owe CBP 'reasonable care' - duty to get classification/value right."),
 ("h","Your reasonable-care file should contain"),
 ("list",["Completed HTS Classification Worksheet","Commercial invoice + packing list","Proof of value (payment records)","Origin declaration","Any ruling requests / broker correspondence","This cover sheet signed + dated"]),
 ("h","Attestation"),
 ("p","I certify the information provided for entry is true and accurate to the best of my knowledge. Signed: ____________ Date: __________ Co: __________"),
])

# 9 - detailed watch worksheet (matches carrier detailed form)
build("watch-worksheet.pdf","Watch & Timepiece Valuation Worksheet","ClearanceIQ Import Kit · Luxury Goods / Chapter 91",[
 ("p","Use this worksheet to capture the full valuation and origin breakdown CBP expects for watches (Chapter 91). Complete one column per watch in the shipment."),
 ("h","Watch details"),
 ("table",[["Field","Watch 1","Watch 2"],
   ["Style name / No / Reference","",""],
   ["Style of watch (if Other, provide type)","",""],
   ["Quantity","",""],
   ["HTSUS Number (if known)","",""],
   ["Primary function of watch (if Other, provide)","",""],
   ["How is the watch powered","",""],
   ["Country of Origin of battery","",""],
   ["Movement / Display type","",""],
   ["Movement over 12mm thick AND 50mm wide/long/diam? (Y/N)","",""],
   ["Number of Jewels in Movement","",""],
   ["Country of Origin of Movement","",""],
   ["Material of Band (Leather->animal / Metal->metal / Other)","",""],
   ["Country of Origin of Band (Strap)","",""],
   ["Material of Case (if Other, provide)","",""],
   ["Country of Origin of Case","",""],
   ["Material of Backplate (if Other, provide)","",""],
   ["Value - Movement ($)","",""],
   ["Value - Case ($)","",""],
   ["Value - Strap ($)","",""],
   ["Value - Battery ($)","",""],
   ["Total Watch Value ($)","",""]],None),
 ("h","Declaration"),
 ("table",[["Company Name","",""],["Name and Title","",""],["E-mail","",""],["AWB Number","",""]],None),
 ("p","CBP values the full cost (movement, case, brand royalty, assists). Misvaluation on luxury goods draws heavy penalties."),
])
# 10
build("metals-derivatives-worksheet.pdf","Aluminum, Steel & Copper Derivatives Worksheet","ClearanceIQ Import Kit · Section 232 Tariffs",[
 ("p","Section 232 adds tariffs on steel (25%), aluminum (10%) and their derivative products. Confirm whether your item is on the derivative list and whether an exclusion applies."),
 ("h","Before you file"),
 ("list",["Identify the base metal (steel / aluminum / copper)","Find your 10-digit HTS and check the Section 232 derivative lists","Check country of melt & pour / smelt for steel & aluminum","Search for an active exclusion at exclusionapprovals.cbp.gov","Confirm the rate (base duty + 232 ad valorem)"]),
 ("h","Worksheet"),
 ("table",[["Field","Your entry"],
   ["Product",""],
   ["Base metal",""],
   ["HTS (10-digit)",""],
   ["Country of melt & pour",""],
   ["Section 232 rate",""],
   ["Exclusion # (if any)",""],
   ["Total duty = base + 232",""]],None),
 ("p","Rates change by proclamation - verify the current rate at cbp.gov before entry."),
])
# 11
build("add-cvd-screening-worksheet.pdf","AD/CVD Screening Worksheet","ClearanceIQ Import Kit · Anti-Dumping & Countervailing Duties",[
 ("p","If your HTS is under an anti-dumping (AD) or countervailing duty (CVD) order, you owe cash deposits on top of normal duty."),
 ("h","Screening steps"),
 ("list",["Search your HTS at enforcement.trade.gov (AD/CVD case list)","Note the case number and country","Find the cash deposit rate (AD + CVD)","Confirm the producer/exporter-specific rate","Add to total landed cost"]),
 ("h","Worksheet"),
 ("table",[["Field","Your entry"],
   ["HTS",""],
   ["Country of export",""],
   ["AD/CVD case #",""],
   ["Cash deposit rate (AD)",""],
   ["Cash deposit rate (CVD)",""],
   ["Producer / exporter",""],
   ["Total ADD/CVD due",""]],None),
 ("p","Rates are per-case and update often. Broker must report the correct order number on the entry."),
])
# 12
build("section-301-china-tracker.pdf","Section 301 China Tariff Tracker","ClearanceIQ Import Kit · China Lists 1-4",[
 ("p","Most Chinese-origin goods owe an extra Section 301 duty (25% or 7.5%) on top of base duty. Track which List applies and any exclusion."),
 ("h","Lists at a glance"),
 ("list",["List 1 (25%) - effective 2018","List 2 (25%)","List 3 (25%)","List 4A (now 7.5%)","List 4B (paused)","Exclusions - search at ustr.gov, many expired"]),
 ("h","Tracker"),
 ("table",[["Field","Your entry"],
   ["HTS (8-digit)",""],
   ["China List (1-4)",""],
   ["Section 301 rate",""],
   ["Exclusion applied? (Y/N)",""],
   ["Exclusion ref #",""]],None),
 ("p","Section 301 stacks with Section 232 and ADD/CVD when all apply."),
])
# 13
build("textiles-apparel-worksheet.pdf","Textiles & Apparel Worksheet","ClearanceIQ Import Kit · Chapters 61/62/63",[
 ("p","Textiles need fiber content, country of origin (yarn-forward rule), and correct labeling. Some origins need a visa/quota."),
 ("h","Checklist"),
 ("list",["Knit (Ch 61) vs woven (Ch 62) vs made-up (Ch 63)","Fiber content % by weight stated","Country of origin per yarn-forward rule","Care label + CPSIA for children's wear","Visa/quota if origin is a restricted country","Origin marking on garment"]),
 ("h","Worksheet"),
 ("table",[["Field","Your entry"],
   ["Garment type",""],
   ["Fiber content",""],
   ["Chapter (61/62/63)",""],
   ["HTS",""],
   ["Origin (yarn-forward)",""],
   ["Visa/quota needed? (Y/N)",""]],None),
])
# 14
build("footwear-worksheet.pdf","Footwear Worksheet","ClearanceIQ Import Kit · Chapter 64",[
 ("p","Footwear HTS turns on upper material and construction (molded vs assembled). Kids' shoes have CPSIA lead limits."),
 ("h","Classification drivers"),
 ("list",["Upper material (leather / textile / rubber-plastic)","Construction - molded in one piece vs assembled","Outsole material","For children - CPSIA lead/phthalate compliance"]),
 ("h","Worksheet"),
 ("table",[["Field","Your entry"],
   ["Style",""],
   ["Upper material",""],
   ["Construction",""],
   ["HTS",""],
   ["CPSIA ok (if kids)? (Y/N)",""]],None),
])
# 15
build("fda-products-worksheet.pdf","FDA-Regulated Products Worksheet","ClearanceIQ Import Kit · Food / Supplements / Cosmetics / Devices",[
 ("p","Food, dietary supplements, cosmetics and medical devices need FDA before release. Missing registration or prior notice = hold."),
 ("h","Pre-entry FDA checklist"),
 ("list",["Domestic/foreign facility registration","Prior Notice submitted to FDA","FSVP plan if importing food","Label compliance (Nutrition Facts / ingredient list)","Device 510(k) / establishment if applicable","Cosmetics - facility registration + listing (MoCRA)"]),
 ("h","Worksheet"),
 ("table",[["Field","Your entry"],
   ["Product category",""],
   ["FDA center",""],
   ["Facility reg #",""],
   ["Prior Notice #",""],
   ["FSVP ready? (Y/N)",""]],None),
])
# 16
build("usda-agriculture-worksheet.pdf","USDA / APHIS Agriculture Worksheet","ClearanceIQ Import Kit · Plant & Animal Products",[
 ("p","Plant and animal products often need a phytosanitary certificate or APHIS permit. Restricted origins can be refused entry."),
 ("h","Checklist"),
 ("list",["Is the product plant or animal origin?","APHIS permit required? (permits.aphis.gov)","Phytosanitary certificate from origin","Country eligibility / restrictions","Treatment (fumigation/irradiation) if required","Origin marking"]),
 ("h","Worksheet"),
 ("table",[["Field","Your entry"],
   ["Product",""],
   ["Plant / animal",""],
   ["Origin country",""],
   ["APHIS permit #",""],
   ["Phytosanitary cert? (Y/N)",""],
   ["Treatment",""]],None),
])

# 17 - Lacey Act PPQ Form 505 (solid wood)
build("lacey-ppq505-worksheet.pdf","Lacey Act PPQ Form 505 Worksheet","ClearanceIQ Import Kit · USDA APHIS / Solid Wood",[
 ("p","Required for plant products including solid wood (HTSUS 4403 / 4407 / 4410 etc). As of Jan 1, 2026 APHIS no longer accepts paper PPQ 505 / 505B - file electronically. This worksheet captures the fields to assemble before filing."),
 ("h","Section 1 - Shipment Information"),
 ("table",[["Field","Your entry"],
   ["1. Estimated Date of Arrival (MM/DD/YYYY)",""],
   ["2. Entry Number",""],
   ["3. Container Number",""],
   ["4. Bill of Lading",""],
   ["5. MID (Manufacturer ID Code)",""],
   ["6. Importer Name",""],
   ["7. Importer Address",""],
   ["8. Consignee Name",""],
   ["9. Consignee Address",""]],None),
 ("h","Section 2 - Lacey Act Compliance"),
 ("table",[["Field","Your entry"],
   ["10. Description of Merchandise",""],
   ["11. HTSUS Number",""],
   ["12. Entered Value (USD)",""],
   ["13. Article / Component of Article",""],
   ["14. Plant Scientific Name (Genus, Species)",""],
   ["15. Country of Harvest",""],
   ["16. Quantity of Plant Material",""],
   ["17. Unit of Measure",""],
   ["18. % Recycled Material",""]],None),
 ("h","Certification (under penalty of perjury)"),
 ("table",[["Signature","Print Name","Date"],["","",""]],None),
 ("p","Mail signed form to USDA (Box 10, 4700 River Road, Riverdale, MD 20737). Knowingly false statement = criminal penalty under 16 U.S.C. 3373(d)."),
])
# 18 - TSCA Chemical
build("tsca-chemical-worksheet.pdf","TSCA Chemical Certification Worksheet","ClearanceIQ Import Kit · EPA / 15 USC 2612",[
 ("p","Importers must certify that imported chemicals comply with TSCA (positive) or are not subject to TSCA (negative). File with CBP via ACE or on the invoice before release."),
 ("h","Which certification applies?"),
 ("list",["POSITIVE - chemical complies with all applicable TSCA rules/orders","NEGATIVE - chemical is not subject to TSCA (e.g. pesticide, drug, food, cosmetic, device, firearm)"]),
 ("h","Certification statement (copy verbatim onto invoice / ACE)"),
 ("p","POSITIVE: \"I certify that all chemical substances in this shipment comply with all applicable rules or orders under TSCA and that I am not offering a chemical substance for entry in violation of TSCA or any applicable rule or order thereunder.\""),
 ("p","NEGATIVE: \"I certify that all chemicals in this shipment are not subject to TSCA.\""),
 ("h","Filing details"),
 ("table",[["Field","Your entry"],
   ["Certification type (Positive / Negative)",""],
   ["Chemical / CAS #",""],
   ["HTSUS Number",""],
   ["Importer or authorized agent name",""],
   ["Email",""],
   ["Telephone",""],
   ["Filed via (ACE / paper on invoice)",""]],None),
 ("p","Section 6 chemicals (PCBs, mercury, asbestos) have extra import rules. Certification must include certifier name, email, and telephone."),
])
# 19 - TSCA Composite Wood
build("tsca-composite-wood-worksheet.pdf","TSCA Title VI Composite Wood Worksheet","ClearanceIQ Import Kit · EPA Formaldehyde Standards",[
 ("p","TSCA Title VI covers composite wood products (hardwood plywood, particleboard, MDF, thin-MDF) and finished goods containing them, imported on/after March 22, 2019."),
 ("h","Certification statement"),
 ("p","\"I certify that all chemical substances in this shipment comply with all applicable rules or orders under TSCA...\" (TSCA Title VI - formaldehyde emission standards)."),
 ("h","Recordkeeping (required)"),
 ("table",[["Field","Your entry"],
   ["Product / component",""],
   ["Panel producer + production date",""],
   ["Supplier + purchase date",""],
   ["Supplier statement of TSCA Title VI compliance? (Y/N)",""],
   ["Records retained 3 yrs? (Y/N)",""],
   ["HTSUS Number",""]],None),
 ("p","Retain bills of lading / invoices with the supplier compliance statement for 3 years; provide to EPA within 30 days on request."),
])
# 20 - DOT HS-7 Vehicle / Parts
build("hs7-vehicle-worksheet.pdf","DOT HS-7 Vehicle / Parts Declaration Worksheet","ClearanceIQ Import Kit · NHTSA 49 CFR 591.5",[
 ("p","File DOT Form HS-7 at entry to identify the basis for importing a motor vehicle or motor vehicle equipment. Vehicles/engines also require EPA Form 3520-1."),
 ("h","Identification"),
 ("table",[["Field","Your entry"],
   ["Port of Entry",""],
   ["Customs Port Code",""],
   ["Customs Entry No",""],
   ["Entry Date",""],
   ["Make / Model / Year",""],
   ["VIN",""],
   ["Description of merchandise (if equipment)",""]],None),
 ("h","Basis for entry - check the box that applies"),
 ("list",["1 - Vehicle 25+ years old / equipment made before applicable standard","2A - Conforms to all FMVSS (label affixed)","2B - Canadian-certified, conforms to US standards","3 - Nonconforming but NHTSA-eligible (bond attached)","5 - Nonresident temporary import (<= 1 yr)","7 - Research / demonstration / racing","9 - Incomplete vehicle (further manufacturing)","10 - Show / display only","11 - Theft Prevention Standard marked","12 - Foreign armed forces (official orders)","13 - Petition granted by NHTSA"]),
 ("p","False declaration = fine up to $10,000 or 5 years imprisonment (18 U.S.C. 1001)."),
])
# 21 - Kimberley Process (Rough Diamond)
build("diamond-kpcs-worksheet.pdf","Kimberley Process (Rough Diamond) Declaration Worksheet","ClearanceIQ Import Kit · CBP 19 CFR 12.152",[
 ("p","Rough diamonds (HTS 7102.10 / 7102.21 / 7102.31) must be accompanied by an original Kimberley Process Certificate under the Clean Diamond Trade Act / KPCS."),
 ("h","Key requirements"),
 ("list",["Original Kimberley Process Certificate must accompany shipment","Sealed in tamper-resistant container (31 CFR 592.301)","Present certificate to CBP on demand; copy in entry package","Retain copy of certificate 5 years","Verify shipment vs invoice / packing list"]),
 ("h","Worksheet"),
 ("table",[["Field","Your entry"],
   ["KPCS Certificate No",""],
   ["Issuing Authority / Country",""],
   ["HTSUS (7102.10 / .21 / .31)",""],
   ["Carat weight",""],
   ["Tamper-resistant container? (Y/N)",""],
   ["AWB / BOL",""],
   ["Importer name",""],
   ["Copy retained 5 yrs? (Y/N)",""]],None),
 ("p","Polished diamonds are NOT covered - only rough. Present the original certificate to CBP upon demand."),
])

# Rebuild the kit ZIP from every PDF in the output folder
PDFS = sorted(glob.glob(os.path.join(OUT, "*.pdf")))
zip_path = os.path.join(OUT, "import-kit.zip")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for p in PDFS:
        z.write(p, os.path.basename(p))
print(f"PDFs built. ZIP rebuilt with {len(PDFS)} PDFs -> {zip_path}")
