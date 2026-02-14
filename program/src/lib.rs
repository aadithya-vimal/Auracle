use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod auracle {
    use super::*;

    /// Initialize the sentiment oracle account
    /// Creates a new account to store sentiment data
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let sentiment_account = &mut ctx.accounts.sentiment_account;
        sentiment_account.authority = ctx.accounts.authority.key();
        sentiment_account.score = 50; // Start with neutral sentiment
        sentiment_account.timestamp = Clock::get()?.unix_timestamp;
        
        msg!("Sentiment Oracle initialized with score: {}", sentiment_account.score);
        Ok(())
    }

    /// Update the sentiment score
    /// Only the authority can update the score
    pub fn update_sentiment(ctx: Context<UpdateSentiment>, new_score: u8) -> Result<()> {
        require!(new_score <= 100, ErrorCode::InvalidScore);
        
        let sentiment_account = &mut ctx.accounts.sentiment_account;
        
        // Verify that the signer is the authority
        require!(
            ctx.accounts.authority.key() == sentiment_account.authority,
            ErrorCode::Unauthorized
        );
        
        sentiment_account.score = new_score;
        sentiment_account.timestamp = Clock::get()?.unix_timestamp;
        
        msg!("Sentiment updated to: {} at timestamp: {}", new_score, sentiment_account.timestamp);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + SentimentAccount::INIT_SPACE
    )]
    pub sentiment_account: Account<'info, SentimentAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateSentiment<'info> {
    #[account(mut)]
    pub sentiment_account: Account<'info, SentimentAccount>,
    
    pub authority: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct SentimentAccount {
    /// The authority that can update the sentiment score
    pub authority: Pubkey,
    
    /// The sentiment score (0-100)
    /// 0 = Extremely Bearish
    /// 50 = Neutral
    /// 100 = Extremely Bullish
    pub score: u8,
    
    /// Unix timestamp of the last update
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Score must be between 0 and 100")]
    InvalidScore,
    
    #[msg("Only the authority can update the sentiment")]
    Unauthorized,
}
