import { getDomainBacklinksDetail } from "./apps/web/lib/integrations/dataforseo";
getDomainBacklinksDetail("inchideriterase.ro", 10).then(res => console.log(JSON.stringify(res, null, 2)));
