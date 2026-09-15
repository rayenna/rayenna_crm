import { describe, expect, it } from 'vitest';
import { compactJsonBody, contentMd5Base64, formatSolisGmtDate, solisAuthorization } from './solisCloudSign';

describe('solisCloudSign', () => {
  it('matches Solis API 1.2 Content-MD5 example', () => {
    const body = compactJsonBody({ pageNo: 1, pageSize: 10 });
    expect(body).toBe('{"pageNo":1,"pageSize":10}');
    expect(contentMd5Base64(body)).toBe('kxdxk7rbAsrzSIWgEwhH4w==');
  });

  it('formats GMT dates with English names and zero-padded day', () => {
    expect(formatSolisGmtDate(new Date('2019-07-26T06:00:46.000Z'))).toBe('Fri, 26 Jul 2019 06:00:46 GMT');
  });

  it('matches Solis API 1.2 HMAC example', () => {
    const sign = solisAuthorization({
      keyId: '2424',
      keySecret: '6680182547',
      contentMd5: 'kxdxk7rbAsrzSIWgEwhH4w==',
      contentType: 'application/json',
      date: 'Fri, 26 Jul 2019 06:00:46 GMT',
      canonicalizedResource: '/v1/api/userStationList',
    });
    expect(sign).toBe('API 2424:nBYQWeuzy3Y+gp67BN8zXTmvSDk=');
  });
});
