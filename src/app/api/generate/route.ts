import { NextRequest, NextResponse } from 'next/server';

const allowedModels = [
  'gpt-3.5-turbo',
  'gpt-4o',
  'gpt-4-0125-preview',
  'openai/oaas-mini',
  'openai/oaas-pro',
];

export async function POST(req: NextRequest) {
  const { prompt, model } = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
  }

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Invalid or missing prompt' }, { status: 400 });
  }

  if (!model || !allowedModels.includes(model)) {
    return NextResponse.json({ error: 'Invalid or unsupported model' }, { status: 400 });
  }

  try {
    const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a debater in a structured AI safety discussion. Respond concisely and clearly to the argument.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    const data = await apiRes.json();
    const message = data.choices?.[0]?.message?.content || '[No response]';
    return NextResponse.json({ message });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
