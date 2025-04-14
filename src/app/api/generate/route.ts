// src/app/api/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
// No need for StreamingTextResponse if toAIStreamResponse() works
import { openai } from '@ai-sdk/openai';

export const runtime = 'edge';

// Define model types/categories accurately
// Models compatible with the SDK's streamText and openai.chat()
type OpenAIChatModelId = 'gpt-3.5-turbo' | 'gpt-4o' | 'gpt-4.5-preview';
const SDK_STREAMING_CHAT_MODELS: ReadonlyArray<string> = ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4.5-preview'];

// Models assumed to use the non-streaming /v1/completions endpoint
const NON_STREAMING_COMPLETION_MODELS: ReadonlyArray<string> = ['o1-pro', 'o3-mini'];

// Combine all known/allowed models for validation
const ALL_KNOWN_MODELS = [...SDK_STREAMING_CHAT_MODELS, ...NON_STREAMING_COMPLETION_MODELS];

// Request body interface
interface ApiRequestBody {
  prompt: string;
  model: string;
  stream?: boolean;
}

export async function POST(req: NextRequest) {
    let body: ApiRequestBody;
    try {
        body = await req.json();
        console.log("[API Route] Request Body:", body);
    } catch (error) {
        console.error('[API Route] Invalid JSON body:', error);
        return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { prompt, model, stream = true } = body; // Default to streaming

    // --- Validation ---
    if (!prompt || typeof prompt !== 'string') {
         return new Response(JSON.stringify({ error: 'Missing or invalid "prompt"' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!model || typeof model !== 'string') {
        return new Response(JSON.stringify({ error: 'Missing or invalid "model"' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!ALL_KNOWN_MODELS.includes(model)) {
         console.warn(`[API Route] Received request for unsupported model: ${model}`);
         return new Response(JSON.stringify({ error: `Unsupported model: ${model}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // --- Determine Request Handling ---
    const isSdkStreamingChatModel = SDK_STREAMING_CHAT_MODELS.includes(model);
    const isCompletionModel = NON_STREAMING_COMPLETION_MODELS.includes(model);
    const useStreaming = stream && isSdkStreamingChatModel; // Only stream SDK-compatible chat models when requested

    // --- 1. Handle Streaming Request (SDK Compatible Models) ---
    if (useStreaming) {
        console.log(`[API Route] Attempting stream for SDK chat model: ${model}`);
        try {
            const result = await streamText({
                // Cast validated model to the specific type expected by openai.chat
                model: openai.chat(model as OpenAIChatModelId),
                // Use a consistent system prompt across API calls
                system: 'You are a helpful assistant generating debate arguments or verdicts.',
                prompt: prompt,
                temperature: 0.7,
                maxTokens: 350, // Renamed from max_tokens for SDK v3
            });

            // Return the stream directly using the Vercel AI SDK helper
            // This handles setting the correct headers and stream format.
            return result.toAIStreamResponse();

        } catch (error: unknown) {
            console.error('[API Route] ERROR during SDK streaming:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during streaming.';
            // Return error as JSON
            return new Response(JSON.stringify({ error: errorMessage }), {
                 status: 500, headers: { 'Content-Type': 'application/json' }
            });
        }
    }
    // --- 2. Handle Non-Streaming Request (Completion Models OR Non-Streamed Chat Models) ---
    else {
        console.log(`[API Route] Attempting non-stream request for model: ${model}`);
        try {
             const apiKey = process.env.OPENAI_API_KEY;
             if (!apiKey) {
                 console.error('[API Route] Missing OPENAI_API_KEY for non-streaming call');
                 return new Response(JSON.stringify({ error: 'Server configuration error: Missing API key' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
             }

             let endpoint: string;
             let requestBody: Record<string, any>; // Use a general type or define specific interfaces

             // --- Determine Endpoint and Payload ---
             if (isCompletionModel) {
                 // ** O1 / O3 Completion Model Payload **
                 console.log(`[API Route] Using /v1/completions endpoint for ${model}`);
                 endpoint = 'https://api.openai.com/v1/completions';
                 // Construct a prompt suitable for the completion API if needed
                 // Example: Simple prompt concatenation (adjust if needed based on model requirements)
                 const completionPrompt = `System: You are a helpful assistant generating debate arguments or verdicts.\n\nUser: ${prompt}\n\nAssistant:`;
                 requestBody = {
                     model: model,
                     prompt: completionPrompt,
                     max_tokens: 350,
                     temperature: 0.7,
                     stream: false, // Ensure stream is false
                     // Add any other parameters required by O1/O3, like 'stop sequences'
                     stop: ["\nUser:", "\nSystem:"],
                 };
             } else {
                 // ** Chat Model (Non-Streaming) Payload **
                 console.log(`[API Route] Using /v1/chat/completions endpoint for non-streaming ${model}`);
                 endpoint = 'https://api.openai.com/v1/chat/completions';
                 requestBody = {
                     model: model, // Already validated to be a chat model if not completion
                     messages: [
                         { role: 'system', content: 'You are a helpful assistant generating debate arguments or verdicts.' },
                         { role: 'user', content: prompt }
                     ],
                     max_tokens: 350,
                     temperature: 0.7,
                     stream: false, // Ensure stream is false
                 };
             }

             // --- Make the Direct Fetch Call ---
             console.log(`[API Route] Sending non-streaming request to ${endpoint}`);
             const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
             });

             if (!response.ok) {
                const errorText = await response.text();
                console.error(`[API Route] Non-streaming API Error ${response.status}: ${errorText}`);
                throw new Error(`API Error ${response.status}: ${errorText}`);
             }

             const data = await response.json();

             // --- Extract Content Based on Model Type ---
             const messageContent = isCompletionModel
                 ? data.choices?.[0]?.text // For /v1/completions
                 : data.choices?.[0]?.message?.content; // For /v1/chat/completions

             if (messageContent === undefined || messageContent === null) {
                console.error('[API Route] No content received in non-streaming response:', data);
                throw new Error('No content received from OpenAI');
             }

             // --- Return JSON Response for Client ---
             // Client expects { message: "..." } based on callOpenAIWithScoring
             return NextResponse.json({ message: messageContent.trim() });

         } catch (error: unknown) {
           console.error('[API Route] ERROR during non-streaming fetch:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unexpected non-streaming error occurred';
            return new Response(JSON.stringify({ error: errorMessage }), {
                 status: 500, headers: { 'Content-Type': 'application/json' }
            });
         }
     }
}