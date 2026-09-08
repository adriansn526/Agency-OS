import { getDomainFullAnalytics } from './lib/integrations/posthog'

async function test() {
  const projectId = '113065';
  const domain = 'inchideriterase.ro';
  const data = await getDomainFullAnalytics(projectId, domain, '2026-07-01', '2026-08-31');
  console.log("Domain full analytics:");
  console.dir(data, { depth: null });
}

test().catch(console.error);
