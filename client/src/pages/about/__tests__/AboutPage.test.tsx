import content from '../content.json';

describe('AboutPage content', () => {
  it('has correct content structure', () => {
    expect(content.title).toBe('About QSurvey System');
    expect(content.description.paragraphs).toHaveLength(2);
    expect(content.findings.papers).toHaveLength(4);
    expect(content.team.lead).toBe('Ti-Chung Cheng');
  });

  it('has all required paper fields', () => {
    content.findings.papers.forEach((paper) => {
      expect(paper).toHaveProperty('title');
      expect(paper).toHaveProperty('year');
      expect(paper).toHaveProperty('authors');
      expect(paper).toHaveProperty('venue');
      expect(paper).toHaveProperty('url');
    });
  });

  it('includes CHI, CSCW, and CI papers', () => {
    const venues = content.findings.papers.map(p => p.venue);
    expect(venues.some(v => v.includes('CHI'))).toBe(true);
    expect(venues.some(v => v.includes('CSCW'))).toBe(true);
    expect(venues.some(v => v.includes('CI'))).toBe(true);
  });

  it('has poster marked correctly', () => {
    const poster = content.findings.papers.find(p => p.type === 'poster');
    expect(poster).toBeDefined();
    expect(poster?.venue).toContain('Poster');
  });
});
