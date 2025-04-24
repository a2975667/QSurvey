import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT Authentication Guard with auto-refresh capability
 * 
 * This guard:
 * 1. Validates JWT tokens from request Authorization headers
 * 2. Automatically refreshes tokens that are close to expiration
 * 3. Adds refreshed tokens to response headers
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly refreshThreshold: number;
  private readonly securityHeaders: Record<string, string>;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    super();
    // Allow configuration of refresh threshold (default: 30%)
    this.refreshThreshold = configService.get<number>('JWT_REFRESH_THRESHOLD', 0.3);
    
    // Security headers to add to all responses
    this.securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    };
  }

  /**
   * Handles the JWT authentication request
   * - Validates the user from the JWT payload
   * - Refreshes tokens that are close to expiration
   * - Adds the user to the request object
   */
  handleRequest(err, user, info, context: ExecutionContext) {
    // Handle authentication errors
    if (err || !user) {
      this.logger.warn(`JWT authentication failed: ${err?.message || 'No user found'}`);
      throw err || new UnauthorizedException('Authentication required');
    }
    
    // Get request and response objects
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Add user to request
    request.user = user;
    
    // Add security headers
    Object.entries(this.securityHeaders).forEach(([header, value]) => {
      response.setHeader(header, value);
    });
    
    // Auto-refresh token if it's about to expire
    this.checkAndRefreshToken(request, response);
    
    return user;
  }
  
  /**
   * Checks if the token is close to expiration and issues a new one if needed
   * @param request - HTTP request object with authorization header
   * @param response - HTTP response object to add the new token header
   */
  private checkAndRefreshToken(request, response) {
    try {
      // Extract the token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return;
      }
      
      const token = authHeader.split(' ')[1];
      
      // Decode the token to get payload (without verifying, as it's already verified)
      const decoded = this.jwtService.decode(token);
      if (!decoded || typeof decoded !== 'object') {
        return;
      }
      
      // Check if token is about to expire
      const currentTime = Math.floor(Date.now() / 1000);
      const expiryTime = decoded.exp;
      const issueTime = decoded.iat;
      const totalLifetime = expiryTime - issueTime;
      const remainingTime = expiryTime - currentTime;
      
      // If token is valid but close to expiration, issue a new token
      if (remainingTime > 0 && remainingTime < this.refreshThreshold * totalLifetime) {
        // Create new payload (excluding jwt metadata fields)
        const { exp, iat, nbf, jti, ...payload } = decoded;
        
        // Create new token with same data but fresh expiry
        const newToken = this.jwtService.sign(payload);
        
        // Add the new token to the response headers
        response.setHeader('X-New-Access-Token', newToken);
        
        // Set cache control to prevent caching of responses with new tokens
        response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.setHeader('Pragma', 'no-cache');
        
        this.logger.debug(`Token refreshed for user: ${payload.user_email}`);
      }
    } catch (error) {
      // Log errors but don't fail the request - the main authentication still worked
      this.logger.error(`Error refreshing token: ${error.message}`, error.stack);
    }
  }
}
