import os from 'os'

export const localIPUtils = (): string | undefined => {
    const nets = os.networkInterfaces();
    let localIP;
    let iface: os.NetworkInterfaceInfo[] | undefined
    for (iface of Object.values(nets)) {
        if (!iface) continue;
        for (const net of iface) {
            if (net.family === 'IPv4' && !net.internal) {
                localIP = net.address;
                break;
            }
        }
    }
    return localIP
};