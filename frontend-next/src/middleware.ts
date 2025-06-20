import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['es', 'en'],
  defaultLocale: 'es'
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};