import { useCallback, useEffect, useRef, useState } from 'react'

// ─── 类型定义 ───
type WolfState = 'idle' | 'listening' | 'thinking' | 'responding' | 'confused'
type CardType = 'nav' | 'music' | 'ac' | 'weather' | 'guide' | 'confused' | null

interface ConvEntry {
  role: 'user' | 'assistant'
  text: string
  cardType?: CardType
  ts: number
}

interface DialogContext {
  lastIntent: CardType
  lastDestination?: string
  lastSong?: string
  lastArtist?: string
  lastTemp?: number
  lastCity?: string
}

const DEFAULT_CONTEXT: DialogContext = { lastIntent: null }

// ─── 模拟响应数据 ───
const MOCK_RESPONSES: Record<string, { type: CardType; label: string }> = {
  nav: { type: 'nav', label: '🗺 已规划路线' },
  music: { type: 'music', label: '🎵 正在播放' },
  ac: { type: 'ac', label: '❄️ 已调节空调' },
  weather: { type: 'weather', label: '☀️ 今日天气' },
}

function matchIntent(text: string, ctx?: DialogContext): CardType {
  const t = text.toLowerCase()
  // 上下文感知：换一个、改去、不去等
  if (ctx && ctx.lastIntent) {
    if (/换(一个|地方|首歌|成)|改[成去]|不(去|要|是)|别的|其他|重新/.test(t)) {
      return ctx.lastIntent
    }
  }
  if (/导航|公司|朝阳|路线|去.*路|目的地|回家|去机场|去车站|怎么走|到/.test(t)) return 'nav'
  if (/音乐|播放|周杰伦|晴天|歌|歌曲|听|放|唱|声/.test(t)) return 'music'
  if (/空调|温度|冷|热|调|制冷|制热|通风|风量|暖/.test(t)) return 'ac'
  if (/天气|下雨|温度|湿度|今天|明天|新闻|资讯|百科|什么|查询/.test(t)) return 'weather'
  return null
}

// 提取上下文实体
function extractEntities(text: string, intent: CardType): Partial<DialogContext> {
  const t = text.toLowerCase()
  const entities: Partial<DialogContext> = {}
  if (intent === 'nav') {
    // 提取目的地（简单的关键词匹配）
    const destMatches = t.match(/去(.+?)(?:怎么走|的路线|吧|$)/)
    if (destMatches && destMatches[1]) entities.lastDestination = destMatches[1].trim()
  }
  if (intent === 'music') {
    if (/周杰伦/.test(t)) entities.lastArtist = '周杰伦'
    if (/晴天/.test(t)) entities.lastSong = '晴天'
  }
  if (intent === 'ac') {
    const tempMatch = t.match(/(\d+)\s*度/)
    if (tempMatch) entities.lastTemp = parseInt(tempMatch[1])
  }
  return entities
}

export default function CarAssistantView() {
  // ─── 状态 ───
  const [wolfState, setWolfState] = useState<WolfState>('idle')
  const [cardType, setCardType] = useState<CardType>(null)
  const [isDriving, setIsDriving] = useState(false)
  const [inputText, setInputText] = useState('')
  const [clock, setClock] = useState('')
  const [acTemp, setAcTemp] = useState(22)
  const [convHistory, setConvHistory] = useState<ConvEntry[]>([])
  const [dialogCtx, setDialogCtx] = useState<DialogContext>(DEFAULT_CONTEXT)
  const [contextActive, setContextActive] = useState(false)

  const listeningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const micSimTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contextTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const convEndRef = useRef<HTMLDivElement | null>(null)

  // ─── 时钟 ───
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setClock(String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'))
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [])

  // ─── 清理计时器 ───
  const clearTimers = () => {
    if (listeningTimer.current) { clearTimeout(listeningTimer.current); listeningTimer.current = null }
    if (micSimTimer.current) { clearTimeout(micSimTimer.current); micSimTimer.current = null }
    if (contextTimer.current) { clearTimeout(contextTimer.current); contextTimer.current = null }
  }

  // ─── 清除对话上下文 ───
  const clearContext = useCallback(() => {
    setDialogCtx(DEFAULT_CONTEXT)
    setContextActive(false)
    if (contextTimer.current) { clearTimeout(contextTimer.current); contextTimer.current = null }
  }, [])

  // ─── 滚动到底部 ───
  const scrollToBottom = () => {
    setTimeout(() => {
      convEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  // ─── 状态切换核心 ───
  const switchState = useCallback((state: WolfState, card?: CardType) => {
    clearTimers()
    setWolfState(state)
    if (card !== undefined) {
      setCardType(card)
    } else if (state !== 'responding' && state !== 'confused') {
      if (state === 'idle') setCardType('guide')
      else setCardType(null)
    }
  }, [])

  // ─── 处理用户输入（含上下文） ───
  const handleUserInput = useCallback((text: string) => {
    if (!text.trim()) return

    // 添加到对话历史
    const userEntry: ConvEntry = { role: 'user', text: text.trim(), ts: Date.now() }
    setConvHistory(prev => [...prev, userEntry])
    scrollToBottom()

    // 检查是否结束对话
    const t = text.toLowerCase()
    if (/再见|拜拜|bye|回头|没事了|结束/.test(t)) {
      switchState('responding', null)
      setTimeout(() => {
        const byeEntry: ConvEntry = { role: 'assistant', text: '好的，路上小心～需要帮忙随时叫我！🐺', ts: Date.now() }
        setConvHistory(prev => [...prev, byeEntry])
        clearContext()
        switchState('idle', 'guide')
      }, 500)
      return
    }

    // 显示思考态
    switchState('thinking', null)

    // 模拟意图解析延迟（800ms）
    setTimeout(() => {
      // 上下文感知意图匹配
      let ctx: DialogContext | undefined = undefined
      if (contextActive) ctx = dialogCtx

      const intent = matchIntent(text, ctx)

      if (intent && MOCK_RESPONSES[intent]) {
        // 提取实体并更新上下文
        const entities = extractEntities(text, intent)
        const newCtx: DialogContext = {
          ...dialogCtx,
          ...entities,
          lastIntent: intent,
        }
        setDialogCtx(newCtx)
        setContextActive(true)

        if (intent === 'ac') {
          const targetTemp = newCtx.lastTemp || 22 + Math.floor(Math.random() * 6)
          setAcTemp(targetTemp)
        }

        // 将上下文超时重置为 30 秒
        clearContext()
        contextTimer.current = setTimeout(() => {
          const timeoutEntry: ConvEntry = {
            role: 'assistant',
            text: '⏱ 对话已超时，需要帮忙可以重新唤醒我',
            ts: Date.now()
          }
          setConvHistory(prev => [...prev, timeoutEntry])
          clearContext()
        }, 30000)

        switchState('responding', intent as CardType)
        const responseEntry: ConvEntry = {
          role: 'assistant',
          text: MOCK_RESPONSES[intent].label,
          cardType: intent as CardType,
          ts: Date.now()
        }
        setConvHistory(prev => [...prev, responseEntry])
        scrollToBottom()
      } else {
        // 未知意图 — 显示困惑引导
        switchState('confused', 'confused')
        const confusedEntry: ConvEntry = {
          role: 'assistant',
          text: '😕 暂时不理解，试试说：导航去公司 / 播放音乐 / 打开空调',
          cardType: 'confused',
          ts: Date.now()
        }
        setConvHistory(prev => [...prev, confusedEntry])
        scrollToBottom()
        setTimeout(() => {
          if (wolfState === 'confused') switchState('idle', 'guide')
        }, 3000)
      }
    }, 800)
  }, [switchState, dialogCtx, contextActive, clearContext])

  // ─── 麦克风按钮点击 ───
  const handleMicClick = useCallback(() => {
    if (wolfState === 'listening') {
      const scenes: CardType[] = ['nav', 'music', 'ac', 'weather']
      const picked = scenes[Math.floor(Math.random() * scenes.length)]
      if (picked === 'ac') setAcTemp(22 + Math.floor(Math.random() * 6))
      switchState('responding', picked)
    } else {
      switchState('listening', null)
      micSimTimer.current = setTimeout(() => {
        const scenes: CardType[] = ['nav', 'music', 'ac', 'weather']
        const picked = scenes[Math.floor(Math.random() * scenes.length)]
        if (picked === 'ac') setAcTemp(22 + Math.floor(Math.random() * 6))
        switchState('responding', picked)
      }, 3000)
    }
  }, [wolfState, switchState])

  // ─── 引导标签点击 ───
  const handleGuideClick = useCallback((card: CardType) => {
    if (card && MOCK_RESPONSES[card]) {
      if (card === 'ac') setAcTemp(22 + Math.floor(Math.random() * 6))
      switchState('responding', card)
      const labels: Record<string, string> = {
        nav: '导航去公司', music: '播放周杰伦的歌',
        ac: '空调调到24度', weather: '今天天气怎么样'
      }
      const userEntry: ConvEntry = { role: 'user', text: labels[card] || '', ts: Date.now() }
      const respEntry: ConvEntry = { role: 'assistant', text: MOCK_RESPONSES[card].label, cardType: card, ts: Date.now() }
      setConvHistory(prev => [...prev, userEntry, respEntry])
      setDialogCtx({ lastIntent: card })
      setContextActive(true)
      scrollToBottom()
    }
  }, [switchState])

  // ─── 文字输入提交 ───
  const handleInputSubmit = useCallback((e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    const t = inputText.trim()
    setInputText('')
    handleUserInput(t)
  }, [inputText, handleUserInput])

  // ─── 驾驶模式切换 ───
  const toggleDriving = useCallback(() => {
    setIsDriving(prev => !prev)
  }, [])

  // ─── 退出 ───
  const handleExit = useCallback(() => {
    clearTimers()
    clearContext()
    window.location.hash = '#/home'
  }, [clearTimers, clearContext])

  // ─── 监听 10s 倾听超时 ───
  useEffect(() => {
    if (wolfState === 'listening') {
      listeningTimer.current = setTimeout(() => {
        switchState('idle', 'guide')
        const timeoutEntry: ConvEntry = { role: 'assistant', text: '⏱ 没有听到声音，可以点击麦克风或输入文字', ts: Date.now() }
        setConvHistory(prev => [...prev, timeoutEntry])
      }, 10000)
    }
    return () => {
      if (listeningTimer.current) clearTimeout(listeningTimer.current)
    }
  }, [wolfState, switchState])

  // ─── 键盘监听 ───
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleInputSubmit(e)
  }, [handleInputSubmit])

  // ─── 初始空态引导 ───
  useEffect(() => {
    switchState('idle', 'guide')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── 对话气泡 ───
  const ConvBubble = ({ entry }: { entry: ConvEntry }) => (
    <div className={`conv-row ${entry.role}`}>
      <div className={`conv-avatar ${entry.role}`}>
        {entry.role === 'assistant' ? '🐺' : '👤'}
      </div>
      <div className={`conv-bubble ${entry.role}`}>
        <div className="conv-text">{entry.text}</div>
        {entry.cardType === 'nav' && <NavCard />}
        {entry.cardType === 'music' && <MusicCard />}
        {entry.cardType === 'ac' && <AcCard temp={acTemp} />}
        {entry.cardType === 'weather' && <WeatherCard />}
        {entry.cardType === 'confused' && <ConfusedCard onTagClick={handleGuideClick} />}
      </div>
    </div>
  )

  // ─── 渲染 ───
  return (
    <div className={`car-assistant-app ${isDriving ? 'driving-mode' : ''}`}>
      <style>{carAssistantStyles}</style>

      <div className={`driving-overlay ${isDriving ? 'active' : ''}`} />

      {/* 状态栏 */}
      <div className="status-bar">
        <div className="status-left">
          <span className={`status-icon dnd ${isDriving ? 'active' : ''}`}>
            {isDriving ? '🔇 免打扰' : '🔔'}
          </span>
          {isDriving && <span className="status-icon driving">🚗 驾驶模式</span>}
          {contextActive && (
            <span className="status-icon context-badge" title="对话上下文中">
              💬 对话中
            </span>
          )}
        </div>
        <div className="status-right">
          <button className="status-btn-exit" onClick={handleExit} title="返回首页">
            ✕ 退出
          </button>
          <span className="status-time">{clock}</span>
        </div>
      </div>

      {/* 主内容 */}
      <div className="main-area">
        {/* 小狼形象 */}
        <div className={`wolf-area ${cardType && cardType !== 'guide' && wolfState === 'responding' ? 'has-card' : ''} ${convHistory.length > 0 ? 'with-history' : ''}`}>
          <WolfSvg state={wolfState} />
          <div className={`wolf-status-label ${wolfState === 'listening' || wolfState === 'idle' ? 'active' : ''}`}>
            {wolfState === 'idle' && (convHistory.length === 0 ? '试试对我说：导航去公司' : '可以继续说话或输入文字')}
            {wolfState === 'listening' && '🎤 请说话…'}
            {wolfState === 'thinking' && '🤔 正在思考…'}
            {wolfState === 'responding' && (cardType ? MOCK_RESPONSES[cardType]?.label || '✅ 已完成' : '✅ 已完成')}
            {wolfState === 'confused' && '😕 没听清，请再说一遍'}
          </div>

          {/* 声波动画 */}
          <div className={`wave-container ${wolfState === 'listening' ? 'active' : ''}`}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="wave-bar" />
            ))}
          </div>
        </div>

        {/* 对话历史 */}
        {convHistory.length > 0 && (
          <div className="conv-history">
            {convHistory.map((entry, i) => (
              <ConvBubble key={`${entry.ts}-${i}`} entry={entry} />
            ))}
            <div ref={convEndRef} />
          </div>
        )}

        {/* 空态引导卡片（无对话时显示） */}
        {convHistory.length === 0 && (
          <div className={`card-area ${cardType === 'guide' ? 'visible' : ''}`}>
            {cardType === 'guide' && <GuideCard onTagClick={handleGuideClick} />}
          </div>
        )}
      </div>

      {/* 底部输入区 */}
      <div className="bottom-area">
        <form className="input-row" onSubmit={handleInputSubmit}>
          <div className="input-wrapper">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入文字指令..."
              autoComplete="off"
            />
            <span className="input-hint">⌨️</span>
          </div>
          <button
            type="button"
            className={`icon-btn mic ${wolfState === 'listening' ? 'listening' : ''}`}
            onClick={handleMicClick}
            title="语音输入"
          >
            🎤
          </button>
          <button type="button" className="icon-btn" title="驾驶模式" onClick={toggleDriving}>
            🚗
          </button>
        </form>
      </div>

      {/* 演示控制面板 */}
      <div className="demo-controls">
        <button className="demo-btn" onClick={() => switchState('idle', 'guide')}>⏹ 待机</button>
        <button className="demo-btn" onClick={() => switchState('listening', null)}>🎤 倾听</button>
        <button className="demo-btn" onClick={() => switchState('thinking', null)}>🤔 思考</button>
        <button className="demo-btn" onClick={() => { setAcTemp(24); switchState('responding', 'nav') }}>🗺 导航</button>
        <button className="demo-btn" onClick={() => switchState('responding', 'music')}>🎵 音乐</button>
        <button className="demo-btn" onClick={() => { setAcTemp(24); switchState('responding', 'ac') }}>❄️ 空调</button>
        <button className="demo-btn" onClick={() => switchState('responding', 'weather')}>🌤 天气</button>
        <button className="demo-btn" onClick={() => switchState('confused', 'confused')}>😕 困惑</button>
        <button className={`demo-btn ${isDriving ? 'active' : ''}`} onClick={toggleDriving}>🚗 驾驶模式</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  子组件
// ═══════════════════════════════════════════

// ─── SVG 小狼助手 ───
function WolfSvg({ state }: { state: WolfState }) {
  const cls = ['wolf-svg', state].join(' ')
  return (
    <svg className={cls} viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="120" cy="160" rx="70" ry="64" fill="#6b7280" opacity=".15" />
      <circle cx="120" cy="100" r="52" fill="#b0b8c4" />
      <path d="M 80 60 L 72 28 L 92 52 Z" fill="#b0b8c4" />
      <path d="M 80 60 L 76 38 L 90 54 Z" fill="#e8a0a0" />
      <path d="M 160 60 L 168 28 L 148 52 Z" fill="#b0b8c4" />
      <path d="M 160 60 L 164 38 L 150 54 Z" fill="#e8a0a0" />
      <ellipse cx="120" cy="112" rx="36" ry="28" fill="#d1d5db" />
      <circle cx="105" cy="96" r="8" fill="#1f2937" />
      <circle cx="107" cy="94" r="3" fill="#fff" opacity=".6" />
      <circle cx="135" cy="96" r="8" fill="#1f2937" />
      <circle cx="137" cy="94" r="3" fill="#fff" opacity=".6" />
      <ellipse cx="120" cy="110" rx="5" ry="4" fill="#1f2937" />
      <path className="mouth" d="M 112 120 Q 120 128 128 120" fill="none" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
      <path d="M 95 86 Q 100 82 108 84" fill="none" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" opacity=".5" />
      <path d="M 132 84 Q 140 82 145 86" fill="none" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" opacity=".5" />
      <ellipse cx="95" cy="108" rx="10" ry="7" fill="#e8a0a0" opacity=".3" />
      <ellipse cx="145" cy="108" rx="10" ry="7" fill="#e8a0a0" opacity=".3" />
      <circle cx="120" cy="100" r="60" fill="none" stroke="var(--ca-accent)" strokeWidth="1" opacity={state === 'listening' ? '.6' : '0'} className="glow-ring" />
    </svg>
  )
}

// ─── 导航卡片 ───
function NavCard() {
  return (
    <div className="card map-card">
      <div className="map-bg">
        <div className="map-grid-line h" style={{ top: '25%' }} />
        <div className="map-grid-line h" style={{ top: '50%' }} />
        <div className="map-grid-line h" style={{ top: '75%' }} />
        <div className="map-grid-line v" style={{ left: '25%' }} />
        <div className="map-grid-line v" style={{ left: '50%' }} />
        <div className="map-grid-line v" style={{ left: '75%' }} />
        <div className="map-marker start" />
        <div className="map-marker end" />
        <div className="map-route" />
      </div>
      <div className="map-info">
        <div className="map-detail">
          <div className="map-destination">📍 朝阳公园</div>
          <div className="map-eta">
            <span>⏱ 预计 15 分钟</span>
            <span>📏 5.2 km</span>
            <span>🕐 到达 10:45</span>
          </div>
        </div>
        <button className="btn-go" onClick={() => alert('🚗 开始导航！')}>出发 🚗</button>
      </div>
    </div>
  )
}

// ─── 音乐卡片 ───
function MusicCard() {
  return (
    <div className="card music-card">
      <div className="music-cover">🎵</div>
      <div className="music-info">
        <div className="music-title">晴天</div>
        <div className="music-artist">周杰伦</div>
        <div className="music-progress">
          <span className="progress-time">1:24</span>
          <div className="progress-bar"><div className="progress-fill" /></div>
          <span className="progress-time">3:45</span>
        </div>
      </div>
      <div className="music-controls">
        <button className="music-btn">⏮</button>
        <button className="music-btn play">⏸</button>
        <button className="music-btn">⏭</button>
      </div>
    </div>
  )
}

// ─── 空调卡片 ───
function AcCard({ temp }: { temp: number }) {
  return (
    <div className="card ac-card">
      <div className="ac-temp-display">
        <div className="ac-temp-number">
          {temp}<span className="ac-temp-unit">°C</span>
        </div>
        <div className="ac-temp-label">已设为 {temp}°C</div>
      </div>
      <div className="ac-status-icons">
        <div className="ac-icon active">
          <span className="ac-icon-symbol">❄️</span>
          <span className="ac-icon-label">制冷</span>
        </div>
        <div className="ac-icon active">
          <span className="ac-icon-symbol">💨</span>
          <span className="ac-icon-label">风量 3 档</span>
        </div>
        <div className="ac-icon">
          <span className="ac-icon-symbol">🔄</span>
          <span className="ac-icon-label">内循环</span>
        </div>
      </div>
    </div>
  )
}

// ─── 天气卡片 ───
function WeatherCard() {
  return (
    <div className="card info-card">
      <div className="info-icon">☀️</div>
      <div className="info-content">
        <div className="info-title">北京 · 今天</div>
        <div className="info-temp-row">
          <div className="info-temp">22°</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div className="info-desc">晴朗 · 适合出行</div>
            <div className="info-extra">
              <span>💧 湿度 45%</span>
              <span>🌬 风速 3 级</span>
              <span>☀️ 紫外线 中等</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 引导卡片 ───
function GuideCard({ onTagClick }: { onTagClick: (card: CardType) => void }) {
  return (
    <div className="guide-card">
      <div className="guide-title">💡 试试对我说</div>
      <div className="guide-tags">
        <span className="guide-tag" onClick={() => onTagClick('nav')}>导航去公司</span>
        <span className="guide-tag" onClick={() => onTagClick('music')}>播放周杰伦的歌</span>
        <span className="guide-tag" onClick={() => onTagClick('ac')}>空调调到 24 度</span>
        <span className="guide-tag" onClick={() => onTagClick('weather')}>今天天气怎么样</span>
      </div>
    </div>
  )
}

// ─── 困惑/未识别卡片 ───
function ConfusedCard({ onTagClick }: { onTagClick: (card: CardType) => void }) {
  return (
    <div className="guide-card" style={{ borderColor: 'var(--ca-warning)' }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>😕 暂时不理解，试试：</div>
      <div className="guide-tags" style={{ marginTop: '8px' }}>
        <span className="guide-tag" onClick={() => onTagClick('nav')}>导航去公司</span>
        <span className="guide-tag" onClick={() => onTagClick('music')}>播放周杰伦的歌</span>
        <span className="guide-tag" onClick={() => onTagClick('ac')}>打开空调</span>
        <span className="guide-tag" onClick={() => onTagClick('weather')}>今天天气</span>
      </div>
      <div style={{ marginTop: '12px', fontSize: 'var(--ca-fs-meta)', color: 'var(--ca-muted)' }}>或直接输入文字指令</div>
    </div>
  )
}

// ═══════════════════════════════════════════
//  样式
// ═══════════════════════════════════════════

const carAssistantStyles = `
.car-assistant-app {
  --ca-bg: #0d0f14;
  --ca-surface: #141820;
  --ca-surface-2: #1a1f2b;
  --ca-border: #252b39;
  --ca-fg: #e8eaed;
  --ca-muted: #8b93a8;
  --ca-accent: #5b8def;
  --ca-accent-soft: rgba(91, 141, 239, 0.15);
  --ca-success: #34c759;
  --ca-warning: #ff9f0a;
  --ca-danger: #ff453a;

  --ca-fs-h1: 32px;
  --ca-fs-h2: 28px;
  --ca-fs-body: 24px;
  --ca-fs-small: 20px;
  --ca-fs-meta: 16px;

  --ca-radius: 12px;
  --ca-radius-lg: 20px;

  width: 100%;
  height: 100vh;
  background: var(--ca-bg);
  color: var(--ca-fg);
  font-size: var(--ca-fs-body);
  line-height: 1.4;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.car-assistant-app.driving-mode {
  --ca-fs-body: 28px;
  --ca-fs-small: 24px;
  --ca-fs-meta: 20px;
  --ca-fs-h1: 36px;
}

/* ─── 状态栏 ─── */
.car-assistant-app .status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 32px;
  height: 52px;
  background: rgba(13,15,20,.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--ca-border);
  flex-shrink: 0;
  z-index: 10;
}
.car-assistant-app .status-left { display: flex; align-items: center; gap: 20px; }
.car-assistant-app .status-right { display: flex; align-items: center; gap: 16px; font-size: var(--ca-fs-meta); color: var(--ca-muted); }
.car-assistant-app .status-icon { display: flex; align-items: center; gap: 6px; font-size: var(--ca-fs-meta); }
.car-assistant-app .status-icon.dnd { color: var(--ca-muted); }
.car-assistant-app .status-icon.dnd.active { color: var(--ca-warning); }
.car-assistant-app .status-icon.driving { color: var(--ca-accent); }
.car-assistant-app .status-icon.context-badge { color: var(--ca-success); font-size: var(--ca-fs-meta); }
.car-assistant-app .status-time { font-family: 'JetBrains Mono', ui-monospace, monospace; font-weight: 500; }
.car-assistant-app .status-btn-exit {
  background: rgba(255,255,255,.08);
  border: 1px solid var(--ca-border);
  color: var(--ca-muted);
  padding: 4px 14px;
  border-radius: 8px;
  font-size: var(--ca-fs-meta);
  cursor: pointer;
  transition: all .2s ease;
}
.car-assistant-app .status-btn-exit:hover { background: var(--ca-accent-soft); color: var(--ca-accent); border-color: var(--ca-accent); }

/* ─── 主内容 ─── */
.car-assistant-app .main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 60px 16px;
  position: relative;
  overflow: hidden;
}

/* ─── 小狼形象 ─── */
.car-assistant-app .wolf-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  transition: all .4s ease;
  flex-shrink: 0;
}
.car-assistant-app .wolf-area.has-card { min-height: 120px; transform: scale(.75); margin-bottom: -20px; }
.car-assistant-app .wolf-area.with-history { min-height: 120px; transform: scale(.7); margin-bottom: -24px; }

.car-assistant-app .wolf-svg {
  width: 200px;
  height: 200px;
  transition: transform .3s ease, filter .3s ease;
  filter: drop-shadow(0 0 20px rgba(91,141,239,.15));
}
.car-assistant-app .wolf-svg.listening {
  animation: caWolfBreathe 1.2s ease-in-out infinite;
  filter: drop-shadow(0 0 30px rgba(91,141,239,.35));
}
.car-assistant-app .wolf-svg.thinking { animation: caWolfTilt 1.5s ease-in-out infinite; }
.car-assistant-app .wolf-svg.responding { animation: caWolfNod .6s ease-in-out infinite; }
.car-assistant-app .wolf-svg.confused { animation: caWolfShake .4s ease-in-out 2; }

@keyframes caWolfBreathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
@keyframes caWolfTilt { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-4deg)} }
@keyframes caWolfNod { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes caWolfShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }

.car-assistant-app .glow-ring { transition: opacity .5s ease; }

.car-assistant-app .wolf-status-label {
  font-size: var(--ca-fs-small);
  color: var(--ca-muted);
  margin-top: 16px;
  text-align: center;
  transition: all .3s ease;
}
.car-assistant-app .wolf-status-label.active { color: var(--ca-accent); animation: caPulseText 1.5s ease-in-out infinite; }
@keyframes caPulseText { 0%,100%{opacity:1} 50%{opacity:.6} }

/* ─── 声波动画 ─── */
.car-assistant-app .wave-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 40px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity .3s ease;
}
.car-assistant-app .wave-container.active { opacity: 1; }
.car-assistant-app .wave-bar {
  width: 4px;
  height: 8px;
  background: var(--ca-accent);
  border-radius: 2px;
  animation: caWaveAnim .6s ease-in-out infinite alternate;
}
.car-assistant-app .wave-bar:nth-child(1) { animation-delay: 0s; height: 12px; }
.car-assistant-app .wave-bar:nth-child(2) { animation-delay: .1s; height: 24px; }
.car-assistant-app .wave-bar:nth-child(3) { animation-delay: .2s; height: 36px; }
.car-assistant-app .wave-bar:nth-child(4) { animation-delay: .3s; height: 28px; }
.car-assistant-app .wave-bar:nth-child(5) { animation-delay: .4s; height: 18px; }
.car-assistant-app .wave-bar:nth-child(6) { animation-delay: .15s; height: 32px; }
.car-assistant-app .wave-bar:nth-child(7) { animation-delay: .25s; height: 14px; }
@keyframes caWaveAnim { 0%{transform:scaleY(.4)} 100%{transform:scaleY(1)} }

/* ─── 对话历史 ─── */
.car-assistant-app .conv-history {
  width: 100%;
  max-width: 860px;
  flex: 1;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--ca-border) transparent;
  padding: 8px 4px;
  mask-image: linear-gradient(to bottom, transparent 0%, #000 6%, #000 94%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 6%, #000 94%, transparent 100%);
}
.car-assistant-app .conv-history::-webkit-scrollbar { width: 4px; }
.car-assistant-app .conv-history::-webkit-scrollbar-thumb { background: var(--ca-border); border-radius: 2px; }

.car-assistant-app .conv-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  align-items: flex-start;
  opacity: 0;
  animation: caFadeIn .35s ease forwards;
}
.car-assistant-app .conv-row.user { flex-direction: row-reverse; }
@keyframes caFadeIn { to { opacity: 1; } }

.car-assistant-app .conv-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.car-assistant-app .conv-avatar.assistant {
  background: var(--ca-accent-soft);
  border: 1px solid rgba(91,141,239,.15);
}
.car-assistant-app .conv-avatar.user {
  background: var(--ca-surface);
  border: 1px solid var(--ca-border);
}

.car-assistant-app .conv-bubble {
  max-width: 75%;
  padding: 12px 18px;
  border-radius: 16px;
  font-size: var(--ca-fs-meta);
  line-height: 1.5;
  position: relative;
}
.car-assistant-app .conv-bubble.assistant {
  background: var(--ca-surface-2);
  border: 1px solid var(--ca-border);
  border-bottom-left-radius: 4px;
}
.car-assistant-app .conv-bubble.user {
  background: var(--ca-accent);
  border: none;
  border-bottom-right-radius: 4px;
  color: #fff;
}
.car-assistant-app .conv-text { margin-bottom: 0; }
.car-assistant-app .conv-bubble .card {
  margin-top: 10px;
  padding: 16px 20px;
  border-radius: 12px;
}

/* ─── 卡片区（空态） ─── */
.car-assistant-app .card-area {
  width: 100%;
  max-width: 860px;
  margin-top: 16px;
  opacity: 0;
  transform: translateY(16px);
  transition: all .4s ease;
  pointer-events: none;
}
.car-assistant-app .card-area.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.car-assistant-app .card {
  background: var(--ca-surface-2);
  border: 1px solid var(--ca-border);
  border-radius: var(--ca-radius-lg);
  padding: 24px 28px;
  backdrop-filter: blur(8px);
}

/* ─── 导航卡片 ─── */
.car-assistant-app .map-card { position: relative; overflow: hidden; }
.car-assistant-app .map-bg {
  height: 140px;
  background: linear-gradient(135deg,#132144,#1a2a50);
  border-radius: var(--ca-radius);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.car-assistant-app .map-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 20% 50%, rgba(91,141,239,.15) 0, transparent 50%),
              radial-gradient(circle at 80% 60%, rgba(91,141,239,.1) 0, transparent 50%);
}
.car-assistant-app .map-route {
  position: relative;
  width: 80%;
  height: 2px;
  background: rgba(255,255,255,.1);
  border-radius: 1px;
}
.car-assistant-app .map-route::after {
  content: '';
  position: absolute;
  left: 10%;
  top: 50%;
  width: 80%;
  height: 3px;
  background: linear-gradient(90deg, var(--ca-accent), var(--ca-success));
  border-radius: 2px;
  transform: translateY(-50%);
}
.car-assistant-app .map-marker {
  position: absolute;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--ca-accent);
  border: 3px solid var(--ca-bg);
  box-shadow: 0 0 0 2px var(--ca-accent);
}
.car-assistant-app .map-marker.start { left: 10%; top: 40%; }
.car-assistant-app .map-marker.end { right: 12%; top: 55%; }
.car-assistant-app .map-grid-line {
  position: absolute;
  background: rgba(255,255,255,.04);
}
.car-assistant-app .map-grid-line.h { height: 1px; width: 100%; left: 0; }
.car-assistant-app .map-grid-line.v { width: 1px; height: 100%; top: 0; }

.car-assistant-app .map-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.car-assistant-app .map-detail { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.car-assistant-app .map-destination { font-size: var(--ca-fs-small); font-weight: 600; color: var(--ca-fg); }
.car-assistant-app .map-eta {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: var(--ca-fs-meta);
  color: var(--ca-muted);
  display: flex;
  gap: 16px;
}
.car-assistant-app .map-eta span { display: flex; align-items: center; gap: 4px; }
.car-assistant-app .btn-go {
  background: var(--ca-accent);
  color: #fff;
  border: none;
  border-radius: var(--ca-radius);
  padding: 12px 32px;
  font-size: var(--ca-fs-small);
  font-weight: 600;
  cursor: pointer;
  transition: all .2s ease;
  white-space: nowrap;
}
.car-assistant-app .btn-go:hover { background: #4a7de0; transform: scale(1.03); }
.car-assistant-app .btn-go:active { transform: scale(.97); }

/* ─── 音乐卡片 ─── */
.car-assistant-app .music-card { display: flex; align-items: center; gap: 20px; }
.car-assistant-app .music-cover {
  width: 80px; height: 80px;
  border-radius: var(--ca-radius);
  background: linear-gradient(135deg,#5b8def,#8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 32px;
}
.car-assistant-app .music-info { flex: 1; min-width: 0; }
.car-assistant-app .music-title { font-size: var(--ca-fs-small); font-weight: 600; margin-bottom: 2px; }
.car-assistant-app .music-artist { font-size: var(--ca-fs-meta); color: var(--ca-muted); margin-bottom: 10px; }
.car-assistant-app .music-progress { display: flex; align-items: center; gap: 8px; }
.car-assistant-app .progress-bar {
  flex: 1; height: 4px;
  background: rgba(255,255,255,.1);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}
.car-assistant-app .progress-fill {
  height: 100%; width: 35%;
  background: linear-gradient(90deg, var(--ca-accent), #8b5cf6);
  border-radius: 2px;
  transition: width .5s ease;
}
.car-assistant-app .progress-time { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: var(--ca-fs-meta); color: var(--ca-muted); }
.car-assistant-app .music-controls { display: flex; gap: 8px; flex-shrink: 0; }
.car-assistant-app .music-btn {
  width: 44px; height: 44px;
  border-radius: 50%;
  border: 1px solid var(--ca-border);
  background: transparent;
  color: var(--ca-fg);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 18px;
  transition: all .2s ease;
}
.car-assistant-app .music-btn:hover { background: var(--ca-surface); border-color: var(--ca-accent); color: var(--ca-accent); }
.car-assistant-app .music-btn.play { background: var(--ca-accent); border-color: var(--ca-accent); color: #fff; }
.car-assistant-app .music-btn.play:hover { background: #4a7de0; }

/* ─── 空调卡片 ─── */
.car-assistant-app .ac-card { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.car-assistant-app .ac-temp-display { display: flex; flex-direction: column; align-items: center; }
.car-assistant-app .ac-temp-number {
  font-size: 64px;
  font-weight: 700;
  line-height: 1;
  color: var(--ca-accent);
}
.car-assistant-app .ac-temp-unit { font-size: var(--ca-fs-h2); color: var(--ca-muted); vertical-align: super; }
.car-assistant-app .ac-temp-label { font-size: var(--ca-fs-meta); color: var(--ca-muted); margin-top: 4px; }
.car-assistant-app .ac-status-icons { display: flex; gap: 16px; }
.car-assistant-app .ac-icon { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 14px; }
.car-assistant-app .ac-icon .ac-icon-symbol { font-size: 32px; }
.car-assistant-app .ac-icon.active .ac-icon-symbol { color: var(--ca-accent); animation: caIconPulse 2s ease-in-out infinite; }
@keyframes caIconPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
.car-assistant-app .ac-icon-label { font-size: var(--ca-fs-meta); color: var(--ca-muted); }

/* ─── 天气卡片 ─── */
.car-assistant-app .info-card { display: flex; align-items: center; gap: 20px; }
.car-assistant-app .info-icon {
  width: 64px; height: 64px;
  border-radius: var(--ca-radius);
  background: var(--ca-accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}
.car-assistant-app .info-content { flex: 1; }
.car-assistant-app .info-title { font-size: var(--ca-fs-small); font-weight: 600; margin-bottom: 4px; }
.car-assistant-app .info-desc { font-size: var(--ca-fs-body); color: var(--ca-muted); line-height: 1.5; }
.car-assistant-app .info-temp-row { display: flex; align-items: center; gap: 24px; margin-top: 8px; }
.car-assistant-app .info-temp { font-size: 36px; font-weight: 700; color: var(--ca-fg); }
.car-assistant-app .info-extra { font-size: var(--ca-fs-meta); color: var(--ca-muted); display: flex; gap: 16px; margin-top: 4px; }

/* ─── 引导卡片 ─── */
.car-assistant-app .guide-card {
  text-align: center;
  background: var(--ca-surface-2);
  border: 1px solid var(--ca-border);
  border-radius: var(--ca-radius-lg);
  padding: 20px 32px;
  max-width: 700px;
}
.car-assistant-app .guide-title { font-size: var(--ca-fs-small); font-weight: 600; margin-bottom: 12px; color: var(--ca-muted); }
.car-assistant-app .guide-tags { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.car-assistant-app .guide-tag {
  background: var(--ca-accent-soft);
  color: var(--ca-accent);
  padding: 8px 16px;
  border-radius: 999px;
  font-size: var(--ca-fs-meta);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all .2s ease;
}
.car-assistant-app .guide-tag:hover { background: var(--ca-accent); color: #fff; border-color: var(--ca-accent); }

/* ─── 底部输入区 ─── */
.car-assistant-app .bottom-area {
  flex-shrink: 0;
  padding: 12px 32px 20px;
  border-top: 1px solid var(--ca-border);
  background: rgba(13,15,20,.85);
  backdrop-filter: blur(12px);
}
.car-assistant-app .input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 860px;
  margin: 0 auto;
}
.car-assistant-app .input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--ca-surface-2);
  border: 1px solid var(--ca-border);
  border-radius: 999px;
  padding: 8px 18px;
  transition: border-color .2s ease;
}
.car-assistant-app .input-wrapper:focus-within { border-color: var(--ca-accent); box-shadow: 0 0 0 3px var(--ca-accent-soft); }
.car-assistant-app .input-wrapper input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--ca-fg);
  font-size: var(--ca-fs-small);
  font-family: inherit;
}
.car-assistant-app .input-wrapper input::placeholder { color: var(--ca-muted); opacity: .6; }
.car-assistant-app .input-hint { color: var(--ca-muted); font-size: 14px; cursor: pointer; }
.car-assistant-app .icon-btn {
  width: 48px; height: 48px;
  border-radius: 50%;
  border: 1px solid var(--ca-border);
  background: var(--ca-surface-2);
  color: var(--ca-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 20px;
  transition: all .2s ease;
  flex-shrink: 0;
}
.car-assistant-app .icon-btn:hover { background: var(--ca-accent); border-color: var(--ca-accent); color: #fff; }
.car-assistant-app .icon-btn.mic { background: var(--ca-accent); border-color: var(--ca-accent); color: #fff; }
.car-assistant-app .icon-btn.mic:hover { background: #4a7de0; }
.car-assistant-app .icon-btn.mic.listening { animation: caMicPulse 1s ease-in-out infinite; }
@keyframes caMicPulse { 0%,100%{box-shadow:0 0 0 0 rgba(91,141,239,.5)} 50%{box-shadow:0 0 0 12px rgba(91,141,239,0)} }

/* ─── 驾驶模式叠加层 ─── */
.car-assistant-app .driving-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(13,15,20,.4) 0, transparent 10%, transparent 90%, rgba(13,15,20,.4) 100%);
  opacity: 0;
  transition: opacity .5s ease;
  z-index: 5;
}
.car-assistant-app .driving-overlay.active { opacity: 1; }

/* ─── 演示控制面板 ─── */
.car-assistant-app .demo-controls {
  position: absolute;
  bottom: 76px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 100;
  opacity: .35;
  transition: opacity .3s ease;
}
.car-assistant-app .demo-controls:hover { opacity: 1; }
.car-assistant-app .demo-btn {
  background: var(--ca-surface);
  border: 1px solid var(--ca-border);
  color: var(--ca-muted);
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  transition: all .15s ease;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  text-align: left;
}
.car-assistant-app .demo-btn:hover { background: var(--ca-accent); color: #fff; border-color: var(--ca-accent); }
.car-assistant-app .demo-btn.active { background: var(--ca-accent-soft); color: var(--ca-accent); border-color: var(--ca-accent); }
`
