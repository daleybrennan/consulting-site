import Anthropic from '@anthropic-ai/sdk';

export const PITCH_MODEL = 'claude-opus-4-8';

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.');
  if (cached) return cached;
  cached = new Anthropic({ apiKey });
  return cached;
}
