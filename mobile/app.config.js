const { config } = require('dotenv');
const appJson = require('./app.json');

config({ path: './.env' });

module.exports = {
  expo: {
    ...(appJson.expo || {}),
    ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
    plugins: [
      ...(appJson.expo?.plugins || []),
      'expo-sharing',
    ],
    extra: {
      ...(appJson.expo?.extra || {}),
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    },
  },
};
