import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
	test("should display navbar on homepage", async ({ page }) => {
		await page.goto("/");

		// Check that navbar exists
		const navbar = page.locator("[data-testid='navbar']");
		await expect(navbar).toBeVisible();

		// Check navbar brand
		const brand = page.locator("[data-testid='navbar-brand']");
		await expect(brand).toBeVisible();
		await expect(brand).toHaveText("Job App Tracker");
		await expect(brand).toHaveAttribute("href", "/");

		// Check navigation links
		const homeLink = page.locator("[data-testid='nav-link-home']");
		const healthLink = page.locator("[data-testid='nav-link-health']");

		await expect(homeLink).toBeVisible();
		await expect(homeLink).toHaveAttribute("href", "/");

		await expect(healthLink).toBeVisible();
		await expect(healthLink).toHaveAttribute("href", "/health");
	});

	test("should display navbar on health check page", async ({ page }) => {
		await page.goto("/health");

		// Check that navbar exists
		const navbar = page.locator("[data-testid='navbar']");
		await expect(navbar).toBeVisible();

		// Check navbar brand
		const brand = page.locator("[data-testid='navbar-brand']");
		await expect(brand).toBeVisible();
		await expect(brand).toHaveText("Job App Tracker");

		// Check navigation links are present
		const homeLink = page.locator("[data-testid='nav-link-home']");
		const healthLink = page.locator("[data-testid='nav-link-health']");

		await expect(homeLink).toBeVisible();
		await expect(healthLink).toBeVisible();
	});

	test("should navigate from homepage to health check", async ({ page }) => {
		await page.goto("/");

		// Verify we're on homepage
		await expect(page.locator("[data-testid='page-title']")).toHaveText("Job App Tracker");

		// Click health check link in navbar and wait for navigation
		await page.click("[data-testid='nav-link-health']");
		await page.waitForURL("/health");

		// Verify we're on health check page
		await expect(page.locator("[data-testid='page-title']")).toHaveText("System Health Check");
		await expect(page).toHaveURL("/health");
	});

	test("should navigate from health check to homepage", async ({ page }) => {
		await page.goto("/health");

		// Verify we're on health check page
		await expect(page.locator("[data-testid='page-title']")).toHaveText("System Health Check");

		// Click home link in navbar and wait for navigation
		await page.click("[data-testid='nav-link-home']");
		await page.waitForURL("/");

		// Verify we're on homepage
		await expect(page.locator("[data-testid='page-title']")).toHaveText("Job App Tracker");
		await expect(page).toHaveURL("/");
	});

	test("should navigate via brand logo", async ({ page }) => {
		await page.goto("/health");

		// Verify we're on health check page
		await expect(page.locator("[data-testid='page-title']")).toHaveText("System Health Check");

		// Click brand logo and wait for navigation
		await page.click("[data-testid='navbar-brand']");
		await page.waitForURL("/");

		// Verify we're on homepage
		await expect(page.locator("[data-testid='page-title']")).toHaveText("Job App Tracker");
		await expect(page).toHaveURL("/");
	});

	test("should have proper navbar styling", async ({ page }) => {
		await page.goto("/");

		const navbar = page.locator("[data-testid='navbar']");
		
		// Check navbar has dark background
		await expect(navbar).toHaveCSS("background-color", "rgb(52, 58, 64)");
		
		// Check navbar links are white
		const navLinks = page.locator("[data-testid='nav-link-home']");
		await expect(navLinks).toHaveCSS("color", "rgb(255, 255, 255)");
	});

	test("should be responsive on mobile", async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto("/");

		// Navbar should still be visible and functional on mobile
		const navbar = page.locator("[data-testid='navbar']");
		await expect(navbar).toBeVisible();

		// Navigation should still work
		await page.click("[data-testid='nav-link-health']");
		await page.waitForURL("/health");
		await expect(page).toHaveURL("/health");
	});
});