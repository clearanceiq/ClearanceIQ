# ClearanceIQ — Project Specification

## 1. Project Intent

ClearanceIQ is a professional, high-trust U.S. Import Compliance Checklist that helps importers, customs brokers, and logistics managers exercise Reasonable Care under 19 USC § 1592 and 19 CFR Part 171. The tool provides a modular, step-by-step interactive checklist covering Supplier Verification, HTS Classification, ISF/Entry Filing, and CBP Clearance. It is built for speed, accuracy, and audit defensibility — not marketing. Outputs are formatted for direct insertion into internal compliance SOPs and can be exported as PDF Reasonable Care documentation stubs.

---

## 2. Compliance Framework

| Regulation | Agency | Scope | Citation |
|------------|--------|-------|----------|
| Importer Security Filing (ISF) | CBP | 10+2 data elements, 24h before vessel lading | 19 CFR § 103.30; CBP Ruling HY-01-22 |
| Entry Summary | CBP | HTS classification, valuation, origin | 19 USC § 1500; 19 CFR § 141 |
| Reasonable Care | CBP | Anti-djudication, recordkeeping, penalty exposure | 19 USC § 1592; 19 CFR § 171 |
| Foreign Vendor Verification | CBP | Broker/importer due diligence | 19 CFR § 111.1 |
| FDA Prior Notice | FDA | Food, cosmetics, medical devices | 21 CFR § 1.283 |
| USDA APHIS | USDA | Plants, animals, biologics | 7 CFR § 319; 9 CFR § 94 |
| 301 Tariffs | USTR / CBP | Section 301 supplemental duties | Federal Register; USTR docket USTR-2018-0026 |

**Official links:**
- CBP.gov — https://www.cbp.gov
- eCFR Title 19 — https://www.ecfr.gov/current/title-19
- FDA Import Alerts — https://www.fda.gov/drugs/drug-safety-and-availability/drug-shortages
- USTR 301 Actions — https://ustr.gov/issue-areas/enforcement/section-301-investigations
- ISF Web Interface — https://iscbpportals.cbp.dhs.gov/Home/Home

---

## 3. Data Model

Schema: See `references/checklist-data-model.md` for canonical JSON schema.

### Core Entities

**ChecklistItem**
```json
{
  "id": "supplier-name-verified",
  "step": 1,
  "phase": "supplier",
  "title": "Verify supplier legal name and address",
  "description": "Confirm the entity listed on the commercial invoice matches the manufacturer/vendor of record. Mismatches trigger CBP penalties under 19 USC 1592.",
  "regulation_ref": "19 CFR 111.1",
  "agency": "CBP",
  "common_errors": [
    "Using a trading company name instead of the actual manufacturer",
    "Relying on a PO box when a physical plant address is required",
    "Accepting invoice from a shell entity not listed on the vendor master"
  ],
  "documentation_required": [
    "Signed vendor agreement or purchase order",
    "Commercial invoice with legal name and EIN/Tax ID",
    "Previous CBP entry summary (if available)"
  ],
  "penalty_risk": "high",
  "tool_link": "/tools/supplier-checklist.html"
}
```

**Phase enum:** `supplier` | `hts` | `permit` | `clearance` | `post-entry`

**Penalty risk enum:** `low` | `medium` | `high` | `critical`

**ReasonCareStub** (generated on completion of high/critical items)
```json
{
  "stub_id": "uuid",
  "checklist_item_id": "supplier-name-verified",
  "completed_at": "ISO-8601",
  "completed_by": "email or user_id",
  "signature_line": "_________________________",
  "documentation_checklist": ["vendor agreement", "commercial invoice"],
  "regulation_ref": "19 CFR 111.1",
  "pdf_export_url": "/api/reasonable-care/pdf/{stub_id}"
}
```

---

## 4. User Flow

1. **Landing / Tool Selection**
   - User enters via `clearance-iq.com` and selects **Compliance Checklist** from the tool grid.
   - Anonymous users: 5 sessions/day. Authenticated (email): 100 sessions/day.

2. **Phase Selector**
   - System presents 5 phases: Supplier → HTS → Permit → Clearance → Post-Entry.
   - Default: `supplier` phase, step 1.
   - User may jump phases via sidebar nav.

3. **Checklist Interaction**
   - Each item renders as a collapsible card with: title, regulation citation, description, common errors (tooltip), documentation required (tooltip), penalty risk badge (color-coded), and a primary CTA: **Mark Complete**.
   - On **Mark Complete**: item collapses to a timestamped, signature-line stub. A `ReasonCareStub` is generated client-side in `localStorage`.
   - Gate: items with `penalty_risk: critical` require confirmation checkbox before marking complete.

4. **Export / Audit**
   - At any point, user can click **Export Reasonable Care Package**.
   - System compiles all `ReasonCareStub` entries into a single PDF via `@react-pdf/reportlab`.
   - PDF header: "ClearanceIQ Reasonable Care Documentation — Prepared for internal audit defense."
   - Footer: Disclaimer + licensed broker recommendation.

5. **Feedback / Accuracy**
   - Each item has a micro-feedback widget: **Thumbs up / Down**.
   - Negative feedback triggers a 3-field modal: What was wrong? (text), expected outcome, optional email.
   - Sent to `/api/telemetry` with `source: compliance-checklist`.

6. **Completion**
   - When all items in all phases are marked complete, user sees: **Reasonable Care package exported** and **Share with broker** CTA.

---

## 5. Wireframe Description

### Layout
- **Desktop:** 3-column layout (sidebar nav | main content | context panel).
- **Mobile:** Single column with bottom-sheet drawer for phase navigation.

### Key Components
| Component | Behavior |
|-----------|----------|
| **PhaseSidebar** | Vertical stepper on desktop, bottom drawer on mobile. Locked phases until prior phase is 100% complete except for audit overrides. |
| **ChecklistCard** | Expandable card. Default: title + risk badge. Expanded: full description, tooltips, Mark Complete button. Collapsed: timestamp + signature stub. |
| **ContextPanel** | Right rail on desktop. Shows relevant tool integration (e.g., HTS Lookup from `/tools/hts-lookup.html`), regulation text excerpt, and agency contact link. |
| **ExportBar** | Sticky footer bar on desktop, floating action button on mobile. Triggers PDF generation. |
| **MicroFeedback** | Inline thumbs up/down on every item. Captures accuracy and clarity. |

### Responsive Behavior
- Mobile-first breakpoints: 640px (1 col), 768px (sidebar collapses to drawer), 1024px (3-col layout).
- Touch targets: minimum 44×44px per WCAG 2.1 AA.
- Typography: Plus Jakarta Sans, 16px base, 1.6 line-height.

### Trust Signals
- Every phase header includes: "This checklist is advisory. Consult a licensed customs broker or attorney for legal determination."
- Every PDF export includes: CBP link, FDA link, and disclaimer: "ClearanceIQ is not affiliated with CBP, FDA, or USDA."

---

## 6. Implementation Roadmap

| Phase | Scope | Est. Effort | Dependencies |
|-------|-------|-------------|--------------|
| **MVP** | Data model seeding (50 high-impact items across 5 phases), React checklist component, localStorage Reasonable Care stubs, PDF export, light theme. | Medium | None — static-first on CF Pages. |
| **Polish** | common_errors tooltips, agency-specific overlays, telemetry hooks, beta tester validation, WCAG audit. | Medium | MVP shipped. |
| **ISF Monitor** | Poll CBP EDIS for 24h window; alert if missing 10+2 fields detected. | Large | CF Pages Functions + VPS cron for polling. |
| **301 Tracker** | Weekly USTR scrape; match user HTS codes; email alert on supplemental/modified duties. | Large | Apify or Firecrawl for scraping; email service. |
| **PGA Engine** | Rule-based HTS → permit mapping (FDA Prior Notice, USDA APHIS, FWS). | Medium | HTS database integration (Phase 3). |
| **Scale** | White-label Operator tier, SSR/SSG for SEO, team seats, SSO, SLA. | Large | Stripe, VPS, auth system. |

---

## 7. Trust Signals

- [x] Official government link citations (CBP, FDA, USDA, USTR, eCFR)
- [x] "This does not constitute legal advice" disclaimer on every page and PDF export
- [x] Licensed broker recommendation on every checklist completion screen
- [x] Reasonable Care documentation step (auto-generated PDF stub)
- [x] Audit trail: every Mark Complete event is timestamped and stored in localStorage
- [x] No stock photography; all UI is typographic + government-standard formatting
- [x] Navy/Slate #1e293b palette, Plus Jakarta Sans, WCAG AA contrast

---

## 8. Common Errors (Tooltips)

| Error | Why it happens | Fix |
|-------|----------------|-----|
| **Using supplier invoice name as importer of record** | Confusion between vendor and consignee. | Validate against CBP entry summary (ACE portal). Checklist item: `permit-entry-summary-match`. |
| **Classifying by product description instead of HTS** | Importer skips ruling research. | Checklist item: `hts-ruling-checked`; link to HTS Lookup tool. |
| **Missing ISF 24h before lading** | Freight forwarder delays or PO date confusion. | Checklist item: `isf-filed-24h`; ISF Monitor alert in Phase 2. |
| **Ignoring AD/CVD on HTS lookup** | Tool returns base duty rate only. | Checklist item: `hts-ad-cvd-checked`; HTS Lookup tool flags AD/CVD risk. |
| **Failing to retain records 5 years** | CBP recordkeeping requirement oversight. | Checklist item: `post-entry-records-retained`; exportable checklist. |
| **Using a deactivated ABI broker** | Broker debarment not checked at onboarding. | Checklist item: `supplier-broker-abi-status`. |

---

## 9. Next Actions

1. **Seed checklist data** — Populate first 15 Supplier-phase items in `data/checklist.json`.
2. **Build MVP React component** — `ChecklistCard`, `PhaseSidebar`, `ExportBar`.
3. **Add PDF export** — `@react-pdf/reportlab` via CF Pages Function or client-side.
4. **Telemetry integration** — Wire feedback thumbs to `/api/telemetry` with `source: compliance-checklist`.
5. **Tone review** — Audit all copy for "marketing" language; replace with technical advisory tone.
6. **Beta validation** — Present to 3 licensed customs brokers for feedback on phase order and item coverage.

---

*Spec authored under `clearanceiq-compliance-architect` persona.*
