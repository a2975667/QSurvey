import { useEffect } from 'react';

export const siteUrl = 'https://qsurvey.online/';

export const seoCopy = {
  title: 'QSurvey | Quadratic Voting Survey Tool',
  ogTitle: 'QSurvey: Quadratic Voting Surveys for Better Group Decisions',
  description:
    'QSurvey is a research-backed quadratic voting survey tool for measuring what people prefer and how strongly they prefer it.',
  aboutTitle: 'About QSurvey | Quadratic Voting and Preference Elicitation Research',
  aboutDescription:
    'Learn about QSurvey, a research-backed quadratic survey system for preference elicitation, collective decision-making, and quadratic voting studies.',
};

const getOrCreateMeta = (selector: string, createAttributes: Record<string, string>): HTMLMetaElement => {
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) {
    return existing;
  }

  const meta = document.createElement('meta');
  Object.entries(createAttributes).forEach(([key, value]) => {
    meta.setAttribute(key, value);
  });
  document.head.appendChild(meta);
  return meta;
};

const getOrCreateCanonical = (): HTMLLinkElement => {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (existing) {
    return existing;
  }

  const link = document.createElement('link');
  link.setAttribute('rel', 'canonical');
  document.head.appendChild(link);
  return link;
};

export const usePageMetadata = ({
  title,
  description,
  canonicalPath = '/',
  noindex = false,
  openGraphTitle,
  twitterTitle,
}: {
  title: string;
  description: string;
  canonicalPath?: string;
  noindex?: boolean;
  openGraphTitle?: string;
  twitterTitle?: string;
}): void => {
  useEffect(() => {
    const canonicalUrl = new URL(canonicalPath, siteUrl).toString();
    const socialTitle = openGraphTitle || title;
    const socialTwitterTitle = twitterTitle || socialTitle;
    const previousTitle = document.title;
    const previousDescription = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content;
    const previousOgTitle = document.head.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content;
    const previousOgDescription = document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content;
    const previousOgUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content;
    const previousTwitterTitle = document.head.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.content;
    const previousTwitterDescription = document.head.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')?.content;
    const previousCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    const previousRobots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content;

    document.title = title;
    getOrCreateMeta('meta[name="description"]', { name: 'description' }).content = description;
    getOrCreateMeta('meta[property="og:title"]', { property: 'og:title' }).content = socialTitle;
    getOrCreateMeta('meta[property="og:description"]', {
      property: 'og:description',
    }).content = description;
    getOrCreateMeta('meta[property="og:url"]', { property: 'og:url' }).content = canonicalUrl;
    getOrCreateMeta('meta[name="twitter:title"]', { name: 'twitter:title' }).content = socialTwitterTitle;
    getOrCreateMeta('meta[name="twitter:description"]', {
      name: 'twitter:description',
    }).content = description;
    getOrCreateCanonical().href = canonicalUrl;

    if (noindex) {
      getOrCreateMeta('meta[name="robots"]', { name: 'robots' }).content = 'noindex, nofollow';
    } else {
      const robots = document.head.querySelector('meta[name="robots"]');
      robots?.remove();
    }

    return () => {
      document.title = previousTitle;

      const restoreMeta = (selector: string, createAttributes: Record<string, string>, previousContent?: string) => {
        const existing = document.head.querySelector<HTMLMetaElement>(selector);
        if (previousContent === undefined) {
          existing?.remove();
          return;
        }
        getOrCreateMeta(selector, createAttributes).content = previousContent;
      };

      restoreMeta('meta[name="description"]', { name: 'description' }, previousDescription);
      restoreMeta('meta[property="og:title"]', { property: 'og:title' }, previousOgTitle);
      restoreMeta('meta[property="og:description"]', { property: 'og:description' }, previousOgDescription);
      restoreMeta('meta[property="og:url"]', { property: 'og:url' }, previousOgUrl);
      restoreMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, previousTwitterTitle);
      restoreMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, previousTwitterDescription);
      restoreMeta('meta[name="robots"]', { name: 'robots' }, previousRobots);

      const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (previousCanonical === undefined) {
        canonical?.remove();
      } else {
        getOrCreateCanonical().href = previousCanonical;
      }
    };
  }, [canonicalPath, description, noindex, openGraphTitle, title, twitterTitle]);
};
