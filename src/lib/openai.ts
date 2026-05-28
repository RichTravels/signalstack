import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('Missing OPENAI_API_KEY environment variable in .env.local');
}

// Initialize a clean, stateless instance of the official OpenAI SDK
export const openai = new OpenAI({
  apiKey: apiKey,
});
