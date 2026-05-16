import {
  applySecurityHeaders,
  registerSecurityHeaders,
} from './security-runtime';

function createMockResponse() {
  const headers = new Map<string, string>();

  return {
    headers,
    setHeader(name: string, value: string) {
      headers.set(name, value);
    },
  };
}

describe('security runtime helpers', () => {
  it('applies baseline security headers without a CSP in this pass', () => {
    const response = createMockResponse();

    applySecurityHeaders({}, response);

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(response.headers.get('Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin',
    );
    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe(
      'same-origin',
    );
    expect(response.headers.has('Content-Security-Policy')).toBe(false);
  });

  it('registers security header middleware', () => {
    const middleware: Array<(req: any, res: any, next: () => void) => void> = [];
    const app = {
      use(handler: (req: any, res: any, next: () => void) => void) {
        middleware.push(handler);
      },
    };
    const response = createMockResponse();
    const next = jest.fn();

    registerSecurityHeaders(app);
    middleware[0]({}, response, next);

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
