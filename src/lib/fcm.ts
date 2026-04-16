import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
        if (Object.keys(serviceAccount).length > 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("Firebase Admin Initialized successfully");
        } else {
            console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is missing or empty. FCM notifications will be skipped.");
        }
    } catch (e) {
        console.error("Firebase Admin Init Error:", e);
    }
}

export const sendFcmNotification = async (token: string, title: string, body: string, data?: any) => {
    if (!admin.apps.length) return;

    try {
        const message = {
            notification: {
                title,
                body,
            },
            data: data || {},
            token: token,
            android: {
                priority: 'high' as const,
                notification: {
                    sound: 'default',
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };

        const response = await admin.messaging().send(message);
        console.log('FCM Notification sent successfully:', response);
        return response;
    } catch (error) {
        console.error('Error sending FCM notification:', error);
    }
};

export const sendFcmToUser = async (userId: number, title: string, body: string, data?: any) => {
    // This requires a prisma import, we handle it in the caller or inject it.
    // For now, let's keep it simple and let the caller provide the token.
    console.log(`Queueing FCM for user ${userId}: ${title}`);
};
