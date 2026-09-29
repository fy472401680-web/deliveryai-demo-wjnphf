import { test, expect, type Page } from '@playwright/test'

/** 从首页绑定 A08 桌台并进入点餐视图（menu）。 */
async function enterMenu(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /A08/ }).first().click()
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
  await expect(page).toHaveURL(/#\/menu$/)
}

test.describe('黑夜模式 - Dark Mode E2E 验收测试', () => {
  test('REQ-001: TopBar 黑夜模式开关可正常切换，页面配色即时生效', async ({ page }) => {
    await enterMenu(page)

    // 验证默认初始状态为明亮模式（html 无 dark class）
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    // 找到黑夜模式切换按钮（Moon/Sun 图标按钮）
    const darkToggle = page.getByRole('button', { name: '切换为黑夜模式' })
    await expect(darkToggle).toBeVisible()

    // 点击切换到黑夜模式
    await darkToggle.click()

    // 验证 html 元素已添加 dark class
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 验证按钮图标已变为 Sun（表示当前为黑夜模式）
    const lightToggle = page.getByRole('button', { name: '切换为明亮模式' })
    await expect(lightToggle).toBeVisible()

    // 切换回明亮模式
    await lightToggle.click()

    // 验证 html 元素已移除 dark class
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('REQ-003: 黑夜模式偏好持久化 —— localStorage 记录并在刷新后恢复', async ({ page }) => {
    // 清除 localStorage 中的 dark-mode 记录，确保从明亮模式开始
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('dark-mode'))

    // 进入点餐页
    await page.getByRole('button', { name: /A08/ }).first().click()
    await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
    await expect(page).toHaveURL(/#\/menu$/)

    // 验证默认未启用黑夜模式
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    // 切换到黑夜模式
    const darkToggle = page.getByRole('button', { name: '切换为黑夜模式' })
    await darkToggle.click()

    // 验证 localStorage 已记录
    const stored = await page.evaluate(() => localStorage.getItem('dark-mode'))
    expect(stored).toBe('true')

    // 刷新页面
    await page.reload()
    await expect(page).toHaveURL(/#\/menu$/)

    // 验证黑暗模式在刷新后仍保持（内联脚本在 React 渲染前已设置 class，防闪烁）
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 再次切换回明亮模式
    const lightToggle = page.getByRole('button', { name: '切换为明亮模式' })
    await expect(lightToggle).toBeVisible()
    await lightToggle.click()

    // 验证 localStorage 已更新
    const storedAfter = await page.evaluate(() => localStorage.getItem('dark-mode'))
    expect(storedAfter).toBe('false')

    // 验证 html class 已移除
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('REQ-001-Home: HomeView（首页）黑夜模式浮窗切换按钮可正常使用', async ({ page }) => {
    // 访问首页（未绑定桌台，即 HomeView）
    await page.goto('/')

    // HomeView 使用浮窗按钮（DarkModeFAB），位于右下角
    const fabDarkToggle = page.getByRole('button', { name: '切换为黑夜模式' })
    await expect(fabDarkToggle).toBeVisible()

    // 点击切换到黑夜模式
    await fabDarkToggle.click()

    // 验证 html 已启用 dark class
    await expect(page.locator('html')).toHaveClass(/dark/)

    // 验证按钮文字变为"切换为明亮模式"
    const fabLightToggle = page.getByRole('button', { name: '切换为明亮模式' })
    await expect(fabLightToggle).toBeVisible()

    // 切换回明亮模式
    await fabLightToggle.click()

    // 验证恢复
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})
