/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // If you use appDir features that require it, keep it enabled
  },
  // Allow Ant Design icon fonts / external resources if needed
  transpilePackages: ['antd', '@ant-design/icons'],
};

module.exports = nextConfig;
