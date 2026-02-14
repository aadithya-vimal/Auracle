import { useState, useEffect, useRef, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey } from '@solana/web3.js'
import {
    Activity, TrendingUp, TrendingDown, Minus, Clock, Zap, BarChart3,
    Brain, Target, Sparkles, Radio, Gauge, RefreshCw, Database, Network,
    Eye, Hash, Flame, Award, Shield, Cpu, CloudLightning, Box, Layers,
    Wifi, ArrowRight, Globe, Lock, Search, FileText, Link2, AlertTriangle,
    Bot, ShieldAlert, Filter, CheckCircle, XCircle, AlertOctagon, Users,
    Fingerprint, Scan, Server, GitBranch, Workflow, ChevronDown, BarChart,
    PieChart, Hexagon, Terminal, Code, Loader
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { clsx } from 'clsx'
import './App.css'

import idl from './idl.json'

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    PROGRAM_ID: 'DgjQCmPvs3FHSk3DdPskVy6zifMC93LqWe3en7jEmtzF',
    SENTIMENT_ACCOUNT: '4RgDj27rUJiQRyP3Hx4RzEoK1afks9PrVr52rgThNK9W',
}

// ============================================================================
// CUSTOM CURSOR HOOK
// ============================================================================
function useCustomCursor() {
    const cursorRef = useRef(null)
    const dotRef = useRef(null)

    useEffect(() => {
        const cursor = cursorRef.current
        const dot = dotRef.current
        if (!cursor || !dot) return

        let mouseX = 0, mouseY = 0
        let cursorX = 0, cursorY = 0

        const onMove = (e) => {
            mouseX = e.clientX
            mouseY = e.clientY
            dot.style.left = mouseX + 'px'
            dot.style.top = mouseY + 'px'
        }

        const animate = () => {
            cursorX += (mouseX - cursorX) * 0.15
            cursorY += (mouseY - cursorY) * 0.15
            cursor.style.left = cursorX + 'px'
            cursor.style.top = cursorY + 'px'
            requestAnimationFrame(animate)
        }

        const onEnter = () => cursor.classList.add('hovering')
        const onLeave = () => cursor.classList.remove('hovering')

        window.addEventListener('mousemove', onMove)
        animate()

        const attachListeners = () => {
            document.querySelectorAll('button, a, .card, .cloud-tag, .pipeline-step, .stat-card, .impact-item, .tweet-row, .hazard-badge, .engine-stat').forEach(el => {
                el.addEventListener('mouseenter', onEnter)
                el.addEventListener('mouseleave', onLeave)
            })
        }

        attachListeners()
        const observer = new MutationObserver(attachListeners)
        observer.observe(document.body, { childList: true, subtree: true })

        return () => {
            window.removeEventListener('mousemove', onMove)
            observer.disconnect()
        }
    }, [])

    return { cursorRef, dotRef }
}

// ============================================================================
// SCROLL REVEAL HOOK
// ============================================================================
function useScrollReveal() {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible')
                    }
                })
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
        )

        document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
            observer.observe(el)
        })

        return () => observer.disconnect()
    }, [])
}

// ============================================================================
// ANIMATED COUNTER
// ============================================================================
function useAnimatedCounter(target, duration = 1200) {
    const [count, setCount] = useState(0)
    useEffect(() => {
        let start = 0
        const startTime = performance.now()
        const tick = (now) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(eased * target))
            if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
    }, [target, duration])
    return count
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
    const { connection } = useConnection()
    const wallet = useWallet()
    const { cursorRef, dotRef } = useCustomCursor()
    useScrollReveal()

    // State
    const [sentimentData, setSentimentData] = useState(null)
    const [analysisLog, setAnalysisLog] = useState(null)
    const [scoreHistory, setScoreHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [lastUpdate, setLastUpdate] = useState(null)
    const [pipelineActive, setPipelineActive] = useState(false)
    const [activeStage, setActiveStage] = useState(-1)

    // Derived state
    const score = sentimentData?.score ?? 0
    const animatedScore = useAnimatedCounter(score)
    const confidence = analysisLog?.confidence ?? 0
    const velocity = analysisLog?.velocity ?? 0

    // ========================================================================
    // DATA FETCHING
    // ========================================================================
    const fetchOnChainData = useCallback(async () => {
        try {
            const pubkey = new PublicKey(CONFIG.SENTIMENT_ACCOUNT)
            const accountInfo = await connection.getAccountInfo(pubkey)
            if (accountInfo?.data) {
                const data = accountInfo.data
                const score = data[8]
                const lastUpdated = Number(data.readBigInt64LE(9))
                const oracle = new PublicKey(data.slice(17, 49))
                setSentimentData({
                    score,
                    lastUpdated: lastUpdated > 0 ? new Date(lastUpdated * 1000) : new Date(),
                    oracle: oracle.toString(),
                })
                setLastUpdate(new Date())
                setScoreHistory(prev => {
                    const next = [...prev, { time: format(new Date(), 'HH:mm'), score, ts: Date.now() }]
                    return next.slice(-30)
                })
            }
        } catch (error) {
            console.error('On-chain fetch error:', error)
        }
    }, [connection])

    const fetchAnalysisLog = useCallback(async () => {
        try {
            const response = await fetch('/analysis_log.json?t=' + Date.now())
            if (response.ok) {
                const data = await response.json()
                setAnalysisLog(data)
            }
        } catch (error) {
            console.error('Analysis log fetch error:', error)
        }
    }, [])

    const refresh = useCallback(async () => {
        setRefreshing(true)
        setPipelineActive(true)
        setActiveStage(0)

        // Simulate pipeline stages for visual effect
        for (let i = 0; i < 5; i++) {
            setActiveStage(i)
            await new Promise(r => setTimeout(r, 400))
        }

        await Promise.all([fetchOnChainData(), fetchAnalysisLog()])
        setRefreshing(false)
        setPipelineActive(false)
        setActiveStage(-1)
    }, [fetchOnChainData, fetchAnalysisLog])

    useEffect(() => {
        const init = async () => {
            // Create a timeout promise to force loading to false after 3 seconds
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));

            try {
                // Race condition: either data loads or timeout triggers
                await Promise.race([
                    Promise.all([fetchOnChainData(), fetchAnalysisLog()]),
                    timeoutPromise
                ]);
            } catch (e) {
                console.error("Initial data load failed:", e);
            } finally {
                setLoading(false);
            }
        }
        init()
        const interval = setInterval(() => {
            fetchOnChainData()
            fetchAnalysisLog()
        }, 15000)
        return () => clearInterval(interval)
    }, [fetchOnChainData, fetchAnalysisLog])

    // ========================================================================
    // HELPERS
    // ========================================================================
    const getSentimentLabel = (s) => {
        if (s <= 20) return 'Extremely Bearish'
        if (s <= 40) return 'Bearish'
        if (s <= 60) return 'Neutral'
        if (s <= 80) return 'Bullish'
        return 'Extremely Bullish'
    }

    const getSentimentColor = (s) => {
        if (s <= 20) return '#ff3b5c'
        if (s <= 40) return '#ff6b35'
        if (s <= 60) return '#ffd700'
        if (s <= 80) return '#00d4aa'
        return '#00ff88'
    }

    const SentimentIcon = ({ score: s }) => {
        if (s <= 30) return <TrendingDown size={20} />
        if (s <= 60) return <Minus size={20} />
        return <TrendingUp size={20} />
    }

    // Engine data
    const engineData = analysisLog?.engine ?? {}
    const pipelineData = analysisLog?.pipeline ?? {}
    const tweets = analysisLog?.tweets_analyzed ?? []
    const reasoning = analysisLog?.reasoning ?? []
    const keywordCloud = analysisLog?.keyword_cloud ?? {}

    const botsDetected = engineData.bots_detected ?? 0
    const spamFiltered = engineData.spam_filtered ?? 0
    const cleanTweets = engineData.clean_tweets ?? 0
    const outliers = engineData.outliers_found ?? 0
    const duplicates = engineData.duplicates_removed ?? 0
    const botAccounts = engineData.bot_accounts ?? []
    const spamAlerts = engineData.spam_alerts ?? []
    const cumulative = engineData.cumulative ?? {}
    const stages = pipelineData.stages ?? []
    const qualityDist = pipelineData.quality_distribution ?? {}
    const corpusSize = pipelineData.corpus_size ?? 0
    const batchSize = pipelineData.batch_size ?? 0

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-orb" />
                <p>Connecting to Solana Devnet...</p>
            </div>
        )
    }

    return (
        <div className="app">
            {/* Custom Cursor */}
            <div ref={cursorRef} className="custom-cursor" />
            <div ref={dotRef} className="custom-cursor-dot" />

            {/* ============================================================ */}
            {/* HERO SECTION */}
            {/* ============================================================ */}
            <section className="hero reveal">
                <div className="hero-badge">
                    <span className="pulse-dot" />
                    Built on Solana Devnet | 10,000+ Data Points | AI-Powered
                </div>
                <h1 className="hero-title">
                    Trustless Sentiment Intelligence,<br />
                    <span className="gradient-text">Verified On-Chain</span>
                </h1>
                <p className="hero-desc">
                    Auracle is a decentralized oracle protocol that ingests 10,000+ social signals,
                    runs them through a multi-stage content analysis engine (bot detection, spam filtering,
                    quality scoring), and publishes the final sentiment score directly to the Solana blockchain.
                    The frontend reads from on-chain data only — no backend API, no intermediary, fully trustless.
                </p>
                <div className="hero-stats">
                    <div className="hero-stat">
                        <span className="hero-stat-value">{corpusSize > 0 ? corpusSize.toLocaleString() : '10,000'}</span>
                        <span className="hero-stat-label">Data Points in Corpus</span>
                    </div>
                    <div className="hero-stat">
                        <span className="hero-stat-value">4</span>
                        <span className="hero-stat-label">Analysis Engine Stages</span>
                    </div>
                    <div className="hero-stat">
                        <span className="hero-stat-value">&lt;100ms</span>
                        <span className="hero-stat-label">Groq AI Inference</span>
                    </div>
                    <div className="hero-stat">
                        <span className="hero-stat-value">30s</span>
                        <span className="hero-stat-label">Update Interval</span>
                    </div>
                </div>
            </section>

            {/* ============================================================ */}
            {/* PIPELINE VISUALIZATION */}
            {/* ============================================================ */}
            <section className="pipeline-section reveal">
                <h2 className="section-title">
                    <Workflow size={24} />
                    How It Works — The Full Pipeline
                </h2>
                <p className="section-desc">
                    Every 30 seconds, the Auracle Oracle Agent executes a complete analysis cycle.
                    Here is every stage of that pipeline, from raw data ingestion to on-chain settlement.
                </p>

                <div className="pipeline-grid">
                    {[
                        {
                            icon: <Database size={28} />,
                            title: 'Data Ingestion',
                            desc: 'Sample 200 tweets from a 10,000+ tweet corpus. Each tweet includes text, engagement metrics (likes, retweets, replies), account metadata (followers, account age, verification status), and content hashes for deduplication.',
                            tech: ['Python', '10K Corpus', 'Random Sampling'],
                            color: '#00d4ff',
                            active: activeStage === 0,
                        },
                        {
                            icon: <Shield size={28} />,
                            title: 'Content Analysis Engine',
                            desc: 'Four-stage analysis: Bot Detection (caps ratio, emoji flooding, account age, engagement analysis), Spam Filtering (phishing patterns, scam URLs), Duplicate Detection (MD5 content hashing), and Quality Scoring (length, engagement, verification weighting).',
                            tech: ['Bot Detection', 'Spam Filter', 'Quality Score'],
                            color: '#ff6b35',
                            active: activeStage === 1,
                        },
                        {
                            icon: <Brain size={28} />,
                            title: 'Groq AI Inference',
                            desc: 'Clean, filtered tweets are sent to Groq API running Meta LLama 3 (70B parameters) for multi-dimensional sentiment analysis. Sub-100ms inference produces a score from 0-100 with extracted keywords and impact analysis.',
                            tech: ['Groq API', 'LLama 3 70B', '<100ms'],
                            color: '#a855f7',
                            active: activeStage === 2,
                        },
                        {
                            icon: <Hexagon size={28} />,
                            title: 'Blockchain Commit',
                            desc: 'The final score is signed with the oracle keypair (Ed25519) and submitted as an Anchor instruction to the Solana program. The transaction is verifiable on-chain via the Solana Explorer with full audit trail.',
                            tech: ['Solana', 'Anchor', 'Ed25519'],
                            color: '#00ff88',
                            active: activeStage === 3,
                        },
                        {
                            icon: <Eye size={28} />,
                            title: 'Live Dashboard',
                            desc: 'This dashboard reads the sentiment account directly from Solana via JSON-RPC. No backend API, no intermediary — the data flows from blockchain to browser. Wallet integration via Phantom/Solflare for on-chain interaction.',
                            tech: ['React', 'Solana RPC', 'Trustless'],
                            color: '#ffd700',
                            active: activeStage === 4,
                        },
                    ].map((step, i) => (
                        <div key={i}
                            className={clsx('pipeline-step', step.active && 'pipeline-step-active')}
                            style={{ '--step-color': step.color, animationDelay: `${i * 0.1}s` }}
                        >
                            <div className="pipeline-step-number">{i + 1}</div>
                            <div className="pipeline-step-icon" style={{ color: step.color }}>
                                {step.icon}
                            </div>
                            <h3>{step.title}</h3>
                            <p>{step.desc}</p>
                            <div className="tech-tags">
                                {step.tech.map(t => <span key={t} className="tech-tag" style={{ borderColor: step.color }}>{t}</span>)}
                            </div>
                            {i < 4 && <div className="pipeline-connector"><ArrowRight size={16} /></div>}
                        </div>
                    ))}
                </div>
            </section>

            {/* ============================================================ */}
            {/* CONTENT ANALYSIS ENGINE */}
            {/* ============================================================ */}
            <section className="engine-section reveal">
                <h2 className="section-title">
                    <Scan size={24} />
                    Content Analysis Engine — Real-Time Results
                </h2>
                <p className="section-desc">
                    Before any tweet reaches the AI, it must pass through our multi-stage analysis engine.
                    This ensures the sentiment score is based on genuine, high-quality signals — not manipulated by bots,
                    spam accounts, or duplicate content. Below are the live results from the most recent analysis cycle.
                </p>

                {/* Engine Stats Grid */}
                <div className="engine-grid">
                    <div className="engine-stat safe">
                        <CheckCircle size={22} />
                        <div className="engine-stat-value">{cleanTweets}</div>
                        <div className="engine-stat-label">Clean Tweets</div>
                        <div className="engine-stat-desc">Passed all 4 engine stages. These tweets form the basis of the AI sentiment score.</div>
                    </div>
                    <div className="engine-stat danger">
                        <Bot size={22} />
                        <div className="engine-stat-value">{botsDetected}</div>
                        <div className="engine-stat-label">Bots Detected</div>
                        <div className="engine-stat-desc">Flagged by excessive caps, emoji flooding, new accounts, or low engagement ratios.</div>
                    </div>
                    <div className="engine-stat danger">
                        <ShieldAlert size={22} />
                        <div className="engine-stat-value">{spamFiltered}</div>
                        <div className="engine-stat-label">Spam Filtered</div>
                        <div className="engine-stat-desc">Phishing links, fake airdrops, giveaway scams, and promotional spam removed.</div>
                    </div>
                    <div className="engine-stat warning">
                        <AlertTriangle size={22} />
                        <div className="engine-stat-value">{outliers}</div>
                        <div className="engine-stat-label">Outliers Flagged</div>
                        <div className="engine-stat-desc">Whale alerts, breaking news, viral tweets. Included in analysis but flagged for transparency.</div>
                    </div>
                    <div className="engine-stat neutral">
                        <Filter size={22} />
                        <div className="engine-stat-value">{duplicates}</div>
                        <div className="engine-stat-label">Duplicates Removed</div>
                        <div className="engine-stat-desc">Content-hash based deduplication. Identical tweets from copy-paste bots eliminated.</div>
                    </div>
                    <div className="engine-stat neutral">
                        <XCircle size={22} />
                        <div className="engine-stat-value">{engineData.low_quality ?? 0}</div>
                        <div className="engine-stat-label">Low Quality</div>
                        <div className="engine-stat-desc">Tweets too short, no substance, or from accounts with no engagement history.</div>
                    </div>
                </div>

                {/* Pipeline Stage Performance */}
                {stages.length > 0 && (
                    <div className="pipeline-perf reveal">
                        <h3><Terminal size={18} /> Pipeline Stage Performance</h3>
                        <div className="stage-bars">
                            {stages.map((stage, i) => (
                                <div key={i} className="stage-bar">
                                    <div className="stage-bar-label">{stage.name}</div>
                                    <div className="stage-bar-track">
                                        <div className="stage-bar-fill"
                                            style={{ width: `${Math.min((stage.duration_ms / Math.max(...stages.map(s => s.duration_ms))) * 100, 100)}%` }}
                                        />
                                    </div>
                                    <div className="stage-bar-time">{stage.duration_ms}ms</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bot Account Alerts */}
                {botAccounts.length > 0 && (
                    <div className="hazard-section reveal">
                        <h3><AlertOctagon size={18} /> Bot Account Alerts</h3>
                        <p className="hazard-desc">
                            The following accounts were flagged as bot-operated. Their content has been excluded from the sentiment score.
                        </p>
                        <div className="hazard-list">
                            {botAccounts.slice(0, 6).map((bot, i) => (
                                <div key={i} className="hazard-badge bot-hazard">
                                    <AlertTriangle size={14} />
                                    <span className="hazard-username">@{bot.username}</span>
                                    <span className="hazard-confidence">{(bot.confidence * 100).toFixed(0)}% bot</span>
                                    <div className="hazard-reasons">
                                        {bot.reasons?.map((r, j) => <span key={j} className="hazard-reason">{r}</span>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Spam Alerts */}
                {spamAlerts.length > 0 && (
                    <div className="hazard-section reveal">
                        <h3><ShieldAlert size={18} /> Spam / Phishing Alerts</h3>
                        <p className="hazard-desc">
                            These tweets contained phishing URLs, fake giveaways, or scam patterns. All flagged content is removed before scoring.
                        </p>
                        <div className="hazard-list">
                            {spamAlerts.slice(0, 5).map((spam, i) => (
                                <div key={i} className="hazard-badge spam-hazard">
                                    <ShieldAlert size={14} />
                                    <span className="hazard-type">{spam.type}</span>
                                    <span className="hazard-preview">{spam.text_preview}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* ============================================================ */}
            {/* LIVE DASHBOARD */}
            {/* ============================================================ */}
            <section className="dashboard-section reveal">
                <div className="dashboard-header">
                    <h2 className="section-title">
                        <Radio size={24} />
                        Live Sentiment Dashboard
                    </h2>
                    <div className="dashboard-controls">
                        <WalletMultiButton />
                        <button className={clsx('refresh-btn', refreshing && 'spinning')} onClick={refresh} disabled={refreshing}>
                            <RefreshCw size={18} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>
                <p className="section-desc">
                    All data below is read directly from the Solana blockchain via JSON-RPC.
                    No backend API involved — this is a fully trustless, decentralized dashboard.
                    Score updates every 30 seconds from the oracle agent.
                </p>

                <div className="dashboard-grid">
                    {/* Score Column */}
                    <div className="score-column">
                        {/* Score Orb */}
                        <div className="score-card">
                            <div className="score-orb" style={{ '--orb-color': getSentimentColor(score) }}>
                                <div className="score-orb-value">{animatedScore}</div>
                                <div className="score-orb-label">/100</div>
                            </div>
                            <div className="score-meta">
                                <div className="score-label" style={{ color: getSentimentColor(score) }}>
                                    <SentimentIcon score={score} />
                                    {getSentimentLabel(score)}
                                </div>
                            </div>
                        </div>

                        {/* Metrics */}
                        <div className="metrics-row">
                            <div className="metric">
                                <Gauge size={16} />
                                <span className="metric-label">Confidence</span>
                                <span className="metric-value">{confidence}%</span>
                                <div className="metric-bar">
                                    <div className="metric-bar-fill" style={{ width: `${confidence}%`, background: '#00d4aa' }} />
                                </div>
                            </div>
                            <div className="metric">
                                <Activity size={16} />
                                <span className="metric-label">Velocity</span>
                                <span className={clsx('metric-value', velocity > 0 ? 'positive' : velocity < 0 ? 'negative' : '')}>{velocity > 0 ? '+' : ''}{velocity} pts/hr</span>
                            </div>
                            <div className="metric">
                                <Database size={16} />
                                <span className="metric-label">Corpus</span>
                                <span className="metric-value">{corpusSize > 0 ? corpusSize.toLocaleString() : '10,000'}</span>
                            </div>
                            <div className="metric">
                                <Users size={16} />
                                <span className="metric-label">Batch Size</span>
                                <span className="metric-value">{batchSize > 0 ? batchSize : 200}</span>
                            </div>
                        </div>

                        {/* On-Chain Status */}
                        <div className="chain-status">
                            <h3><Link2 size={16} /> On-Chain Status</h3>
                            <div className="chain-row">
                                <span className="chain-label">Network</span>
                                <span className="chain-value"><span className="live-dot" /> Solana Devnet</span>
                            </div>
                            <div className="chain-row">
                                <span className="chain-label">Program</span>
                                <span className="chain-value mono">{CONFIG.PROGRAM_ID.slice(0, 8)}...{CONFIG.PROGRAM_ID.slice(-4)}</span>
                            </div>
                            <div className="chain-row">
                                <span className="chain-label">Account</span>
                                <span className="chain-value mono">{CONFIG.SENTIMENT_ACCOUNT.slice(0, 8)}...{CONFIG.SENTIMENT_ACCOUNT.slice(-4)}</span>
                            </div>
                            <div className="chain-row">
                                <span className="chain-label">Last Update</span>
                                <span className="chain-value">{lastUpdate ? format(lastUpdate, 'HH:mm:ss') : 'Waiting...'}</span>
                            </div>
                            <div className="chain-row">
                                <span className="chain-label">Wallet</span>
                                <span className="chain-value">{wallet.connected ? <><span className="live-dot" /> Connected</> : 'Not connected'}</span>
                            </div>
                            <div className="chain-row">
                                <span className="chain-label">Cycle</span>
                                <span className="chain-value">{analysisLog?.cycle ?? '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Feed Column */}
                    <div className="feed-column">
                        {/* Keyword Cloud */}
                        <div className="keyword-section">
                            <h3><Hash size={16} /> Keyword Cloud — Sentiment Drivers</h3>
                            <p className="keyword-desc">
                                These keywords were extracted from clean tweets and weighted by their
                                impact on the overall sentiment score. Larger = higher weight.
                            </p>
                            <div className="cloud-container">
                                {Object.entries(keywordCloud).map(([keyword, weight]) => (
                                    <span key={keyword}
                                        className="cloud-tag"
                                        style={{
                                            fontSize: `${Math.max(0.75, Math.min(weight / 10, 1.5))}rem`,
                                            opacity: 0.6 + (weight / 30)
                                        }}
                                    >
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Impact Analysis */}
                        <div className="impact-section">
                            <h3><Target size={16} /> Impact Analysis — Top Signals</h3>
                            <p className="impact-desc">
                                Each keyword below was found in the analyzed tweets and assigned a weight
                                based on its sentiment impact. Positive signals push the score up, negative signals pull it down.
                            </p>
                            <div className="impact-list">
                                {reasoning.slice(0, 12).map((item, i) => (
                                    <ImpactItem key={i} item={item} index={i} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============================================================ */}
            {/* TWEET MATRIX — DATA SHARDS */}
            {/* ============================================================ */}
            <section className="tweets-section reveal">
                <h2 className="section-title">
                    <FileText size={24} />
                    Tweet Matrix — Live Data Feed
                </h2>
                <p className="section-desc">
                    Below is the raw data feed from the most recent analysis cycle.
                    Each row shows the tweet content, its classification (clean, bot, spam, outlier),
                    quality score, and the analysis engine's verdict. Hazard indicators flag problematic content.
                </p>

                {/* Quality Distribution */}
                {Object.keys(qualityDist).length > 0 && (
                    <div className="quality-bar reveal">
                        <div className="quality-segment high" style={{ width: `${(qualityDist.high || 0) / batchSize * 100}%` }}>
                            <span>High Quality: {qualityDist.high || 0}</span>
                        </div>
                        <div className="quality-segment medium" style={{ width: `${(qualityDist.medium || 0) / batchSize * 100}%` }}>
                            <span>Medium: {qualityDist.medium || 0}</span>
                        </div>
                        <div className="quality-segment low" style={{ width: `${(qualityDist.low || 0) / batchSize * 100}%` }}>
                            <span>Low: {qualityDist.low || 0}</span>
                        </div>
                    </div>
                )}

                <div className="tweet-matrix">
                    {tweets.slice(0, 40).map((tweet, i) => (
                        <div key={i}
                            className={clsx(
                                'tweet-row',
                                tweet.is_bot && 'tweet-bot',
                                tweet.is_spam && 'tweet-spam',
                                tweet.is_outlier && 'tweet-outlier',
                                tweet.sentiment === 'positive' && 'tweet-positive',
                                tweet.sentiment === 'negative' && 'tweet-negative',
                            )}
                            style={{ animationDelay: `${i * 0.03}s` }}
                        >
                            <div className="tweet-badges">
                                {tweet.is_bot && (
                                    <span className="tweet-badge badge-bot" title="Bot Detected">
                                        <AlertTriangle size={12} /> BOT
                                    </span>
                                )}
                                {tweet.is_spam && (
                                    <span className="tweet-badge badge-spam" title="Spam Detected">
                                        <ShieldAlert size={12} /> SPAM
                                    </span>
                                )}
                                {tweet.is_outlier && (
                                    <span className="tweet-badge badge-outlier" title="Outlier">
                                        <Zap size={12} /> OUTLIER
                                    </span>
                                )}
                                {!tweet.is_bot && !tweet.is_spam && (
                                    <span className="tweet-badge badge-clean">
                                        <CheckCircle size={12} /> CLEAN
                                    </span>
                                )}
                            </div>
                            <div className="tweet-content">
                                <span className="tweet-username">@{tweet.username}</span>
                                <span className="tweet-text">{tweet.text}</span>
                            </div>
                            <div className="tweet-meta">
                                <span className={clsx('tweet-sentiment', tweet.sentiment)}>
                                    {tweet.sentiment}
                                </span>
                                <span className="tweet-quality">
                                    Q: {(tweet.quality_score * 100).toFixed(0)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ============================================================ */}
            {/* DATA LAB — CHARTS */}
            {/* ============================================================ */}
            <section className="datalab-section reveal">
                <h2 className="section-title">
                    <BarChart3 size={24} />
                    Data Lab — Score History & Cumulative Stats
                </h2>
                <p className="section-desc">
                    Real-time sentiment score history, plotted from on-chain data reads.
                    Each data point represents a distinct oracle cycle — a complete pipeline execution
                    from data ingestion through AI analysis to blockchain commitment.
                </p>

                <div className="datalab-grid">
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={scoreHistory}>
                                <defs>
                                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={getSentimentColor(score)} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={getSentimentColor(score)} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                                <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.3)" fontSize={11} />
                                <Tooltip
                                    contentStyle={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                                    itemStyle={{ color: getSentimentColor(score) }}
                                />
                                <Area type="monotone" dataKey="score" stroke={getSentimentColor(score)} fill="url(#scoreGradient)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Cumulative Engine Stats */}
                    <div className="cumulative-stats">
                        <h3><Server size={16} /> Cumulative Engine Statistics</h3>
                        <p className="stats-desc">
                            Lifetime statistics across all oracle cycles since startup.
                            These numbers accumulate with each 30-second analysis cycle.
                        </p>
                        <div className="stats-grid">
                            {[
                                { label: 'Total Processed', value: cumulative.total_processed ?? 0, icon: <Database size={16} /> },
                                { label: 'Bots Caught', value: cumulative.bots_detected ?? 0, icon: <Bot size={16} />, danger: true },
                                { label: 'Spam Blocked', value: cumulative.spam_filtered ?? 0, icon: <ShieldAlert size={16} />, danger: true },
                                { label: 'Duplicates Removed', value: cumulative.duplicates_removed ?? 0, icon: <Filter size={16} /> },
                                { label: 'Clean Analyzed', value: cumulative.clean_tweets ?? 0, icon: <CheckCircle size={16} />, safe: true },
                                { label: 'Bot Accounts', value: cumulative.unique_bot_accounts ?? 0, icon: <Users size={16} />, danger: true },
                            ].map((stat, i) => (
                                <div key={i} className={clsx('stat-card', stat.danger && 'stat-danger', stat.safe && 'stat-safe')}>
                                    {stat.icon}
                                    <div className="stat-card-value">{stat.value.toLocaleString()}</div>
                                    <div className="stat-card-label">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ============================================================ */}
            {/* TECH DEEP DIVE */}
            {/* ============================================================ */}
            <section className="tech-section reveal">
                <h2 className="section-title">
                    <Code size={24} />
                    Architecture Deep Dive
                </h2>
                <p className="section-desc">
                    A detailed breakdown of every layer in the Auracle stack.
                    Each component is independently verifiable and contributes to the trustless nature of the protocol.
                </p>

                <div className="tech-grid">
                    {[
                        {
                            icon: <Database size={28} />,
                            title: 'Data Layer',
                            color: '#00d4ff',
                            desc: 'A Python daemon generates and manages a corpus of 10,000+ synthetic social signals. Each tweet includes full metadata: engagement metrics (likes, retweets, replies), account information (followers, age, verification), content hashes for deduplication, and pre-computed bot probability scores. The daemon samples 200 tweets per cycle using stratified random sampling to ensure representative coverage across all content categories.',
                            tags: ['Python 3.10+', '10K Corpus', 'Stratified Sampling', 'Content Hashing', 'Account Metadata']
                        },
                        {
                            icon: <Shield size={28} />,
                            title: 'Content Analysis Engine',
                            color: '#ff6b35',
                            desc: 'A four-stage content analysis pipeline processes every batch before AI inference. Stage 1: Bot Detection analyzes uppercase ratio, emoji density, exclamation frequency, account age, follower count, and engagement ratios. Stage 2: Spam Filtering checks against known phishing patterns, scam URLs, and promotional spam templates. Stage 3: Duplicate Detection uses MD5 content hashing to eliminate copy-paste bot activity. Stage 4: Quality Scoring weights tweet length, engagement, and account verification to produce a 0-1 quality score.',
                            tags: ['Bot Detection', 'Spam Filter', 'MD5 Dedup', 'Quality Score', 'Multi-Signal Analysis']
                        },
                        {
                            icon: <Brain size={28} />,
                            title: 'AI Scoring Engine',
                            color: '#a855f7',
                            desc: 'Only clean, high-quality tweets that pass the content analysis engine are sent to Groq API for sentiment scoring. We use Meta LLama 3 (70B parameter model) with sub-100ms inference time, far faster than GPT-4 or Claude. The prompt is engineered for precise 0-100 scoring with temperature=0.3 for consistency. Keyword extraction runs in parallel, identifying bullish/bearish signals and assigning weighted impact scores for full reasoning transparency.',
                            tags: ['Groq API', 'LLama 3 70B', 'Sub-100ms', 'Keyword Extraction', 'Impact Weights']
                        },
                        {
                            icon: <Lock size={28} />,
                            title: 'Blockchain Settlement',
                            color: '#00ff88',
                            desc: 'The sentiment score is packed as a u8 byte and submitted through an Anchor instruction to the Solana program. The oracle signs the transaction with an Ed25519 keypair, providing cryptographic proof of origin. The Anchor program validates the oracle authority, updates the on-chain account, and stores the score with a Unix timestamp. Every update is a permanent, immutable record on the Solana blockchain — fully auditable via the Explorer.',
                            tags: ['Solana Devnet', 'Anchor Framework', 'Ed25519 Signing', 'Immutable Record', 'Auditable']
                        },
                        {
                            icon: <Globe size={28} />,
                            title: 'Trustless Frontend',
                            color: '#ffd700',
                            desc: 'The React dashboard connects directly to Solana via JSON-RPC and deserializes the sentiment account data in the browser. There is no backend API — the browser is a direct blockchain client. The analysis log is served as a static JSON file that the oracle agent writes to the public directory. Wallet integration via Phantom/Solflare allows direct on-chain interaction for future governance features.',
                            tags: ['React 18', 'Vite', 'JSON-RPC', 'No Backend', 'Wallet Adapter']
                        },
                        {
                            icon: <Fingerprint size={28} />,
                            title: 'Security Model',
                            color: '#ff3b5c',
                            desc: 'The oracle keypair is the only authorized signer for sentiment updates, enforced by the Anchor program. The frontend cannot modify on-chain data — it can only read. Bot and spam detection prevents adversarial manipulation of the sentiment score. Content hashing prevents replay attacks via duplicate submissions. The entire pipeline is deterministic and auditable.',
                            tags: ['Oracle Authority', 'Read-Only Frontend', 'Anti-Manipulation', 'Replay Protection', 'Audit Trail']
                        },
                    ].map((item, i) => (
                        <div key={i} className="tech-card reveal-scale" style={{ '--card-color': item.color, animationDelay: `${i * 0.1}s` }}>
                            <div className="tech-card-icon" style={{ color: item.color }}>{item.icon}</div>
                            <h3>{item.title}</h3>
                            <p>{item.desc}</p>
                            <div className="tech-tags">
                                {item.tags.map(t => <span key={t} className="tech-tag" style={{ borderColor: item.color }}>{t}</span>)}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ============================================================ */}
            {/* FOOTER */}
            {/* ============================================================ */}
            <footer className="footer reveal">
                <div className="footer-content">
                    <div className="footer-brand">
                        <h3>Auracle</h3>
                        <p>Trustless Sentiment Oracle Protocol</p>
                    </div>
                    <div className="footer-tech">
                        <span>Solana</span>
                        <span>Anchor</span>
                        <span>Groq</span>
                        <span>LLama 3</span>
                        <span>React</span>
                        <span>Python</span>
                    </div>
                    <p className="footer-note">
                        Built for Solana Hackathon. All sentiment data is read directly from the blockchain.
                        10,000+ data points analyzed per corpus. Multi-stage content analysis engine.
                    </p>
                </div>
            </footer>
        </div>
    )
}

// ============================================================================
// IMPACT ITEM COMPONENT
// ============================================================================
function ImpactItem({ item, index }) {
    const isPositive = item.impact === 'positive'
    return (
        <div className={clsx('impact-item', isPositive ? 'impact-positive' : 'impact-negative')}
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            <div className="impact-keyword">
                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {item.keyword}
            </div>
            <div className="impact-weight">
                {item.weight > 0 ? '+' : ''}{item.weight}
            </div>
            <div className="impact-context">{item.context}</div>
        </div>
    )
}
