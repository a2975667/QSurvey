type AnalyticsEnv = {
  NODE_ENV?: string;
  REACT_APP_GA_MEASUREMENT_ID?: string;
};

export type AnalyticsConsent = 'accepted' | 'declined' | null;

export type AnalyticsLocationLike =
  | string
  | {
      href?: string | null;
      origin?: string | null;
      pathname?: string | null;
    };

type GtagCommand = 'js' | 'config' | 'event';
type GtagArguments = [GtagCommand, string | Date, Record<string, unknown>?];

declare global {
  interface Window {
    dataLayer?: GtagArguments[];
    gtag?: (...args: GtagArguments) => void;
  }
}

const GA_SCRIPT_ID = 'qsurvey-ga4-script';
const ANALYTICS_CONSENT_STORAGE_KEY = 'qsurvey.analyticsConsent';

let initializedMeasurementId: string | null = null;

const getBrowserStorage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const getAnalyticsConsent = (
  storage: Pick<Storage, 'getItem'> | null = getBrowserStorage(),
): AnalyticsConsent => {
  try {
    const storedConsent = storage?.getItem(ANALYTICS_CONSENT_STORAGE_KEY);

    if (storedConsent === 'accepted' || storedConsent === 'declined') {
      return storedConsent;
    }
  } catch {
    return null;
  }

  return null;
};

export const setAnalyticsConsent = (
  consent: Exclude<AnalyticsConsent, null>,
  storage: Pick<Storage, 'setItem'> | null = getBrowserStorage(),
) => {
  try {
    storage?.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  } catch {
    return;
  }
};

export const getAnalyticsConfig = (
  env: AnalyticsEnv = process.env,
  consent: AnalyticsConsent = getAnalyticsConsent(),
) => {
  const measurementId = env.REACT_APP_GA_MEASUREMENT_ID?.trim() ?? '';

  return {
    enabled: env.NODE_ENV === 'production' && measurementId.length > 0 && consent === 'accepted',
    measurementId,
  };
};

export const shouldRequestAnalyticsConsent = (
  consent: AnalyticsConsent = getAnalyticsConsent(),
  env: AnalyticsEnv = process.env,
): boolean => {
  const measurementId = env.REACT_APP_GA_MEASUREMENT_ID?.trim() ?? '';

  return env.NODE_ENV === 'production' && measurementId.length > 0 && consent === null;
};

export const sanitizeAnalyticsPath = (locationLike: AnalyticsLocationLike = window.location): string => {
  if (typeof locationLike === 'string') {
    try {
      const baseUrl = window.location?.origin ?? 'https://qsurvey.local';
      return new URL(locationLike, baseUrl).pathname || '/';
    } catch {
      return locationLike.split(/[?#]/)[0] || '/';
    }
  }

  return locationLike.pathname || '/';
};

export const sanitizeAnalyticsLocation = (locationLike: AnalyticsLocationLike = window.location): string => {
  if (typeof locationLike === 'string') {
    try {
      const baseUrl = window.location?.origin ?? 'https://qsurvey.local';
      const url = new URL(locationLike, baseUrl);

      return `${url.origin}${url.pathname || '/'}`;
    } catch {
      const origin = window.location?.origin ?? 'https://qsurvey.local';

      return `${origin}${locationLike.split(/[?#]/)[0] || '/'}`;
    }
  }

  if (locationLike.href) {
    try {
      const url = new URL(locationLike.href);

      return `${url.origin}${url.pathname || '/'}`;
    } catch {
      return `${window.location?.origin ?? 'https://qsurvey.local'}${locationLike.pathname || '/'}`;
    }
  }

  const origin = locationLike.origin || window.location?.origin || 'https://qsurvey.local';

  return `${origin}${locationLike.pathname || '/'}`;
};

export const resetAnalyticsForTests = () => {
  initializedMeasurementId = null;
};

export const initAnalytics = (
  env: AnalyticsEnv = process.env,
  doc: Document = document,
  consent: AnalyticsConsent = getAnalyticsConsent(),
): boolean => {
  const { enabled, measurementId } = getAnalyticsConfig(env, consent);

  if (!enabled) {
    return false;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    ((...args: GtagArguments) => {
      window.dataLayer?.push(args);
    });

  if (!doc.getElementById(GA_SCRIPT_ID)) {
    const script = doc.createElement('script');
    script.id = GA_SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    doc.head.appendChild(script);
  }

  if (initializedMeasurementId !== measurementId) {
    window.gtag('js', new Date());
    window.gtag('config', measurementId, { send_page_view: false });
    initializedMeasurementId = measurementId;
  }

  return true;
};

export const trackPageView = (
  locationLike: AnalyticsLocationLike,
  env: AnalyticsEnv = process.env,
  consent: AnalyticsConsent = getAnalyticsConsent(),
): boolean => {
  const { enabled, measurementId } = getAnalyticsConfig(env, consent);

  if (!enabled || !window.gtag) {
    return false;
  }

  window.gtag('event', 'page_view', {
    page_location: sanitizeAnalyticsLocation(locationLike),
    page_path: sanitizeAnalyticsPath(locationLike),
    send_to: measurementId,
  });

  return true;
};
