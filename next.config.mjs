/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mongoose', 'bcryptjs', 'nodemailer'],
  experimental: {
    serverActions: {
      bodySizeLimit: '256kb',
    },
  },
};

export default nextConfig;
