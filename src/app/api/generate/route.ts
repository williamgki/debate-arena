// src/app/api/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export const runtime = 'edge';

// Define allowed model IDs based on client-side options
type OpenAIModelId = 'gpt-3.5-turbo' | 'gpt-4o' | 'gpt-4.5-preview'; // Only include models compatible with openai.chat

// Define a minimal interface for the expected streamText result containing textStream
interface StreamTextResultWithStream {
    textStream: AsyncIterable<string>;
    // Include other known properties from the AI SDK result if needed
}

interface ApiRequestBody {
  prompt: string;
  model: string; // Keep as string here, validation/casting happens later
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

    // Basic validation if model is one of the expected OpenAI chat models for casting
    // Adjust this list if 'o1-pro' or 'o3-mini' are also compatible with openai.chat
    const isValidOpenAIChatModel = ['gpt-3.5-turbo', 'gpt-4o', 'gpt-4.5-preview'].includes(model);

    const apiKey = process.env.OPENAI_API_KEY;
    // Determine if it's intended as a chat model (adjust based on actual compatibility)
    const isChatModel = model.startsWith('gpt-');
    // Determine if streaming should be used (only for compatible models)
    const useStreaming = stream && isChatModel && isValidOpenAIChatModel;

    // --- Handle Streaming Request ---
    if (useStreaming) {
        console.log(`[API Route] Attempting stream for model: ${model}`);
        // Declare result here so it's accessible in the ReadableStream scope
        let result: StreamTextResultWithStream | undefined;
        try {
            // Cast the validated model string to our specific type
            result = await streamText({
                model: openai.chat(model as OpenAIModelId), // Use defined type cast
                system: 'You are a helpful assistant generating debate arguments or verdicts.',
                prompt: prompt,
                temperature: 0.7,
                maxTokens: 350,
            });

            console.log("[API Route] streamText call completed.");
            console.log("[API Route] Type of result:", typeof result);

            // --- RE-ATTEMPT 5: Use Async Iterator (result.textStream) with loop logging ---
            console.log("[API Route] Checking for result.textStream property...");

            // Perform checks using the specific interface type assertion
            // These checks run *before* the ReadableStream is created
            if (!result || typeof (result as StreamTextResultWithStream).textStream !== 'object' || (result as StreamTextResultWithStream).textStream === null) {
                 console.error("[API Route] ERROR: result.textStream does not appear to be an object.", { resultExists: !!result, textStreamType: typeof (result as StreamTextResultWithStream)?.textStream });
                 console.error("[API Route] Full result object for reference:", result);
                 throw new Error("Could not find property 'textStream' on streamText result, or it's not an object.");
            }

            // Check specifically for the async iterator symbol if possible
            try {
                 if (typeof (result as StreamTextResultWithStream).textStream[Symbol.asyncIterator] !== 'function') {
                     console.warn("[API Route] Warning: result.textStream exists but Symbol.asyncIterator is not a function. Iteration might fail.");
                 }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (_e) { // Indicate unused variable with underscore
                 console.warn("[API Route] Could not check for Symbol.asyncIterator on textStream.");
            }

            console.log("[API Route] Found result.textStream. Attempting iteration...");
            const encoder = new TextEncoder();

            // Manually construct a ReadableStream by iterating over result.textStream
            const readableStream = new ReadableStream({
                async start(controller) {
                    let chunkCounter = 0;
                    console.log("[API Route] ReadableStream start() called.");
                    try {
                        // --- ADDED CHECK ---
                        // Add guard here to satisfy TypeScript within this specific scope
                        if (!result) {
                            console.error("[API Route] Critical: result is undefined inside ReadableStream start.");
                            controller.error(new Error("Internal error: Stream result unexpectedly missing."));
                            return; // Stop execution for this stream
                        }
                        // --- END OF ADDED CHECK ---

                        // Now TypeScript knows 'result' is defined here
                        // Iterate over the text stream chunks
                        for await (const textChunk of result.textStream) {
                            chunkCounter++;
                            console.log(`[API Route] Server received stream chunk ${chunkCounter}: "${textChunk}"`);
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
                    // Implement cancellation logic if necessary
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

        } catch (error: unknown) { // Catch as unknown
            console.error('[API Route] ERROR Caught during streaming setup or streamText call:', error);
             if (result !== undefined) {
                 // This log might not be useful if error happened during streamText itself
                 console.error('[API Route] Logging streamText result object upon catching error:', result);
             }
             // Check if error is an Error object before accessing .message
             const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during streaming.';
            // Return error as JSON for consistency, even though client expects text/plain for success stream
            // Client-side fetch error handling should catch non-200 status codes regardless of content type
            return new Response(JSON.stringify({ error: errorMessage }), {
                 status: 500, headers: { 'Content-Type': 'application/json' }
            });
        }
    }
     // --- Handle Non-Streaming Request ---
     else {
        // Non-streaming logic (assuming o1/o3 might use completion endpoint or require different handling)
        console.log(`[API Route] Attempting non-stream for model: ${model}`);
         try {
             if (!apiKey) { return new Response('Missing OPENAI_API_KEY for non-streaming call', { status: 500 }); }

             // Use appropriate endpoint and payload based on model characteristics
             // This needs to be accurate for the models you intend to support non-streaming
             const endpoint = isChatModel ? 'https://api.openai.com/v1/chat/completions' : 'https://api.openai.com/v1/completions'; // Adjust if non-GPT models use chat endpoint

             const bodyPayload = isChatModel
                ? { model, messages: [{ role: 'system', content: 'You are a helpful assistant.' },{ role: 'user', content: prompt }], stream: false, temperature: 0.7, max_tokens: 350 }
                // Example completion payload - ensure this matches the API requirements for models like o1/o3 if they use this endpoint
                : { model, prompt: `System: You are a helpful assistant.\nUser: ${prompt}\nAssistant:`, stream: false, temperature: 0.7, max_tokens: 350, stop: ["\nUser:", "\nSystem:"] };

             const response = await fetch(endpoint, {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload)
             });

             if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error ${response.status}: ${errorText}`);
             }

             const data = await response.json();
             // Extract content based on expected response structure
             const messageContent = isChatModel ? data.choices?.[0]?.message?.content : data.choices?.[0]?.text;

             if (messageContent === undefined || messageContent === null) {
                throw new Error('No content received from OpenAI');
             }
             return NextResponse.json({ message: messageContent.trim() });

         } catch (error: unknown) { // Catch as unknown
           console.error('[API Route] ERROR Caught during non-streaming:', error);
            // Check if error is an Error object before accessing .message
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            return new Response(JSON.stringify({ error: errorMessage }), {
                 status: 500, headers: { 'Content-Type': 'application/json' }
            });
         }
     }
}