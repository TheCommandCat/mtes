import type { NextConfig } from 'next';
import { composePlugins, withNx } from '@nx/next';

const nextConfig: NextConfig = {
  nx: {
    svgr: false
  },

  compiler: {
    emotion: true
  }
};

const plugins = [withNx];

export default composePlugins(...plugins)(nextConfig);
