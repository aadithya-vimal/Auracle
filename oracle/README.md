# Oracle Backend - Auracle

Python-based oracle that analyzes sentiment using Groq AI and updates the Solana blockchain.

## Setup

1. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Mac/Linux
venv\Scripts\activate     # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your values
```

## Run

```bash
python oracle_agent.py
```

## How It Works

1. **Data Selection**: Randomly selects 5 tweets from `mock_data.json`
2. **AI Analysis**: Sends tweets to Groq API for sentiment analysis
3. **Score Calculation**: Receives a score from 0-100
4. **Blockchain Update**: Sends transaction to Solana to update on-chain state
5. **Fallback**: If Groq fails, uses keyword-based sentiment analysis

## Features

- ✅ Groq AI integration with retry logic
- ✅ Rate limit handling
- ✅ Fallback sentiment analysis
- ✅ Comprehensive error handling
- ✅ Transaction confirmation
- ✅ Detailed logging

## Mock Data

The `mock_data.json` file contains 100 unique crypto tweets with:
- Bullish sentiment (WAGMI, LFG, moon, etc.)
- Bearish sentiment (rekt, rug pull, dump, etc.)
- Neutral sentiment (sideways, choppy, etc.)
