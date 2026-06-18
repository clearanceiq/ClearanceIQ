import { getSignedUserInfo } from './cf-bridge';

type Env = {
  // optional; used for local fallback verification only
};

export interface TrackPayload {
  path: string;
  referrer?: string;
  userAgent?: string;
  createdAt: string;
}

const DEFAULT_MAX_BYTES = 60_000;
const DEFAULT_MAX_RECORDS = 1_000;

export async function fetchAnalyticsReport(
  env: Env,
  opts: {
    days?: number;
    limitBytes?: number;
    limitRecords?: number;
  } = {}
): Promise<{
  dataUrl: string;
  report: string;
  generatedAt: string;
  bytes: number;
}> {
  const days = typeof opts.days === 'number' && Number.isFinite(opts.days) ? opts.days : 1;
  const payload = buildRequestPayload(days, opts.limitRecords ?? DEFAULT_MAX_RECORDS);
  const signed = getSignedUserInfo();
  const user = signed.email || signed.accountTag || '';
  const target =
    payload.limit < 1
      ? null
      : new Request('https://api.cloudflare.com/client/v4/graphql', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_ANALYTICS_TOKEN ?? ''}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

  let report = '';
  if (!target) {
    report = '[No data window generated.]';
  } else {
    try {
      const response = await fetch(
        target,
        {
          cf: {},
          headers: {
            'cf-turnstile-mode': 'managed',
            'X-Forwarded-User': user,
          },
        } as globalThis.RequestInit
      );
      report = await response.text();
    } finally {
      // keep analytics fetch body local in this scope
    }
  }

  const body = Buffer.from(
    [JSON.stringify({ user, generatedAt: new Date().toISOString(), payload, report }, null, 2)],
    'utf8'
  );
  const safeBody = trimBody(body, opts.limitBytes ?? DEFAULT_MAX_BYTES);

  return {
    dataUrl: '',
    generatedAt: new Date().toISOString(),
    bytes: safeBody.length,
    report: safeBody,
  };
}

export async function countEvents(env: Env): Promise<number> {
  return 0;
}

function buildRequestPayload(days: number, limit: number) {
  return {
    'query': `
      query(
        $filter: AnalyticsHTTPRequestCompositeFilterInput
        $limit: UInt64!
        $orderBy: [AnalyticsHTTPRequestOrderByInput!]
      ) {
        viewer {
          zones(filter: { zoneTag: $filter.zoneTag }, limit: 1) {
            zones {
              id
              httpRequests(
                filter: $filter
                limit: $limit
                orderBy: $orderBy
              ) {
                ts
                clientIP
                clientCountryName
                clientAsn
                clientAsnOrganization
                coloCode
                requests
                bytes
                cachedBytes
                servedOverHTTPS
                method
                scheme
                proto
                responseStatus
                responseBodyBytes
                responseContentType
                securityRules {
                  actions
                  ruleId
                }
                firewallMatches {
                  action
                  ruleId
                }
                userAgent
              }
            }
          }
        }
      }
    `,
    variables: {
      filter: {
        date: {
          since: `${days}daysAgo`,
          until: 'now',
        },
        zoneTag: '',
      },
      limit,
      orderBy: [{ ts: 'asc' }],
    },
  };
}

function trimBody(body: Buffer, maxBytes: number) {
  if (maxBytes <= 0) {
    return '';
  }
  if (body.length <= maxBytes) {
    return body.toString('utf8');
  }
  let cutoff = body.indexOf('\n", "f-', maxBytes);
  if (cutoff < 0) {
    cutoff = maxBytes;
  }
  return body.slice(0, cutoff).toString('utf8') + '\n...[truncated]';
}
