import { describe, expect, it } from 'vitest';
import { parseGoogleMapsLatLng } from './parseGoogleMapsLink';

describe('parseGoogleMapsLatLng', () => {
  it('parses plain lat,lng', () => {
    expect(parseGoogleMapsLatLng('12.9716, 77.5946')).toEqual({
      lat: 12.9716,
      lng: 77.5946,
    });
  });

  it('parses @lat,lng from share URL', () => {
    const url =
      'https://www.google.com/maps/@12.971599,77.594563,17z';
    expect(parseGoogleMapsLatLng(url)).toEqual({
      lat: 12.971599,
      lng: 77.594563,
    });
  });

  it('parses ?q=lat,lng', () => {
    expect(
      parseGoogleMapsLatLng('https://maps.google.com/?q=12.97,77.59'),
    ).toEqual({ lat: 12.97, lng: 77.59 });
  });

  it('parses !3d!4d place coordinates', () => {
    const url =
      'https://www.google.com/maps/place/Test/data=!4m7!3m6!1s0x0!8m2!3d12.9086917!4d77.6327583';
    expect(parseGoogleMapsLatLng(url)).toEqual({
      lat: 12.9086917,
      lng: 77.6327583,
    });
  });

  it('returns null for empty or short links without coords', () => {
    expect(parseGoogleMapsLatLng('')).toBeNull();
    expect(parseGoogleMapsLatLng('   ')).toBeNull();
    expect(parseGoogleMapsLatLng('https://maps.app.goo.gl/abc123')).toBeNull();
  });

  it('rejects out-of-range coordinates', () => {
    expect(parseGoogleMapsLatLng('91, 0')).toBeNull();
    expect(parseGoogleMapsLatLng('0, 181')).toBeNull();
  });
});
