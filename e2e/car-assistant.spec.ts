import { test, expect, type Page } from '@playwright/test'

/** 直接进入车机 AI 对话助手视图 */
async function enterAssistant(page: Page) {
  await page.goto('/#/car-assistant')
  await expect(page).toHaveURL(/#\/car-assistant$/)
  await expect(page.locator('.car-assistant-app')).toBeVisible()
}

/** 获取小狼 SVG 元素 */
const wolfSvg = (page: Page) => page.locator('.wolf-svg')
/** 获取状态标签元素 */
const statusLabel = (page: Page) => page.locator('.wolf-status-label')
/** 获取声波动画容器 */
const waveContainer = (page: Page) => page.locator('.wave-container')
/** 获取麦克风按钮 */
const micBtn = (page: Page) => page.locator('.icon-btn.mic')
/** 获取文字输入框 */
const textInput = (page: Page) => page.locator('.input-wrapper input')
/** 获取演示控制按钮（按文案筛选） */
const demoBtn = (page: Page, label: string) => page.locator('.demo-btn', { hasText: label })
/** 获取驾驶模式切换按钮 */
const drivingToggle = (page: Page) => page.locator('.demo-btn', { hasText: '驾驶模式' })
/** 获取对话历史行 */
const convRow = (page: Page) => page.locator('.conv-row')
/** 获取对话气泡 */
const convBubble = (page: Page) => page.locator('.conv-bubble')

// ═══════════════════════════════════════════
// 空态与引导
// ═══════════════════════════════════════════

test.describe('车机AI对话助手 - 空态与引导', () => {
  test('REQ-013: 首次启动显示引导卡片和待机小狼形象', async ({ page }) => {
    await enterAssistant(page)

    // 小狼处于待机态
    await expect(wolfSvg(page)).toBeVisible()
    await expect(wolfSvg(page)).not.toHaveClass(/listening|thinking|responding|confused/)

    // 引导卡片可见
    await expect(page.locator('.guide-card')).toBeVisible()
    await expect(page.locator('.guide-title')).toContainText('试试对我说')

    // 引导标签覆盖四类场景
    const tags = page.locator('.guide-tag')
    await expect(tags).toHaveCount(4)
    await expect(tags.nth(0)).toContainText('导航去公司')
    await expect(tags.nth(1)).toContainText('播放周杰伦的歌')
    await expect(tags.nth(2)).toContainText('空调调到 24 度')
    await expect(tags.nth(3)).toContainText('今天天气怎么样')

    // 状态标签显示提示文字
    await expect(statusLabel(page)).toBeVisible()
    await expect(statusLabel(page)).toContainText('试试对我说')
  })

  test('引导标签点击触发导航卡片', async ({ page }) => {
    await enterAssistant(page)
    await page.locator('.guide-tag', { hasText: '导航去公司' }).click()
    // 引导标签点击后应该出现对话气泡
    await expect(page.locator('.conv-row').first()).toBeVisible()
    // 对话气泡内应有地图卡片
    await expect(page.locator('.conv-row .map-card')).toBeVisible()
  })

  test('引导标签点击触发音乐卡片', async ({ page }) => {
    await enterAssistant(page)
    await page.locator('.guide-tag', { hasText: '播放周杰伦的歌' }).click()
    await expect(page.locator('.conv-row .music-card')).toBeVisible()
  })

  test('引导标签点击触发空调卡片', async ({ page }) => {
    await enterAssistant(page)
    await page.locator('.guide-tag', { hasText: '空调调到 24 度' }).click()
    await expect(page.locator('.conv-row .ac-card')).toBeVisible()
  })

  test('引导标签点击触发天气卡片', async ({ page }) => {
    await enterAssistant(page)
    await page.locator('.guide-tag', { hasText: '今天天气怎么样' }).click()
    await expect(page.locator('.conv-row .info-card')).toBeVisible()
  })
})

// ═══════════════════════════════════════════
// 助手形象状态
// ═══════════════════════════════════════════

test.describe('车机AI对话助手 - 助手形象状态', () => {
  test('REQ-012: 待机态 - 小狼显示默认静态', async ({ page }) => {
    await enterAssistant(page)
    await demoBtn(page, '待机').click()
    await expect(wolfSvg(page)).not.toHaveClass(/listening|thinking|responding|confused/)
    await expect(statusLabel(page)).toContainText('试试对我说')
  })

  test('REQ-012: 倾听态 - 小狼有 listening class', async ({ page }) => {
    await enterAssistant(page)
    await demoBtn(page, '倾听').click()
    await expect(wolfSvg(page)).toHaveClass(/listening/)
    await expect(statusLabel(page)).toContainText('请说话')
  })

  test('REQ-012: 思考态 - 小狼有 thinking class', async ({ page }) => {
    await enterAssistant(page)
    await demoBtn(page, '思考').click()
    await expect(wolfSvg(page)).toHaveClass(/thinking/)
    await expect(statusLabel(page)).toContainText('正在思考')
  })

  test('REQ-012: 回复态(导航) - 小狼有 responding class', async ({ page }) => {
    await enterAssistant(page)
    await demoBtn(page, '导航').click()
    await expect(wolfSvg(page)).toHaveClass(/responding/)
  })

  test('REQ-012: 困惑态 - 小狼有 confused class', async ({ page }) => {
    await enterAssistant(page)
    await demoBtn(page, '困惑').click()
    await expect(wolfSvg(page)).toHaveClass(/confused/)
  })
})

// ═══════════════════════════════════════════
// 文字输入
// ═══════════════════════════════════════════

test.describe('车机AI对话助手 - 文字输入场景', () => {
  test('REQ-003: 文字输入框始终可见', async ({ page }) => {
    await enterAssistant(page)
    await expect(textInput(page)).toBeVisible()
    await expect(textInput(page)).toHaveAttribute('placeholder', /输入文字指令/)
  })

  test('REQ-004.1: 文字输入"导航去公司"显示导航卡片', async ({ page }) => {
    await enterAssistant(page)
    await textInput(page).fill('导航去公司')
    await textInput(page).press('Enter')
    // 等待思考延迟和卡片渲染
    await expect(convRow(page)).toHaveCount(2, { timeout: 3000 })
    await expect(page.locator('.conv-row .map-card')).toBeVisible({ timeout: 3000 })
  })

  test('REQ-004.2: 文字输入"播放周杰伦的歌"显示音乐卡片', async ({ page }) => {
    await enterAssistant(page)
    await textInput(page).fill('播放周杰伦的歌')
    await textInput(page).press('Enter')
    await expect(page.locator('.conv-row .music-card')).toBeVisible({ timeout: 3000 })
  })

  test('REQ-004.3: 文字输入"空调调到24度"显示空调卡片', async ({ page }) => {
    await enterAssistant(page)
    await textInput(page).fill('空调调到24度')
    await textInput(page).press('Enter')
    await expect(page.locator('.conv-row .ac-card')).toBeVisible({ timeout: 3000 })
  })

  test('REQ-004.4: 文字输入"今天天气怎么样"显示天气卡片', async ({ page }) => {
    await enterAssistant(page)
    await textInput(page).fill('今天天气怎么样')
    await textInput(page).press('Enter')
    await expect(page.locator('.conv-row .info-card')).toBeVisible({ timeout: 3000 })
  })

  test('REQ-004.5: 未知意图显示困惑引导', async ({ page }) => {
    await enterAssistant(page)
    await textInput(page).fill('hello world')
    await textInput(page).press('Enter')
    // 检查困惑回复出现在对话气泡中
    await expect(convRow(page)).toHaveCount(2, { timeout: 3000 })
    await expect(convBubble(page).last()).toContainText('暂时不理解', { timeout: 3000 })
  })
})

// ═══════════════════════════════════════════
// REQ-009: 多轮对话上下文保持
// ═══════════════════════════════════════════

test.describe('车机AI对话助手 - 多轮对话上下文(REQ-009)', () => {
  test('REQ-009: 多轮连续提问无需重复唤醒', async ({ page }) => {
    await enterAssistant(page)
    // 第一轮：导航
    await textInput(page).fill('导航去公司')
    await textInput(page).press('Enter')
    await expect(page.locator('.conv-row .map-card')).toBeVisible({ timeout: 3000 })
    await expect(convRow(page)).toHaveCount(2)

    // 第二轮：音乐（无需唤醒，直接输入新意图）
    await textInput(page).fill('播放周杰伦的歌')
    await textInput(page).press('Enter')
    await expect(page.locator('.conv-row .music-card')).toBeVisible({ timeout: 3000 })
    // 应该有 4 行对话记录（user+assistant * 2）
    await expect(convRow(page)).toHaveCount(4, { timeout: 3000 })
  })

  test('REQ-009: 上下文修正 - 基于上一轮上下文识别', async ({ page }) => {
    await enterAssistant(page)
    // 先发一个导航意图
    await textInput(page).fill('导航去公司')
    await textInput(page).press('Enter')
    await expect(page.locator('.conv-row .map-card')).toBeVisible({ timeout: 3000 })

    // 然后说"换一个地方" - 应基于上次导航上下文响应（而不是unknown）
    await textInput(page).fill('换一个地方')
    await textInput(page).press('Enter')
    // 应该是导航卡片而不是困惑卡片
    await expect(page.locator('.conv-row .map-card')).toHaveCount(2, { timeout: 3000 })
  })

  test('REQ-009: 说"再见"清除上下文', async ({ page }) => {
    await enterAssistant(page)
    // 先发一个导航命令
    await textInput(page).fill('导航去公司')
    await textInput(page).press('Enter')
    await expect(page.locator('.conv-row .map-card')).toBeVisible({ timeout: 3000 })

    // 说再见
    await textInput(page).fill('再见')
    await textInput(page).press('Enter')
    // 应显示告别回复
    await expect(convBubble(page).last()).toContainText('路上小心', { timeout: 3000 })

    // 再次输入新命令，不应该有上下文
    await textInput(page).fill('今天天气怎么样')
    await textInput(page).press('Enter')
    await expect(page.locator('.conv-row .info-card')).toBeVisible({ timeout: 3000 })
  })
})

// ═══════════════════════════════════════════
// 场景卡片内容
// ═══════════════════════════════════════════

test.describe('车机AI对话助手 - 场景卡片内容验证', () => {
  test('REQ-005: 导航卡片含路线概览/ETA/距离/出发按钮', async ({ page }) => {
    await enterAssistant(page)
    await demoBtn(page, '导航').click()
    const navCard = page.locator('.conv-row .map-card').first()
    await expect(navCard).toBeVisible()

    // 目的地
    await expect(navCard.locator('.map-destination')).toContainText('朝阳公园')
    // ETA 信息
    await expect(navCard.locator('.map-eta')).toContainText('15 分钟')
    await expect(navCard.locator('.map-eta')).toContainText('5.2 km')
    await expect(navCard.locator('.map-eta')).toContainText('10:45')
    // 出发按钮
    await expect(navCard.locator('.btn-go')).toContainText('出发')
  })

  test('REQ-006: 音乐卡片含封面/歌名/进度条/控制按钮', async ({ page }) => {
    await enterAssistant(page)
    await demoBtn(page, '音乐').click()
    const musicCard = page.locator('.conv-row .music-card').first()
    await expect(musicCard).toBeVisible()

    // 歌名和歌手
    await expect(musicCard.locator('.music-title')).toContainText('晴天')
    await expect(musicCard.locator('.music-artist')).toContainText('周杰伦')
    // 进度条
    await expect(musicCard.locator('.progress-bar')).toBeVisible()
    await expect(musicCard.locator('.progress-time').first()).toContainText('1:24')
    await expect(musicCard.locator('.progress-time').last()).toContainText('3:45')
    // 播放控制按钮
    const controlBtns = musicCard.locator('.music-btn')
    await expect(controlBtns).toHaveCount(3)
    await expect(controlBtns.nth(1)).toHaveClass(/play/)
  })

  test('REQ-007: 空调卡片含温度数值/风量图标/模式图标', async ({ page }) => {
    await enterAssistant(page)
    await demoBtn(page, '空调').click()
    const acCard = page.locator('.conv-row .ac-card').first()
    await expect(acCard).toBeVisible()

    // 温度显示
    await expect(acCard.locator('.ac-temp-number')).toBeVisible()
    await expect(acCard.locator('.ac-temp-unit')).toContainText('°C')
    await expect(acCard.locator('.ac-temp-label')).toContainText('已设为')
    // 状态图标
    const acIcons = acCard.locator('.ac-icon')
    await expect(acIcons).toHaveCount(3)
    await expect(acIcons.nth(0)).toContainText('制冷')
    await expect(acIcons.nth(1)).toContainText('风量')
    await expect(acIcons.nth(2)).toContainText('内循环')
  })

  test('REQ-008: 天气卡片含城市/温度/天气图标/描述', async ({ page }) => {
    await enterAssistant(page)
    await demoBtn(page, '天气').click()
    const weatherCard = page.locator('.conv-row .info-card').first()
    await expect(weatherCard).toBeVisible()

    // 城市标题
    await expect(weatherCard.locator('.info-title')).toContainText('北京')
    // 温度
    await expect(weatherCard.locator('.info-temp')).toContainText('22°')
    // 描述
    await expect(weatherCard.locator('.info-desc')).toContainText('晴朗')
    // 额外信息
    await expect(weatherCard.locator('.info-extra')).toContainText('湿度')
    await expect(weatherCard.locator('.info-extra')).toContainText('风速')
  })
})

// ═══════════════════════════════════════════
// 麦克风与倾听
// ═══════════════════════════════════════════

test.describe('车机AI对话助手 - 麦克风与倾听', () => {
  test('REQ-001.1: 点击麦克风按钮进入倾听态', async ({ page }) => {
    await enterAssistant(page)
    await micBtn(page).click()
    await expect(wolfSvg(page)).toHaveClass(/listening/)
    await expect(statusLabel(page)).toContainText('请说话')
  })

  test('REQ-001.3: 倾听态显示声波动画', async ({ page }) => {
    await enterAssistant(page)
    await micBtn(page).click()
    await expect(waveContainer(page)).toHaveClass(/active/)
  })

  test('REQ-001.2: 倾听态10秒超时回到待机态', async ({ page }) => {
    await enterAssistant(page)
    // 通过演示面板进入倾听态（避免 mic 3s 自动识别干扰）
    await demoBtn(page, '倾听').click()
    await expect(wolfSvg(page)).toHaveClass(/listening/)

    // 等待 10 秒倾听超时
    await page.waitForTimeout(10500)

    // 应回到待机态
    await expect(wolfSvg(page)).not.toHaveClass(/listening|thinking|responding|confused/)
    await expect(page.locator('.guide-card')).toBeVisible()
  })
})

// ═══════════════════════════════════════════
// 驾驶模式
// ═══════════════════════════════════════════

test.describe('车机AI对话助手 - 驾驶模式', () => {
  test('REQ-010: 驾驶模式切换', async ({ page }) => {
    await enterAssistant(page)
    const app = page.locator('.car-assistant-app')

    // 初始无 driving-mode
    await expect(app).not.toHaveClass(/driving-mode/)

    // 点击驾驶模式切换
    await drivingToggle(page).click()
    await expect(app).toHaveClass(/driving-mode/)

    // 状态栏显示驾驶模式指示
    await expect(page.locator('.status-icon.driving')).toBeVisible()
    await expect(page.locator('.status-icon.dnd')).toContainText('免打扰')

    // 再次点击取消
    await drivingToggle(page).click()
    await expect(app).not.toHaveClass(/driving-mode/)
  })
})

// ═══════════════════════════════════════════
// 演示控制面板
// ═══════════════════════════════════════════

test.describe('车机AI对话助手 - 演示控制面板', () => {
  test('演示面板包含所有状态按钮', async ({ page }) => {
    await enterAssistant(page)
    const controlPanel = page.locator('.demo-controls')
    await expect(controlPanel).toBeVisible()

    const btnTexts = ['待机', '倾听', '思考', '导航', '音乐', '空调', '天气', '困惑', '驾驶模式']
    for (const text of btnTexts) {
      await expect(demoBtn(page, text)).toBeVisible()
    }
  })

  test('演示面板按钮可切换小狼状态', async ({ page }) => {
    await enterAssistant(page)

    // 待机 -> 倾听
    await demoBtn(page, '倾听').click()
    await expect(wolfSvg(page)).toHaveClass(/listening/)

    // 倾听 -> 思考
    await demoBtn(page, '思考').click()
    await expect(wolfSvg(page)).toHaveClass(/thinking/)

    // 思考 -> 导航
    await demoBtn(page, '导航').click()
    await expect(wolfSvg(page)).toHaveClass(/responding/)
    await expect(page.locator('.conv-row .map-card')).toBeVisible()
  })
})

// ═══════════════════════════════════════════
// 状态栏与退出
// ═══════════════════════════════════════════

test.describe('车机AI对话助手 - 状态栏与导航', () => {
  test('状态栏显示时间、上下文指示器和退出按钮', async ({ page }) => {
    await enterAssistant(page)
    await expect(page.locator('.status-bar')).toBeVisible()
    await expect(page.locator('.status-time')).toBeVisible()
    await expect(page.locator('.status-btn-exit')).toContainText('退出')
  })

  test('退出按钮返回首页', async ({ page }) => {
    await enterAssistant(page)
    await page.locator('.status-btn-exit').click()
    await expect(page).toHaveURL(/#\/home$/)
  })

  test('底部输入区包含麦克风和驾驶模式按钮', async ({ page }) => {
    await enterAssistant(page)
    await expect(page.locator('.bottom-area')).toBeVisible()
    await expect(micBtn(page)).toBeVisible()
    await expect(page.locator('.input-row .icon-btn').last()).toContainText('🚗')
  })
})
