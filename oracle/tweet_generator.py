#!/usr/bin/env python3
"""
Auracle Tweet Generator — Dynamic Corpus Engine
Generates 10,000+ synthetic tweets with realistic patterns including:
- Normal organic tweets (bullish/bearish/neutral)
- Bot accounts (repetitive patterns, copy-paste, coordinated timing)
- Spam tweets (phishing links, giveaway scams, pump-and-dump)
- Outliers (extreme sentiment, whale alerts, breaking news)
"""

import random
import json
import hashlib
import time
from datetime import datetime, timedelta

# ============================================================================
# TEMPLATE BANKS
# ============================================================================

BULLISH_TEMPLATES = [
    "$SOL looking incredibly strong at this level. Accumulation phase is over.",
    "If you're not buying $SOL right now, you'll regret it in 6 months. NFA.",
    "Just added more $SOL to my portfolio. The ecosystem growth is undeniable.",
    "Solana TPS just hit a new ATH. This chain is the future of DeFi.",
    "$SOL breakout imminent. Chart pattern is textbook ascending triangle.",
    "The amount of building happening on Solana is insane. Been deploying all week.",
    "Smart money is rotating into $SOL. On-chain data doesn't lie.",
    "Another day, another protocol launching on Solana. Ecosystem is thriving.",
    "$SOL to $500 is not a meme. Fundamentals are stronger than ever.",
    "Solana DeFi TVL just crossed $8B. Massive inflows from Ethereum.",
    "Just bridged everything to Solana. Speed and cost are unmatched.",
    "Solana's Firedancer client will be a game changer. Multi-client future.",
    "$SOL staking rewards looking juicy. Passive income while we pump.",
    "Institutional interest in Solana is accelerating. Grayscale adding exposure.",
    "The Solana phone was genius. Mobile-first crypto is the play.",
    "Solana NFT volume surpassing ETH on multiple days now. Bullish.",
    "Every dip is getting bought up aggressively. $SOL holders are diamond hands.",
    "Solana hackathon projects are incredible this season. So much innovation.",
    "Transaction fees on Solana: $0.00025. On Ethereum: $15. Easy choice.",
    "$SOL weekly chart is the most bullish setup I've seen in months.",
    "WAGMI Solana fam. This cycle belongs to us.",
    "LFG! Solana ecosystem is absolutely cooking right now.",
    "Solana validators just hit 2000+. Decentralization getting stronger.",
    "$SOL is the most asymmetric bet in crypto right now.",
    "Dev activity on Solana growing 40% QoQ. Build season is here.",
    "Just tried Solana Pay at a coffee shop. The future is here.",
    "Solana blinks are revolutionary. Social commerce on blockchain.",
    "HODL $SOL. We're still early in this cycle.",
    "Pump.fun on Solana doing $2M/day in revenue. Ecosystem cash flow is real.",
    "Solana compressed NFTs are 1000x cheaper. State compression is genius.",
]

BEARISH_TEMPLATES = [
    "Solana went down again for 3 hours. How is this acceptable?",
    "Sell your $SOL before it's too late. Bear market is coming.",
    "Another Solana outage. I'm done with this chain. Moving to ETH.",
    "$SOL dumping hard. Support at $80 won't hold.",
    "Solana validators are way too centralized. Top 19 control the network.",
    "The amount of rugs on Solana is embarrassing. Every token is a scam.",
    "Just got liquidated on a $SOL long. This market is brutal.",
    "Fear index is at extreme levels. $SOL could easily see $50.",
    "$SOL selling pressure is relentless. Whales are unloading bags.",
    "Solana's clock drift issues still aren't fixed. Fundamental problem.",
    "Network congestion on Solana making it unusable. Priority fees are insane.",
    "Bear market vibes. $SOL losing key support levels one by one.",
    "Solana TVL dropping as users flee to other chains. Not looking good.",
    "Crash incoming. $SOL daily RSI showing severe bearish divergence.",
    "Another exploit on a Solana DeFi protocol. Security is a joke.",
    "Solana token unlocks are going to create massive sell pressure.",
    "Dead cat bounce on $SOL. Don't fall for it.",
    "The Solana phone was a flop. Hardware play was a mistake.",
    "Solana spam transactions clogging the network. UX is terrible.",
    "$SOL is going to zero. Ethereum has already won L1 wars.",
    "Panic selling across the board. $SOL down 15% this week.",
    "Solana ecosystem is mostly memecoins. No real utility being built.",
    "Just sold all my $SOL. Risk-reward doesn't make sense anymore.",
    "Collapse of major Solana lending protocol drags TVL down further.",
    "Plunge in Solana DEX volume. Users are leaving.",
]

NEUTRAL_TEMPLATES = [
    "$SOL consolidating at current levels. Waiting for a clear direction.",
    "Market is completely sideways. No conviction either way on $SOL.",
    "Solana ecosystem update: mixed signals. Some growth, some concerns.",
    "Watching $SOL price action closely. Could go either way from here.",
    "$SOL stuck in a range. Need a catalyst for the next move.",
    "Solana vs Ethereum debate continues. Both have their strengths.",
    "Not adding more $SOL but not selling either. Sitting on hands.",
    "Market structure for $SOL is uncertain. Key levels to watch: $90, $120.",
    "Interesting developments on Solana but macro is still a question mark.",
    "Volume declining on $SOL pairs. Uncertainty in the market.",
    "Solana upgrade going live next week. Let's see how it plays out.",
    "DCA into $SOL continues. Not timing the market, just building position.",
    "Crypto market overall feels undecided. $SOL following BTC closely.",
    "Technical analysis on $SOL showing conflicting signals across timeframes.",
    "Waiting for Solana's next earnings... I mean, next ecosystem report.",
]

# Bot-specific templates (repetitive, copy-paste patterns)
BOT_TEMPLATES = [
    "Buy $SOL now! 100x potential! Don't miss out! #Solana #Crypto #Moon",
    "BREAKING: $SOL about to explode!! RT and follow for more alpha!!",
    "I just made $50,000 trading $SOL in one day! DM me for my strategy!",
    "$SOL $SOL $SOL TO THE MOON!!! BUY BUY BUY!!!",
    "URGENT: $SOL whale alert! 500M tokens moved! Pump incoming!!!",
    "Follow me for FREE crypto signals! $SOL call was 10x! Next one loading...",
    "GM GM GM! $SOL army rise up! We eating good today!!! 🚀🚀🚀",
    "Just mass buying $SOL. This is financial advice. Trust me bro.",
    "SOLANA WILL HIT $10000 BY END OF YEAR GUARANTEED NO CAP FR FR",
    "My uncle works at Solana Labs and he said big announcement coming!!!",
]

# Spam templates (phishing, scams)
SPAM_TEMPLATES = [
    "Claim your FREE $SOL airdrop here: scamlink.xyz/free-sol",
    "GIVEAWAY: Send 1 SOL get 10 SOL back! Official Solana event!",
    "Connect wallet at sol-airdrop-official.com for FREE tokens!",
    "Elon Musk just invested in Solana! Claim bonus: fakelink.net",
    "URGENT: Solana foundation giving away 1M SOL. Link in bio.",
    "Your wallet has been selected for a $SOL reward. Verify here:",
    "NEW Solana token 1000x guaranteed! Pre-sale at scam.finance",
    "I recovered my lost crypto using recovercrypto.scam. Try it!",
    "Flash loan opportunity: Borrow $SOL at 0% interest. Act NOW!",
    "Solana validator rewards doubled! Stake at fake-validator.sol",
]

# Outlier templates (extreme events, whale alerts)
OUTLIER_TEMPLATES = [
    "BREAKING: SEC approves Solana ETF. This changes everything for $SOL.",
    "WHALE ALERT: 50,000,000 $SOL transferred to Coinbase. Massive sell incoming?",
    "JUST IN: Visa announces Solana integration for global payments.",
    "EMERGENCY: Critical vulnerability found in Solana runtime. Patch deploying.",
    "BREAKING: BlackRock files for Solana ETF. Institutional flood gates opening.",
    "ALERT: Solana network halted. All transactions frozen. Validators investigating.",
    "MASSIVE: JPMorgan tokenizes $500M in assets on Solana blockchain.",
    "BREAKING: Solana flips Ethereum in daily active addresses for first time.",
    "WHALE ALERT: Unknown wallet accumulates 2% of entire $SOL supply.",
    "JUST IN: Major Solana DeFi protocol hacked for $200M. Funds at risk.",
]

# Username patterns
NORMAL_USERNAMES = [
    "crypto_trader_{}", "sol_maxi_{}", "defi_degen_{}", "nft_collector_{}",
    "blockchain_dev_{}", "web3_builder_{}", "token_analyst_{}", "chain_watcher_{}",
    "solana_fan_{}", "hodler_{}", "whale_tracker_{}", "alpha_seeker_{}",
    "tech_explorer_{}", "market_pulse_{}", "data_miner_{}"
]

BOT_USERNAMES = [
    "x2F8k_bot{}", "signal_master{}", "pump_alert{}", "crypto_gem_{}",
    "free_money_{}", "10x_calls_{}", "moon_boy_{}", "shill_army_{}"
]


def generate_username(is_bot=False, idx=0):
    """Generate a realistic or bot username"""
    if is_bot:
        template = random.choice(BOT_USERNAMES)
    else:
        template = random.choice(NORMAL_USERNAMES)
    return template.format(random.randint(100, 9999))


def generate_tweet_corpus(count=10000):
    """Generate a corpus of synthetic tweets with realistic distribution"""
    tweets = []
    now = datetime.now()

    # Distribution:
    # 55% normal organic (mixed sentiment)
    # 15% bot accounts
    # 10% spam
    # 8% outliers (extreme events)
    # 12% low-quality / noise

    for i in range(count):
        tweet_id = i + 1
        created_at = (now - timedelta(
            hours=random.randint(0, 72),
            minutes=random.randint(0, 59),
            seconds=random.randint(0, 59)
        )).isoformat()

        roll = random.random()

        if roll < 0.25:
            # Bullish organic
            text = random.choice(BULLISH_TEMPLATES)
            if random.random() > 0.5:
                text = text.replace("$SOL", random.choice(["$SOL", "#Solana", "Solana"]))
            category = "organic"
            sentiment_hint = "bullish"
            is_bot = False
            is_spam = False
            bot_score = round(random.uniform(0, 0.15), 3)

        elif roll < 0.45:
            # Bearish organic
            text = random.choice(BEARISH_TEMPLATES)
            if random.random() > 0.5:
                text = text.replace("$SOL", random.choice(["$SOL", "#Solana", "Solana"]))
            category = "organic"
            sentiment_hint = "bearish"
            is_bot = False
            is_spam = False
            bot_score = round(random.uniform(0, 0.15), 3)

        elif roll < 0.55:
            # Neutral organic
            text = random.choice(NEUTRAL_TEMPLATES)
            category = "organic"
            sentiment_hint = "neutral"
            is_bot = False
            is_spam = False
            bot_score = round(random.uniform(0, 0.12), 3)

        elif roll < 0.70:
            # Bot account
            text = random.choice(BOT_TEMPLATES)
            # Bots often repeat with minor variations
            if random.random() > 0.6:
                text = text.upper()
            if random.random() > 0.5:
                text += " " + "".join(random.choices(["🚀", "💰", "📈", "🔥", "💎"], k=random.randint(2, 5)))
            category = "bot"
            sentiment_hint = "manipulated"
            is_bot = True
            is_spam = False
            bot_score = round(random.uniform(0.72, 0.98), 3)

        elif roll < 0.80:
            # Spam / phishing
            text = random.choice(SPAM_TEMPLATES)
            category = "spam"
            sentiment_hint = "spam"
            is_bot = True
            is_spam = True
            bot_score = round(random.uniform(0.85, 0.99), 3)

        elif roll < 0.88:
            # Outlier / breaking news
            text = random.choice(OUTLIER_TEMPLATES)
            category = "outlier"
            sentiment_hint = "extreme"
            is_bot = False
            is_spam = False
            bot_score = round(random.uniform(0, 0.20), 3)

        else:
            # Noise / low quality
            noise_templates = [
                "sol", "$SOL", "lol crypto", "what is solana", "idk about this",
                "anyone here?", "gm", "gn", "...", "hmm", "interesting",
                "wagmi I guess", "ngmi probably", "can someone explain solana",
                "first time buying crypto", "is solana good"
            ]
            text = random.choice(noise_templates)
            category = "noise"
            sentiment_hint = "neutral"
            is_bot = False
            is_spam = False
            bot_score = round(random.uniform(0, 0.3), 3)

        # Add engagement metrics
        if is_bot:
            likes = random.randint(0, 5)
            retweets = random.randint(0, 2)
            replies = random.randint(0, 1)
            followers = random.randint(1, 50)
        elif category == "outlier":
            likes = random.randint(500, 50000)
            retweets = random.randint(200, 10000)
            replies = random.randint(50, 2000)
            followers = random.randint(10000, 500000)
        else:
            likes = random.randint(0, 500)
            retweets = random.randint(0, 100)
            replies = random.randint(0, 50)
            followers = random.randint(50, 50000)

        # Calculate account age (bots tend to be newer)
        if is_bot:
            account_age_days = random.randint(1, 30)
        else:
            account_age_days = random.randint(30, 2000)

        tweet = {
            "id": tweet_id,
            "text": text,
            "username": generate_username(is_bot, i),
            "created_at": created_at,
            "category": category,
            "sentiment_hint": sentiment_hint,
            "engagement": {
                "likes": likes,
                "retweets": retweets,
                "replies": replies
            },
            "account": {
                "followers": followers,
                "account_age_days": account_age_days,
                "verified": random.random() > 0.92 and not is_bot
            },
            "bot_score": bot_score,
            "is_spam": is_spam,
            "content_hash": hashlib.md5(text.encode()).hexdigest()[:8]
        }

        tweets.append(tweet)

    # Shuffle to mix categories
    random.shuffle(tweets)

    # Re-assign IDs after shuffle
    for i, tweet in enumerate(tweets):
        tweet["id"] = i + 1

    return tweets


if __name__ == "__main__":
    print("Generating 10,000 tweet corpus...")
    corpus = generate_tweet_corpus(10000)

    # Stats
    categories = {}
    for t in corpus:
        cat = t["category"]
        categories[cat] = categories.get(cat, 0) + 1

    print(f"\nCorpus Statistics:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count} ({count/100:.1f}%)")

    with open("mock_data.json", "w", encoding="utf-8") as f:
        json.dump(corpus, f, indent=2)

    print(f"\nSaved {len(corpus)} tweets to mock_data.json")
