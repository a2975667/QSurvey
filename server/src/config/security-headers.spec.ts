import { NextFunction, Request, Response } from 'express';
import {
  IFRAME_FRAME_SRC_ORIGINS,
  buildContentSecurityPolicy,
  createSecurityHeadersMiddleware,
} from './security-headers';

describe('Security headers configuration', () => {
  describe('buildContentSecurityPolicy', () => {
    it('restricts frame-src to self plus the trusted embed origins', () => {
      const policy = buildContentSecurityPolicy();

      expect(policy).toContain("frame-src 'self'");
      IFRAME_FRAME_SRC_ORIGINS.forEach((origin) => {
        expect(policy).toContain(origin);
      });
    });

    it('blocks other sites from framing the app via frame-ancestors', () => {
      expect(buildContentSecurityPolicy()).toContain("frame-ancestors 'self'");
    });

    it('uses the supplied origins when provided', () => {
      const policy = buildContentSecurityPolicy(['https://example.com']);

      expect(policy).toContain("frame-src 'self' https://example.com");
      expect(policy).not.toContain('youtube');
    });
  });

  describe('createSecurityHeadersMiddleware', () => {
    it('sets the Content-Security-Policy header and calls next', () => {
      const setHeader = jest.fn();
      const next = jest.fn();
      const middleware = createSecurityHeadersMiddleware("frame-src 'self'");

      middleware(
        {} as Request,
        { setHeader } as unknown as Response,
        next as unknown as NextFunction,
      );

      expect(setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "frame-src 'self'",
      );
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
