# Product Crawler

A Next.js application that crawls product information from Dollar General and Costco websites and stores the data in a PostgreSQL database.

## Prerequisites

- Node.js 18.x or later
- PostgreSQL database
- npm or yarn package manager

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   - Create a PostgreSQL database named `product_crawler`
   - Update the `.env` file with your database credentials
   - Run database migrations:
     ```bash
     npx prisma migrate dev
     ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Enter a product name in the search box
3. Select the store (Dollar General or Costco)
4. Click "Search" to start crawling
5. View the results displayed on the page

## Features

- Crawls product information from Dollar General and Costco
- Stores product data in PostgreSQL database
- Modern UI with responsive design
- Real-time search results
- Error handling and loading states

## Technologies Used

- Next.js 14
- TypeScript
- Tailwind CSS
- Puppeteer
- Prisma ORM
- PostgreSQL

## Note

This application is for educational purposes only. Please ensure you comply with the terms of service of the websites being crawled.
