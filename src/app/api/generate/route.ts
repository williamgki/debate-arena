// src/app/api/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'edge';

interface ApiRequestBody {
  prompt: string;
  model: string;
  stream?: boolean;
}

export async function POST(req: NextRequest) {
    let body: ApiRequestBody | undefined = undefined;
    try {
        body = await req.json();
        console.log("[API Route] Parsed request body:", body);
    } catch (error) {
        console.error('[API Route] Invalid JSON body:', error);
        return new Response('Invalid request body', { status: 400 });
    }

    if (body === undefined || body === null) {
         console.error('[API Route] CRITICAL ERROR: body is undefined/null after parsing block!');
         return new Response('Internal server error: Failed to process request body', { status: 500 });
    }

    const { prompt, model, stream = true } = body;

    if (typeof model !== 'string' || !model) {
        console.error('[API Route] Error: model key missing or not a string in request body.', body);
        return new Response('Missing or invalid "model" in request body', { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const isChatModel = model.startsWith('gpt-');
    const useStreaming = stream && isChatModel;

    // --- Handle Streaming Request ---
    if (useStreaming) {
        console.log(`[API Route] Attempting stream for model: ${model}`);
        let result; // Define outside for logging
        try {
            result = await streamText({
                model: openai.chat(model as any),
                system: 'You are a helpful assistant generating debate arguments or verdicts.',
                prompt: prompt,
                temperature: 0.7,
                maxTokens: 350,
            });

            console.log("[API Route] streamText call completed.");
            console.log("[API Route] Type of result:", typeof result);

            // --- RE-ATTEMPT 5: Use Async Iterator (result.textStream) with loop logging ---
            console.log("[API Route] Checking for result.textStream property...");

            // Perform a basic check if textStream seems like it *could* be an async iterator
            // Note: A more robust check might be needed depending on the exact type
            if (!result || typeof (result as any).textStream !== 'object' || (result as any).textStream === null) {
                 console.error("[API Route] ERROR: result.textStream does not appear to be an object.", { resultExists: !!result, textStreamType: typeof (result as any)?.textStream });
                 console.error("[API Route] Full result object for reference:", result); // Log again for context
                 throw new Error("Could not find property 'textStream' on streamText result, or it's not an object.");
            }

            // Check specifically for the async iterator symbol if possible (might not work in all edge runtimes)
            try {
                 if (typeof (result as any).textStream[Symbol.asyncIterator] !== 'function') {
                     console.warn("[API Route] Warning: result.textStream exists but Symbol.asyncIterator is not a function. Iteration might fail.");
                 }
            } catch (e) { console.warn("[API Route] Could not check for Symbol.asyncIterator on textStream."); }


            console.log("[API Route] Found result.textStream. Attempting iteration...");
            const encoder = new TextEncoder();
            // Manually construct a ReadableStream by iterating over result.textStream
            const readableStream = new ReadableStream({
                async start(controller) {
                    let chunkCounter = 0;
                    console.log("[API Route] ReadableStream start() called."); // Log stream start
                    try {
                        // Iterate over the text stream chunks provided by the AI SDK result
                        for await (const textChunk of result.textStream) {
                            chunkCounter++;
                            // --- LOGGING INSIDE LOOP ---
                            // Log chunk reception on the server side
                            console.log(`[API Route] Server received stream chunk ${chunkCounter}: "${textChunk}"`);
                            // --- END LOGGING ---
                            controller.enqueue(encoder.encode(textChunk)); // Encode and send to client
                        }
                        console.log(`[API Route] Stream iteration finished after ${chunkCounter} chunks.`);
                        controller.close(); // Close the stream when iteration is done
                    } catch (error) {
                        console.error("[API Route] Error during stream iteration:", error);
                        controller.error(error); // Propagate the error to the client stream
                    }
                },
                cancel(reason) {
                    console.log("[API Route] Client cancelled stream:", reason);
                    // Implement cancellation logic if necessary (e.g., aborting OpenAI request)
                }
            });

            // Return the manually constructed ReadableStream
            return new Response(readableStream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                }
            });
            // --- END RE-ATTEMPT 5 ---

        } catch (error: any) {
            console.error('[API Route] ERROR Caught during streaming:', error);
             if (result !== undefined) {
                 console.error('[API Route] Logging streamText result object upon catching error:', result);
             }
            let errorMessage = error.message || 'An unexpected error occurred during streaming.';
            return new Response(JSON.stringify({ error: errorMessage }), {
                 status: 500, headers: { 'Content-Type': 'application/json' }
            });
        }
    }
     // --- Handle Non-Streaming Request ---
     else {
        // ... (Non-streaming logic remains the same) ...
        console.log(`[API Route] Attempting non-stream for model: ${model}`);
         try {
             if (!apiKey) { return new Response('Missing OPENAI_API_KEY for non-streaming call', { status: 500 }); }
             const endpoint = isChatModel ? 'https://api.openai.com/v1/chat/completions' : 'https://api.openai.com/v1/completions';
             const bodyPayload = isChatModel ? { model, messages: [{ role: 'system', content: '...' },{ role: 'user', content: prompt }], stream: false, temperature: 0.7, max_tokens: 350 } : { model, prompt: `System: ...\nUser: ${prompt}\nAssistant:`, stream: false, temperature: 0.7, max_tokens: 350, stop: ["\nUser:", "\nSystem:"] };
             const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(bodyPayload) });
             if (!response.ok) { const et=await response.text(); throw new Error(`API Error ${response.status}: ${et}`); }
             const data = await response.json();
             const messageContent = isChatModel ? data.choices?.[0]?.message?.content : data.choices?.[0]?.text;
             if (messageContent === undefined || messageContent === null) { throw new Error('No content received from OpenAI'); }
             return NextResponse.json({ message: messageContent.trim() });
         } catch (error: any) {
           console.error('[API Route] ERROR Caught during non-streaming:', error);
            return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred' }), {
                 status: 500, headers: { 'Content-Type': 'application/json' }
            });
         }
     }
}