import { test, expect } from '@playwright/test';
import { loginAsBuyer } from './helpers';

test.describe('配送先管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBuyer(page);
    await page.goto('/mypage/addresses');
    await expect(page.locator('h2', { hasText: '配送先住所の管理' })).toBeVisible();
  });

  test('新しい配送先を追加 → 一覧に表示される', async ({ page }) => {
    // 「新しい住所を追加」ボタンをクリック
    await page.locator('button', { hasText: '新しい住所を追加' }).click();

    // フォームに入力
    await page.locator('#name').fill('テスト太郎');
    await page.locator('#postalCode').fill('100-0001');
    await page.locator('#prefecture').fill('東京都');
    await page.locator('#city').fill('千代田区');
    await page.locator('#address1').fill('丸の内1-1-1');
    await page.locator('#phone').fill('090-1234-5678');

    // 保存
    await page.locator('button', { hasText: '保存する' }).click();

    // 一覧に追加された住所が表示される
    await expect(page.locator('text=テスト太郎')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=100-0001')).toBeVisible();
    await expect(page.locator('text=東京都千代田区丸の内1-1-1')).toBeVisible();
  });

  test('配送先を編集 → 変更が反映される', async ({ page }) => {
    // まず住所が存在することを確認（前のテストで追加済み、または既存）
    // 住所がない場合は追加する
    const hasAddress = await page.locator('button', { hasText: '編集' }).count();
    if (hasAddress === 0) {
      await page.locator('button', { hasText: '新しい住所を追加' }).click();
      await page.locator('#name').fill('編集テスト');
      await page.locator('#postalCode').fill('200-0001');
      await page.locator('#prefecture').fill('大阪府');
      await page.locator('#city').fill('大阪市');
      await page.locator('#address1').fill('梅田1-1-1');
      await page.locator('#phone').fill('080-1234-5678');
      await page.locator('button', { hasText: '保存する' }).click();
      await expect(page.locator('text=編集テスト')).toBeVisible({ timeout: 5000 });
    }

    // 編集ボタンをクリック
    await page.locator('button', { hasText: '編集' }).first().click();

    // 宛名を変更
    const nameInput = page.locator('#name');
    await nameInput.clear();
    await nameInput.fill('更新された宛名');

    // 保存
    await page.locator('button', { hasText: '保存する' }).click();

    // 変更が反映される
    await expect(page.locator('text=更新された宛名')).toBeVisible({ timeout: 5000 });
  });

  test('配送先を削除 → 一覧から消える', async ({ page }) => {
    // 住所がない場合は追加する
    const hasAddress = await page.locator('button', { hasText: '削除' }).count();
    if (hasAddress === 0) {
      await page.locator('button', { hasText: '新しい住所を追加' }).click();
      await page.locator('#name').fill('削除テスト用');
      await page.locator('#postalCode').fill('300-0001');
      await page.locator('#prefecture').fill('愛知県');
      await page.locator('#city').fill('名古屋市');
      await page.locator('#address1').fill('栄1-1-1');
      await page.locator('#phone').fill('070-1234-5678');
      await page.locator('button', { hasText: '保存する' }).click();
      await expect(page.locator('text=削除テスト用')).toBeVisible({ timeout: 5000 });
    }

    // 削除前に住所の数を記録
    const countBefore = await page.locator('button', { hasText: '削除' }).count();

    // 確認ダイアログを自動承認
    page.on('dialog', (dialog) => dialog.accept());

    // 削除ボタンをクリック
    await page.locator('button', { hasText: '削除' }).first().click();

    // 住所が削除されたことを確認（数が減っている）
    await expect(async () => {
      const countAfter = await page.locator('button', { hasText: '削除' }).count();
      expect(countAfter).toBeLessThan(countBefore);
    }).toPass({ timeout: 5000 });
  });
});
