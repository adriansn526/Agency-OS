export interface ScrapedLead {
    url: string;
    name: string;
    boltRating?: number;
    boltReviewsCount?: string;
    isSponsored?: boolean;
    deliveryTags: string[];
    phone?: string;
    email?: string;
    companyDetails?: {
        companyName?: string;
        cui?: string;
        regCom?: string;
        companyAddress?: string;
    };
    address?: string;
}

export interface ScraperDriver {
    name: string;
    canHandle(url: string): boolean;
    scrape(url: string, onProgress?: (msg: string) => void): Promise<ScrapedLead[]>;
}
