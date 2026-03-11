import { test, expect } from '@playwright/test';

test.describe('商品閲覧', () => {
  test('トップページに商品一覧が表示される', async ({ page }) => {
    await page.goto('/');

    // 「商品一覧」見出しが表示される
    await expect(page.locator('h2', { hasText: '商品一覧' })).toBeVisible();

    // seed データの「テスト商品A」が表示される
    await expect(page.locator('text=テスト商品A')).toBeVisible();

    // 価格が表示される
    await expect(page.locator('text=1000 JPYC')).toBeVisible();
  });

  test('商品カードクリック → 商品詳細ページへ遷移', async ({ page }) => {
    await page.goto('/');

    // 商品カードをクリック
    await page.locator('text=テスト商品A').first().click();

    // 商品詳細ページに遷移
    await page.waitForURL(/\/products\/.+/);

    // 商品名が表示される
    await expect(page.locator('h1', { hasText: 'テスト商品A' })).toBeVisible();
  });

  test('商品詳細ページに価格・説明・分配情報が表示される', async ({ page }) => {
    await page.goto('/');

    // 商品カードをクリックして詳細に遷移
    await page.locator('text=テスト商品A').first().click();
    await page.waitForURL(/\/products\/.+/);

    // 商品名
    await expect(page.locator('h1', { hasText: 'テスト商品A' })).toBeVisible();

    // 価格
    await expect(page.locator('text=1000 JPYC')).toBeVisible();

    // 説明
    await expect(page.locator('text=JPYC決済のテスト用商品です')).toBeVisible();

    // 在庫
    await expect(page.locator('text=残り')).toBeVisible();
  });

  test('ショップページに商品が表示される', async ({ page }) => {
    await page.goto('/shops/demo-shop');

    // ショップ名が表示される
    await expect(page.locator('h2', { hasText: 'デモショップ' })).toBeVisible();

    // 商品が表示される
    await expect(page.locator('text=テスト商品A')).toBeVisible();
  });
});
