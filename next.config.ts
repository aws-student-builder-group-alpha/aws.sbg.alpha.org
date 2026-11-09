import type { NextConfig } from "next";

const isStaticExportEnabled =
  process.env.NEXT_PUBLIC_ENABLE_STATIC_EXPORT === 'true';
const combinedPreview = process.env.NEXT_PUBLIC_ALPHA_COMBINED_PREVIEW === '1';

const nextConfig: NextConfig = {
  output: isStaticExportEnabled ? 'export' : undefined,
  trailingSlash: true,
  distDir: combinedPreview ? 'build/combined' : isStaticExportEnabled ? 'dist' : '.next',
  ...(combinedPreview && {
    skipTrailingSlashRedirect: true,
    async rewrites() {
      const recruitment = 'http://127.0.0.1:4301/recruitment';
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
