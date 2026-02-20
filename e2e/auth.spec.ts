import { test, expect } from '@playwright/test';
import { login, loginAsBuyer, loginAsSeller, logout, uniqueEmail } from './helpers';

test.describe('認証フロー', () => {
  test('購入者の新規登録 → 自動ログイン → ヘッダーに名前表示', async ({ page }) => {
    const email = uniqueEmail();
    const name = 'テストユーザー';

    await page.goto('/register');
    await page.locator('#name').fill(name);
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('password123');
    await page.locator('button[type="submit"]').click();

    // 自動ログインでトップページにリダイレクト
    await page.waitForURL('/', { timeout: 10000 });

    // ヘッダーにユーザー名が表示される
    await expect(page.locator('header')).toContainText(name);
  });

  test('ログアウト → ヘッダーが未ログイン状態に戻る', async ({ page }) => {
    await loginAsBuyer(page);

    // ログイン状態を確認
    await expect(page.locator('header')).toContainText('テスト購入者');

    // ログアウト
    await logout(page);

    // 未ログイン状態のヘッダー（「ログイン」「新規登録」リンクが表示）
    await expect(page.locator('header').getByRole('link', { name: 'ログイン' })).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: '新規登録' })).toBeVisible();
  });

  test('ログイン（seed の buyer アカウント）→ マイページ表示', async ({ page }) => {
    await loginAsBuyer(page);

    // マイページに移動
    await page.getByRole('link', { name: 'マイページ' }).click();
    await page.waitForURL('/mypage');

    // アカウント情報が表示される
    await expect(page.locator('text=アカウント情報')).toBeVisible();
    await expect(page.locator('text=buyer@example.com')).toBeVisible();
  });

  test('出品者登録 → ダッシュボードにリダイレクト', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/register/seller');
    await page.locator('#name').fill('テスト出品者');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('password123');
    await page.locator('#shopName').fill('テストショップ');
    await page.locator('#shopSlug').fill(`test-shop-${Date.now()}`);
    await page.locator('button[type="submit"]').click();

    // ダッシュボードにリダイレクト
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page.locator('text=出品者ダッシュボード').first()).toBeVisible();
  });

  test('不正なパスワードでログイン失敗 → エラーメッセージ表示', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('buyer@example.com');
    await page.locator('#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // エラーメッセージが表示される
    await expect(page.locator('text=メールアドレスまたはパスワードが正しくありません')).toBeVisible({ timeout: 5000 });

    // URLはログインページのまま
    expect(page.url()).toContain('/login');
  });
});
