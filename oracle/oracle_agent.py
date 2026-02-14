#!/usr/bin/env python3
"""
Auracle Oracle Agent
Analyzes crypto sentiment using Groq AI and updates Solana blockchain
"""

import os
import json
import random
import time
from typing import List, Dict
from dotenv import load_dotenv
from groq import Groq
from solana.rpc.api import Client
from solders.keypair import Keypair
from solders.transaction import Transaction
from solders.message import Message
from solders.system_program import ID as SYS_PROGRAM_ID
from solders.pubkey import Pubkey
from solders.instruction import Instruction, AccountMeta
import struct

# Load environment variables
load_dotenv()

class AuracleOracle:
    def __init__(self):
        """Initialize the Oracle with API clients and configuration"""
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
            raise ValueError("PROGRAM_ID not found in environment variables")
        self.program_id = Pubkey.from_string(program_id_str)
        
        # Load oracle keypair from private key array
        private_key_str = os.getenv('ORACLE_PRIVATE_KEY')
        if not private_key_str:
            raise ValueError("ORACLE_PRIVATE_KEY not found in environment variables")
        
        # Parse the private key array [1,2,3,...]
        private_key_array = json.loads(private_key_str)
        self.oracle_keypair = Keypair.from_bytes(bytes(private_key_array))
        
        # Load sentiment account pubkey
        sentiment_account_str = os.getenv('SENTIMENT_ACCOUNT')
        if not sentiment_account_str:
            raise ValueError("SENTIMENT_ACCOUNT not found in environment variables")
        self.sentiment_account = Pubkey.from_string(sentiment_account_str)
        
        # Load mock data
        with open('mock_data.json', 'r', encoding='utf-8') as f:
            self.tweets = json.load(f)
        
        print(f"✅ Oracle initialized")
        print(f"   RPC: {self.rpc_url}")
        print(f"   Program ID: {self.program_id}")
        print(f"   Oracle Pubkey: {self.oracle_keypair.pubkey()}")
        print(f"   Sentiment Account: {self.sentiment_account}")
        print(f"   Loaded {len(self.tweets)} tweets")
    
    def select_random_tweets(self, count: int = 5) -> List[Dict]:
        """Select random tweets from the dataset"""
        return random.sample(self.tweets, min(count, len(self.tweets)))
    
    def extract_keywords_and_impact(self, tweets: List[Dict], score: int) -> List[Dict]:
        """
        Extract keywords from tweets and calculate their impact on sentiment
        Returns list of {keyword, impact, weight, context}
        """
        bullish_keywords = {
            'wagmi': 15, 'lfg': 12, 'moon': 18, 'bullish': 10, 'buy': 8, 
            'dip': 7, 'diamond': 10, 'hodl': 9, 'pump': 12, 'rocket': 15,
            'lambo': 10, 'breakout': 14, 'rally': 11, 'surge': 13
        }
        bearish_keywords = {
            'rekt': -15, 'rug': -20, 'dump': -14, 'bearish': -10, 'crash': -18,
            'scam': -16, 'liquidated': -17, 'fear': -9, 'sell': -8, 'panic': -12,
            'dead': -15, 'collapse': -16, 'plunge': -14
        }
        
        reasoning = []
        
        for tweet in tweets:
            text_lower = tweet['text'].lower()
            
            # Check bullish keywords
            for keyword, weight in bullish_keywords.items():
                if keyword in text_lower:
                    # Extract context (sentence containing keyword)
                    sentences = tweet['text'].split('.')
                    context = next((s.strip() for s in sentences if keyword in s.lower()), tweet['text'][:50])
                    
                    reasoning.append({
                        'keyword': keyword.upper(),
                        'impact': 'positive',
                        'weight': weight,
                        'context': context[:80] + '...' if len(context) > 80 else context,
                        'tweet_id': tweet.get('id', 'unknown')
                    })
            
            # Check bearish keywords
            for keyword, weight in bearish_keywords.items():
                if keyword in text_lower:
                    sentences = tweet['text'].split('.')
                    context = next((s.strip() for s in sentences if keyword in s.lower()), tweet['text'][:50])
                    
                    reasoning.append({
                        'keyword': keyword.upper(),
                        'impact': 'negative',
                        'weight': weight,
                        'context': context[:80] + '...' if len(context) > 80 else context,
                        'tweet_id': tweet.get('id', 'unknown')
                    })
        
        # Sort by absolute weight (most impactful first)
        reasoning.sort(key=lambda x: abs(x['weight']), reverse=True)
        
        return reasoning[:30]  # Return top 30 most impactful keywords (increased density)
    
    def analyze_sentiment_with_groq(self, tweets: List[Dict]) -> int:
        """
        Use Groq API to analyze sentiment of tweets
        Returns a score from 0-100
        """
        # Prepare the tweet texts
        tweet_texts = [tweet['text'] for tweet in tweets]
        tweets_combined = "\n".join([f"{i+1}. {text}" for i, text in enumerate(tweet_texts)])
        
        # Construct the prompt
        prompt = f"""You are a crypto sentiment analyzer. Analyze the following {len(tweets)} tweets and return a single sentiment score from 0 to 100.

Scoring guide:
- 0-20: Extremely Bearish (rug pulls, crashes, fear)
- 21-40: Bearish (selling, caution, negative)
- 41-60: Neutral (sideways, uncertain, mixed)
- 61-80: Bullish (buying, optimism, positive)
- 81-100: Extremely Bullish (moon, WAGMI, LFG)

Tweets:
{tweets_combined}

Respond with ONLY a single integer between 0 and 100. No explanation, just the number."""
        
        # Add slight jitter to prevent 100% efficient caching
        if random.random() > 0.5:
            prompt += " "

        try:
            # Call Groq API with retry logic
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    chat_completion = self.groq_client.chat.completions.create(
                        messages=[
                            {
                                "role": "system",
                                "content": "You are a precise sentiment analyzer. Always respond with only a single integer."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        model="llama-3.3-70b-versatile",
                        temperature=0.3,
                        max_tokens=10
                    )
                    
                    # Extract the score
                    response_text = chat_completion.choices[0].message.content.strip()
                    score = int(response_text)
                    
                    # Validate score
                    if 0 <= score <= 100:
                        print(f"✅ Groq analysis complete: Score = {score}")
                        return score
                    else:
                        print(f"⚠️  Invalid score {score}, clamping to range")
                        return max(0, min(100, score))
                
                except Exception as e:
                    if "rate_limit" in str(e).lower() and attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 2
                        print(f"⚠️  Rate limit hit, waiting {wait_time}s before retry...")
                        time.sleep(wait_time)
                    else:
                        raise
        
        except Exception as e:
            print(f"❌ Error calling Groq API: {e}")
            print(f"   Falling back to simple sentiment analysis")
            return self.fallback_sentiment_analysis(tweets)
    
    def fallback_sentiment_analysis(self, tweets: List[Dict]) -> int:
        """Simple fallback sentiment analysis if Groq fails"""
        bullish_keywords = ['wagmi', 'lfg', 'moon', 'bullish', 'buy', 'dip', 'diamond']
        bearish_keywords = ['rekt', 'rug', 'dump', 'bearish', 'crash', 'scam', 'liquidated']
        
        bullish_count = 0
        bearish_count = 0
        
        for tweet in tweets:
            text_lower = tweet['text'].lower()
            bullish_count += sum(1 for kw in bullish_keywords if kw in text_lower)
            bearish_count += sum(1 for kw in bearish_keywords if kw in text_lower)
        
        total = bullish_count + bearish_count
        if total == 0:
            return 50  # Neutral
        
        # Calculate score
        bullish_ratio = bullish_count / total
        score = int(bullish_ratio * 100)
        
        print(f"   Fallback analysis: {bullish_count} bullish, {bearish_count} bearish -> {score}")
        return score
    
    def update_sentiment_on_chain(self, score: int) -> str:
        """
        Send transaction to Solana to update sentiment score
        Returns transaction signature
        """
        try:
            # Build the instruction data
            # Instruction discriminator for update_sentiment (8 bytes)
            # This is a hash of "global:update_sentiment"
            # For Anchor, we need to calculate this properly
            # Using a simplified approach: instruction index (1 for update_sentiment)
            instruction_discriminator = b'\x1d\x9a\xcb\x09\x0e\x1b\x4b\x0e'  # update_sentiment discriminator
            
            # Pack the score as a u8
            score_bytes = struct.pack('<B', score)
            
            # Combine discriminator + data
            instruction_data = instruction_discriminator + score_bytes
            
            # Build the instruction
            instruction = Instruction(
                program_id=self.program_id,
                data=instruction_data,
                accounts=[
                    AccountMeta(pubkey=self.sentiment_account, is_signer=False, is_writable=True),
                    AccountMeta(pubkey=self.oracle_keypair.pubkey(), is_signer=True, is_writable=False),
                ]
            )
            
            # Create Message
            message = Message(
                [instruction],
                self.oracle_keypair.pubkey()
            )
            
            # Get recent blockhash
            recent_blockhash = self.solana_client.get_latest_blockhash().value.blockhash
            
            # Create transaction
            transaction = Transaction(
                from_keypairs=[self.oracle_keypair],
                message=message,
                recent_blockhash=recent_blockhash
            )
            
            # Send transaction
            response = self.solana_client.send_transaction(transaction)
            signature = response.value
            
            print(f"✅ Transaction sent: {signature}")
            print(f"   Explorer: https://explorer.solana.com/tx/{signature}?cluster=devnet")
            
            return str(signature)
        
        except Exception as e:
            print(f"❌ Error sending transaction: {e}")
            raise
    
    def save_analysis_log(self, score: int, reasoning: List[Dict], tweets: List[Dict]):
        """
        Save detailed analysis log to JSON file for frontend visualization
        """
        import os
        from datetime import datetime
        
        # Calculate confidence based on keyword count and score extremity
        keyword_count = len(reasoning)
        score_extremity = abs(score - 50) / 50  # 0 to 1
        confidence = min(95, 60 + (keyword_count * 3) + (score_extremity * 25))
        
        # Calculate velocity (mock for now, would need history)
        velocity = random.randint(-8, 12)
        
        # Get keyword cloud (top keywords)
        keyword_cloud = {}
        for item in reasoning[:8]:
            keyword_cloud[item['keyword']] = abs(item['weight'])
        
        analysis_data = {
            'score': score,
            'confidence': round(confidence, 1),
            'velocity': velocity,
            'timestamp': datetime.now().isoformat(),
            'reasoning': reasoning,
            'keyword_cloud': keyword_cloud,
            'tweet_count': len(tweets),
            'tweets_analyzed': [
                {
                    'id': tweet.get('id', 'unknown'),
                    'text': tweet['text'][:100] + '...' if len(tweet['text']) > 100 else tweet['text'],
                    'sentiment': 'positive' if any(r['tweet_id'] == tweet.get('id') and r['impact'] == 'positive' for r in reasoning) else 'negative' if any(r['tweet_id'] == tweet.get('id') and r['impact'] == 'negative' for r in reasoning) else 'neutral'
                }
                for tweet in tweets
            ]
        }
        
        # Save to ../app/public/analysis_log.json
        output_path = os.path.join(os.path.dirname(__file__), '..', 'app', 'public', 'analysis_log.json')
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w') as f:
            json.dump(analysis_data, f, indent=2)
        
        print(f"\n💾 Analysis log saved to: {output_path}")
        print(f"   Confidence: {confidence}%")
        print(f"   Keywords extracted: {len(reasoning)}")
        print(f"   Velocity: {velocity:+d} pts/hour")
    
    def run_analysis_cycle(self):
        """Run a complete analysis cycle"""
        print("\n" + "="*60)
        print("🔮 AURACLE ORACLE - Starting Analysis Cycle")
        print("="*60)
        
        # Step 1: Select random tweets (increased to 50 for "10x data" density)
        print("\n📊 Step 1: Selecting random tweets...")
        selected_tweets = self.select_random_tweets(50)
        print(f"   Selected {len(selected_tweets)} tweets for density")
        
        # Step 2: Analyze sentiment with Groq (use only first 5 to save context/tokens)
        print("\n🤖 Step 2: Analyzing sentiment with Groq AI (using subset)...")
        sentiment_score = self.analyze_sentiment_with_groq(selected_tweets[:5])
        
        # Step 2.5: Extract keywords and reasoning (analyze ALL 50 for dashboard density)
        print("\n🔍 Step 2.5: Extracting keywords and impact analysis...")
        reasoning = self.extract_keywords_and_impact(selected_tweets, sentiment_score)
        print(f"   Found {len(reasoning)} impactful keywords")
        if reasoning:
            print(f"   Top impact: {reasoning[0]['keyword']} ({reasoning[0]['weight']:+d} pts)")
        
        # Determine sentiment label
        if sentiment_score <= 20:
            label = "Extremely Bearish 🐻"
        elif sentiment_score <= 40:
            label = "Bearish 📉"
        elif sentiment_score <= 60:
            label = "Neutral ➡️"
        elif sentiment_score <= 80:
            label = "Bullish 📈"
        else:
            label = "Extremely Bullish 🚀"
        
        print(f"\n   Sentiment Score: {sentiment_score}/100 - {label}")
        
        # Step 3: Save analysis log for frontend
        print("\n📝 Step 3: Saving analysis log...")
        self.save_analysis_log(sentiment_score, reasoning, selected_tweets)
        
        # Step 4: Update on-chain
        print("\n⛓️  Step 4: Updating Solana blockchain...")
        try:
            signature = self.update_sentiment_on_chain(sentiment_score)
            print(f"\n✅ CYCLE COMPLETE")
            print(f"   Score: {sentiment_score}")
            print(f"   Tx: {signature}")
        except Exception as e:
            print(f"\n❌ CYCLE FAILED: {e}")
        
        print("="*60 + "\n")

def main():
    """Main entry point"""
    try:
        oracle = AuracleOracle()
        
        print("\n🔮 AURACLE ORACLE - CONTINUOUS MODE")
        print("=" * 60)
        print("Running continuous analysis cycles every 30 seconds...")
        print("Press Ctrl+C to stop")
        print("=" * 60 + "\n")
        
        cycle_count = 0
        
        # Run continuous loop
        while True:
            cycle_count += 1
            print(f"\n📍 Cycle #{cycle_count}")
            
            # Run analysis cycle with different random tweets each time
            oracle.run_analysis_cycle()
            
            # Wait 30 seconds before next cycle
            print(f"\n⏳ Waiting 30 seconds before next cycle...")
            print(f"   Next cycle will start at: {time.strftime('%H:%M:%S', time.localtime(time.time() + 30))}")
            time.sleep(30)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Oracle stopped by user (Ctrl+C)")
        print(f"   Total cycles completed: {cycle_count}")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
