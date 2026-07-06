const inMemoryLimits = new Map();

async function consumeLimit(key, dailyCap, env) {
  let entry;
  const hasKV = env && env.RATE_COUNTER;
  const kvKey = `rate::${key}`;

  if (hasKV) {
    const raw = await env.RATE_COUNTER.get(kvKey);
    const count = raw ? parseInt(raw, 10) : 0;
    const newCount = count + 1;
    try {
      await env.RATE_COUNTER.put(kvKey, String(newCount), { expirationTtl: 48 * 60 * 60 });
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
    if (context.env?.RATE_COUNTER) {
      await context.env.RATE_COUNTER.put(key, entry, { expirationTtl: 72 * 60 * 60 });
    }
  } catch (err) {
    // logging is optional
  }
}

export async function onRequestGet(context) {
  try {
    const { key, cap, tier } = resolveRateLimitContext(context, { anonymousCap: 5, signedCap: 100 });
    const limit = consumeLimit(key, cap, context.env);

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
      { code: '8518.30.0000', desc: 'Loudspeakers, without enclosure', duty: 'Free', adcvd: 'none', keywords: ['loudspeaker','speaker','soundbar','pa speaker','woofer'] },
      { code: '8518.40.0000', desc: 'Headphones and earphones', duty: 'Free', adcvd: 'none', keywords: ['headphone','earphone','headset','earbud','airpod','earbuds'] },
      { code: '8517.12.0095', desc: 'Smartphones and base stations', duty: 'Free', adcvd: 'none', keywords: ['smartphone','phone','mobile','cell phone','android','iphone'] },
      { code: '8517.62.0000', desc: 'Base stations and repeaters', duty: 'Free', adcvd: 'low', keywords: ['base station','repeater','signal booster','cell repeater'] },
      { code: '9013.80.0010', desc: 'LED display panels', duty: 'Free', adcvd: 'none', keywords: ['led display','led panel','lcd panel','monitor','screen','digital signage'] },
      { code: '9013.90.5000', desc: 'Optical devices, other', duty: 'Free', adcvd: 'none', keywords: ['optical','lens module','projector lens'] },
      { code: '8528.71.0000', desc: 'Video projectors', duty: 'Free', adcvd: 'none', keywords: ['projector','beamer','video projector','projection'] },
      { code: '8525.80.0010', desc: 'TV cameras and camcorders', duty: 'Free', adcvd: 'none', keywords: ['camcorder','action camera','camera','gopro','dslr'] },
      { code: '7323.94.0000', desc: 'Stainless table/kitchen ware', duty: 'Free', adcvd: 'none', keywords: ['pot','pan','cookware','kitchenware','stainless pot','stainless pan','nonstick pan','frying pan','saucepan'] },
      { code: '7610.90.0050', desc: 'Aluminum structures', duty: 'Free', adcvd: 'none', keywords: ['aluminum structure','aluminum frame','extrusion','aluminum profile'] },
      { code: '8302.42.3000', desc: 'Hinges of base metal', duty: 'Free', adcvd: 'none', keywords: ['hinge','butt hinge','cabinet hinge','door hinge'] },
      { code: '9403.10.0000', desc: 'Metal office furniture', duty: 'Free', adcvd: 'none', keywords: ['furniture','desk','cabinet','shelf','file cabinet','office chair'] },
      { code: '9403.20.0040', desc: 'Other seats, metal', duty: 'Free', adcvd: 'none', keywords: ['chair','stool','bench','seat','office seat'] },
      { code: '9403.50.0000', desc: 'Wooden furniture', duty: 'Free', adcvd: 'none', keywords: ['wooden chair','wooden desk','table','dining table'] },
      { code: '9403.60.8000', desc: 'Other furniture', duty: 'Free', adcvd: 'none', keywords: ['sofa','couch','wardrobe','bed frame'] },
      { code: '8509.80.0040', desc: 'Vacuum cleaners', duty: 'Free', adcvd: 'none', keywords: ['vacuum','hoover','robot vacuum','vacuum cleaner'] },
      { code: '8516.32.0000', desc: 'Hair dryers', duty: 'Free', adcvd: 'none', keywords: ['hair dryer','hair dryer','blower','hair straightener','flat iron'] },
      { code: '8516.33.0000', desc: 'Hand dryers', duty: 'Free', adcvd: 'none', keywords: ['hand dryer','hand dryer'] },
      { code: '8421.23.0000', desc: 'Oil and petrol filters', duty: 'Free', adcvd: 'none', keywords: ['oil filter','fuel filter','air filter','filter'] },
      { code: '6109.10.2000', desc: 'Cotton T-shirts', duty: 'Free', adcvd: 'none', keywords: ['t-shirt','tshirt','tee','cotton shirt','crew neck'] },
      { code: '6109.10.3000', desc: 'Polyester T-shirts', duty: 'Free', adcvd: 'none', keywords: ['polyester tee','synthetic tee','sports tee'] },
      { code: '6110.20.2070', desc: 'Cotton sweatshirts', duty: 'Free', adcvd: 'none', keywords: ['sweatshirt','hoodie','hooded','pullover','crewneck'] },
      { code: '6110.12.1020', desc: 'Cotton sweaters, women', duty: 'Free', adcvd: 'none', keywords: ['sweater','jumper','knit','cardigan','pullover'] },
      { code: '6203.42.4011', desc: 'Men trousers, cotton', duty: 'Free', adcvd: 'none', keywords: ['trouser','pant','chino','cargo pants','jeans','denim','work pant'] },
      { code: '6203.49.8041', desc: 'Men trousers, synthetic', duty: 'Free', adcvd: 'none', keywords: ['jogger','sweatpant','legging','yoga pant'] },
      { code: '6204.62.3011', desc: 'Women trousers, cotton', duty: 'Free', adcvd: 'none', keywords: ['women trouser','ladies pant','capri','culotte'] },
      { code: '6204.63.3011', desc: 'Women trousers, synthetic', duty: 'Free', adcvd: 'none', keywords: ['women jogger','legging','leggings'] },
      { code: '6205.20.2020', desc: 'Men shirts, cotton', duty: 'Free', adcvd: 'none', keywords: ['shirt','polo','oxford','button down','dress shirt'] },
      { code: '6206.10.3050', desc: 'Women blouses, silk', duty: 'Free', adcvd: 'none', keywords: ['blouse','silk blouse','women top','satin blouse'] },
      { code: '6206.20.5050', desc: 'Women blouses, manmade', duty: 'Free', adcvd: 'none', keywords: ['blouse','women top','mock neck','silk blouse','satin top'] },
      { code: '6211.42.0040', desc: 'Women swimwear', duty: 'Free', adcvd: 'none', keywords: ['swim','swimsuit','bikini','one piece','swimsuits','coverup'] },
      { code: '6211.43.0040', desc: 'Men swimwear', duty: 'Free', adcvd: 'none', keywords: ['trunk','boardshort','swim trunk','mens swimwear'] },
      { code: '6201.12.0010', desc: 'Men padded jackets', duty: 'Free', adcvd: 'none', keywords: ['puffer','puffer jacket','down jacket','quilted jacket','parka'] },
      { code: '6201.93.3010', desc: 'Men anoraks, windbreakers', duty: 'Free', adcvd: 'none', keywords: ['windbreaker','anorak','track jacket','shell jacket','softshell'] },
      { code: '6202.11.0000', desc: 'Women padded jackets', duty: 'Free', adcvd: 'none', keywords: ['puffer','womens jacket','down jacket','puffer jacket','quilted jacket'] },
      { code: '6202.93.3010', desc: 'Women anoraks, windbreakers', duty: 'Free', adcvd: 'none', keywords: ['windbreaker','womens windbreaker','track jacket'] },
      { code: '6115.95.3050', desc: 'Compression wear', duty: 'Free', adcvd: 'none', keywords: ['compression','base layer','thermal','rash guard','rashguard'] },
      { code: '6112.00.3500', desc: 'Infants garments', duty: 'Free', adcvd: 'none', keywords: ['onesie','baby','infant','toddler','romper','newborn'] },
      { code: '6204.69.6010', desc: 'Women skirts, synthetic', duty: 'Free', adcvd: 'none', keywords: ['skirt','midi skirt','pleated skirt','tennis skirt'] },
      { code: '6104.63.1011', desc: 'Women dresses, synthetic', duty: 'Free', adcvd: 'none', keywords: ['dress','maxi dress','midi dress','wrap dress','sundress'] },
      { code: '6104.69.2060', desc: 'Women dresses, cotton', duty: 'Free', adcvd: 'none', keywords: ['cotton dress','linen dress','shirt dress','pinafore'] },
      { code: '6204.59.6020', desc: 'Women dresses,', duty: 'Free', adcvd: 'none', keywords: ['dress','formal dress','evening dress'] },
      { code: '5407.61.1000', desc: 'Woven fabrics of polyester', duty: 'Free', adcvd: 'none', keywords: ['polyester fabric','woven','poly fabric','outerwear fabric'] },
      { code: '5407.10.2000', desc: 'Woven fabrics of nylon', duty: 'Free', adcvd: 'none', keywords: ['nylon fabric','ripstop','ballistic nylon','nylon','spandex fabric'] },
      { code: '5208.11.3560', desc: 'Plain weave cotton fabric', duty: 'Free', adcvd: 'none', keywords: ['cotton fabric','plain weave','sheeting','poplin','calico','canvas'] },
      { code: '5208.29.3560', desc: 'Twill weave cotton fabric', duty: 'Free', adcvd: 'none', keywords: ['twill','denim fabric','chino fabric','drill fabric'] },
      { code: '5512.11.0000', desc: 'Woven fabrics of synthetic staple', duty: 'Free', adcvd: 'none', keywords: ['fleece fabric','polar fleece','microfleece'] },
      { code: '6001.10.2000', desc: 'Pile fabrics of cotton', duty: 'Free', adcvd: 'none', keywords: ['terry cloth','terry fabric','toweling','pile fabric'] },
      { code: '6001.21.0000', desc: 'Terry toweling, cotton', duty: 'Free', adcvd: 'none', keywords: ['terry towel','bath towel','towel fabric'] },
      { code: '5503.20.0000', desc: 'Staple fibers, polyester', duty: 'Free', adcvd: 'none', keywords: ['polyester fiber','staple fiber','fiberfill','stuffing fiber'] },
      { code: '5503.90.0000', desc: 'Staple fibers, other', duty: 'Free', adcvd: 'none', keywords: ['acrylic fiber','nylon fiber','staple fiber'] },
      { code: '5205.13.0000', desc: 'Combed cotton yarns', duty: 'Free', adcvd: 'none', keywords: ['cotton yarn','combed yarn','sewing thread','cotton thread'] },
      { code: '5402.46.9010', desc: 'Polyester filament yarns', duty: 'Free', adcvd: 'none', keywords: ['polyester yarn','filament yarn','thread','fishing line'] },
      { code: '6402.99.0500', desc: 'Footwear, rubber/plastic', duty: 'Free', adcvd: 'none', keywords: ['shoe','shoes','footwear','sneaker','trainer'] },
      { code: '6404.19.6030', desc: 'Sports footwear, textile upper', duty: 'Free', adcvd: 'none', keywords: ['athletic shoe','running shoe','gym shoe','basketball shoe'] },
      { code: '6402.99.1550', desc: 'Slide sandals, rubber/plastic', duty: 'Free', adcvd: 'none', keywords: ['slide','sandals','flip flop','flip-flop','sandal'] },
      { code: '6402.19.1570', desc: 'Sports footwear, rubber/plastic', duty: 'Free', adcvd: 'none', keywords: ['skate shoe','skateboard shoe','skateboarding'] },
      { code: '6403.19.8010', desc: 'Ski boots and cross-country', duty: 'Free', adcvd: 'none', keywords: ['ski boot','ski','snowboard boot','winter boot'] },
      { code: '4011.10.0010', desc: 'Pneumatic tires, new', duty: 'Free', adcvd: 'none', keywords: ['tire','tyre','wheel','car tire','truck tire','tractor tire'] },
      { code: '4011.20.1010', desc: 'Used pneumatic tires', duty: 'Free', adcvd: 'none', keywords: ['used tire','retread','retread tire','recap tire'] },
      { code: '7318.15.0085', desc: 'Iron/steel screws/bolts', duty: 'Free', adcvd: 'none', keywords: ['bolt','screw','fastener','hex bolt','carriage bolt'] },
      { code: '7318.16.0050', desc: 'Nuts of iron or steel', duty: 'Free', adcvd: 'none', keywords: ['nut','hex nut','locking nut','flange nut'] },
      { code: '7318.21.0000', desc: 'Washers of iron or steel', duty: 'Free', adcvd: 'none', keywords: ['washer','flat washer','spring washer','fender washer'] },
      { code: '7318.22.0000', desc: 'Rivets of iron or steel', duty: 'Free', adcvd: 'none', keywords: ['rivet','blind rivet','solid rivet','pop rivet'] },
      { code: '9503.00.0073', desc: 'Toys, plastic, <= 50 cents', duty: 'Free', adcvd: 'low', keywords: ['toy','toys','plastic toy','figurine','action figure','lego','blocks'] },
      { code: '9503.00.2500', desc: 'Electronic toys', duty: 'Free', adcvd: 'low', keywords: ['electronic toy','remote control car','rc car','drone','toy drone'] },
      { code: '9506.91.0010', desc: 'Bicycles, other', duty: 'Free', adcvd: 'none', keywords: ['bicycle','bike','cycling','bicycle frame','road bike','mountain bike'] },
      { code: '9506.99.0070', desc: 'Sporting goods, other', duty: 'Free', adcvd: 'none', keywords: ['kayak','paddle board','snowboard','skateboard'] },
      { code: '9506.51.4000', desc: 'Table tennis equipment', duty: 'Free', adcvd: 'none', keywords: ['ping pong','table tennis','ping-pong','paddle'] },
      { code: '3304.99.5000', desc: 'Beauty and makeup preparations', duty: 'Free', adcvd: 'none', keywords: ['beauty','makeup','cosmetic','lipstick','foundation','eyeshadow','mascara'] },
      { code: '3304.99.6000', desc: 'Nail products', duty: 'Free', adcvd: 'none', keywords: ['nail polish','nail','acrylic nail','nail art','top coat','base coat','gel polish'] },
      { code: '3304.10.0000', desc: 'Lip cosmetics', duty: 'Free', adcvd: 'none', keywords: ['lipstick','lip gloss','lip balm','lip','lip liner','lip tint'] },
      { code: '3304.20.0000', desc: 'Eye makeup', duty: 'Free', adcvd: 'none', keywords: ['eyeshadow','eyeliner','mascara','eyebrow','false lash','lash serum'] },
      { code: '3303.29.5100', desc: 'Perfumes', duty: 'Free', adcvd: 'none', keywords: ['perfume','cologne','eau de toilette','fragrance','parfum'] },
      { code: '3305.00.2000', desc: 'Hair preparations', duty: 'Free', adcvd: 'none', keywords: ['shampoo','conditioner','hair oil','hair treatment','scalp scrub'] },
      { code: '3307.90.5000', desc: 'Shaving and deodorant', duty: 'Free', adcvd: 'none', keywords: ['deodorant','antiperspirant','shaving cream','aftershave','razor'] },
      { code: '3923.10.9000', desc: 'Plastic boxes, cases', duty: 'Free', adcvd: 'none', keywords: ['box','case','storage box','jewelry box','empty box','hard case'] },
      { code: '3923.50.0000', desc: 'Stoppers/ closures of plastic', duty: 'Free', adcvd: 'none', keywords: ['closure','cap','stopper','lid','bottle cap'] },
      { code: '3923.90.5000', desc: 'Plastic articles, other', duty: 'Free', adcvd: 'none', keywords: ['plastic','polymer','acrylic','3d print filament','pla','abs','petg'] },
      { code: '7010.90.7500', desc: 'Glass containers, other', duty: 'Free', adcvd: 'none', keywords: ['bottle','jar','glass bottle','vial','flask','glass jar'] },
      { code: '7310.29.0050', desc: 'Aluminum containers, other', duty: 'Free', adcvd: 'none', keywords: ['aluminum can','aluminum bottle','aerosol can'] },
      { code: '8533.40.8050', desc: 'Thermistors and varistors', duty: 'Free', adcvd: 'none', keywords: ['thermistor','ntc','ptc','temperature sensor'] },
      { code: '8534.00.0040', desc: 'Printed circuits, other', duty: 'Free', adcvd: 'none', keywords: ['pcb','printed circuit','circuit board','board','motherboard'] },
      { code: '8534.00.0080', desc: 'Multilayer circuits', duty: 'Free', adcvd: 'none', keywords: ['multilayer pcb','mlb','high density interconnect','hdi'] },
      { code: '8536.41.0040', desc: 'Relays, digital, <60v', duty: 'Free', adcvd: 'none', keywords: ['relay','solid state relay','ssr','signal relay'] },
      { code: '8536.50.2000', desc: 'Fuses, other', duty: 'Free', adcvd: 'none', keywords: ['fuse','fuse holder','automotive fuse','circuit breaker'] },
      { code: '8541.40.8000', desc: 'LED devices, other', duty: 'Free', adcvd: 'none', keywords: ['led','light','bulb','lamp','strip light','ambient light'] },
      { code: '8541.21.0040', desc: 'Diode lasers', duty: 'Free', adcvd: 'none', keywords: ['laser diode','laser module','vcsels','lidar'] },
      { code: '8523.80.1000', desc: 'Optical media, other', duty: 'Free', adcvd: 'none', keywords: ['optical disc','cd','dvd','bluray','disc','disc media'] },
      { code: '8465.20.0015', desc: 'Electric saws', duty: 'Free', adcvd: 'none', keywords: ['saw','bandsaw','jigsaw','circular saw','reciprocating saw'] },
      { code: '8465.20.0060', desc: 'Electric drills', duty: 'Free', adcvd: 'none', keywords: ['drill','impact driver','drill driver','hammer drill','percussion drill'] },
      { code: '8465.21.0010', desc: 'Electromechanical drills', duty: 'Free', adcvd: 'none', keywords: ['drill','hammer drill','percussion drill','impact drill'] },
      { code: '8465.29.8010', desc: 'Grinders and planers', duty: 'Free', adcvd: 'none', keywords: ['grinder','angle grinder','bench grinder','belt sander','planer'] },
      { code: '8507.10.4040', desc: 'Lead acid batteries', duty: 'Free', adcvd: 'none', keywords: ['lead acid','car battery','sealed lead acid','sla battery','agm'] },
      { code: '8507.60.0010', desc: 'Lithium-ion batteries', duty: 'Free', adcvd: 'none', keywords: ['lithium ion','lipo','li-ion','pouch cell','cylindrical cell'] },
      { code: '8507.80.0000', desc: 'Accumulators, other', duty: 'Free', adcvd: 'none', keywords: ['battery','batteries','power bank','battery pack','cell'] },
      { code: '8432.19.0000', desc: 'Plows and harrows', duty: 'Free', adcvd: 'none', keywords: ['plow','plough','cultivator','harrow','tiller'] },
      { code: '8432.39.0040', desc: 'Seeder/transplanter', duty: 'Free', adcvd: 'none', keywords: ['seeder','seed planter','transplanter','sowing machine'] },
      { code: '8433.59.1010', desc: 'Combine harvester threshers', duty: 'Free', adcvd: 'none', keywords: ['combine','harvester','thresher','reaper'] },
      { code: '8433.51.0010', desc: 'Mowers, rotary', duty: 'Free', adcvd: 'none', keywords: ['mower','lawn mower','ride on mower','rotary mower'] },
      { code: '8701.90.5010', desc: 'Tractors, used', duty: 'Free', adcvd: 'none', keywords: ['tractor','farm tractor','compact tractor','compact tractor','utility tractor'] },
    ];

    const ADCVD_NOTES = {
      none: '',
      false: 'This code is sometimes monitored for AD/CVD. Confirm before booking.',
      low: 'This category is sometimes flagged for AD/CVD checks. Confirm before booking.',
      moderate: 'Notify broker for AD/CVD review if shipping above de minimis.'
    };

    function matchScore(row, q) {
      const lower = `${row.code} ${row.desc}`.toLowerCase();
      const hay = lower + ' ' + (row.keywords || []).join(' ');
      const compactCode = row.code.replace(/\./g, '');
      if (lower.includes(q) || hay.includes(q) || compactCode.startsWith(q) || compactCode === q) return 2;
      if ((row.keywords || []).some((k) => k.toLowerCase() === q)) return 1.5;
      if ((row.keywords || []).some((k) => k.toLowerCase().startsWith(q + ' ') || k.toLowerCase().endsWith(' ' + q))) return 1.5;
      if (q.split(/[^a-z0-9]+/).some((part) => part && part.length >= 4 && (row.keywords || []).some((k) => k.toLowerCase().includes(part)))) return 0.75;
      if ((row.keywords || []).some((k) => k.toLowerCase().includes(q))) return 0.6;
      return 0;
    }

    const best = DATA
      .map((row) => ({ row, score: matchScore(row, query) }))
      .filter((x) => x.score >= 1.5)
      .sort((a, b) => b.score - a.score)[0];

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
    await logUsage(tier, 'v1/hts', context, 'ok');
    return new Response(
      JSON.stringify({
        ok: true,
        code: match.code,
        description: match.desc,
        dutyRate: parseFloat(match.duty) || 0,
        adcvd: match.adcvd,
        note: ADCVD_NOTES[match.adcvd] || '',
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
