import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { UserSchemaInterface } from 'types'

//get the RSA keys using File System fs
const privateKey = fs.readFileSync(path.join(__dirname, '../keys/private.key'), 'utf8'); // returns Buffer
const publicKey = fs.readFileSync(path.join(__dirname, '../keys/public.key'), 'utf8'); // returns Buffer

export const generateAccessToken = (user: Partial<UserSchemaInterface>): string => {
    // Only include serializable user properties in the payload
    const jwtSign = jwt.sign(user, privateKey, {
        algorithm: 'RS256',
        issuer: 'doctor-app',
        audience: String(user.id),
        ...{
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY

        } as jwt.SignOptions
    });
    return jwtSign;
}


export const generateRefreshToken = (user: Partial<UserSchemaInterface>,): string => {
    return jwt.sign(user, privateKey, {
        algorithm: 'RS256',
        issuer: 'doctor-app',
        audience: String(user.id),
        ...{
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        } as jwt.SignOptions
    });
}
