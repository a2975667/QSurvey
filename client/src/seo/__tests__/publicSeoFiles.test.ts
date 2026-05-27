import fs from 'fs';
import path from 'path';

const publicDir = path.resolve(process.cwd(), 'public');

const readPublicFile = (fileName: string) =>
  fs.readFileSync(path.join(publicDir, fileName), 'utf8');

describe('public SEO and AI-search files', () => {
  it('has static metadata and valid JSON-LD in index.html', () => {
    const indexHtml = readPublicFile('index.html');
    expect(indexHtml).toContain('QSurvey | Quadratic Voting Survey Tool');
    expect(indexHtml).toContain('what people prefer and how strongly they prefer it');
    expect(indexHtml).not.toContain('rel="canonical"');
    expect(indexHtml).toContain('https://qsurvey.online/og-image.png');

    const jsonLdMatch = indexHtml.match(
      /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/,
    );
    expect(jsonLdMatch).not.toBeNull();

    const jsonLd = JSON.parse(jsonLdMatch?.[1] ?? '{}');
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('WebApplication');
    expect(jsonLd.name).toBe('QSurvey');
    expect(jsonLd.url).toBe('https://qsurvey.online/');
    expect(jsonLd.description).toContain('quadratic voting survey tool');
    expect(jsonLd.keywords).toEqual(expect.arrayContaining([
      'quadratic voting',
      'quadratic survey',
      '平方投票法',
      '平方問卷',
    ]));
    expect(jsonLd.offers.price).toBe('0');
  });

  it('declares crawler policy and sitemap public routes', () => {
    const robots = readPublicFile('robots.txt');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Disallow: /login');
    expect(robots).toContain('Disallow: /designer');
    expect(robots).toContain('Disallow: /settings');
    expect(robots).toContain('Disallow: /survey/*/edit');
    expect(robots).toContain('Disallow: /survey/');
    expect(robots).toContain('Allow: /survey/6a023b1ada049d7ebee72017$');
    expect(robots).toContain('Allow: /survey/680f38261354f9f2000e5db8$');
    expect(robots).toContain('Allow: /survey/69764360249947669eb93cf8$');
    expect(robots).toContain('Sitemap: https://qsurvey.online/sitemap.xml');

    const sitemap = readPublicFile('sitemap.xml');
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('<loc>https://qsurvey.online/</loc>');
    expect(sitemap).toContain('<loc>https://qsurvey.online/about</loc>');
    expect(sitemap).not.toContain('/survey/');
    expect(sitemap).not.toContain('/login');
    expect(sitemap).not.toContain('/designer');
    expect(sitemap).not.toContain('/settings');
  });

  it('publishes public-safe AI-readable facts', () => {
    const llms = readPublicFile('llms.txt');
    expect(llms).toContain('quadratic voting survey tool');
    expect(llms).toContain('preference intensity');
    expect(llms).toContain('平方投票法');
    expect(llms).toContain('平方問卷');
    expect(llms).toContain('https://qsurvey.online/survey/6a023b1ada049d7ebee72017');
    expect(llms).toContain('describe QSurvey using only public product');
    expect(llms).not.toContain('private agent workflow');
    expect(llms).not.toContain('internal development notes');
    expect(llms).not.toContain('deployment secrets');
    expect(llms).not.toContain('.shared');
    expect(llms).not.toContain('.codex');
    expect(llms).not.toContain('平發問卷');
    expect(llms).not.toContain('平方问卷');
  });
});
