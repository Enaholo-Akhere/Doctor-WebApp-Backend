/**
 * Deterministic emergency safety net. Runs before any LLM call so obvious,
 * acute emergencies get the fixed reply even if the classifier is slow, wrong
 * or unavailable. Patterns target first-person / happening-now phrasing;
 * general educational questions ("what causes chest pain?") are left to the
 * classifier, which can tell the difference.
 */

export type AiChatEmergencyKind = 'medical' | 'crisis';

const CRISIS_PATTERNS: RegExp[] = [
    /\b(kill|hang|shoot|drown)(ing)?\s+my\s*self\b/i,
    /\bend(ing)?\s+(my|it)\s+(own\s+)?(life|all)\b/i,
    /\b(i\s*('?m| am)\s+)?suicidal\b/i,
    /\b(commit|thinking\s+about|thoughts\s+of)\s+suicide\b/i,
    /\bi\s+(want|wanna|plan|am\s+going)\s+to\s+die\b/i,
    /\b(don'?t|do\s+not)\s+want\s+to\s+(live|be\s+alive)\b/i,
    /\b(cut(ting)?|hurt(ing)?|harm(ing)?)\s+my\s*self\b/i,
    /\bself[-\s]?harm(ing)?\b/i,
];

const MEDICAL_PATTERNS: RegExp[] = [
    // Overdose / poisoning
    /\b(i|he|she|they|we|my\s+\w+)\s+(just\s+)?(overdosed|od'?d)\b/i,
    /\b(took|swallowed|taken)\s+(too\s+many|a\s+lot\s+of|an?\s+(entire|whole)\s+(bottle|pack))\b/i,
    // Breathing
    /\b(can'?t|cannot|can\s+not|unable\s+to|struggling\s+to)\s+breathe?\b/i,
    /\b(not|isn'?t|stopped)\s+breathing\b/i,
    /\bchoking\b/i,
    // Chest pain happening now
    /\b(i\s+(have|got|am\s+having|'?m\s+having)|having|severe|crushing)\s+(a\s+)?(bad\s+|sharp\s+|severe\s+)?chest\s+pain\b/i,
    /\bheart\s+attack\b.*\b(now|having|think)\b|\b(having|think\s+i'?m\s+having)\s+a\s+heart\s+attack\b/i,
    // Stroke signs
    /\b(having|think\s+(i'?m|he'?s|she'?s)\s+having)\s+a\s+stroke\b/i,
    /\b(face\s+(is\s+)?droop(ing|y)|slurred\s+speech|slurring\s+(my|his|her)\s+words)\b/i,
    // Bleeding
    /\b(bleeding|blood)\b.*\b(won'?t|will\s+not|doesn'?t|can'?t)\s+stop\b/i,
    /\b(severe|heavy|heavily|uncontrolled|a\s+lot\s+of)\s+bleeding\b|\bbleeding\s+(heavily|badly|a\s+lot)\b/i,
    // Unresponsive / seizure / anaphylaxis
    /\b(unconscious|unresponsive|passed\s+out\s+and\s+(won'?t|can'?t)\s+wake)\b/i,
    /\b(having|is\s+having)\s+a\s+seizure\b/i,
    /\b(throat|tongue)\s+(is\s+)?(swelling|closing)\b/i,
];

export const detectEmergency = (text: string): AiChatEmergencyKind | null => {
    if (CRISIS_PATTERNS.some((re) => re.test(text))) return 'crisis';
    if (MEDICAL_PATTERNS.some((re) => re.test(text))) return 'medical';
    return null;
};
