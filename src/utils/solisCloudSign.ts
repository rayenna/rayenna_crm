import { createHash, createHmac } from 'crypto';

export const SOLIS_CONTENT_TYPE = 'application/json';
export const SOLIS_HTTP_VERB = 'POST';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** GMT Date header Solis HMAC expects (`EEE, dd MMM yyyy HH:mm:ss GMT`). */
export function formatSolisGmtDate(date: Date): string {
  return `${WEEKDAYS[date.getUTCDay()]}, ${pad2(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())} GMT`;
}

export function compactJsonBody(payload: unknown): string {
  return JSON.stringify(payload);
}

export function contentMd5Base64(body: string): string {
  return createHash('md5').update(body, 'utf8').digest('base64');
}

export function solisAuthorization(input: {
  keyId: string;
  keySecret: string;
  contentMd5: string;
  contentType: string;
  date: string;
  canonicalizedResource: string;
}): string {
  const signString = [
    SOLIS_HTTP_VERB,
    input.contentMd5,
    input.contentType,
    input.date,
    input.canonicalizedResource,
  ].join('\n');
  const sign = createHmac('sha1', input.keySecret).update(signString, 'utf8').digest('base64');
  return `API ${input.keyId}:${sign}`;
}

export function solisRequestHeaders(input: {
  keyId: string;
  keySecret: string;
  body: string;
  canonicalizedResource: string;
  date?: Date;
}): Record<string, string> {
  const contentMd5 = contentMd5Base64(input.body);
  const date = formatSolisGmtDate(input.date ?? new Date());
  const authorization = solisAuthorization({
    keyId: input.keyId,
    keySecret: input.keySecret,
    contentMd5,
    contentType: SOLIS_CONTENT_TYPE,
    date,
    canonicalizedResource: input.canonicalizedResource,
  });
  return {
    'Content-MD5': contentMd5,
    'Content-Type': SOLIS_CONTENT_TYPE,
    Date: date,
    Authorization: authorization,
  };
}
