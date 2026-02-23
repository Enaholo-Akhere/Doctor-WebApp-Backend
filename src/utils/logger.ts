import { transports, format, createLogger } from 'winston';

export const log = (message: string,) => {
    const newError = new globalThis.Error(`${message}`);
    console.log({ LOG: newError.message });
}

export const winston_logger = createLogger({
    transports: [
        new transports.Console({
            level: "info",
            format: format.combine(format.timestamp(), format.colorize({ all: true }), format.json()),

        }),
        new transports.File({
            filename: 'info-logger.log',
            level: 'info',
            format: format.combine(format.timestamp(), format.colorize({ all: true }), format.json()),


        })
    ]
})

export const winston_exceptions = createLogger({
    transports: [
        new transports.File({
            level: 'info',
            format: format.combine(format.timestamp(), format.colorize({ all: true }), format.json()),
            filename: 'uncaught-exception.log',

        })
    ]
})