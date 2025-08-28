# Page Object Model template

- Use functions instead of classes
- Adhere to the external interface for new POMs:
```ts
export interface PageObject {
  page: Page;
  goto: () => Promise<void>;
  actions: Record<string, (...args: any[]) => any>;
  assertions: Record<string, (...args: any[]) => any>;
}
```
- Orgainze all locators into a configMap object

example:
```ts
import {expect, type Page} from "@playwright/test";
import type {TestableEnvironment, User} from "../testableEnvironments.ts";

export function buildLoginPageObject(
    page: Page,
    env: TestableEnvironment,
    user: User,
    baseURL: string
) {
  const locators = {
    
  } as const satisfies Record<string,Locator>
  

    return {
        login: async () => {
            await page.goto(`${baseUrl}/login`);
            await page.fill('input[name="username"]', user.username);
            await page.fill('input[name="password"]', user.password);
            await page.click('button[type="submit"]');
        },
        assertNameIsVisible: async () => {
            await expect(page.getByText(user.username)).toBeVisible()
        },
        assertTier: async () => {
            await expect(page.getByText(`Tier: ${user.tier}`)).toBeVisible()
        }
    };
}

export type LoginPageObject = ReturnType<typeof buildLoginPageObject>;
```
