module.exports = ({ config }) => {
  return {
    ...config,
    web: {
      ...config.web,
      maps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      }
    }
  };
};
