# Authentication System

This module handles authentication via Google OAuth and JWT tokens with automatic token refreshing.

## Overview

The authentication system provides:
- Google OAuth-based authentication
- JWT token-based authorization
- Automatic token refresh for active users
- Role-based access control

## Token Refresh Mechanism

This implementation includes an automatic JWT token refresh mechanism that:
1. Refreshes tokens when they are close to expiration
2. Only refreshes for active users (users making API requests)
3. Allows session expiration for inactive users
4. Does not interrupt the user experience

> **Note**: This project uses npm for package management. Use `npm` for all commands.
>
> **Important**: This project requires Node.js v16.13.0. If you're using a newer version, use `nvm` or Docker to ensure compatibility.

### How It Works

1. When a user makes an authenticated request, the JWT token is validated
2. If the token is valid but close to expiration (by default, less than 30% of lifetime remaining), a new token is generated
3. The new token is included in the response headers as `X-New-Access-Token`
4. The client should extract this token and use it for subsequent requests

### Server Configuration

The token refresh threshold can be configured via environment variables:

```
JWT_REFRESH_THRESHOLD=0.3  # Refresh when less than 30% of lifetime remains
```

### Client Implementation

The client should implement logic to check for and handle the refreshed token. For example, in an Angular application:

```typescript
// Example HTTP interceptor for Angular client
@Injectable()
export class TokenRefreshInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          // Check if response contains new token
          const newToken = event.headers.get('X-New-Access-Token');
          if (newToken) {
            // Update the stored token
            this.authService.updateToken(newToken);
          }
        }
      })
    );
  }
}
```

### Best Practices

1. Use short-lived access tokens and long-lived refresh tokens.
2. Store tokens securely on the client (HttpOnly cookies or secure storage).
3. Rotate secrets regularly and use Secret Manager in production.

