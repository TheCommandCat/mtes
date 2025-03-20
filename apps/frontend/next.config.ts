import { composePlugins, withNx } from '@nx/next';
import type { WithNxOptions } from '@nx/next/plugins/with-nx';

const nextConfig: WithNxOptions = {
  nx: {
    svgr: false
  },
  compiler: {
    emotion: true
  }
};

const plugins = [withNx];

export default composePlugins(...plugins)(nextConfig);
