import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CrawlerService {
  private browser: puppeteer.Browser | null = null;

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async crawlDollarGeneral(productName: string) {
    if (!this.browser) await this.initialize();
    if (!this.browser) throw new Error('Browser not initialized');

    const page = await this.browser.newPage();
    try {
      // Navigate to Dollar General search page
      await page.goto(`https://www.dollargeneral.com/search?text=${encodeURIComponent(productName)}`);
      
      // Wait for product results to load
      await page.waitForSelector('.product-tile', { timeout: 10000 });

      // Extract product information
      const products = await page.evaluate(() => {
        const items = document.querySelectorAll('.product-tile');
        return Array.from(items).map(item => ({
          name: item.querySelector('.product-name')?.textContent?.trim() || '',
          price: parseFloat(item.querySelector('.price')?.textContent?.replace('$', '') || '0'),
          url: item.querySelector('a')?.href || '',
          description: item.querySelector('.product-description')?.textContent?.trim() || '',
        }));
      });

      // Store products in database
      for (const product of products) {
        await prisma.product.create({
          data: {
            name: product.name,
            price: product.price,
            description: product.description,
            store: 'DOLLAR_GENERAL',
            url: product.url,
          },
        });
      }

      return products;
    } finally {
      await page.close();
    }
  }

  async crawlCostco(productName: string) {
    if (!this.browser) await this.initialize();
    if (!this.browser) throw new Error('Browser not initialized');

    const page = await this.browser.newPage();
    try {
      // Navigate to Costco search page
      await page.goto(`https://www.costco.com/CatalogSearch?dept=All&keyword=${encodeURIComponent(productName)}`);
      
      // Wait for product results to load
      await page.waitForSelector('.product-tile-set', { timeout: 10000 });

      // Extract product information
      const products = await page.evaluate(() => {
        const items = document.querySelectorAll('.product-tile-set .product-tile');
        return Array.from(items).map(item => ({
          name: item.querySelector('.description')?.textContent?.trim() || '',
          price: parseFloat(item.querySelector('.price')?.textContent?.replace('$', '') || '0'),
          url: item.querySelector('a')?.href || '',
          description: item.querySelector('.product-description')?.textContent?.trim() || '',
        }));
      });

      // Store products in database
      for (const product of products) {
        await prisma.product.create({
          data: {
            name: product.name,
            price: product.price,
            description: product.description,
            store: 'COSTCO',
            url: product.url,
          },
        });
      }

      return products;
    } finally {
      await page.close();
    }
  }
} 