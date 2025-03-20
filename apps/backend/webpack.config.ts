import { composePlugins, withNx } from '@nx/webpack';
import type { Configuration } from 'webpack';

export default composePlugins(withNx(), (config: Configuration) => {
  // Update the webpack config as needed here.
  // e.g. `config.plugins?.push(new MyPlugin())`
  return config;
});
