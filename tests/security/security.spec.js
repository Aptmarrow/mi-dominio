const { test, expect } = require('@playwright/test');

async function openFresh(page, baseURL) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#th-url-input')).toBeVisible();
}

async function installXssTrap(page) {
  await page.evaluate(() => {
    window.__xssFlag = 0;
    window.alert = () => {
      window.__xssFlag += 1;
    };
    window.onerror = () => {
      window.__xssFlag += 1;
    };
  });
}

async function navigateWithAddressBar(page, value) {
  await page.locator('#th-url-input').fill(value);
  await page.locator('#th-url-input').press('Enter');
}

async function navigateToSearch(page, query) {
  await page.evaluate((q) => {
    GensokyoApp.navigate(`gensokyo://search?q=${encodeURIComponent(q)}`);
  }, query);
}

test.describe('GensokyoNet security regression suite', () => {
  test('xss trap canary increments flag when script execution happens', async ({ page, baseURL }) => {
    await openFresh(page, baseURL);
    await installXssTrap(page);

    const before = await page.evaluate(() => window.__xssFlag);
    expect(before).toBe(0);

    await page.evaluate(() => {
      window.alert('xss-canary');
    });

    const after = await page.evaluate(() => window.__xssFlag);
    expect(after).toBeGreaterThan(0);
  });

  test('search query payload does not execute JS across tab changes', async ({ page, baseURL }) => {
    await openFresh(page, baseURL);
    await installXssTrap(page);

    const payload = "touhou-xss-test-1');window.__xssFlag=1;//";
    await expect(page.locator('#gx-home-search')).toBeVisible();
    await page.locator('#gx-home-search').fill(payload);
    await page.locator('#gx-home-search').press('Enter');

    await expect(page.locator('#serp-search-input')).toBeVisible();
    await page.getByRole('button', { name: /Imágenes|Imagenes/ }).click();

    const xssFlag = await page.evaluate(() => window.__xssFlag);
    expect(xssFlag).toBe(0);
  });

  test('search rendering escapes tag payloads and does not inject attacker nodes', async ({ page, baseURL }) => {
    await openFresh(page, baseURL);
    await installXssTrap(page);

    const payload = 'touhou-xss-img-\"><img src=x onerror=window.__xssFlag=1>';
    await navigateToSearch(page, payload);

    await expect(page.locator('#serp-search-input')).toBeVisible();
    await expect(page.locator('img[src="x"]')).toHaveCount(0);

    const xssFlag = await page.evaluate(() => window.__xssFlag);
    expect(xssFlag).toBe(0);
  });

  test('localhost sandbox stays strict by default and enables same-origin only in dev mode', async ({ page, baseURL }) => {
    await openFresh(page, baseURL);

    await navigateWithAddressBar(page, 'localhost:8080');
    const frame = page.locator('iframe.user-site-iframe');
    await expect(frame).toBeVisible({ timeout: 10_000 });

    const secureSandbox = await frame.getAttribute('sandbox');
    expect(secureSandbox).toContain('allow-scripts');
    expect(secureSandbox).toContain('allow-forms');
    expect(secureSandbox).not.toContain('allow-same-origin');

    await page.evaluate(() => {
      GensokyoApp.setLocalhostSandboxMode('dev');
    });

    await expect(frame).toBeVisible({ timeout: 10_000 });
    const devSandbox = await frame.getAttribute('sandbox');
    expect(devSandbox).toContain('allow-same-origin');
  });

  test('private domain blocks access for non-owner accounts', async ({ page, baseURL }) => {
    await openFresh(page, baseURL);

    await page.evaluate(() => {
      GensokyoApp.userDomains = {
        'secreto.blog': {
          title: 'Secreto',
          author: 'owner',
          ownerId: 'ID#OWNER01',
          visibility: 'private',
          activeVersion: 'v1',
          versions: {
            v1: {
              versionTag: 'v1',
              htmlContent: '<h1>no visible</h1>',
              sizeBytes: 18,
              createdAt: new Date().toISOString(),
            },
          },
          htmlContent: '<h1>no visible</h1>',
        },
      };
      GensokyoApp.saveUserDomains();
    });

    await navigateWithAddressBar(page, 'secreto.blog');
    await expect(page.getByText('Dominio Privado')).toBeVisible();
  });

  test('builder rejects multi-file uploads to avoid silent asset discard', async ({ page, baseURL }) => {
    await openFresh(page, baseURL);

    await page.evaluate(() => {
      GensokyoApp.passport = {
        isLoggedIn: true,
        isRegistered: true,
        userId: 'ID#TEST0001',
        username: 'alice',
        avatarUrl: 'assets/nameless_avatar.png',
        ownedDomains: ['alice.blog'],
        oauthToken: 'gx_oauth_test',
      };

      GensokyoApp.userDomains = {
        'alice.blog': {
          title: 'Alice Blog',
          author: 'alice',
          ownerId: 'ID#TEST0001',
          visibility: 'public',
          activeVersion: 'v1',
          versions: {
            v1: {
              versionTag: 'v1',
              htmlContent: '<h1>ok</h1>',
              sizeBytes: 11,
              createdAt: new Date().toISOString(),
            },
          },
          htmlContent: '<h1>ok</h1>',
        },
      };

      GensokyoApp.savePassportData();
      GensokyoApp.saveUserDomains();

      window.__lastToast = '';
      const originalToast = GensokyoApp.showToastNotification.bind(GensokyoApp);
      GensokyoApp.showToastNotification = (message, type) => {
        window.__lastToast = `${type}:${message}`;
        return originalToast(message, type);
      };
    });

    await page.evaluate(() => {
      const files = [
        new File(['<html></html>'], 'index.html', { type: 'text/html' }),
        new File(['body{}'], 'style.css', { type: 'text/css' }),
      ];
      GensokyoApp.processProjectFiles(files, 'alice.blog');
    });

    const toast = await page.evaluate(() => window.__lastToast);
    expect(toast).toContain('error:');
    expect(toast).toContain('solo se admite 1 archivo HTML autocontenido');
  });

  test('registration stores password hash and never plaintext password', async ({ page, baseURL }) => {
    await openFresh(page, baseURL);

    await page.evaluate(async () => {
      GensokyoApp.showRegisterModal();
      document.getElementById('reg-username-input').value = 'hakurei';
      document.getElementById('reg-password-input').value = 'password-segura';
      document.getElementById('reg-confirm-password-input').value = 'password-segura';
      await GensokyoApp.submitRegisterForm();
    });

    const accountInfo = await page.evaluate(() => {
      const raw = localStorage.getItem('gensokyo_accounts_db');
      const db = raw ? JSON.parse(raw) : {};
      const acc = db.hakurei || null;
      return {
        exists: !!acc,
        hash: acc ? acc.passwordHash : null,
        hasPlainPasswordField: !!(acc && Object.prototype.hasOwnProperty.call(acc, 'password')),
        userId: acc ? acc.userId : null,
      };
    });

    expect(accountInfo.exists).toBe(true);
    expect(accountInfo.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(accountInfo.hasPlainPasswordField).toBe(false);
    expect(accountInfo.userId).not.toMatch(/^ID#\d{4}$/);
  });
});
