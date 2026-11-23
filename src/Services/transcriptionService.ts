import Groq, { toFile } from 'groq-sdk';
import { getLlmProvider } from 'ai-chat/llm';
import { TRANSCRIPTION_MODEL } from 'config/recording';
import { ConsultationSummary, EMPTY_SUMMARY, TranscriptSegment, TranscriptSpeaker } from 'models/ConsultationSchema';

/**
 * Turns a recorded consultation into a speaker-labelled transcript and an
 * AI-drafted clinical summary.
 *
 * The doctor's browser records two tracks: their own microphone and the
 * patient's incoming audio. Transcribing each separately gives reliable
 * speaker labels; segments are then merged by start time.
 */

export interface AudioTrack {
    speaker: TranscriptSpeaker;
    buffer: Buffer;
    mimeType: string;
}

interface RawSegment {
    start: number;
    end: number;
    text: string;
    no_speech_prob?: number;
}

/** Whisper invents text for silence ("Thank you for watching"); drop likely non-speech. */
const NO_SPEECH_THRESHOLD = 0.6;

let groq: Groq | null = null;
const client = () => {
    if (groq) return groq;
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 2, timeout: 120_000 });
    return groq;
};

const extensionFor = (mimeType: string) =>
    mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a' : 'webm';

export const toSegments = (speaker: TranscriptSpeaker, raw: RawSegment[] = []): TranscriptSegment[] =>
    raw
        .filter((s) => (s.no_speech_prob ?? 0) < NO_SPEECH_THRESHOLD && s.text?.trim())
        .map((s) => ({
            speaker,
            startSec: Math.round(s.start * 10) / 10,
            endSec: Math.round(s.end * 10) / 10,
            text: s.text.trim(),
        }));

/** Interleaves both speakers' segments into one conversation, in time order. */
export const mergeTracks = (...tracks: TranscriptSegment[][]): TranscriptSegment[] =>
    tracks.flat().sort((a, b) => a.startSec - b.startSec || a.endSec - b.endSec);

const transcribeTrack = async (track: AudioTrack): Promise<TranscriptSegment[]> => {
    const file = await toFile(track.buffer, `${track.speaker}.${extensionFor(track.mimeType)}`, {
        type: track.mimeType,
    });
    const result = (await client().audio.transcriptions.create({
        file,
        model: TRANSCRIPTION_MODEL(),
        response_format: 'verbose_json',
        temperature: 0,
    })) as unknown as { segments?: RawSegment[] };
    return toSegments(track.speaker, result.segments);
};

export const transcribe = async (tracks: AudioTrack[]): Promise<TranscriptSegment[]> =>
    mergeTracks(...(await Promise.all(tracks.map(transcribeTrack))));

export const formatTranscript = (segments: TranscriptSegment[]) =>
    segments.map((s) => `${s.speaker === 'doctor' ? 'Doctor' : 'Patient'}: ${s.text}`).join('\n');

const SUMMARY_PROMPT = `You draft clinical notes from a doctor-patient telemedicine consultation transcript.
The doctor will review and edit your draft before it is saved, so be accurate and conservative:
- Only include what was actually said. Never invent symptoms, diagnoses, doses or advice.
- Do not add standard medical advice, safety-netting or caveats the doctor did not say
  (e.g. never add "or sooner if symptoms worsen" unless the doctor said it).
- Leave a field empty ("" or []) if the transcript doesn't cover it.
- Write in plain, concise clinical English.
Reply with a JSON object with exactly these keys:
{"chiefComplaint": string, "symptoms": string[], "assessment": string, "plan": string, "medications": string[], "followUp": string}
- chiefComplaint: the main reason for the consultation, one sentence
- symptoms: each symptom the patient reported, short phrases
- assessment: the doctor's stated impression or diagnosis
- plan: tests, referrals, lifestyle advice or treatment the doctor recommended
- medications: each medication mentioned as prescribed or to continue, with dose if stated
- followUp: when and why to follow up, if stated`;

const MAX_FIELD = 2000;
const MAX_ITEMS = 30;

const str = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, MAX_FIELD) : '');
const list = (v: unknown) =>
    Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, MAX_ITEMS) : [];

/** Parses the model's reply defensively: any missing or malformed field becomes empty. */
export const parseSummary = (content: string): ConsultationSummary => {
    let raw: Record<string, unknown>;
    try {
        const json = content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1);
        raw = JSON.parse(json);
    } catch {
        throw new Error('Summary was not valid JSON');
    }
    return {
        chiefComplaint: str(raw.chiefComplaint),
        symptoms: list(raw.symptoms),
        assessment: str(raw.assessment),
        plan: str(raw.plan),
        medications: list(raw.medications),
        followUp: str(raw.followUp),
    };
};

export const summarize = async (segments: TranscriptSegment[]): Promise<ConsultationSummary> => {
    if (!segments.length) return { ...EMPTY_SUMMARY };
    const res = await getLlmProvider().complete({
        messages: [
            { role: 'system', content: SUMMARY_PROMPT },
            { role: 'user', content: formatTranscript(segments) },
        ],
        json: true,
        temperature: 0.1,
        maxTokens: 2000,
    });
    return parseSummary(res.content);
};
