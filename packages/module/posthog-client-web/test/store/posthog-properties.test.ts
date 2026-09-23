import { describe, expect, it } from 'vitest';

import { getDefaultPosthogProperties } from '../../src/store/posthog-properties';

const CHROME_ON_LINUX =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const location = {
  host: 'localhost:8443',
  href: 'https://localhost:8443/portfolio',
  pathname: '/portfolio',
} as Location;

describe('posthog-client-web/posthog-properties', () => {
  it('tags every event as emitted by the carbon interface', () => {
    const properties = getDefaultPosthogProperties(
      { userAgent: CHROME_ON_LINUX, vendor: 'Google Inc.' } as Navigator,
      location,
    );

    expect(properties.interface).toBe('carbon');
  });

  it('describes the browser, device and page the way PostHog expects', () => {
    const properties = getDefaultPosthogProperties(
      { userAgent: CHROME_ON_LINUX, vendor: 'Google Inc.' } as Navigator,
      location,
    );

    expect(properties).toMatchObject({
      $browser: 'Chrome',
      $browser_version: 140,
      $current_url: 'https://localhost:8443/portfolio',
      $device: 'Desktop',
      $host: 'localhost:8443',
      $os: 'Linux',
      $pathname: '/portfolio',
    });
    expect(typeof properties.$insert_id).toBe('string');
    expect(typeof properties.$time).toBe('number');
  });

  it('reports the mount URL without the install id the shell puts in its fragment', () => {
    const properties = getDefaultPosthogProperties(
      { userAgent: CHROME_ON_LINUX, vendor: 'Google Inc.' } as Navigator,
      {
        host: 'guest.example',
        href: 'https://guest.example/0.2.0.7/#iid=6b1f0c3e-2d4a-4f10-9a77-1c2e3f4d5a6b',
        pathname: '/0.2.0.7/',
      } as Location,
    );

    expect(properties.$current_url).toBe('https://guest.example/0.2.0.7/');
  });

  it('keeps the interface tag when there is no navigator to describe', () => {
    expect(getDefaultPosthogProperties(undefined, location)).toEqual({
      interface: 'carbon',
    });
  });
});
