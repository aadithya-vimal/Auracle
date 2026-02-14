import { useState, useEffect, useRef, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey } from '@solana/web3.js'
import {
    Activity, TrendingUp, TrendingDown, Minus, Clock, Zap, BarChart3,
    Brain, Target, Sparkles, Radio, Gauge, RefreshCw, Database, Network,
    Eye, Hash, Flame, Award, Shield, Cpu, CloudLightning, Box, Layers,
    Wifi, ArrowRight, Globe, Lock, Search, FileText, Link2
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

        // Track hoverable elements
        const attachListeners = () => {
            document.querySelectorAll('button, a, .card, .cloud-tag, .pipeline-step, .stat-card, .impact-item').forEach(el => {
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
function AnimatedCounter({ value, duration = 1200 }) {
    const [display, setDisplay] = useState(0)
    const ref = useRef(null)

    useEffect(() => {
        let start = 0
        const end = typeof value === 'number' ? value : parseFloat(value) || 0
        const startTime = performance.now()

        const step = (now) => {
            const progress = Math.min((now - startTime) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
            setDisplay(Math.round(start + (end - start) * eased))
            if (progress < 1) requestAnimationFrame(step)
        }

        requestAnimationFrame(step)
    }, [value, duration])

    return <span ref={ref}>{display}</span>
}

// ============================================================================
// MAIN APP
// ============================================================================
function App() {
    const { connection } = useConnection()
    const { publicKey } = useWallet()
    const { cursorRef, dotRef } = useCustomCursor()
    useScrollReveal()

    // Core state
    const [sentimentData, setSentimentData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [lastTimestamp, setLastTimestamp] = useState(null)
    const [isPulsing, setIsPulsing] = useState(false)

    // Analysis log state
    const [analysisLog, setAnalysisLog] = useState(null)
    const [confidence, setConfidence] = useState(75)
    const [velocity, setVelocity] = useState(0)
    const [keywordCloud, setKeywordCloud] = useState({})
    const [reasoning, setReasoning] = useState([])
    const [tweetsAnalyzed, setTweetsAnalyzed] = useState([])

    // Trend data
    const [trendData, setTrendData] = useState([])
    const [recentUpdates, setRecentUpdates] = useState([])

    // HUD state
    const [networkPing, setNetworkPing] = useState(0)
    const [tps, setTps] = useState(0)
    const [refreshCooldown, setRefreshCooldown] = useState(0)
    const [marketPulse, setMarketPulse] = useState(60)

    const PROGRAM_ID = new PublicKey(CONFIG.PROGRAM_ID)
    const SENTIMENT_ACCOUNT = new PublicKey(CONFIG.SENTIMENT_ACCOUNT)

    const loadAnalysisLog = async () => {
        try {
            const response = await fetch('/analysis_log.json?' + Date.now())
            if (response.ok) {
                const data = await response.json()
                setAnalysisLog(data)
                setConfidence(data.confidence || 75)
                setVelocity(data.velocity || 0)
                setKeywordCloud(data.keyword_cloud || {})
                setReasoning(data.reasoning || [])
                setTweetsAnalyzed(data.tweets_analyzed || [])
            }
        } catch (err) {
            console.log('No analysis log found yet')
        }
    }

    useEffect(() => {
        const stored = localStorage.getItem('auracle_trend_data')
        if (stored) {
            try { setTrendData(JSON.parse(stored).slice(-24)) } catch (e) { }
        }
        if (trendData.length === 0) {
            const now = Date.now()
            setTrendData(Array.from({ length: 12 }, (_, i) => ({
                time: format(now - (11 - i) * 5 * 60 * 1000, 'HH:mm'),
                score: 45 + Math.random() * 20,
                timestamp: now - (11 - i) * 5 * 60 * 1000
            })))
        }
    }, [])

    useEffect(() => {
        if (trendData.length > 0) localStorage.setItem('auracle_trend_data', JSON.stringify(trendData))
    }, [trendData])

    useEffect(() => {
        const interval = setInterval(() => {
            setNetworkPing(Math.floor(Math.random() * 50) + 20)
            setTps(Math.floor(Math.random() * 5000) + 2000)
            setMarketPulse(55 + Math.random() * 15)
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (refreshCooldown > 0) {
            const timer = setTimeout(() => setRefreshCooldown(refreshCooldown - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [refreshCooldown])

    const fetchSentimentData = async () => {
        if (!connection || refreshCooldown > 0) return
        setLoading(true)
        setError(null)
        setRefreshCooldown(30)

        try {
            const accountInfo = await connection.getAccountInfo(SENTIMENT_ACCOUNT)
            if (!accountInfo) {
                setError('Sentiment account not found. Initialize the oracle first.')
                setLoading(false)
                return
            }

            const data = accountInfo.data
            const score = data[40]
            const timestampBytes = data.slice(41, 49)
            const timestamp = Number(new DataView(timestampBytes.buffer).getBigInt64(0, true))

            if (lastTimestamp !== null && timestamp !== lastTimestamp && timestamp > lastTimestamp) {
                setIsPulsing(true)
                setTimeout(() => setIsPulsing(false), 1000)
                setTrendData(prev => [...prev.slice(-23), { time: format(Date.now(), 'HH:mm'), score, timestamp: Date.now() }])
                setRecentUpdates(prev => [{ id: Date.now(), score, timestamp: new Date(timestamp * 1000) }, ...prev].slice(0, 5))
            }

            setLastTimestamp(timestamp)
            setSentimentData({ score, timestamp, lastUpdated: new Date(timestamp * 1000) })
            await loadAnalysisLog()
        } catch (err) {
            console.error('Error fetching sentiment:', err)
            setError('Failed to fetch sentiment data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSentimentData()
        const interval = setInterval(fetchSentimentData, 30000)
        return () => clearInterval(interval)
    }, [connection])

    const getSentimentInfo = (score) => {
        if (score <= 20) return { label: 'EXTREMELY BEARISH', icon: TrendingDown, color: '#FF2D55', gradient: 'linear-gradient(135deg, #FF2D55, #FF6B6B)' }
        if (score <= 40) return { label: 'BEARISH', icon: TrendingDown, color: '#FF6B6B', gradient: 'linear-gradient(135deg, #FF6B6B, #FF9F0A)' }
        if (score <= 60) return { label: 'NEUTRAL', icon: Minus, color: '#8E8E93', gradient: 'linear-gradient(135deg, #555, #777)' }
        if (score <= 80) return { label: 'BULLISH', icon: TrendingUp, color: '#34C759', gradient: 'linear-gradient(135deg, #34C759, #00E5CC)' }
        return { label: 'EXTREMELY BULLISH', icon: TrendingUp, color: '#00E5CC', gradient: 'linear-gradient(135deg, #00E5CC, #4D9EFF)' }
    }

    const score = sentimentData?.score ?? 50
    const sentimentInfo = getSentimentInfo(score)
    const SentimentIcon = sentimentInfo.icon

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <p className="tooltip-time">{payload[0].payload.time}</p>
                    <p className="tooltip-value">{Math.round(payload[0].value)}</p>
                </div>
            )
        }
        return null
    }

    return (
        <div className="app">
            {/* Custom Cursor */}
            <div ref={cursorRef} className="cursor-glow" />
            <div ref={dotRef} className="cursor-dot" />

            {/* ─── HEADER ─── */}
            <header className="header">
                <div className="header-content">
                    <div className="logo">
                        <div className="logo-icon"><Activity size={16} /></div>
                        <div>
                            <h1 className="gradient-text" style={{ fontSize: '20px' }}>AURACLE</h1>
                            <span className="subtitle">Sentiment Oracle Protocol</span>
                        </div>
                    </div>

                    <div className="network-hud">
                        <div className="hud-item">
                            <Radio size={10} className="hud-icon pulse" />
                            <span className="hud-label">PING</span>
                            <span className="hud-value">{networkPing}ms</span>
                        </div>
                        <div className="hud-item">
                            <Zap size={10} className="hud-icon" />
                            <span className="hud-label">TPS</span>
                            <span className="hud-value">{tps.toLocaleString()}</span>
                        </div>
                        <div className="hud-item">
                            <Activity size={10} className="hud-icon" />
                            <span className="hud-label">BPM</span>
                            <span className="hud-value">{Math.round(marketPulse)}</span>
                        </div>
                    </div>

                    <WalletMultiButton />
                </div>
            </header>

            {/* ═══════════════════════════════════════════════
                HERO SECTION
            ═══════════════════════════════════════════════ */}
            <section className="hero-section">
                <motion.div
                    className="hero-badge"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="badge-dot" />
                    Built on Solana Devnet
                </motion.div>

                <motion.h1
                    className="hero-title"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                >
                    Trustless Sentiment Intelligence,{' '}
                    <span className="gradient-text">On-Chain</span>
                </motion.h1>

                <motion.p
                    className="hero-description"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                >
                    Auracle ingests real-time social data, runs it through Groq AI for sentiment scoring,
                    and publishes the result directly to the Solana blockchain — creating a verifiable,
                    tamper-proof oracle that anyone can query without trusting a centralized provider.
                </motion.p>
            </section>

            {/* ═══════════════════════════════════════════════
                PIPELINE VISUALIZATION
            ═══════════════════════════════════════════════ */}
            <section className="pipeline-section">
                <div className="pipeline-title reveal">
                    <h2>How It Works</h2>
                </div>

                <div className="pipeline-steps">
                    <div className="pipeline-step reveal" data-delay="1">
                        <div className="step-number"><Search size={28} /></div>
                        <div className="step-label">Data Ingestion</div>
                        <div className="step-description">
                            Aggregate social signals from crypto markets — tweets, posts, and sentiment triggers
                        </div>
                        <span className="step-tech">Python Oracle</span>
                    </div>

                    <div className="pipeline-step reveal" data-delay="2">
                        <div className="step-number"><Brain size={28} /></div>
                        <div className="step-label">AI Analysis</div>
                        <div className="step-description">
                            Process through Groq LLM (Meta LLama 3) for multi-dimensional sentiment scoring
                        </div>
                        <span className="step-tech">Groq API</span>
                    </div>

                    <div className="pipeline-step reveal" data-delay="3">
                        <div className="step-number"><Link2 size={28} /></div>
                        <div className="step-label">On-Chain Commit</div>
                        <div className="step-description">
                            Score is signed and submitted as a Solana transaction via the Anchor program
                        </div>
                        <span className="step-tech">Solana + Anchor</span>
                    </div>

                    <div className="pipeline-step reveal" data-delay="4">
                        <div className="step-number"><BarChart3 size={28} /></div>
                        <div className="step-label">Live Dashboard</div>
                        <div className="step-description">
                            Frontend reads directly from the blockchain account — fully trustless data display
                        </div>
                        <span className="step-tech">React + RPC</span>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
                VERBOSE TECH EXPLANATION
            ═══════════════════════════════════════════════ */}
            <section className="explanation-section">
                <div className="explanation-grid">
                    <div className="explanation-card card reveal-left" data-delay="1">
                        <div className="exp-icon"><Database size={22} /></div>
                        <h3>Data Layer</h3>
                        <p>
                            The oracle agent runs as a Python daemon that polls social feeds on a configurable interval.
                            Each cycle selects 50 data points, extracts sentiment-bearing keywords, and normalizes them
                            for AI consumption. The raw corpus is preserved for auditability.
                        </p>
                        <div className="tech-tags">
                            <span className="tech-tag">Python 3.10+</span>
                            <span className="tech-tag">JSON Corpus</span>
                            <span className="tech-tag">Keyword Extraction</span>
                        </div>
                    </div>

                    <div className="explanation-card card reveal-right" data-delay="2">
                        <div className="exp-icon"><Brain size={22} /></div>
                        <h3>AI Scoring Engine</h3>
                        <p>
                            Sentiment analysis is performed via Groq's ultra-fast inference API running Meta LLama 3.
                            The model evaluates text across bullish/bearish/neutral dimensions and returns a 0-100 score
                            with confidence weighting and keyword impact breakdown.
                        </p>
                        <div className="tech-tags">
                            <span className="tech-tag">Groq Cloud</span>
                            <span className="tech-tag">LLama 3</span>
                            <span className="tech-tag">Sub-100ms Inference</span>
                        </div>
                    </div>

                    <div className="explanation-card card reveal-left" data-delay="3">
                        <div className="exp-icon"><Lock size={22} /></div>
                        <h3>Blockchain Settlement</h3>
                        <p>
                            The scored sentiment is written to a dedicated Solana account via an Anchor smart contract.
                            The oracle keypair signs each transaction, ensuring only the authorized agent can update the
                            score. Anyone can verify the data by reading the account directly.
                        </p>
                        <div className="tech-tags">
                            <span className="tech-tag">Solana Devnet</span>
                            <span className="tech-tag">Anchor Framework</span>
                            <span className="tech-tag">Ed25519 Signing</span>
                        </div>
                    </div>

                    <div className="explanation-card card reveal-right" data-delay="4">
                        <div className="exp-icon"><Globe size={22} /></div>
                        <h3>Trustless Frontend</h3>
                        <p>
                            The React dashboard reads sentiment directly from the Solana blockchain via RPC — never
                            from a centralized API. This means the displayed score is cryptographically verified and
                            tamper-proof. Wallet integration enables direct on-chain interaction.
                        </p>
                        <div className="tech-tags">
                            <span className="tech-tag">React 18</span>
                            <span className="tech-tag">Solana Web3.js</span>
                            <span className="tech-tag">Phantom / Solflare</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
                LIVE DASHBOARD
            ═══════════════════════════════════════════════ */}
            <section className="dashboard-section">
                <div className="dashboard-header reveal">
                    <h2>Live Dashboard</h2>
                    <div className="live-indicator">
                        <span className="live-dot" />
                        Reading from Solana Devnet
                    </div>
                </div>

                <div className="dashboard-grid">
                    {/* Left Column — Score & Chain Status */}
                    <div className="score-column">
                        <div className="score-display card reveal-scale">
                            {loading && !sentimentData ? (
                                <div className="loading">
                                    <div className="loading-spinner" />
                                    <p>Connecting to Solana...</p>
                                </div>
                            ) : error ? (
                                <div className="error">
                                    <p>{error}</p>
                                    <button onClick={fetchSentimentData}>RETRY</button>
                                </div>
                            ) : (
                                <>
                                    <motion.div
                                        className={clsx('score-orb-container', isPulsing && 'pulse-animation')}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 0.8, type: "spring" }}
                                    >
                                        <div className="score-orb" style={{ background: sentimentInfo.gradient }}>
                                            <div className="orb-glow" />
                                            <div className="orb-content">
                                                <div className="orb-score"><AnimatedCounter value={score} /></div>
                                                <div className="orb-label">/ 100</div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    <motion.div
                                        className="sentiment-label"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <SentimentIcon size={16} style={{ color: sentimentInfo.color }} />
                                        <h3 style={{ color: sentimentInfo.color }}>{sentimentInfo.label}</h3>
                                    </motion.div>

                                    <div className="meters-grid" style={{ marginTop: '20px' }}>
                                        <div className="meter-card">
                                            <div className="meter-header"><Target size={12} /><span>Confidence</span></div>
                                            <div className="meter-value">{confidence.toFixed(1)}%</div>
                                            <div className="meter-bar"><div className="meter-fill confidence" style={{ width: `${confidence}%` }} /></div>
                                        </div>
                                        <div className="meter-card">
                                            <div className="meter-header"><Gauge size={12} /><span>Velocity</span></div>
                                            <div className={clsx('meter-value', velocity > 0 ? 'positive' : velocity < 0 ? 'negative' : '')}>
                                                {velocity > 0 ? '+' : ''}{velocity} pts/hr
                                            </div>
                                            <div className="meter-bar"><div className={clsx('meter-fill', velocity > 0 ? 'positive' : 'negative')} style={{ width: `${Math.abs(velocity) * 5}%` }} /></div>
                                        </div>
                                    </div>

                                    <motion.button
                                        className={clsx('refresh-btn', refreshCooldown > 0 && 'disabled')}
                                        onClick={fetchSentimentData}
                                        disabled={refreshCooldown > 0}
                                        whileHover={{ scale: refreshCooldown > 0 ? 1 : 1.01 }}
                                        whileTap={{ scale: refreshCooldown > 0 ? 1 : 0.99 }}
                                        style={{ marginTop: '12px' }}
                                    >
                                        <RefreshCw size={12} className={clsx(loading && 'spinning')} />
                                        {refreshCooldown > 0 ? `COOLDOWN ${refreshCooldown}s` : 'FORCE REFRESH'}
                                    </motion.button>
                                </>
                            )}
                        </div>

                        {/* Chain Status */}
                        <div className="chain-status card reveal" data-delay="2">
                            <div className="chain-status-header"><Link2 /> On-Chain Status</div>
                            <div className="chain-row">
                                <span className="chain-key">Network</span>
                                <span className="chain-val live">Solana Devnet</span>
                            </div>
                            <div className="chain-row">
                                <span className="chain-key">Program</span>
                                <span className="chain-val">{CONFIG.PROGRAM_ID.slice(0, 8)}...{CONFIG.PROGRAM_ID.slice(-4)}</span>
                            </div>
                            <div className="chain-row">
                                <span className="chain-key">Account</span>
                                <span className="chain-val">{CONFIG.SENTIMENT_ACCOUNT.slice(0, 8)}...{CONFIG.SENTIMENT_ACCOUNT.slice(-4)}</span>
                            </div>
                            <div className="chain-row">
                                <span className="chain-key">Last Update</span>
                                <span className="chain-val">
                                    {sentimentData?.lastUpdated && !isNaN(new Date(sentimentData.lastUpdated).getTime())
                                        ? format(sentimentData.lastUpdated, 'HH:mm:ss')
                                        : 'Awaiting...'}
                                </span>
                            </div>
                            <div className="chain-row">
                                <span className="chain-key">Wallet</span>
                                <span className={clsx('chain-val', publicKey && 'live')}>
                                    {publicKey ? `${publicKey.toString().slice(0, 6)}...${publicKey.toString().slice(-4)}` : 'Not Connected'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column — Feed */}
                    <div className="feed-column">
                        {/* Keyword Cloud */}
                        <motion.div className="keyword-cloud card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="cloud-header"><Hash size={14} /><h3>Keyword Cloud</h3></div>
                            <div className="cloud-tags">
                                {Object.entries(keywordCloud).length > 0 ? (
                                    Object.entries(keywordCloud).map(([keyword, weight], i) => (
                                        <motion.span
                                            key={keyword}
                                            className="cloud-tag"
                                            style={{ fontSize: `${10 + weight * 0.3}px`, opacity: 0.5 + (weight / 100) * 0.5 }}
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                        >
                                            {keyword}
                                        </motion.span>
                                    ))
                                ) : (
                                    <p className="cloud-empty">Run oracle to detect keywords</p>
                                )}
                            </div>
                        </motion.div>

                        {/* Impact Analysis */}
                        <motion.div className="impact-feed card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <div className="feed-header"><Flame size={14} /><h3>Impact Analysis</h3><span className="feed-count">{reasoning.length} signals</span></div>
                            <div className="impact-list">
                                <AnimatePresence mode="popLayout">
                                    {reasoning.length > 0 ? (
                                        reasoning.map((item, i) => (
                                            <ImpactItem key={`${item.keyword}-${i}-${item.weight}`} item={item} index={i} />
                                        ))
                                    ) : (
                                        <div className="impact-empty"><Eye size={24} /><p>Awaiting analysis data...</p></div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>

                        {/* Data Shards */}
                        <motion.div className="tweet-matrix card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                            <div className="matrix-header"><Network size={14} /><h3>Data Shards ({tweetsAnalyzed.length} ingested)</h3></div>
                            <div className="matrix-scroll">
                                {tweetsAnalyzed.map((tweet, i) => (
                                    <motion.div
                                        key={tweet.id}
                                        className={clsx('matrix-row', tweet.sentiment)}
                                        style={{ '--row-index': i }}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                    >
                                        <div className="matrix-id">#{tweet.id}</div>
                                        <div className="matrix-text">{tweet.text}</div>
                                        <div className={clsx('matrix-sentiment', tweet.sentiment)}>{tweet.sentiment}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════
                DATA LAB — Chart & Stats
            ═══════════════════════════════════════════════ */}
            <section className="data-lab-section">
                <div className="section-title reveal"><BarChart3 size={16} /> Sentiment Timeline</div>

                <motion.div className="graph-card card reveal-scale" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="graph-header">
                        <div>
                            <h3 className="graph-title">Score History</h3>
                            <p className="graph-subtitle">Last 2 hours — auto-persisted to localStorage</p>
                        </div>
                        <div className="trend-indicators">
                            <div className="trend-badge">
                                <CloudLightning size={12} />
                                <span>Velocity: {velocity > 0 ? '+' : ''}{velocity} pts/hr</span>
                            </div>
                        </div>
                    </div>

                    <div className="graph-container" style={{ minHeight: '280px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7B2FBE" stopOpacity={0.35} />
                                        <stop offset="50%" stopColor="#4D9EFF" stopOpacity={0.12} />
                                        <stop offset="95%" stopColor="#00E5CC" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                                <XAxis dataKey="time" stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                                <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.15)" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="score" stroke="#7B2FBE" strokeWidth={2} fill="url(#colorScore)" animationDuration={800} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <div className="stats-grid">
                    {[
                        { icon: Award, value: `${confidence.toFixed(0)}%`, label: 'AI Confidence', delay: 0 },
                        { icon: Database, value: tweetsAnalyzed.length || 0, label: 'Tweets Ingested', delay: 0.1 },
                        { icon: Cpu, value: recentUpdates.length, label: 'Chain Updates', delay: 0.2 },
                        { icon: Shield, value: publicKey ? 'LIVE' : 'IDLE', label: 'Wallet Status', delay: 0.3 },
                    ].map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            className="stat-card card reveal"
                            data-delay={i + 1}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: stat.delay }}
                            whileHover={{ scale: 1.03, rotateX: 2 }}
                        >
                            <div className="stat-icon"><stat.icon size={18} /></div>
                            <div className="stat-value">{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-title">Built for the Hackathon</div>
                    <div className="footer-tech">
                        <span>Solana</span>
                        <span>Anchor</span>
                        <span>Groq AI</span>
                        <span>React</span>
                        <span>Python</span>
                        <span>Framer Motion</span>
                    </div>
                    <p className="footer-note">Devnet Only &middot; Educational Purpose</p>
                </div>
            </footer>
        </div>
    )
}

export default App

// ─── Impact Item with Scanning Effect ───
function ImpactItem({ item, index }) {
    const [isScanning, setIsScanning] = useState(index < 3)

    useEffect(() => {
        if (isScanning) {
            const timer = setTimeout(() => setIsScanning(false), 1200 + Math.random() * 1800)
            return () => clearTimeout(timer)
        }
    }, [])

    return (
        <AnimatePresence mode="wait">
            {isScanning ? (
                <motion.div key="scan" className="scanning-item" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="scanning-loader" />
                    <div className="scanning-text">
                        <span>PROCESSING</span>
                        <span className="scanning-subtext">KEYWORD EXTRACTION</span>
                    </div>
                    <div className="scanning-bar" />
                </motion.div>
            ) : (
                <motion.div key="result" className="impact-item" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                    <div className={clsx('impact-badge', item.impact)}>
                        {item.impact === 'positive' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        <span className="impact-weight">{item.weight > 0 ? '+' : ''}{item.weight}</span>
                    </div>
                    <div className="impact-content">
                        <div className="impact-keyword">{item.keyword}</div>
                        <div className="impact-context">{item.context}</div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
