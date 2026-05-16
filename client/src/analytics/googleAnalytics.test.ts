import {
  getAnalyticsConsent,
  getAnalyticsConfig,
  getGoogleConsentSettings,
  initAnalytics,
  resetAnalyticsForTests,
  sanitizeAnalyticsLocation,
  sanitizeAnalyticsPath,
  setAnalyticsConsent,
  shouldRequestAnalyticsConsent,
  trackPageView,
} from './googleAnalytics';

const dataLayerEntry = (index: number) => Array.from(window.dataLayer?.[index] as IArguments);

describe('googleAnalytics', () => {
  beforeEach(() => {
    resetAnalyticsForTests();
    document.head.innerHTML = '';
    window.localStorage.clear();
    delete window.dataLayer;
    delete window.gtag;
  });

  afterEach(() => {
    resetAnalyticsForTests();
    document.head.innerHTML = '';
    window.localStorage.clear();
    delete window.dataLayer;
    delete window.gtag;
  });

  it('disables analytics outside production even when a measurement ID is present', () => {
    const config = getAnalyticsConfig({
      NODE_ENV: 'test',
      REACT_APP_GA_MEASUREMENT_ID: 'G-TEST123',
    });

    expect(config).toEqual({
      enabled: false,
      measurementId: 'G-TEST123',
    });
    expect(
      initAnalytics({
        NODE_ENV: 'test',
        REACT_APP_GA_MEASUREMENT_ID: 'G-TEST123',
      }),
    ).toBe(false);
    expect(document.querySelector('script[src*="googletagmanager.com"]')).toBeNull();
  });

  it('loads analytics in production with denied analytics storage before consent', () => {
    const env = {
      NODE_ENV: 'production',
      REACT_APP_GA_MEASUREMENT_ID: 'G-TEST123',
    };

    expect(getAnalyticsConfig(env)).toEqual({
      enabled: true,
      measurementId: 'G-TEST123',
    });
    expect(initAnalytics(env)).toBe(true);
    expect(dataLayerEntry(0)).toEqual([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
      },
    ]);
    expect(document.querySelector('script[src*="googletagmanager.com"]')).not.toBeNull();
  });

  it('enables analytics storage in production when consent is accepted', () => {
    expect(
      initAnalytics(
        {
          NODE_ENV: 'production',
          REACT_APP_GA_MEASUREMENT_ID: 'G-TEST123',
        },
        undefined,
        'accepted',
      ),
    ).toBe(true);

    const script = document.getElementById('qsurvey-ga4-script') as HTMLScriptElement | null;

    expect(script?.src).toBe('https://www.googletagmanager.com/gtag/js?id=G-TEST123');
    expect(dataLayerEntry(0)).toEqual([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'granted',
      },
    ]);
    expect(dataLayerEntry(1)[0]).toBe('js');
    expect(dataLayerEntry(2)).toEqual([
      'config',
      'G-TEST123',
      { send_page_view: false },
    ]);
  });

  it('injects the GA script only once for repeated initialization', () => {
    const env = {
      NODE_ENV: 'production',
      REACT_APP_GA_MEASUREMENT_ID: 'G-TEST123',
    };

    expect(initAnalytics(env, undefined, 'accepted')).toBe(true);
    expect(initAnalytics(env, undefined, 'accepted')).toBe(true);

    expect(document.querySelectorAll('script[src*="googletagmanager.com"]')).toHaveLength(1);
    expect(window.dataLayer?.filter(entry => Array.from(entry as IArguments)[0] === 'config')).toHaveLength(1);
  });

  it('updates consent without reinjecting or reconfiguring analytics', () => {
    const env = {
      NODE_ENV: 'production',
      REACT_APP_GA_MEASUREMENT_ID: 'G-TEST123',
    };

    expect(initAnalytics(env)).toBe(true);
    expect(initAnalytics(env, undefined, 'accepted')).toBe(true);

    expect(document.querySelectorAll('script[src*="googletagmanager.com"]')).toHaveLength(1);
    expect(window.dataLayer?.filter(entry => Array.from(entry as IArguments)[0] === 'config')).toHaveLength(1);
    expect(dataLayerEntry(3)).toEqual([
      'consent',
      'update',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'granted',
      },
    ]);
  });

  it('persists accepted and declined analytics consent choices', () => {
    expect(getAnalyticsConsent()).toBeNull();

    setAnalyticsConsent('declined');
    expect(getAnalyticsConsent()).toBe('declined');

    setAnalyticsConsent('accepted');
    expect(getAnalyticsConsent()).toBe('accepted');
  });

  it('requests analytics consent only for configured production analytics without a stored choice', () => {
    const env = {
      NODE_ENV: 'production',
      REACT_APP_GA_MEASUREMENT_ID: 'G-TEST123',
    };

    expect(shouldRequestAnalyticsConsent(null, env)).toBe(true);
    expect(shouldRequestAnalyticsConsent('accepted', env)).toBe(false);
    expect(shouldRequestAnalyticsConsent('declined', env)).toBe(false);
    expect(
      shouldRequestAnalyticsConsent(null, {
        NODE_ENV: 'test',
        REACT_APP_GA_MEASUREMENT_ID: 'G-TEST123',
      }),
    ).toBe(false);
    expect(
      shouldRequestAnalyticsConsent(null, {
        NODE_ENV: 'production',
        REACT_APP_GA_MEASUREMENT_ID: '',
      }),
    ).toBe(false);
  });

  it('maps accepted consent to analytics storage only', () => {
    expect(getGoogleConsentSettings(null)).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
    expect(getGoogleConsentSettings('declined')).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
    expect(getGoogleConsentSettings('accepted')).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });
  });

  it('strips query strings and hashes from analytics paths', () => {
    expect(
      sanitizeAnalyticsPath({
        pathname: '/survey/abc/complete',
      }),
    ).toBe('/survey/abc/complete');
    expect(sanitizeAnalyticsPath('/survey/abc?uuid=secret&sKey=hidden#done')).toBe('/survey/abc');
  });

  it('strips query strings and hashes from analytics page locations', () => {
    expect(
      sanitizeAnalyticsLocation({
        origin: 'https://qsurvey.online',
        pathname: '/survey/abc/complete',
      }),
    ).toBe('https://qsurvey.online/survey/abc/complete');
    expect(
      sanitizeAnalyticsLocation('https://qsurvey.online/survey/abc?uuid=secret&sKey=hidden#done'),
    ).toBe('https://qsurvey.online/survey/abc');
  });

  it('tracks sanitized page views only when enabled and gtag is available', () => {
    const gtag = jest.fn();
    window.gtag = gtag;

    expect(
      trackPageView(
        '/survey/abc?uuid=secret#done',
        {
          NODE_ENV: 'test',
          REACT_APP_GA_MEASUREMENT_ID: 'G-TEST123',
        },
        'accepted',
      ),
    ).toBe(false);
    expect(gtag).not.toHaveBeenCalled();

    expect(
      trackPageView('/survey/abc?uuid=secret#done', {
        NODE_ENV: 'production',
        REACT_APP_GA_MEASUREMENT_ID: 'G-TEST123',
      }),
    ).toBe(true);
    expect(gtag).toHaveBeenCalledWith('event', 'page_view', {
      page_location: 'http://localhost/survey/abc',
      page_path: '/survey/abc',
      page_title: '',
    });
    gtag.mockClear();

    expect(
      trackPageView(
        '/survey/abc?uuid=secret#done',
        {
          NODE_ENV: 'production',
          REACT_APP_GA_MEASUREMENT_ID: 'G-TEST123',
        },
        'accepted',
      ),
    ).toBe(true);
    expect(gtag).toHaveBeenCalledWith('event', 'page_view', {
      page_location: 'http://localhost/survey/abc',
      page_path: '/survey/abc',
      page_title: '',
    });
  });
});
