import { NextFunction, Request, Response } from 'express';

// Origins that may be loaded as <iframe> embeds in the served SPA. These MUST
// stay in sync with the client-side IFRAME_ALLOWED_SOURCES hosts in
// client/src/components/common/MarkdownRenderer.tsx. The client sanitiser is the
// first line of defence; this header is the browser-enforced backstop that also
// catches load-time redirects a one-time src check cannot see.
export const IFRAME_FRAME_SRC_ORIGINS = [
  'https://www.youtube.com',
  'https://youtube.com',
  'https://www.youtube-nocookie.com',
  'https://youtube-nocookie.com',
  'https://player.vimeo.com',
  'https://drive.google.com',
];

export function buildContentSecurityPolicy(
  frameSrcOrigins: string[] = IFRAME_FRAME_SRC_ORIGINS,
): string {
  const directives = [
    // Only our own origin and the trusted embed hosts may be framed in.
    `frame-src 'self' ${frameSrcOrigins.join(' ')}`,
    // Only our own pages may frame this app, so other sites cannot embed it
    // for clickjacking.
    "frame-ancestors 'self'",
  ];

  return directives.join('; ');
}

export function createSecurityHeadersMiddleware(
  policy: string = buildContentSecurityPolicy(),
) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Content-Security-Policy', policy);
    next();
  };
}
