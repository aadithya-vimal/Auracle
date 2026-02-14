# Solana Program - Auracle

Sentiment oracle smart contract built with Anchor framework.

## Build

```bash
anchor build
```

## Deploy

```bash
anchor deploy
```

## Test

```bash
anchor test
```

## Program Structure

- **initialize**: Creates the sentiment account with default score of 50
- **update_sentiment**: Updates the sentiment score (0-100) - only callable by authority

## Account Structure

```rust
pub struct SentimentAccount {
    pub authority: Pubkey,  // 32 bytes
    pub score: u8,          // 1 byte (0-100)
    pub timestamp: i64,     // 8 bytes (Unix timestamp)
}
```

Total size: 41 bytes + 8 byte discriminator = 49 bytes
