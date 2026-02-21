import { test, expect } from '@playwright/test';
import { loginAsSeller } from './helpers';

test.describe('出品者ダッシュボード', () => {
  test('出品者ログイン → ダッシュボードにサマリーカード表示', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/dashboard');

    // ダッシュボードが表示される
    await expect(page.locator('text=出品者ダッシュボード').first()).toBeVisible();

    // サマリーカードが表示される
    await expect(page.locator('text=総売上')).toBeVisible();
    await expect(page.locator('text=総注文数')).toBeVisible();
    await expect(page.locator('text=未発送')).toBeVisible();
    await expect(page.locator('text=発送済み')).toBeVisible();
  });

  test('商品管理セクションに商品が表示される', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/dashboard');

    // 商品管理セクション
    await expect(page.locator('text=商品管理')).toBeVisible();

    // seed データの商品が表示される
    await expect(page.locator('text=テスト商品A').first()).toBeVisible();
  });

  test('商品詳細ページへのリンクが動作する', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/dashboard');

    // 商品リンクをクリック
    await page.locator('a', { hasText: 'テスト商品A' }).first().click();

    // 商品詳細ページに遷移
    await page.waitForURL(/\/dashboard\/products\/.+/);
    await expect(page.locator('text=テスト商品A').first()).toBeVisible();
  });

  test('ショップ設定ページの表示・保存', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/dashboard/settings');

    // ショップ設定ページが表示される
    await expect(page.locator('h2', { hasText: 'ショップ設定' })).toBeVisible();

    // ショップ名が入力されている
    const shopNameInput = page.locator('#shopName');
    await expect(shopNameInput).toHaveValue('デモショップ');

    // 説明を更新して保存
    const descInput = page.locator('#shopDescription');
    await descInput.fill('更新されたショップ説明');
    await page.locator('button', { hasText: '設定を保存する' }).click();

    // 成功メッセージが表示される
    await expect(page.locator('text=設定を保存しました')).toBeVisible({ timeout: 5000 });

    // 元に戻す
    await descInput.fill('JPYC決済のデモショップです');
    await page.locator('button', { hasText: '設定を保存する' }).click();
    await expect(page.locator('text=設定を保存しました')).toBeVisible({ timeout: 5000 });
  });

  test('特商法設定ページの表示・保存', async ({ page }) => {
    await loginAsSeller(page);
    await page.goto('/dashboard/settings/legal');

    // 特商法設定ページが表示される
    await expect(page.locator('h2', { hasText: '特定商取引法に基づく表記' })).toBeVisible();

    // 既存データが入力されている（seed データ）
    await expect(page.locator('#legalBusinessName')).toHaveValue('デモ株式会社');
    await expect(page.locator('#legalAddress')).toHaveValue('東京都渋谷区テスト1-2-3');

    // 事業者名を更新して保存
    await page.locator('#legalBusinessName').fill('更新デモ株式会社');
    await page.locator('button', { hasText: '特定商取引法に基づく表記を保存する' }).click();

    // 成功メッセージが表示される
    await expect(page.locator('text=特定商取引法に基づく表記を保存しました')).toBeVisible({ timeout: 5000 });

    // 元に戻す
    await page.locator('#legalBusinessName').fill('デモ株式会社');
    await page.locator('button', { hasText: '特定商取引法に基づく表記を保存する' }).click();
    await expect(page.locator('text=特定商取引法に基づく表記を保存しました')).toBeVisible({ timeout: 5000 });
  });

  test('未ログインで /dashboard アクセス → /login にリダイレクト', async ({ page }) => {
    await page.goto('/dashboard');

    // ログインページにリダイレクトされる
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page.locator('h2', { hasText: 'ログイン' })).toBeVisible();
  });
});
