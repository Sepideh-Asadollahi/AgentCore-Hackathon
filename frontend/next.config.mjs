/** @type {import('next').NextConfig} */
const apiProxyTarget = process.env.CHANGE_SOCIETY_PROXY_TARGET ?? "http://127.0.0.1:32500";

const config = {
  output: "standalone",
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/change-society-api/:path*",
        destination: `${apiProxyTarget.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
  async redirects() {
    return [{source: "/presentation", destination: "/overview", permanent: false}];
  },
};

export default config;
