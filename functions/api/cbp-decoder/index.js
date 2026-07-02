const cbpLookup = {
  '01': { title: 'CBP HOLD — Vessel/Aircraft', guidance: 'Review manifest and entry summary. Contact the port director. Typical docs: bill of lading, commercial invoice, packing list, and any required permits.' },
  '02': { title: 'CBP HOLD — Manifest', guidance: 'Correct manifest discrepancies. Resubmit manifest data and notify the port of entry.' },
  '03': { title: 'CBP HOLD — Entry', guidance: 'Submit corrected entry documentation. Pay any accrued charges before release.' },
  '04': { title: 'CBP HOLD — Inbond', guidance: 'Confirm movement/transfer documentation. Contact the port to schedule review.' },
  '05': { title: 'CBP HOLD — Trade', guidance: 'Review classification, valuation, and origin claims. Prepare supporting worksheets before release.' },
  '06': { title: 'CBP HOLD — Safety/Security', guidance: 'Provide safety certifications, inspection records, or agency release letters.' },
  '07': { title: 'CBP HOLD — Agriculture', guidance: 'Coordinate with USDA/APHIS. Addendum often requires fumigation or treatment docs.' },
  '08': { title: 'CBP HOLD — FDA', guidance: 'Add Prior Notice, facility registration, and product-specific docs per FDA commodity guidance.' },
  '09': { title: 'CBP HOLD — EPA', guidance: 'Add EPA forms for chemicals, vehicles, engines, or TSCA certifications if applicable.' },
  '10': { title: 'CBP HOLD — FCC', guidance: 'Provide FCC ID, label warnings, and Supplier Declaration of Conformity.' },
  '11': { title: 'CBP HOLD — CPSC', guidance: 'Submit CPSC certificates, test lab reports, and product safety warnings.' },
  '12': { title: 'CBP HOLD — ATF', guidance: 'Alcohol/tobacco/firearms declarations, permits, and payment of excise taxes if applicable.' },
  '13': { title: 'CBP HOLD — Other', guidance: 'Check hold detail in ACE or notify broker. Prepare agency-specific docs.' }
};

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const code = String(url.searchParams.get('code') || '').padStart(2, '0');
  const match = cbpLookup[code];
  const data = match ? { ok: true, ...match } : { ok: false, error: 'no_match', message: 'No CBP hold mapping for code: ' + code };

  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*'
    }
  });
}
