import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { UserSchemaInterface } from 'types'
import { log, winston_logger } from './logger';
import { ISSUER } from 'config/constant';

interface GenerateTokenInterface {
    user: Partial<UserSchemaInterface>;
    options: jwt.SignOptions;
    audience?: string;
}

//get the RSA keys using File System fs
const privateKey = fs.readFileSync(path.join(__dirname, '../keys/private.pem'), 'utf8'); // this will returns Buffer
const publicKey = fs.readFileSync(path.join(__dirname, '../keys/public.pem'), 'utf8'); // this will returns Buffer

export const generateAccessToken = ({ user, options, audience }: GenerateTokenInterface) => {
    // Only include serializable user properties in the payload
    const aud = String(user.id)
    try {
        const token = jwt.sign({ sub: user.id, }, privateKey, {
            algorithm: 'RS256',
            audience,
            issuer: ISSUER,
            ...(options && options),

        });
        return { token }
    }
    catch (error: any) {

        winston_logger.error(error.message, error.stack)
        return { error }
    }

};

export const verifyToken = (token: string, audience: string | undefined) => {
    try {
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'], audience, issuer: ISSUER });
        return {
            decoded,
            message: 'token active',
            expired: false
        }
    }
    catch (error: any) {
        winston_logger.error(error.message, error.stack)
        return {
            decoded: {},
            message: error.message,
            expired: error.message === 'jwt expired'
        }
    }
}

export const refreshStore = new Map<number, string>()