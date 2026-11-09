import type { NextConfig } from "next";

const isStaticExportEnabled =
  process.env.NEXT_PUBLIC_ENABLE_STATIC_EXPORT === 'true';
const combinedPreview = process.env.NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW === '1';
const combinedSite = combinedPreview || process.env.NEXT_PUBLIC_ALPHA_COMBINED_SITE === '1';
let recruitmentOrigin = 'http://127.0.0.1:4301';

if (combinedSite && !combinedPreview) {
  const configuredOrigin = process.env.ALPHA_RECRUITMENT_ORIGIN;
  if (!configuredOrigin) throw new Error('Set ALPHA_RECRUITMENT_ORIGIN before enabling the combined production site.');
  let upstream: URL;
  try { upstream = new URL(configuredOrigin); }
  catch { throw new Error('ALPHA_RECRUITMENT_ORIGIN must be a valid HTTPS origin.'); }
  if (upstream.protocol !== 'https:' || upstream.username || upstream.password || upstream.pathname !== '/' || upstream.search || upstream.hash) {
    throw new Error('ALPHA_RECRUITMENT_ORIGIN must be an HTTPS origin without credentials, a path, query or fragment.');
  }
  if (['localhost', '127.0.0.1', '[::1]', 'awsc-alpha.cloud', 'www.awsc-alpha.cloud', 'aws-sbg-alpha.vercel.app'].includes(upstream.hostname)) {
    throw new Error('Use the recruitment deployment origin, not localhost or the Alpha main-site origin.');
  }
  if (isStaticExportEnabled) throw new Error('The combined production site requires NEXT_PUBLIC_ENABLE_STATIC_EXPORT=false.');
  recruitmentOrigin = upstream.origin;
}

const nextConfig: NextConfig = {
  output: isStaticExportEnabled ? 'export' : undefined,
  trailingSlash: true,
  distDir: combinedPreview ? 'build/combined' : isStaticExportEnabled ? 'dist' : '.next',
  ...(combinedSite && {
    skipTrailingSlashRedirect: true,
    ...(!combinedPreview && {
      async redirects() {
        return [{
          source: '/recruitment/:path*',
          has: [{ type: 'host' as const, value: '(www\\.)?awsc-alpha\\.cloud' }],
          destination: 'https://aws-sbg-alpha.vercel.app/recruitment/:path*',
          permanent: false,
        }];
      },
    }),
    async rewrites() {
      const recruitment = `${recruitmentOrigin}/recruitment`;
      return {
        beforeFiles: [
          { source: '/recruitment/:path*', destination: `${recruitment}/:path*` },
          // The existing font CSS uses root-relative public URLs.
          { source: '/brand/:font(geist-latin.woff2|urban-starblues.ttf)', destination: `${recruitment}/brand/:font` },
        ],
      };
    },
  }),
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hebbkx1anhila5yf.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'secure.meetupstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'secure-content.meetupstatic.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
