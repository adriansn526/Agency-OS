import { google } from 'googleapis';

/**
 * Google Search Console integration for Agency OS
 * Uses service account authentication
 */

function getSearchConsoleClient() {
  if (!process.env.GSC_CLIENT_EMAIL || !process.env.GSC_PRIVATE_KEY) {
    throw new Error('Search Console credentials not configured (GSC_CLIENT_EMAIL / GSC_PRIVATE_KEY)');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GSC_CLIENT_EMAIL,
      private_key: process.env.GSC_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  return google.searchconsole({ version: 'v1', auth });
}

// ─── Types ───

export interface GSCMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GSCQuery extends GSCMetrics {
  query: string;
}

export interface GSCPage extends GSCMetrics {
  page: string;
}

export interface GSCDaily extends GSCMetrics {
  date: string;
}

// ─── Functions ───

/**
 * Get site-level summary metrics
 */
export async function getSiteMetrics(
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GSCMetrics> {
  const searchconsole = getSearchConsoleClient();

  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: [],
    },
  });

  const row = response.data.rows?.[0];
  return {
    clicks: row?.clicks || 0,
    impressions: row?.impressions || 0,
    ctr: row?.ctr || 0,
    position: row?.position || 0,
  };
}

/**
 * Get top queries (keywords) with metrics
 */
export async function getTopQueries(
  siteUrl: string,
  startDate: string,
  endDate: string,
  limit: number = 20
): Promise<GSCQuery[]> {
  const searchconsole = getSearchConsoleClient();

  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: limit,
    },
  });

  return (response.data.rows || []).map((row) => ({
    query: row.keys?.[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

/**
 * Get top pages with metrics
 */
export async function getTopPages(
  siteUrl: string,
  startDate: string,
  endDate: string,
  limit: number = 20
): Promise<GSCPage[]> {
  const searchconsole = getSearchConsoleClient();

  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: limit,
    },
  });

  return (response.data.rows || []).map((row) => ({
    page: row.keys?.[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

/**
 * Get daily performance for charts
 */
export async function getGSCDailyPerformance(
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<GSCDaily[]> {
  const searchconsole = getSearchConsoleClient();

  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['date'],
    },
  });

  return (response.data.rows || []).map((row) => ({
    date: row.keys?.[0] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}

/**
 * Get keywords for each page (page+query cross-reference)
 * Returns top pages with their associated keywords
 */
export interface GSCPageKeyword {
  page: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function getPageKeywords(
  siteUrl: string,
  startDate: string,
  endDate: string,
  limit: number = 100
): Promise<GSCPageKeyword[]> {
  const searchconsole = getSearchConsoleClient();

  const response = await searchconsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ['page', 'query'],
      rowLimit: limit,
    },
  });

  return (response.data.rows || []).map((row) => ({
    page: row.keys?.[0] || '',
    query: row.keys?.[1] || '',
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));
}
