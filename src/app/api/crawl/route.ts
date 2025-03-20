import { NextResponse } from 'next/server';
import { CrawlerService } from '@/services/crawler';

export async function POST(request: Request) {
  try {
    const { productName, store } = await request.json();

    if (!productName) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    const crawler = new CrawlerService();
    await crawler.initialize();

    let results;
    if (store === 'DOLLAR_GENERAL') {
      results = await crawler.crawlDollarGeneral(productName);
    } else if (store === 'COSTCO') {
      results = await crawler.crawlCostco(productName);
    } else {
      return NextResponse.json(
        { error: 'Invalid store specified' },
        { status: 400 }
      );
    }

    await crawler.close();

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Crawling error:', error);
    return NextResponse.json(
      { error: 'Failed to crawl products' },
      { status: 500 }
    );
  }
} 