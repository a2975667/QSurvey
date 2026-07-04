export type ProjectsSortMode = 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc' | 'default';

export const DEFAULT_PROJECT_CATEGORY = 'Uncategorized';

type ProjectLike = {
  _id: string;
  title?: string | null;
  description?: string | null;
  tags?: readonly string[] | null;
  isPinned?: boolean | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const CREATED_KEYS = ['createdAt', 'created_at', 'created', 'createdDate'] as const;
const UPDATED_KEYS = [
  'updatedAt',
  'updated_at',
  'lastUpdatedAt',
  'lastModifiedAt',
  'modifiedAt',
  'modified_at',
] as const;

function objectIdTimestampMs(id: string): number | undefined {
  if (!/^[a-fA-F0-9]{24}$/.test(id)) return undefined;
  const seconds = Number.parseInt(id.slice(0, 8), 16);
  if (!Number.isFinite(seconds)) return undefined;
  return seconds * 1000;
}

function parseDateLikeMs(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined;
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : undefined;
  }
  if (value && typeof (value as any).toString === 'function') {
    const asString = (value as any).toString();
    if (typeof asString === 'string') {
      const ms = Date.parse(asString);
      return Number.isFinite(ms) ? ms : undefined;
    }
  }
  return undefined;
}

function getFirstDateMs(project: ProjectLike, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const ms = parseDateLikeMs((project as any)[key]);
    if (ms != null) return ms;
  }
  return undefined;
}

function getCreatedMs(project: ProjectLike): number {
  const ms = getFirstDateMs(project, CREATED_KEYS as unknown as string[]);
  if (ms != null) return ms;
  return objectIdTimestampMs(project._id) ?? 0;
}

function getUpdatedMs(project: ProjectLike): number {
  const ms = getFirstDateMs(project, UPDATED_KEYS as unknown as string[]);
  if (ms != null) return ms;
  return getCreatedMs(project);
}

function normalizeForSearch(value: unknown): string {
  if (value == null) return '';
  return String(value).toLowerCase();
}

function includesAllTokens(haystack: string, query: string): boolean {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((token) => haystack.includes(token));
}

function getProjectTags(project: ProjectLike): string[] {
  const tags = Array.isArray(project.tags)
    ? project.tags.map((tag) => tag.trim()).filter(Boolean)
    : [];
  return tags.length > 0 ? tags : [DEFAULT_PROJECT_CATEGORY];
}

export function filterAndSortProjects<T extends ProjectLike>(
  projects: readonly T[],
  opts: { query: string; sortMode: ProjectsSortMode; category?: string },
): T[] {
  const query = opts.query ?? '';
  const sortMode: ProjectsSortMode = opts.sortMode ?? 'default';
  const category = (opts.category ?? '').trim().toLowerCase();

  const filtered = projects.filter((p) => {
    const tags = getProjectTags(p);
    if (category && !tags.some((tag) => tag.toLowerCase() === category)) {
      return false;
    }
    const haystack = `${normalizeForSearch(p.title)} ${normalizeForSearch(p.description)} ${normalizeForSearch(tags.join(' '))}`.trim();
    return includesAllTokens(haystack, query);
  });

  const withKeys = filtered.map((project, index) => {
    const sortKey =
      sortMode === 'created_desc' || sortMode === 'created_asc' ? getCreatedMs(project) : getUpdatedMs(project);
    return { project, index, sortKey, pinnedRank: project.isPinned ? 0 : 1 };
  });

  const direction = sortMode.endsWith('_asc') ? 1 : -1;
  withKeys.sort((a, b) => {
    if (a.pinnedRank !== b.pinnedRank) return a.pinnedRank - b.pinnedRank;
    if (sortMode === 'default') return a.index - b.index;
    const diff = a.sortKey - b.sortKey;
    if (diff !== 0) return diff * direction;
    return a.index - b.index;
  });

  return withKeys.map((entry) => entry.project);
}

