export interface AutoLinkRule {
  keyword: string;
  url: string;
}

export interface AutoLinkerConfig {
  maxLinksPerPost: number; // 0 = nelimitat
  maxLinksPerKeyword: number; // 0 = nelimitat
  excludeHeadings: boolean;
  caseSensitive: boolean;
  autoLinkOtherPosts: boolean;
  customKeywords: AutoLinkRule[];
}

export const defaultAutoLinkerConfig: AutoLinkerConfig = {
  maxLinksPerPost: 5,
  maxLinksPerKeyword: 1,
  excludeHeadings: true,
  caseSensitive: false,
  autoLinkOtherPosts: true,
  customKeywords: []
};

// Functie recursiva pentru procesarea nodurilor text in browser
function walkTextNodes(node: Node, callback: (textNode: Text) => void, excludeHeadings: boolean) {
  const nodeName = node.nodeName.toLowerCase();
  
  if (nodeName === 'a' || nodeName === 'script' || nodeName === 'style') {
    return;
  }
  
  if (excludeHeadings && /^h[1-6]$/.test(nodeName)) {
    return;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    callback(node as Text);
  } else {
    // Collect children first to avoid missing nodes if DOM changes during iteration
    const children = Array.from(node.childNodes);
    for (const child of children) {
      walkTextNodes(child, callback, excludeHeadings);
    }
  }
}

export function processHtmlForAutoLinks(
  html: string,
  config: AutoLinkerConfig,
  otherPostsRules: AutoLinkRule[] = []
): { html: string, linksAdded: number, addedLinks: { keyword: string, url: string, context: string }[] } {
  const rules = [
    ...(config.autoLinkOtherPosts ? otherPostsRules : []),
    ...(config.customKeywords || [])
  ]
  .map(r => ({ ...r, keyword: Array.isArray(r.keyword) ? r.keyword[0] : String(r.keyword || '') }))
  .filter(r => r.keyword && r.keyword.trim().length > 0 && r.url);

  if (rules.length === 0 || !html.trim()) {
    return { html, linksAdded: 0, addedLinks: [] };
  }

  // Sort rules by keyword length desc so longer phrases match first
  rules.sort((a, b) => b.keyword.length - a.keyword.length);

  let totalLinksAdded = 0;
  const addedLinks: { keyword: string, url: string, context: string }[] = [];
  const keywordUsage = new Map<string, number>();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  walkTextNodes(doc.body, (textNode) => {
    if (config.maxLinksPerPost > 0 && totalLinksAdded >= config.maxLinksPerPost) return;

    let text = textNode.nodeValue || '';
    if (!text.trim()) return;

    let modified = false;

    for (const rule of rules) {
      if (config.maxLinksPerPost > 0 && totalLinksAdded >= config.maxLinksPerPost) break;
      
      const usage = keywordUsage.get(rule.keyword) || 0;
      if (config.maxLinksPerKeyword > 0 && usage >= config.maxLinksPerKeyword) continue;

      const flags = config.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(`\\b(${escapeRegExp(rule.keyword.trim())})\\b`, flags);

      let match;
      while ((match = regex.exec(text)) !== null) {
        if (config.maxLinksPerPost > 0 && totalLinksAdded >= config.maxLinksPerPost) break;
        const currentUsage = keywordUsage.get(rule.keyword) || 0;
        if (config.maxLinksPerKeyword > 0 && currentUsage >= config.maxLinksPerKeyword) break;

        const matchedString = match[1] || '';
        const startIndex = match.index;
        
        const before = text.substring(0, startIndex);
        const after = text.substring(startIndex + matchedString.length);
        
        // Capture context for preview
        const contextStart = Math.max(0, startIndex - 40);
        const contextEnd = Math.min(text.length, startIndex + matchedString.length + 40);
        let context = text.substring(contextStart, contextEnd);
        if (contextStart > 0) context = '...' + context;
        if (contextEnd < text.length) context = context + '...';
        
        textNode.nodeValue = before;
        const aElement = doc.createElement('a');
        aElement.href = rule.url;
        aElement.target = "_blank";
        aElement.textContent = matchedString || null;
        aElement.setAttribute('data-auto-link', 'true');
        
        const afterNode = doc.createTextNode(after);
        
        const parent = textNode.parentNode;
        if (parent) {
          parent.insertBefore(aElement, textNode.nextSibling);
          parent.insertBefore(afterNode, aElement.nextSibling);
        }
        
        totalLinksAdded++;
        addedLinks.push({
          keyword: matchedString,
          url: rule.url,
          context
        });
        keywordUsage.set(rule.keyword, currentUsage + 1);
        modified = true;
        break; 
      }
      if (modified) break;
    }
  }, config.excludeHeadings);

  return { 
    html: doc.body.innerHTML,
    linksAdded: totalLinksAdded,
    addedLinks
  };
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
