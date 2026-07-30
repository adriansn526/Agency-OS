/**
 * WordPress REST API Integration
 */

export interface WPPost {
  id: number
  title: { rendered: string; raw?: string }
  content: { rendered: string; raw?: string }
  excerpt: { rendered: string; raw?: string }
  status: 'publish' | 'future' | 'draft' | 'pending' | 'private'
  type: string
  link: string
  date: string
  modified: string
  // Additional SEO metadata can be mapped here if the WP site uses Yoast/RankMath REST API fields
  yoast_head_json?: any
  rank_math_focus_keyword?: string
}

function getAuthHeader(username?: string, appPassword?: string): Record<string, string> {
  if (!username || !appPassword) return {};
  const token = Buffer.from(`${username}:${appPassword}`).toString('base64');
  return {
    'Authorization': `Basic ${token}`,
  };
}

export async function getWPPosts(wpUrl: string, username?: string, appPassword?: string, status: string = 'draft,publish', perPage: number = 20): Promise<{ data: WPPost[], error?: string }> {
  try {
    let cleanUrl = wpUrl.replace(/\/+$/, '');
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    
    // Fetch Posts
    const postsUrl = new URL(`${cleanUrl}/wp-json/wp/v2/posts`);
    postsUrl.searchParams.append('status', status);
    postsUrl.searchParams.append('per_page', perPage.toString());
    postsUrl.searchParams.append('_embed', '1');
    
    const postsRes = await fetch(postsUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        ...getAuthHeader(username, appPassword),
      },
    });

    // Fetch Pages
    const pagesUrl = new URL(`${cleanUrl}/wp-json/wp/v2/pages`);
    pagesUrl.searchParams.append('status', status);
    pagesUrl.searchParams.append('per_page', perPage.toString());
    pagesUrl.searchParams.append('_embed', '1');
    
    const pagesRes = await fetch(pagesUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        ...getAuthHeader(username, appPassword),
      },
    });

    if (!postsRes.ok && !pagesRes.ok) {
      return { data: [], error: `WP API Error: Posts(${postsRes.status}) Pages(${pagesRes.status})` };
    }

    const postsData = postsRes.ok ? await postsRes.json() : [];
    const pagesData = pagesRes.ok ? await pagesRes.json() : [];
    
    // Combine and mark types correctly just in case WP didn't
    const combined = [
      ...(Array.isArray(postsData) ? postsData.map(p => ({...p, type: 'post'})) : []),
      ...(Array.isArray(pagesData) ? pagesData.map(p => ({...p, type: 'page'})) : [])
    ];
    
    // Sort by date descending
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { data: combined as WPPost[] };
  } catch (err: any) {
    return { data: [], error: err.message };
  }
}

export async function saveWPPost(
  wpUrl: string, 
  username: string, 
  appPassword: string, 
  postData: { id?: number; title?: string; content?: string; status?: 'draft' | 'publish'; meta?: any }
): Promise<{ data: WPPost | null, error?: string }> {
  try {
    let cleanUrl = wpUrl.replace(/\/+$/, '');
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    const url = postData.id 
      ? `${cleanUrl}/wp-json/wp/v2/posts/${postData.id}`
      : `${cleanUrl}/wp-json/wp/v2/posts`;
      
    const res = await fetch(url, {
      method: postData.id ? 'POST' : 'POST', // WP REST API uses POST for both create and update
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...getAuthHeader(username, appPassword),
      },
      body: JSON.stringify({
        ...(postData.title && { title: postData.title }),
        ...(postData.content && { content: postData.content }),
        ...(postData.status && { status: postData.status }),
        ...(postData.meta && { meta: postData.meta }),
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { data: null, error: `WP API Error: ${res.status} ${errBody}` };
    }

    const data = await res.json();
    return { data };
  } catch (err: any) {
    return { data: null, error: err.message };
  }
}
