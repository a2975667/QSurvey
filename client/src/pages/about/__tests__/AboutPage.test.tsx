import content from '../content.json';

describe('AboutPage content', () => {
  it('has correct content structure', () => {
    expect(content.title).toBe('About QSurvey System');
    expect(content.description.paragraphs).toHaveLength(2);
    expect(content.findings.papers).toHaveLength(4);
    expect(content.researchUsingQs.title).toBe('Research Using QS');
    expect(content.researchUsingQs.papers).toHaveLength(1);
    expect(content.team.lead).toBe('Ti-Chung Cheng');
  });

  it('has all required paper fields', () => {
    content.findings.papers.forEach((paper) => {
      expect(paper).toHaveProperty('title');
      expect(paper).toHaveProperty('year');
      expect(paper).toHaveProperty('authors');
      expect(paper).toHaveProperty('venue');
      expect(paper).toHaveProperty('url');
      expect(paper).toHaveProperty('type');
    });
  });

  it('includes CHI, CSCW, and CI papers', () => {
    const venues = content.findings.papers.map(p => p.venue);
    expect(venues.some(v => v.includes('CHI'))).toBe(true);
    expect(venues.some(v => v.includes('CSCW'))).toBe(true);
    expect(venues.some(v => v.includes('CI'))).toBe(true);
  });

  it('has conference papers and poster marked correctly', () => {
    const conferences = content.findings.papers.filter(p => p.type === 'conference');
    expect(conferences).toHaveLength(3);

    const poster = content.findings.papers.find(p => p.type === 'poster');
    expect(poster).toBeDefined();
    expect(poster?.venue).toContain('Poster');
    expect(poster?.pdf).toBeTruthy();
  });

  it('has research-using-QS entries with link metadata', () => {
    expect(content.researchUsingQs.note).toContain('Let us know if you want to use QS');

    content.researchUsingQs.papers.forEach((paper) => {
      expect(paper).toHaveProperty('title');
      expect(paper).toHaveProperty('authors');
      expect(paper).toHaveProperty('venue');
      expect(paper).toHaveProperty('type');
      expect(paper).toHaveProperty('linkLabel', 'Full Paper');
      expect(paper).toHaveProperty('url');
      expect(paper.url).toMatch(/^https?:\/\//);
    });
  });

  it('has team members with websites', () => {
    expect(content.team.members).toHaveLength(2);
    content.team.members.forEach((member) => {
      expect(member).toHaveProperty('name');
      expect(member).toHaveProperty('website');
      expect(member.website).toMatch(/^https?:\/\//);
    });
  });
});
