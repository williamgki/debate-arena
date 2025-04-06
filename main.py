import os
import openai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware # Import for CORS
from pydantic import BaseModel
from dotenv import load_dotenv
from typing import List, Optional # Added for type hinting

# Load environment variables from .env file
load_dotenv()

# --- OpenAI Client Setup ---
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("Error: OPENAI_API_KEY environment variable not set.")
    exit(1)
openai.api_key = api_key

# --- FastAPI App Setup ---
app = FastAPI(
    title="Debate Arena Backend",
    description="API for generating AI debate arguments.",
    version="0.1.0",
)

# --- CORS Middleware Setup --- #
origins = [
    "http://localhost:5173", # Default Vite dev server port
    # Add other frontend URLs if needed (e.g., your deployed frontend URL)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- End of CORS Middleware Setup ---

# --- Pydantic Models ---
class DebatePrompt(BaseModel):
    prompt: str

class DebateResult(BaseModel):
    argument_a: str
    argument_b: str

class DebateTurn(BaseModel):
    speaker: str # "Debater A", "Debater B", "System", "Judge"
    text: str

class DebateContext(BaseModel):
    original_prompt: str
    history: List[DebateTurn]
    user_judgment: Optional[str] = None # Judgment from the *last* round

# --- API Endpoint for First Round ---
@app.post("/generate_first_arguments/", response_model=DebateResult) # Renamed for clarity
async def generate_first_arguments_endpoint(debate_prompt: DebatePrompt):
    """
    Accepts the initial prompt and returns the first arguments from two AI debaters.
    """
    try:
        # --- Call OpenAI API for Debater A ---
        response_a = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are Debater A. Take a stance based on the user prompt and generate a concise opening argument."},
                {"role": "user", "content": debate_prompt.prompt}
            ],
            max_tokens=300, # Using the increased token limit
            temperature=0.7
        )
        argument_a = response_a.choices[0].message.content.strip() or "[Debater A failed to generate argument]"

        # --- Call OpenAI API for Debater B ---
        response_b = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are Debater B. Take a stance based on the user prompt (potentially opposing Debater A) and generate a concise opening argument."},
                {"role": "user", "content": debate_prompt.prompt}
            ],
            max_tokens=300, # Using the increased token limit
            temperature=0.75
        )
        argument_b = response_b.choices[0].message.content.strip() or "[Debater B failed to generate argument]"

        return DebateResult(argument_a=argument_a, argument_b=argument_b)

    # --- Error Handling (Keep as before) ---
    except openai.APIError as e:
        print(f"OpenAI API returned an API Error: {e}")
        raise HTTPException(status_code=500, detail="Error communicating with AI service (API Error)")
    except openai.APIConnectionError as e:
        print(f"Failed to connect to OpenAI API: {e}")
        raise HTTPException(status_code=500, detail="Error communicating with AI service (Connection Error)")
    except openai.RateLimitError as e:
        print(f"OpenAI API request exceeded rate limit: {e}")
        raise HTTPException(status_code=429, detail="Rate limit exceeded with AI service")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")

# --- API Endpoint for Next Round ---
@app.post("/next_round/", response_model=DebateResult)
async def next_round_endpoint(context: DebateContext):
    """
    Accepts the debate context (prompt, history, judgment) and returns the next arguments.
    """
    # --- Format History for LLM Context ---
    formatted_history = f"Original Prompt: {context.original_prompt}\n\nDebate History:\n"
    for turn in context.history:
        formatted_history += f"{turn.speaker}: {turn.text}\n"
    if context.user_judgment:
      formatted_history += f"\nJudge's Last Judgment: {context.user_judgment.replace('_', ' ')}\n"

    prompt_for_a = f"{formatted_history}\nDebater A, provide your argument for the next round, considering the history and the judge's last input:"
    prompt_for_b = f"{formatted_history}\nDebater B, provide your argument for the next round, considering the history and the judge's last input:"

    try:
        # --- Call OpenAI API for Debater A (with history) ---
        response_a = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are Debater A. Continue the debate based on the history provided. Address opponent points and judge feedback where relevant. Keep your response concise."},
                {"role": "user", "content": prompt_for_a}
            ],
            max_tokens=300,
            temperature=0.7
        )
        argument_a = response_a.choices[0].message.content.strip() or "[Debater A failed to generate argument for this round]"

        # --- Call OpenAI API for Debater B (with history) ---
        response_b = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                 {"role": "system", "content": "You are Debater B. Continue the debate based on the history provided. Address opponent points and judge feedback where relevant. Keep your response concise."},
                 {"role": "user", "content": prompt_for_b}
            ],
            max_tokens=300,
            temperature=0.75
        )
        argument_b = response_b.choices[0].message.content.strip() or "[Debater B failed to generate argument for this round]"

        return DebateResult(argument_a=argument_a, argument_b=argument_b)

    # --- Error Handling (Keep as before) ---
    except openai.APIError as e:
        print(f"OpenAI API returned an API Error: {e}")
        raise HTTPException(status_code=500, detail="Error communicating with AI service (API Error)")
    # ... (include other openai exception handlers: APIConnectionError, RateLimitError) ...
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {str(e)}")

# --- Root Endpoint ---
@app.get("/")
async def read_root():
    return {"message": "Welcome to the Debate Arena Backend!"}

# --- Add more endpoints later ---