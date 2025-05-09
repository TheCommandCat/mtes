import { composePlugins, withNx } from '@nx/webpack';
import { Configuration } from 'webpack';

// Nx plugins for webpack.
export default composePlugins(withNx(), (config: Configuration): Configuration => {
  // Update the webpack config as needed here.
  // e.g. `config.plugins.push(new MyPlugin())`
  return config;
});
