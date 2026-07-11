const inMemoryLimits = new Map();

async function consumeLimit(key, dailyCap, env) {
  let entry;
  const hasKV = env && (env.TELEMETRY || env.telemetry);
  const kvKey = `rate::${key}`;

  if (hasKV) {
    const raw = await (env.TELEMETRY || env.telemetry).get(kvKey);
    const count = raw ? parseInt(raw, 10) : 0;
    const newCount = count + 1;
    try {
      await (env.TELEMETRY || env.telemetry).put(kvKey, String(newCount), { expirationTtl: 48 * 60 * 60 });
      entry = { count: newCount };
    } catch (err) {
      if (!inMemoryLimits.has(key)) {
        inMemoryLimits.set(key, { count: 0, ts: Date.now() });
      }
      entry = inMemoryLimits.get(key);
      entry.count += 1;
      entry.ts = Date.now();
    }
  } else {
    if (!inMemoryLimits.has(key)) {
      inMemoryLimits.set(key, { count: 0, ts: Date.now() });
    }
    entry = inMemoryLimits.get(key);
    entry.count += 1;
    entry.ts = Date.now();
  }

  const remaining = Math.max(0, dailyCap - entry.count);
  const limited = entry.count > dailyCap;

  const now = new Date();
  const nextMidnightUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  ));
  const resetUnix = Math.floor(nextMidnightUTC.getTime() / 1000);

  return {
    remaining,
    limited,
    limit: dailyCap,
    used: entry.count,
    resetAt: nextMidnightUTC.toISOString(),
    resetUnix,
  };
}

function resolveRateLimitContext(context, { anonymousCap = 5, signedCap = 100 } = {}) {
  const date = new Date().toISOString().slice(0, 10);
  const ip =
    (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_') + '::' + date;
  const apiKey = (context.request.headers.get('X-API-Key') || '').trim();
  if (apiKey) {
    return {
      key: 'key::' + apiKey + '::' + date,
      cap: signedCap,
      tier: 'signed',
      apiKey,
    };
  }
  return {
    key: ip,
    cap: anonymousCap,
    tier: 'anonymous',
    apiKey: '',
  };
}

function cors(headers = {}) {
  return {
    'content-type': 'application/json',
    'access-control-allow-origin': 'https://clearance-iq.com',
    'access-control-allow-headers': 'content-type, x-api-key',
    ...headers,
  };
}

async function logUsage(tier, endpoint, context, result) {
  try {
    const rawIp = (context.request.headers.get('CF-Connecting-IP') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_');
    const anonIp = rawIp.length >= 5 ? rawIp.slice(0, 3) + '***' + rawIp.slice(-3) : '***';
    const date = new Date().toISOString().slice(0, 10);
    const tag =
      tier === 'signed'
        ? (context.request.headers.get('X-API-Key') || 'unknown').replace(/[^a-zA-Z0-9:._-]/g, '_').slice(0, 16)
        : anonIp;
    const entry = JSON.stringify({ ts: new Date().toISOString(), tier, endpoint, ip: anonIp, result: result || 'ok' });
    const key = `usage::${date}::${tier}::${tag}::${endpoint}`;
    if ((context.env.TELEMETRY || context.env.telemetry)) {
      await (context.env.TELEMETRY || context.env.telemetry).put(key, entry, { expirationTtl: 72 * 60 * 60 });
    }
  } catch (err) {
    // logging is optional
  }
}

// ---- Official HTS 2026 Rev 11 duty-rate lookup (real published data) ----
let _htsData = null;
let _htsPromise = null;
async function getHtsData(context) {
  if (_htsData) return _htsData;
  if (_htsPromise) return _htsPromise;
  _htsPromise = (async () => {
    try {
      const url = new URL('/data/hts-data.json', context.request.url);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('hts-data http ' + res.status);
      _htsData = await res.json();
    } catch (e) {
      _htsData = {}; // graceful degrade -> candidate fallback
    }
    return _htsData;
  })();
  return _htsPromise;
}
function base8(code) {
  const m = String(code || '').match(/^(\d{4}\.\d{2}\.\d{2})/);
  return m ? m[1] : String(code || '').slice(0, 10);
}
async function lookupRate(code, context) {
  const data = await getHtsData(context);
  if (!data || typeof data !== 'object') return null;
  const b = base8(code);
  return data[b] || data[code] || null;
}

export async function onRequestGet(context) {
  try {
    const { key, cap, tier } = resolveRateLimitContext(context, { anonymousCap: 5, signedCap: 100 });
    const limit = await consumeLimit(key, cap, context.env);

    if (limit.limited) {
      await logUsage(tier, 'v1/hts', context, 'rate_limit');
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'rate_limit',
          tier,
          remaining: 0,
          used: limit.limit,
          limit: limit.limit,
          resetAt: limit.resetAt,
          upgrade: 'Sign up for free at / and get 100/day, or go Pro at /api-pricing for unlimited.',
        }),
        {
          headers: cors({
            'retry-after': '86400',
            'x-rate-limit-remaining': '0',
            'x-rate-limit-limit': String(limit.limit),
            'x-rate-limit-tier': tier,
            'x-rate-limit-reset': String(limit.resetUnix),
          }),
          status: 429,
        }
      );
    }

    const url = new URL(context.request.url);
    const qRaw = (url.searchParams.get('q') || '').trim();
    const desc = (url.searchParams.get('desc') || '').trim();
    const material = (url.searchParams.get('material') || '').trim();
    const enduse = (url.searchParams.get('enduse') || '').trim();
    const query = [qRaw, desc, material, enduse].filter(Boolean).join(' ').toLowerCase();
    const combined = [qRaw, desc, material, enduse].filter(Boolean).join(' ');

    if (!query) {
      await logUsage(tier, 'v1/hts', context, 'error');
      return new Response(
        JSON.stringify({ ok: false, error: 'q or product details required', suggest: 'Please provide the product description, material composition, and intended end use so we can identify a better HTS match.' }),
        {
          headers: cors({
            'x-rate-limit-remaining': String(Math.max(0, limit.remaining - 1)),
            'x-rate-limit-limit': String(limit.limit),
            'x-rate-limit-tier': tier,
            'x-rate-limit-reset': String(limit.resetUnix),
          }),
          status: 400,
        }
      );
    }

    if (/^https?:\/\//i.test(combined) || combined.includes('://') || /amazon\.com|amzn\.to|youtube\.com|youtu\.be/i.test(combined)) {
      await logUsage(tier, 'v1/hts', context, 'no_match');
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'no_match',
          suggest: 'That looks like a product link. Please paste the product description, material composition, and intended end use so we can identify a better HTS match.',
        }),
        {
          headers: cors({
            'x-rate-limit-remaining': String(Math.max(0, limit.remaining - 1)),
            'x-rate-limit-limit': String(limit.limit),
            'x-rate-limit-tier': tier,
            'x-rate-limit-reset': String(limit.resetUnix),
          }),
        }
      );
    }

    const DATA = [
      { code: '8518.30.0000', desc: 'Loudspeaker for home theater entry system', material: 'ABS plastic cone + copper voice coil + steel magnet', enduse: 'Sound reproduction in living rooms and home theaters', duty: 'Free', adcvd: 'none', keywords: ['loudspeaker','speaker','soundbar','pa speaker','woofer','bookshelf speaker','audio speaker'] },
      { code: '8518.40.0000', desc: 'Wired noise-cancelling headset for call center', material: 'ABS housing + 40mm dynamic driver + leatherette + foam', enduse: 'Single-agent audio for contact-center workers', duty: 'Free', adcvd: 'none', keywords: ['headphone','earphone','headset','earbud','airpod','earbuds','wearable audio','bluetooth headphone','calls music','wireless headphone'] },
      { code: '8517.12.0095', desc: 'Unlocked smartphone replacement unit', material: 'Aluminum frame + Gorilla Glass + lithium-ion battery + PCBA', enduse: 'Consumer communication and app-based navigation', duty: 'Free', adcvd: 'none', keywords: ['smartphone','phone','mobile','cell phone','android','iphone','handset'] },
      { code: '8517.62.0000', desc: 'Indoor cellular signal booster kit', material: 'Steel chassis + ceramic duplexer + RF coaxial cable', enduse: 'Amplify weak indoor carrier signal', duty: 'Free', adcvd: 'none', keywords: ['base station','repeater','signal booster','cell repeater'] },
      { code: '9013.80.0010', desc: 'LED floor-standing digital signage panel', material: 'Aluminum extrusion frame + diffuser PMMA + LED SMD modules', enduse: 'Permanent retail advertisement and menu boards', duty: 'Free', adcvd: 'none', keywords: ['led display','led panel','lcd panel','monitor','screen','digital signage'] },
      { code: '9013.90.5000', desc: 'Compact laser distance meter module', material: 'ABS housing + GaAs laser diode + photodiode receiver', enduse: 'Construction layout and warehouse pallet ranging', duty: 'Free', adcvd: 'none', keywords: ['optical','lens module','projector lens','rangefinder'] },
      { code: '8528.71.0000', desc: 'Portable mini projector for field presentations', material: 'ABS + polycarbonate lens barrel + LED light engine', enduse: 'Traveler business meetings and impromptu screenings', duty: 'Free', adcvd: 'none', keywords: ['projector','beamer','video projector','projection'] },
      { code: '8525.80.0010', desc: 'Streaming webcam with auto-focus', material: 'Aluminum alloy + glass lens + USB-C controller', enduse: 'Remote meeting and live-stream capture', duty: 'Free', adcvd: 'none', keywords: ['camcorder','action camera','camera','gopro','dslr'] },
      { code: '7323.94.0000', desc: '2-piece non-stick frying pan set', material: '18/10 stainless steel + Teflon-style PTFE coating', enduse: 'Home cooktop food preparation', duty: 'Free', adcvd: 'none', keywords: ['pot','pan','cookware','kitchenware','stainless cookware','nonstick pan','frying pan','saucepan','skillet','wok','steamer'] },
      { code: '7610.90.0050', desc: 'Sliding-door aluminum frame for office partition', material: '6063 aluminum extrusion + polyamide thermal break + EPDM gasket', enduse: 'Commercial interior fit-out and office walls', duty: 'Free', adcvd: 'none', keywords: ['aluminum structure','aluminum frame','extrusion','aluminum profile','partition frame'] },
      { code: '8302.42.3000', desc: 'Adjustable butt hinge for cabinet door', material: 'Carbon steel + zinc-plate + sintered-brass pivot', enduse: 'Kitchen and wardrobe cabinet installation', duty: 'Free', adcvd: 'none', keywords: ['hinge','butt hinge','cabinet hinge','door hinge'] },
      { code: '9403.10.0000', desc: 'Industrial cantilever office desk', material: 'Cold-rolled steel legs + powder coat + MFC desktop', enduse: 'Call-center and back-office workstation', duty: 'Free', adcvd: 'none', keywords: ['desk','cabinet','shelf','file cabinet','office chair','workstation','computer desk','office desk'] },
      { code: '9403.20.0040', desc: 'Mesh task chair with lumbar support', material: 'Nylon Payload frame + steel gas lift + polyester mesh', enduse: 'Office seating for 8-hour desktop work', duty: 'Free', adcvd: 'none', keywords: ['chair','stool','bench','seat','office seat','task chair'] },
      { code: '9403.50.0000', desc: 'Adjustable-height pine office table', material: 'Radiata pine + steel legs + melamine edging', enduse: 'Standing-desk home-office setup', duty: 'Free', adcvd: 'none', keywords: ['table','dining table','standing desk','desk','pine table','office table'] },
      { code: '9403.60.8000', desc: 'Steel wardrobe for staff locker room', material: 'Galvanized steel + swing doors + chrome handle', enduse: 'Industrial changing-room storage', duty: 'Free', adcvd: 'none', keywords: ['sofa','couch','wardrobe','bed frame','cabinet','locker'] },
      { code: '8509.80.0040', desc: 'Cordless stick vacuum cleaner', material: 'HIPS housing + NMC battery + cyclonic dust separator', enduse: 'Residential and automotive interior cleaning', duty: 'Free', adcvd: 'none', keywords: ['vacuum','robot vacuum','vacuum cleaner','cordless vacuum','cleaner'] },
      { code: '8516.32.0000', desc: 'Professional hair dryer with diffuser', material: 'Polycarbonate + ceramic heating element + tourmaline grille', enduse: 'Salon blow-dry styling and home drying', duty: 'Free', adcvd: 'none', keywords: ['hair dryer','blow dryer','blower','hair straightener','flat iron'] },
      { code: '8516.33.0000', desc: 'Automatic hand dryer for commercial restroom', material: 'Stainless steel 430 + infrared sensor + 1300W heater', enduse: 'Public washroom hand drying', duty: 'Free', adcvd: 'none', keywords: ['hand dryer'] },
      { code: '8421.23.0000', desc: 'Inline fuel filter for generator line', material: 'Carbon steel shell + cellulose filter media + nitrile O-ring', enduse: 'Fuel-system particulate protection for small engines', duty: 'Free', adcvd: 'none', keywords: ['oil filter','fuel filter','air filter','filter','filtration'] },
      { code: '6109.10.2000', desc: 'Cotton crew-neck T-shirt for retail blank', material: 'Cotton jersey 180 GSM + rib collar + lock-stitch seams', enduse: 'Promotional uniform and casual wear', duty: 'Free', adcvd: 'none', keywords: ['t-shirt','cotton shirt','crew neck','cotton tee'] },
      { code: '6109.10.3000', desc: 'Sublimation polyester tee for team apparel', material: '100% polyester warp-knit + moisture-wicking finish', enduse: 'Recreational sports uniform and event merch', duty: 'Free', adcvd: 'none', keywords: ['polyester tee','synthetic tee','sports tee','sublimation tee'] },
      { code: '6110.20.2070', desc: 'Hooded cotton pullover sweatshirt', material: 'Cotton loopback fleece + polyester drawcord + nickel aglets', enduse: 'Gym warmup and cold-weather streetwear', duty: 'Free', adcvd: 'none', keywords: ['sweatshirt','hoodie','hooded','pullover','crewneck'] },
      { code: '6110.12.1020', desc: 'Rib-knit cashmere-blend sweater for women', material: 'Cashmere 30% + Merino wool 70% + horn buttons', enduse: 'Cold-weather layering for everyday office and social', duty: 'Free', adcvd: 'none', keywords: ['sweater','jumper','knit','cardigan','pullover','wool sweater'] },
      { code: '6203.42.4011', desc: 'Chino trousers for office uniform', material: 'Cotton twill 240 GSM + polyester-cotton pocketing + rivet', enduse: 'Professional trousers for corporate uniform', duty: 'Free', adcvd: 'none', keywords: ['trouser','pant','chino','cargo pants','jeans','denim','work pant'] },
      { code: '6203.49.8041', desc: 'Performance jogger for weekend wear', material: 'French terry cotton/poly + elastic waistband + zippered pockets', enduse: 'Leisure and weekend casual travel', duty: 'Free', adcvd: 'none', keywords: ['jogger','sweatpant','legging','yoga pant'] },
      { code: '6204.62.3011', desc: 'Ladies cargo pants for fieldwork', material: 'Cotton canvas + YKK zippers + reinforced knee panels', enduse: 'Trade-show setup and outdoor inspection work', duty: 'Free', adcvd: 'none', keywords: ['women trouser','ladies pant','capri','culotte','cargo pant'] },
      { code: '6204.63.3011', desc: 'Stretch workout leggings for women', material: 'Nylon/spandex + flatlock seams + wide waistband', enduse: 'Sports training and studio fitness wear', duty: 'Free', adcvd: 'none', keywords: ['women jogger','legging','leggings','stretch pant'] },
      { code: '6205.20.2020', desc: 'Oxford button-down shirt for uniform', material: 'Pima cotton + mother-of-pearl buttons + interlining', enduse: 'Dress-shirt layer for business and hospitality roles', duty: 'Free', adcvd: 'none', keywords: ['shirt','polo','oxford','button down','dress shirt','formal shirt'] },
      { code: '6206.10.3050', desc: 'Silk blouse for client-facing meetings', material: 'Polyester chiffon + satin lining + snap closures', enduse: 'Business meeting and office-leisure wear', duty: 'Free', adcvd: 'none', keywords: ['blouse','silk blouse','women top','satin blouse'] },
      { code: '6206.20.5050', desc: 'Satin blouse for retail display set', material: 'Satin polyester + hook-and-loop back closure + rhinestone trim', enduse: 'Visual merchandising display and fashion retail', duty: 'Free', adcvd: 'none', keywords: ['blouse','women top','mock neck','silk blouse','satin top','poly blouse'] },
      { code: '6211.42.0040', desc: 'Rash guard swimsuit for beach patrol', material: '82% nylon/18% spandex + flatlock seams + UV-resistant dye', enduse: 'Active outdoor water sport and coastal duty', duty: 'Free', adcvd: 'none', keywords: ['swim','swimsuit','bikini','one piece','swimsuits','coverup','rash guard'] },
      { code: '6211.43.0040', desc: 'Boardshort with internal pocket', material: 'Nylon taslan + mesh brief + plastic D-ring', enduse: 'Recreational surfing and poolside beach wear', duty: 'Free', adcvd: 'none', keywords: ['trunk','boardshort','swim trunk','mens swimwear'] },
      { code: '6201.12.0010', desc: 'Puffer jacket for sub-zero logistics', material: 'Pongee nylon + 350g down alternative + elastic hem', enduse: 'Outdoor winter transportation and warehouse cold-storage work', duty: 'Free', adcvd: 'none', keywords: ['puffer','puffer jacket','down jacket','quilted jacket','parka','padded jacket'] },
      { code: '6201.93.3010', desc: 'Soft-shell jacket for warehouse supervisor', material: 'Polyester soft-shell + TPU membrane + reinforced elbows', enduse: 'Light rain and wind protection during facility inspections', duty: 'Free', adcvd: 'none', keywords: ['windbreaker','anorak','track jacket','shell jacket','softshell'] },
      { code: '6202.11.0000', desc: 'Insulated winter parka for site safety crew', material: 'Nylon ripstop + 220g polyester fill + reflective tape', enduse: 'Site-access guard role in cold regions', duty: 'Free', adcvd: 'none', keywords: ['puffer','womens jacket','down jacket','puffer jacket','quilted jacket','parka'] },
      { code: '6202.93.3010', desc: 'Windbreaker for security patrol', material: '100% polyester microfibre + storm flap + siliconized zipper', enduse: 'Perimeter walking in variable weather', duty: 'Free', adcvd: 'none', keywords: ['windbreaker','womens windbreaker','track jacket','light jacket'] },
      { code: '6115.95.3050', desc: 'Base-layer thermal long johns set', material: 'Nylon + polypropylene + brushed inner pile', enduse: 'Glacier warehouse cold-room work', duty: 'Free', adcvd: 'none', keywords: ['compression','base layer','thermal','rash guard','rashguard','long john'] },
      { code: '6112.00.3500', desc: 'Bodysuit 100% cotton for infant goods showroom', material: 'Cotton interlock + snap crotch + envelope neck', enduse: 'Store display infant apparel and protective newborn wear', duty: 'Free', adcvd: 'none', keywords: ['onesie','baby','infant','toddler','romper','newborn','bodysuit'] },
      { code: '6204.69.6010', desc: 'Midi skirt for sales showroom event', material: 'Polyester crepe + invisible zipper + satin lining', enduse: 'Semiformal trade-show hostess outfits', duty: 'Free', adcvd: 'none', keywords: ['skirt','midi skirt','pleated skirt','tennis skirt','womens skirt'] },
      { code: '6104.63.1011', desc: 'Maxi dress for product launch evening', material: 'Polyester chiffon + stitched lining + spaghetti straps', enduse: 'Corporate evening event wear', duty: 'Free', adcvd: 'none', keywords: ['dress','maxi dress','midi dress','wrap dress','sundress','evening dress'] },
      { code: '6104.69.2060', desc: 'Linen shirt dress for factory visit', material: 'Cotton-linen blend + mother-of-pearl buttons + shirt hem', enduse: 'Female auditor tour-wear with conservative coverage', duty: 'Free', adcvd: 'none', keywords: ['cotton dress','linen dress','shirt dress','pinafore'] },
      { code: '6204.59.6020', desc: 'Cocktail dress for client dinner', material: 'Satin-face polyester + boned bodice + zipper closure', enduse: 'After-hours client entertainment apparel', duty: 'Free', adcvd: 'none', keywords: ['dress','formal dress','evening dress','cocktail dress','gown'] },
      { code: '5407.61.1000', desc: 'Twill polyester uniform gabardine fabric', material: '100% polyester 190 GSM + wrinkle-resistant finish', enduse: 'Corporate uniform shirting and lining panels', duty: 'Free', adcvd: 'none', keywords: ['polyester fabric','woven','poly fabric','outerwear fabric','gabardine'] },
      { code: '5407.10.2000', desc: 'Ripstop nylon shell for outdoor packs', material: '70D nylon + PVC-free polyurethane coating + DWR finish', enduse: 'Tent flysheet and protective gear shell', duty: 'Free', adcvd: 'none', keywords: ['nylon fabric','ripstop','ballistic nylon','nylon','spandex fabric','ripstop nylon'] },
      { code: '5208.11.3560', desc: 'Poplin office shirt fabric', material: 'Cotton 120s + mercerized finish + easy-care resin', enduse: 'Hotel and airline uniform formal shirts', duty: 'Free', adcvd: 'none', keywords: ['cotton fabric','plain weave','sheeting','poplin','calico','canvas'] },
      { code: '5208.29.3560', desc: 'Chino twill fabric for uniform trousers', material: 'Cotton 8.5 oz + milled finish + piece-dyed', enduse: 'Crew-trouser corporate uniform material', duty: 'Free', adcvd: 'none', keywords: ['twill','denim fabric','chino fabric','drill fabric','cotton twill'] },
      { code: '5512.11.0000', desc: 'Antipill polar fleece for jacket lining', material: '100% polyester 300 GSM + anti-static treatment + brushed face', enduse: 'Casual outerwear lining and throw-blanket goods', duty: 'Free', adcvd: 'none', keywords: ['fleece fabric','polar fleece','microfleece','fleece'] },
      { code: '6001.10.2000', desc: 'Heavy terry fabric for bath robe', material: 'Cotton 450 GSM + loop pile + burn-out border option', enduse: 'Hotel bath-robe and spa-wrap textiles', duty: 'Free', adcvd: 'none', keywords: ['terry cloth','terry fabric','toweling','pile fabric','terry cloth fabric'] },
      { code: '6001.21.0000', desc: 'Beach towel fabric in jacquard terry', material: '100% cotton 500 GSM + dobby border + reactive print', enduse: 'Resort towel and pool-linen merchandise', duty: 'Free', adcvd: 'none', keywords: ['terry towel','bath towel','towel fabric','beach towel'] },
      { code: '5503.20.0000', desc: 'Silk-touch polyester staple fiber for filling', material: 'Polyester 1.5D + siliconized finish + hollow core', enduse: 'Quilted jacket insulation and cushion filling', duty: 'Free', adcvd: 'none', keywords: ['polyester fiber','staple fiber','fiberfill','stuffing fiber','polyester staple'] },
      { code: '5503.90.0000', desc: 'Flame-retardant acrylic staple fiber for contract textile', material: 'Acrylic + modacrylic blend + FR additive', enduse: 'Commercial contract seating upholstery', duty: 'Free', adcvd: 'none', keywords: ['acrylic fiber','nylon fiber','staple fiber','modacrylic'] },
      { code: '5205.13.0000', desc: 'Single-ring cotton sewing thread', material: 'Cotton 40/2 + mercerized + colorfast finish', enduse: 'Athletic apparel lockstitch seam assembly', duty: 'Free', adcvd: 'none', keywords: ['cotton yarn','combed yarn','sewing thread','cotton thread','thread'] },
      { code: '5402.46.9010', desc: 'Polyester textured filament yarn for sportswear', material: 'PET partially oriented yarn + draw-texturing + heat-set', enduse: 'Synthetic sports-jersey warp knitting', duty: 'Free', adcvd: 'none', keywords: ['polyester yarn','filament yarn','thread','fishing line','polyester filament'] },
      { code: '6402.99.0500', desc: 'Closed-toe safety work shoe', material: 'Nitrile rubber outsole + steel toe cap + leather upper + steel shank', enduse: 'Industrial floor and construction-site footwear', duty: 'Free', adcvd: 'none', keywords: ['shoe','shoes','footwear','sneaker','trainer','work shoe','safety shoe'] },
      { code: '6404.19.6030', desc: 'Knit upper training shoe for standing staff', material: 'Knit polyester + EVA midsole + rubber cupsole', enduse: 'Retail floor-model and nurse-station comfort shoes', duty: 'Free', adcvd: 'none', keywords: ['athletic shoe','running shoe','gym shoe','basketball shoe','training shoe','sneaker'] },
      { code: '6402.99.1550', desc: 'Indoor/outdoor slide sandal for pool deck', material: 'Ethylene vinyl acetate footbed + rubber outsole + nylon strap', enduse: 'Resort hotel employee and guest deck footwear', duty: 'Free', adcvd: 'none', keywords: ['slide','sandals','flip flop','flip-flop','sandal','pool sandal'] },
      { code: '6402.19.1570', desc: 'Skate shoe with reinforced toe cap', material: 'Suede cowhide upper + rubber toe cap + PU midsole', enduse: 'Skate park and recreation apparel footwear', duty: 'Free', adcvd: 'none', keywords: ['skate shoe','skateboard shoe','skateboarding','skate footwear'] },
      { code: '6403.19.8010', desc: 'Ski boot with moldable liner', material: 'Polycarbonate shell + EVA footboard + thick microfleece liner', enduse: 'Alpine skiing and snow-sport boot', duty: 'Free', adcvd: 'none', keywords: ['ski boot','ski','snowboard boot','winter boot','skiing boot','hiking boot','patrol boot','forest ranger','trail boot','outdoor boot'] },
      { code: '6403.19.8020', desc: 'Hiking patrol boot for outdoor inspection', material: 'Full-grain leather upper + rubber lug outsole + waterproof membrane + steel shank', duty: 'Free', adcvd: 'none', keywords: ['hiking boot','patrol boot','trail boot','outdoor boot','forest boot','inspection boot','rugged boot'] },
      { code: '4011.10.0010', desc: 'All-season passenger car tire', material: 'Steel radial cord + natural rubber tread + nylon cap ply', enduse: 'Highway light-truck personal transport', duty: 'Free', adcvd: 'none', keywords: ['tire','tyre','wheel','car tire','truck tire','tractor tire','passenger tire'] },
      { code: '4011.20.1010', desc: 'Retread steer tire for long-haul truck', material: 'Steel radial + reclaimed tread rubber + fiberback ply', enduse: 'Returning-tire cost saving for fleet logistics', duty: 'Free', adcvd: 'none', keywords: ['used tire','retread','retread tire','recap tire','recycled tire'] },
      { code: '7318.15.0085', desc: 'Hex cap screw for food equipment', material: 'Mild carbon steel + zinc yellow + nylon patch lock', enduse: 'Food machinery assembly and conveyor service', duty: 'Free', adcvd: 'none', keywords: ['bolt','screw','fastener','hex bolt','carriage bolt','machine screw','cap screw'] },
      { code: '7318.16.0050', desc: 'Grade C hex nut for structural frame', material: 'Carbon steel + hot-dip galvanize + chamfered face', enduse: 'Steel structural bolting maintenance', duty: 'Free', adcvd: 'none', keywords: ['nut','hex nut','locking nut','flange nut'] },
      { code: '7318.21.0000', desc: 'Flat washer for outdoor lighting job', material: 'Stainless 304 + passivated face + DIN 125 profile', enduse: 'Roof and bridge outdoor fixture installation', duty: 'Free', adcvd: 'none', keywords: ['washer','flat washer','spring washer','fender washer','plain washer'] },
      { code: '7318.22.0000', desc: 'Blind rivet for sign fabrication', material: 'Aluminum mandrel + steel body + countersunk head', enduse: 'Billboard and metal-sign field attachment', duty: 'Free', adcvd: 'none', keywords: ['rivet','blind rivet','solid rivet','pop rivet','rivet fastener'] },
      { code: '9503.00.0073', desc: '3-inch plastic figurine for toy counter', material: 'ABS PVC + multicolor paint + stickpack blister', enduse: 'Children party supplies and retail impulse toy', duty: 'Free', adcvd: 'none', keywords: ['toy','toys','plastic toy','figurine','action figure','lego','blocks','plaything'] },
      { code: '9503.00.2500', desc: 'Remote-control stunt car for electronics shelf', material: 'ABS/PP + 2.4GHz radio + NiMH battery', enduse: 'Kids indoor play and electronics counter demo', duty: 'Free', adcvd: 'none', keywords: ['electronic toy','remote control car','rc car','drone','toy drone','toy car'] },
      { code: '9506.91.0010', desc: '26-inch mountain bike for rental fleet', material: 'Chromoly steel frame + alloy rims + mechanical disc brakes', enduse: 'Mountain trail rental and suburban commuting', duty: 'Free', adcvd: 'none', keywords: ['bicycle','bike','cycling','bicycle frame','road bike','mountain bike'] },
      { code: '9506.99.0070', desc: 'Inflatable paddle board for marina rental', material: 'Extruded PVC drop-stitch + EVA deck pad + nylon fins', enduse: 'Lake and coastal rental watercraft', duty: 'Free', adcvd: 'none', keywords: ['kayak','paddle board','snowboard','skateboard','paddleboard','watercraft'] },
      { code: '9506.51.4000', desc: 'Table tennis blade for pro shop', material: 'Carbon-ayous-carbon + rubbers + ITTF-approved edge tape', enduse: 'Competitive training and retail sports equipment', duty: 'Free', adcvd: 'none', keywords: ['ping pong','table tennis','ping-pong','paddle'] },
      { code: '3304.99.5000', desc: 'Matte liquid lipstick palette for makeup demo', material: 'Polyester resin + mica pigments + dimethicone base', enduse: 'Retail beauty counter and influencer sampling', duty: 'Free', adcvd: 'none', keywords: ['beauty','makeup','cosmetic','lipstick','foundation','eyeshadow','mascara'] },
      { code: '3304.99.6000', desc: 'Gel polish set with UV LED lamp', material: 'Urethane acrylate + photoinitiator + HEMA-free formula', enduse: 'Nail salon finish and at-home manicure kit', duty: 'Free', adcvd: 'none', keywords: ['nail polish','nail','acrylic nail','nail art','top coat','base coat','gel polish'] },
      { code: '3304.10.0000', desc: 'Lip tint balm for duty-free cosmetics', material: 'Petrolatum + beeswax + titanium dioxide + fragrance', enduse: 'Skin protection and cosmetic travel product', duty: 'Free', adcvd: 'none', keywords: ['lipstick','lip gloss','lip balm','lip','lip liner','lip tint','lip color'] },
      { code: '3304.20.0000', desc: 'Waterproof mascara for tropics', material: 'Acrylates copolymer + iron oxides + nylon fiber brush', enduse: 'Daily cosmetic wear for humid climates', duty: 'Free', adcvd: 'none', keywords: ['eyeshadow','eyeliner','mascara','eyebrow','false lash','lash serum'] },
      { code: '3303.29.5100', desc: 'Eau de parfum tester bottle for duty-free', material: 'DENATURED ALCOHOL + fragrance oil + BHT + spray nozzle', enduse: 'Travel and personal fragrance retail', duty: 'Free', adcvd: 'none', keywords: ['perfume','cologne','eau de toilette','fragrance','parfum'] },
      { code: '3305.00.2000', desc: 'Sulfate-free shampoo sample pouch for hotel', material: 'Water + sodium laureth sulfate + panthenol + EDTA', enduse: 'Fixed-property guest amenity and hair rinse', duty: 'Free', adcvd: 'none', keywords: ['shampoo','conditioner','hair oil','hair treatment','scalp scrub'] },
      { code: '3307.90.5000', desc: 'Antiperspirant roll-on for airport security travel', material: 'Aluminum zirconium + cyclopentasiloxane + fragrance', enduse: 'Body hygiene for transit and notebook stock', duty: 'Free', adcvd: 'none', keywords: ['deodorant','antiperspirant','shaving cream','aftershave','razor'] },
      { code: '3923.10.9000', desc: 'Hardshell watch box for retail security display', material: 'ABS + flock lining + magnetic closure + die-cut inserts', enduse: 'Retail case for watches and luxury accessories', duty: 'Free', adcvd: 'none', keywords: ['box','case','storage box','jewelry box','empty box','hard case'] },
      { code: '3923.50.0000', desc: 'Threaded bottle cap for premium water line', material: 'PP + EVA liner + ribbed grip + 24mm neck finish', enduse: 'Beverage packaging closure for premium water brand', duty: 'Free', adcvd: 'none', keywords: ['closure','cap','stopper','lid','bottle cap','screw cap','cap closure'] },
      { code: '3923.90.5000', desc: '3D printer filament spool for hobby starter', material: 'PETG + cardboard core + desiccant packet + master spool', enduse: 'Parts prototyping and hobbyist additive manufacturing', duty: 'Free', adcvd: 'none', keywords: ['plastic','polymer','acrylic','3d print filament','pla','abs','petg','filament'] },
      { code: '7010.90.7500', desc: 'Amber glass dropper bottle for cosmetic concentrate', material: 'Soda-lime glass + bromobutyl stopper + graduated pipette', enduse: 'Skin serum and pipette cosmetic concentrate packaging', duty: 'Free', adcvd: 'none', keywords: ['bottle','jar','glass bottle','vial','flask','glass jar','dropper bottle'] },
      { code: '7310.29.0050', desc: 'Aerosol spray can for industrial lubricant', material: 'Steel can + bisphenol-A-free liner + valve + dip tube', enduse: 'Workshop adhesive and rust inhibitor packaging', duty: 'Free', adcvd: 'none', keywords: ['aluminum can','aluminum bottle','aerosol can','metal can','spray can'] },
      { code: '8533.40.8050', desc: 'Bare NTC thermistor for appliance thermostat', material: 'Metallized glass + nickel leads + epoxy coating', enduse: 'Fridge thermostat and electronics thermal sensing', duty: 'Free', adcvd: 'none', keywords: ['thermistor','ntc','ptc','temperature sensor','thermal sensor'] },
      { code: '8534.00.0040', desc: 'FR-4 printed circuit board for control module', material: 'Copper-clad laminate + fiberglass + solder mask + silkscreen', enduse: 'Industrial controls and appliance electronics motherboard', duty: 'Free', adcvd: 'none', keywords: ['pcb','printed circuit','circuit board','board','motherboard','control board'] },
      { code: '8534.00.0080', desc: '12-layer HDI backplane for server blade', material: 'Copper-clad microvia + ABF film + gold ENIG finish', enduse: 'Server high-density backplane and communication card', duty: 'Free', adcvd: 'none', keywords: ['multilayer pcb','mlb','high density interconnect','hdi','backplane'] },
      { code: '8536.41.0040', desc: 'PCB mount relay for HVAC control', material: 'Copper contacts + plastic coil former + spring return + coil', enduse: 'Air-conditioning sequence control and automation', duty: 'Free', adcvd: 'none', keywords: ['relay','solid state relay','ssr','signal relay','power relay'] },
      { code: '8536.50.2000', desc: 'Class T automotive fuse pack', material: 'Nickel-plated zinc + ceramic body + silver sand element', enduse: 'Vehicle electrical protection and accessory circuit', duty: 'Free', adcvd: 'none', keywords: ['fuse','fuse holder','automotive fuse','circuit breaker','blade fuse'] },
      { code: '8541.40.8000', desc: 'USB rechargeable penlight for inspection use', material: 'ABS + LED die + Li-polymer + magnet base', enduse: 'Maintenance visual inspection and emergency carry', duty: 'Free', adcvd: 'none', keywords: ['led','light','bulb','lamp','strip light','ambient light','penlight','torch','flashlight'] },
      { code: '8541.21.0040', desc: 'LiDAR scanner for 3D survey', material: 'VCSEL 905nm + Si-APD receiver + FPGA driver', enduse: 'Topographic and construction progress survey', duty: 'Free', adcvd: 'none', keywords: ['laser diode','laser module','vcsels','lidar','laser scanner'] },
      { code: '8523.80.1000', desc: '32 GB DVD-RAM spindle for medical imaging', material: 'Polycarbonate substrate + organic dye layer + aluminum reflector', enduse: 'Medical imaging backup and archival media', duty: 'Free', adcvd: 'none', keywords: ['optical disc','cd','dvd','bluray','disc','disc media','optical media','dvd-ram'] },
      { code: '8465.20.0015', desc: 'Cordless circular saw for packaging line', material: 'Lithium-ion pack + steel shoe + carbide-tipped chain', enduse: 'Wood-pallet prep and packaging line labor tool', duty: 'Free', adcvd: 'none', keywords: ['saw','bandsaw','jigsaw','circular saw','reciprocating saw'] },
      { code: '8465.20.0060', desc: 'Impact driver for warehouse racking install', material: 'Lithium-ion pack + steel chuck + 1/4-inch hex collet', enduse: 'Pallet rack and conveyor maintenance assembly', duty: 'Free', adcvd: 'none', keywords: ['drill','impact driver','drill driver','hammer drill','cordless drill'] },
      { code: '8465.21.0010', desc: 'Demolition hammer for concrete removal', material: 'Steel barrel + nylon handle + pneumatic throttle', enduse: 'Concrete demolition and construction site prep', duty: 'Free', adcvd: 'none', keywords: ['drill','hammer drill','percussion drill','breaker','impact drill'] },
      { code: '8465.29.8010', desc: 'Disc sander for trim finish', material: 'Aluminum base + steel arbor + dust port + hook-and-loop pad', enduse: 'Cabinet edge banding and trim finishing work', duty: 'Free', adcvd: 'none', keywords: ['grinder','angle grinder','bench grinder','belt sander','planer','sander'] },
      { code: '8507.10.4040', desc: 'AGM battery for medical cart backup', material: 'Lead-calcium alloy + absorbed glass mat + polypropylene case', enduse: 'Hospital cart emergency backup and alarm power', duty: 'Free', adcvd: 'none', keywords: ['lead acid','car battery','sealed lead acid','sla battery','agm'] },
      { code: '8507.60.0010', desc: 'Pouch cell for rugged GPS handheld', material: 'NMC cathode + graphite anode + aluminum laminate pouch', enduse: 'Outdoor handheld navigation and field equipment', duty: 'Free', adcvd: 'none', keywords: ['lithium ion','lipo','li-ion','pouch cell','cylindrical cell','lithium battery'] },
      { code: '8507.80.0000', desc: 'Quick-swap battery for pallet jack', material: 'NiMH cells + steel case + plug connector + thermal fuse', enduse: 'Warehouse pallet-jack shift-change power pack', duty: 'Free', adcvd: 'none', keywords: ['battery','batteries','power bank','battery pack','cell','replacement battery'] },
      { code: '8432.19.0000', desc: 'Disc harrow for arable seed-bed prep', material: 'Hardened steel discs + square bar frame + spool bearings', enduse: 'Soil tillage and crop seed-bed preparation', duty: 'Free', adcvd: 'none', keywords: ['plow','plough','cultivator','harrow','tiller','tillage','disc harrow'] },
      { code: '8432.39.0040', desc: 'Automatic transplanter for nursery automated line', material: 'Steel framework + plastic gripper + drive gears + hydraulic lift', enduse: 'Nursery tray-to-tray automation pick-and-place', duty: 'Free', adcvd: 'none', keywords: ['seeder','seed planter','transplanter','sowing machine','transplanter machine'] },
      { code: '8433.59.1010', desc: 'Rotary combine thresher for grain harvest', material: 'Cast-iron rotor + concave grate + walker sieves + auger', enduse: 'Cereal harvesting and grain-loss reduction', duty: 'Free', adcvd: 'none', keywords: ['combine','harvester','thresher','reaper','combine harvester','harvesting machine'] },
      { code: '8433.51.0010', desc: 'Ride-on mower for landscape maintenance', material: 'Steel deck + hydraulic lift + spindle mower blade + seat', enduse: 'Horticultural grass cutting and estate maintenance', duty: 'Free', adcvd: 'none', keywords: ['mower','lawn mower','ride on mower','rotary mower','riding mower','grass cutter'] },
      { code: '8701.90.5010', desc: 'Compact utility tractor for farm field ops', material: 'Diesel engine + gear transmission + hydraulic lift arms + ROPS', enduse: 'Small farm tillage and loader duties', duty: 'Free', adcvd: 'none', keywords: ['tractor','farm tractor','compact tractor','utility tractor'] },
    ];

    const ADCVD_NOTES = {
      none: '',
      false: 'This code is sometimes monitored for AD/CVD. Confirm before booking.',
      low: 'This category is sometimes flagged for AD/CVD checks. Confirm before booking.',
      moderate: 'Notify broker for AD/CVD review if shipping above de minimis.'
    };

    const STOP = new Set([
      'for','and','the','a','an','of','in','on','to','with','from','by','or',
      'new','used','set','pack','kit','unit','product','type','model','small','large'
    ]);

    function scoreToken(row, phrase) {
      const p = phrase.toLowerCase();
      if (STOP.has(p) || p.length < 2) return 0;

      const hay = [
        row.code,
        row.desc,
        row.material || '',
        row.enduse || '',
        ...(row.keywords || []),
      ].join(' ').toLowerCase();

      let score = 0;

      // Strong semantic match signals
      const exactPhraseBonus = hay.includes(` ${p} `) || hay.startsWith(p + ' ') || hay.endsWith(' ' + p) || hay === p;
      if (exactPhraseBonus) score += 2.4;

      // Material specificity: extra signal if user mentions a material that clearly matches
      const materialField = (row.material || '').toLowerCase();
      if (materialField && p && materialField.includes(p) && p.length >= 4) score += 1.8;

      // End-use intent match
      const endField = (row.enduse || '').toLowerCase();
      if (endField && p && endField.includes(p) && p.length >= 4) score += 1.5;

      // Tokens overlap with keywords / description nouns
      const tokens = p.split(/[^a-z0-9]+/).filter(Boolean);
      if (tokens.length > 1) {
        let hitTokens = 0;
        for (const t of tokens) {
          if (t.length < 2) continue;
          const normalized = t.endsWith('s') && t.length > 3 ? t.slice(0, -1) : t;
          if (hay.includes(normalized)) hitTokens += 1;
        }
        score += (hitTokens / tokens.length) * 1.6;
      }

      // Compact code prefix
      const compactCode = row.code.replace(/\\./g, '');
      if (compactCode.startsWith(p)) score += 2;

      // Cap per row
      return Math.min(score, 5);
    }

    const terms = query
      .split(/[^a-z0-9]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Also treat "smart phrases" like three-word sequences to preserve semantic meaning
    const phrases = [];
    const words = query.split(/[^a-z0-9]+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      for (let len = 3; len >= 1; len--) {
        if (i + len <= words.length) {
          phrases.push(words.slice(i, i + len).join(' '));
        }
      }
    }

    const ranked = DATA.map((row) => {
      let total = 0;
      const seen = new Set();
      for (const t of [...phrases, ...terms]) {
        const key = t.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        total += scoreToken(row, key);
      }
      return { row, score: total };
    })
      .filter((x) => x.score >= 1.6)
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];

    if (!best) {
      await logUsage(tier, 'v1/hts', context, 'error');
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'no_match',
          suggest:
            'Please provide the product description, material composition, and intended end use so we can identify a better HTS match.',
        }),
        {
          headers: cors({
            'x-rate-limit-remaining': String(Math.max(0, limit.remaining - 1)),
            'x-rate-limit-limit': String(limit.limit),
            'x-rate-limit-tier': tier,
            'x-rate-limit-reset': String(limit.resetUnix),
          }),
        }
      );
    }

    const { row: match } = best;
    const rate = await lookupRate(match.code, context);
    await logUsage(tier, 'v1/hts', context, 'ok');

    let dutyRate = null;
    let dutyPct = null;          // numeric % when the rate is a percentage
    let dutyConfidence = 'candidate';
    let source = 'curated-candidate';
    let note = (ADCVD_NOTES[match.adcvd] || '') +
      ' Candidate match from a curated starter list — not the official HTS. Confirm the exact general duty rate and any special/column-2 rates at hts.usitc.gov or with a licensed broker.';

    if (rate) {
      dutyRate = rate;
      dutyConfidence = 'official';
      source = 'usitc-2026-rev11';
      note = (ADCVD_NOTES[match.adcvd] || '') +
        ' General (Column 1) duty rate sourced from the official USITC Harmonized Tariff Schedule 2026 Revision 11. Special-program and Column 2 rates, plus any Chapter 99 additional duties, are not included — confirm at hts.usitc.gov or with a licensed broker.';
      // Extract a numeric percentage if the rate is expressed as a % (e.g. "4.5%" -> 4.5)
      const pctMatch = String(rate).match(/(\d+(?:\.\d+)?)\s*%/);
      if (pctMatch) dutyPct = parseFloat(pctMatch[1]);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        code: match.code,
        description: match.desc,
        dutyRate,
        dutyPct,
        dutyConfidence,
        source,
        adcvd: match.adcvd,
        note,
        verifyUrl: 'https://hts.usitc.gov',
      }),
      {
        headers: cors({
          'x-rate-limit-remaining': String(Math.max(0, limit.remaining - 1)),
          'x-rate-limit-limit': String(limit.limit),
          'x-rate-limit-tier': tier,
          'x-rate-limit-reset': String(limit.resetUnix),
        }),
      }
    );
  } catch (err) {
    await logUsage('unknown', 'v1/hts', context, 'error');
    return new Response(JSON.stringify({ ok: false, error: 'invalid_query' }), { headers: cors(), status: 400 });
  }
}

export const OPTIONS = async () => new Response(null, { headers: cors(), status: 204 });
