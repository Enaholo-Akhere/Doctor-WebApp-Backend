/**
 * In-memory online registry: userId -> number of connected sockets.
 *
 * Single-process only. If the API is ever scaled to multiple instances, move
 * this (and the call registry) to Redis and add @socket.io/redis-adapter.
 */
const connections = new Map<string, number>();

export const presence = {
    /** Returns true when the user just came online (first socket). */
    connect(userId: string): boolean {
        const count = (connections.get(userId) ?? 0) + 1;
        connections.set(userId, count);
        return count === 1;
    },

    /** Returns true when the user just went offline (last socket closed). */
    disconnect(userId: string): boolean {
        const count = (connections.get(userId) ?? 1) - 1;
        if (count <= 0) {
            connections.delete(userId);
            return true;
        }
        connections.set(userId, count);
        return false;
    },

    isOnline(userId: string): boolean {
        return connections.has(userId);
    },
};
