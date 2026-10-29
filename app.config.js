const baseConfig = require('./app.json').expo;

module.exports = ({ config }) => {
  const expoConfig = { ...baseConfig, ...config };
  if (process.env.EAS_BUILD_PROFILE !== 'preview') return expoConfig;

  return {
    ...expoConfig,
    android: {
      ...expoConfig.android,
      usesCleartextTraffic: true,
    },
    ios: {
      ...expoConfig.ios,
      infoPlist: {
        ...expoConfig.ios?.infoPlist,
        NSAppTransportSecurity: {
          ...expoConfig.ios?.infoPlist?.NSAppTransportSecurity,
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true,
        },
      },
    },
  };
};
