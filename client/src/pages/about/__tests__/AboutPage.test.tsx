import content from '../content.json';

describe('AboutPage content', () => {
  it('has correct content structure', () => {
    expect(content.title).toBe('About QSurvey');
    expect(content.subtitle).toContain('quadratic voting');
    expect(content.description.paragraphs).toHaveLength(2);
    expect(content.explainers).toHaveLength(4);
    expect(content.findings.highlights).toHaveLength(4);
    expect(content.findings.papers).toHaveLength(4);
    expect(content.researchUsingQs.title).toBe('Research Using QS');
    expect(content.researchUsingQs.papers).toHaveLength(1);
    expect(content.team.lead).toBe('Ti-Chung Cheng');
  });

  it('uses SEO and AEO public positioning copy', () => {
    const text = JSON.stringify(content);
    expect(text).toContain('what people prefer and how strongly they prefer it');
    expect(text).toContain('quadratic voting survey tool');
    expect(text).toContain('preference-intensity');
    expect(text).toContain('70% predicted pairwise alignment');
    expect(text).toContain('59% for Likert');
    expect(text).toContain('organize-then-vote');
    expect(text).toContain('平方投票法');
    expect(text).toContain('平方問卷');
    expect(text).not.toContain('平方问卷');
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
    expect(content.team.members).toHaveLength(3);
    expect(content.team.members.map(member => member.name)).toContain('Pranay Midha');
    content.team.members.forEach((member) => {
      expect(member).toHaveProperty('name');
      if (member.website) {
        expect(member.website).toMatch(/^https?:\/\//);
      }
    });
  });

  it('lists advisors and committee members', () => {
    expect(content.team.advisorsTitle).toBe('Advisors / Committee Members');
    expect(content.team.advisors.map(advisor => advisor.name)).toEqual([
      'Karrie Karahalios',
      'Hari Sundaram',
      'Ranjitha Kumar',
      'Glen Weyl',
    ]);
  });
});
