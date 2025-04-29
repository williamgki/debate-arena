// src/app/api/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { streamText, LanguageModelV1 } from 'ai';

export const runtime = 'edge'; // Or omit for default Node.js runtime

// Model Categories and Interfaces
const SDK_STREAMING_CHAT_MODELS: ReadonlyArray<string> = [
  'gpt-3.5-turbo',
  'gpt-4.1-2025-04-14',
];
const NON_STREAMING_REASONING_MODELS: ReadonlyArray<string> = ['o3-2025-04-16', 'o4-mini-2025-04-16'];
const ALL_KNOWN_MODELS = [...SDK_STREAMING_CHAT_MODELS, ...NON_STREAMING_REASONING_MODELS];

interface ApiRequestBody {
  prompt: string;
  model: string;
  stream?: boolean;
}

interface ChatCompletionRequestBody {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  stream: false;
  max_tokens?: number;
  max_completion_tokens?: number;
}

export async function POST(req: NextRequest) {
  let body: ApiRequestBody | undefined = undefined;
  try {
    body = await req.json();
    console.log("[API Route] Request Body Parsed:", body);
  } catch (error) {
    console.error("[API Route] Invalid JSON body:", error);
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!body) {
    console.error("[API Route] CRITICAL ERROR: body is null or undefined after parsing!");
    return new Response(
      JSON.stringify({ error: 'Internal server error: Failed to process request body' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log("[API Route] Value of body before destructuring:", body, "Type:", typeof body);
  const { prompt, model, stream = true } = body;
  console.log("[API Route] Destructured variables - prompt:", prompt, "model:", model, "stream flag:", stream);

  // Basic validation
  if (!prompt || typeof prompt !== 'string') {
    console.error("[API Route] Invalid prompt provided.");
    return new Response(
      JSON.stringify({ error: 'Invalid prompt' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!model || typeof model !== 'string') {
    console.error("[API Route] Invalid model provided.");
    return new Response(
      JSON.stringify({ error: 'Invalid model' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!ALL_KNOWN_MODELS.includes(model)) {
    console.error("[API Route] Unknown model:", model);
    return new Response(
      JSON.stringify({ error: 'Unknown model' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Determine Request Handling
  const isSdkStreamingChatModel = SDK_STREAMING_CHAT_MODELS.includes(model);
  const isReasoningModel = NON_STREAMING_REASONING_MODELS.includes(model);
  const acceptHeader = req.headers.get("accept") || "";
  const clientWantsStream = acceptHeader.includes("text/event-stream");
  // Use streaming only if enabled, the model is a streaming one, and the client expects streaming.
  const useStreaming = stream && isSdkStreamingChatModel && clientWantsStream;
  console.log("[API Route] Model classification - SDK Streaming Chat Model:", isSdkStreamingChatModel, "Reasoning Model:", isReasoningModel);
  console.log("[API Route] Accept header:", acceptHeader);
  console.log("[API Route] Using Streaming:", useStreaming);

  // 1. Handle Streaming Request
  if (useStreaming) {
    try {
      const result = await streamText({
        model: model as unknown as LanguageModelV1,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      });
      console.log("[API Route] streamText result received:", result);

      if (!result || typeof result.textStream !== "object" || result.textStream === null) {
        console.error("[API Route] Invalid textStream in result:", result);
        return new Response(
          JSON.stringify({ error: "Invalid streaming response structure" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      console.log("[API Route] Using result.textStream directly as the readable stream.");
      const readableStream = result.textStream;
      return new Response(readableStream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" }
      });
    } catch (error: unknown) {
      console.error("[API Route] Error during streaming request handling:", error);
      return new Response(
        JSON.stringify({ error: "Error during streaming response" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  // 2. Handle Non-Streaming Request
  else {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error("[API Route] OPENAI_API_KEY is not configured.");
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      const endpoint = "https://api.openai.com/v1/chat/completions";
      let requestBody: ChatCompletionRequestBody;
      if (isReasoningModel) {
        requestBody = {
          model,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          max_completion_tokens: 1000
        };
      } else {
        requestBody = {
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          stream: false,
          max_tokens: 350
        };
      }
      console.log("[API Route] Sending non-streaming request to OpenAI API with body:", requestBody);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const errorResponseText = await response.text();
        console.error("[API Route] Non-streaming request failed with status:", response.status, "Response text:", errorResponseText);
        return new Response(
          JSON.stringify({ error: "Non-streaming API request failed" }),
          { status: response.status, headers: { "Content-Type": "application/json" } }
        );
      }
      const responseText = await response.text();
      if (!responseText) {
        console.error("[API Route] Empty response text from API");
        return new Response(
          JSON.stringify({ error: "Empty response from API" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("[API Route] Error parsing JSON from API response:", parseError, "Response text:", responseText);
        return new Response(
          JSON.stringify({ error: "Error parsing response from API" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      console.log("[API Route] Non-streaming response data:", data);
      console.log("[API Route] Finish reason:", data.choices?.[0]?.finish_reason);

      const messageContent = data.choices?.[0]?.message?.content;
      if (messageContent === undefined || messageContent === null || messageContent.trim() === "") {
        console.error("[API Route] Invalid or empty message content in response:", data);
        return new Response(
          JSON.stringify({ error: "Invalid response format from API. The output may have been truncated due to token limits." }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      return NextResponse.json({ message: messageContent.trim() });
    } catch (error: unknown) {
      console.error("[API Route] Error during non-streaming request handling:", error);
      return new Response(
        JSON.stringify({ error: "Error during non-streaming response" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}
