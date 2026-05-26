/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'phyat-web.vercel.app', 'phyat-api.vercel.app'],
    },
  },
};

export default nextConfig;
