/**
 * Call recording + transcription settings.
 *
 * Off unless TRANSCRIPTION_ENABLED=true. Keep it off for US patients until
 * a HIPAA Business Associate Agreement is signed with every vendor that
 * handles the audio or transcript (Groq for transcription/summary, and the
 * database host).
 */
export const isTranscriptionEnabled = () => process.env.TRANSCRIPTION_ENABLED === 'true';

export const TRANSCRIPTION_MODEL = () => process.env.TRANSCRIPTION_MODEL || 'whisper-large-v3';

/** Per audio track. Clients record mono Opus at ~24 kbps (~11 MB per hour). */
export const MAX_RECORDING_BYTES = 25 * 1024 * 1024;

/**
 * Shown to the patient before every recording, and to the doctor when they
 * start one. Bump the version whenever the wording changes: each record
 * stores the version both parties agreed to.
 */
export const RECORDING_NOTICE = {
    version: '2026-11-23',
    text:
        'Your doctor would like to record this call to keep an accurate record of your consultation. ' +
        'The audio is turned into a written transcript and then deleted. An AI-drafted summary of the ' +
        'transcript is reviewed and approved by your doctor before it is added to your health history. ' +
        'The audio and transcript are processed by our transcription provider (Groq). Only you and this ' +
        'doctor can see the record, you can stop the recording at any time during the call, and you can ' +
        'delete the record later from your dashboard. Declining does not affect your consultation.',
} as const;
