/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@adobe/pdfservices-node-sdk"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        "utf-8-validate": "commonjs utf-8-validate",
        bufferutil: "commonjs bufferutil",
      });
    }
    return config;
  },
};

module.exports = nextConfig;
