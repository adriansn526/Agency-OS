import { ScraperDriver, ScrapedLead } from './types';
import { BoltFoodLeadDriver } from './drivers/BoltFoodLeadDriver';

export class ScraperService {
    private drivers: ScraperDriver[] = [];

    constructor() {
        this.registerDriver(new BoltFoodLeadDriver());
    }

    registerDriver(driver: ScraperDriver) {
        this.drivers.push(driver);
    }

    getDriverForUrl(url: string): ScraperDriver | undefined {
        return this.drivers.find(driver => driver.canHandle(url));
    }

    async scrape(url: string, onProgress?: (msg: string) => void): Promise<ScrapedLead[]> {
        const driver = this.getDriverForUrl(url);
        if (!driver) {
            throw new Error(`No scraper driver found for URL: ${url}`);
        }
        
        if (onProgress) onProgress(`Using driver: ${driver.name}`);
        return driver.scrape(url, onProgress);
    }
}

export const scraperService = new ScraperService();
