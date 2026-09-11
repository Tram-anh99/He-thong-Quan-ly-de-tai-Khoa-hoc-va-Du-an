/** @type {import('next').NextConfig} */
const nextConfig = {
     async rewrites() {
          const backend = process.env.PYTHON_API_URL;
          return backend ? { beforeFiles: [{ source: "/api/:path*", destination: `${backend}/api/:path*` }] } : [];
     },
     experimental: {
          // If you use appDir features that require it, keep it enabled
     },
     // Allow Ant Design icon fonts / external resources if needed
     transpilePackages: ["antd", "@ant-design/icons"],
};

module.exports = nextConfig;
