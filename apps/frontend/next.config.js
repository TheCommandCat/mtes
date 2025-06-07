// next.config.js

//@ts-check

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { composePlugins, withNx } = require("@nx/next");

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {
    svgr: false,
  },

  compiler: {
    emotion: true,
  },
  transpilePackages: ["@mui/material", "@mui/lab", "@mui/icons-material", "@mui/x-date-pickers"],
};

const plugins = [withNx];

module.exports = composePlugins(...plugins)(nextConfig);