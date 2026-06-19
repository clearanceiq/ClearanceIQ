import { consumeLimit, resolveRateLimitContext } from '../rate-limit.js';

function cors(headers = {}) {
  return {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, x-api-key',
    ...headers,
  };
}

async function logUsage(tier, endpoint, context, result) {
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
    try {
      await context.env.RATE_COUNTER.put(key, entry, { expirationTtl: 72 * 60 * 60 });
    } catch { /* no-op */ }
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
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();
    if (!query) {
      await logUsage(tier, 'v1/hts', context, 'error');
      return new Response(
        JSON.stringify({ ok: false, error: 'q required' }),
        {
          headers: cors({
            'x-rate-limit-remaining': String(limit.remaining),
            'x-rate-limit-limit': String(limit.limit),
            'x-rate-limit-tier': tier,
            'x-rate-limit-reset': String(limit.resetUnix),
          }),
          status: 400,
        }
      );
    }

    const DATA = [
      // Audio/Mobile/Display
      { code: '8518.30.0000', desc: 'Loudspeakers', keywords: ['loudspeaker','speaker','soundbar','pa speaker','woofer'] },
      { code: '8518.40.0000', desc: 'Headphones and earphones', keywords: ['headphone','earphone','headset','earbud','airpod','earbuds'] },
      { code: '8517.12.0095', desc: 'Smartphones and base stations', keywords: ['smartphone','phone','mobile','cell phone','android','iphone'] },
      { code: '8517.62.0000', desc: 'Base stations and repeaters', keywords: ['base station','repeater','signal booster','cell repeater'] },
      { code: '9013.80.0010', desc: 'LED display panels', keywords: ['led display','led panel','lcd panel','monitor','screen','digital signage'] },
      { code: '9013.90.5000', desc: 'Optical devices, other', keywords: ['optical','lens module','projector lens'] },
      { code: '8528.71.0000', desc: 'Video projectors', keywords: ['projector','beamer','video projector','projection'] },
      { code: '8525.80.0010', desc: 'TV cameras and camcorders', keywords: ['camcorder','action camera','camera','gopro','dslr'] },
      // Home/Office
      { code: '9403.10.0000', desc: 'Metal office furniture', keywords: ['furniture','desk','cabinet','shelf','file cabinet','office chair'] },
      { code: '9403.20.0040', desc: 'Other seats, metal', keywords: ['chair','stool','bench','seat','office seat'] },
      { code: '9403.50.0000', desc: 'Wooden furniture', keywords: ['wooden chair','wooden desk','table','dining table'] },
      { code: '9403.60.8000', desc: 'Other furniture', keywords: ['sofa','couch','wardrobe','bed frame'] },
      { code: '8509.80.0040', desc: 'Vacuum cleaners', keywords: ['vacuum','hoover','robot vacuum','vacuum cleaner'] },
      { code: '8516.32.0000', desc: 'Hair dryers', keywords: ['hair dryer','hair dryer','blower','hair straightener','flat iron'] },
      { code: '8516.33.0000', desc: 'Hand dryers', keywords: ['hand dryer','hand dryer'] },
      { code: '8421.23.0000', desc: 'Oil and petrol filters', keywords: ['oil filter','fuel filter','air filter','filter'] },
      // Clothing/Textiles
      { code: '6109.10.2000', desc: 'Cotton T-shirts', keywords: ['t-shirt','tshirt','tee','cotton shirt','crew neck'] },
      { code: '6109.10.3000', desc: 'Polyester T-shirts', keywords: ['polyester tee','synthetic tee','sports tee'] },
      { code: '6110.20.2070', desc: 'Cotton sweatshirts', keywords: ['sweatshirt','hoodie','hooded','pullover','crewneck'] },
      { code: '6110.12.1020', desc: 'Cotton sweaters, women', keywords: ['sweater','jumper','knit','cardigan','pullover'] },
      { code: '6203.42.4011', desc: 'Men trousers, cotton', keywords: ['trouser','pant','chino','cargo pants','jeans','denim','work pant'] },
      { code: '6203.49.8041', desc: 'Men trousers, synthetic', keywords: ['jogger','sweatpant','legging','yoga pant'] },
      { code: '6204.62.3011', desc: 'Women trousers, cotton', keywords: ['women trouser','ladies pant','capri','culotte'] },
      { code: '6204.63.3011', desc: 'Women trousers, synthetic', keywords: ['women jogger','legging','leggings'] },
      { code: '6205.20.2020', desc: 'Men shirts, cotton', keywords: ['shirt','polo','oxford','button down','dress shirt'] },
      { code: '6206.10.3050', desc: 'Women blouses, silk', keywords: ['blouse','silk blouse','women top','satin blouse'] },
      { code: '6206.20.5050', desc: 'Women blouses, manmade', keywords: ['blouse','women top','mock neck','silk blouse','satin top'] },
      { code: '6211.42.0040', desc: 'Women swimwear', keywords: ['swim','swimsuit','bikini','one piece','swimsuits','coverup'] },
      { code: '6211.43.0040', desc: 'Men swimwear', keywords: ['trunk','boardshort','swim trunk','mens swimwear'] },
      { code: '6201.12.0010', desc: 'Men padded jackets', keywords: ['puffer','puffer jacket','down jacket','quilted jacket','parka'] },
      { code: '6201.93.3010', desc: 'Men anoraks, windbreakers', keywords: ['windbreaker','anorak','track jacket','shell jacket','softshell'] },
      { code: '6202.11.0000', desc: 'Women padded jackets', keywords: ['puffer','womens jacket','down jacket','puffer jacket','quilted jacket'] },
      { code: '6202.93.3010', desc: 'Women anoraks, windbreakers', keywords: ['windbreaker','womens windbreaker','track jacket'] },
      { code: '6115.95.3050', desc: 'Compression wear', keywords: ['compression','base layer','thermal','rash guard','rashguard'] },
      { code: '6112.00.3500', desc: 'Infants garments', keywords: ['onesie','baby','infant','toddler','romper','newborn'] },
      { code: '6204.69.6010', desc: 'Women skirts, synthetic', keywords: ['skirt','midi skirt','pleated skirt','tennis skirt'] },
      { code: '6104.63.1011', desc: 'Women dresses, synthetic', keywords: ['dress','maxi dress','midi dress','wrap dress','sundress'] },
      { code: '6104.69.2060', desc: 'Women dresses, cotton', keywords: ['cotton dress','linen dress','shirt dress','pinafore'] },
      { code: '6204.59.6020', desc: 'Women dresses,', keywords: ['dress','formal dress','evening dress'] },
      // Fabrics/Yarn
      { code: '5407.61.1000', desc: 'Woven fabrics of polyester', keywords: ['polyester fabric','woven','poly fabric','outerwear fabric'] },
      { code: '5407.10.2000', desc: 'Woven fabrics of nylon', keywords: ['nylon fabric','ripstop','ballistic nylon','nylon','spandex fabric'] },
      { code: '5208.11.3560', desc: 'Plain weave cotton fabric', keywords: ['cotton fabric','plain weave','sheeting','poplin','calico','canvas'] },
      { code: '5208.29.3560', desc: 'Twill weave cotton fabric', keywords: ['twill','denim fabric','chino fabric','drill fabric'] },
      { code: '5512.11.0000', desc: 'Woven fabrics of synthetic staple', keywords: ['fleece fabric','polar fleece','microfleece'] },
      { code: '6001.10.2000', desc: 'Pile fabrics of cotton', keywords: ['terry cloth','terry fabric','toweling','pile fabric'] },
      { code: '6001.21.0000', desc: 'Terry toweling, cotton', keywords: ['terry towel','bath towel','towel fabric'] },
      { code: '5503.20.0000', desc: 'Staple fibers, polyester', keywords: ['polyester fiber','staple fiber','fiberfill','stuffing fiber'] },
      { code: '5503.90.0000', desc: 'Staple fibers, other', keywords: ['acrylic fiber','nylon fiber','staple fiber'] },
      { code: '5205.13.0000', desc: 'Combed cotton yarns', keywords: ['cotton yarn','combed yarn','sewing thread','cotton thread'] },
      { code: '5402.46.9010', desc: 'Polyester filament yarns', keywords: ['polyester yarn','filament yarn','thread','fishing line'] },
      // Footwear
      { code: '6402.99.0500', desc: 'Footwear, rubber/plastic', keywords: ['shoe','shoes','footwear','sneaker','trainer'] },
      { code: '6404.19.6030', desc: 'Sports footwear, textile upper', keywords: ['athletic shoe','running shoe','gym shoe','basketball shoe'] },
      { code: '6402.99.1550', desc: 'Slide sandals, rubber/plastic', keywords: ['slide','sandals','flip flop','flip-flop','sandal'] },
      { code: '6402.19.1570', desc: 'Sports footwear, rubber/plastic', keywords: ['skate shoe','skateboard shoe','skateboarding'] },
      { code: '6403.19.8010', desc: 'Ski boots and cross-country', keywords: ['ski boot','ski','snowboard boot','winter boot'] },
      // Tires/Industrial
      { code: '4011.10.0010', desc: 'Pneumatic tires, new', keywords: ['tire','tyre','wheel','car tire','truck tire','tractor tire'] },
      { code: '4011.20.1010', desc: 'Used pneumatic tires', keywords: ['used tire','retread','retread tire','recap tire'] },
      { code: '7318.15.0085', desc: 'Iron/steel screws/bolts', keywords: ['bolt','screw','fastener','hex bolt','carriage bolt'] },
      { code: '7318.16.0050', desc: 'Nuts of iron or steel', keywords: ['nut','hex nut','locking nut','flange nut'] },
      { code: '7318.21.0000', desc: 'Washers of iron or steel', keywords: ['washer','flat washer','spring washer','fender washer'] },
      { code: '7318.22.0000', desc: 'Rivets of iron or steel', keywords: ['rivet','blind rivet','solid rivet','pop rivet'] },
      { code: '7323.94.0000', desc: 'Stainless table/kitchen ware', keywords: ['pot','pan','cookware','kitchenware','stainless pot','stainless pan'] },
      { code: '7610.90.0050', desc: 'Aluminum structures', keywords: ['aluminum structure','aluminum frame','extrusion','aluminum profile'] },
      { code: '8302.42.3000', desc: 'Hinges of base metal', keywords: ['hinge','butt hinge','cabinet hinge','door hinge'] },
      // Toys/Recreation
      { code: '9503.00.0073', desc: 'Toys, plastic, <= 50 cents', keywords: ['toy','toys','plastic toy','figurine','action figure','lego','blocks'] },
      { code: '9503.00.2500', desc: 'Electronic toys', keywords: ['electronic toy','remote control car','rc car','drone','toy drone'] },
      { code: '9506.91.0010', desc: 'Bicycles, other', keywords: ['bicycle','bike','cycling','bicycle frame','road bike','mountain bike'] },
      { code: '9506.99.0070', desc: 'Sporting goods, other', keywords: ['kayak','paddle board','snowboard','skateboard'] },
      { code: '9506.51.4000', desc: 'Table tennis equipment', keywords: ['ping pong','table tennis','ping-pong','paddle'] },
      // Cosmetics/Personal Care
      { code: '3304.99.5000', desc: 'Beauty and makeup preparations', keywords: ['beauty','makeup','cosmetic','lipstick','foundation','eyeshadow','mascara'] },
      { code: '3304.99.6000', desc: 'Nail products', keywords: ['nail polish','nail','acrylic nail','nail art','top coat','base coat','gel polish'] },
      { code: '3304.10.0000', desc: 'Lip cosmetics', keywords: ['lipstick','lip gloss','lip balm','lip','lip liner','lip tint'] },
      { code: '3304.20.0000', desc: 'Eye makeup', keywords: ['eyeshadow','eyeliner','mascara','eyebrow','false lash','lash serum'] },
      { code: '3303.29.5100', desc: 'Perfumes', keywords: ['perfume','cologne','eau de toilette','fragrance','parfum'] },
      { code: '3305.00.2000', desc: 'Hair preparations', keywords: ['shampoo','conditioner','hair oil','hair treatment','scalp scrub'] },
      { code: '3307.90.5000', desc: 'Shaving and deodorant', keywords: ['deodorant','antiperspirant','shaving cream','aftershave','razor'] },
      // Containers/Packaging
      { code: '3923.10.9000', desc: 'Plastic boxes, cases', keywords: ['box','case','storage box','jewelry box','empty box','hard case'] },
      { code: '3923.50.0000', desc: 'Stoppers/ closures of plastic', keywords: ['closure','cap','stopper','lid','bottle cap'] },
      { code: '3923.90.5000', desc: 'Plastic articles, other', keywords: ['plastic','polymer','acrylic','3d print filament','pla','abs','petg'] },
      { code: '7010.90.7500', desc: 'Glass containers, other', keywords: ['bottle','jar','glass bottle','vial','flask','glass jar'] },
      { code: '7310.29.0050', desc: 'Aluminum containers, other', keywords: ['aluminum can','aluminum bottle','aerosol can'] },
      // Electronics components
      { code: '8533.40.8050', desc: 'Thermistors and varistors', keywords: ['thermistor','ntc','ptc','temperature sensor'] },
      { code: '8534.00.0040', desc: 'Printed circuits, other', keywords: ['pcb','printed circuit','circuit board','board','motherboard'] },
      { code: '8534.00.0080', desc: 'Multilayer circuits', keywords: ['multilayer pcb','mlb','high density interconnect','hdi'] },
      { code: '8536.41.0040', desc: 'Relays, digital, <60v', keywords: ['relay','solid state relay','ssr','signal relay'] },
      { code: '8536.50.2000', desc: 'Fuses, other', keywords: ['fuse','fuse holder','automotive fuse','circuit breaker'] },
      { code: '8541.40.8000', desc: 'LED devices, other', keywords: ['led','light','bulb','lamp','strip light','ambient light'] },
      { code: '8541.21.0040', desc: 'Diode lasers', keywords: ['laser diode','laser module','vcsels','lidar'] },
      { code: '8523.80.1000', desc: 'Optical media, other', keywords: ['optical disc','cd','dvd','bluray','disc','disc media'] },
      // Power tools
      { code: '8465.20.0015', desc: 'Electric saws', keywords: ['saw','bandsaw','jigsaw','circular saw','reciprocating saw'] },
      { code: '8465.20.0060', desc: 'Electric drills', keywords: ['drill','impact driver','drill driver','hammer drill','percussion drill'] },
      { code: '8465.21.0010', desc: 'Electromechanical drills', keywords: ['drill','hammer drill','percussion drill','impact drill'] },
      { code: '8465.29.8010', desc: 'Grinders and planers', keywords: ['grinder','angle grinder','bench grinder','belt sander','planer'] },
      { code: '8507.10.4040', desc: 'Lead acid batteries', keywords: ['lead acid','car battery','sealed lead acid','sla battery','agm'] },
      { code: '8507.60.0010', desc: 'Lithium-ion batteries', keywords: ['lithium ion','lipo','li-ion','pouch cell','cylindrical cell'] },
      { code: '8507.80.0000', desc: 'Accumulators, other', keywords: ['battery','batteries','power bank','battery pack','cell'] },
      // Agriculture
      { code: '8432.19.0000', desc: 'Plows and harrows', keywords: ['plow','plough','cultivator','harrow','tiller'] },
      { code: '8432.39.0040', desc: 'Seeder/transplanter', keywords: ['seeder','seed planter','transplanter','sowing machine'] },
      { code: '8433.59.1010', desc: 'Combine harvester threshers', keywords: ['combine','harvester','thresher','reaper'] },
      { code: '8433.51.0010', desc: 'Mowers, rotary', keywords: ['mower','lawn mower','ride on mower','rotary mower'] },
      { code: '8701.90.5010', desc: 'Tractors, used', keywords: ['tractor','farm tractor','compact tractor','compact tractor','utility tractor'] },
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
      if (lower.includes(q) || compactCode.startsWith(q) || compactCode === q) return 2;
      if ((row.keywords || []).some((k) => k.includes(q)) || q.split(/[^a-z0-9]+/).some((part) => part && (row.keywords || []).some((k) => k.includes(part)))) return 1;
      return 0;
    }

    const best = DATA
      .map((row) => ({ row, score: matchScore(row, query) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)[0];

    if (!best) {
      await logUsage(tier, 'v1/hts', context, 'error');
      return new Response(
        JSON.stringify({ ok: false, error: 'no_match' }),
        {
          headers: cors({
            'x-rate-limit-remaining': String(limit.remaining - 1),
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
        dutyRate: 0,
        adcvd: 'low',
        note: ADCVD_NOTES.low,
      }),
      {
        headers: cors({
          'x-rate-limit-remaining': String(limit.remaining - 1),
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
