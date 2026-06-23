export const getRoomId = (a: string, b: string) =>
    [a, b].sort().join('_');