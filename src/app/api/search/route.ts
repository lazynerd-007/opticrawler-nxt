import { NextResponse } from 'next/server';
import { CrawlerService } from '@/services/crawler';

export async function POST(request: Request) {
  try {
    const { productName } = await request.json();

    if (!productName) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    console.log('Starting search for:', productName);
    const crawler = new CrawlerService();
    await crawler.initialize();

    try {
      // Clear existing products
      await prisma.product.deleteMany();

      // Search both stores
      const [dollarGeneralProducts, costcoProducts] = await Promise.all([
        crawler.crawlDollarGeneral(productName),
        crawler.crawlCostco(productName)
      ]);

      console.log('Search completed successfully');
      console.log(`Found ${dollarGeneralProducts.length} Dollar General products`);
      console.log(`Found ${costcoProducts.length} Costco products`);

      return NextResponse.json({
        success: true,
        message: 'Search completed successfully',
        data: {
          dollarGeneral: dollarGeneralProducts,
          costco: costcoProducts,
        },
      });
    } finally {
      await crawler.close();
    }
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search products',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 