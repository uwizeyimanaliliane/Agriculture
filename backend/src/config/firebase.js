const getMessaging = () => ({
  send: async (message) => {
    console.log('Firebase notification (simulated):', message.notification?.title);
    return { success: true };
  },
});

module.exports = { getMessaging };
