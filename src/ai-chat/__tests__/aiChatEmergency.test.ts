import { describe, expect, it } from 'vitest';
import { detectEmergency } from 'ai-chat/services/aiChatEmergency';

describe('detectEmergency (deterministic safety net)', () => {
    it.each([
        'I want to kill myself',
        "I'm suicidal",
        'I have been thinking about suicide',
        "I don't want to live anymore",
        'I keep cutting myself',
        'I want to end my life',
    ])('flags crisis: %s', (text) => {
        expect(detectEmergency(text)).toBe('crisis');
    });

    it.each([
        "I can't breathe",
        'my dad is not breathing',
        'I am having chest pain right now',
        'I think I am having a stroke',
        "the bleeding won't stop",
        'she took too many pills',
        'my son overdosed',
        'my throat is swelling after eating peanuts',
        'he is unconscious',
    ])('flags medical emergency: %s', (text) => {
        expect(detectEmergency(text)).toBe('medical');
    });

    it.each([
        'What causes chest pain?',
        'What are the signs of a stroke?',
        'How much water should I drink a day?',
        'Is ibuprofen safe with coffee?',
        'How do I stop a nosebleed?',
        'Tips for better breathing during exercise',
    ])('leaves educational questions to the classifier: %s', (text) => {
        expect(detectEmergency(text)).toBeNull();
    });
});
