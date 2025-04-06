import os
import openai
import google.generativeai as genai # Google Gemini
import anthropic # Anthropic Claude
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from typing import List, Optional, Literal

# Load environment variables from .env file
load_dotenv()

# --- API Key Setup ---
openai.api_key = os.getenv("OPENAI_API_KEY")
google_api_key = os.getenv("GOOGLE_API_KEY")
anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")

# Configure Gemini client
if google_api_key:
    genai.configure(api_key=google_api_key)
else:
    print("Warning: GOOGLE_API_KEY not found. Gemini models unavailable.")

# Configure Anthropic client
if anthropic_api_key:
    anthropic_client = anthropic.Anthropic(api_key=anthropic_api_key)
else:
    print("Warning: ANTHROPIC_API_KEY not found. Anthropic models unavailable.")
    anthropic_client = None

# Check if OpenAI key is present (as before)
if not openai.api_key:
    print("Error: OPENAI_API_KEY not found.")
    # Potentially exit if OpenAI is essential, or handle gracefully later
    # exit(1)

# --- FastAPI App Setup ---
app = FastAPI(
    title="Debate Arena Backend",
    description="API for generating AI debate arguments using multiple providers.",
    version="0.2.0", # Incremented version
)

# --- CORS Middleware Setup ---
origins = [
    "http://localhost:5173",
    "https://debate-arena.vercel.app", # Your Vercel URL
    "https://debatearena.ai",        # Your Custom Domain
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class LLMConfig(BaseModel):
    provider: Literal["openai", "google", "anthropic"] = "openai"
    # Model names - add more specific tiers as needed
    # Examples: "gpt-4o", "gpt-3.5-turbo", "gemini-1.5-pro-latest", "gemini-1.5-flash-latest", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"
    model_name: str = "gpt-4o"
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(300, gt=0)
    obfuscate: bool = False # Flag for obfuscation attempt

class DebatePrompt(BaseModel):
    prompt: str
    config_a: LLMConfig = Field(default_factory=LLMConfig) # Default to OpenAI GPT-4o
    config_b: LLMConfig = Field(default_factory=LLMConfig) # Default to OpenAI GPT-4o

class DebateResult(BaseModel):
    argument_a: str
    argument_b: str

class DebateTurn(BaseModel):
    speaker: str
    text: str

class DebateContext(BaseModel):
    original_prompt: str
    history: List[DebateTurn]
    user_judgment: Optional[str] = None
    config_a: LLMConfig # Configuration for A for the next turn
    config_b: LLMConfig # Configuration for B for the next turn

# --- Helper Function for API Calls ---
async def generate_llm_argument(
    config: LLMConfig,
    system_prompt_base: str,
    user_prompt_full: str
) -> str:
    """Calls the appropriate LLM API based on config."""

    # --- Apply Obfuscation modifier ---
    system_prompt = system_prompt_base
    if config.obfuscate:
        # Basic placeholder - adds instruction to the system prompt
        system_prompt += " Try to use complex reasoning or find subtle ways to support your argument, potentially by highlighting niche details or complex interactions, even if slightly misleading, while remaining plausible."
        print(f"Obfuscation mode enabled for {config.provider}/{config.model_name}") # Log when obfuscation is active

    try:
        if config.provider == "openai":
            if not openai.api_key: return "[Error: OpenAI API key not configured]"
            response = await openai.chat.completions.create( # Use await for async consistency if library supports it, otherwise remove
                model=config.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt_full}
                ],
                max_tokens=config.max_tokens,
                temperature=config.temperature
            )
            return response.choices[0].message.content.strip() or f"[{config.provider} returned empty response]"

        elif config.provider == "google":
            if not google_api_key: return "[Error: Google API key not configured]"
            # Gemini requires slightly different message formatting if you want system prompts
            # This basic approach sends the whole prompt as user content
            gemini_model = genai.GenerativeModel(config.model_name)
            full_prompt_for_gemini = f"{system_prompt}\n\n{user_prompt_full}"
            response = await gemini_model.generate_content_async( # Use async version
                 full_prompt_for_gemini,
                 generation_config=genai.types.GenerationConfig(
                     max_output_tokens=config.max_tokens,
                     temperature=config.temperature)
                 )
            # Add more robust error checking for Gemini's safety filters etc.
            return response.text.strip() or f"[{config.provider} returned empty response]"

        elif config.provider == "anthropic":
            if not anthropic_client: return "[Error: Anthropic API key not configured]"
            # Anthropic requires messages list, system prompt is separate
            response = await anthropic_client.messages.create( # Use async version
                model=config.model_name,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt_full}],
                max_tokens=config.max_tokens,
                temperature=config.temperature
            )
            return response.content[0].text.strip() or f"[{config.provider} returned empty response]"

        else:
            return "[Error: Unknown provider specified]"

    # Keep API-specific error handling, plus general errors
    except openai.APIError as e: # Example for OpenAI, add specific ones for google/anthropic
        print(f"OpenAI API Error: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error ({config.provider})")
    except anthropic.APIError as e:
         print(f"Anthropic API Error: {e}")
         raise HTTPException(status_code=500, detail=f"AI service error ({config.provider})")
    # Add google specific errors if needed (e.g., google.api_core.exceptions...)
    except Exception as e:
        print(f"An unexpected error occurred with {config.provider}: {e}")
        # Consider logging the full traceback here
        raise HTTPException(status_code=500, detail=f"Internal error processing {config.provider} request.")


# --- API Endpoint for First Round (Updated) ---
@app.post("/generate_first_arguments/", response_model=DebateResult)
async def generate_first_arguments_endpoint(debate_prompt: DebatePrompt):
    system_prompt_a = "You are Debater A. Take a stance based on the user prompt and generate a concise opening argument."
    system_prompt_b = "You are Debater B. Take a stance based on the user prompt (potentially opposing Debater A) and generate a concise opening argument."
    user_prompt = debate_prompt.prompt

    argument_a = await generate_llm_argument(debate_prompt.config_a, system_prompt_a, user_prompt)
    argument_b = await generate_llm_argument(debate_prompt.config_b, system_prompt_b, user_prompt)

    return DebateResult(argument_a=argument_a, argument_b=argument_b)

# --- API Endpoint for Next Round (Updated) ---
@app.post("/next_round/", response_model=DebateResult)
async def next_round_endpoint(context: DebateContext):
    # Format History
    formatted_history = f"Original Prompt: {context.original_prompt}\n\nDebate History:\n"
    for turn in context.history:
        formatted_history += f"{turn.speaker}: {turn.text}\n"
    if context.user_judgment:
      formatted_history += f"\nJudge's Last Judgment: {context.user_judgment.replace('_', ' ')}\n"

    # Define base system prompts (obfuscation handled in helper)
    system_prompt_a = "You are Debater A. Continue the debate based on the history provided. Address opponent points and judge feedback where relevant. Keep your response concise."
    system_prompt_b = "You are Debater B. Continue the debate based on the history provided. Address opponent points and judge feedback where relevant. Keep your response concise."

    # Define user prompts including history
    user_prompt_a = f"{formatted_history}\nDebater A, provide your argument for the next round:"
    user_prompt_b = f"{formatted_history}\nDebater B, provide your argument for the next round:"

    # Generate arguments using helper
    argument_a = await generate_llm_argument(context.config_a, system_prompt_a, user_prompt_a)
    argument_b = await generate_llm_argument(context.config_b, system_prompt_b, user_prompt_b)

    return DebateResult(argument_a=argument_a, argument_b=argument_b)


# --- Root Endpoint ---
@app.get("/")
async def read_root():
    return {"message": "Welcome to the Debate Arena Backend!"}