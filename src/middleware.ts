import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Handles locale detection (Accept-Language) + /en /fr routing.
export default createMiddleware(routing);

export const config = {
  // Skip API, Next internals, and anything with a file extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
