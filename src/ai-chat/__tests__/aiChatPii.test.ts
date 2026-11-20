import { describe, expect, it } from 'vitest';
import { scrubPii } from 'ai-chat/services/aiChatPii';

describe('scrubPii', () => {
    it.each([
        ['my email is ada.obi@example.com', 'my email is [email removed]'],
        ['call me on +234 803 123 4567', 'call me on [phone removed]'],
        ['my number is 08031234567', 'my number is [phone removed]'],
        ['phone (555) 123-4567 please', 'phone [phone removed] please'],
        ['+44 20 7946 0958', '[phone removed]'],
        ['my NIN is 12345678901', 'my NIN is [ID removed]'],
        ['SSN 123-45-6789', 'SSN [ID removed]'],
        ['passport A12345678', 'passport [ID removed]'],
        ['card 4111 1111 1111 1111', 'card [ID removed]'],
        ['NHS number 943 476 5919', 'NHS number [phone removed]'],
    ])('removes identifiers: %s', (input, expected) => {
        expect(scrubPii(input)).toBe(expected);
    });

    it.each([
        'My blood pressure is 120/80',
        'I took 500 mg of paracetamol',
        'I weigh 75.5 kg and I am 34 years old',
        'Temperature 38.5C since 2026-11-18',
        'Symptoms started on 18/11/2026',
        'I walk 10000 steps a day',
        'Is 2000 calories enough?',
        'My HbA1c was 6.5%',
    ])('keeps health numbers and dates: %s', (input) => {
        expect(scrubPii(input)).toBe(input);
    });
});
