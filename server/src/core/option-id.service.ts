import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

const MAX_OPTION_ID_LENGTH = 48;
const HASH_LENGTH = 6;
const FALLBACK_PREFIX = 'opt';

type OptionWithId = {
  optionId?: string;
  optionName?: string;
};

@Injectable()
export class OptionIdService {
  generateOptionIds<T extends OptionWithId>(options: T[]): T[] {
    if (!Array.isArray(options)) return options;

    const usedIds = new Set<string>();
    options.forEach((option) => {
      const existing = this.normalizeExistingId(option?.optionId);
      if (existing) usedIds.add(existing);
    });

    options.forEach((option) => {
      const existing = this.normalizeExistingId(option?.optionId);
      if (existing) {
        return;
      }

      const optionName = typeof option?.optionName === 'string' ? option.optionName : '';
      const normalized = this.normalizeLabel(optionName);
      const base = normalized
        ? this.enforceLength(normalized, optionName)
        : this.fallbackId(optionName);
      const unique = this.ensureUnique(base, usedIds);

      option.optionId = unique;
      usedIds.add(unique);
    });

    return options;
  }

  private normalizeExistingId(value?: string): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeLabel(value: string): string {
    const stripped = this.stripHtml(value).trim();
    if (!stripped) return '';

    const normalized = stripped.normalize('NFKD').replace(/\p{M}+/gu, '');
    let slug = normalized
      .replace(/\s+/g, '_')
      .replace(/[^\p{L}\p{N}_-]+/gu, '')
      .replace(/_+/g, '_')
      .replace(/-+/g, '-')
      .replace(/^[_-]+|[_-]+$/g, '')
      .toLowerCase();

    return slug;
  }

  private enforceLength(slug: string, source: string): string {
    if (slug.length <= MAX_OPTION_ID_LENGTH) return slug;

    const hash = this.shortHash(source || slug);
    const suffix = `-${hash}`;
    const baseMax = Math.max(1, MAX_OPTION_ID_LENGTH - suffix.length);
    const truncated = slug.slice(0, baseMax).replace(/[_-]+$/g, '');
    if (!truncated) {
      return `${FALLBACK_PREFIX}${suffix}`;
    }
    return `${truncated}${suffix}`;
  }

  private fallbackId(source: string): string {
    const hash = this.shortHash(source);
    const candidate = `${FALLBACK_PREFIX}-${hash}`;
    if (candidate.length <= MAX_OPTION_ID_LENGTH) return candidate;
    return candidate.slice(0, MAX_OPTION_ID_LENGTH);
  }

  private ensureUnique(base: string, usedIds: Set<string>): string {
    if (!usedIds.has(base)) return base;

    let counter = 2;
    while (true) {
      const suffix = `-${counter}`;
      const baseMax = Math.max(1, MAX_OPTION_ID_LENGTH - suffix.length);
      let trimmed = base.slice(0, baseMax).replace(/[_-]+$/g, '');
      if (!trimmed) trimmed = FALLBACK_PREFIX;
      const candidate = `${trimmed}${suffix}`;
      if (!usedIds.has(candidate)) return candidate;
      counter += 1;
    }
  }

  private shortHash(value: string): string {
    const input = value || FALLBACK_PREFIX;
    return createHash('sha256').update(input).digest('hex').slice(0, HASH_LENGTH);
  }

  private stripHtml(html: string): string {
    if (!html) return '';

    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .trim();
  }
}
