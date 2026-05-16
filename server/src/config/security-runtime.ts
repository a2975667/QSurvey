type Middleware = (req: any, res: any, next: () => void) => void;
type ExpressLike = {
  use: (middleware: Middleware) => void;
};

type HeaderResponse = {
  setHeader: (name: string, value: string) => void;
};

export function applySecurityHeaders(_req: any, res: HeaderResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
}

export function registerSecurityHeaders(expressApp: ExpressLike): void {
  expressApp.use((req, res, next) => {
    applySecurityHeaders(req, res);
    next();
  });
}
