"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ISSUER = exports.AUDIENCE = void 0;
var PAT_AUD = process.env.PATIENT_AUD;
var DOC_AUD = process.env.DOCTOR_AUD;
exports.AUDIENCE = {
    PATIENT: PAT_AUD,
    DOCTOR: DOC_AUD,
};
exports.ISSUER = " care-connect-auth-api";
//# sourceMappingURL=constant.js.map