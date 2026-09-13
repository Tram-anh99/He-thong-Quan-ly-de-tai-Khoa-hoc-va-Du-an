/** @type {import("next").NextConfig} */
const nextConfig = {
     async rewrites() {
          const backend = process.env.PYTHON_API_URL;
          if (!backend) return [];
          // Authentication stays on the Next.js boundary so its httpOnly
          // session cookie is written for the browser origin.  The Python
          // service validates that same signed session for business APIs.
          return {
               beforeFiles: [
                    { source: "/api/dashboard", destination: `${backend}/api/dashboard` },
                    { source: "/api/projects/:path*", destination: `${backend}/api/projects/:path*` },
                    { source: "/api/people/:path*", destination: `${backend}/api/people/:path*` },
               ],
          };
     },
     transpilePackages: ["antd", "@ant-design/icons"],
};

module.exports = nextConfig;
