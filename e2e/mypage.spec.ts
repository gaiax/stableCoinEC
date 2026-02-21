import { test, expect } from '@playwright/test';
import { loginAsBuyer } from './helpers';

test.describe('マイページ', () => {
  test('購入者ログイン → マイページにアカウント情報表示', async ({ page }) => {
    await loginAsBuyer(page);
    await page.goto('/mypage');

    // マイページが表示される
    await expect(page.locator('h2', { hasText: 'マイページ' })).toBeVisible();

    // アカウント情報が表示される
    await expect(page.locator('text=アカウント情報')).toBeVisible();
    await expect(page.locator('main').locator('text=テスト購入者')).toBeVisible();
    await expect(page.locator('text=buyer@example.com')).toBeVisible();

    // ロールバッジ
    await expect(page.getByText('購入者', { exact: true })).toBeVisible();
  });

  test('配送先管理ページへのリンクが動作する', async ({ page }) => {
    await loginAsBuyer(page);
    await page.goto('/mypage');

    // 配送先住所リンクをクリック
    await page.getByRole('link', { name: '配送先住所' }).click();

    // 配送先管理ページに遷移
    await page.waitForURL('/mypage/addresses');
    await expect(page.locator('h2', { hasText: '配送先住所の管理' })).toBeVisible();
  });

  test('未ログインで /mypage アクセス → /login にリダイレクト', async ({ page }) => {
    await page.goto('/mypage');

    // ログインページにリダイレクトされる
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.locator('h2', { hasText: 'ログイン' })).toBeVisible();
  });
});
