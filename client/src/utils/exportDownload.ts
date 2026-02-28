import { fetchProtected } from '../lib/protectedFetch';

type DownloadExportOptions = {
  url: string;
  token?: string | null;
  fallbackFilename: string;
  onNewToken?: (token: string) => void;
  onAuthFailure?: (status: number) => void;
};

type DownloadExportResult =
  | { ok: true }
  | { ok: false; error: string };

export const getDownloadFilename = (
  contentDisposition: string | null,
  fallback: string,
) => {
  if (!contentDisposition) return fallback;
  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch (err) {
      return utfMatch[1];
    }
  }
  const match = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
  if (match?.[1]) {
    return match[1];
  }
  return fallback;
};

export const triggerDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const downloadExport = async (
  options: DownloadExportOptions,
): Promise<DownloadExportResult> => {
  const { url, token, fallbackFilename, onNewToken, onAuthFailure } = options;
  if (!token) {
    return { ok: false, error: 'You must be signed in to download exports.' };
  }

  try {
    const response = await fetchProtected(url, {}, {
      token,
      onTokenRefresh: onNewToken,
      onAuthFailure,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message = errorData?.message || 'Failed to download export.';
      return { ok: false, error: message };
    }

    const blob = await response.blob();
    const filename = getDownloadFilename(
      response.headers.get('Content-Disposition'),
      fallbackFilename,
    );
    triggerDownload(blob, filename);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: 'Failed to download export.' };
  }
};
