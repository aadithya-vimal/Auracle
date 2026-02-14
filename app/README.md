# Auracle — Trustless Sentiment Oracle Protocol

> **A decentralized, AI-powered sentiment analysis oracle that ingests 10,000+ social signals, filters them through a multi-stage content analysis engine, and publishes verified scores directly to the Solana blockchain. The frontend reads on-chain data only — no backend API, no intermediary, fully trustless.**

---

## Table of Contents

- [The Problem](#the-problem)
- [Our Solution](#our-solution)
- [Architecture](#architecture)
- [Content Analysis Engine](#content-analysis-engine)
- [Tech Stack](#tech-stack)
- [Pipeline Detail](#pipeline-detail)
- [Bot Detection](#bot-detection)
- [Spam Filtering](#spam-filtering)
- [Quality Scoring](#quality-scoring)
- [AI Sentiment Analysis](#ai-sentiment-analysis)
- [Blockchain Settlement](#blockchain-settlement)
- [Trustless Frontend](#trustless-frontend)
- [Security Model](#security-model)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Screenshots & Features](#screenshots--features)
- [Future Work](#future-work)
- [License](#license)

---

## The Problem

Crypto traders and protocols rely on sentiment analysis from centralized sources — APIs, dashboards, newsletters, and social analytics tools controlled by single entities. These sources suffer from critical vulnerabilities:

1. **Manipulable**: Bot armies and spam campaigns can distort sentiment signals
2. **Opaque**: No way to verify how scores are calculated or what data they're based on
3. **Centralized**: Single points of failure — if the API goes down, the data disappears
4. **Unverifiable**: No cryptographic proof that the data hasn't been tampered with
5. **No on-chain presence**: Sentiment data can't be consumed by smart contracts or DeFi protocols

There is currently **no trustless, verifiable, manipulation-resistant way** to consume market sentiment on-chain.

---

## Our Solution

**Auracle** is a decentralized oracle protocol with a complete pipeline:

```
10,000+ Social Signals
        │
        ▼
┌─────────────────────────────┐
│  CONTENT ANALYSIS ENGINE    │
│  ┌───────────────────────┐  │
│  │ Stage 1: Bot Detection│  │
│  │ Stage 2: Spam Filter  │  │
│  │ Stage 3: Dedup        │  │
│  │ Stage 4: Quality Score│  │
│  └───────────────────────┘  │
└─────────────┬───────────────┘
              │ Clean, filtered tweets only
              ▼
┌─────────────────────────────┐
│  GROQ AI INFERENCE          │
│  Meta LLama 3 (70B params)  │
│  Sub-100ms sentiment score  │
└─────────────┬───────────────┘
              │ Score (0-100)
              ▼
┌─────────────────────────────┐
│  SOLANA BLOCKCHAIN          │
│  Anchor Program             │
│  Ed25519 signed transaction │
│  Immutable on-chain record  │
└─────────────┬───────────────┘
              │ JSON-RPC read
              ▼
┌─────────────────────────────┐
│  REACT DASHBOARD            │
│  Direct blockchain read     │
│  No backend API             │
│  Fully trustless            │
└─────────────────────────────┘
```

---

## Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                        ORACLE AGENT (Python)                          │
│                                                                       │
│  ┌─────────────┐    ┌──────────────────────┐    ┌──────────────────┐ │
│  │   Tweet      │    │  Content Analysis    │    │  Groq API        │ │
│  │   Generator  │───►│  Engine              │───►│  LLama 3 70B    │ │
│  │   (10K+)     │    │  (4-stage pipeline)  │    │  (sub-100ms)    │ │
│  └─────────────┘    └──────────────────────┘    └────────┬─────────┘ │
│                                                           │           │
│                      ┌────────────────────────────────────┘           │
│                      │                                                │
│                      ▼                                                │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  Solana Transaction Builder                                       │ │
│  │  - Anchor instruction (update_sentiment)                          │ │
│  │  - Ed25519 signing with oracle keypair                           │ │
│  │  - Submit to Solana Devnet                                       │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
                           │
                           │ On-chain data
                           ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       SOLANA PROGRAM (Rust/Anchor)                    │
│                                                                       │
│  Account Data:                                                        │
│  ├── score: u8 (0-100)                                               │
│  ├── last_updated: i64 (Unix timestamp)                              │
│  └── oracle: Pubkey (authorized signer)                              │
│                                                                       │
│  Instructions:                                                        │
│  ├── initialize_sentiment(oracle: Pubkey)                            │
│  └── update_sentiment(new_score: u8)  [oracle-only]                  │
└───────────────────────────────────────────────────────────────────────┘
                           │
                           │ JSON-RPC
                           ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       REACT DASHBOARD                                 │
│                                                                       │
│  - Reads sentiment account via Solana JSON-RPC                       │
│  - Deserializes account data in the browser                          │
│  - No backend API — direct blockchain client                         │
│  - Analysis log served as static JSON                                │
│  - Wallet integration (Phantom/Solflare)                             │
│  - Custom cursor, scroll animations, pipeline visualization          │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Content Analysis Engine

The **Content Analysis Engine** is a multi-stage pipeline that filters every batch of tweets before they reach the AI for scoring. This is the core innovation that makes Auracle resistant to manipulation.

### Why It Matters

Without content filtering, bot armies could flood the corpus with bullish or bearish tweets and distort the sentiment score. The engine ensures that only genuine, high-quality signals influence the final score.

### Pipeline Stages

```
Raw Batch (200 tweets)
    │
    ├── Stage 1: Bot Detection
    │   ├── Uppercase ratio analysis (>60% = suspicious)
    │   ├── Emoji density check (>5 emojis = suspicious)
    │   ├── Exclamation frequency (>4 = suspicious)
    │   ├── Account age verification (<14 days = suspicious)
    │   ├── Follower count check (<10 = suspicious)
    │   ├── Engagement ratio analysis
    │   └── Pre-computed bot probability score
    │
    ├── Stage 2: Spam Filtering
    │   ├── Phishing URL detection (.xyz, .scam domains)
    │   ├── Giveaway scam patterns
    │   ├── Fake airdrop detection
    │   ├── Promotional spam templates
    │   └── Scam link identification
    │
    ├── Stage 3: Duplicate Detection
    │   ├── MD5 content hashing
    │   ├── Cross-batch deduplication
    │   └── Copy-paste bot elimination
    │
    └── Stage 4: Quality Scoring
        ├── Tweet length analysis
        ├── Engagement weighting
        ├── Account verification bonus
        ├── Outlier detection (whale alerts, breaking news)
        └── Quality score: 0.0 - 1.0
    │
    ▼
Clean tweets → Groq AI (only high-quality signals)
```

---

## Tech Stack

| Layer | Technology | Purpose | Details |
|-------|-----------|---------|---------|
| **Data Corpus** | Python, JSON | 10,000+ social signals | Stratified sampling, engagement metrics, account metadata |
| **Tweet Generator** | Python 3.10+ | Dynamic corpus generation | Organic (55%), bots (15%), spam (10%), outliers (8%), noise (12%) |
| **Content Engine** | Python, hashlib | Multi-stage analysis | Bot detection, spam filtering, dedup, quality scoring |
| **AI Inference** | Groq API, LLama 3 70B | Sentiment scoring | Sub-100ms inference, 0-100 score, keyword extraction |
| **Smart Contract** | Solana, Anchor, Rust | On-chain storage | Authorized oracle updates, immutable records |
| **Frontend** | React 18, Vite, Framer Motion | Trustless dashboard | Direct RPC reads, wallet integration, live visualization |
| **Charting** | Recharts | Score history | Real-time area chart from on-chain data |
| **Icons** | Lucide React | UI elements | Bot/spam/outlier indicators, pipeline icons |
| **Wallet** | Phantom / Solflare | Blockchain interaction | Devnet connection, future governance |

---

## Pipeline Detail

### Every 30 Seconds:

1. **DATA INGESTION** — Sample 200 tweets from the 10,000+ corpus using random sampling
2. **BOT DETECTION** — Analyze each tweet for bot indicators (caps ratio, emoji density, account age, engagement patterns)
3. **SPAM FILTERING** — Check against known phishing patterns, scam URLs, and promotional spam templates
4. **DUPLICATE DETECTION** — MD5 hash each tweet's content and check against seen hashes across all cycles
5. **QUALITY SCORING** — Score each remaining tweet on a 0-1 scale based on length, engagement, and account quality
6. **AI INFERENCE** — Send clean tweets to Groq API (Meta LLama 3, 70B parameters) for sentiment analysis
7. **KEYWORD EXTRACTION** — Extract bullish/bearish keywords with weighted impact scores from clean tweets
8. **ANALYSIS LOG** — Write comprehensive JSON log with per-tweet annotations, engine stats, and pipeline metrics
9. **BLOCKCHAIN COMMIT** — Sign transaction with oracle keypair (Ed25519) and submit to Solana program
10. **WAIT** — Sleep 30 seconds and repeat

---

## Bot Detection

The bot detection system uses **7 independent signals** to classify each tweet:

| Signal | Threshold | Weight | Description |
|--------|-----------|--------|-------------|
| Uppercase Ratio | >60% | 0.25 | Bots tend to use ALL CAPS for maximum visibility |
| Emoji Density | >5 emojis | 0.20 | Excessive emoji usage indicates automated content |
| Exclamation Spam | >4 per tweet | 0.15 | "BUY NOW!!!" patterns common in bot campaigns |
| Account Age | <14 days | 0.20 | Freshly created accounts with suspicious activity |
| Follower Count | <10 | 0.15 | Bot accounts typically have very few real followers |
| Engagement Ratio | <0.001 | 0.10 | Low likes/followers ratio suggests fake followers |
| Pre-computed Score | >0.70 | 0.30 | Corpus-level bot probability from generation |

A tweet is classified as **bot-generated** if the combined score exceeds **0.45** (45% confidence threshold).

---

## Spam Filtering

The spam filter checks against a curated library of known scam patterns:

- **Phishing URLs**: `.xyz`, `.scam`, `fakelink` domains
- **Fake Airdrops**: "Claim your FREE SOL" patterns
- **Giveaway Scams**: "Send 1 get 10 back" schemes
- **Pump Promotions**: "1000x guaranteed" claims
- **Recovery Scams**: Fake crypto recovery services

A tweet is classified as **spam** if it matches ≥2 patterns OR contains a suspicious URL.

---

## Quality Scoring

Each tweet receives a quality score from 0.0 to 1.0:

| Factor | Score Modifier | Reasoning |
|--------|---------------|-----------|
| Length > 50 chars | +0.15 | Substantive content more likely to reflect genuine sentiment |
| Length > 100 chars | +0.10 | Detailed analysis even more valuable |
| Length < 10 chars | -0.30 | "sol" or "gm" provides no sentiment signal |
| Likes > 100 | +0.15 | Community validation of the content |
| Likes > 1000 | +0.10 | Viral content carries significant weight |
| Verified Account | +0.20 | Verified users provide higher-signal content |
| Followers > 5000 | +0.10 | Established accounts are more reliable |

Tweets with quality score **< 0.3** are excluded from sentiment analysis.

---

## AI Sentiment Analysis

After content filtering, clean tweets are sent to **Groq API** for analysis:

- **Model**: Meta LLama 3 (70B parameter model)
- **Speed**: Sub-100ms inference (10x faster than GPT-4)
- **Temperature**: 0.3 (low variance for consistent scoring)
- **Output**: Single integer 0-100 (clamped to valid range)
- **Fallback**: If Groq is unavailable, keyword-based fallback scoring

### Scoring Guide:
| Range | Label | Description |
|-------|-------|-------------|
| 0-20 | Extremely Bearish | Rug pulls, crashes, fear, liquidations |
| 21-40 | Bearish | Selling pressure, caution, negative outlook |
| 41-60 | Neutral | Mixed signals, uncertainty, sideways market |
| 61-80 | Bullish | Buying pressure, optimism, positive momentum |
| 81-100 | Extremely Bullish | WAGMI, moon, mass adoption, ETF approvals |

---

## Blockchain Settlement

The sentiment score is committed to Solana via an **Anchor smart contract**:

```rust
pub fn update_sentiment(ctx: Context<UpdateSentiment>, new_score: u8) -> Result<()> {
    let sentiment = &mut ctx.accounts.sentiment_account;
    require!(
        ctx.accounts.oracle.key() == sentiment.oracle,
        ErrorCode::Unauthorized
    );
    sentiment.score = new_score;
    sentiment.last_updated = Clock::get()?.unix_timestamp;
    Ok(())
}
```

### Key Security Properties:
- **Oracle Authority**: Only the authorized oracle keypair can update the score
- **Immutable History**: Every update is a permanent on-chain record
- **Cryptographic Proof**: Ed25519 signature proves origin of every update
- **Auditable**: Full transaction history visible on Solana Explorer

---

## Trustless Frontend

The React dashboard connects to Solana **directly via JSON-RPC**, not through any backend API:

```javascript
const accountInfo = await connection.getAccountInfo(pubkey)
const score = accountInfo.data[8] // Read score byte directly
```

This means:
- **No backend server** between the user and the blockchain
- **No API keys** needed for reading data
- **No intermediary** that could modify or censor the data
- **Direct verification**: Any user can independently verify the score
- The analysis log is a **static JSON file** served from the public directory

---

## Security Model

| Threat | Mitigation |
|--------|-----------|
| Bot manipulation | Multi-signal bot detection (7 independent indicators) |
| Spam campaigns | Pattern-based spam filtering with URL analysis |
| Duplicate flooding | MD5 content hashing with cross-cycle deduplication |
| Low-quality noise | Quality scoring with minimum threshold (0.3) |
| Oracle compromise | On-chain authority check — only authorized keypair can update |
| Frontend tampering | Read-only frontend — cannot modify on-chain data |
| Replay attacks | Content hashing prevents duplicate submissions |
| Data censorship | Blockchain data is permanent and publicly accessible |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- Phantom or Solflare wallet (set to Devnet)
- Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Install Frontend

```bash
cd app
npm install
```

### 2. Install Oracle Dependencies

```bash
cd oracle
pip install groq solana solders python-dotenv requests
```

### 3. Generate Tweet Corpus

```bash
cd oracle
python tweet_generator.py
# Generates 10,000 tweets → mock_data.json
```

### 4. Configure Environment

Create `oracle/.env`:

```env
GROQ_API_KEY=your_groq_api_key
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=DgjQCmPvs3FHSk3DdPskVy6zifMC93LqWe3en7jEmtzF
ORACLE_PRIVATE_KEY=your_solana_wallet_private_key_as_array
SENTIMENT_ACCOUNT=4RgDj27rUJiQRyP3Hx4RzEoK1afks9PrVr52rgThNK9W
```

### 5. Run Both Processes

**Terminal 1 — Frontend:**
```bash
cd app
npm run dev
```

**Terminal 2 — Oracle Agent:**
```bash
cd oracle
python oracle_agent.py
```

### 6. Open Dashboard

Navigate to **http://localhost:5173** and connect your wallet (Devnet).

---

## Project Structure

```
Auracle/
├── app/                                # React frontend (trustless dashboard)
│   ├── src/
│   │   ├── App.jsx                     # Main dashboard (~550 lines)
│   │   │   ├── Custom cursor hook      # Trailing glow with hover states
│   │   │   ├── Scroll reveal hook      # Intersection observer animations
│   │   │   ├── Animated counter        # Cubic ease-out score animation
│   │   │   ├── Hero section            # Title, stats, badge
│   │   │   ├── Pipeline visualization  # 5-step animated flow
│   │   │   ├── Engine results          # Bot/spam/clean/outlier stats
│   │   │   ├── Hazard alerts           # Bot accounts & spam warnings
│   │   │   ├── Live dashboard          # Score orb, metrics, chain status
│   │   │   ├── Keyword cloud           # Weighted sentiment drivers
│   │   │   ├── Impact analysis         # Top signals with weights
│   │   │   ├── Tweet matrix            # 40-row classified data feed
│   │   │   ├── Data lab                # Score history chart
│   │   │   ├── Cumulative stats        # Lifetime engine metrics
│   │   │   ├── Architecture deep dive  # 6 detailed tech cards
│   │   │   └── Footer                  # Tech stack display
│   │   ├── App.css                     # Component styles (~800 lines)
│   │   ├── index.css                   # Design system, cursor, animations
│   │   ├── main.jsx                    # Entry point with wallet providers
│   │   └── idl.json                    # Anchor IDL for program interaction
│   └── public/
│       └── analysis_log.json           # Generated by oracle (auto-updated)
│
├── oracle/                             # Python oracle agent
│   ├── oracle_agent.py                 # Main agent with analysis engine (~400 lines)
│   │   ├── ContentAnalysisEngine       # 4-stage content analysis
│   │   │   ├── Bot Detection           # Multi-signal bot classifier
│   │   │   ├── Spam Filtering          # Pattern-based spam filter
│   │   │   ├── Duplicate Detection     # MD5 content hashing
│   │   │   └── Quality Scoring         # 0-1 quality assessment
│   │   └── AuracleOracle              # Main oracle class
│   │       ├── Data ingestion          # Batch sampling from corpus
│   │       ├── Keyword extraction      # Bullish/bearish impact analysis
│   │       ├── Groq AI integration     # LLama 3 sentiment scoring
│   │       ├── Analysis log generation # Comprehensive JSON output
│   │       └── On-chain commit         # Solana transaction builder
│   ├── tweet_generator.py              # 10K tweet corpus generator (~250 lines)
│   │   ├── Bullish templates (30)
│   │   ├── Bearish templates (25)
│   │   ├── Neutral templates (15)
│   │   ├── Bot templates (10)
│   │   ├── Spam templates (10)
│   │   ├── Outlier templates (10)
│   │   └── Engagement & account metadata generation
│   ├── mock_data.json                  # Generated corpus (10,000 tweets)
│   ├── .env                            # Configuration (not committed)
│   └── .env.example                    # Template for setup
│
├── program/                            # Anchor smart contract (Rust)
│   ├── src/lib.rs                      # Solana program logic
│   ├── Anchor.toml                     # Anchor configuration
│   └── Cargo.toml                      # Rust dependencies
│
├── .gitignore                          # Excludes .env, node_modules, etc.
└── README.md                           # This file
```

---

## Screenshots & Features

### Live Pipeline Visualization
- 5-step animated flow showing data movement from ingestion to dashboard
- Each step has icon, detailed description, and technology tags
- Active stage highlighting during refresh cycles

### Content Analysis Engine Display
- Real-time statistics: clean tweets, bots detected, spam filtered, outliers, duplicates
- Pipeline stage performance bars with millisecond timing
- Bot account alerts with usernames, confidence scores, and detection reasons
- Spam alerts with phishing type and content preview
- Quality distribution bar (high/medium/low)

### Tweet Matrix
- 40-row classified data feed with per-tweet badges (BOT / SPAM / OUTLIER / CLEAN)
- Color-coded rows: orange for bots, red for spam, yellow for outliers, green for clean
- Username, text preview, sentiment classification, and quality score per row
- Hover animations with horizontal slide effect

### Score Dashboard
- Animated score orb with dynamic color (red→orange→yellow→green)
- Confidence meter, velocity indicator, corpus size, batch size
- On-chain status panel (network, program, account, wallet, cycle count)
- Keyword cloud with weighted sizing
- Impact analysis with positive/negative signal breakdown

### Architecture Deep Dive
- 6 detailed cards explaining each layer of the stack
- Colored top-border reveal on hover with upward float animation
- Technology tags per card
- Full paragraph descriptions for hackathon judges

---

## Future Work

- **Live Twitter/X Integration**: Replace synthetic corpus with real-time social data feeds
- **Multi-asset Support**: Extend sentiment analysis to ETH, BTC, and other major assets
- **On-chain History**: Store historical scores for time-series analysis via program extensions
- **Governance**: Token-weighted voting for oracle parameter adjustments
- **Cross-chain**: Deploy oracle output to EVM chains via Wormhole bridge
- **Alert System**: Push notifications when sentiment crosses critical thresholds
- **Decentralized Oracle Network**: Multiple oracle operators with consensus mechanism

---

## License

MIT — Built for Solana Hackathon. Educational purposes.
