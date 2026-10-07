import { useCallback, useEffect, useRef, useState } from 'react'

// ═══════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════
type WolfState = 'idle' | 'listening' | 'thinking' | 'responding' | 'confused'
type CardType = 'nav' | 'music' | 'ac' | 'weather' | 'guide' | 'confused' | null

interface Message {
  role: 'user' | 'assistant'
  text: string
  card?: CardType
  id: number
}

const MOCK_RESPONSES: Record<string, { type: CardType; label: string; text: string }> = {
  nav: { type: 'nav', label: '🗺 已规划路线', text: '好的，已为您规划前往朝阳公园的最优路线！' },
  music: { type: 'music', label: '🎵 正在播放', text: '为您播放周杰伦的《晴天》' },
  ac: { type: 'ac', label: '❄️ 已调节空调', text: '好的，已为您将空调调节至舒适的 24°C' },
  weather: { type: 'weather', label: '☀️ 今日天气', text: '北京今天天气晴朗，温度 22°C，适合出行' },
}

function matchIntent(text: string): CardType {
  const t = text.toLowerCase()
  if (/导航|公司|朝阳|路线|去.*路|目的地|回家|去机场|去车站/.test(t)) return 'nav'
  if (/音乐|播放|周杰伦|晴天|歌|歌曲|听|放|周杰伦的歌/.test(t)) return 'music'
  if (/空调|温度|冷|热|调|制冷|制热|通风|风量/.test(t)) return 'ac'
  if (/天气|下雨|温度|湿度|今天|明天|新闻|资讯|百科|什么/.test(t)) return 'weather'
  return null
}

export default function CarAssistantView() {
  // ─── 状态 ───
  const [wolfState, setWolfState] = useState<WolfState>('idle')
  const [cardType, setCardType] = useState<CardType>('guide')
  const [isDriving, setIsDriving] = useState(false)
  const [clock, setClock] = useState('')
  const [acTemp, setAcTemp] = useState(24)
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [showTyping, setShowTyping] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listeningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const msgIdRef = useRef(0)

  // ─── 时钟 ───
  useEffect(() => {
    const update = () => {
      const now = new Date()
      setClock(
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0')
      )
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [])

  // ─── 清理 ───
  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null }
    if (listeningTimerRef.current) { clearTimeout(listeningTimerRef.current); listeningTimerRef.current = null }
  }, [])

  // ─── 自动滚动 ───
  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.scrollTop = dialogRef.current.scrollHeight
    }
  }, [messages, showTyping])

  // ─── 状态切换 ───
  const switchState = useCallback((state: WolfState, card?: CardType) => {
    clearTimers()
    setWolfState(state)

    if (state === 'idle') {
      setCardType('guide')
      setShowTyping(false)
    } else if (state === 'listening') {
      setCardType(null)
      setShowTyping(false)
    } else if (state === 'thinking') {
      setCardType(null)
      setShowTyping(true)
    } else if (state === 'confused') {
      setCardType('confused')
      setShowTyping(false)

      addMessage('assistant', '😕 暂时不理解呢，试试这些指令：', 'confused')
    } else if (state === 'responding') {
      setShowTyping(false)
      if (card) {
        setCardType(card)
        // 适配 E2E：根据卡片类型自动创建对应消息 + 卡片
        const resp = MOCK_RESPONSES[card]
        if (resp && card !== 'guide' && card !== 'confused') {
          addMessage('assistant', resp.text, card)
          if (card === 'ac') {
            setAcTemp(22 + Math.floor(Math.random() * 6))
          }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearTimers])

  const addMessage = useCallback((role: 'user' | 'assistant', text: string, card?: CardType) => {
    msgIdRef.current += 1
    setMessages(prev => [...prev, { role, text, card: card || null, id: msgIdRef.current }])
  }, [])

  // ─── 处理用户输入 ───
  const handleUserInput = useCallback((text: string) => {
    if (!text.trim()) return

    addMessage('user', text)
    switchState('thinking', null)

    setTimeout(() => {
      const intent = matchIntent(text)
      if (intent && MOCK_RESPONSES[intent]) {
        if (intent === 'ac') {
          setAcTemp(22 + Math.floor(Math.random() * 6))
        }
        switchState('responding', intent as CardType)
      } else {
        switchState('confused', 'confused')
      }
    }, 800)
  }, [addMessage, switchState])

  // ─── 麦克风 ───
  const handleMicClick = useCallback(() => {
    if (wolfState === 'listening') {
      const scenes: CardType[] = ['nav', 'music', 'ac', 'weather']
      const picked = scenes[Math.floor(Math.random() * scenes.length)]
      addMessage('user', picked === 'nav' ? '导航去公司' :
        picked === 'music' ? '播放周杰伦的歌' :
        picked === 'ac' ? '空调调到24度' : '今天天气怎么样')
      if (picked === 'ac') setAcTemp(22 + Math.floor(Math.random() * 6))
      switchState('responding', picked)
    } else {
      switchState('listening', null)
      setTimeout(() => {
        // mic auto-recognize after 3s
          const scenes: CardType[] = ['nav', 'music', 'ac', 'weather']
          const picked = scenes[Math.floor(Math.random() * scenes.length)]
          addMessage('user', picked === 'nav' ? '导航去公司' :
            picked === 'music' ? '播放周杰伦的歌' :
            picked === 'ac' ? '空调调到24度' : '今天天气怎么样')
          if (picked === 'ac') setAcTemp(22 + Math.floor(Math.random() * 6))
          switchState('responding', picked)
        
      }, 3000)
    }
  }, [wolfState, addMessage, switchState])

  // ─── 引导标签 ───
  const handleGuideClick = useCallback((card: CardType) => {
    if (card && MOCK_RESPONSES[card]) {
      const textMap: Record<string, string> = {
        nav: '导航去公司',
        music: '播放周杰伦的歌',
        ac: '空调调到24度',
        weather: '今天天气怎么样'
      }
      addMessage('user', textMap[card] || '')
      if (card === 'ac') setAcTemp(22 + Math.floor(Math.random() * 6))
      switchState('responding', card)
    }
  }, [addMessage, switchState])

  // ─── 文字输入 ───
  const handleInputSubmit = useCallback((e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return
    handleUserInput(inputText.trim())
    setInputText('')
  }, [inputText, handleUserInput])

  // ─── 驾驶模式 ───
  const toggleDriving = useCallback(() => {
    setIsDriving(prev => !prev)
  }, [])

  // ─── 退出 ───
  const handleExit = useCallback(() => {
    clearTimers()
    window.location.hash = '#/home'
  }, [clearTimers])

  // ─── 倾听超时自动回到待机 ───
  useEffect(() => {
    if (wolfState === 'listening') {
      listeningTimerRef.current = setTimeout(() => {
        switchState('idle', 'guide')
      }, 10000)
    }
    return () => {
      if (listeningTimerRef.current) clearTimeout(listeningTimerRef.current)
    }
  }, [wolfState, switchState])

  // ─── 键事件 ───
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit(e)
    }
  }, [handleInputSubmit])

  // ─── 初始化 ───
  useEffect(() => {
    switchState('idle', 'guide')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // ─── 状态标签文案 ───
  const statusText = (() => {
    switch (wolfState) {
      case 'idle': return '试试对我说：导航去公司'
      case 'listening': return '🎤 请说话…'
      case 'thinking': return '🤔 正在思考…'
      case 'responding':
        if (cardType && MOCK_RESPONSES[cardType]) return MOCK_RESPONSES[cardType].label
        return '✅ 已完成'
      case 'confused': return '😕 没听清，请再说一遍'
    }
  })()

  // ─── 渲染 ───
  return (
    <div className={`car-assistant-app ${isDriving ? 'driving-mode' : ''}`}>
      <style>{carAssistantStyles}</style>

      {/* 驾驶模式叠加层 */}
      <div className={`driving-overlay ${isDriving ? 'active' : ''}`} />

      {/* 状态栏 */}
      <div className="status-bar">
        <div className="status-left">
          <span className={`status-icon dnd ${isDriving ? 'active' : ''}`}>
            {isDriving ? '🔇 免打扰' : '🔔'}
          </span>
          {isDriving && <span className="status-icon driving">🚗 驾驶模式</span>}
        </div>
        <div className="status-right">
          <button
            className="status-btn-exit"
            onClick={handleExit}
            title="返回首页"
          >
            ✕ 退出
          </button>
          <span className="status-time">{clock}</span>
        </div>
      </div>

      {/* 主内容区 — 左右布局 */}
      <div className="main-area">
        {/* 左侧：对话区 */}
        <div className="dialog-section">
          <div className="dialog-list" ref={dialogRef}>
            {/* 空态引导 */}
            {messages.length === 0 && (
              <div className="dialog-guide">
                <GuideCard onTagClick={handleGuideClick} />
              </div>
            )}

            {/* 消息气泡 */}
            {messages.map(msg => (
              <div key={msg.id} className={`msg msg-${msg.role}`}>
                <div className={`msg-av ${msg.role === 'assistant' ? 'as' : 'usr'}`}>
                  {msg.role === 'assistant' ? '🐺' : '👤'}
                </div>
                <div className="msg-b">
                  <span>{msg.text}</span>
                  {msg.card && msg.card !== 'guide' && msg.card !== 'confused' && (
                    <div className="msg-card-wrap">
                      {msg.card === 'nav' && <NavCard />}
                      {msg.card === 'music' && <MusicCard />}
                      {msg.card === 'ac' && <AcCard temp={acTemp} />}
                      {msg.card === 'weather' && <WeatherCard />}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 打字指示器 */}
            {showTyping && (
              <div className="msg msg-assistant">
                <div className="msg-av as">🐺</div>
                <div className="msg-b typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
          </div>

          {/* 独立卡片展示区（供 E2E 测试定位） */}
          <div className={`card-area ${cardType ? 'visible' : ''}`}>
            {cardType === 'nav' && <NavCard />}
            {cardType === 'music' && <MusicCard />}
            {cardType === 'ac' && <AcCard temp={acTemp} />}
            {cardType === 'weather' && <WeatherCard />}
            {cardType === 'guide' && messages.length === 0 && (
              <GuideCard onTagClick={handleGuideClick} />
            )}
            {cardType === 'confused' && <ConfusedCard onTagClick={handleGuideClick} />}
          </div>
        </div>

        {/* 右侧：小狼形象区 */}
        <div className={`wolf-section ${cardType && cardType !== 'guide' && wolfState === 'responding' ? 'has-card' : ''}`}>
          <div className="wolf-area">
            <WolfSvg state={wolfState} />
            <div className={`wolf-status-label ${wolfState === 'listening' || wolfState === 'idle' ? 'active' : ''}`}>
              {statusText}
            </div>
            <div className={`wave-container ${wolfState === 'listening' ? 'active' : ''}`}>
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="wave-bar" />
              ))}
            </div>
          </div>
        </div>
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
          <button
            type="button"
            className={`icon-btn ${isDriving ? 'active-drive' : ''}`}
            onClick={toggleDriving}
            title="驾驶模式"
          >
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
// 子组件
// ═══════════════════════════════════════════

function WolfSvg({ state }: { state: WolfState }) {
  const cls = ['wolf-svg', state].join(' ')
  return (
    <svg className={cls} viewBox="0 0 240 260" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="wb" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#e8edf2" />
          <stop offset="55%" stopColor="#cdd5df" />
          <stop offset="100%" stopColor="#b4becb" />
        </radialGradient>
        <radialGradient id="wy" cx="50%" cy="60%" r="40%">
          <stop offset="0%" stopColor="#f5f7f9" />
          <stop offset="100%" stopColor="#dce2e9" />
        </radialGradient>
        <linearGradient id="el" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#cdd5df" />
          <stop offset="100%" stopColor="#a8b3c2" />
        </linearGradient>
        <linearGradient id="er" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#cdd5df" />
          <stop offset="100%" stopColor="#a8b3c2" />
        </linearGradient>
        <linearGradient id="ei" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#f5b8c4" />
          <stop offset="100%" stopColor="#e8909e" />
        </linearGradient>
        <radialGradient id="ir" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="40%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </radialGradient>
        <radialGradient id="es" cx="30%" cy="30%">
          <stop offset="0%" stopColor="#fff" stopOpacity=".95" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ng" cx="45%" cy="40%">
          <stop offset="0%" stopColor="#4b5563" />
          <stop offset="100%" stopColor="#1f2937" />
        </radialGradient>
        <linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d5dde6" />
          <stop offset="100%" stopColor="#b0bbc9" />
        </linearGradient>
        <filter id="sh">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity=".15" />
        </filter>
      </defs>
      {/* 尾巴 */}
      <g className="wolf-tail" transform-origin="190 200">
        <path d="M 175 185 Q 205 170 218 178 Q 230 186 220 198 Q 208 210 185 200" fill="url(#tg)" stroke="#9aa6b5" strokeWidth=".8" opacity=".8" />
        <path d="M 218 178 Q 225 182 222 190 Q 218 196 212 194" fill="#f0f3f7" opacity=".6" />
      </g>
      {/* 身体 */}
      <ellipse cx="120" cy="190" rx="62" ry="56" fill="url(#wb)" filter="url(#sh)" opacity=".6" />
      {/* 头部 */}
      <g filter="url(#sh)">
        <ellipse cx="120" cy="112" rx="56" ry="54" fill="url(#wb)" />
        <path d="M 70 112 Q 56 108 60 98 Q 64 86 78 92" fill="url(#wb)" />
        <path d="M 170 112 Q 184 108 180 98 Q 176 86 162 92" fill="url(#wb)" />
        <path d="M 85 145 Q 120 160 155 145 Q 120 168 85 145Z" fill="url(#wy)" />
      </g>
      {/* 耳朵 */}
      <g className="wolf-ear left" transform-origin="85 65">
        <path d="M 80 68 Q 75 48 68 38 Q 62 32 72 36 L 88 56 Q 85 62 82 68Z" fill="url(#el)" stroke="#a0acbb" strokeWidth=".5" />
        <path d="M 79 65 Q 74 50 70 42 Q 66 38 73 42 L 85 56 Q 82 62 80 66Z" fill="url(#ei)" />
      </g>
      <g className="wolf-ear right" transform-origin="155 65">
        <path d="M 160 68 Q 165 48 172 38 Q 178 32 168 36 L 152 56 Q 155 62 158 68Z" fill="url(#er)" stroke="#a0acbb" strokeWidth=".5" />
        <path d="M 161 65 Q 166 50 170 42 Q 174 38 167 42 L 155 56 Q 158 62 160 66Z" fill="url(#ei)" />
      </g>
      {/* 毛发纹理 */}
      <path d="M 105 65 Q 120 60 135 65" fill="none" stroke="#b8c3d0" strokeWidth="1.5" opacity=".3" />
      <path d="M 108 68 Q 120 64 132 68" fill="none" stroke="#b8c3d0" strokeWidth="1" opacity=".2" />
      {/* 脸颊毛 */}
      <ellipse cx="75" cy="118" rx="14" ry="10" fill="#dce2e9" opacity=".7" />
      <ellipse cx="72" cy="108" rx="11" ry="8" fill="#dce2e9" opacity=".5" />
      <path d="M 70 130 Q 60 128 62 118 Q 64 108 74 114" fill="#dce2e9" opacity=".6" />
      <ellipse cx="165" cy="118" rx="14" ry="10" fill="#dce2e9" opacity=".7" />
      <ellipse cx="168" cy="108" rx="11" ry="8" fill="#dce2e9" opacity=".5" />
      <path d="M 170 130 Q 180 128 178 118 Q 176 108 166 114" fill="#dce2e9" opacity=".6" />
      {/* 面部中心 */}
      <ellipse cx="120" cy="122" rx="34" ry="26" fill="#f0f3f7" opacity=".7" />
      {/* 左眼 */}
      <g className="wolf-eyes wolf-blink" style={{ transformOrigin: '104px 104px' }}>
        <ellipse cx="104" cy="104" rx="13" ry="14" fill="#fff" opacity=".95" />
        <path d="M 91 98 Q 104 88 117 98 Q 104 94 91 98Z" fill="#9aa6b5" opacity=".3" />
        <circle cx="105" cy="106" r="9" fill="url(#ir)" />
        <ellipse cx="105" cy="107" rx="5" ry="7" fill="#0f172a" />
        <circle cx="101" cy="101" r="4" fill="url(#es)" />
        <circle cx="101" cy="101" r="2" fill="#fff" opacity=".9" />
        <circle cx="108" cy="103" r="2" fill="#fff" opacity=".35" />
        <path d="M 90 100 Q 104 86 118 100" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 95 116 Q 104 120 113 116" fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" opacity=".4" />
      </g>
      {/* 右眼 */}
      <g className="wolf-eyes wolf-blink" style={{ transformOrigin: '136px 104px' }}>
        <ellipse cx="136" cy="104" rx="13" ry="14" fill="#fff" opacity=".95" />
        <path d="M 123 98 Q 136 88 149 98 Q 136 94 123 98Z" fill="#9aa6b5" opacity=".3" />
        <circle cx="135" cy="106" r="9" fill="url(#ir)" />
        <ellipse cx="135" cy="107" rx="5" ry="7" fill="#0f172a" />
        <circle cx="131" cy="101" r="4" fill="url(#es)" />
        <circle cx="131" cy="101" r="2" fill="#fff" opacity=".9" />
        <circle cx="138" cy="103" r="2" fill="#fff" opacity=".35" />
        <path d="M 122 100 Q 136 86 150 100" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 127 116 Q 136 120 145 116" fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" opacity=".4" />
      </g>
      {/* 眉毛 */}
      <path className="wolf-brow left" d="M 92 88 Q 100 82 110 84" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" opacity=".6" />
      <path className="wolf-brow right" d="M 130 84 Q 140 82 148 88" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" opacity=".6" />
      {/* 鼻子 */}
      <ellipse cx="120" cy="119" rx="7" ry="5.5" fill="url(#ng)" />
      <ellipse cx="118" cy="117" rx="2.5" ry="1.8" fill="#fff" opacity=".15" />
      <ellipse cx="117" cy="121" rx="1.5" ry="1" fill="#0f172a" opacity=".4" />
      <ellipse cx="123" cy="121" rx="1.5" ry="1" fill="#0f172a" opacity=".4" />
      {/* 嘴巴闭合 */}
      <path className="wolf-mouth-closed" d="M 110 126 Q 120 133 130 126" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" opacity=".6" />
      {/* 嘴巴张开 */}
      <path className="wolf-mouth-open" d="M 108 126 Q 120 144 132 126" fill="#1e293b" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" opacity="0" />
      {/* 舌头 */}
      <ellipse className="wolf-tongue" cx="120" cy="135" rx="5" ry="4" fill="#f08a9e" opacity="0" />
      {/* 腮红 */}
      <ellipse cx="90" cy="117" rx="12" ry="7" fill="#f5a8b8" opacity=".25" />
      <ellipse cx="150" cy="117" rx="12" ry="7" fill="#f5a8b8" opacity=".25" />
    </svg>
  )
}

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

function MusicCard() {
  return (
    <div className="card music-card">
      <div className="music-cover">🎵</div>
      <div className="music-info">
        <div className="music-title">晴天</div>
        <div className="music-artist">周杰伦</div>
        <div className="music-progress">
          <span className="progress-time">1:24</span>
          <div className="progress-bar">
            <div className="progress-fill" />
          </div>
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

function WeatherCard() {
  return (
    <div className="card info-card">
      <div className="info-icon">☀️</div>
      <div className="info-content">
        <div className="info-title">北京 · 今天</div>
        <div className="info-temp-row">
          <div className="info-temp">22°</div>
          <div>
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

function ConfusedCard({ onTagClick }: { onTagClick: (card: CardType) => void }) {
  return (
    <div className="guide-card" style={{ borderColor: 'var(--ca-warning, #ff9f0a)' }}>
      <div className="guide-title">😕 暂时不理解，试试：</div>
      <div className="guide-tags">
        <span className="guide-tag" onClick={() => onTagClick('nav')}>导航去公司</span>
        <span className="guide-tag" onClick={() => onTagClick('music')}>播放周杰伦的歌</span>
        <span className="guide-tag" onClick={() => onTagClick('ac')}>打开空调</span>
        <span className="guide-tag" onClick={() => onTagClick('weather')}>今天天气</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// 样式
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
  --ca-fs-body: 22px;
  --ca-fs-small: 18px;
  --ca-fs-meta: 15px;

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
  --ca-fs-body: 26px;
  --ca-fs-small: 22px;
  --ca-fs-meta: 18px;
  --ca-fs-h1: 36px;
}

/* ─── 状态栏 ─── */
.car-assistant-app .status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 32px;
  height: 44px;
  background: rgba(13,15,20,.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--ca-border);
  flex-shrink: 0;
  z-index: 10;
}
.car-assistant-app .status-left { display: flex; align-items: center; gap: 16px; }
.car-assistant-app .status-right { display: flex; align-items: center; gap: 14px; font-size: var(--ca-fs-meta); color: var(--ca-muted); }
.car-assistant-app .status-icon { display: flex; align-items: center; gap: 4px; font-size: var(--ca-fs-meta); }
.car-assistant-app .status-icon.dnd { color: var(--ca-muted); }
.car-assistant-app .status-icon.dnd.active { color: var(--ca-warning); }
.car-assistant-app .status-icon.driving { color: var(--ca-accent); }
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

/* ─── 主内容区（左右布局） ─── */
.car-assistant-app .main-area {
  flex: 1;
  display: flex;
  flex-direction: row;
  padding: 0;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

/* ─── 左侧对话区 ─── */
.car-assistant-app .dialog-section {
  flex: 0 0 62%;
  display: flex;
  flex-direction: column;
  padding: 20px 24px 16px 32px;
  overflow: hidden;
  border-right: 1px solid rgba(255,255,255,.03);
}

.car-assistant-app .dialog-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--ca-border) transparent;
}
.car-assistant-app .dialog-list::-webkit-scrollbar { width: 4px; }
.car-assistant-app .dialog-list::-webkit-scrollbar-thumb { background: var(--ca-border); border-radius: 2px; }

.car-assistant-app .dialog-guide {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 20px 0;
}

/* 消息气泡 */
.car-assistant-app .msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  animation: msgIn .35s ease forwards;
  opacity: 0;
  transform: translateY(10px);
}
@keyframes msgIn { to { opacity: 1; transform: translateY(0); } }

.car-assistant-app .msg-user { flex-direction: row-reverse; }

.car-assistant-app .msg-av {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  border: 1px solid rgba(255,255,255,.05);
  box-shadow: 0 2px 8px rgba(0,0,0,.2);
}
.car-assistant-app .msg-av.as { background: linear-gradient(135deg, rgba(91,141,239,.08), rgba(124,109,240,.06)); }
.car-assistant-app .msg-av.usr { background: #141820; }

.car-assistant-app .msg-b {
  max-width: 75%;
  padding: 10px 16px;
  border-radius: 14px;
  font-size: var(--ca-fs-meta);
  line-height: 1.55;
  position: relative;
  box-shadow: 0 2px 10px rgba(0,0,0,.12);
}
.car-assistant-app .msg-assistant .msg-b {
  background: rgba(24,29,44,.55);
  border: 1px solid var(--ca-border);
  backdrop-filter: blur(12px);
  border-bottom-left-radius: 4px;
  color: var(--ca-muted);
}
.car-assistant-app .msg-user .msg-b {
  background: linear-gradient(135deg, var(--ca-accent), rgba(91,141,239,.85));
  border: none;
  border-bottom-right-radius: 4px;
  color: #fff;
}

.car-assistant-app .msg-card-wrap { margin-top: 12px; }

/* 打字指示器 */
.car-assistant-app .typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 14px 18px !important;
}
.car-assistant-app .typing-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--ca-muted);
  animation: typingDot 1.2s ease-in-out infinite;
}
.car-assistant-app .typing-dot:nth-child(1) { animation-delay: 0s; }
.car-assistant-app .typing-dot:nth-child(2) { animation-delay: .2s; }
.car-assistant-app .typing-dot:nth-child(3) { animation-delay: .4s; }
@keyframes typingDot { 0%,60%,100% { opacity: .3; transform: scale(.8); } 30% { opacity: 1; transform: scale(1.1); } }

/* ─── 卡片展示区 ─── */
.car-assistant-app .card-area {
  margin-top: 12px;
  opacity: 0;
  transform: translateY(16px);
  transition: all .4s ease;
  pointer-events: none;
  max-height: 0;
  overflow: hidden;
}
.car-assistant-app .card-area.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
  max-height: 600px;
  overflow-y: auto;
}

.car-assistant-app .card {
  background: var(--ca-surface-2);
  border: 1px solid var(--ca-border);
  border-radius: var(--ca-radius-lg);
  padding: 20px 24px;
  backdrop-filter: blur(8px);
}

/* ─── 右侧小狼区 ─── */
.car-assistant-app .wolf-section {
  flex: 0 0 38%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
}
.car-assistant-app .wolf-section.has-card {
  transform: scale(.85);
}

.car-assistant-app .wolf-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  transition: all .4s ease;
}

/* SVG 小狼 */
.car-assistant-app .wolf-svg {
  width: 200px;
  height: 216px;
  transition: transform .3s ease, filter .3s ease;
  filter: drop-shadow(0 0 20px rgba(91,141,239,.15));
}
.car-assistant-app .wolf-svg.listening {
  animation: wolfBreathe 1.2s ease-in-out infinite;
  filter: drop-shadow(0 0 30px rgba(91,141,239,.35));
}
.car-assistant-app .wolf-svg.thinking { animation: wolfTilt 1.5s ease-in-out infinite; }
.car-assistant-app .wolf-svg.responding { animation: wolfNod .6s ease-in-out infinite; }
.car-assistant-app .wolf-svg.confused { animation: wolfShake .4s ease-in-out 2; }

@keyframes wolfBreathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
@keyframes wolfTilt { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-4deg)} }
@keyframes wolfNod { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
@keyframes wolfShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }

/* 耳朵动画 */
.car-assistant-app .wolf-ear { transform-origin: center bottom; transition: transform .25s; }
.car-assistant-app .wolf-svg.listening .wolf-ear { animation: earPerk 1.4s ease-in-out infinite; }
.car-assistant-app .wolf-svg.listening .wolf-ear.right { animation: earPerkR 1.4s ease-in-out infinite; }
@keyframes earPerk { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-4deg)} }
@keyframes earPerkR { 0%,100%{transform:rotate(0)} 50%{transform:rotate(4deg)} }

/* 眨眼 */
.car-assistant-app .wolf-blink { animation: blink 3s ease-in-out infinite; }
@keyframes blink { 0%,46%,54%,100%{transform:scaleY(1)} 48%,52%{transform:scaleY(.05)} }

/* 嘴巴动画（说话态） */
.car-assistant-app .wolf-mouth-open { opacity: 0; transition: opacity .15s; }
.car-assistant-app .wolf-svg.responding .wolf-mouth-open {
  opacity: 1;
  transform-origin: 120px 134px;
  animation: mouthTalk .18s ease-in-out infinite alternate;
}
.car-assistant-app .wolf-svg.responding .wolf-tongue {
  opacity: 1 !important;
  transform-origin: 120px 134px;
  animation: mouthTalk .18s ease-in-out infinite alternate;
}
@keyframes mouthTalk { 0%{transform:translateY(1px) scaleY(.85)} 100%{transform:translateY(0) scaleY(1)} }
.car-assistant-app .wolf-mouth-closed { opacity: 1; transition: opacity .15s; }
.car-assistant-app .wolf-svg.responding .wolf-mouth-closed { opacity: 0; }

/* 尾巴动画 */
.car-assistant-app .wolf-tail { transform-origin: 190px 200px; animation: tailWag 2s ease-in-out infinite; }
@keyframes tailWag { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
.car-assistant-app .wolf-svg.listening .wolf-tail { animation: tailWagFast .8s ease-in-out infinite; }
@keyframes tailWagFast { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }

/* 眉毛动画（困惑态） */
.car-assistant-app .wolf-brow { transition: all .3s; }
.car-assistant-app .wolf-svg.confused .wolf-brow.left { transform:rotate(-18deg) translate(-2px,-3px); }
.car-assistant-app .wolf-svg.confused .wolf-brow.right { transform:rotate(18deg) translate(2px,-3px); }

/* 状态标签 */
.car-assistant-app .wolf-status-label {
  font-size: var(--ca-fs-small);
  color: var(--ca-muted);
  margin-top: 16px;
  text-align: center;
  transition: all .3s ease;
}
.car-assistant-app .wolf-status-label.active { color: var(--ca-accent); animation: pulseText 1.5s ease-in-out infinite; }
@keyframes pulseText { 0%,100%{opacity:1} 50%{opacity:.6} }

/* 声波动画 */
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
  animation: waveAnim .6s ease-in-out infinite alternate;
}
.car-assistant-app .wave-bar:nth-child(1) { animation-delay: 0s; height: 12px; }
.car-assistant-app .wave-bar:nth-child(2) { animation-delay: .1s; height: 24px; }
.car-assistant-app .wave-bar:nth-child(3) { animation-delay: .2s; height: 36px; }
.car-assistant-app .wave-bar:nth-child(4) { animation-delay: .3s; height: 28px; }
.car-assistant-app .wave-bar:nth-child(5) { animation-delay: .4s; height: 18px; }
.car-assistant-app .wave-bar:nth-child(6) { animation-delay: .15s; height: 32px; }
.car-assistant-app .wave-bar:nth-child(7) { animation-delay: .25s; height: 14px; }
@keyframes waveAnim { 0%{transform:scaleY(.4)} 50%{transform:scaleY(1)} 100%{transform:scaleY(.5)} }

/* ─── 导航卡片 ─── */
.car-assistant-app .map-card { position: relative; overflow: hidden; }
.car-assistant-app .map-bg {
  height: 120px;
  background: linear-gradient(135deg,#132144,#1a2a50);
  border-radius: var(--ca-radius);
  margin-bottom: 14px;
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
  flex-wrap: wrap;
}
.car-assistant-app .map-eta span { display: flex; align-items: center; gap: 4px; }
.car-assistant-app .btn-go {
  background: var(--ca-accent);
  color: #fff;
  border: none;
  border-radius: var(--ca-radius);
  padding: 10px 28px;
  font-size: var(--ca-fs-small);
  font-weight: 600;
  cursor: pointer;
  transition: all .2s ease;
  white-space: nowrap;
}
.car-assistant-app .btn-go:hover { background: #4a7de0; transform: scale(1.03); }

/* ─── 音乐卡片 ─── */
.car-assistant-app .music-card { display: flex; align-items: center; gap: 16px; }
.car-assistant-app .music-cover {
  width: 72px; height: 72px;
  border-radius: var(--ca-radius);
  background: linear-gradient(135deg,#5b8def,#8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 28px;
}
.car-assistant-app .music-info { flex: 1; min-width: 0; }
.car-assistant-app .music-title { font-size: var(--ca-fs-small); font-weight: 600; margin-bottom: 2px; }
.car-assistant-app .music-artist { font-size: var(--ca-fs-meta); color: var(--ca-muted); margin-bottom: 8px; }
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
  width: 40px; height: 40px;
  border-radius: 50%;
  border: 1px solid var(--ca-border);
  background: transparent;
  color: var(--ca-fg);
  display: grid;
  place-items: center;
  cursor: pointer;
  font-size: 16px;
  transition: all .2s ease;
}
.car-assistant-app .music-btn:hover { background: var(--ca-surface); border-color: var(--ca-accent); color: var(--ca-accent); }
.car-assistant-app .music-btn.play { background: var(--ca-accent); border-color: var(--ca-accent); color: #fff; }

/* ─── 空调卡片 ─── */
.car-assistant-app .ac-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.car-assistant-app .ac-temp-display { display: flex; flex-direction: column; align-items: center; }
.car-assistant-app .ac-temp-number {
  font-size: 56px;
  font-weight: 700;
  line-height: 1;
  color: var(--ca-accent);
}
.car-assistant-app .ac-temp-unit { font-size: var(--ca-fs-h2); color: var(--ca-muted); vertical-align: super; }
.car-assistant-app .ac-temp-label { font-size: var(--ca-fs-meta); color: var(--ca-muted); margin-top: 4px; }
.car-assistant-app .ac-status-icons { display: flex; gap: 14px; }
.car-assistant-app .ac-icon { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.car-assistant-app .ac-icon-symbol { font-size: 28px; }
.car-assistant-app .ac-icon.active .ac-icon-symbol { color: var(--ca-accent); animation: iconPulse 2s ease-in-out infinite; }
@keyframes iconPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
.car-assistant-app .ac-icon-label { font-size: var(--ca-fs-meta); color: var(--ca-muted); }

/* ─── 天气卡片 ─── */
.car-assistant-app .info-card { display: flex; align-items: center; gap: 16px; }
.car-assistant-app .info-icon {
  width: 60px; height: 60px;
  border-radius: var(--ca-radius);
  background: var(--ca-accent-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}
.car-assistant-app .info-content { flex: 1; }
.car-assistant-app .info-title { font-size: var(--ca-fs-small); font-weight: 600; margin-bottom: 4px; }
.car-assistant-app .info-desc { font-size: var(--ca-fs-body); color: var(--ca-muted); line-height: 1.5; }
.car-assistant-app .info-temp-row { display: flex; align-items: center; gap: 20px; margin-top: 6px; }
.car-assistant-app .info-temp { font-size: 32px; font-weight: 700; color: var(--ca-fg); }
.car-assistant-app .info-extra { font-size: var(--ca-fs-meta); color: var(--ca-muted); display: flex; gap: 14px; margin-top: 4px; flex-wrap: wrap; }

/* ─── 引导卡片 ─── */
.car-assistant-app .guide-card {
  text-align: center;
  background: var(--ca-surface-2);
  border: 1px solid var(--ca-border);
  border-radius: var(--ca-radius-lg);
  padding: 20px 28px;
  max-width: 520px;
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
  padding: 10px 32px 16px;
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
.car-assistant-app .icon-btn.mic.listening { animation: micPulse 1s ease-in-out infinite; }
@keyframes micPulse { 0%,100%{box-shadow:0 0 0 0 rgba(91,141,239,.5)} 50%{box-shadow:0 0 0 12px rgba(91,141,239,0)} }
.car-assistant-app .icon-btn.active-drive { background: var(--ca-warning); border-color: var(--ca-warning); color: #fff; }

/* ─── 驾驶模式叠加层 ─── */
.car-assistant-app .driving-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 60%, rgba(8,10,15,.2) 100%);
  opacity: 0;
  transition: opacity .5s ease;
  z-index: 5;
}
.car-assistant-app .driving-overlay.active { opacity: 1; }

/* ─── 演示控制面板 ─── */
.car-assistant-app .demo-controls {
  position: absolute;
  bottom: 72px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  z-index: 100;
  opacity: .35;
  transition: opacity .3s ease;
}
.car-assistant-app .demo-controls:hover { opacity: 1; }
.car-assistant-app .demo-btn {
  background: var(--ca-surface);
  border: 1px solid var(--ca-border);
  color: var(--ca-muted);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  transition: all .15s ease;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  text-align: left;
  white-space: nowrap;
}
.car-assistant-app .demo-btn:hover { background: var(--ca-accent); color: #fff; border-color: var(--ca-accent); }
.car-assistant-app .demo-btn.active { background: var(--ca-accent-soft); color: var(--ca-accent); border-color: var(--ca-accent); }
`
