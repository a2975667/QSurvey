import { filterAndSortProjects } from '../projectsSearchSort';

describe('filterAndSortProjects', () => {
  const projects = [
    {
      _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      title: 'Alpha Project',
      description: 'Cool stuff',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-03T00:00:00.000Z',
    },
    {
      _id: 'bbbbbbbbbbbbbbbbbbbbbbbb',
      title: 'Bravo',
      description: 'Something else',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T12:00:00.000Z',
    },
    {
      _id: '000000000000000000000000',
      title: 'Charlie',
      description: 'Alpha adjacent',
    },
  ] as const;

  it('filters case-insensitively by title + description', () => {
    expect(filterAndSortProjects(projects, { query: 'alpha', sortMode: 'default' })).toHaveLength(2);
    expect(filterAndSortProjects(projects, { query: 'cool', sortMode: 'default' })).toHaveLength(1);
    expect(filterAndSortProjects(projects, { query: 'alpha cool', sortMode: 'default' })).toHaveLength(1);
  });

  it('sorts by created time (new first), falling back to ObjectId time', () => {
    const result = filterAndSortProjects(projects, { query: '', sortMode: 'created_desc' });
    expect(result.map((p) => p.title)).toEqual(['Bravo', 'Alpha Project', 'Charlie']);
  });

  it('sorts by updated time (new first), falling back to created time', () => {
    const result = filterAndSortProjects(projects, { query: '', sortMode: 'updated_desc' });
    expect(result.map((p) => p.title)).toEqual(['Alpha Project', 'Bravo', 'Charlie']);
  });

  it('keeps pinned projects first while preserving the selected sort within each group', () => {
    const result = filterAndSortProjects(
      [
        { ...projects[0], isPinned: false },
        { ...projects[1], isPinned: true },
        { ...projects[2], isPinned: false },
      ],
      { query: '', sortMode: 'updated_desc' },
    );

    expect(result.map((p) => p.title)).toEqual(['Bravo', 'Alpha Project', 'Charlie']);
  });
});

