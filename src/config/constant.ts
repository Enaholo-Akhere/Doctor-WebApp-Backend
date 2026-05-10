interface AUDIENCE {
    PATIENT: string | undefined;
    DOCTOR: string | undefined;
}

const PAT_AUD: string | undefined = process.env.PATIENT_AUD;
const DOC_AUD: string | undefined = process.env.DOCTOR_AUD;

export const AUDIENCE: AUDIENCE = {
    PATIENT: PAT_AUD,
    DOCTOR: DOC_AUD,
}

export const ISSUER = " care-connect-auth-api"