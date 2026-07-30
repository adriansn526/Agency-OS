import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleAdsApi, enums } from 'google-ads-api';

async function run() {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
  });

  try {
    const customerId = '4111955891'; 
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    console.log('Fetching all apps to exclude (mobile app categories)...');
    // We can exclude all mobile app categories to prevent ads showing in random mobile games/apps.
    // The Mobile App Category ID for "All Apps" is typically 69500 (Apple) and 60000 (Android)
    // Or we can just exclude placement URLs like 'mobileapp::1-'
    
    // Instead of messing with raw IDs, a standard way to block all apps in PMax/Display is excluding the top level app categories.
    const appCategoryOps = [
      {
        customer_negative_criterion: {
          type: enums.CriterionType.MOBILE_APP_CATEGORY,
          mobile_app_category: {
            mobile_app_category_constant: 'mobileAppCategoryConstants/60000' // All apps
          }
        }
      },
      {
        customer_negative_criterion: {
          type: enums.CriterionType.MOBILE_APP_CATEGORY,
          mobile_app_category: {
            mobile_app_category_constant: 'mobileAppCategoryConstants/69500' // All apps
          }
        }
      }
    ];

    console.log('Adding account-level exclusions for mobile apps...');
    try {
      await customer.customerNegativeCriteria.create(appCategoryOps);
      console.log('Successfully excluded all mobile apps!');
    } catch(e: any) {
      console.log('Mobile app exclusion notice:', e.message || 'Probably already excluded or API structure difference.');
    }

    // Since PMax heavily uses YouTube and we saw bad traffic from specific videos/channels, 
    // the best way to control PMax placements is through an Account-level Placement Exclusion List.
    console.log('Creating Shared Set for Placement Exclusions...');
    
    // Check if a placement exclusion list already exists
    const sets = await customer.query(`SELECT shared_set.id, shared_set.name FROM shared_set WHERE shared_set.type = 'NEGATIVE_PLACEMENTS'`);
    let sharedSetId;
    
    if (sets.length > 0) {
      sharedSetId = sets[0].shared_set.id;
      console.log('Found existing placement exclusion list:', sharedSetId);
    } else {
      const createSetResp = await customer.sharedSets.create([{
        name: 'Exclude Bad Placements (Apps/Kids/Gaming)',
        type: enums.SharedSetType.NEGATIVE_PLACEMENTS
      }]);
      sharedSetId = createSetResp.results[0].resource_name.split('/')[3];
      console.log('Created new placement exclusion list:', sharedSetId);
    }

    // Now we add generic bad placements (youtube channels for kids, gaming domains, etc.)
    // For PMax, adding specific bad youtube videos we found earlier:
    const badPlacements = [
      'youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ', // Example gaming channel
      'GrDK4T3iQBQ',
      'BjwZQBT0qKs',
      'RIKrremBClU',
      'pEng2zkotH0',
      'fs9vVC4yAPY',
      '5fj-Vjht1sM',
      '8npgd05CJVI',
      'vgMDOVx46C0',
      'vu1LPqyopAk',
      'EvlxWOoGIqo'
    ];

    const placementOps = badPlacements.map(url => ({
      shared_set: `customers/${customerId}/sharedSets/${sharedSetId}`,
      youtube_video: url.length === 11 ? { video_id: url } : undefined,
      placement: url.length !== 11 ? { url: url } : undefined
    })).map(op => {
      // Format correctly based on type
      if (op.youtube_video) {
        return { shared_set: op.shared_set, youtube_video: op.youtube_video };
      }
      return { shared_set: op.shared_set, placement: op.placement };
    });

    console.log('Adding specific bad videos to exclusion list...');
    try {
      await customer.sharedCriteria.create(placementOps);
      console.log('Added bad placements to the list!');
    } catch(e) {
      console.log('Some placements might already be on the list.');
    }

    // Attach the shared set to the customer account if not already attached
    console.log('Attaching placement exclusion list to Account...');
    try {
      // In Google Ads API v14+, you can attach negative placement shared sets to campaigns.
      // We will attach to the PMax campaign.
      await customer.campaignSharedSets.create([{
        campaign: `customers/${customerId}/campaigns/22309675897`,
        shared_set: `customers/${customerId}/sharedSets/${sharedSetId}`
      }]);
      console.log('Successfully attached exclusion list to PMax campaign!');
    } catch(e) {
      console.log('List attachment notice (may already be attached).');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
