"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Heading from "@tiptap/extension-heading"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { ReadabilityExtension } from "@/lib/editor/readability-extension"
import { AutoLinkerConfig, defaultAutoLinkerConfig, processHtmlForAutoLinks } from "@/lib/seo/auto-linker"
import dynamic from "next/dynamic"

const ProjectSeoNetworkGraph = dynamic(
  () => import('./project-seo-network-graph'),
  { 
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-10"><span className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></span></div>
  }
)

// Extindem modulul de imagine pentru a nu pierde datele esențiale venite de la WordPress
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
      srcset: { default: null },
      sizes: { default: null },
      class: { default: null },
      loading: { default: null },
      decoding: { default: null },
      title: { default: null }, // already exists in parent, but good to be explicit
      alt: { default: null }    // already exists in parent
    }
  }
})

export function cleanWpBakeryContent(html: string): string {
  if (!html) return '';
  let clean = html;
  
  // Extract text from vc_custom_heading
  clean = clean.replace(/\[vc_custom_heading\s+[^\]]*?text="([^"]+)"[^\]]*\]/gi, '<h2>$1</h2>');
  clean = clean.replace(/\[vc_custom_heading\s+[^\]]*?text='([^']+)'[^\]]*\]/gi, '<h2>$1</h2>');
  
  // Extract link from vc_video
  clean = clean.replace(/\[vc_video\s+[^\]]*?link="([^"]+)"[^\]]*\]/gi, '<p><a href="$1">$1</a></p>');
  
  // Remove all other shortcode tags, keeping their inner content intact
  clean = clean.replace(/\[\/?vc_[^\]]+\]/gi, '');
  clean = clean.replace(/\[\/?[a-z_]+(?:\s[^\]]*?)?\]/gi, '');
  
  return clean;
}

import * as Diff from "diff"
import { DiffViewerModal } from "./diff-viewer-modal"
import { 
  Loader2, Save, RefreshCw, CheckCircle2, AlertTriangle, Info, Settings,
  XCircle, FileText, ArrowLeft, Wand2, Search, Link as LinkIcon, Calendar, Target, ChevronRight, ExternalLink, ChevronDown, History, Check, X, ArrowRightLeft, Sparkles, Eraser, Globe, Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useProjectKPIs } from "@/lib/hooks/use-project-kpis"
import { toast } from "sonner"
import { DFS_LOCATIONS } from '@/lib/dataforseo-locations'

function getMonthsDiff(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30)
}

function decodeHtmlEntity(html: string) {
  if (typeof document === 'undefined') return html;
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function getWordCount(html: string | null) {
  if (!html) return 0;
  return html.replace(/<[^>]*>?/gm, '').split(/\s+/).filter(w => w.length > 0).length;
}

export function ProjectSeoContentTab({ projectId, metadata, gscQueries = [], gscPages = [], gscPageKeywords = [], backlinksPages = [], dateFrom, dateTo }: { projectId: string; metadata: any; gscQueries?: any[]; gscPages?: any[]; gscPageKeywords?: any[]; backlinksPages?: any[]; dateFrom?: string; dateTo?: string }) {
  const [activeSubTab, setActiveSubTab] = useState<'articles' | 'core-pages'>('articles')
  const [viewMode, setViewMode] = useState<'table' | 'editor'>('table')
  const [tableSortConfig, setTableSortConfig] = useState<{ key: string, direction: 'asc'|'desc' } | null>(null);
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem('project-seo-sort-v2');
      if (saved) setTableSortConfig(JSON.parse(saved));
    } catch(e) {}
  }, []);
  
  const [inspectingUrls, setInspectingUrls] = useState<Record<string, boolean>>({})
  const [inspectionResults, setInspectionResults] = useState<Record<string, any>>({})

  const handleInspectUrl = async (url: string) => {
    if (!url) return;
    setInspectingUrls(prev => ({ ...prev, [url]: true }));
    try {
      const res = await fetch(`/api/projects/${projectId}/gsc-inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setInspectionResults(prev => ({ ...prev, [url]: json.result }));
    } catch (e: any) {
      toast.error(`Eroare inspecție: ${e.message}`);
    } finally {
      setInspectingUrls(prev => ({ ...prev, [url]: false }));
    }
  }
  
  const [wpPosts, setWpPosts] = useState<any[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [posthogMetrics, setPosthogMetrics] = useState<Record<string, { pageviews: number; unique_visitors: number; mobile_pct?: number; clicks_contact?: number; forms_submitted?: number; avg_scroll?: number }>>({})
  
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [metaDesc, setMetaDesc] = useState("")
  const [keyword, setKeyword] = useState("")
  
  const [analysis, setAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [lsiKeywords, setLsiKeywords] = useState<string[]>([])
  const [loadingLsi, setLoadingLsi] = useState(false)
  const [serpDomains, setSerpDomains] = useState<any[]>([])
  const [loadingSerp, setLoadingSerp] = useState(false)
  const [readabilityActive, setReadabilityActive] = useState(false)
  const [revisions, setRevisions] = useState<any[]>([])
  const [showRevisions, setShowRevisions] = useState(false)
  
  const [aiOptimizedHtml, setAiOptimizedHtml] = useState<string | null>(null)
  const [originalHtmlForDiff, setOriginalHtmlForDiff] = useState<string | null>(null)
  const [lastAutoOptimizeUsage, setLastAutoOptimizeUsage] = useState<{tokens: number, cost: number} | null>(null)
  const [isAutoOptimizing, setIsAutoOptimizing] = useState(false)
  
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null)

  const [showAutoLinkerSettings, setShowAutoLinkerSettings] = useState(false)
  const [autoLinkerConfig, setAutoLinkerConfig] = useState<AutoLinkerConfig>(metadata?.autoLinkerConfig || defaultAutoLinkerConfig)
  
  const handleSaveAutoLinkerConfig = async () => {
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: {
            ...metadata,
            autoLinkerConfig
          }
        })
      });
      toast.success("Setări Auto-Linker salvate.");
      setShowAutoLinkerSettings(false);
    } catch (e: any) {
      toast.error("Eroare la salvare: " + e.message);
    }
  }

  const handleApplyAutoLinker = () => {
    if (!editor) return;
    
    const otherPostsRules: any[] = [];
    enrichedPosts.forEach(p => {
      if (!p || p.id === selectedPostId) return;
      const keywords = new Set<string>();
      
      if (p.yoast_head_json?.focus_kw) keywords.add(p.yoast_head_json.focus_kw.toLowerCase());
      if (p.rank_math_focus_keyword) keywords.add(p.rank_math_focus_keyword.toLowerCase());
      
      if (p.gscKeywords && p.gscKeywords.length > 0) {
        p.gscKeywords.slice(0, 3).forEach((k: string) => keywords.add(k.toLowerCase()));
      }
      
      if (keywords.size === 0 && p.title?.rendered) {
        keywords.add(p.title.rendered.toLowerCase());
      }

      keywords.forEach(kw => {
        if (kw && kw.trim().length > 2) {
          otherPostsRules.push({
            keyword: kw.trim(),
            url: p.link
          });
        }
      });
    });
      
    const currentHtml = editor.getHTML();
    const result = processHtmlForAutoLinks(currentHtml, autoLinkerConfig, otherPostsRules);
    
    if (result.linksAdded > 0) {
      editor.commands.setContent(result.html);
      toast.success(`Au fost adăugate ${result.linksAdded} link-uri interne!`);
    } else {
      toast.info("Nu am găsit oportunități noi de link-uri pe baza setărilor.");
    }
  }

  const [generatingBulk, setGeneratingBulk] = useState(false)
  const [sessionAiCost, setSessionAiCost] = useState(0)
  const [sessionAiTokens, setSessionAiTokens] = useState(0)
  const [sessionGeneratedCount, setSessionGeneratedCount] = useState(0)

  // Bulk Auto-Linker State
  const [showBulkAutoLinkerModal, setShowBulkAutoLinkerModal] = useState(false)
  const [showNetworkGraphModal, setShowNetworkGraphModal] = useState(false)
  
  useEffect(() => {
    if (showNetworkGraphModal) {
      console.log("Modal state confirmed TRUE after render!");
    }
  }, [showNetworkGraphModal]);

  // Render log
  console.log("ProjectSeoContentTab is rendering. showNetworkGraphModal:", showNetworkGraphModal);

  const [analyzingBulkLinks, setAnalyzingBulkLinks] = useState(false)
  const [bulkAnalysisProgress, setBulkAnalysisProgress] = useState(0)
  const [applyingBulkLinks, setApplyingBulkLinks] = useState(false)
  const [bulkExpandedRows, setBulkExpandedRows] = useState<Record<string, boolean>>({})
  const [bulkAutoLinkerResults, setBulkAutoLinkerResults] = useState<{
    post: any;
    linksAdded: number;
    newHtml: string;
    selected: boolean;
    addedLinks: { keyword: string, url: string, context: string }[];
  }[]>([])

  const handleRunBulkAutoLinker = async () => {
    toast.info("Începem analiza bulk...");
    setAnalyzingBulkLinks(true)
    setBulkAnalysisProgress(0)
    setShowBulkAutoLinkerModal(true)
    
    // Scurtă pauză pentru a lăsa React sărandeze modalul
    await new Promise(r => setTimeout(r, 100));

    try {
      const otherPostsRules: any[] = [];
      enrichedPosts.forEach(p => {
        if (!p) return;
        const keywords = new Set<string>();
        
        if (p.yoast_head_json?.focus_kw) keywords.add(p.yoast_head_json.focus_kw.toLowerCase());
        if (p.rank_math_focus_keyword) keywords.add(p.rank_math_focus_keyword.toLowerCase());
        
        if (p.gscKeywords && p.gscKeywords.length > 0) {
          p.gscKeywords.slice(0, 3).forEach((k: string) => keywords.add(k.toLowerCase()));
        }
        
        if (keywords.size === 0 && p.title?.rendered) {
          keywords.add(p.title.rendered.toLowerCase());
        }

        keywords.forEach(kw => {
          if (kw && kw.trim().length > 2) {
            otherPostsRules.push({
              keyword: kw.trim(),
              url: p.link,
              postId: p.id
            });
          }
        });
      });
        
      const results = [];
      let processed = 0;
      for (const post of enrichedPosts) {
        if (!post) {
          processed++;
          continue;
        }
        
        try {
          // Exclude current post from its own rules
          const rulesForPost = otherPostsRules.filter(r => r.postId !== post.id);
          const content = post.content?.rendered || '';
          
          const res = processHtmlForAutoLinks(content, autoLinkerConfig, rulesForPost);
          
          results.push({
            post,
            linksAdded: res.linksAdded,
            newHtml: res.html,
            selected: res.linksAdded > 0,
            addedLinks: res.addedLinks
          });

          processed++;
          setBulkAnalysisProgress(Math.round((processed / enrichedPosts.length) * 100));
          
          // Pauză pentru a nu bloca interfața și a lăsa bara de progres să se randeze
          await new Promise(r => setTimeout(r, 20));
        } catch (innerErr: any) {
          console.error("Eroare la procesarea postării:", post.id, innerErr);
          toast.error(`Eroare la procesarea postării ${post.id}`);
          break; // Stop loop on error
        }
      }

      // Sort results by linksAdded descending
      results.sort((a, b) => b.linksAdded - a.linksAdded);

      setBulkAutoLinkerResults(results);
      toast.success(`Analiză finalizată! Am procesat ${otherPostsRules.length} cuvinte cheie.`);
    } catch (err: any) {
      console.error("Bulk auto linker error:", err);
      toast.error("A apărut o eroare la analiză: " + (err.message || String(err)));
    } finally {
      setAnalyzingBulkLinks(false);
    }
  }

  const handleApplyBulkLinks = async () => {
    const toApply = bulkAutoLinkerResults.filter(r => r.selected && r.linksAdded > 0);
    if (toApply.length === 0) return;

    setApplyingBulkLinks(true);
    let successCount = 0;

    for (const item of toApply) {
      try {
        const res = await fetch(`/api/projects/${projectId}/wp-posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: item.post.id,
            content: item.newHtml
          })
        });
        const data = await res.json();
        if (res.ok && !data.error) {
          successCount++;
        }
      } catch (e) {
        console.error(`Failed to update post ${item.post.id}`, e);
      }
    }

    setApplyingBulkLinks(false);
    setShowBulkAutoLinkerModal(false);
    toast.success(`Am actualizat cu succes ${successCount} din ${toApply.length} articole selectate.`);
    // Refresh posts to get new content
    fetchPosts();
  }

  // Merged DataForSEO and Google Ads metrics
  const [keywordMetrics, setKeywordMetrics] = useState<Record<string, any>>(metadata?.keywordMetrics || {})
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  
  const [targetLocationCode, setTargetLocationCode] = useState(2642)
  const [targetLanguageCode, setTargetLanguageCode] = useState('ro')
  const [countrySearch, setCountrySearch] = useState("Romania (ro)")
  const [showCountryDropdown, setShowCountryDropdown] = useState(false)

  const [competitorDomain, setCompetitorDomain] = useState("")
  const [competitorKeywords, setCompetitorKeywords] = useState<any[]>([])
  const [analyzingCompetitor, setAnalyzingCompetitor] = useState(false)
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'search_volume', direction: 'desc' })

  const [targetKeyword, setTargetKeyword] = useState("")
  const [relatedKeywords, setRelatedKeywords] = useState<any[]>([])
  const [analyzingKeyword, setAnalyzingKeyword] = useState(false)

  const [discoveredCompetitors, setDiscoveredCompetitors] = useState<string[]>([])
  const [discovering, setDiscovering] = useState(false)

  // WP Settings Check
  const wpUrl = metadata?.wpUrl
  const hasWpConfig = !!(wpUrl && metadata?.wpUsername && metadata?.wpAppPassword)

  
  // Generate Article States
  const [generateModal, setGenerateModal] = useState<{ isOpen: boolean, keyword: string, sv: number, kd: number, recommendedLength: number } | null>(null)
  const [generatingArticle, setGeneratingArticle] = useState(false)
  const [articleLengthInput, setArticleLengthInput] = useState(1500)
  const [generateError, setGenerateError] = useState("")

  const calculateRecommendedLength = (sv: number, kd: number) => {
    let length = 800
    if (sv > 1000) length += 400
    if (sv > 5000) length += 300
    if (kd > 20) length += 300
    if (kd > 45) length += 400
    return length
  }

  const handleOpenGenerateModal = (keyword: string, sv: number, kd: number) => {
    const recLen = calculateRecommendedLength(sv, kd)
    setGenerateModal({ isOpen: true, keyword, sv, kd, recommendedLength: recLen })
    setArticleLengthInput(recLen)
    setGenerateError("")
  }

  useEffect(() => {
    const fetchPosthog = async () => {
      try {
        let url = `/api/projects/${projectId}/posthog-pages`
        if (dateFrom && dateTo) {
          url += `?from=${dateFrom}&to=${dateTo}`
        }
        const res = await fetch(url)
        if (res.ok) {
          const json = await res.json()
          if (json.data) {
            setPosthogMetrics(json.data)
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
    fetchPosthog()
  }, [projectId, dateFrom, dateTo])

  const handleGenerateArticle = async () => {
    if (!generateModal || !hasWpConfig) {
      if (!hasWpConfig) toast.error("Conectează WordPress mai întâi!")
      return
    }
    setGeneratingArticle(true)
    setGenerateError("")
    try {
      const res = await fetch('/api/seo/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: generateModal.keyword,
          length: articleLengthInput,
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Eroare la generare")
      
      const { html, title, metaDescription } = json.data

      const wpRes = await fetch(`/api/projects/${projectId}/wp-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: html,
          status: 'draft',
          meta: {
            rank_math_focus_keyword: generateModal.keyword,
            rank_math_description: metaDescription,
            rank_math_title: title,
            yoast_wpseo_focuskw: generateModal.keyword,
            yoast_wpseo_metadesc: metaDescription,
            yoast_wpseo_title: title,
            agencyos_benchmark: serpDomains,
            agencyos_lsi: lsiKeywords
          }
        })
      })
      
      if (!wpRes.ok) throw new Error("Eroare la salvarea în WordPress")
      
      toast.success("Articol generat și salvat ca Draft!")
      setGenerateModal(null)
      fetchPosts()
    } catch (err: any) {
      setGenerateError(err.message)
    } finally {
      setGeneratingArticle(false)
    }
  }

  // Fetch Ads Data for Opportunities
  const { data: liveKPIs } = useProjectKPIs(projectId)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Heading.configure({ levels: [1, 2, 3, 4] }),
      Link.configure({ openOnClick: false }),
      (CustomImage as any).configure({
        inline: false,
        HTMLAttributes: {
          style: 'max-width: 100%; height: auto; border-radius: 0.5rem; margin-top: 1rem; margin-bottom: 1rem; object-fit: contain;',
        },
      }),
      ReadabilityExtension.configure({
        active: readabilityActive
      })
    ],
    content: "<p>Începe să scrii articolul aici...</p>",
    onUpdate: ({ editor }) => {
      // triggers debounced analysis
    },
  })

  // Fetch posts from WP
  const fetchPosts = async () => {
    if (!hasWpConfig) return
    setLoadingPosts(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/wp-posts`)
      const json = await res.json()
      if (json.data) {
        setWpPosts(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingPosts(false)
    }
  }

  useEffect(() => {
    if (editor) {
      const ext = editor.extensionManager.extensions.find(e => e.name === 'readability')
      if (ext) {
        ext.options.active = readabilityActive
        editor.view.dispatch(editor.state.tr.setMeta('readability-toggled', true))
      }
    }
  }, [readabilityActive, editor])

  useEffect(() => {
    fetchPosts()
  }, [projectId, hasWpConfig])

  // Select a post & open editor
  const handleOpenEditor = (postId: number | null) => {
    setSaveStatus(null)
    if (postId === null || postId === 0) {
      setSelectedPostId(null)
      setTitle("")
      setMetaDesc("")
      setKeyword("")
      editor?.commands.setContent("<p>Începe să scrii articolul aici...</p>")
    } else {
      const post = wpPosts.find(p => p.id === postId)
      if (post) {
        setSelectedPostId(post.id)
        setTitle(decodeHtmlEntity(post.title?.rendered || ""))
        editor?.commands.setContent(post.content?.rendered || "")
        
        // Try to extract existing Yoast/RankMath meta
        let seoData: any = {}
        if (post.yoast_head_json) {
          seoData.description = post.yoast_head_json.description || ""
          seoData.focus_kw = post.yoast_head_json.focus_kw || ""
          seoData.title = post.yoast_head_json.title || ""
        }
        if (!seoData.focus_kw && post.rank_math_focus_keyword) {
          seoData.focus_kw = post.rank_math_focus_keyword
        }
        if (!seoData.focus_kw && metadata?.keywords?.[post.id]) {
          seoData.focus_kw = metadata.keywords[post.id]
        }

        setMetaDesc(seoData.description || "")
        setKeyword(seoData.focus_kw || "")
        if (post.agencyos_benchmark && Array.isArray(post.agencyos_benchmark)) {
          setSerpDomains(post.agencyos_benchmark)
        } else {
          setSerpDomains([])
        }
        if (post.agencyos_lsi && Array.isArray(post.agencyos_lsi)) {
          setLsiKeywords(post.agencyos_lsi)
        } else {
          setLsiKeywords([])
        }
        if (post.agencyos_revisions && Array.isArray(post.agencyos_revisions)) {
          setRevisions(post.agencyos_revisions)
        } else {
          setRevisions([])
        }
      }
    }
    setViewMode('editor')
  }

  // Restore editor state from URL on initial load
  const hasParsedUrlRef = useRef(false);
  const isInitializingRef = useRef(false);

  useEffect(() => {
    if (wpPosts.length > 0 && !hasParsedUrlRef.current) {
      hasParsedUrlRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const postParam = params.get('post');
      if (postParam) {
        isInitializingRef.current = true;
        const postId = parseInt(postParam, 10);
        if (!isNaN(postId)) {
          handleOpenEditor(postId);
        }
        // Reset initialization flag in next tick
        setTimeout(() => { isInitializingRef.current = false; }, 100);
      }
    }
  }, [wpPosts.length]); // Only depend on length to run after fetch

  // Sync state to URL
  useEffect(() => {
    if (!hasParsedUrlRef.current || isInitializingRef.current) return;

    const url = new URL(window.location.href);
    if (viewMode === 'editor' && selectedPostId) {
      if (url.searchParams.get('post') !== selectedPostId.toString()) {
        url.searchParams.set('post', selectedPostId.toString());
        window.history.replaceState({}, '', url.toString());
      }
    } else if (viewMode === 'table') {
      if (url.searchParams.has('post')) {
        url.searchParams.delete('post');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [viewMode, selectedPostId, wpPosts.length]);

  const fetchLsiKeywords = async () => {
    if (!keyword) return;
    setLoadingLsi(true);
    const toastId = toast.loading("Generăm cuvinte LSI (Termeni Semantici)...");
    try {
      // Daca sunt mai multe keyworduri separate prin virgula, il luam doar pe primul pt LSI
      const primaryKeyword = (keyword || '').split(',')[0].trim();
      const res = await fetch('/api/seo/dataforseo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'related_keywords', keyword: primaryKeyword })
      });
      const data = await res.json();
      
      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.data && Array.isArray(data.data)) {
        // Preluăm primii 15 termeni relevanți, curățați
        const kws = data.data.slice(0, 15).map((item: any) => item.keyword).filter(Boolean);
        if (kws.length === 0) {
           toast.error("Nu s-au găsit termeni LSI pentru acest cuvânt cheie.", { id: toastId });
           return;
        }
        setLsiKeywords(kws);
        toast.success(`Am generat ${kws.length} termeni LSI!`, { id: toastId });

        
        // Auto-save to fallback DB cache
        if (selectedPostId) {
          fetch(`/api/projects/${projectId}/wp-posts/cache`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              postId: selectedPostId,
              meta: { agencyos_lsi: kws }
            })
          }).catch(err => console.error("Failed to persist LSI", err))
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Eroare la generarea LSI-urilor.", { id: toastId });
    } finally {
      setLoadingLsi(false);
    }
  };

  const fetchSerpBenchmark = async () => {
    if (!keyword) return;
    setLoadingSerp(true);
    try {
      const res = await fetch('/api/seo/dataforseo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'serp_competitors', keyword })
      });
      const data = await res.json();
      if (data?.data && Array.isArray(data.data)) {
        setSerpDomains(data.data);
        
        // Auto-save to fallback DB cache
        if (selectedPostId) {
          fetch(`/api/projects/${projectId}/wp-posts/cache`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              postId: selectedPostId,
              meta: { agencyos_benchmark: data.data }
            })
          }).catch(err => console.error("Failed to persist SERP benchmark", err))
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSerp(false);
    }
  };

  // Analyze content
  const runAnalysis = useCallback(async () => {
    if (!editor) return
    setAnalyzing(true)
    try {
      const html = `<h1>${title}</h1>\n` + editor.getHTML()
      
      const currentPost = enrichedPosts.find(p => p.id === selectedPostId)
      const focusKws = keyword.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
      const extraKws = (currentPost?.gscKeywords || []).filter((k: string) => !focusKws.includes(k.toLowerCase()));
      const existingPostTitles = wpPosts.filter(p => p.id !== selectedPostId).map(p => p.title.rendered).filter(Boolean);
      
      const res = await fetch('/api/seo/analyze-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          html, 
          title, 
          metaDescription: metaDesc, 
          targetKeywords: focusKws,
          gscKeywords: extraKws,
          existingPostTitles
        })
      })
      const json = await res.json()
      if (json.data) {
        setAnalysis(json.data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAnalyzing(false)
    }
  }, [editor, title, metaDesc, keyword])

  // Debounce analysis on content changes
  useEffect(() => {
    if (viewMode !== 'editor') return
    const handler = setTimeout(() => {
      runAnalysis()
    }, 1500)
    return () => clearTimeout(handler)
  }, [runAnalysis, editor?.getHTML(), title, metaDesc, keyword, viewMode])

  // DataForSEO API Calls
  const fetchMetrics = async () => {
    if (!wpPosts.length) return
    const keywordsToFetch = wpPosts
      .map(p => (p.yoast_head_json?.focus_kw || p.rank_math_focus_keyword || "").trim())
      .filter(kw => kw.length > 0)

    if (gscPageKeywords) {
      const gscQs = gscPageKeywords.map((k: any) => k.query).filter(Boolean);
      keywordsToFetch.push(...gscQs);
    }
    
    if (!keywordsToFetch.length) {
      toast.error("Niciun Focus Keyword setat pentru articole.")
      return
    }

    setLoadingMetrics(true)
    const toastId = toast.loading("Se descarcă metricile SEO...")
    try {
      const res = await fetch('/api/seo/dataforseo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'search_volume', 
          keywords: Array.from(new Set(keywordsToFetch)),
          locationCode: targetLocationCode,
          languageCode: targetLanguageCode
        })
      })
      const json = await res.json()
      if (json.data) {
        const newMap: Record<string, any> = {}
        json.data.forEach((item: any) => {
          newMap[item.keyword.toLowerCase()] = { 
            kd: item.keyword_difficulty, 
            sv_dfs: item.search_volume,
            sv: item.search_volume, // fallback 
            sv_ads: keywordMetrics[item.keyword.toLowerCase()]?.sv_ads,
            cpc: item.cpc,
            search_intent: item.search_intent
          }
        })
        const mergedMap = { ...keywordMetrics, ...newMap }
        setKeywordMetrics(mergedMap)
        
        // Save to DB
        fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...metadata,
              keywordMetrics: mergedMap
            }
          })
        }).catch(err => console.error("Failed to persist keyword metrics", err))

        toast.success(`Metrici actualizate pentru ${json.data.length} cuvinte cheie.`, { id: toastId })
      } else {
        toast.error("Eroare de la API", { id: toastId })
      }
    } catch (e: any) {
      toast.error("A apărut o problemă: " + e.message, { id: toastId })
    } finally {
      setLoadingMetrics(false)
    }
  }

  const [loadingAdsVolumes, setLoadingAdsVolumes] = useState(false)
  const fetchGoogleAdsVolumes = async () => {
    if (!gscPageKeywords || gscPageKeywords.length === 0) {
      toast.error("Nu există date GSC pentru a prelua volume.")
      return
    }

    // Extragem toate query-urile unice din gscPageKeywords
    const queries = Array.from(new Set(gscPageKeywords.map((k: any) => k.query))).filter(Boolean)
    
    setLoadingAdsVolumes(true)
    const toastId = toast.loading(`Preluăm volume Google Ads pentru ${queries.length} cuvinte...`)
    
    try {
      const res = await fetch(`/api/projects/${projectId}/google-ads/volumes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: queries })
      })
      
      const json = await res.json()
      
      if (json.success && json.data) {
        const newMap: Record<string, any> = {}
        Object.keys(json.data).forEach(kw => {
          const sv = json.data[kw]
          newMap[kw.toLowerCase()] = { 
            kd: keywordMetrics[kw.toLowerCase()]?.kd || 0, 
            sv_dfs: keywordMetrics[kw.toLowerCase()]?.sv_dfs,
            sv_ads: sv 
          }
        })
        const mergedMap = { ...keywordMetrics, ...newMap }
        setKeywordMetrics(mergedMap)
        
        // Save to DB
        fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metadata: {
              ...metadata,
              keywordMetrics: mergedMap
            }
          })
        }).catch(err => console.error("Failed to persist keyword metrics", err))
        
        toast.success(`Volume preluate pentru ${Object.keys(json.data).length} cuvinte cheie.`, { id: toastId })
      } else {
        toast.error("Eroare: " + (json.error || "Răspuns invalid de la API"), { id: toastId })
      }
    } catch (e: any) {
      toast.error("A apărut o problemă: " + e.message, { id: toastId })
    } finally {
      setLoadingAdsVolumes(false)
    }
  }

  const fetchCompetitorGap = async () => {
    if (!competitorDomain) return
    
    // Clean domain (remove https://, www., and paths)
    let cleanDomain = competitorDomain.trim().toLowerCase()
    cleanDomain = cleanDomain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0] || ''

    if (!cleanDomain) {
      toast.error("Introdu un domeniu valid")
      return
    }

    setAnalyzingCompetitor(true)
    const toastId = toast.loading(`Analizăm Gap pentru ${cleanDomain}...`)
    try {
      const res = await fetch('/api/seo/dataforseo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'competitor', 
          domain: cleanDomain,
          locationCode: targetLocationCode,
          languageCode: targetLanguageCode
        })
      })
      const json = await res.json()
      if (json.data) {
        // True Content Gap: filter out keywords we already rank for / have articles for
        const existingKeywords = wpPosts.flatMap(p => [
          (p.yoast_head_json?.focus_kw || '').toLowerCase(),
          (p.rank_math_focus_keyword || '').toLowerCase(),
          (p.title?.rendered || '').toLowerCase()
        ]).filter(Boolean)

        const trueGaps = json.data.filter((kw: any) => {
          const t = kw.keyword?.toLowerCase() || ''
          return !existingKeywords.some(ek => ek.includes(t) || t.includes(ek))
        })

        setCompetitorKeywords(trueGaps)
        toast.success(`Am găsit ${trueGaps.length} oportunități GAP de la ${competitorDomain}.`, { id: toastId })
      } else {
        toast.error("Eroare de la API", { id: toastId })
      }
    } catch (e: any) {
      toast.error("Eroare analiză: " + e.message, { id: toastId })
    } finally {
      setAnalyzingCompetitor(false)
    }
  }

  const fetchRelatedKeywords = async () => {
    if (!targetKeyword) {
      toast.error("Introdu un cuvânt cheie")
      return
    }
    setAnalyzingKeyword(true)
    const toastId = toast.loading(`Căutăm oportunități pentru '${targetKeyword}'...`)
    try {
      const res = await fetch('/api/seo/dataforseo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'related_keywords', 
          keyword: targetKeyword,
          locationCode: targetLocationCode,
          languageCode: targetLanguageCode
        })
      })
      const json = await res.json()
      if (json.data) {
        setRelatedKeywords(json.data)
        toast.success(`Am găsit ${json.data.length} cuvinte cheie corelate.`, { id: toastId })
      } else {
        toast.error("Eroare de la API", { id: toastId })
      }
    } catch (e: any) {
      toast.error("Eroare analiză: " + e.message, { id: toastId })
    } finally {
      setAnalyzingKeyword(false)
    }
  }

  const handleDiscoverCompetitors = async () => {
    let rawUrl = metadata?.gscSiteUrl || wpUrl
    if (!rawUrl) {
      toast.error("Proiectul nu are un URL configurat (GSC sau WP).")
      return
    }
    
    // GSC URLs usually have 'sc-domain:' or 'https://'
    let domain = rawUrl.replace('sc-domain:', '').replace(/^(https?:\/\/)/, '').replace(/\/$/, '')
    
    // Fallback if it has paths (we just want the hostname)
    try {
      if (rawUrl.startsWith('http')) {
        domain = new URL(rawUrl).hostname
      }
    } catch (e) {}

    setDiscovering(true)
    const toastId = toast.loading(`Căutăm competitori pentru ${domain}...`)
    try {
      const res = await fetch('/api/seo/dataforseo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discover_competitors',
          domain,
          locationCode: targetLocationCode,
          languageCode: targetLanguageCode
        })
      })
      const json = await res.json()
      if (json.data && json.data.length > 0) {
        const domains = json.data.map((d: any) => typeof d === 'string' ? d : d.domain).filter(Boolean);
        setDiscoveredCompetitors(domains)
        toast.success(`Am găsit ${json.data.length} competitori locali!`, { id: toastId })
      } else {
        toast.info(`Nu am găsit suficienți competitori indexați pentru ${domain} în această regiune. Încearcă să introduci un competitor manual.`, { id: toastId, duration: 6000 })
      }
    } catch (e: any) {
      toast.error("Eroare: " + e.message, { id: toastId })
    } finally {
      setDiscovering(false)
    }
  }

  const handleDiscoverSerpCompetitors = async (directKeyword?: string) => {
    let keyword = directKeyword || competitorDomain || targetKeyword
    if (!keyword) {
      const promptKeyword = window.prompt("Introdu cuvântul cheie pentru a găsi competitorii din top 10 Google:")
      if (!promptKeyword) return
      keyword = promptKeyword
    }

    setTargetKeyword(keyword) // sync the UI
    setDiscovering(true)
    const toastId = toast.loading(`Căutăm competitori pentru "${keyword}"...`)
    try {
      const res = await fetch('/api/seo/dataforseo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'serp_competitors',
          keyword,
          locationCode: targetLocationCode,
          languageCode: targetLanguageCode
        })
      })
      const json = await res.json()
      if (json.data && json.data.length > 0) {
        const domains = json.data.map((d: any) => typeof d === 'string' ? d : d.domain).filter(Boolean);
        setDiscoveredCompetitors(domains)
        toast.success(`Am găsit ${json.data.length} domenii în SERP!`, { id: toastId })
      } else {
        toast.info(`Nu am găsit competitori valabili pentru acest cuvânt.`, { id: toastId, duration: 6000 })
      }
    } catch (e: any) {
      toast.error("Eroare: " + e.message, { id: toastId })
    } finally {
      setDiscovering(false)
    }
  }

  // Save to WP
  const handleSaveToWP = async () => {
    if (!editor || !hasWpConfig) return
    setSaving(true)
    setSaveStatus(null)

    let currentStatus = 'draft'
    if (selectedPostId) {
      const existing = wpPosts.find(p => p.id === selectedPostId)
      if (existing && existing.status) {
        currentStatus = existing.status
      }
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/wp-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: selectedPostId,
          title,
          content: editor.getHTML(),
          status: currentStatus,
          meta: {
            rank_math_focus_keyword: keyword,
            rank_math_description: metaDesc,
            rank_math_title: title,
            yoast_wpseo_focuskw: keyword,
            yoast_wpseo_metadesc: metaDesc,
            yoast_wpseo_title: title,
            _yoast_wpseo_focuskw: keyword,
            _yoast_wpseo_metadesc: metaDesc,
            _yoast_wpseo_title: title,
            agencyos_benchmark: serpDomains,
            agencyos_lsi: lsiKeywords
          }
        })
      })
      const json = await res.json()
      if (json.error) {
        setSaveStatus({ type: 'error', msg: json.error })
      } else {
        const msgText = currentStatus === 'publish' ? 'Salvat!' : 'Salvat ca Draft!';
        setSaveStatus({ type: 'success', msg: msgText })
        if (!selectedPostId && json.data?.id) {
          setSelectedPostId(json.data.id)
        }
        // Background refresh table data
        fetchPosts()
      }
    } catch (e: any) {
      setSaveStatus({ type: 'error', msg: e.message })
    } finally {
      setSaving(false)
    }
  }

  // Save Local Draft
  const handleSaveLocalDraft = (silent = false) => {
    if (!editor || !selectedPostId) {
      if (!silent) toast.error("Nu poți salva o schiță locală pentru un articol inexistent. Salvează-l întâi în WordPress.");
      return;
    }
    const draftKey = `agencyos_draft_${projectId}_${selectedPostId}`;
    const draftData = {
      title,
      keyword,
      metaDesc,
      content: editor.getHTML(),
      timestamp: Date.now()
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      if (!silent) {
        setSaveStatus({ type: 'success', msg: 'Salvat local!' });
        toast.success("Schița a fost salvată local în browser!");
      }
    } catch (e) {
      if (!silent) toast.error("Eroare la salvarea locală (spațiu insuficient în browser?).");
    }
  }

  // Autosave Draft every 30 seconds if content exists
  useEffect(() => {
    if (!editor || !selectedPostId) return;
    const interval = setInterval(() => {
      handleSaveLocalDraft(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [editor, selectedPostId, title, keyword, metaDesc]);

  const [savingKeywordFor, setSavingKeywordFor] = useState<number | null>(null);

  const handleSetFocusKeywordInline = async (postId: number, keyword: string) => {
    setSavingKeywordFor(postId);
    const toastId = toast.loading(`Salvăm Focus Keyword "${keyword}"...`);
    try {
      const res = await fetch(`/api/projects/${projectId}/wp-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          meta: {
            yoast_wpseo_focuskw: keyword,
            rank_math_focus_keyword: keyword
          }
        })
      });
      if (res.ok) {
        toast.success(`Focus Keyword salvat cu succes!`, { id: toastId });
        fetchPosts(); // reload
      } else {
        const json = await res.json();
        toast.error(`Eroare salvare: ${json.error}`, { id: toastId });
      }
    } catch(e: any) {
      toast.error(`Eroare conexiune: ${e.message}`, { id: toastId });
    } finally {
      setSavingKeywordFor(null);
    }
  }

  // Single AI Optimization
  const [optimizing, setOptimizing] = useState(false)
  const handleOptimizeAI = async () => {
    if (!editor) return
    setOptimizing(true)
    const toastId = toast.loading("Optimizăm conținutul cu AI...")
    try {
      const contentText = editor.getHTML().replace(/<[^>]*>?/gm, '').substring(0, 1500)
      const res = await fetch('/api/seo/generate-meta-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: [{ id: selectedPostId || 1, title, content: contentText }] })
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      
      if (json.data && json.data[0]) {
        const generated = json.data[0]
        if (generated.keyword) setKeyword(generated.keyword)
        if (generated.title) setTitle(generated.title)
        if (generated.metaDescription) setMetaDesc(generated.metaDescription)
        
        toast.success("Optimizare AI completă!", { id: toastId })
        // track cost
        if (json.usage) {
          const cost = (json.usage.promptTokens / 1000000) * 0.075 + (json.usage.completionTokens / 1000000) * 0.30
          setSessionAiCost(prev => prev + cost)
          setSessionAiTokens(prev => prev + json.usage.totalTokens)
          setSessionGeneratedCount(prev => prev + 1)
        }
      }
    } catch (e: any) {
      toast.error("Eroare la optimizare AI: " + e.message, { id: toastId })
    } finally {
      setOptimizing(false)
    }
  }

  const handleAutoOptimizeFull = async () => {
    if (!editor || !keyword) return;
    setIsAutoOptimizing(true);
    const toastId = toast.loading("AI Auto-Optimizer lucrează... (poate dura până la 60s)");
    
    // Clean WPBakery shortcodes before sending to AI to save tokens and prevent hallucination
    const cleanHtml = cleanWpBakeryContent(editor.getHTML());
    
    try {
      const currentPost = wpPosts.find(p => p.id === selectedPostId);
      const focusKws = keyword.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
      const extraKws = (currentPost?.gscKeywords || []).filter((k: string) => !focusKws.includes(k.toLowerCase()));
      
      const validCounts = serpDomains.map(d => d.wordCount || 0).filter(c => c > 100);
      const avgWordCount = validCounts.length > 0 ? Math.round(validCounts.reduce((a, b) => a + b, 0) / validCounts.length) : 1500;

      const res = await fetch('/api/seo/auto-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          keyword,
          currentHtml: cleanHtml,
          missingGsc: extraKws,
          missingLsi: lsiKeywords,
          targetWordCount: avgWordCount
        })
      });
      
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      
      if (json.data?.html) {
        setOriginalHtmlForDiff(cleanHtml);
        setAiOptimizedHtml(json.data.html);
        toast.success("Optimizare completă! Revizuiește modificările.", { id: toastId });
        
        if (json.usage) {
          const cost = (json.usage.promptTokens / 1000000) * 0.075 + (json.usage.completionTokens / 1000000) * 0.30;
          setSessionAiCost(prev => prev + cost);
          setSessionAiTokens(prev => prev + json.usage.totalTokens);
          setSessionGeneratedCount(prev => prev + 1);
          setLastAutoOptimizeUsage({ tokens: json.usage.totalTokens, cost });
        } else {
          setLastAutoOptimizeUsage(null);
        }
      }
    } catch (e: any) {
      toast.error("Eroare la Auto-Optimizer: " + e.message, { id: toastId });
    } finally {
      setIsAutoOptimizing(false);
    }
  }

  const handleFixCtrAI = async (alert: any) => {
    let url = alert.page.replace(/^https?:\/\/[^\/]+/, '');
    if (!url) url = '/';
    
    const post = wpPosts.find((p: any) => {
      if (!p.link) return false;
      let pUrl = p.link.replace(/^https?:\/\/[^\/]+/, '');
      if (!pUrl) pUrl = '/';
      return pUrl === url || pUrl === url + '/' || pUrl + '/' === url;
    });
    
    if (post) {
      handleOpenEditor(post.id);
      setKeyword(alert.query);
      toast.info(`Editor deschis. Am setat focus pe "${alert.query}".`);
      
      // We can also trigger the AI generation immediately for this specific post
      setOptimizing(true);
      const tid = toast.loading("Generăm Titlu și Meta pentru CTR...");
      try {
        const contentText = post.content?.rendered?.replace(/<[^>]*>?/gm, '').substring(0, 1500) || '';
        const res = await fetch('/api/seo/generate-meta-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articles: [{ id: post.id, title: post.title?.rendered, targetKeyword: alert.query, content: contentText }] })
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error + (json.details ? ` (${json.details})` : ''));
        if (json.data && json.data[0]) {
          const generated = json.data[0];
          if (generated.title) setTitle(generated.title);
          if (generated.metaDescription) setMetaDesc(generated.metaDescription);
          toast.success("Optimizare AI completă! Verifică noul titlu și salvează.", { id: tid });
          
          if (json.usage) {
            const cost = (json.usage.promptTokens / 1000000) * 0.075 + (json.usage.completionTokens / 1000000) * 0.30;
            setSessionAiCost(prev => prev + cost);
            setSessionAiTokens(prev => prev + json.usage.totalTokens);
            setSessionGeneratedCount(prev => prev + 1);
          }
        }
      } catch(e: any) {
        toast.error("Eroare la generare: " + e.message, { id: tid });
      } finally {
        setOptimizing(false);
      }
    } else {
      toast.error("Pagina nu a fost găsită în listă.");
    }
  }

  // Bulk AI Meta Generation
  const handleBulkAI = async () => {
    setGeneratingBulk(true)
    try {
      // Pick top 5 posts missing keywords/meta for demo purposes, or all that need it
      const postsToProcess = wpPosts.slice(0, 5).map(p => ({
        id: p.id,
        title: p.title?.rendered,
        content: p.content?.rendered?.replace(/<[^>]*>?/gm, '').substring(0, 1000) // strip html, take 1000 chars
      }))

      if (postsToProcess.length === 0) {
        toast.error("Nu ai niciun articol disponibil pentru generare.")
        setGeneratingBulk(false)
        return
      }

      const res = await fetch('/api/seo/generate-meta-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles: postsToProcess })
      })
      const json = await res.json()
      
      if (json.error) {
        toast.error("Eroare API: " + json.error + (json.details ? ` (${json.details})` : ''))
        return
      }
      
      if (json.data && Array.isArray(json.data)) {
        // Here we could implement the bulk save to WP. For now, let's at least show the user the result properly.
        const successCount = json.data.length;
        const cost = json.usage ? ((json.usage.promptTokens / 1000000) * 0.075 + (json.usage.completionTokens / 1000000) * 0.30) : 0;
        const costPerArticle = successCount > 0 ? cost / successCount : 0;
        
        setSessionAiCost(prev => prev + cost);
        setSessionAiTokens(prev => prev + (json.usage?.totalTokens || 0));
        setSessionGeneratedCount(prev => prev + successCount);
        
        let usageText = "";
        if (json.usage) {
          usageText = `\n\n📊 Consum Tokeni:\n- Prompt: ${json.usage.promptTokens}\n- Generat: ${json.usage.completionTokens}\n- Total: ${json.usage.totalTokens}\n💰 Cost estimat: $${cost.toFixed(5)}`;
        }
        
        // Optionally update the local wpPosts state with the generated meta so it shows in the table
        setWpPosts(prev => prev.map(p => {
          const generated = json.data.find((g: any) => g.id === p.id);
          if (generated) {
            return {
              ...p,
              aiCost: costPerArticle,
              // We inject it into Yoast/RankMath fields so the table can read it
              yoast_head_json: {
                ...p.yoast_head_json,
                focus_kw: generated.keyword || p.yoast_head_json?.focus_kw,
                description: generated.metaDescription || p.yoast_head_json?.description,
                title: generated.title || p.yoast_head_json?.title,
              }
            }
          }
          return p;
        }))

        // Auto-save loop
        let savedCount = 0;
        for (const gen of json.data) {
          try {
            await fetch(`/api/projects/${projectId}/wp-posts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                postId: gen.id,
                meta: {
                  rank_math_focus_keyword: gen.keyword,
                  rank_math_description: gen.metaDescription,
                  rank_math_title: gen.title,
                  yoast_wpseo_focuskw: gen.keyword,
                  yoast_wpseo_metadesc: gen.metaDescription,
                  yoast_wpseo_title: gen.title,
                  _yoast_wpseo_focuskw: gen.keyword,
                  _yoast_wpseo_metadesc: gen.metaDescription,
                  _yoast_wpseo_title: gen.title,
                }
              })
            })
            savedCount++;
          } catch (e) {
            console.error("Failed to auto-save post", gen.id, e);
          }
        }
        
        toast.success(`Succes! S-au generat metadate pentru ${successCount} articole.\nS-au salvat automat ${savedCount} articole în WordPress.${usageText}`);
      }
    } catch (e: any) {
      console.error(e)
      toast.error("Eroare la conexiune: " + e.message)
    } finally {
      setGeneratingBulk(false)
    }
  }

  // Process data for table
  const enrichedPosts = useMemo(() => {
    // 1. Calculate Cannibalization
    const keywordMap: Record<string, number> = {}
    wpPosts.forEach(p => {
      // Yoast / rankmath fallback
      const kw = (p.yoast_head_json?.focus_kw || p.rank_math_focus_keyword || "").toLowerCase().trim()
      if (kw) {
        keywordMap[kw] = (keywordMap[kw] || 0) + 1
      }
    })

    return wpPosts.map(p => {
      // Category & Tags
      const terms = p._embedded?.['wp:term'] || []
      const categories = terms[0] || []
      const tags = terms[1] || []

      // Inlinks (Orphan pages logic)
      const postUrl = p.link || ""
      let inlinkCount = 0
      if (postUrl) {
        const path = new URL(postUrl).pathname
        wpPosts.forEach(other => {
          if (other.id !== p.id && other.content?.rendered?.includes(path)) {
            inlinkCount++
          }
        })
      }

      // Meta
      const kw = (p.yoast_head_json?.focus_kw || p.rank_math_focus_keyword || "").trim()
      const isCannibalized = kw && ((keywordMap[kw.toLowerCase()] || 0) > 1)
      const monthsOld = getMonthsDiff(p.modified)
      const needsRefresh = monthsOld > 6

      // GSC Metrics
      let gscMetrics = { clicks: 0, impressions: 0, position: 0 };
      if (postUrl && gscPages && p.status === 'publish') {
        try {
          const path = new URL(postUrl).pathname.replace(/\/$/, '');
          // Ignore matching root path to avoid matching homepage traffic to drafts or misconfigured posts
          if (path !== '') {
            const gscMatch = gscPages.find((gp: any) => {
              if (!gp.page) return false;
              
              // Metoda 1: Parsează ca URL
              try { 
                const gpPath = new URL(gp.page).pathname.replace(/\/$/, '');
                if (gpPath === path) return true;
              } catch(e) {
                // Metoda 2: Dacă gp.page nu e un URL valid (ex: lipsește https://)
                // verificăm dacă se termină cu path-ul nostru (ex: domain.ro/slug)
                if (gp.page.replace(/\/$/, '').endsWith(path)) return true;
              }
              return false;
            });
            
            if (p.id === wpPosts[0]?.id) {
              console.log("DEBUG GSC: gscPages length:", gscPages?.length, "path sought:", path, "gscMatch:", gscMatch);
            }
            
            if (gscMatch) {
              gscMetrics = { clicks: gscMatch.clicks, impressions: gscMatch.impressions, position: gscMatch.position };
            }
          }
        } catch(e) {}
      }

      // GSC Related Keywords
      let gscKeywords = [];
      if (postUrl && gscPageKeywords) {
        try {
          const path = new URL(postUrl).pathname.replace(/\/$/, '');
          if (path !== '') {
            gscKeywords = gscPageKeywords.filter((pk: any) => {
              try { return new URL(pk.page).pathname.replace(/\/$/, '') === path; } catch(e) { return false; }
            }).map((pk: any) => pk.query);
          }
        } catch(e) {}
      }

      // Backlinks
      let backlinksData = { backlinks: 0, referring_domains: 0, rank: 0 };
      if (postUrl && backlinksPages) {
        try {
          const path = new URL(postUrl).pathname.replace(/\/$/, '');
          if (path !== '') {
            const blMatch = backlinksPages.find((bp: any) => {
              if (!bp.url) return false;
              try { 
                const bpPath = new URL(bp.url).pathname.replace(/\/$/, '');
                if (bpPath === path) return true;
              } catch(e) {
                if (bp.url.replace(/\/$/, '').endsWith(path)) return true;
              }
              return false;
            });
            if (blMatch) {
              backlinksData = { backlinks: blMatch.backlinks, referring_domains: blMatch.referring_domains, rank: blMatch.rank };
            }
          }
        } catch(e) {}
      }

      return {
        ...p,
        categories,
        tags,
        inlinkCount,
        focusKeyword: kw,
        isCannibalized,
        needsRefresh,
        monthsOld: Math.floor(monthsOld),
        aiCost: p.aiCost || 0,
        ...gscMetrics,
        gscKeywords,
        backlinksData
      }
    })
  }, [wpPosts, gscPages, gscPageKeywords, backlinksPages])

  const sortedPosts = useMemo(() => {
    let sortable = [...enrichedPosts];
    if (tableSortConfig !== null) {
      sortable.sort((a: any, b: any) => {
        let aVal = a[tableSortConfig.key];
        let bVal = b[tableSortConfig.key];
        
        if (tableSortConfig.key === 'title') {
          aVal = a.title?.rendered || '';
          bVal = b.title?.rendered || '';
        } else if (tableSortConfig.key === 'date') {
          aVal = new Date(a.modified).getTime();
          bVal = new Date(b.modified).getTime();
        } else if (tableSortConfig.key === 'focusKeyword') {
          aVal = a.focusKeyword || '';
          bVal = b.focusKeyword || '';
        } else if (tableSortConfig.key === 'conversii') {
          let aMetrics = null;
          let bMetrics = null;
          try {
            if (a.link) aMetrics = posthogMetrics[new URL(a.link).pathname.replace(/\/$/, '') || '/'] || posthogMetrics[(new URL(a.link).pathname.replace(/\/$/, '') || '/') + '/'];
            if (b.link) bMetrics = posthogMetrics[new URL(b.link).pathname.replace(/\/$/, '') || '/'] || posthogMetrics[(new URL(b.link).pathname.replace(/\/$/, '') || '/') + '/'];
          } catch(e) {}
          
          aVal = (aMetrics?.clicks_contact || 0) + (aMetrics?.forms_submitted || 0) + (aMetrics?.avg_scroll || 0);
          bVal = (bMetrics?.clicks_contact || 0) + (bMetrics?.forms_submitted || 0) + (bMetrics?.avg_scroll || 0);
        }
        
        if (aVal < bVal) return tableSortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return tableSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortable;
  }, [enrichedPosts, tableSortConfig, posthogMetrics]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (tableSortConfig && tableSortConfig.key === key && tableSortConfig.direction === 'desc') {
      direction = 'asc';
    } else if (tableSortConfig && tableSortConfig.key === key && tableSortConfig.direction === 'asc') {
      setTableSortConfig(null);
      localStorage.removeItem('project-seo-sort-v2');
      return;
    }
    const newConfig = { key, direction };
    setTableSortConfig(newConfig);
    localStorage.setItem('project-seo-sort-v2', JSON.stringify(newConfig));
  };

  const gscCannibalized = useMemo(() => {
    if (!gscPageKeywords || gscPageKeywords.length === 0) return []
    const byQuery = new Map<string, any[]>()
    for (const pk of gscPageKeywords) {
      const q = pk.query.toLowerCase().trim()
      if (!byQuery.has(q)) byQuery.set(q, [])
      byQuery.get(q)!.push(pk)
    }
    return [...byQuery.entries()].filter(([, entries]) => entries.length >= 2 && entries.reduce((s, e) => s + e.impressions, 0) > 10)
  }, [gscPageKeywords])

  const gscLowCtrAlerts = useMemo(() => {
    if (!gscPageKeywords || gscPageKeywords.length === 0) return []
    // Top 5 position, >50 impressions, CTR < 2%
    return gscPageKeywords.filter((pk: any) => pk.position <= 5 && pk.impressions > 50 && pk.ctr < 0.02)
                          .sort((a: any, b: any) => b.impressions - a.impressions)
  }, [gscPageKeywords])
  if (!hasWpConfig) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto bg-warning/10 text-warning rounded-2xl flex items-center justify-center mb-4">
          <Settings size={28} />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Configurează Integrarea WordPress</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
          Pentru a folosi Editorul SEO cu sincronizare directă, trebuie să configurezi URL-ul site-ului și Application Passwords (generat din wp-admin) în setările proiectului.
        </p>
      </div>
    )
  }

  // --- ADS OPPORTUNITIES & GAP LOGIC ---
  const topAdsTerms = useMemo(() => {
    if (!liveKPIs?.searchTerms) return []
    // Get search terms with conversions or high clicks
    return liveKPIs.searchTerms
      .filter((t: any) => t.conversions > 0 || t.clicks > 10)
      .sort((a: any, b: any) => b.conversions - a.conversions || b.clicks - a.clicks)
  }, [liveKPIs])

  const missingArticlesForAds = useMemo(() => {
    if (!topAdsTerms.length || !wpPosts.length) return []
    const existingKeywords = wpPosts.map(p => (p.yoast_head_json?.focus_kw || p.rank_math_focus_keyword || p.title?.rendered || "").toLowerCase())
    
    return topAdsTerms.filter((term: any) => {
      const t = term.term.toLowerCase()
      // If the term is not contained in any existing focus keyword or title
      return !existingKeywords.some(ek => ek.includes(t) || t.includes(ek))
    }).slice(0, 5) // Top 5 opportunities
  }, [topAdsTerms, wpPosts])

  const contentGapTerms = useMemo(() => {
    if (viewMode !== 'editor' || !selectedPostId || !editor || !topAdsTerms.length) return []
    const currentHtml = editor.getHTML().toLowerCase()
    
    // Determine post core words for relevance filtering
    const post = wpPosts.find(p => p.id === selectedPostId)
    const postCoreWords = new Set<string>();
    if (post) {
      const titleWords = (post.title?.rendered || '').toLowerCase().split(/[\\s\\W]+/).filter((w: string) => w.length > 3)
      const keywordWords = (post.focusKeyword || '').toLowerCase().split(/[\\s\\W]+/).filter((w: string) => w.length > 3)
      
      titleWords.forEach((w: string) => postCoreWords.add(w))
      keywordWords.forEach((w: string) => postCoreWords.add(w))
      
      if (post.gscKeywords) {
        post.gscKeywords.forEach((k: string) => {
          k.toLowerCase().split(/[\\s\\W]+/).filter((w: string) => w.length > 3).forEach((w: string) => postCoreWords.add(w))
        })
      }
    }
    
    // Suggest terms that are highly profitable but completely missing from the current article body
    return topAdsTerms.filter((term: any) => {
      const t = term.term.toLowerCase()
      // Only suggest if the term has > 0 conversions to be strictly "profitable" gap
      if (term.conversions === 0 && term.clicks < 50) return false
      
      // Relevance check: The Ads term must share at least ONE significant word with the post's title/keywords
      if (postCoreWords.size > 0) {
        const termWords = t.split(/[\\s\\W]+/).filter((w: string) => w.length > 3)
        const isRelated = termWords.some((w: string) => postCoreWords.has(w))
        if (!isRelated) return false
      }
      
      return !currentHtml.includes(t)
    }).slice(0, 5)
  }, [viewMode, selectedPostId, editor?.getHTML(), topAdsTerms, wpPosts])

  const handleGenerateGapContent = async (term: string) => {
    if (!editor) return
    setAnalyzing(true)
    try {
      toast.info(`AI: Se generează un paragraf SEO pentru '${term}'...`)
      
      // Simulate API delay
      await new Promise(r => setTimeout(r, 1500))
      
      editor.commands.insertContent(`<p><strong>💡 Actualizare:</strong> Când vine vorba de <em>${term}</em>, este important să alegi o abordare profesionistă pentru cele mai bune rezultate pe termen lung.</p>`)
      
    } finally {
      setAnalyzing(false)
    }
  }

  // --- TABLE VIEW ---
  
  const networkGraphModalNode = showNetworkGraphModal && (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-background/95 p-2 sm:p-4 backdrop-blur-md">
      <div className="bg-surface rounded-xl shadow-2xl w-full h-full max-w-[98vw] max-h-[96vh] flex flex-col border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface shrink-0">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Globe className="text-emerald-500" /> Constelație Interlinkare
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Reprezentare vizuală a legăturilor interne (Health) între articole.
            </p>
          </div>
          <button 
            onClick={() => setShowNetworkGraphModal(false)}
            className="text-foreground hover:bg-muted p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 w-full bg-background relative overflow-hidden">
          <ProjectSeoNetworkGraph wpPosts={enrichedPosts} />
        </div>
      </div>
    </div>
  );

  if (viewMode === 'table') {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Global SEO Settings */}
        <div className="bg-surface rounded-xl border border-border p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Setări Target SEO</h3>
            <p className="text-xs text-muted-foreground">Selectează țara pentru a extrage metricile SEO corecte (KD, Search Volume, Gap).</p>
          </div>
          <div className="relative z-50">
            <div className="flex items-center">
              <Search size={14} className="absolute left-3 text-muted-foreground" />
              <input 
                type="text"
                value={countrySearch}
                onChange={e => {
                  setCountrySearch(e.target.value)
                  setShowCountryDropdown(true)
                }}
                onFocus={() => setShowCountryDropdown(true)}
                onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
                className="bg-background border border-border text-sm rounded-lg pl-9 pr-3 py-2 w-full sm:w-64 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="Caută țara..."
              />
            </div>
            {showCountryDropdown && (
              <div className="absolute top-full right-0 mt-1 w-full sm:w-64 max-h-64 overflow-y-auto bg-surface border border-border rounded-lg shadow-xl custom-scrollbar py-1">
                {DFS_LOCATIONS.filter(loc => loc.location_name.toLowerCase().includes(countrySearch.toLowerCase())).map((loc, idx) => (
                  <div 
                    key={`${loc.location_code}-${idx}`}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors text-foreground"
                    onMouseDown={(e) => {
                      e.preventDefault() // Prevents the input from losing focus immediately
                      setTargetLocationCode(loc.location_code)
                      setTargetLanguageCode(loc.language_code)
                      setCountrySearch(`${loc.location_name} (${loc.language_code.toUpperCase()})`)
                      setShowCountryDropdown(false)
                    }}
                  >
                    {loc.location_name} <span className="text-muted-foreground text-xs ml-1">({loc.language_code.toUpperCase()})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Competitor Gap & Keyword Discovery (DataForSEO) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-blue-500/10 to-primary/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-foreground">Content Gap Competitor</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Află pe ce cuvinte cheie rankează un concurent, dar tu nu. (Ex: domeniu.ro)
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <input 
                type="text" 
                placeholder="ex: emag.ro" 
                value={competitorDomain}
                onChange={e => setCompetitorDomain(e.target.value)}
                className="bg-surface border border-border px-3 py-2 rounded-lg text-sm w-full"
              />
              <button 
                onClick={fetchCompetitorGap}
                disabled={analyzingCompetitor || !competitorDomain}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap"
              >
                {analyzingCompetitor ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Analizează Gap
              </button>
            </div>
            
            {discoveredCompetitors.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground self-center">Sugestii:</span>
                {discoveredCompetitors.map(c => (
                  <button 
                    key={c} 
                    onClick={() => setCompetitorDomain(c)}
                    className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-1 rounded hover:bg-blue-500/20 transition"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            
            <div className="mt-3 flex flex-col gap-2">
               <button 
                 onClick={handleDiscoverCompetitors}
                 disabled={discovering}
                 className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 opacity-80 hover:opacity-100 w-fit"
               >
                 {discovering ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                 Descoperă automat competitorii site-ului meu
               </button>
               <button 
                 onClick={() => handleDiscoverSerpCompetitors()}
                 disabled={discovering}
                 className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 opacity-80 hover:opacity-100 w-fit"
               >
                 {discovering ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
                 Descoperă competitori după un cuvânt cheie (SERP)
               </button>
            </div>
            
            {gscQueries && gscQueries.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground block mb-2 flex items-center gap-1">
                  <Wand2 size={10} /> Sugestii automate din Google Search Console:
                </span>
                <div className="flex flex-wrap gap-2">
                  {gscQueries.slice(0, 8).map((q: any, i: number) => {
                    const keyword = q.keys?.[0] || q.query || ''
                    if (!keyword) return null
                    return (
                      <button 
                        key={i} 
                        onClick={() => handleDiscoverSerpCompetitors(keyword)}
                        className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-1 rounded hover:bg-emerald-500/20 transition"
                        title={`${q.impressions || 0} afișări`}
                      >
                        {keyword}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-emerald-500/10 to-primary/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-foreground">Oportunități Cuvânt Cheie</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Descoperă cuvinte cheie corelate pentru o nișă anume. (Ex: "quality control")
            </p>
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                placeholder="ex: incaltaminte piele" 
                value={targetKeyword}
                onChange={e => setTargetKeyword(e.target.value)}
                className="bg-surface border border-border px-3 py-2 rounded-lg text-sm w-full"
              />
              <button 
                onClick={fetchRelatedKeywords}
                disabled={analyzingKeyword}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50 whitespace-nowrap"
              >
                {analyzingKeyword ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Descoperă
              </button>
            </div>
          </div>
        </div>

        {/* Results for Domains/Keywords */}
        {(competitorKeywords.length > 0 || relatedKeywords.length > 0) && (
          <div className="bg-surface border border-border rounded-xl p-4 mb-6">
            <h3 className="text-sm font-bold text-foreground mb-3">Rezultate Analiză DataForSEO</h3>
            
            {(() => {
              const activeKeywords = competitorKeywords.length > 0 ? competitorKeywords : relatedKeywords
              
              const sortedKeywords = [...activeKeywords].sort((a, b) => {
                if (!sortConfig) return 0
                const aVal = a[sortConfig.key] || 0
                const bVal = b[sortConfig.key] || 0
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
                return 0
              })

              const requestSort = (key: string) => {
                let direction: 'asc' | 'desc' = 'desc'
                if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
                  direction = 'asc'
                }
                setSortConfig({ key, direction })
              }

              const SortIcon = ({ columnKey }: { columnKey: string }) => {
                if (sortConfig?.key !== columnKey) return <span className="opacity-0 group-hover:opacity-30">↕</span>
                return <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
              }

              return (
                <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar border border-border rounded-lg bg-background">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface sticky top-0 z-10">
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 font-semibold text-muted-foreground cursor-pointer group hover:text-foreground transition" onClick={() => requestSort('keyword')}>
                          Cuvânt Cheie <SortIcon columnKey="keyword" />
                        </th>
                        <th className="py-2 px-3 font-semibold text-muted-foreground cursor-pointer group hover:text-foreground transition" onClick={() => requestSort('search_volume')}>
                          Volum (SV) <SortIcon columnKey="search_volume" />
                        </th>
                        <th className="py-2 px-3 font-semibold text-muted-foreground cursor-pointer group hover:text-foreground transition" onClick={() => requestSort('keyword_difficulty')}>
                          Dificultate (KD) <SortIcon columnKey="keyword_difficulty" />
                        </th>
                        <th className="py-2 px-3 font-semibold text-muted-foreground cursor-pointer group hover:text-foreground transition" onClick={() => requestSort('cpc')}>
                          CPC ($) <SortIcon columnKey="cpc" />
                        </th>
                        <th className="py-2 px-3 font-semibold text-muted-foreground cursor-pointer group hover:text-foreground transition" onClick={() => requestSort('competition')}>
                          Competiție <SortIcon columnKey="competition" />
                        </th>
                        <th className="py-2 px-3 font-semibold text-muted-foreground text-right">Acțiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedKeywords.map((kw, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-white/[0.02]">
                          <td className="py-2 px-3 font-medium text-foreground">{kw.keyword}</td>
                          <td className="py-2 px-3 text-green-500 font-medium">{kw.search_volume}</td>
                          <td className="py-2 px-3 text-blue-500 font-medium">{kw.keyword_difficulty}</td>
                          <td className="py-2 px-3 text-muted-foreground">${Number(kw.cpc || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-muted-foreground">{kw.competition}</td>
                          <td className="py-2 px-3 text-right">
                            <button 
                              onClick={() => handleOpenGenerateModal(kw.keyword, kw.search_volume || 0, kw.keyword_difficulty || 0)}
                              className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 px-2 py-1 rounded transition flex items-center gap-1 ml-auto"
                            >
                              <Wand2 size={12} />
                              Generează Articol
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}

            <div className="mt-3 flex justify-end gap-2">
               <button onClick={() => { setCompetitorKeywords([]); setRelatedKeywords([]); }} className="text-xs text-muted-foreground hover:text-foreground">Închide rezultatele</button>
            </div>
          </div>
        )}

        {/* Ads Content Opportunities */}
        {missingArticlesForAds.length > 0 && (
          <div className="bg-gradient-to-r from-purple-500/10 to-primary/10 border border-purple-500/20 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Wand2 size={16} className="text-purple-600" />
              <h3 className="text-sm font-bold text-foreground">Oportunități Noi de Conținut (din Google Ads)</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Următorii termeni consumă buget și aduc conversii în Ads, dar nu ai articole SEO dedicate pentru ele:
            </p>
            <div className="flex flex-wrap gap-2">
              {missingArticlesForAds.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-surface border border-border px-3 py-2 rounded-lg text-xs">
                  <span className="font-semibold text-foreground">{t.term}</span>
                  <div className="flex items-center gap-1 text-[10px] text-success font-medium bg-success/10 px-1.5 py-0.5 rounded">
                    {t.conversions} conv.
                  </div>
                  <button onClick={() => handleOpenGenerateModal(t.term, 1000, 30)} className="ml-2 text-emerald-600 hover:underline font-medium flex items-center gap-1"><Wand2 size={12} /> Generează AI</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <button 
                onClick={() => setActiveSubTab('articles')}
                className={cn("text-sm font-bold pb-1 border-b-2 transition-colors", activeSubTab === 'articles' ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
              >
                Articole
              </button>
              <button 
                onClick={() => setActiveSubTab('core-pages')}
                className={cn("text-sm font-bold pb-1 border-b-2 transition-colors flex items-center gap-1.5", activeSubTab === 'core-pages' ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
              >
                Core Pages <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full uppercase">GSC</span>
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {activeSubTab === 'articles' ? 'Gestionează conținutul SEO și identifică probleme (Orphan Pages, Decay).' : 'Top pagini din site extrase direct din Google Search Console.'}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {sessionAiCost > 0 && (
              <div className="flex flex-col items-end mr-3 px-3 py-1.5 bg-success/10 rounded-lg border border-success/20">
                 <span className="text-xs font-bold text-success">Cost AI: ${sessionAiCost.toFixed(5)}</span>
                 <span className="text-[10px] text-success/80 font-medium">{sessionAiTokens} tokeni / {sessionGeneratedCount} gen.</span>
              </div>
            )}
            <button 
              onClick={fetchGoogleAdsVolumes}
              disabled={loadingAdsVolumes}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 text-orange-600 rounded-lg text-xs font-medium hover:bg-orange-500/20 transition-colors disabled:opacity-50"
            >
              {loadingAdsVolumes ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Vol. Google Ads
            </button>
            <button 
              onClick={fetchMetrics}
              disabled={loadingMetrics}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
            >
              {loadingMetrics ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Vol. DataforSEO
            </button>
            <button 
              type="button"
              onClick={handleRunBulkAutoLinker}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-colors"
            >
              <LinkIcon size={14} />
              Analiză Interlinkare
            </button>
            <button 
              type="button"
              onClick={() => {
                console.log("Click pe Rețea Interlinkare! wpPosts count:", wpPosts.length);
                setShowNetworkGraphModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors"
            >
              <Globe size={14} />
              Rețea Interlinkare
            </button>
            <button 
              onClick={handleBulkAI}
              disabled={generatingBulk}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-600 rounded-lg text-xs font-medium hover:bg-purple-500/20 transition-colors disabled:opacity-50"
            >
              {generatingBulk ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Generare Meta AI
            </button>
            <button 
              onClick={fetchPosts}
              disabled={loadingPosts}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border text-foreground rounded-lg text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loadingPosts ? "animate-spin" : ""} />
              Refresh
            </button>
            <button 
              onClick={() => handleOpenEditor(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <FileText size={14} /> Articol Nou
            </button>
          </div>
        </div>

        {activeSubTab === 'articles' && gscCannibalized.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-500" />
              <h3 className="text-sm font-bold text-red-500">Alerte Canibalizare (Google Search Console)</h3>
            </div>
            <p className="text-xs text-red-500/80 mb-3">Următoarele cuvinte cheie duc la multiple pagini concurente în Google. Acest lucru scade autoritatea și îți fragmentează traficul.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {gscCannibalized.slice(0, 6).map(([query, entries], i) => (
                <div key={i} className="bg-background/50 border border-red-500/10 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-foreground mb-1">"{query}"</p>
                  <div className="flex flex-wrap gap-1">
                    {entries.sort((a: any, b: any) => a.position - b.position).map((e: any, j: number) => (
                      <span key={j} className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-muted-foreground border border-border">
                        {e.page.replace(/^https?:\/\/[^\/]+/, '') || '/'} <span className="font-bold text-foreground">#{e.position.toFixed(0)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'articles' && gscLowCtrAlerts.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-orange-500" />
              <h3 className="text-sm font-bold text-orange-500">Alerte CTR Scăzut (Google Search Console)</h3>
            </div>
            <p className="text-xs text-orange-500/80 mb-3">Ești în Top 5 pe Google cu aceste cuvinte, dar foarte puțini oameni dau click. Ia în considerare rescrierea Meta Titlului pentru a atrage mai multe click-uri.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {gscLowCtrAlerts.slice(0, 6).map((alert: any, i: number) => (
                <div key={i} className="bg-background/50 border border-orange-500/10 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-foreground mb-1">"{alert.query}"</p>
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground mt-1">
                    <span className="font-medium text-foreground bg-surface px-1.5 py-0.5 rounded border border-border" title="CTR (Click-Through Rate)">🖱️ {(alert.ctr * 100).toFixed(1)}% CTR</span>
                    <span title="Poziție medie">📍 #{alert.position.toFixed(1)}</span>
                    <span title="Impresii totale">👀 {alert.impressions} afișări</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[10px] text-muted-foreground truncate max-w-[60%]" title={alert.page}>
                      {alert.page.replace(/^https?:\/\/[^\/]+/, '') || '/'}
                    </div>
                    <button onClick={() => handleFixCtrAI(alert)} className="flex items-center gap-1 text-[10px] bg-orange-500/20 text-orange-600 hover:bg-orange-500/30 px-2 py-1 rounded font-medium transition-colors">
                      <Wand2 size={10} /> Rezolvă cu AI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'articles' && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden">
          {loadingPosts && enrichedPosts.length === 0 ? (
            <div className="flex justify-center p-12">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                    <th className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('title')}>
                      <div className="flex items-center gap-1">Titlu / Status {tableSortConfig?.key === 'title' && (tableSortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('date')}>
                      <div className="flex items-center gap-1">Data {tableSortConfig?.key === 'date' && (tableSortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('impressions')}>
                      <div className="flex items-center gap-1">Afișări {tableSortConfig?.key === 'impressions' && (tableSortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('clicks')}>
                      <div className="flex items-center gap-1">Clicuri {tableSortConfig?.key === 'clicks' && (tableSortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('position')}>
                      <div className="flex items-center gap-1">Poziție {tableSortConfig?.key === 'position' && (tableSortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('focusKeyword')}>
                      <div className="flex items-center gap-1">Focus Keyword {tableSortConfig?.key === 'focusKeyword' && (tableSortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                    </th>
                    <th className="p-3 text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSort('inlinkCount')}>
                      <div className="flex items-center justify-center gap-1">Inlinks {tableSortConfig?.key === 'inlinkCount' && (tableSortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => handleSort('conversii')}>
                      <div className="flex items-center gap-1">Conversii PostHog {tableSortConfig?.key === 'conversii' && (tableSortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                    </th>
                    <th className="p-3">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-border">
                  {sortedPosts.map(post => {
                    let phMetrics = null;
                    if (post.link) {
                      try {
                        const path = new URL(post.link).pathname.replace(/\/$/, '') || '/';
                        phMetrics = posthogMetrics[path] || posthogMetrics[path + '/'];
                      } catch(e) {}
                    }
                    
                    return (
                    <tr key={post.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="font-medium text-primary hover:underline cursor-pointer transition-colors" 
                            onClick={() => handleOpenEditor(post.id)}
                            dangerouslySetInnerHTML={{ __html: post.title?.rendered || '(Fără titlu)' }}
                          />
                          {post.link && (
                            <a 
                              href={post.link.replace('//cms.', '//')} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title="Deschide pagina pe site"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {post.type === 'page' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20 font-bold uppercase tracking-wider" title="Landing Page Static (WordPress Page)">
                              LP
                            </span>
                          )}
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded text-white font-medium", post.status === 'publish' ? "bg-success" : "bg-warning")}>
                            {post.status}
                          </span>
                          {post.categories?.slice(0, 2).map((c: any) => (
                            <span key={c.id} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{c.name}</span>
                          ))}
                          {phMetrics && (
                            <>
                              <span className="text-[10px] text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium border border-blue-500/20" title="Afișări (Pageviews)">
                                👁️ {phMetrics.pageviews.toLocaleString()} viz.
                              </span>
                              <span className="text-[10px] text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium border border-purple-500/20" title="Vizitatori Unici (Unique Visitors)">
                                👤 {phMetrics.unique_visitors.toLocaleString()} unici
                              </span>
                              {typeof phMetrics.mobile_pct === 'number' && phMetrics.mobile_pct >= 0 && (
                                <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium border border-emerald-500/20" title="Trafic de pe Mobil">
                                  📱 {Math.round(phMetrics.mobile_pct)}% mobile
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-muted-foreground" />
                          <span className={post.needsRefresh ? "text-warning font-medium" : "text-muted-foreground"}>
                            {new Date(post.modified).toLocaleDateString('ro-RO')}
                          </span>
                        </div>
                        {post.needsRefresh && (
                          <div className="text-[10px] text-warning flex items-center gap-1 mt-1">
                            <AlertTriangle size={10} /> Decay ({post.monthsOld} luni)
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-muted-foreground">{post.impressions > 0 ? post.impressions.toLocaleString() : '-'}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-primary font-medium">{post.clicks > 0 ? post.clicks.toLocaleString() : '-'}</span>
                      </td>
                      <td className="p-3">
                        {post.position > 0 ? (
                          <span className={cn("text-xs font-bold", post.position <= 10 ? 'text-green-500' : 'text-orange-500')}>#{post.position.toFixed(1)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {post.focusKeyword && (
                          <span className={cn("inline-block px-2 py-1 rounded text-[11px] font-medium border w-max", post.isCannibalized ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-background border-border text-foreground")}>
                            {post.focusKeyword}
                          </span>
                        )}
                        {(!post.focusKeyword && (post.gscKeywords?.length === 0 || !post.gscKeywords)) && (
                          <span className="text-xs text-muted-foreground italic">Fără keyword</span>
                        )}
                        
                        {/* Display all associated keywords (Focus + GSC) */}
                        <div className="flex flex-col gap-2 mt-2">
                          {Array.from(new Set([post.focusKeyword, ...(post.gscKeywords || [])])).filter(Boolean).slice(0, 3).map((kwToDisplay: any, idx: number) => {
                            const pMetrics = keywordMetrics[kwToDisplay.toLowerCase()]
                            if (!pMetrics) return (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs font-medium">{kwToDisplay}</span>
                                <span className="text-[10px] text-muted-foreground">Fără date</span>
                              </div>
                            )
                            
                            return (
                              <div key={idx} className="flex flex-col gap-1 border-l-2 border-primary/20 pl-2">
                                <span className="text-xs font-semibold">{kwToDisplay}</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded font-medium border border-green-500/20" title="Search Volume">SV {pMetrics.sv ?? 0}</span>
                                  <span className="text-[10px] text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded font-medium border border-blue-500/20" title="Keyword Difficulty">
                                    KD <span className={cn(pMetrics.kd > 40 ? "text-destructive" : pMetrics.kd > 20 ? "text-warning" : "text-success")}>{pMetrics.kd ?? 0}</span>
                                  </span>
                                  {pMetrics.cpc > 0 && (
                                    <span className="text-[10px] text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded w-max">
                                      CPC: ${pMetrics.cpc.toFixed(2)}
                                    </span>
                                  )}
                                  {pMetrics.search_intent && pMetrics.search_intent.length > 0 && (
                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border w-max", 
                                      pMetrics.search_intent.includes('informational') ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                      pMetrics.search_intent.includes('commercial') ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                                      pMetrics.search_intent.includes('transactional') ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                      "bg-muted text-muted-foreground border-border"
                                    )}>
                                      {pMetrics.search_intent[0].toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          {(post.gscKeywords?.length || 0) > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{post.gscKeywords.length - 2} termeni GSC...</span>
                          )}
                        </div>
                        
                        {(() => {
                           if (post.status !== 'publish') return null;
                           
                           let postPath = '';
                           try {
                             postPath = new URL(post.link).pathname.replace(/\/$/, '');
                           } catch(e) {}
                           
                           if (postPath === '') return null;
                           
                           const relatedKeywords = gscPageKeywords?.filter((pk: any) => {
                             try {
                               const gscPath = new URL(pk.page).pathname.replace(/\/$/, '');
                               return gscPath === postPath;
                             } catch(e) { return false; }
                           }) || [];
                           
                           if (relatedKeywords.length === 0) return null;
                           
                           // Sort by impressions
                           const sorted = [...relatedKeywords].sort((a, b) => b.impressions - a.impressions).slice(0, 5);
                           
                           const suggestionsList = (
                             <div className="flex flex-col gap-1.5 mt-1 border-l-2 border-primary/20 pl-2">
                               <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{post.focusKeyword ? 'Alți termeni GSC' : '🪄 Sugestii GSC'}</p>
                               {sorted.map((kw: any, i: number) => (
                                 <div key={i} className="flex items-center justify-between gap-3 bg-surface border border-border/50 rounded p-1.5 hover:bg-muted/30 transition-colors group">
                                   <div className="flex flex-col">
                                     <span className="text-[11px] font-medium text-foreground">{kw.query}</span>
                                     <div className="flex items-center gap-2 mt-0.5 text-[9px] text-muted-foreground flex-wrap">
                                       <span title="Impresii">👁️ {kw.impressions.toLocaleString()}</span>
                                       <span title="Clicuri">🖱️ {kw.clicks}</span>
                                       <span title="Poziție">#️⃣ {kw.position.toFixed(1)}</span>
                                       {keywordMetrics[kw.query.toLowerCase()]?.sv_dfs !== undefined && (
                                         <span title="Volum Căutare (DataForSEO)" className="text-blue-600 bg-blue-500/10 px-1 py-0.5 rounded font-medium">
                                           SV: {keywordMetrics[kw.query.toLowerCase()]?.sv_dfs}
                                         </span>
                                       )}
                                       {keywordMetrics[kw.query.toLowerCase()]?.sv_ads !== undefined && (
                                         <span title="Volum Căutare (Google Ads)" className="text-orange-600 bg-orange-500/10 px-1 py-0.5 rounded font-medium">
                                           Ads: {keywordMetrics[kw.query.toLowerCase()]?.sv_ads}
                                         </span>
                                       )}
                                     </div>
                                   </div>
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handleSetFocusKeywordInline(post.id, kw.query); }}
                                     disabled={savingKeywordFor === post.id}
                                     className="opacity-0 group-hover:opacity-100 p-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-all disabled:opacity-50"
                                     title="Setează ca Focus Keyword"
                                   >
                                     {savingKeywordFor === post.id ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />}
                                   </button>
                                 </div>
                               ))}
                             </div>
                           );

                           if (post.focusKeyword) {
                              return (
                                <details className="mt-2 group">
                                  <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-primary transition-colors select-none list-none flex items-center gap-1 w-max">
                                    <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                                    Afișează termeni GSC
                                  </summary>
                                  <div className="flex items-center gap-1 border-l border-border pl-2 ml-2">
                                    <button
                                      onClick={() => setReadabilityActive(!readabilityActive)}
                                      className={cn(
                                        "p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                                        readabilityActive && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                                      )}
                                      title="Mod Hemingway (Evidențiază frazele greu de citit)"
                                    >
                                      <Wand2 size={16} />
                                    </button>
                                  </div>

                                  <div className="flex-1" />
                    
                                  {/* Character/Word count */}
                                  <div className="mt-2">
                                    {suggestionsList}
                                  </div>
                                </details>
                              );
                           }

                           return suggestionsList;
                        })()}
                      </td>
                      <td className="p-3 text-center">
                        <div className={cn("inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-bold", post.inlinkCount === 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                          <LinkIcon size={12} />
                          {post.inlinkCount}
                        </div>
                        {post.inlinkCount === 0 && <div className="text-[10px] text-destructive mt-1">Orphan</div>}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1.5">
                          {phMetrics ? (
                            <>
                              {(phMetrics.clicks_contact || 0) > 0 && (
                                <span className="text-[10px] text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium border border-green-500/20 w-fit" title="Click-uri pe Telefon sau WhatsApp">
                                  📞 {phMetrics.clicks_contact} Clicks Contact
                                </span>
                              )}
                              {(phMetrics.forms_submitted || 0) > 0 && (
                                <span className="text-[10px] text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium border border-orange-500/20 w-fit" title="Formulare trimise">
                                  📝 {phMetrics.forms_submitted} Formulare
                                </span>
                              )}
                              {(phMetrics.avg_scroll || 0) > 0 && (
                                <span className="text-[10px] text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium border border-blue-500/20 w-fit" title="Adâncimea medie de Scroll">
                                  📜 {Math.round(phMetrics.avg_scroll || 0)}% Scroll
                                </span>
                              )}
                              {(!phMetrics.clicks_contact && !phMetrics.forms_submitted && !phMetrics.avg_scroll) && (
                                <span className="text-[10px] text-muted-foreground italic">Nicio conversie</span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleOpenEditor(post.id)} className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg font-medium transition-colors">
                            Editează
                          </button>
                          
                          {/* Inspect button */}
                          {post.link && (
                            <button 
                              onClick={() => handleInspectUrl(post.link)}
                              disabled={inspectingUrls[post.link]}
                              className="text-xs bg-muted hover:bg-muted/80 text-foreground p-1.5 rounded-lg transition-colors disabled:opacity-50"
                              title="Inspectează în GSC"
                            >
                              {inspectingUrls[post.link] ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            </button>
                          )}
                          {/* Indexing Status Badge */}
                          {post.link && inspectionResults[post.link] && (
                            <span className={cn("text-[10px] px-1.5 py-1 rounded font-medium", inspectionResults[post.link].indexStatusResult?.verdict === 'PASS' ? "bg-success/10 text-success border border-success/20" : "bg-warning/10 text-warning border border-warning/20")} title={inspectionResults[post.link].indexStatusResult?.coverageState}>
                              {inspectionResults[post.link].indexStatusResult?.verdict === 'PASS' ? '✅' : '⚠️'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                  {enrichedPosts.length === 0 && !loadingPosts && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                        Niciun articol găsit.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}
        
        {activeSubTab === 'core-pages' && (
          <div className="bg-surface rounded-xl border border-border overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
                    <th className="p-3">URL Pagină</th>
                    <th className="p-3">Clicks</th>
                    <th className="p-3">Impresii</th>
                    <th className="p-3">CTR</th>
                    <th className="p-3">Poziție Medie</th>
                    <th className="p-3 text-right">Status Indexare</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-border">
                  {gscPages.filter((p: any) => p.page && !p.page.includes('/blog') && !p.page.includes('/articol')).slice(0, 30).map((page: any, idx: number) => {
                    const url = page.page;
                    const isInspecting = inspectingUrls[url];
                    const insRes = inspectionResults[url];
                    const isIndexed = insRes?.indexStatusResult?.verdict === 'PASS';
                    
                    return (
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3">
                          <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs block truncate max-w-[300px]" title={url}>
                            {url.replace(/^https?:\/\/[^\/]+/, '') || '/'}
                          </a>
                        </td>
                        <td className="p-3 font-medium text-success">{page.clicks}</td>
                        <td className="p-3 text-muted-foreground">{page.impressions}</td>
                        <td className="p-3 text-muted-foreground">{(page.ctr * 100).toFixed(1)}%</td>
                        <td className="p-3 font-medium text-blue-500">{page.position.toFixed(1)}</td>
                        <td className="p-3 text-right">
                          {insRes ? (
                            <span className={cn("text-[10px] px-2 py-1 rounded font-medium", isIndexed ? "bg-success/10 text-success border border-success/20" : "bg-warning/10 text-warning border border-warning/20")} title={insRes.indexStatusResult?.coverageState}>
                              {isIndexed ? '✅ Indexat' : '⚠️ ' + (insRes.indexStatusResult?.coverageState || 'Not Indexed')}
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleInspectUrl(url)}
                              disabled={isInspecting}
                              className="text-[10px] flex items-center gap-1 ml-auto bg-muted hover:bg-muted/80 text-foreground px-2 py-1 rounded transition-colors disabled:opacity-50"
                            >
                              {isInspecting ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                              Inspectează
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {gscPages.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                        Nu am găsit date în GSC sau nu e conectat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* Bulk Auto Linker Analysis Modal */}
      {showBulkAutoLinkerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border shadow-2xl rounded-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <LinkIcon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Analiză Interlinkare Bulk</h3>
                  <p className="text-sm text-muted-foreground">Scanează și aplică linkuri interne în masă pentru cele {wpPosts.length} articole.</p>
                </div>
              </div>
              <button onClick={() => setShowBulkAutoLinkerModal(false)} className="text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
              {analyzingBulkLinks ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <div className="relative">
                    <Loader2 size={64} className="animate-spin text-blue-500/20" />
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-600">
                      {bulkAnalysisProgress}%
                    </div>
                  </div>
                  <div className="w-full max-w-md">
                    <h4 className="text-lg font-semibold mb-2">Se analizează conținutul...</h4>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-3">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300 ease-out"
                        style={{ width: `${bulkAnalysisProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Scanăm toate cele {wpPosts.length} pagini și articole pentru a identifica oportunități de interlinkare pe baza dicționarului tău de cuvinte cheie.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
                      <div className="text-sm text-muted-foreground mb-1">Oportunități de Link-uri</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {bulkAutoLinkerResults.reduce((acc, curr) => acc + curr.linksAdded, 0)}
                      </div>
                    </div>
                    <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
                      <div className="text-sm text-muted-foreground mb-1">Articole Afectate</div>
                      <div className="text-2xl font-bold text-foreground">
                        {bulkAutoLinkerResults.filter(r => r.linksAdded > 0).length} / {wpPosts.length}
                      </div>
                    </div>
                    <div className="bg-surface border border-border p-4 rounded-xl shadow-sm">
                      <div className="text-sm text-muted-foreground mb-1">Articole Fără Oportunități</div>
                      <div className="text-2xl font-bold text-muted-foreground">
                        {bulkAutoLinkerResults.filter(r => r.linksAdded === 0).length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
                      <h4 className="font-semibold text-sm">Rezultate Analiză</h4>
                      <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-background px-2 py-1 rounded">
                        <input 
                          type="checkbox" 
                          checked={bulkAutoLinkerResults.filter(r => r.linksAdded > 0).every(r => r.selected)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setBulkAutoLinkerResults(prev => prev.map(r => r.linksAdded > 0 ? {...r, selected: checked} : r));
                          }}
                          className="rounded border-input text-primary focus:ring-primary/20"
                        />
                        <span className="font-medium text-xs uppercase tracking-wider">Selectează Tot</span>
                      </label>
                    </div>
                    <div className="divide-y divide-border">
                      {bulkAutoLinkerResults.filter(r => r.linksAdded > 0).map((result, idx) => (
                        <div key={result.post.id} className="p-4 hover:bg-muted/10 transition-colors flex flex-col gap-2 border-b border-border last:border-0">
                          <div className="flex items-start gap-4">
                            <input 
                              type="checkbox" 
                              checked={result.selected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setBulkAutoLinkerResults(prev => prev.map((r, i) => i === idx ? {...r, selected: checked} : r));
                              }}
                              className="mt-1 rounded border-input text-primary focus:ring-primary/20"
                            />
                            <div className="flex-1">
                              <a href={result.post.link} target="_blank" rel="noreferrer" className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                                {decodeHtmlEntity(result.post.title.rendered)}
                              </a>
                              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                <button 
                                  onClick={() => setBulkExpandedRows(prev => ({...prev, [result.post.id]: !prev[result.post.id]}))}
                                  className="bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded font-medium flex items-center gap-1 hover:bg-blue-500/20 transition-colors cursor-pointer"
                                >
                                  +{result.linksAdded} link-uri
                                  <span className="text-[10px] ml-1">{bulkExpandedRows[result.post.id] ? '▲' : '▼'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Expanded Details */}
                          {bulkExpandedRows[result.post.id] && result.addedLinks && result.addedLinks.length > 0 && (
                            <div className="ml-8 mt-2 space-y-2 bg-muted/20 p-3 rounded-lg border border-border/50 text-xs">
                              {result.addedLinks.map((link, lIdx) => (
                                <div key={lIdx} className="flex flex-col gap-1 pb-2 border-b border-border/30 last:border-0 last:pb-0">
                                  <div className="flex flex-wrap items-center gap-1 text-muted-foreground">
                                    Cuvânt: <span className="font-bold text-foreground bg-primary/10 px-1 py-0.5 rounded">"{link.keyword}"</span> 
                                    ➔ 
                                    <a href={link.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate max-w-[200px]" title={link.url}>
                                      {link.url.replace(/^https?:\/\/[^\/]+/, '') || '/'}
                                    </a>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                                    "{link.context}"
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {bulkAutoLinkerResults.filter(r => r.linksAdded > 0).length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                          <LinkIcon size={32} className="mx-auto mb-3 opacity-20" />
                          <p>Nu s-au găsit oportunități noi de interlinkare pe baza setărilor actuale.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border bg-surface flex justify-between items-center">
              <button 
                onClick={() => setShowAutoLinkerSettings(true)}
                className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-2 font-medium"
              >
                <Settings size={16} /> Setări
              </button>
              
              <button 
                onClick={handleApplyBulkLinks}
                disabled={analyzingBulkLinks || applyingBulkLinks || bulkAutoLinkerResults.filter(r => r.selected && r.linksAdded > 0).length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {applyingBulkLinks ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Se aplică în WP...
                  </>
                ) : (
                  <>
                    <LinkIcon size={16}/> Aplică Modificările ({bulkAutoLinkerResults.filter(r => r.selected && r.linksAdded > 0).length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {networkGraphModalNode}
      </div>
    )
  }

  // --- EDITOR VIEW ---
  const overallScore = analysis?.overallScore || 0
  const scoreColor = overallScore >= 80 ? "text-success border-success" : overallScore >= 50 ? "text-warning border-warning" : "text-destructive border-destructive"

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in">
      <div className="flex-1 min-w-0 space-y-4">
        {/* Editor Actions */}
        <div className="flex items-center justify-between bg-surface p-4 rounded-xl border border-border">
          <button 
            onClick={() => setViewMode('table')}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} /> Înapoi la tabel
          </button>
          
          <div className="flex items-center gap-3">
            {saveStatus && (
              <span className={cn("text-xs font-medium flex items-center gap-1", saveStatus.type === 'success' ? "text-success" : "text-destructive")}>
                {saveStatus.type === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {saveStatus.msg}
              </span>
            )}
            <button 
              onClick={() => setShowRevisions(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors border border-border relative"
            >
              <History size={16} />
              <span className="hidden sm:inline">Istoric ({revisions.length})</span>
            </button>
            <button 
              onClick={() => setShowAutoLinkerSettings(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-500/10 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-500/20 transition-colors border border-slate-500/20"
              title="Setări Auto-Linker"
            >
              <Settings size={16} />
            </button>
            <button 
              onClick={handleApplyAutoLinker}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition-colors border border-blue-500/20"
            >
              <LinkIcon size={16} />
              Auto-Link
            </button>
            <button 
              onClick={handleOptimizeAI}
              disabled={optimizing}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/10 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-500/20 disabled:opacity-50 transition-colors border border-purple-500/20"
            >
              {optimizing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              Meta AI
            </button>
            <button 
              onClick={() => {
                if (editor) {
                  const cleaned = cleanWpBakeryContent(editor.getHTML());
                  editor.commands.setContent(cleaned);
                  toast.success("Shortcodurile WPBakery au fost eliminate!");
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              <Eraser size={16} />
              Curăță WPBakery
            </button>
            <button 
              onClick={handleAutoOptimizeFull}
              disabled={isAutoOptimizing || !keyword}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-purple-500/20"
            >
              {isAutoOptimizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Auto-Optimizează cu AI
            </button>
            <div className="relative group">
              <div className={cn(
                "flex items-center bg-primary text-primary-foreground rounded-lg overflow-hidden transition-colors",
                (saving || !title) && "opacity-50 pointer-events-none"
              )}>
                <button 
                  onClick={handleSaveToWP}
                  disabled={saving || !title}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium hover:bg-primary/90"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvează
                </button>
                <div className="w-px h-5 bg-primary-foreground/30"></div>
                <button className="px-2 py-2 hover:bg-primary/90 flex items-center justify-center cursor-pointer">
                  <ChevronDown size={16} />
                </button>
              </div>
              <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
                <button
                  onClick={() => handleSaveLocalDraft(false)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <Save size={14} /> Salvează ca draft (Local)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Editor Fields */}
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">Focus Keyword</label>
              <input 
                type="text" 
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="Ex: agenție seo, reparații acoperiș..."
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              {(() => {
                const currentPost = wpPosts.find(p => p.id === selectedPostId);
                if (currentPost?.gscKeywords?.length > 0) {
                  const focusKws = keyword.split(',').map(k => k.trim().toLowerCase());
                  const extraKws = currentPost.gscKeywords.filter((k: string) => !focusKws.includes(k.toLowerCase()));
                  if (extraKws.length > 0) {
                    return (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        + {extraKws.length} termeni GSC adiționali se analizează în sidebar.
                      </div>
                    )
                  }
                }
                return null;
              })()}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">Titlu (H1 & Meta Title)</label>
              <input 
                type="text" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Titlul atrăgător al articolului..."
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 font-medium"
              />
              <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
                <span>Optim: 50-60 caractere</span>
                <span className={title.length > 60 ? "text-warning" : title.length > 0 ? "text-success" : ""}>{title.length} chars</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase mb-1">Meta Description</label>
              <textarea 
                value={metaDesc}
                onChange={e => setMetaDesc(e.target.value)}
                placeholder="Descrierea meta care va apărea în Google..."
                rows={2}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
              />
              <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
                <span>Optim: 120-160 caractere</span>
                <span className={metaDesc.length > 160 ? "text-warning" : metaDesc.length > 100 ? "text-success" : ""}>{metaDesc.length} chars</span>
              </div>
            </div>
          </div>

          {/* TipTap Toolbar */}
          {editor && (
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/30">
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn("px-2 py-1 text-xs rounded font-bold", editor.isActive('heading', { level: 2 }) ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>H2</button>
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={cn("px-2 py-1 text-xs rounded font-bold", editor.isActive('heading', { level: 3 }) ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>H3</button>
              <div className="w-px h-4 bg-border mx-1"></div>
              <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("px-2 py-1 text-xs rounded font-bold", editor.isActive('bold') ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>B</button>
              <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("px-2 py-1 text-xs rounded italic", editor.isActive('italic') ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>I</button>
              <div className="w-px h-4 bg-border mx-1"></div>
              <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn("px-2 py-1 text-xs rounded", editor.isActive('bulletList') ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50")}>List</button>
              <div className="w-px h-4 bg-border mx-1"></div>
              <button
                onClick={() => setReadabilityActive(!readabilityActive)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 text-xs rounded font-medium transition-colors ml-auto",
                  readabilityActive ? "bg-amber-100 text-amber-700 shadow-sm" : "text-muted-foreground hover:bg-background/50"
                )}
                title="Mod Hemingway (Evidențiază propozițiile lungi / greu de citit)"
              >
                <Wand2 size={12} /> Readability
              </button>
            </div>
          )}

          <div className="min-h-[400px] p-4 prose prose-sm dark:prose-invert max-w-none focus:outline-none tiptap-editor">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {/* SEO Sidebar */}
      <div className="w-full lg:w-[340px] flex-shrink-0 space-y-4">
        {/* Content Gap from Ads */}
        {contentGapTerms.length > 0 && (
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20 rounded-xl p-4">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
              <Search size={14} className="text-blue-500" />
              🎯 Termeni Lipsă (Ads Gap)
            </h3>
            <p className="text-[10px] text-muted-foreground mb-3 leading-tight">
              Acești termeni aduc conversii în Ads, dar lipsesc cu desăvârșire din textul de mai stânga.
            </p>
            <div className="space-y-2">
              {contentGapTerms.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-surface/50 border border-border/50 p-2 rounded-lg text-xs">
                  <span className="font-medium text-foreground truncate max-w-[140px]" title={t.term}>{t.term}</span>
                  <button 
                    onClick={() => handleGenerateGapContent(t.term)}
                    className="text-[10px] bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 px-2 py-1 rounded font-medium transition-colors"
                  >
                    + Adaugă
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface rounded-xl border border-border p-5 text-center relative overflow-hidden">
          {analyzing && (
            <div className="absolute top-2 right-2">
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
            </div>
          )}
          <h3 className="text-sm font-semibold text-foreground mb-4">Scor SEO</h3>
          <div className={cn("w-24 h-24 mx-auto rounded-full border-4 flex items-center justify-center mb-3", scoreColor)}>
            <span className="text-3xl font-bold">{overallScore}</span>
            <span className="text-xs ml-1 mt-2 text-muted-foreground">/100</span>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="text-center">
              <span className="block text-xs text-muted-foreground uppercase">Cuvinte</span>
              <span className="font-semibold text-foreground">{analysis?.wordCount || 0}</span>
            </div>
            <div className="text-center">
              <span className="block text-xs text-muted-foreground uppercase">Timp Citire</span>
              <span className="font-semibold text-foreground">{analysis?.readingTimeMin || 0} min</span>
            </div>
          </div>
        </div>

        {(() => {
          const currentPost = enrichedPosts.find(p => p.id === selectedPostId);
          const focusKws = keyword.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
          const extraKws = (currentPost?.gscKeywords || []).filter((k: string) => !focusKws.includes(k.toLowerCase()));
          
          return (
            <div className="bg-surface rounded-xl border border-border p-4 text-sm">
              <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Search size={14} className="text-primary" />
                Cuvinte Cheie Analizate
              </h3>
              
              {(extraKws.length > 0 || focusKws.length > 0) ? (
                <div className="flex flex-wrap gap-1.5">
                  {focusKws.map((kw: string) => (
                    <button 
                      key={kw} 
                      onClick={() => {
                        const currentWords = keyword.split(',').map(k => k.trim()).filter(Boolean);
                        setKeyword(currentWords.filter(k => k.toLowerCase() !== kw.toLowerCase()).join(', '));
                      }}
                      title="Elimină din Focus Keyword"
                      className="px-2 py-0.5 bg-primary/20 text-primary rounded-md text-[11px] font-bold border border-primary/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer"
                    >
                      {kw} (Focus) ✕
                    </button>
                  ))}
                  {extraKws.slice(0, 15).map((kw: string) => (
                    <button 
                      key={kw} 
                      onClick={() => {
                        const currentWords = keyword.split(',').map(k => k.trim()).filter(Boolean);
                        if (!currentWords.includes(kw)) {
                          setKeyword([...currentWords, kw].join(', '));
                        }
                      }}
                      title="Setează ca Focus Keyword"
                      className="px-2 py-0.5 bg-muted text-muted-foreground rounded-md text-[11px] font-medium border border-border hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
                    >
                      {kw} +
                    </button>
                  ))}
                  {extraKws.length > 15 && (
                    <span className="px-2 py-0.5 text-muted-foreground text-[11px] font-medium">
                      +{extraKws.length - 15} termeni GSC
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground p-2 bg-muted/30 rounded border border-dashed border-border/50 text-center">
                  Niciun cuvânt cheie principal setat manual, și niciun cuvânt din GSC detectat pentru acest URL. Analiza SEO se face doar pe baza structurii.
                </div>
              )}

              {/* LSI Keywords Section */}
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Wand2 size={12} className="text-primary" /> Termeni Semantici (LSI)
                  </h4>
                  <button 
                    onClick={fetchLsiKeywords} 
                    disabled={loadingLsi || !keyword}
                    className="text-[10px] text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
                  >
                    {loadingLsi ? <Loader2 size={10} className="animate-spin" /> : null}
                    {lsiKeywords.length > 0 ? "Regenerează" : "Generează LSI"}
                  </button>
                </div>
                
                {lsiKeywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {lsiKeywords.map((kw: string) => {
                      const textLower = editor?.getText().toLowerCase() || "";
                      const found = textLower.includes(kw.toLowerCase());
                      return (
                        <span 
                          key={kw} 
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-medium border",
                            found 
                              ? "bg-success/20 text-success border-success/30 line-through opacity-70" 
                              : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {kw} {found && "✓"}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground italic">
                    Apasă "Generează LSI" pentru a găsi termeni asociați din Google recomandati pentru cuvântul tău cheie.
                  </div>
                )}
              </div>

              {/* SERP Benchmark Section */}
              <div className="mt-4 pt-3 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                    <Globe size={12} className="text-primary" /> Analiză SERP (Top 10)
                  </h4>
                  <button 
                    onClick={fetchSerpBenchmark} 
                    disabled={loadingSerp || !keyword}
                    className="text-[10px] text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
                  >
                    {loadingSerp ? <Loader2 size={10} className="animate-spin" /> : null}
                    {serpDomains.length > 0 ? "Re-Analizează" : "Benchmark"}
                  </button>
                </div>
                
                {serpDomains.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {(() => {
                      const validCounts = serpDomains.map(d => d.wordCount || 0).filter(c => c > 100);
                      const avgWordCount = validCounts.length > 0 ? Math.round(validCounts.reduce((a, b) => a + b, 0) / validCounts.length) : 1500;
                      
                      return (
                        <div className="bg-muted p-2 rounded-md text-[10px] space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Medie cuvinte competitori:</span>
                            <span className="font-semibold text-foreground">~{avgWordCount.toLocaleString('en-US')}</span>
                          </div>
                          <div className="flex justify-between border-t border-border/50 pt-1 mt-1">
                            <span className="text-muted-foreground">Starea ta:</span>
                            <span className={cn("font-bold", analysis?.wordCount >= avgWordCount ? "text-success" : "text-amber-500")}>
                              {analysis?.wordCount || 0} cuvinte
                            </span>
                          </div>
                        </div>
                      )
                    })()}
                    <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      <div className="text-[10px] font-medium text-muted-foreground mb-1 sticky top-0 bg-background/95 py-1 z-10">
                        Top Domenii în Google:
                      </div>
                      {serpDomains.map((item, idx) => {
                        const isString = typeof item === 'string';
                        const domainStr = isString ? item : item.domain;
                        const urlStr = isString ? `https://${item}` : (item.url || `https://${item.domain}`);
                        const titleStr = isString ? domainStr : (item.title || domainStr);
                        const descStr = !isString ? item.description : null;
                        const rank = !isString ? item.rank : idx + 1;
                        
                        return (
                          <div key={domainStr} className="bg-surface border border-border rounded p-2 flex flex-col gap-1 relative overflow-hidden group hover:border-primary/50 transition-colors">
                            <div className="absolute top-0 right-0 bg-muted text-[9px] font-bold px-1.5 py-0.5 rounded-bl text-muted-foreground">
                              #{rank}
                            </div>
                            <a 
                              href={urlStr.startsWith('http') ? urlStr : `https://${urlStr}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[11px] font-semibold text-primary hover:underline line-clamp-1 pr-6"
                              title={titleStr}
                            >
                              {titleStr}
                            </a>
                            <div className="flex items-center gap-2 text-[9px] text-muted-foreground mt-1">
                              <div className="flex items-center gap-1">
                                <Globe size={10} />
                                <span className="truncate max-w-[120px]">{domainStr}</span>
                              </div>
                              {!isString && item.wordCount > 0 && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-background rounded border border-border">
                                  <FileText size={8} />
                                  <span>{item.wordCount} cuvinte</span>
                                </div>
                              )}
                            </div>
                            {descStr && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                                {descStr}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground italic">
                    Apasă "Benchmark" pentru a vedea cu cine concurezi în prima pagină Google.
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        <div className="bg-surface rounded-xl border border-border p-0 overflow-hidden flex flex-col max-h-[600px]">
          <div className="p-4 border-b border-border bg-muted/10">
            <h3 className="text-sm font-semibold text-foreground">Checklist Optimizare</h3>
          </div>
          <div className="p-4 overflow-y-auto flex-1 space-y-3">
            {analysis?.issues?.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 size={24} className="mx-auto mb-2 text-success" />
                <p className="text-sm">Totul arată excelent!</p>
              </div>
            ) : (
              analysis?.issues?.map((issue: any, idx: number) => {
                const Icon = issue.severity === 'error' ? XCircle : issue.severity === 'warning' ? AlertTriangle : issue.severity === 'success' ? CheckCircle2 : Info
                const color = issue.severity === 'error' ? 'text-destructive bg-destructive/10 border-destructive/20' : 
                              issue.severity === 'warning' ? 'text-warning bg-warning/10 border-warning/20' : 
                              issue.severity === 'success' ? 'text-success bg-success/10 border-success/20' : 
                              'text-info bg-info/10 border-info/20'
                
                return (
                  <div key={idx} className={cn("p-3 rounded-lg border text-sm flex gap-2.5", color)}>
                    <Icon size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-foreground mb-1 leading-tight">{issue.message}</p>
                      {issue.fix && <p className="text-[11px] opacity-80">{issue.fix}</p>}
                    </div>
                  </div>
                )
              })
            )}
            
            {!analysis && !analyzing && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Începe să scrii pentru a vedea analiza.
              </div>
            )}
          </div>
        </div>

        {analysis?.keywordDensity?.length > 0 && (
          <div className="bg-surface rounded-xl border border-border p-4">
            <h3 className="text-xs font-semibold text-foreground uppercase mb-3">Densitate Cuvinte (Top 5)</h3>
            <div className="space-y-2">
              {analysis.keywordDensity.slice(0, 5).map((kw: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{kw.word}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{kw.count}x</span>
                    <span className={cn("font-medium", kw.density > 3 ? "text-warning" : "text-success")}>{kw.density}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generate Article Modal */}
      {generateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-border shadow-2xl rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2"><Wand2 className="text-emerald-500"/> Generează Articol Pillar</h3>
              <button onClick={() => setGenerateModal(null)} className="text-muted-foreground hover:text-foreground">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-background p-3 rounded-lg border border-border text-sm">
                <p><strong>Cuvânt Cheie:</strong> {generateModal.keyword}</p>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>SV: <strong className="text-green-500">{generateModal.sv}</strong></span>
                  <span>KD: <strong className="text-blue-500">{generateModal.kd}</strong></span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Lungime Recomandată (cuvinte)</label>
                <p className="text-xs text-muted-foreground mb-2">Am calculat automat lungimea ideală bazată pe dificultate și volum.</p>
                <input 
                  type="number" 
                  value={articleLengthInput}
                  onChange={e => setArticleLengthInput(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  min="300"
                  max="4000"
                />
              </div>

              {!hasWpConfig && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <p>Nu ai configurat conexiunea WordPress în setările proiectului. Articolul nu va putea fi salvat.</p>
                </div>
              )}

              {generateError && (
                <div className="text-red-500 text-sm">{generateError}</div>
              )}

              <button 
                onClick={handleGenerateArticle}
                disabled={generatingArticle || !hasWpConfig}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {generatingArticle ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                {generatingArticle ? 'Se generează (durează ~30s)...' : 'Confirmă & Generează'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Revisions Sidebar/Modal */}
      {showRevisions && (
        <DiffViewerModal
          revisions={revisions}
          currentContent={editor?.getHTML() || ''}
          currentTitle={title}
          onClose={() => setShowRevisions(false)}
          onRestore={(rev) => {
            if (confirm('Ești sigur? Această acțiune va înlocui conținutul curent din editor cu versiunea selectată.')) {
              editor?.commands.setContent(rev.content);
              if (rev.title) setTitle(rev.title);
              if (rev.metaDesc) setMetaDesc(rev.metaDesc);
              setShowRevisions(false);
              toast.success('Versiune restaurată cu succes!');
            }
          }}
        />
      )}

      {/* AI Side-by-Side Diff Modal */}
      {aiOptimizedHtml !== null && originalHtmlForDiff !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="w-full max-w-7xl h-[90vh] bg-surface border border-border shadow-2xl flex flex-col rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="text-purple-500" size={18} />
                Revizuire Optimizare AI
                {lastAutoOptimizeUsage && (
                  <span className="ml-4 text-xs font-medium px-2 py-1 bg-purple-500/10 text-purple-500 rounded-full border border-purple-500/20">
                    Cost: ${lastAutoOptimizeUsage.cost.toFixed(4)} ({lastAutoOptimizeUsage.tokens.toLocaleString()} tokens)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setAiOptimizedHtml(null)
                    setOriginalHtmlForDiff(null)
                    setLastAutoOptimizeUsage(null)
                  }}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Anulează
                </button>
                <button 
                  onClick={() => {
                    editor?.commands.setContent(aiOptimizedHtml);
                    setAiOptimizedHtml(null);
                    setOriginalHtmlForDiff(null);
                    setLastAutoOptimizeUsage(null);
                    toast.success("Modificările AI au fost acceptate și aplicate!");
                  }}
                  className="px-4 py-2 bg-success text-success-foreground rounded-md text-sm font-medium hover:opacity-90 transition-colors flex items-center gap-1.5"
                >
                  <Check size={16} />
                  Acceptă Modificările
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              <style>{`
                mark.ai-added {
                  background-color: rgba(168, 85, 247, 0.25);
                  color: inherit;
                  padding: 0.125rem 0.25rem;
                  border-radius: 0.25rem;
                }
              `}</style>
              <div className="flex-1 border-r border-border flex flex-col overflow-hidden">
                <div className="bg-muted/30 text-muted-foreground text-xs font-semibold uppercase tracking-wider p-2 border-b border-border text-center">
                  Articol Original ({getWordCount(originalHtmlForDiff)} cuvinte)
                </div>
                <div className="flex-1 overflow-y-auto p-6 prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed" dangerouslySetInnerHTML={{__html: originalHtmlForDiff}} />
              </div>
              <div className="flex-1 flex flex-col overflow-hidden bg-purple-500/5">
                <div className="bg-purple-500/10 text-purple-600 text-xs font-semibold uppercase tracking-wider p-2 border-b border-border text-center flex items-center justify-center gap-2">
                  <Wand2 size={12} />
                  Versiune Optimizată (AI) ({getWordCount(aiOptimizedHtml)} cuvinte)
                </div>
                <div className="flex-1 overflow-y-auto p-6 prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed marker:text-purple-500" dangerouslySetInnerHTML={{__html: aiOptimizedHtml}} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto Linker Modal */}
      {showAutoLinkerSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border shadow-2xl rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-bold flex items-center gap-2"><Settings className="text-blue-500" size={20} /> Setări Auto-Linker</h3>
              <button onClick={() => setShowAutoLinkerSettings(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Max Links per Post</label>
                  <input type="number" min="0" value={autoLinkerConfig.maxLinksPerPost} onChange={(e) => setAutoLinkerConfig({...autoLinkerConfig, maxLinksPerPost: parseInt(e.target.value)||0})} className="w-full border border-input rounded-md px-2 py-1 text-sm bg-background" />
                  <p className="text-[10px] text-muted-foreground mt-1">0 = nelimitat</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Max Links per Keyword</label>
                  <input type="number" min="0" value={autoLinkerConfig.maxLinksPerKeyword} onChange={(e) => setAutoLinkerConfig({...autoLinkerConfig, maxLinksPerKeyword: parseInt(e.target.value)||0})} className="w-full border border-input rounded-md px-2 py-1 text-sm bg-background" />
                  <p className="text-[10px] text-muted-foreground mt-1">0 = nelimitat</p>
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={autoLinkerConfig.excludeHeadings} onChange={(e) => setAutoLinkerConfig({...autoLinkerConfig, excludeHeadings: e.target.checked})} className="rounded border-input text-primary focus:ring-primary/20" />
                  <span>Exclude Titlurile (H1-H6)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={autoLinkerConfig.caseSensitive} onChange={(e) => setAutoLinkerConfig({...autoLinkerConfig, caseSensitive: e.target.checked})} className="rounded border-input text-primary focus:ring-primary/20" />
                  <span>Case Sensitive (ține cont de litere mari/mici)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={autoLinkerConfig.autoLinkOtherPosts} onChange={(e) => setAutoLinkerConfig({...autoLinkerConfig, autoLinkOtherPosts: e.target.checked})} className="rounded border-input text-primary focus:ring-primary/20" />
                  <span>Leagă automat articolele din proiect</span>
                </label>
                {networkGraphModalNode}
              </div>
            </div>
            <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
              <button onClick={handleSaveAutoLinkerConfig} className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
                <Save size={16}/> Salvează
              </button>
            </div>
          </div>
        </div>
      )}

      {networkGraphModalNode}
    </div>
  )
}

