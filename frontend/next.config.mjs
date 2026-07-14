/** @type {import('next').NextConfig} */
const config = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [{source: "/presentation", destination: "/overview", permanent: false}];
  },
};

export default config;
