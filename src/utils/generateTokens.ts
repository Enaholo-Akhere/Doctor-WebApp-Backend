import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { UserSchemaInterface } from 'types'
import { log, winston_logger } from './logger';

interface GenerateTokenInterface {
    user: Partial<UserSchemaInterface>;
    options: jwt.SignOptions
}

//get the RSA keys using File System fs
const privateKey = fs.readFileSync(path.join(__dirname, '../keys/private.pem'), 'utf8'); // this will returns Buffer
const publicKey = fs.readFileSync(path.join(__dirname, '../keys/public.pem'), 'utf8'); // this will returns Buffer

export const generateAccessToken = ({ user, options }: GenerateTokenInterface) => {
    // Only include serializable user properties in the payload
    const aud = String(user.id)
    try {
        const token = jwt.sign(user, privateKey, {
            algorithm: 'RS256',
            issuer: 'doctor-app',
            audience: ['United State users', 'United Kingdom users', 'Nigeria users', 'UAE users'],
            ...(options && options),

        });
        return { token }
    }
    catch (error: any) {

        winston_logger.error(error.message, error.stack)
        return { error }
    }

};

export const verifyToken = (token: string) => {
    try {
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
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