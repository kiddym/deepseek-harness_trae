import { test, expect } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const taskTitles = (page: any) => page.locator('article.task strong');
async function reset(page: any) {
  await page.goto('/');
  const response = await page.request.get('/api/tasks');
  const { tasks } = await response.json();
  for (const task of tasks) await page.request.delete(`/api/tasks/${task.id}`);
  await page.reload();
}
function defaultDataSnapshot() {
  const dir = 'data';
  if (!existsSync(dir)) return 'absent';
  return readdirSync(dir).sort().map((name) => `${name}:${createHash('sha256').update(readFileSync(`${dir}/${name}`)).digest('hex')}`).join('|');
}

test.beforeEach(async ({ page }) => reset(page));

test('创建任务：标题必填、描述可选，创建后出现在列表', async ({ page }) => {
  await page.getByLabel('任务标题').fill('写测试计划');
  await page.getByLabel('任务描述').fill('覆盖第一期主流程');
  await page.getByRole('button', { name: '新增任务' }).click();
  await expect(page.getByText('写测试计划')).toBeVisible();
  await expect(page.getByText('覆盖第一期主流程')).toBeVisible();
});

test('列表展示：多条任务按更新时间倒序', async ({ page }) => {
  for (const title of ['第一条任务', '第二条任务']) {
    await page.getByLabel('任务标题').fill(title);
    await page.getByRole('button', { name: '新增任务' }).click();
  }
  await expect(taskTitles(page).first()).toHaveText('第二条任务');
  await expect(taskTitles(page).last()).toHaveText('第一条任务');
});

test('编辑并保存：标题与描述都能改', async ({ page }) => {
  await page.getByLabel('任务标题').fill('旧标题');
  await page.getByRole('button', { name: '新增任务' }).click();
  await page.getByRole('button', { name: '编辑' }).click();
  await page.getByLabel('编辑标题').fill('新标题');
  await page.getByLabel('编辑描述').fill('新描述');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('新标题')).toBeVisible();
  await expect(page.getByText('新描述')).toBeVisible();
});

test('刷新后持久化：内容与完成状态仍在', async ({ page }) => {
  await page.getByLabel('任务标题').fill('持久化任务');
  await page.getByLabel('任务描述').fill('持久化描述');
  await page.getByRole('button', { name: '新增任务' }).click();
  await page.getByRole('button', { name: '编辑' }).click();
  await page.getByLabel('编辑标题').fill('持久化新标题');
  await page.getByRole('button', { name: '保存' }).click();
  await page.getByRole('checkbox').click();
  await page.reload();
  await expect(page.getByText('持久化新标题')).toBeVisible();
  await expect(page.getByText('持久化描述')).toBeVisible();
  await expect(page.locator('article.task')).toHaveClass(/done/);
});

test('完成任务：勾选后完成状态刷新后仍保留', async ({ page }) => {
  await page.getByLabel('任务标题').fill('待完成任务');
  await page.getByRole('button', { name: '新增任务' }).click();
  await page.getByRole('checkbox').click();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await page.reload();
  await expect(page.getByRole('checkbox')).toBeChecked();
  await expect(page.locator('article.task')).toHaveClass(/done/);
});

test('删除任务：确认删除后消失且刷新后不出现', async ({ page }) => {
  await page.getByLabel('任务标题').fill('待删除任务');
  await page.getByRole('button', { name: '新增任务' }).click();
  await page.getByRole('button', { name: '删除' }).click();
  const deletion = page.waitForResponse((response) => response.url().includes('/api/tasks/') && response.request().method() === 'DELETE');
  await page.getByRole('button', { name: '确认删除' }).click();
  expect((await deletion).status()).toBe(204);
  await page.reload();
  await expect(page.getByText('待删除任务')).not.toBeVisible();
  await expect(page.getByText('待删除任务')).not.toBeVisible();
});

test('删除任务：取消确认后任务仍在且刷新后仍在', async ({ page }) => {
  await page.getByLabel('任务标题').fill('取消删除任务');
  await page.getByRole('button', { name: '新增任务' }).click();
  await page.getByRole('button', { name: '删除' }).click();
  await page.getByRole('button', { name: '取消' }).click();
  await expect(page.getByText('取消删除任务')).toBeVisible();
  await page.reload();
  await expect(page.getByText('取消删除任务')).toBeVisible();
});

test('异常路径：创建空标题被拒绝且不会新增任务', async ({ page }) => {
  const before = await taskTitles(page).count();
  await page.getByRole('button', { name: '新增任务' }).click();
  await expect(page.getByRole('alert')).toContainText('标题不能为空');
  await page.getByLabel('任务标题').fill('   ');
  await page.getByRole('button', { name: '新增任务' }).click();
  await expect(page.getByRole('alert')).toContainText('标题不能为空');
  await expect(taskTitles(page)).toHaveCount(before);
});

test('异常路径：空标题保存编辑被拒绝', async ({ page }) => {
  await page.getByLabel('任务标题').fill('可编辑任务');
  await page.getByRole('button', { name: '新增任务' }).click();
  await page.getByRole('button', { name: '编辑' }).click();
  await page.getByLabel('编辑标题').fill(' ');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByRole('alert')).toContainText('标题不能为空');
  await expect(page.getByLabel('编辑标题')).toBeVisible();
});

test('接口边界：不存在任务返回 404，非法 id 返回 4xx', async ({ page }) => {
  const missing = await page.request.delete('/api/tasks/999999');
  expect(missing.status()).toBe(404);
  const invalid = await page.request.patch('/api/tasks/not-an-id', { data: { title: '非法' } });
  expect(invalid.status()).toBeGreaterThanOrEqual(400);
  expect(invalid.status()).toBeLessThan(500);
});

test('异常路径：网络失败时按钮恢复、显示提示并可重试', async ({ page }) => {
  await page.route('**/api/tasks', (route) => route.abort());
  await page.getByLabel('任务标题').fill('网络失败后重试');
  await page.getByRole('button', { name: '新增任务' }).click();
  await expect(page.getByRole('alert')).toContainText('网络请求失败，请重试');
  await expect(page.getByRole('button', { name: '新增任务' })).toBeEnabled();
  await page.unroute('**/api/tasks');
  await page.getByRole('button', { name: '重试' }).click();
  await expect(page.getByRole('alert')).not.toBeVisible();
  await page.getByRole('button', { name: '新增任务' }).click();
  await expect(page.getByText('网络失败后重试')).toBeVisible();
});

test('异常路径：服务端 5xx 时显示提示且可重试', async ({ page }) => {
  await page.route('**/api/tasks', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: '服务暂不可用' } }) });
    else await route.continue();
  });
  await page.getByLabel('任务标题').fill('服务恢复后重试');
  await page.getByRole('button', { name: '新增任务' }).click();
  await expect(page.getByRole('alert')).toContainText('服务暂不可用');
  await expect(page.getByRole('button', { name: '新增任务' })).toBeEnabled();
  await page.unroute('**/api/tasks');
  await page.getByRole('button', { name: '重试' }).click();
  await page.getByRole('button', { name: '新增任务' }).click();
  await expect(page.getByText('服务恢复后重试')).toBeVisible();
});

test('测试数据隔离：运行前后默认 data 目录文件内容不变', async ({ page }) => {
  const before = defaultDataSnapshot();
  await page.getByLabel('任务标题').fill('隔离验证任务');
  await page.getByRole('button', { name: '新增任务' }).click();
  await page.reload();
  await expect(page.getByText('隔离验证任务')).toBeVisible();
  expect(defaultDataSnapshot()).toBe(before);
});
