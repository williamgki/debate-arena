import { NextRequest, NextResponse } from 'next/server';

const CHAT_MODELS = ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4.5-preview'];
const COMPLETION_MODELS = ['o1-pro', 'o3-mini'];

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json();

    if (!prompt || !model) {
      return NextResponse.json({ error: 'Missing prompt or model' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
    }

    const isChatModel = CHAT_MODELS.includes(model);
    const isCompletionModel = COMPLETION_MODELS.includes(model);

    if (!isChatModel && !isCompletionModel) {
      return NextResponse.json({ error: `Unsupported model: ${model}` }, { status: 400 });
    }

    const apiUrl = isChatModel
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://api.openai.com/v1/completions';

    const body = isChatModel
      ? {
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant evaluating or generating debate content.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }
      : {
          model,
          prompt,
          temperature: 0.7,
          max_tokens: 300,
        };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    const text = isChatModel
      ? data?.choices?.[0]?.message?.content
      : data?.choices?.[0]?.text;

    if (!text) {
      console.error('OpenAI returned no content:', data);
      return NextResponse.json({ error: 'No content returned from OpenAI' }, { status: 502 });
    }

    return NextResponse.json({ message: text.trim() });
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
