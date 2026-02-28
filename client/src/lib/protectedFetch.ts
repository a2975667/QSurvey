type AuthFailureCallback = (status: number) => void;

type ProtectedFetchOptions = {
  token?: string | null;
  onTokenRefresh?: (token: string) => void;
  onAuthFailure?: AuthFailureCallback;
  authFailureStatuses?: number[];
};

export async function fetchProtected(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ProtectedFetchOptions,
): Promise<Response> {
  const {
    token,
    onTokenRefresh,
    onAuthFailure,
    authFailureStatuses = [401, 403],
  } = options;

  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });

  const refreshedToken = response.headers.get('X-New-Access-Token');
  if (refreshedToken && onTokenRefresh) {
    onTokenRefresh(refreshedToken);
  }

  if (authFailureStatuses.includes(response.status) && onAuthFailure) {
    onAuthFailure(response.status);
  }

  return response;
}

