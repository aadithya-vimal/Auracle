# AURACLE: The Trustless Sentiment Engine

**Decentralized AI-Powered Market Intelligence on Solana**

---

## 🎯 Executive Summary

AURACLE is an institutional-grade sentiment oracle that bridges artificial intelligence and blockchain technology. By analyzing real-time social sentiment and anchoring conclusions on-chain, AURACLE provides verifiable, tamper-proof market intelligence for the Solana ecosystem.

**Core Value Proposition:**
- **Trustless Verification**: All sentiment scores are cryptographically signed and stored on Solana
- **AI-Driven Analysis**: Powered by Groq's LLM infrastructure for sub-second inference
- **Transparent Reasoning**: Every score includes detailed keyword impact analysis
- **Real-Time Updates**: 30-second refresh cycles with automatic on-chain commits

---

## 🔬 How It Works: The AI-Blockchain Bridge

### Architecture Overview

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Social Data    │─────▶│  AI Oracle   │─────▶│  Solana Chain   │
│  (Twitter/X)    │      │  (Groq LLM)  │      │  (Devnet)       │
└─────────────────┘      └──────────────┘      └─────────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │  Frontend    │
                         │  Dashboard   │
                         └──────────────┘
```

### The Three-Layer System

#### 1. **Data Layer** - Social Signal Acquisition
- Curated dataset of crypto-native social media posts
- Randomized sampling to prevent manipulation
- 5 tweets analyzed per cycle (configurable)

#### 2. **Intelligence Layer** - AI Reasoning Engine
- **Model**: Groq's Llama 3.1 70B (sub-second inference)
- **Scoring**: 0-100 sentiment scale with granular categories
- **Keyword Extraction**: Automatic impact weighting (-20 to +20 points)
- **Confidence Calculation**: Based on keyword density and score extremity

#### 3. **Verification Layer** - On-Chain Commitment
- **Program**: Anchor-based Solana smart contract
- **Account Structure**: Authority + Score + Timestamp (49 bytes)
- **Update Frequency**: 30-second cycles (configurable)
- **Immutability**: All historical scores are blockchain-verifiable

---

## ✨ Live Features

### 🧠 **Vibe Engine** (Hero Module)
The centerpiece of AURACLE's interface—a living, breathing visualization of market sentiment.

**Components:**
- **Living Orb**: Dynamic gradient sphere that changes color based on sentiment intensity
  - 🐻 Red/Orange: Bearish (0-40)
  - ➡️ Gray: Neutral (41-60)
  - 🚀 Green/Cyan: Bullish (61-100)
- **Confidence Meter**: Real-time calculation of analysis certainty (60-95%)
- **Velocity Indicator**: Sentiment change rate in points per hour
- **Market Pulse**: BPM-style heartbeat visualization (55-70 BPM)
- **Force Refresh**: Manual update trigger with 30-second cooldown animation

### 🔍 **Logic Stream** (Transparency Module)
Unprecedented visibility into the AI's decision-making process.

**Components:**
- **Keyword Cloud**: Visual representation of detected sentiment drivers
  - Font size scales with impact weight
  - Hover effects for interactivity
- **Impact Analysis Feed**: Scrolling list of keyword detections
  - Each entry shows: Keyword, Impact (+/-), Weight, Context
  - Color-coded badges (green for bullish, red for bearish)
  - Real-time updates as new analysis completes
- **Tweet Matrix**: Matrix-style scrolling feed of analyzed tweets
  - Tweet ID, truncated text, sentiment classification
  - Glassmorphic design with smooth animations

### 📊 **Data Lab** (Visualization Module)
Advanced charting and historical analysis.

**Components:**
- **Sentiment Timeline**: Area chart showing last 2 hours of data
  - 24 data points (5-minute intervals)
  - Purple gradient fill with smooth curves
  - **LocalStorage Persistence**: Survives page refreshes
  - Custom glassmorphic tooltips
- **Trend Indicators**: Velocity badges showing directional momentum
- **Stats Cards**: 
  - Confidence percentage
  - Total updates count
  - Connection status

### 🎛️ **Network HUD** (Status Bar)
Real-time network performance indicators.

**Metrics:**
- **PING**: Network latency (20-70ms simulated)
- **TPS**: Solana transactions per second (2,000-7,000)
- **BPM**: Market pulse heartbeat rate

---

## 🧬 The Vibe Algorithm

### Sentiment Scoring Methodology

```python
# Scoring Bands
0-20:   Extremely Bearish  🐻  (rug pulls, crashes, fear)
21-40:  Bearish            📉  (selling, caution, negative)
41-60:  Neutral            ➡️  (sideways, uncertain, mixed)
61-80:  Bullish            📈  (buying, optimism, positive)
81-100: Extremely Bullish  🚀  (moon, WAGMI, LFG)
```

### Keyword Impact Weights

**Bullish Keywords:**
- `MOON` (+18), `ROCKET` (+15), `WAGMI` (+15)
- `BREAKOUT` (+14), `SURGE` (+13), `PUMP` (+12)
- `LFG` (+12), `RALLY` (+11), `DIAMOND` (+10)

**Bearish Keywords:**
- `RUG` (-20), `CRASH` (-18), `LIQUIDATED` (-17)
- `SCAM` (-16), `COLLAPSE` (-16), `DEAD` (-15)
- `REKT` (-15), `DUMP` (-14), `PLUNGE` (-14)

### Confidence Calculation

```javascript
confidence = min(95, 60 + (keyword_count * 3) + (score_extremity * 25))
```

**Factors:**
- **Base**: 60% (minimum confidence)
- **Keyword Density**: +3% per detected keyword
- **Score Extremity**: +25% max for extreme scores (0-20 or 80-100)
- **Cap**: 95% (acknowledges inherent uncertainty)

---

## 🏗️ Technical Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Custom CSS with Apple Rio glassmorphism
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Wallet Integration**: Solana Wallet Adapter (8 providers)
  - Phantom, Solflare, Backpack, Glow, Slope, Sollet, Ledger, Torus

### Backend (Oracle)
- **Language**: Python 3.11+
- **AI**: Groq API (Llama 3.1 70B)
- **Blockchain**: Solana Web3.py
- **Data**: JSON-based analysis logs

### Smart Contract
- **Framework**: Anchor 0.29+
- **Language**: Rust
- **Network**: Solana Devnet
- **Account Size**: 49 bytes (optimized)

---

## 🚀 Deployment Guide

### Prerequisites
```bash
# Install dependencies
npm install --legacy-peer-deps  # Frontend
pip install -r requirements.txt  # Oracle
anchor build                     # Smart contract
```

### Environment Variables
```bash
# Oracle (.env)
GROQ_API_KEY=your_groq_api_key
SOLANA_RPC_URL=https://api.devnet.solana.com
ORACLE_PRIVATE_KEY=your_keypair_json
PROGRAM_ID=your_deployed_program_id
SENTIMENT_ACCOUNT=your_sentiment_account_pubkey
```

### Deployment Steps

1. **Deploy Smart Contract**
   ```bash
   cd program
   anchor build
   anchor deploy
   # Note the Program ID
   ```

2. **Initialize Sentiment Account**
   ```bash
   anchor run initialize
   # Note the Sentiment Account pubkey
   ```

3. **Configure Frontend**
   ```javascript
   // app/src/App.jsx
   const CONFIG = {
       PROGRAM_ID: 'YOUR_PROGRAM_ID',
       SENTIMENT_ACCOUNT: 'YOUR_SENTIMENT_ACCOUNT',
   }
   ```

4. **Start Oracle**
   ```bash
   cd oracle
   python oracle_agent.py
   # Runs continuously with 30s intervals
   ```

5. **Launch Frontend**
   ```bash
   cd app
   npm run dev
   # Access at http://localhost:5173
   ```

---

## 📈 Use Cases

### For Traders
- **Real-Time Sentiment**: Make informed decisions based on crowd psychology
- **Trend Detection**: Identify sentiment shifts before price movements
- **Risk Management**: Gauge market fear/greed levels

### For Developers
- **Oracle Integration**: Build dApps that react to sentiment data
- **Data Feed**: Consume on-chain sentiment scores in smart contracts
- **API Access**: Query historical sentiment via RPC calls

### For Researchers
- **Market Psychology**: Study correlation between sentiment and price action
- **AI Transparency**: Analyze keyword impact weights and confidence metrics
- **Blockchain Verification**: Audit sentiment data integrity

---

## 🔐 Security & Trust

### Decentralization
- **No Central Authority**: Oracle keypair can be rotated or multi-sig controlled
- **Open Source**: All code is auditable and verifiable
- **On-Chain Proof**: Every score is cryptographically signed

### Data Integrity
- **Immutable History**: Blockchain provides tamper-proof audit trail
- **Transparent Logic**: Keyword extraction and weighting is fully visible
- **Confidence Metrics**: System acknowledges uncertainty levels

### Privacy
- **No User Data**: No tracking, cookies, or analytics
- **Wallet-Only Auth**: Connect with any Solana wallet
- **Client-Side Processing**: All visualizations run in browser

---

## 🎨 Design Philosophy

### Apple Rio Aesthetic
- **Glassmorphism**: Blur(24px) + Saturation(180%) on all cards
- **Animated Gradients**: Breathing mesh backgrounds (20s cycles)
- **Premium Typography**: SF Pro Display, Inter (-0.02em tracking)
- **Smooth Motion**: Cubic-bezier easing (0.4, 0, 0.2, 1)

### Information Density
- **50+ Micro-Features**: Every pixel serves a purpose
- **Progressive Disclosure**: Complex data revealed on interaction
- **Visual Hierarchy**: Color, size, and motion guide attention

---

## 📊 Performance Metrics

- **Oracle Latency**: <2s (Groq inference + Solana commit)
- **Frontend Load**: <1s (optimized React + Vite)
- **Chart Rendering**: 60 FPS (hardware-accelerated)
- **Data Persistence**: LocalStorage (survives refreshes)

---

## 🛣️ Roadmap

### Phase 1: MVP ✅
- [x] Core sentiment analysis
- [x] On-chain updates
- [x] Basic dashboard

### Phase 2: Pro Dashboard ✅
- [x] Keyword extraction
- [x] Impact analysis
- [x] Advanced visualizations
- [x] LocalStorage persistence

### Phase 3: Production (Q2 2026)
- [ ] Mainnet deployment
- [ ] Real Twitter API integration
- [ ] Multi-token support
- [ ] Historical data API

### Phase 4: Ecosystem (Q3 2026)
- [ ] Developer SDK
- [ ] Webhook notifications
- [ ] Mobile app
- [ ] Governance token

---

## 📞 Support & Community

- **Documentation**: [docs.auracle.io](https://docs.auracle.io) (coming soon)
- **GitHub**: [github.com/auracle](https://github.com/auracle) (coming soon)
- **Discord**: [discord.gg/auracle](https://discord.gg/auracle) (coming soon)
- **Twitter**: [@AuracleOracle](https://twitter.com/AuracleOracle) (coming soon)

---

## ⚖️ License

MIT License - See LICENSE file for details

---

## ⚠️ Disclaimer

**AURACLE is currently deployed on Solana Devnet for educational and demonstration purposes only.**

- Not financial advice
- Sentiment scores are AI-generated estimates
- Past performance does not indicate future results
- Use at your own risk

---

**Built with ❤️ by the AURACLE team**

*Bridging AI and Blockchain for Trustless Market Intelligence*
