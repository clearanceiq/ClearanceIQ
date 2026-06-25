// HTS Chapter → Paperwork Mapping for ClearanceIQ
// Based on CBP 19 CFR, FDA 21 CFR, USDA 7 CFR, EPA requirements

const PAPERWORK_BY_CHAPTER = {
  // Live animals / animal products
  "01": { desc: "Live animals", agency: "APHIS/USDA", forms: ["Veterinary certificate", "APHIS import permit", "Health certificate"], citations: ["9 CFR §93", "7 CFR §319"], flags: ["Zoonotic disease screening", "Quarantine possible"] },
  "02": { desc: "Meat / edible meat products", agency: "FSIS/USDA", forms: ["FSIS Certificate", "Health certificate", "Slotting/inspection confirmation"], citations: ["9 CFR §327", "21 CFR §1.283"], flags: ["Mandatory inspection", "BSE restrictions"] },
  "03": { desc: "Fish / crustaceans", agency: "FDA / NOAA", forms: ["FDA Prior Notice", "Catch certificate", "Harvest certificate"], citations: ["21 CFR §1.283", "50 CFR §600"], flags: ["Seafood HACCP required", "Mercury testing"] },
  "04": { desc: "Dairy / eggs / honey", agency: "FDA / USDA", forms: ["Prior Notice", "Health certificate", "Phytosanitary certificate (honey)"], citations: ["21 CFR §1.283", "7 CFR §356"], flags: ["Raw milk restrictions", "Residue testing"] },

  // Vegetable products
  "07": { desc: "Edible vegetables", agency: "FDA / APHIS", forms: ["Prior Notice", "Phytosanitary certificate", "Pest risk assessment"], citations: ["7 CFR §319", "21 CFR §1.283"], flags: ["Xanthomonas screening", "Soil restriction"] },
  "08": { desc: "Edible fruit / nuts", agency: "FDA / APHIS", forms: ["Prior Notice", "Phytosanitary certificate", "Fumigation confirmation"], citations: ["7 CFR §319", "21 CFR §1.283"], flags: ["Pest-free area required", "Processing certificate"] },
  "09": { desc: "Coffee / tea / spices", agency: "FDA", forms: ["Prior Notice", "Certificate of origin", "Residue analysis"], citations: ["21 CFR §1.283", "19 CFR §134"], flags: ["Aflatoxin testing", "Organic certification if claimed"] },
  "10": { desc: "Cereals", agency: "FDA / USDA", forms: ["Prior Notice", "Health certificate", "GMO declaration if required"], citations: ["21 CFR §1.283", "7 CFR §356"], flags: ["Phytosanitary certificate", "Herbicide residue check"] },
  "11": { desc: "Milling / malt / starches", agency: "FDA / USDA", forms: ["Prior Notice", "Processing certificate"], citations: ["21 CFR §1.283"], flags: ["Insect infestation screening"] },
  "12": { desc: "Oil seeds / fruit / grain", agency: "FDA / USDA", forms: ["Prior Notice", "Phytosanitary certificate"], citations: ["7 CFR §319", "21 CFR §1.283"], flags: ["Contaminant screening", "GMO documentation"] },
  "13": { desc: "Lac / gums / resins", agency: "FDA", forms: ["Prior Notice", "Technical data sheet"], citations: ["21 CFR §1.283"], flags: ["Solvent residue verification"] },
  "14": { desc: "Vegetable plaiting / materials", agency: "APHIS", forms: ["Phytosanitary certificate"], citations: ["7 CFR §319"], flags: ["Pest screening"] },
  "15": { desc: "Animal / vegetable fats and oils", agency: "FDA", forms: ["Prior Notice", "Refining certificate"], citations: ["21 CFR §1.283"], flags: ["Acid value / peroxide testing"] },
  "17": { desc: "Sugars / sugar confectionery", agency: "FDA", forms: ["Prior Notice"], citations: ["21 CFR §1.283"], flags: ["Pest infestation check"] },
  "20": { desc: "Vegetable / fruit preparations", agency: "FDA", forms: ["Prior Notice", "HACCP plan (if juice)"], citations: ["21 CFR §120", "21 CFR §1.283"], flags: ["Botulism screening (low-acid)", "HACCP required for juice"] },

  // Wood, pulp, textiles
  "44": { desc: "Wood and articles of wood", agency: "APHIS", forms: ["Phytosanitary certificate", " fumigation certificate", "Heat treatment mark (ISPM 15)"], citations: ["7 CFR §319"], flags: ["ISPM 15 bark-free requirement", "Wood packaging mark"] },
  "47": { desc: "Pulp / recovered paper", agency: "EPA / FDA", forms: ["TSCA certification (if applicable)", "Prior Notice"], citations: ["40 CFR §710", "21 CFR §1.283"], flags: ["Recycled content verification"] },
  "50": { desc: "Silk", agency: "CBP", forms: ["Commercial invoice", "Country of origin mark"], citations: ["19 CFR §134"], flags: ["Origin marking visible on goods"] },
  "51": { desc: "Wool / animal hair", agency: "CBP / USDA", forms: ["Wool certificate / invoice", "Country of origin"], citations: ["7 CFR §53"], flags: ["Wool Duty Drawback if applicable"] },
  "52": { desc: "Cotton", agency: "CBP", forms: ["Country of origin marking", "Invoice with fiber content"], citations: ["19 CFR §134", "Textile Fiber Products Identification Act"], flags: ["Knit vs woven rate difference", "Made-up vs garment"] },
  "53": { desc: "Other vegetable textile fibers", agency: "CBP", forms: ["Country of origin mark", "Fiber content label"], citations: ["19 CFR §134"], flags: ["Fiber content disclosure required"] },
  "54": { desc: "Manmade filaments / strip", agency: "CBP", forms: ["Country of origin marking", "Invoice with denier count"], citations: ["19 CFR §134"], flags: ["Filament vs staple rate difference"] },
  "55": { desc: "Manmade staple fibers", agency: "CBP", forms: ["Country of origin", "Invoice with blend %"], citations: ["19 CFR §134"], flags: ["Blended fabric classification"] },
  "56": { desc: "Wadding / felt / yarns", agency: "CBP", forms: ["Country of origin mark"], citations: ["19 CFR §134"], flags: ["Impregnated/coated classification"] },
  "57": { desc: "Carpets / textile floor coverings", agency: "CPSC / CBP", forms: ["CPSC flammability certificate", "Country of origin label", "Invoice with construction type"], citations: ["16 CFR §1630", "19 CFR §134"], flags: ["Flammability 16 CFR 1630/1631 required", "Backing material classification"] },
  "58": { desc: "Special woven / lace / tapestries", agency: "CBP", forms: ["Country of origin marking", "Invoice with border/fringe details"], citations: ["19 CFR §134"], flags: ["Border width can change classification"] },
  "59": { desc: "Impregnated / coated textiles", agency: "CPSC / CBP", forms: ["CPSC flammability cert", "Coating composition certificate"], citations: ["16 CFR §1630", "19 CFR §134"], flags: ["Plastisol vs rubber coating difference"] },
  "60": { desc: "Knitted / crocheted fabrics", agency: "CBP / CPSC", forms: ["Country of origin mark", "CPSC flammability cert if apparel"], citations: ["19 CFR §134", "16 CFR §1610"], flags: ["Apparel vs industrial use matters"] },
  "61": { desc: "Articles of apparel, knitted", agency: "CPSC / CBP", forms: ["CPSC flammability cert (16 CFR 1610)", "Country of origin label", "Care label (FTC)"], citations: ["16 CFR §1610", "19 CFR §134", "16 CFR §69"], flags: ["Children's sleepwear stricter (16 CFR 1615/1616)", "Size labeling rule"] },
  "62": { desc: "Articles of apparel, not knitted", agency: "CPSC / CBP", forms: ["CPSC flammability cert (16 CFR 1610)", "Country of origin label", "Care label (FTC)"], citations: ["16 CFR §1610", "19 CFR §134"], flags: ["Same as Ch 61 but woven", "Children's sleepwear higher standard"] },
  "63": { desc: "Other textile articles / sets / used clothing", agency: "CPSC / CBP", forms: ["CPSC cert (if new)", "Quarantine treatment cert (if used)", "Country of origin mark"], citations: ["7 CFR §330", "19 CFR §134", "16 CFR §1610"], flags: ["Used clothing: APHIS quarantine mandatory", "Bedding: flammability cert required"] },

  // Footwear / headgear / umbrellas
  "64": { desc: "Footwear", agency: "CPSC / CBP", forms: ["CPSC footwear cert (16 CFR 1340)", "Country of origin label", "Care label"], citations: ["16 CFR §1340", "19 CFR §134", "15 USC §6501"], flags: ["Children's footwear stricter", "Sole material changes rate"] },
  "65": { desc: "Headgear", agency: "CPSC / CBP", forms: ["CPSC cert if applicable", "Country of origin label"], citations: ["19 CFR §134"], flags: ["Safety helmet standard (ASTM/CPSC)"] },
  "66": { desc: "Umbrellas / canes / whips", agency: "CBP", forms: ["Country of origin mark"], citations: ["19 CFR §134"], flags: ["Frame material classification"] },

  // Rubber / plastics
  "39": { desc: "Plastics and articles thereof", agency: "CPSC / EPA", forms: ["CPSC cert if children's product", "TSCA certification (if applicable)"], citations: ["16 CFR §1301", "40 CFR §710", "19 CFR §134"], flags: ["Proppant/silica dust (OSHA)", "BPA restrictions in some states"] },
  "40": { desc: "Rubber and articles thereof", agency: "CPSC / EPA", forms: ["TSCA cert if applicable", "Country of origin mark"], citations: ["40 CFR §710", "19 CFR §134"], flags: ["Latex allergy labeling (FDA)"] },

  // Leather / wood / stone / glass / ceramics / pearls / metals
  "41": { desc: "Raw hides / leather", agency: "APHIS / CBP", forms: ["Phytosanitary certificate", "Commercial invoice with hide source"], citations: ["9 CFR §95", "19 CFR §134"], flags: ["Foot-and-mouth disease country restrictions"] },
  "42": { desc: "Articles of leather / handbags", agency: "CPSC / CBP", forms: ["CPSC flammability cert if applicable", "Country of origin label"], citations: ["16 CFR §1610", "19 CFR §134"], flags: ["Leather vs synthetic classification"] },
  "43": { desc: "Furskins / artificial fur", agency: "CBP / USFWS", forms: ["USFWS declaration (if CITES)", "Country of origin"], citations: ["16 USC §1536", "19 CFR §134"], flags: ["CITES permit for endangered species", "Fur Products Labeling Act"] },
  "45": { desc: "Cork / articles of cork", agency: "CBP", forms: ["Country of origin mark"], citations: ["19 CFR §134"], flags: ["Composite material classification"] },
  "46": { desc: "Straw / basketware", agency: "APHIS", forms: ["Phytosanitary certificate"], citations: ["7 CFR §319"], flags: ["Pest screening for plant materials"] },
  "48": { desc: "Paper / paperboard", agency: "EPA / CBP", forms: ["TSCA certification if applicable", "Country of origin"], citations: ["40 CFR §710", "19 CFR §134"], flags: ["Recycled content claim verification"] },
  "49": { desc: "Printed books / newspapers", agency: "CBP", forms: ["Commercial invoice", "Country of origin"], citations: ["19 CFR §134"], flags: ["Duty-free but MUST declare"] },
  "69": { desc: "Ceramic products", agency: "CPSC / CBP", forms: ["CPSC lead content cert (if applicable)", "Country of origin"], citations: ["16 CFR §1309", "19 CFR §134"], flags: ["Lead content testing > 0.01% banned", "Tableware ASTM F963"] },
  "70": { desc: "Glass and glassware", agency: "CPSC / CBP", forms: ["CPSC cert if applicable", "Country of origin"], citations: ["16 CFR §1501", "19 CFR §134"], flags: ["Glass厚度/thickness classification"] },
  "71": { desc: "Pearls / precious stones / metals / jewelry", agency: "CBP / OFAC", forms: ["Country of origin", "Gold/silver content mark (ftc)", "Kimberley cert (diamonds)"], citations: ["19 CFR §134", "15 USC §294", "31 CFR §501"], flags: ["Kimberley Process cert for rough diamonds", "Hallmarking required in some states"] },
  "72": { desc: "Iron / steel / articles", agency: "CBP / DOC", forms: ["AD/CVD documentation if applicable", "Country of origin", "Section 321 threshold check"], citations: ["19 CFR §351", "19 USC §1673"], flags: ["Section 201/232/Tariff 301 / steel 25%", "Anti-dumping on many steel products"] },
  "73": { desc: "Iron / steel articles (continued)", agency: "CBP / DOC", forms: ["AD/CVD documentation", "Country of origin mark"], citations: ["19 CFR §351"], flags: ["Same as Ch 72 — specify exact HTS 8-digit"] },
  "74": { desc: "Copper and articles thereof", agency: "CBP", forms: ["Country of origin", "Invoice with purity grade"], citations: ["19 CFR §134"], flags: ["AD/CVD watch on some copper wire"] },
  "75": { desc: "Nickel and articles thereof", agency: "CBP", forms: ["Country of origin"], citations: ["19 CFR §134"], flags: ["Nickel release restrictions (EU/US ASTM F2923)"] },
  "76": { desc: "Aluminum and articles thereof", agency: "CBP / DOC", forms: ["AD/CVD documentation if applicable", "Country of origin"], citations: ["19 CFR §351"], flags: ["Section 232 aluminum tariff watch", "Extrudion vs sheet classification"] },
  "78": { desc: "Lead and articles thereof", agency: "EPA / CPSC", forms: ["TSCA certification", "CPSC lead content cert"], citations: ["40 CFR §710", "16 CFR §1309"], flags: ["Lead content < 0.01% for children's products"] },
  "79": { desc: "Zinc and articles thereof", agency: "CBP", forms: ["Country of origin mark"], citations: ["19 CFR §134"], flags: ["Galvanization vs alloy classification"] },
  "80": { desc: "Tin and articles thereof", agency: "CBP", forms: ["Country of origin"], citations: ["19 CFR §134"], flags: ["Soldered items: lead content check"] },
  "81": { desc: "Base metals / cermets / articles", agency: "CBP", forms: ["Country of origin", "Processing history invoice"], citations: ["19 CFR §134"], flags: ["Multi-origin assembly: last substantial transformation"] },
  "82": { desc: "Tools / implements / cutlery", agency: "CPSC / CBP", forms: ["CPSC cert if applicable", "Country of origin mark"], citations: ["16 CFR §1501", "19 CFR §134"], flags: ["Sharp edge safety standard"] },
  "83": { desc: "Miscellaneous articles of base metal", agency: "CBP", forms: ["Country of origin mark"], citations: ["19 CFR §134"], flags: ["Primary use determines classification"] },
  "84": { desc: "Machinery / mechanical appliances / reactors", agency: "CBP / EPA / FAA", forms: ["EPA declaration (if air pollutant)", "FAA cert (if aviation)", "Country of origin", "Invoice with model/serial"], citations: ["40 CFR §82", "19 CFR §134"], flags: ["Refrigerant (HFC) restrictions under AIM Act", "FAA parts tracking"] },
  "85": { desc: "Electrical machinery / sound equipment", agency: "CPSC / FCC / FDA", forms: ["FCC ID / Supplier's Declaration of Conformity", "CPSC cert if applicable", "FDA wireless letter (if applicable)", "Country of origin label"], citations: ["47 CFR §15", "21 CFR §101", "19 CFR §134"], flags: ["Bluetooth/WiFi: FCC mandatory", "Battery: USDOT IATA / 49 CFR 173", "UL/CSA listing for appliances"] },
  "86": { desc: "Railway / tramway / rolling stock", agency: "FRA / EPA", forms: ["EPA emissions cert", "FRA safety inspection", "Country of origin"], citations: ["40 CFR §1033"], flags: ["Locomotive emission tiers"] },
  "87": { desc: "Vehicles (except railway)", agency: "EPA / DOT / NHTSA", forms: ["EPA emissions doc (40 CFR 89/86)", "DOT safety cert (49 CFR)", "Country of origin label", "VIN verified"], citations: ["40 CFR §86", "49 CFR §571", "19 CFR §134"], flags: ["25-year exemption for non-conforming vehicles", "O3 (ozone) compliance if >= 2026"] },
  "88": { desc: "Aircraft / spacecraft / parts", agency: "FAA / CBP", forms: ["FAA airworthiness cert", "Export docs from country of manufacture", "Country of origin"], citations: ["14 CFR §21", "19 CFR §134"], flags: ["ATA Carnet for temporary import", "Charging order if lien"] },
  "89": { desc: "Ships / boats / floating structures", agency: "USCG / CBP", forms: ["USCG documentation (if > 5 net tons)", "Country of origin cert", "Bill of sale with HIN"], citations: ["46 CFR §67", "19 CFR §134"], flags: ["HIN required for USCG documentation", "Yacht vs cargo classification"] },
  "90": { desc: "Optical / photographic / medical instruments", agency: "FDA / FCC / CBP", forms: ["FDA 510(k) or PMA (if medical)", "FCC ID (if wireless)", "Country of origin label"], citations: ["21 CFR §807", "47 CFR §15", "19 CFR §134"], flags: ["Medical device: FDA establishment registration", "Laser class warning label"] },
  "91": { desc: "Clocks / watches / timing apparatus", agency: "CPSC / CBP", forms: ["CPSC cert if applicable", "Battery declaration (USDOT)", "Country of origin"], citations: ["16 CFR §1501", "49 CFR §173", "19 CFR §134"], flags: ["Battery: lithium INR/IMR/IHR restricted"] },
  "92": { desc: "Musical instruments", agency: "CBP", forms: ["Country of origin label", "Commercial invoice with make/model"], citations: ["19 CFR §134"], flags: ["Wooden instruments: ISPM 15 if wood packing"] },
  "93": { desc: "Arms / ammunition", agency: "ATF / CBP", forms: ["ATF Form 6 / 6A import permit", "ATF Form 2 (if NFA item)", "Country of origin", "End-user certificate"], citations: ["27 CFR §478", "22 CFR §123"], flags: ["ATF bond required", "NFA items: $200 tax stamp", "State law varies — verify California/NY/etc"] },
  "94": { desc: "Furniture / bedding / lamps", agency: "CPSC / EPA / USDA", forms: ["CPSC flammability cert (16 CFR 1632/1633)", "Country of origin label", "USDA filling cert (if animal-derived)"], citations: ["16 CFR §1632", "16 CFR §1633", "7 CFR §585"], flags: ["Mattress: CPSC 1633 open-flame + smolder", "Composite wood: CARB/TSCA formaldehyde", "Filling: USDA veterinary cert if animal origin"] },
  "95": { desc: "Toys / games / sports equipment", agency: "CPSC / ASTM / CBP", forms: ["CPSC Children's Product Cert (CPC)", "ASTM F963 testing report", "CPSIA lead/phthalate test (if <=12 years)", "Country of origin label"], citations: ["15 USC §2051", "16 CFR §1250", "16 CFR §1309"], flags: ["Lead < 100 ppm mandatory", "Phthalates 6REACH restricted", "Tracking label required (15 USC 2063)"] },
  "96": { desc: "Miscellaneous manufactured articles", agency: "CPSC / CBP", forms: ["CPSC cert if applicable", "Country of origin"], citations: ["16 CFR §1501", "19 CFR §134"], flags: ["Check primary use for classification"] },
  "97": { desc: "Works of art / antiques", agency: "CBP", forms: ["Country of origin", "Provenance documentation", "Temporary importation under bond (ATA Carnet)"], citations: ["19 CFR §134", "19 CFR §10.35"], flags: ["ATA Carnet for temporary import", "Cultural property agreements"] }
};

// Chapter-level mapping for any HTS code
function getPaperworkForHTS(htsCode) {
  const chapter = htsCode.replace(/\./g, '').slice(0, 2);
  const entry = PAPERWORK_BY_CHAPTER[chapter];
  if (!entry) return null;
  return entry;
}

// Export for use in tool pages
if (typeof window !== 'undefined') {
  window.CIQ = window.CIQ || {};
  window.CIQ.PAPERWORK_BY_CHAPTER = PAPERWORK_BY_CHAPTER;
  window.CIQ.getPaperworkForHTS = getPaperworkForHTS;
}
