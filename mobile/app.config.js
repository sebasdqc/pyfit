// Extends app.json and injects platform-specific secrets from env vars.
// iOS uses Apple Maps (no key needed). Android needs GOOGLE_MAPS_API_KEY.
// Set the key as an EAS secret:  eas secret:create --name GOOGLE_MAPS_API_KEY
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
      },
    },
  },
})
