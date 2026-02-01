import { getDownloadFilename, downloadExport } from '../exportDownload';

const mockBlobResponse = (overrides: Partial<Response> = {}) =>
  ({
    ok: true,
    blob: async () => new Blob(['test']),
    headers: {
      get: (header: string) => {
        if (header === 'Content-Disposition') {
          return 'attachment; filename="report.json"';
        }
        if (header === 'X-New-Access-Token') {
          return null;
        }
        return null;
      },
    },
    ...overrides,
  } as Response);

describe('exportDownload utilities', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn();
    const urlMock = global.URL as any;
    urlMock.createObjectURL = jest.fn(() => 'blob:download');
    urlMock.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  describe('getDownloadFilename', () => {
    it('returns fallback when header is missing', () => {
      expect(getDownloadFilename(null, 'fallback.json')).toBe('fallback.json');
    });

    it('parses filename from Content-Disposition', () => {
      expect(
        getDownloadFilename('attachment; filename="report.json"', 'fallback.json'),
      ).toBe('report.json');
    });

    it('parses utf-8 filename when present', () => {
      const header = "attachment; filename*=UTF-8''survey%20export.json";
      expect(getDownloadFilename(header, 'fallback.json')).toBe('survey export.json');
    });

    it('returns raw utf-8 filename if decoding fails', () => {
      const header = "attachment; filename*=UTF-8''%E0%A4%A";
      expect(getDownloadFilename(header, 'fallback.json')).toBe('%E0%A4%A');
    });
  });

  describe('downloadExport', () => {
    it('returns error when token is missing', async () => {
      const result = await downloadExport({
        url: '/export',
        token: null,
        fallbackFilename: 'fallback.json',
      });

      expect(result).toEqual({
        ok: false,
        error: 'You must be signed in to download exports.',
      });
    });

    it('refreshes token when response includes X-New-Access-Token', async () => {
      const onNewToken = jest.fn();
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockBlobResponse({
          headers: {
            get: (header: string) => {
              if (header === 'X-New-Access-Token') {
                return 'new-token';
              }
              if (header === 'Content-Disposition') {
                return 'attachment; filename="report.json"';
              }
              return null;
            },
          },
        }),
      );

      const result = await downloadExport({
        url: '/export',
        token: 'old-token',
        fallbackFilename: 'fallback.json',
        onNewToken,
      });

      expect(result).toEqual({ ok: true });
      expect(onNewToken).toHaveBeenCalledWith('new-token');
      expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    });

    it('returns error when response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Export failed' }),
        headers: { get: () => null },
      });

      const result = await downloadExport({
        url: '/export',
        token: 'token',
        fallbackFilename: 'fallback.json',
      });

      expect(result).toEqual({ ok: false, error: 'Export failed' });
    });

    it('returns fallback error when response json parsing fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error('parse');
        },
        headers: { get: () => null },
      });

      const result = await downloadExport({
        url: '/export',
        token: 'token',
        fallbackFilename: 'fallback.json',
      });

      expect(result).toEqual({
        ok: false,
        error: 'Failed to download export.',
      });
    });

    it('returns error on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));

      const result = await downloadExport({
        url: '/export',
        token: 'token',
        fallbackFilename: 'fallback.json',
      });

      expect(result).toEqual({
        ok: false,
        error: 'Failed to download export.',
      });
    });
  });
});
