import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const { errorMessage, url } = await request.json();

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `Explain this error in 1 simple sentence (max 15 words). Be casual and helpful.

URL: ${url}
Error: ${errorMessage}`,
    });

    return Response.json({ explanation: text });
  } catch (error) {
    console.error('AI explanation failed:', error);
    return Response.json(
      { error: 'Failed to generate explanation' },
      { status: 500 }
    );
  }
}
