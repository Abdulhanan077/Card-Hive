import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        let rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}';
        
        // Rapid fixes for common Vercel & Local .env parsing discrepancies
        if (rawEnv.startsWith("'") && rawEnv.endsWith("'")) {
            rawEnv = rawEnv.slice(1, -1);
        }
        if (rawEnv.startsWith('"') && rawEnv.endsWith('"')) {
            rawEnv = rawEnv.slice(1, -1);
        }

        let serviceAccount: any;
        try {
            // NEW: Extremely robust Base64 decoding fallback for Vercel!
            // If the raw text does not start with a JSON curly brace, we assume it's base64 encoded.
            if (!rawEnv.trim().startsWith('{')) {
                const decodedBytes = Buffer.from(rawEnv, 'base64').toString('utf-8');
                serviceAccount = JSON.parse(decodedBytes);
            } else {
                serviceAccount = JSON.parse(rawEnv);
            }
        } catch (parseError) {
            // Fallback for Vercel formatting anomalies (Bad Escaped Characters)
            // Replaces real newlines or incorrectly escaped slashes
            const cleanedEnv = rawEnv.replace(/\\n/g, '\\n').replace(/\n/g, '\\n');
            serviceAccount = JSON.parse(cleanedEnv);
        }

        if (Object.keys(serviceAccount).length > 0) {
            // Firebase private key requires real backslash+n
            if (serviceAccount.private_key) {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }
            
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
