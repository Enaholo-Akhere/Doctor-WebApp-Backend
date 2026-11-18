/**
 * ICE servers handed to browsers for WebRTC calls.
 *
 * STUN alone works when both peers can reach each other directly (same
 * network, permissive NATs). Calls across mobile networks / corporate
 * firewalls need a TURN relay; configure one via env:
 *   TURN_URLS=turn:turn.example.com:3478,turns:turn.example.com:5349
 *   TURN_USERNAME=...
 *   TURN_CREDENTIAL=...
 * Served from the API (not baked into the frontend) so credentials can be
 * rotated without a frontend deploy.
 */
export interface IceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
}

const splitUrls = (value?: string) =>
    (value ?? '')
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);

export const getIceServers = (): IceServer[] => {
    const stunUrls = splitUrls(process.env.STUN_URLS);
    const servers: IceServer[] = [
        { urls: stunUrls.length ? stunUrls : ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
    ];

    const turnUrls = splitUrls(process.env.TURN_URLS);
    if (turnUrls.length) {
        servers.push({
            urls: turnUrls,
            username: process.env.TURN_USERNAME,
            credential: process.env.TURN_CREDENTIAL,
        });
    }
    return servers;
};
