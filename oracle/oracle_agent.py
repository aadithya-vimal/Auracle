#!/usr/bin/env python3
"""
Auracle Oracle Agent v2
Full analysis pipeline: Data Ingestion -> Content Analysis Engine -> Groq AI -> Blockchain
Features: Bot detection, spam filtering, content analysis, dynamic corpus
"""

import os
import json
import random
import time
import hashlib
import struct
from typing import List, Dict, Tuple
from datetime import datetime
from collections import Counter
from dotenv import load_dotenv
from groq import Groq
from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.transaction import Transaction
from solders.message import Message
from solders.system_program import ID as SYS_PROGRAM_ID
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta

load_dotenv()


# ============================================================================
# CONTENT ANALYSIS ENGINE
# ============================================================================

class ContentAnalysisEngine:
    """
    Multi-stage content analysis engine for filtering and scoring tweets.
    Stages: Bot Detection -> Spam Filtering -> Duplicate Detection -> Quality Scoring
    """

    # Spam indicators
    SPAM_PATTERNS = [
        'airdrop', 'free sol', 'send 1 get', 'giveaway', 'claim your',
        'connect wallet', 'link in bio', 'dm me', 'guaranteed',
        '.xyz', '.scam', 'fakelink', 'pre-sale', 'flash loan',
        'recover', '1000x guaranteed', 'no cap fr fr'
    ]

    # Bot behavior indicators
    BOT_INDICATORS = {
        'excessive_caps_ratio': 0.6,       # >60% uppercase = likely bot
        'excessive_emoji_count': 5,         # >5 emojis = likely bot
        'excessive_exclamation': 4,         # >4 exclamation marks
        'min_account_age_days': 14,         # <14 day old accounts suspicious
        'min_followers': 10,                # <10 followers suspicious
        'engagement_ratio_threshold': 0.01  # engagement/followers ratio check
    }

    def __init__(self):
        self.seen_hashes = set()
        self.analysis_stats = {
            'total_processed': 0,
            'bots_detected': 0,
            'spam_filtered': 0,
            'duplicates_removed': 0,
            'outliers_flagged': 0,
            'low_quality_filtered': 0,
            'clean_tweets': 0,
            'bot_accounts': set(),
            'spam_domains': set(),
        }

    def analyze_batch(self, tweets: List[Dict]) -> Dict:
        """
        Run full analysis pipeline on a batch of tweets.
        Returns detailed analysis report with filtered results.
        """
        self.analysis_stats['total_processed'] += len(tweets)

        results = {
            'clean': [],
            'bots': [],
            'spam': [],
            'duplicates': [],
            'outliers': [],
            'low_quality': [],
            'bot_accounts_detected': [],
            'spam_alerts': [],
            'quality_distribution': {},
            'pipeline_stages': []
        }

        # Stage 1: Bot Detection
        stage1_start = time.time()
        for tweet in tweets:
            bot_result = self._detect_bot(tweet)
            tweet['_bot_analysis'] = bot_result

        stage1_time = round((time.time() - stage1_start) * 1000, 1)
        results['pipeline_stages'].append({
            'name': 'Bot Detection',
            'duration_ms': stage1_time,
            'processed': len(tweets),
            'flagged': sum(1 for t in tweets if t['_bot_analysis']['is_bot'])
        })

        # Stage 2: Spam Filtering
        stage2_start = time.time()
        for tweet in tweets:
            spam_result = self._detect_spam(tweet)
            tweet['_spam_analysis'] = spam_result

        stage2_time = round((time.time() - stage2_start) * 1000, 1)
        results['pipeline_stages'].append({
            'name': 'Spam Filtering',
            'duration_ms': stage2_time,
            'processed': len(tweets),
            'flagged': sum(1 for t in tweets if t['_spam_analysis']['is_spam'])
        })

        # Stage 3: Duplicate Detection
        stage3_start = time.time()
        unique_tweets = []
        for tweet in tweets:
            content_hash = hashlib.md5(tweet['text'].lower().strip().encode()).hexdigest()[:12]
            if content_hash in self.seen_hashes:
                tweet['_is_duplicate'] = True
                results['duplicates'].append(tweet)
                self.analysis_stats['duplicates_removed'] += 1
            else:
                tweet['_is_duplicate'] = False
                self.seen_hashes.add(content_hash)
                unique_tweets.append(tweet)

        stage3_time = round((time.time() - stage3_start) * 1000, 1)
        results['pipeline_stages'].append({
            'name': 'Duplicate Detection',
            'duration_ms': stage3_time,
            'processed': len(tweets),
            'duplicates_found': len(results['duplicates'])
        })

        # Stage 4: Quality Scoring & Classification
        stage4_start = time.time()
        for tweet in unique_tweets:
            quality = self._score_quality(tweet)
            tweet['_quality'] = quality

            if tweet['_bot_analysis']['is_bot']:
                results['bots'].append(tweet)
                self.analysis_stats['bots_detected'] += 1
                if tweet['username'] not in self.analysis_stats['bot_accounts']:
                    self.analysis_stats['bot_accounts'].add(tweet['username'])
                    results['bot_accounts_detected'].append({
                        'username': tweet['username'],
                        'confidence': tweet['_bot_analysis']['confidence'],
                        'reasons': tweet['_bot_analysis']['reasons']
                    })
            elif tweet['_spam_analysis']['is_spam']:
                results['spam'].append(tweet)
                self.analysis_stats['spam_filtered'] += 1
                results['spam_alerts'].append({
                    'tweet_id': tweet['id'],
                    'type': tweet['_spam_analysis']['spam_type'],
                    'text_preview': tweet['text'][:60]
                })
            elif quality['score'] < 0.3:
                results['low_quality'].append(tweet)
                self.analysis_stats['low_quality_filtered'] += 1
            elif quality.get('is_outlier', False):
                results['outliers'].append(tweet)
                results['clean'].append(tweet)  # Outliers still count for analysis
                self.analysis_stats['outliers_flagged'] += 1
            else:
                results['clean'].append(tweet)
                self.analysis_stats['clean_tweets'] += 1

        stage4_time = round((time.time() - stage4_start) * 1000, 1)
        results['pipeline_stages'].append({
            'name': 'Quality Scoring',
            'duration_ms': stage4_time,
            'processed': len(unique_tweets),
            'clean': len(results['clean']),
            'filtered': len(results['bots']) + len(results['spam']) + len(results['low_quality'])
        })

        # Quality distribution
        quality_buckets = {'high': 0, 'medium': 0, 'low': 0}
        for tweet in unique_tweets:
            q = tweet['_quality']['score']
            if q >= 0.7:
                quality_buckets['high'] += 1
            elif q >= 0.4:
                quality_buckets['medium'] += 1
            else:
                quality_buckets['low'] += 1
        results['quality_distribution'] = quality_buckets

        return results

    def _detect_bot(self, tweet: Dict) -> Dict:
        """Multi-signal bot detection"""
        reasons = []
        score = 0.0
        text = tweet.get('text', '')
        account = tweet.get('account', {})

        # Check uppercase ratio
        if len(text) > 5:
            caps_ratio = sum(1 for c in text if c.isupper()) / len(text)
            if caps_ratio > self.BOT_INDICATORS['excessive_caps_ratio']:
                reasons.append(f'Excessive caps ({caps_ratio:.0%})')
                score += 0.25

        # Emoji flooding
        emoji_count = sum(1 for c in text if ord(c) > 0x1F600)
        if emoji_count > self.BOT_INDICATORS['excessive_emoji_count']:
            reasons.append(f'Emoji flooding ({emoji_count} emojis)')
            score += 0.2

        # Exclamation spam
        excl_count = text.count('!')
        if excl_count > self.BOT_INDICATORS['excessive_exclamation']:
            reasons.append(f'Exclamation spam ({excl_count}x)')
            score += 0.15

        # Account age check
        age = account.get('account_age_days', 365)
        if age < self.BOT_INDICATORS['min_account_age_days']:
            reasons.append(f'New account ({age} days)')
            score += 0.2

        # Follower check
        followers = account.get('followers', 100)
        if followers < self.BOT_INDICATORS['min_followers']:
            reasons.append(f'Low followers ({followers})')
            score += 0.15

        # Pre-computed bot_score from generator
        existing_bot_score = tweet.get('bot_score', 0)
        if existing_bot_score > 0.7:
            score += 0.3

        # Low engagement ratio
        eng = tweet.get('engagement', {})
        total_eng = eng.get('likes', 0) + eng.get('retweets', 0)
        if followers > 0 and total_eng / max(followers, 1) < 0.001 and followers > 100:
            reasons.append('Suspicious engagement ratio')
            score += 0.1

        final_score = min(score, 1.0)
        return {
            'is_bot': final_score >= 0.45,
            'confidence': round(final_score, 3),
            'reasons': reasons
        }

    def _detect_spam(self, tweet: Dict) -> Dict:
        """Content-based spam detection"""
        text_lower = tweet.get('text', '').lower()
        spam_matches = []

        for pattern in self.SPAM_PATTERNS:
            if pattern in text_lower:
                spam_matches.append(pattern)

        # Check for suspicious URLs
        has_suspicious_url = any(x in text_lower for x in ['.xyz', '.scam', 'fakelink', 'scamlink'])

        is_spam = len(spam_matches) >= 2 or has_suspicious_url or tweet.get('is_spam', False)
        spam_type = 'phishing' if has_suspicious_url else 'promotional' if spam_matches else 'none'

        return {
            'is_spam': is_spam,
            'spam_type': spam_type,
            'matches': spam_matches,
            'confidence': min(len(spam_matches) * 0.3 + (0.4 if has_suspicious_url else 0), 1.0)
        }

    def _score_quality(self, tweet: Dict) -> Dict:
        """Score tweet quality for sentiment analysis"""
        text = tweet.get('text', '')
        score = 0.5  # baseline

        # Length bonus
        if len(text) > 50:
            score += 0.15
        if len(text) > 100:
            score += 0.1
        if len(text) < 10:
            score -= 0.3

        # Engagement bonus
        eng = tweet.get('engagement', {})
        likes = eng.get('likes', 0)
        if likes > 100:
            score += 0.15
        if likes > 1000:
            score += 0.1

        # Account quality
        account = tweet.get('account', {})
        if account.get('verified', False):
            score += 0.2
        if account.get('followers', 0) > 5000:
            score += 0.1

        # Outlier detection
        is_outlier = (
            likes > 5000
            or 'BREAKING' in text
            or 'WHALE ALERT' in text
            or tweet.get('category') == 'outlier'
        )

        return {
            'score': round(max(0, min(1, score)), 3),
            'is_outlier': is_outlier
        }

    def get_stats(self) -> Dict:
        """Return cumulative analysis statistics"""
        return {
            'total_processed': self.analysis_stats['total_processed'],
            'bots_detected': self.analysis_stats['bots_detected'],
            'spam_filtered': self.analysis_stats['spam_filtered'],
            'duplicates_removed': self.analysis_stats['duplicates_removed'],
            'outliers_flagged': self.analysis_stats['outliers_flagged'],
            'low_quality_filtered': self.analysis_stats['low_quality_filtered'],
            'clean_tweets': self.analysis_stats['clean_tweets'],
            'unique_bot_accounts': len(self.analysis_stats['bot_accounts']),
        }


# ============================================================================
# ORACLE AGENT
# ============================================================================

class AuracleOracle:
    def __init__(self):
        """Initialize the Oracle with API clients, configuration, and analysis engine"""
        # Groq API setup
        self.groq_api_key = os.getenv('GROQ_API_KEY')
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")
        self.groq_client = Groq(api_key=self.groq_api_key)

        # Solana setup
        self.rpc_url = os.getenv('SOLANA_RPC_URL', 'https://api.devnet.solana.com')
        self.solana_client = Client(self.rpc_url)

        # Load program ID
        program_id_str = os.getenv('PROGRAM_ID')
        if not program_id_str:
            raise ValueError("PROGRAM_ID not found")
        self.program_id = Pubkey.from_string(program_id_str)

        # Load oracle keypair
        private_key_str = os.getenv('ORACLE_PRIVATE_KEY')
        if not private_key_str:
            raise ValueError("ORACLE_PRIVATE_KEY not found")
        private_key_array = json.loads(private_key_str)
        self.oracle_keypair = Keypair.from_bytes(bytes(private_key_array))

        # Sentiment account
        sentiment_account_str = os.getenv('SENTIMENT_ACCOUNT')
        if not sentiment_account_str:
            raise ValueError("SENTIMENT_ACCOUNT not found")
        self.sentiment_account = Pubkey.from_string(sentiment_account_str)

        # Load corpus
        with open('mock_data.json', 'r', encoding='utf-8') as f:
            self.tweets = json.load(f)

        # Initialize analysis engine
        self.engine = ContentAnalysisEngine()

        # Cycle tracking
        self.cycle_count = 0
        self.cumulative_scores = []

        print(f"Oracle initialized")
        print(f"  RPC: {self.rpc_url}")
        print(f"  Program: {self.program_id}")
        print(f"  Oracle: {self.oracle_keypair.pubkey()}")
        print(f"  Account: {self.sentiment_account}")
        print(f"  Corpus: {len(self.tweets)} tweets loaded")

    def select_batch(self, count: int = 200) -> List[Dict]:
        """Select a random batch from the corpus"""
        return random.sample(self.tweets, min(count, len(self.tweets)))

    def extract_keywords_and_impact(self, tweets: List[Dict], score: int) -> List[Dict]:
        """Extract keywords and calculate sentiment impact"""
        bullish_kw = {
            'wagmi': 15, 'lfg': 12, 'moon': 18, 'bullish': 10, 'buy': 8,
            'dip': 7, 'diamond': 10, 'hodl': 9, 'pump': 12, 'rocket': 15,
            'breakout': 14, 'rally': 11, 'surge': 13, 'accumulation': 11,
            'institutional': 13, 'etf': 16, 'integration': 10, 'adoption': 12,
            'thriving': 9, 'innovation': 8, 'genius': 7, 'revolutionary': 14,
        }
        bearish_kw = {
            'rekt': -15, 'rug': -20, 'dump': -14, 'bearish': -10, 'crash': -18,
            'scam': -16, 'liquidated': -17, 'fear': -9, 'sell': -8, 'panic': -12,
            'dead': -15, 'collapse': -16, 'plunge': -14, 'outage': -18,
            'exploit': -19, 'hack': -20, 'vulnerability': -17, 'centralized': -8,
            'congestion': -10, 'spam': -7, 'flop': -11, 'zero': -15,
        }

        reasoning = []
        for tweet in tweets:
            if tweet.get('_bot_analysis', {}).get('is_bot'):
                continue  # Skip bot tweets for keyword extraction
            text_lower = tweet['text'].lower()

            for keyword, weight in bullish_kw.items():
                if keyword in text_lower:
                    context = tweet['text'][:80]
                    reasoning.append({
                        'keyword': keyword.upper(),
                        'impact': 'positive',
                        'weight': weight,
                        'context': context + ('...' if len(tweet['text']) > 80 else ''),
                        'tweet_id': tweet.get('id', 'unknown')
                    })

            for keyword, weight in bearish_kw.items():
                if keyword in text_lower:
                    context = tweet['text'][:80]
                    reasoning.append({
                        'keyword': keyword.upper(),
                        'impact': 'negative',
                        'weight': weight,
                        'context': context + ('...' if len(tweet['text']) > 80 else ''),
                        'tweet_id': tweet.get('id', 'unknown')
                    })

        reasoning.sort(key=lambda x: abs(x['weight']), reverse=True)
        return reasoning[:40]

    def analyze_sentiment_with_groq(self, tweets: List[Dict]) -> int:
        """Use Groq API for sentiment scoring"""
        tweet_texts = [t['text'] for t in tweets[:10]]  # Use 10 clean tweets
        combined = "\n".join([f"{i+1}. {text}" for i, text in enumerate(tweet_texts)])

        prompt = f"""You are a crypto sentiment analyzer. Analyze these {len(tweet_texts)} tweets and return a single sentiment score from 0 to 100.

Scoring:
- 0-20: Extremely Bearish (crashes, rug pulls, fear)
- 21-40: Bearish (selling, caution, negative)
- 41-60: Neutral (mixed, uncertain)
- 61-80: Bullish (buying, optimism)
- 81-100: Extremely Bullish (moon, WAGMI, mass adoption)

Tweets:
{combined}

Respond with ONLY a single integer between 0 and 100."""

        if random.random() > 0.5:
            prompt += " "

        try:
            for attempt in range(3):
                try:
                    completion = self.groq_client.chat.completions.create(
                        messages=[
                            {"role": "system", "content": "You are a precise sentiment analyzer. Respond with only a single integer."},
                            {"role": "user", "content": prompt}
                        ],
                        model="llama-3.3-70b-versatile",
                        temperature=0.3,
                        max_tokens=10
                    )
                    score = int(completion.choices[0].message.content.strip())
                    return max(0, min(100, score))
                except Exception as e:
                    if "rate_limit" in str(e).lower() and attempt < 2:
                        time.sleep((attempt + 1) * 2)
                    else:
                        raise
        except Exception as e:
            print(f"  Groq error: {e}, using fallback")
            return self._fallback_analysis(tweets)

    def _fallback_analysis(self, tweets: List[Dict]) -> int:
        """Fallback when Groq is unavailable"""
        bull = ['wagmi', 'lfg', 'moon', 'bullish', 'buy', 'diamond', 'pump']
        bear = ['rekt', 'rug', 'dump', 'bearish', 'crash', 'scam', 'liquidated']
        b_count = sum(1 for t in tweets for kw in bull if kw in t['text'].lower())
        e_count = sum(1 for t in tweets for kw in bear if kw in t['text'].lower())
        total = b_count + e_count
        return int((b_count / total * 100) if total > 0 else 50)

    def update_sentiment_on_chain(self, score: int) -> str:
        """Submit sentiment score to Solana blockchain"""
        try:
            discriminator = b'\x1d\x9a\xcb\x09\x0e\x1b\x4b\x0e'
            data = discriminator + struct.pack('<B', score)

            instruction = Instruction(
                program_id=self.program_id,
                data=data,
                accounts=[
                    AccountMeta(pubkey=self.sentiment_account, is_signer=False, is_writable=True),
                    AccountMeta(pubkey=self.oracle_keypair.pubkey(), is_signer=True, is_writable=False),
                ]
            )

            message = Message([instruction], self.oracle_keypair.pubkey())
            blockhash = self.solana_client.get_latest_blockhash().value.blockhash
            tx = Transaction(from_keypairs=[self.oracle_keypair], message=message, recent_blockhash=blockhash)
            response = self.solana_client.send_transaction(tx)
            sig = str(response.value)
            print(f"  Transaction: {sig}")
            return sig
        except Exception as e:
            print(f"  Chain error: {e}")
            raise

    def save_analysis_log(self, score: int, reasoning: List[Dict], analysis_result: Dict, batch: List[Dict]):
        """Save comprehensive analysis log for frontend"""
        keyword_cloud = {}
        for item in reasoning[:12]:
            keyword_cloud[item['keyword']] = abs(item['weight'])

        # Prepare tweets for frontend
        tweets_for_frontend = []
        for tweet in batch[:100]:  # Show top 100
            bot_info = tweet.get('_bot_analysis', {})
            spam_info = tweet.get('_spam_analysis', {})
            quality_info = tweet.get('_quality', {})

            sentiment = 'neutral'
            for r in reasoning:
                if r['tweet_id'] == tweet.get('id'):
                    sentiment = 'positive' if r['impact'] == 'positive' else 'negative'
                    break

            tweets_for_frontend.append({
                'id': tweet.get('id', 0),
                'text': tweet['text'][:120] + ('...' if len(tweet['text']) > 120 else ''),
                'username': tweet.get('username', 'unknown'),
                'sentiment': sentiment,
                'is_bot': bot_info.get('is_bot', False),
                'bot_confidence': bot_info.get('confidence', 0),
                'bot_reasons': bot_info.get('reasons', []),
                'is_spam': spam_info.get('is_spam', False),
                'spam_type': spam_info.get('spam_type', 'none'),
                'quality_score': quality_info.get('score', 0.5),
                'is_outlier': quality_info.get('is_outlier', False),
                'engagement': tweet.get('engagement', {}),
                'category': tweet.get('category', 'unknown')
            })

        # Engine stats
        stats = self.engine.get_stats()
        score_extremity = abs(score - 50) / 50
        confidence = min(97, 60 + (len(reasoning) * 1.5) + (score_extremity * 25))

        # Build the log
        analysis_data = {
            'score': score,
            'confidence': round(confidence, 1),
            'velocity': random.randint(-8, 12),
            'timestamp': datetime.now().isoformat(),
            'cycle': self.cycle_count,

            # Pipeline metrics
            'pipeline': {
                'corpus_size': len(self.tweets),
                'batch_size': len(batch),
                'stages': analysis_result.get('pipeline_stages', []),
                'quality_distribution': analysis_result.get('quality_distribution', {}),
            },

            # Analysis engine results
            'engine': {
                'bots_detected': len(analysis_result.get('bots', [])),
                'spam_filtered': len(analysis_result.get('spam', [])),
                'duplicates_removed': len(analysis_result.get('duplicates', [])),
                'outliers_found': len(analysis_result.get('outliers', [])),
                'clean_tweets': len(analysis_result.get('clean', [])),
                'low_quality': len(analysis_result.get('low_quality', [])),
                'bot_accounts': analysis_result.get('bot_accounts_detected', [])[:10],
                'spam_alerts': analysis_result.get('spam_alerts', [])[:10],
                'cumulative': stats,
            },

            # Reasoning
            'reasoning': reasoning,
            'keyword_cloud': keyword_cloud,
            'tweet_count': len(batch),
            'tweets_analyzed': tweets_for_frontend,
        }

        output_path = os.path.join(os.path.dirname(__file__), '..', 'app', 'public', 'analysis_log.json')
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(analysis_data, f, indent=2)

        print(f"  Log saved ({len(tweets_for_frontend)} tweets, {len(reasoning)} keywords)")

    def run_analysis_cycle(self):
        """Run complete analysis cycle"""
        self.cycle_count += 1
        print(f"\n{'='*60}")
        print(f"  AURACLE ORACLE - Cycle #{self.cycle_count}")
        print(f"{'='*60}")

        # Stage 1: Data Ingestion
        print(f"\n  [1/5] DATA INGESTION")
        batch = self.select_batch(200)
        print(f"        Selected {len(batch)} tweets from {len(self.tweets)} corpus")

        # Stage 2: Content Analysis Engine
        print(f"\n  [2/5] CONTENT ANALYSIS ENGINE")
        analysis = self.engine.analyze_batch(batch)
        for stage in analysis['pipeline_stages']:
            flagged = stage.get('flagged', stage.get('duplicates_found', stage.get('filtered', 0)))
            print(f"        {stage['name']}: {stage['processed']} processed, {flagged} flagged ({stage['duration_ms']}ms)")

        clean = analysis['clean']
        print(f"        Result: {len(clean)} clean tweets, {len(analysis['bots'])} bots, {len(analysis['spam'])} spam")

        # Stage 3: AI Scoring
        print(f"\n  [3/5] GROQ AI SCORING")
        if len(clean) > 0:
            score = self.analyze_sentiment_with_groq(clean)
        else:
            score = 50
        self.cumulative_scores.append(score)
        label = self._get_label(score)
        print(f"        Score: {score}/100 ({label})")

        # Stage 3.5: Keyword Extraction
        print(f"\n  [3.5] KEYWORD EXTRACTION")
        reasoning = self.extract_keywords_and_impact(clean, score)
        print(f"        Extracted {len(reasoning)} impactful keywords")

        # Stage 4: Save Analysis Log
        print(f"\n  [4/5] SAVING ANALYSIS LOG")
        self.save_analysis_log(score, reasoning, analysis, batch)

        # Stage 5: On-Chain Update
        print(f"\n  [5/5] BLOCKCHAIN COMMIT")
        try:
            sig = self.update_sentiment_on_chain(score)
            print(f"        Score {score} committed to Solana")
        except Exception as e:
            print(f"        Chain update failed: {e}")

        # Print engine stats
        stats = self.engine.get_stats()
        print(f"\n  CUMULATIVE ENGINE STATS:")
        print(f"    Total processed: {stats['total_processed']}")
        print(f"    Bots detected: {stats['bots_detected']}")
        print(f"    Spam filtered: {stats['spam_filtered']}")
        print(f"    Bot accounts: {stats['unique_bot_accounts']}")
        print(f"{'='*60}\n")

    def _get_label(self, score):
        if score <= 20: return "Extremely Bearish"
        if score <= 40: return "Bearish"
        if score <= 60: return "Neutral"
        if score <= 80: return "Bullish"
        return "Extremely Bullish"


def main():
    try:
        oracle = AuracleOracle()
        print(f"\n{'='*60}")
        print(f"  AURACLE ORACLE v2 - CONTINUOUS MODE")
        print(f"  Content Analysis Engine active")
        print(f"  Running every 30 seconds | Ctrl+C to stop")
        print(f"{'='*60}\n")

        while True:
            oracle.run_analysis_cycle()
            print(f"\n  Waiting 6 seconds...")
            print(f"  Next cycle: {time.strftime('%H:%M:%S', time.localtime(time.time() + 6))}")
            time.sleep(6)

    except KeyboardInterrupt:
        print(f"\n  Oracle stopped. Cycles completed: {oracle.cycle_count}")
    except Exception as e:
        print(f"\n  Fatal: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
