import { getDomainBacklinksDetail } from "./lib/integrations/dataforseo";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });
getDomainBacklinksDetail("inchideriterase.ro", 10).then(res => console.log(JSON.stringify(res, null, 2)));
