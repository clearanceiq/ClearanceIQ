// start-here.js — ClearanceIQ onboarding decision tree

const TREE = {
  electronics: {
    label: 'Electronics',
    step2Title: 'What type of electronics?',
    step2Subtitle: 'Pick the closest match.',
    options: {
      consumer_device: { label: 'Complete device (phone, speaker, wearable)', chapters: ['85'] },
      computer_accessory: { label: 'Computer / IT accessory (keyboard, mouse, monitor)', chapters: ['84', '85'] },
      component_only: { label: 'Component / spare part (circuit board, battery, LED)', chapters: ['85'] },
      other: { label: 'Other electronics', chapters: ['85', '84'] }
    }
  },
  textiles: {
    label: 'Textiles / Clothing / Footwear',
    step2Title: 'What exactly are you importing?',
    step2Subtitle: 'Choose the best description.',
    options: {
      apparel: { label: 'Clothing / Apparel (shirts, dresses, outerwear)', chapters: ['61', '62'] },
      footwear: { label: 'Footwear (shoes, boots, sandals)', chapters: ['64'] },
      fabric_raw: { label: 'Fabric / raw textile (woven, knitted, yarn)', chapters: ['50', '51', '52', '54', '55', '59'] },
      home_textiles: { label: 'Home textiles (bedding, towels, curtains)', chapters: ['63'] },
      other: { label: 'Other textile articles', chapters: ['96', '63'] }
    }
  },
  food: {
    label: 'Food / Agriculture',
    step2Title: 'What kind of food product?',
    step2Subtitle: 'Be specific — rules change by product.',
    options: {
      fresh_produce: { label: 'Fresh fruits or vegetables', chapters: ['07', '08'] },
      meat_dairy: { label: 'Meat, dairy, eggs, or honey', chapters: ['02', '04'] },
      processed_food: { label: 'Packaged / processed food (snacks, sauces)', chapters: ['16', '17', '19', '20', '21'] },
      beverages: { label: 'Beverages (coffee, tea, juice, alcohol)', chapters: ['09', '20', '22'] },
      supplements: { label: 'Dietary supplements / nutraceuticals', chapters: ['21', '30'] },
      seafood: { label: 'Fish / seafood', chapters: ['03'] },
      other: { label: 'Other food/ag product', chapters: ['01', '05', '06', '10', '11', '12', '13'] }
    }
  },
  machinery: {
    label: 'Machinery / Parts',
    step2Title: 'What type of machinery?',
    step2Subtitle: 'Select the closest category.',
    options: {
      electrical_machinery: { label: 'Electrical machinery (motors, generators)', chapters: ['85'] },
      mechanical_equipment: { label: 'Mechanical equipment (pumps, engines, tools)', chapters: ['84'] },
      parts_accessories: { label: 'Parts / accessories for machinery', chapters: ['84', '85'] },
      other: { label: 'Other machinery', chapters: ['84', '85'] }
    }
  },
  chemicals: {
    label: 'Chemicals / Plastics',
    step2Title: 'What material are you importing?',
    step2Subtitle: 'Chapter 38 = chemicals, Chapter 39 = plastics.',
    options: {
      plastics_articles: { label: 'Plastic articles (containers, packaging, molded parts)', chapters: ['39'] },
      rubber_articles: { label: 'Rubber articles (seals, gaskets, tires)', chapters: ['40'] },
      chemicals: { label: 'Industrial chemicals / intermediates', chapters: ['38'] },
      other: { label: 'Other chemical/plastic materials', chapters: ['38', '39', '40'] }
    }
  },
  furniture: {
    label: 'Furniture / Home',
    step2Title: 'What type of furniture or home item?',
    step2Subtitle: 'Material matters for duty and compliance.',
    options: {
      upholstered: { label: 'Upholstered furniture / mattress (CPSC 1633 required)', chapters: ['94'] },
      wood_furniture: { label: 'Wood furniture (ISPM 15 if wood packing)', chapters: ['94', '44'] },
      metal_plastic: { label: 'Metal or plastic furniture', chapters: ['94', '83', '84'] },
      home_goods: { label: 'Home goods (lamps, lighting)', chapters: ['94', '85'] },
      other: { label: 'Other home/furniture', chapters: ['94', '96'] }
    }
  },
  toys: {
    label: 'Toys / Games / Sports',
    step2Title: 'Is this a children\'s product or general sports/games?',
    step2Subtitle: 'CPSC and ASTM F963 rules apply to kids\' products.',
    options: {
      childrens_toy: { label: 'Toy specifically for children', chapters: ['95'] },
      sports_equipment: { label: 'Sports / outdoor equipment', chapters: ['95'] },
      games_puzzles: { label: 'Board games, puzzles, educational products', chapters: ['95'] },
      other: { label: 'Other toys/games/sports', chapters: ['95', '96'] }
    }
  },
  vehicles: {
    label: 'Vehicles / Parts',
    step2Title: 'What are you importing?',
    step2Subtitle: 'Vehicles have EPA, DOT, and NHTSA requirements.',
    options: {
      complete_vehicle: { label: 'Complete vehicle (car, motorcycle, ATV)', chapters: ['87'] },
      parts_accessories: { label: 'Replacement parts / accessories', chapters: ['87'] },
      aircraft: { label: 'Aircraft / drones / parts', chapters: ['87', '88'] },
      other: { label: 'Other vehicles/pcs', chapters: ['87', '95'] }
    }
  },
  wood: {
    label: 'Wood / Wood Packaging',
    step2Title: 'What wood product?',
    step2Subtitle: 'Wood packaging MUST have ISPM 15 mark.',
    options: {
      lumber: { label: 'Lumber, plywood, engineered wood', chapters: ['44'] },
      packaging: { label: 'Pallets, crates, wood packaging material', chapters: ['44'] },
      finished_wood: { label: 'Finished wood products (furniture parts, decor)', chapters: ['44', '94'] },
      other: { label: 'Other wood articles', chapters: ['44'] }
    }
  },
  metals: {
    label: 'Metals / Steel / Aluminum',
    step2Title: 'What metal or form?',
    step2Subtitle: 'AD/CVD is common on metals from China.',
    options: {
      steel_iron: { label: 'Steel / iron products (rods, sheets, fasteners)', chapters: ['72', '73'] },
      aluminum: { label: 'Aluminum products (extrusions, sheets, foil)', chapters: ['76'] },
      copper: { label: 'Copper wire / cable / fittings', chapters: ['74'] },
      other: { label: 'Other metal articles', chapters: ['78', '79', '80', '81', '83'] }
    }
  },
  jewelry: {
    label: 'Jewelry / Watches / Gems',
    step2Title: 'What type of jewelry or accessories?',
    step2Subtitle: 'Watch batteries, gold marking, and diamond certs matter.',
    options: {
      fine_jewelry: { label: 'Fine jewelry (gold, platinum, precious stones)', chapters: ['71'] },
      costume_jewelry: { label: 'Costume / fashion jewelry (non-precious)', chapters: ['71'] },
      watches: { label: 'Watches / timepieces', chapters: ['91'] },
      other: { label: 'Other jewelry/gems', chapters: ['71'] }
    }
  },
  medical: {
    label: 'Medical / Optics',
    step2Title: 'What are you importing?',
    step2Subtitle: 'FDA registration and FCC IDs may be mandatory.',
    options: {
      medical_device: { label: 'Medical device (diagnostic, surgical, implant)', chapters: ['90'] },
      optical_instruments: { label: 'Optical / photographic instruments', chapters: ['90'] },
      other: { label: 'Other medical/optical', chapters: ['90', '84'] }
    }
  },
  other: {
    label: 'Other',
    step2Title: 'Describe your item briefly.',
    step2Subtitle: 'We will match you to the closest HTS chapter.',
    options: {
      general_manufactured: { label: 'General manufactured goods', chapters: ['96'] },
      art_antique: { label: 'Works of art / antiques', chapters: ['97'] },
      printed_materials: { label: 'Books, magazines, printed matter', chapters: ['49'] },
      other: { label: 'Something else entirely', chapters: ['98'] }
    }
  }
};

const COUNTRY_RULES = {
  china: { name: 'China', flags: ['Section 301 List 4 / List 3 tariff review — check if your HTS code is on the 301 watch list', 'Anti-dumping (AD) and countervailing duties (CVD) on many product categories — verify annual AD/CVD commodity scope'], risk: 'high' },
  vietnam: { name: 'Vietnam', flags: ['Anti-dumping on certain footwear, textiles, and seafood from Vietnam — verify Federal Register scopes'], risk: 'medium' },
  india: { name: 'India', flags: ['Anti-dumping on certain steel, chemicals, and IT products from India — verify Federal Register scopes'], risk: 'medium' },
  eu: { name: 'European Union', flags: ['Generalized System of Preferences (GSP) may apply — check code eligibility', 'No blanket Section 301 on EU, but verify product-specific changes'], risk: 'low' },
  mexico: { name: 'Mexico', flags: ['USMCA/USMCA preferential treatment available if origin criteria met — do the paperwork first', 'Certificate of Origin required to claim USMCA rate'], risk: 'low' },
  other_country: { name: 'Other', flags: ['Verify country-specific AD/CVD scope on your HTS code', 'Verify bilateral trade agreement eligibility'], risk: 'medium' }
};

const CHAPTER_CONTEXT = {}; // loaded from hts-paperwork.js via window.CIQ

let state = {
  category: null,
  sub: null,
  country: null
};

function showPanel(id) {
  document.querySelectorAll('.step-panel').forEach(el => el.style.display = 'none');
  document.getElementById(id).style.display = 'block';
}

function buildStep2(categoryKey) {
  const cat = TREE[categoryKey];
  if (!cat) return;
  state.category = categoryKey;

  document.getElementById('step2-title').textContent = cat.step2Title;
  document.getElementById('step2-subtitle').textContent = cat.step2Subtitle;
  const container = document.getElementById('step2-options');
  container.innerHTML = Object.entries(cat.options).map(([key, opt]) => `
    <button class="option-card" data-value="${key}">
      <span class="option-icon">📌</span>
      <b>${opt.label}</b>
    </button>
  `).join('');

  container.querySelectorAll('.option-card').forEach(btn => btn.addEventListener('click', () => {
    state.sub = btn.dataset.value;
    showPanel('step-3');
  }));

  showPanel('step-2');
}

function buildResult() {
  const sub = state.category ? TREE[state.category].options[state.sub] : null;
  const chapters = sub ? sub.chapters : [];
  const countryRule = state.country ? COUNTRY_RULES[state.country] : null;

  // Fetch paperwork from hts-paperwork.js
  let paperworkEntries = [];
  const paperworkMap = (window.CIQ && window.CIQ.PAPERWORK_BY_CHAPTER) ? window.CIQ.PAPERWORK_BY_CHAPTER : {};
  chapters.forEach(ch => {
    const entry = paperworkMap[ch];
    if (entry) paperworkEntries.push({ chapter: ch, ...entry });
  });

  // Build result
  let html = '';

  // Chips
  html += '<div style="display:flex; gap:10px; flex-wrap:wrap; margin:14px 0;">';
  chapters.forEach(ch => {
    html += `<span class="risk-badge risk-${countryRule && countryRule.risk === 'high' ? 'high' : 'medium'}">Chapter ${ch}</span>`;
  });
  html += '</div>';

  // Country risk
  if (countryRule) {
    html += `<div class="box" style="margin-top:0;">
      <b>From ${countryRule.name}</b>
      <ul class="clean" style="margin-top:8px;">
        ${countryRule.flags.map(f => `<li style="margin-bottom:6px;">⚠ ${f}</li>`).join('')}
      </ul>
    </div>`;
  }

  // Agency and paperwork
  if (paperworkEntries.length) {
    paperworkEntries.forEach(entry => {
      html += `<div class="box" style="margin-top:16px;">
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
          <b>Likely agency: ${entry.agency}</b>
          <span class="risk-badge risk-medium">Chapter ${entry.chapter}</span>
        </div>
        <p class="muted" style="font-size:13px; margin-top:4px;">${entry.desc}</p>
        <b style="font-size:13px; margin-top:10px; display:block;">Required forms & certificates:</b>
        <ul class="clean" style="margin-top:4px;">
          ${entry.forms.map(f => `<li style="margin-bottom:4px;">✓ ${f}</li>`).join('')}
        </ul>
        <p style="font-size:12px; color:var(--muted); margin-top:8px;"><b>Citations:</b> ${entry.citations.join('; ')}</p>
        ${entry.flags.length ? `<div style="margin-top:10px; background:#fffbeb; border-left:3px solid #f59e0b; padding:10px; border-radius:8px;">
          <b style="font-size:13px;">⚠ Flags:</b>
          <ul class="clean" style="margin-top:4px;">
            ${entry.flags.map(f => `<li style="margin-bottom:3px;">${f}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>`;
    });
  }

  // Standard items always present for US imports
  html += `<div class="box" style="margin-top:16px;">
    <b>Always required for any US import shipment</b>
    <ul class="clean" style="margin-top:8px;">
      <li style="margin-bottom:4px;">✓ Commercial invoice with declared value, incoterms, and currency</li>
      <li style="margin-bottom:4px;">✓ Packing list with weights and package marks</li>
      <li style="margin-bottom:4px;">✓ Bill of lading or airway bill</li>
      <li style="margin-bottom:4px;">✓ Valid HTS code for every line item</li>
    </ul>
  </div>`;

  // Actions
  html += `<div class="box" style="margin-top:16px; background:#eff6ff; border-color:#bfdbfe;">
    <b>Next steps</b>
    <div style="display:flex; flex-wrap:wrap; gap:10px; margin-top:12px;">
      <a class="cta secondary" href="/tools/compliance-checklist.html">Open Compliance Checklist</a>
      <a class="cta secondary" href="/tools/hts-lookup.html">Look up your HTS code</a>
    </div>
    <p style="font-size:13px; color:var(--muted); margin-top:10px;">Planning reference only. Not a ruling. Always consult a licensed customs broker.</p>
  </div>`;

  document.getElementById('result-body').innerHTML = html;
  showPanel('step-result');
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Step 1
  document.getElementById('step1-options').querySelectorAll('.option-card').forEach(btn => {
    btn.addEventListener('click', () => buildStep2(btn.dataset.value));
  });

  // Step 3
  document.getElementById('step3-options').querySelectorAll('.option-card').forEach(btn => {
    btn.addEventListener('click', () => {
      state.country = btn.dataset.value;
      buildResult();
    });
  });
});
