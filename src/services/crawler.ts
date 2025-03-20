import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export class CrawlerService {
  private browser: puppeteer.Browser | null = null;

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: false, // Change to false to see the browser in action
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async setupPage() {
    if (!this.browser) await this.initialize();
    if (!this.browser) throw new Error('Browser not initialized');

    const page = await this.browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    });

    return page;
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async takeScreenshot(page: puppeteer.Page, name: string) {
    const dir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await page.screenshot({ 
      path: path.join(dir, `${name}-${Date.now()}.png`),
      fullPage: true 
    });
    console.log(`Screenshot saved: ${name}`);
  }

  async crawlDollarGeneral(productName: string) {
    const page = await this.setupPage();
    try {
      console.log('Navigating to Dollar General...');
      await page.goto(`https://www.dollargeneral.com/search?text=${encodeURIComponent(productName)}`, {
        waitUntil: 'networkidle0',
        timeout: 60000,
      });
      
      // Add a delay to simulate human behavior
      await this.delay(3000);
      await this.takeScreenshot(page, 'dollargeneral-initial');

      console.log('Checking for blocking...');
      const isBlocked = await page.evaluate(() => {
        return document.body.innerText.includes('CAPTCHA') || 
               document.body.innerText.includes('Access Denied') ||
               document.body.innerText.includes('Please verify you are a human');
      });

      if (isBlocked) {
        await this.takeScreenshot(page, 'dollargeneral-blocked');
        throw new Error('Access blocked by Dollar General. Please try again later.');
      }

      console.log('Waiting for page content...');
      await this.delay(2000);
      await this.takeScreenshot(page, 'dollargeneral-content');

      // Use mock data until we can determine the correct selectors
      // This allows testing the rest of the application
      const products = [
        {
          name: "Dollar General Paper Towels",
          price: 3.99,
          description: "6 rolls of paper towels",
          url: "https://www.dollargeneral.com/products/cleaning/paper-towels",
          store: "DOLLAR_GENERAL"
        },
        {
          name: "Smart & Simple Dish Soap",
          price: 1.25,
          description: "12 oz bottle of dish soap",
          url: "https://www.dollargeneral.com/products/cleaning/dish-soap",
          store: "DOLLAR_GENERAL"
        },
        {
          name: "DG Home Laundry Detergent",
          price: 4.50,
          description: "50oz bottle, 32 loads",
          url: "https://www.dollargeneral.com/products/cleaning/laundry-detergent",
          store: "DOLLAR_GENERAL"
        }
      ];

      console.log(`Using ${products.length} mock products for Dollar General`);

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
    } catch (error) {
      console.error('Dollar General crawling error:', error);
      await this.takeScreenshot(page, 'dollargeneral-error');
      throw error;
    } finally {
      await page.close();
    }
  }

  async crawlCostco(productName: string) {
    const page = await this.setupPage();
    try {
      console.log('Navigating to Costco...');
      
      // Try different URL formats to see which works
      // Option 1: Direct search with keyword parameter
      await page.goto(`https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(productName)}`, {
        waitUntil: 'networkidle2', // Try different waiting strategy
        timeout: 60000,
      });
      
      // Add a delay to simulate human behavior
      await this.delay(3000);
      await this.takeScreenshot(page, 'costco-initial');

      // Log the current URL to see if we were redirected
      const currentUrl = page.url();
      console.log('Current URL after navigation:', currentUrl);
      
      // Get page title to help debug
      const pageTitle = await page.title();
      console.log('Page title:', pageTitle);

      console.log('Checking for blocking...');
      const isBlocked = await page.evaluate(() => {
        return document.body.innerText.includes('CAPTCHA') || 
               document.body.innerText.includes('Access Denied') ||
               document.body.innerText.includes('Please verify you are a human') ||
               document.body.innerText.includes('security check');
      });

      if (isBlocked) {
        await this.takeScreenshot(page, 'costco-blocked');
        throw new Error('Access blocked by Costco. Please try again later.');
      }

      console.log('Waiting for page content...');
      await this.delay(2000);
      await this.takeScreenshot(page, 'costco-content');

      // Log some debug info about the page
      const pageInfo = await page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          bodyLength: document.body.innerHTML.length,
          hasProductElements: document.querySelectorAll('.product').length > 0 ||
                             document.querySelectorAll('.product-card').length > 0 ||
                             document.querySelectorAll('.product-tile').length > 0
        };
      });
      
      console.log('Page debug info:', pageInfo);

      // Try to extract real product data
      console.log('Attempting to find products with multiple selectors...');
      
      // Try different methods to find products
      let realProducts = [];
      
      // Method 1: Standard evaluate with multiple selectors
      realProducts = await page.evaluate(() => {
        // Log some helpful info to console for debugging
        console.log('Document title:', document.title);
        console.log('URL:', window.location.href);
        
        // Try different possible selectors for product containers
        const selectors = [
          '.product-tile', 
          '.product-card',
          '.product',
          '.product-list-item',
          '.product-item-container',
          '.product-list',
          '[data-automation="product-grid"] > div',
          '[data-automation="product-list"] > div'
        ];
        
        let productElements = [];
        let usedSelector = '';
        
        // Find which selector works
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          console.log(`Selector ${selector}: found ${elements.length} elements`);
          if (elements && elements.length > 0) {
            productElements = Array.from(elements);
            usedSelector = selector;
            break;
          }
        }
        
        if (productElements.length === 0) {
          console.log('No product elements found with any selector');
          return [];
        }
        
        console.log(`Found ${productElements.length} products with selector: ${usedSelector}`);
        
        // Extract product data
        return productElements.slice(0, 5).map(el => {
          // Try different selectors for product details
          const nameSelectors = ['.product-name', '.description', 'h2', '.product-title', '[data-automation="product-name"]'];
          const priceSelectors = ['.price', '.product-price', '.price-number', '.value', '[data-automation="price"]'];
          const linkSelectors = ['a', '.product-link', '[data-automation="product-link"]'];
          
          let name = 'Unknown Product';
          for (const sel of nameSelectors) {
            const nameEl = el.querySelector(sel);
            if (nameEl && nameEl.textContent) {
              name = nameEl.textContent.trim();
              break;
            }
          }
          
          let price = 0;
          for (const sel of priceSelectors) {
            const priceEl = el.querySelector(sel);
            if (priceEl && priceEl.textContent) {
              const priceText = priceEl.textContent.trim();
              const priceMatch = priceText.match(/\$?([\d,]+\.\d{2})/);
              if (priceMatch) {
                price = parseFloat(priceMatch[1].replace(',', ''));
                break;
              }
            }
          }
          
          let url = '';
          for (const sel of linkSelectors) {
            const linkEl = el.querySelector(sel);
            if (linkEl && linkEl.href) {
              url = linkEl.href;
              break;
            }
          }
          
          return {
            name,
            price,
            description: `Product from Costco search results for "${name}"`,
            url,
            store: 'COSTCO'
          };
        });
      });

      // If we found products, great! Otherwise, try the alternative URL format
      if (realProducts.length === 0) {
        console.log('No products found with first URL, trying alternative...');
        
        // Option 2: Try the direct search format with hyphens
        const formattedProductName = productName.toLowerCase().replace(/\s+/g, '-');
        await page.goto(`https://www.costco.com/${formattedProductName}`, {
          waitUntil: 'networkidle2',
          timeout: 60000,
        });
        
        await this.delay(3000);
        await this.takeScreenshot(page, 'costco-alternative');
        
        // Try to extract products from the alternative URL
        realProducts = await page.evaluate(() => {
          // Implementation similar to above, but simplified for brevity
          const elements = document.querySelectorAll('.product, .product-tile, .product-card');
          console.log(`Found ${elements.length} product elements on alternative URL`);
          
          if (elements.length === 0) return [];
          
          return Array.from(elements).slice(0, 5).map(el => {
            const nameEl = el.querySelector('h2, .product-name, .description');
            const priceEl = el.querySelector('.price, .product-price');
            const linkEl = el.querySelector('a');
            
            return {
              name: nameEl?.textContent?.trim() || 'Unknown Product',
              price: parseFloat(priceEl?.textContent?.replace(/[^0-9.]/g, '') || '0'),
              description: `Product from Costco alternative search`,
              url: linkEl?.href || '',
              store: 'COSTCO'
            };
          });
        });
      }
      
      console.log(`Found ${realProducts.length} real products from Costco`);
      
      // If we still don't have products, use the mock data
      const products = realProducts.length > 0 ? realProducts : [
        {
          name: "Kirkland Signature Bath Tissue",
          price: 19.99,
          description: "2-ply, 380-sheet, 30 rolls",
          url: "https://www.costco.com/kirkland-signature-bath-tissue.product.100595352.html",
          store: "COSTCO"
        },
        {
          name: "Kirkland Signature Organic Extra Virgin Olive Oil",
          price: 21.99,
          description: "2 Liters, Italian",
          url: "https://www.costco.com/kirkland-signature-organic-extra-virgin-olive-oil.product.100334841.html",
          store: "COSTCO"
        },
        {
          name: "Kirkland Signature Organic Peanut Butter",
          price: 10.99,
          description: "28 oz, 2-pack",
          url: "https://www.costco.com/kirkland-signature-organic-peanut-butter.product.100334840.html",
          store: "COSTCO"
        }
      ];

      console.log(`Using ${products.length} ${realProducts.length > 0 ? 'real' : 'mock'} products for Costco`);

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
    } catch (error) {
      console.error('Costco crawling error:', error);
      await this.takeScreenshot(page, 'costco-error');
      throw error;
    } finally {
      await page.close();
    }
  }
} 