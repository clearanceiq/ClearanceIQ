# ClearanceIQ — Document Upload → HTS Classification Feature Spec

**Version:** 0.1  
**Status:** Draft for review  
**Target:** Post-beta paid tier (Operator plan, $49/mo)  
**Priority:** 🔴 High — Most defensible feature in competitive landscape  
**Owner:** Jimmy (Tycoon)  
**Dependencies:** VPS live (Ollama), chat widget deployed, PDPA compliance patch applied

---

## 1. PROBLEM STATEMENT

Current HTS lookup tools (Flexport, GingerControl, iCustoms) require users to manually enter product descriptions. Real importers have:
- Commercial invoices
- Packing lists
- Supplier product catalogs
- Amazon FBA shipment manifests

These documents contain the product data needed for classification, but no tool currently lets users **upload a document and receive accurate HTS codes with AI reasoning**. This is ClearanceIQ’s biggest defensible feature gap.

**User story:**  
_“I just received a 12-page commercial invoice from my supplier. I need HTS codes for 47 line items. I don’t want to type each description into a calculator.”_

---

## 2. SOLUTION SUMMARY

User uploads a document (PDF, image, CSV) → AI extracts product descriptions → AI suggests HTS codes with confidence scores → user reviews, edits, and confirms → system generates a compliance-ready classification report downloadable as PDF/CSV.

**Core value proposition:**  
_“Drop your invoice. Get HTS codes in 60 seconds.”_

---

## 3. USER FLOW

```
┌─────────────────────────────────────────────┐
│  1. USER UPLOADS DOCUMENT                    │
│     - Drag & drop or file picker             │
│     - Supported: PDF, JPG, PNG, CSV, XLSX   │
│     - Max size: 10MB                         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  2. AI EXTRACTION (VPS / Ollama)             │
│     - OCR if image/PDF                       │
│     - Extract line items:                    │
│       • Product name/description             │
│       • Quantity                             │
│       • Value (USD)                          │
│       • Country of origin                    │
│     - Structured output → JSON               │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  3. AI HTS CLASSIFICATION                    │
│     - For each line item:                    │
│       • Match to HTS chapter(s)              │
│       • Suggest 1–3 candidate codes          │
│       • Confidence score (0–100%)            │
│       • Reasoning (plain English)            │
│       • Flag: needs broker review            │
│     - Batch: up to 100 line items            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  4. USER REVIEW & EDIT                       │
│     - Table view of all line items           │
│     - Accept / edit / reject each code       │
│     - Override with manual lookup link       │
│     - Add notes per line item                │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  5. REPORT GENERATION                        │
│     - Compliance-ready PDF                   │
│     - CSV export for ERP/accounting          │
│     - Email delivery option                   │
│     - Save to user history                   │
└─────────────────────────────────────────────┘
```

---

## 4. TECHNICAL ARCHITECTURE

### 4.1 Components

| Component | Location | Tech |
|-----------|----------|------|
| Upload endpoint | CF Pages Function | `functions/api/documents/upload.js` |
| OCR layer | VPS (Ollama) | `llava` or `minicpm-v` for image → text |
| Extraction model | VPS (Ollama) | `llama3:8b` or `mistral:7b` for structured JSON |
| HTS classification | VPS (Ollama) | Fine-tuned prompt + HTS database lookup |
| HTS database | Local file on VPS | Updated quarterly from USITC (public domain) |
| Frontend | CF Pages | Vanilla JS, no framework |
| Storage | CF R2 or VPS disk | Encrypted at rest, auto-delete after 30 days |

### 4.2 Prompt Design (Extraction)

```
You are a trade compliance assistant. Extract all line items from this document.
Return ONLY JSON:
{
  "items": [
    {
      "description": "exact product description from document",
      "quantity": 123,
      "unit_value_usd": 45.99,
      "country_of_origin": "CN",
      "confidence": 0.95
    }
  ]
}
Rules:
- If a field is missing, set it to null
- Do NOT invent data
- Preserve original wording for description
- Unit value must be numeric (USD)
```

### 4.3 Prompt Design (HTS Classification)

```
You are a US customs classification expert. Given this product description, suggest the most likely HTS code.
Return ONLY JSON:
{
  "suggested_code": "8518.22.00",
  "chapter": "85",
  "description_match": "Loudspeakers, without enclosure",
  "confidence": 0.87,
  "reasoning": "The item is a Bluetooth speaker without a dedicated enclosure, placing it under heading 8518.",
  "needs_broker_review": false,
  "alternatives": ["8518.21.00", "8518.29.00"]
}
Rules:
- Prefer 10-digit codes where possible
- Confidence must reflect uncertainty
- Flag items with confidence <70% for broker review
- Never suggest a code without clear reasoning
```

### 4.4 Data Flow

```
User uploads PDF
  → CF Function stores in R2/VPS temp dir
  → Function returns upload_id + status URL
  → Frontend polls status endpoint (long-running task)
  → VPS worker:
      1. OCR (if needed)
      2. Extract structured items
      3. For each item: classify HTS
      4. Store results in ledger
  → User sees results in UI
  → User edits/confirms
  → PDF report generated (VPS or CF Worker)
```

---

## 5. HTS DATABASE

**Source:** USITC HTSB (public domain, updated quarterly)  
**Format:** JSON, keyed by HTS code  
**Size:** ~35,000 entries (10-digit)  
**Update cadence:** Quarterly, automated via CF Cron + USITC API scrape  
**Fallback:** If local DB is outdated, fall back to `hts-api.flexport.com` or `api.usitc.gov` (public endpoints)

**Database schema:**
```json
{
  "hts_code": "8518.22.00",
  "chapter": "85",
  "heading": "8518",
  "description": "Loudspeakers, without enclosure",
  "duty_rate_mfn": "Free",
  "duty_rate_732": "25%",
  "duty_rate_301": "7.5%",
  "unit": "Free",
  "effective_date": "2025-10-01"
}
```

---

## 6. PDPA / COMPLIANCE CONSIDERATIONS

| Risk | Mitigation |
|------|-----------|
| **Commercial invoice contains supplier info** | Auto-delete all uploads after 30 days unless user explicitly saves |
| **Product descriptions may reveal proprietary designs** | Disable AI training on any document-upload data in Ollama config |
| **HTS classifications may constitute legal advice** | Add disclaimer: “Not a substitute for licensed customs broker” |
| **Cross-border data (Malaysia → VPS Germany)** | Declare in privacy policy; CF R2 encrypted in transit + at rest |
| **User edits create personal data** | Allowing edit history in user account = PDPA obligations |

---

## 7. SUCCESS METRICS (LAUNCH)

| Metric | Target |
|--------|--------|
| **Classification accuracy** | ≥85% match to broker-confirmed codes (beta test with 50 real invoices) |
| **Processing time** | <60 sec for 50-line invoice |
| **User adoption** | ≥30% of Operator users try document upload within first month |
| **Conversion impact** | Document upload feature increases Operator signups by ≥20% |
| **Cost per classification** | <€0.01 (VPS compute + LLM) |

---

## 8. BUILD PHASES

### Phase 1: MVP (Week 1–2)
- [ ] Upload endpoint (CF Function)
- [ ] Single-page upload + results UI
- [ ] Ollama extraction prompt (v1)
- [ ] HTS DB seed (public domain)
- [ ] Basic classification prompt
- [ ] PDF report generation

### Phase 2: Polish (Week 3–4)
- [ ] OCR for scanned documents (llava)
- [ ] User edit/confirm flow
- [ ] Save to history
- [ ] CSV export
- [ ] Batch processing (up to 100 items)
- [ ] Confidence-based flagging

### Phase 3: Scale (Month 2+)
- [ ] Shopify/Amazon FBA integration (auto-import orders)
- [ ] Multi-language support (Malay, Chinese for Malaysian SMEs)
- [ ] API endpoint for third-party integrations
- [ ] Fine-tuned HTS model (vs general LLM)

---

## 9. OPEN QUESTIONS

1. **OCR accuracy:** Should we use Ollama `llava` (local, free) or a cloud OCR API (paid, more accurate)? Recommendation: start with `llava`, fall back to cloud if accuracy <80%.
2. **HTS DB licensing:** USITC data is public domain, but do we need to attribute? Yes — add attribution footer.
3. **Legal liability:** Should we add a “Broker Review” button that queues the classification for review by a licensed broker (future revenue stream)?
4. **Storage:** CF R2 or VPS local disk? Recommendation: R2 for production, VPS temp for development.

---

## 10. COMPETITIVE IMPACT

| Competitor | Reaction Time | Why ClearanceIQ Wins |
|-----------|--------------|----------------------|
| **Flexport** | 3–6 months | They’re broker-first; document upload is not their core product |
| **GingerControl** | 2–4 months | Small team, calculator-focused, no AI chat infrastructure |
| **iCustoms.ai** | 1–2 months | Already AI-native, but broker-focused; moving to self-service takes pivot |
| **AmzPrep** | 1–2 months | Amazon FBA only; general import is out of scope |

**Window of advantage:** 3–6 months before any competitor ships a comparable feature. Build fast.
