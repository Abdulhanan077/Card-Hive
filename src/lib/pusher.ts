import PusherServer from "pusher";
import PusherClient from "pusher-js";

export const pusherServer = new PusherServer({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
});

/**
 * The client-side instance of Pusher. Safe initialization to prevent blank-screen
 * crashes if the Vercel environment variables are temporarily missing.
 */
export const pusherClient = process.env.NEXT_PUBLIC_PUSHER_KEY 
    ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
      })
    : {
          subscribe: () => ({ bind: () => {}, unbind: () => {} }),
          unsubscribe: () => {},
          bind: () => {},
          unbind: () => {},
      } as any;
