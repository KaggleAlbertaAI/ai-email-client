/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 构建时跳过 ESLint，Vercel 有单独的 lint 检查
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
