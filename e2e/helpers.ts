import { Page, expect } from '@playwright/test';

/**
 * ログインヘルパー - 指定アカウントでログインする
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#email').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  // ログイン後のリダイレクトを待つ
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

/**
 * 購入者としてログイン
 */
export async function loginAsBuyer(page: Page) {
  await login(page, 'buyer@example.com', 'password123');
}

/**
 * 出品者としてログイン
 */
export async function loginAsSeller(page: Page) {
  await login(page, 'seller@example.com', 'password123');
}

/**
 * ログアウトする
 */
export async function logout(page: Page) {
  await page.locator('button', { hasText: 'ログアウト' }).click();
  await page.waitForURL('/');
}

/**
 * ユニークなメールアドレスを生成する
 */
export function uniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
}
