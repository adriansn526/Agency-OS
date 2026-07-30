import React, { useState, useMemo, useRef } from 'react';
import * as Diff from 'diff';
import { X, History, ArrowRightLeft, Check, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Revision {
  timestamp: number;
  content: string;
  title: string;
  metaDesc: string;
  keyword?: string;
}

interface DiffViewerModalProps {
  revisions: Revision[];
  currentContent: string;
  currentTitle: string;
  onClose: () => void;
  onRestore: (rev: Revision) => void;
}

export function DiffViewerModal({ revisions, currentContent, currentTitle, onClose, onRestore }: DiffViewerModalProps) {
  const allVersions = useMemo(() => {
    return [
      { timestamp: Date.now(), content: currentContent, title: currentTitle, metaDesc: '', isCurrent: true },
      ...revisions
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [revisions, currentContent, currentTitle]);

  const [compareIdx, setCompareIdx] = useState(Math.max(0, allVersions.length - 2));

  const oldVer = allVersions[compareIdx];
  const newVer = allVersions[compareIdx + 1] || allVersions[compareIdx];

  const { leftHtml, rightHtml } = useMemo(() => {
    if (!oldVer || !newVer) return { leftHtml: '', rightHtml: '' };

    const tokenizeHtml = (html: string) => {
      // Split by HTML tags or whitespace to get word-level tokens while preserving tags
      return html.split(/(<[^>]+>|\s+)/).filter(Boolean);
    };

    const oldTokens = tokenizeHtml(oldVer.content || '');
    const newTokens = tokenizeHtml(newVer.content || '');

    const diffResult = Diff.diffArrays(oldTokens, newTokens);

    let left = '';
    let right = '';

    diffResult.forEach(part => {
      // Build Left HTML (Old Version)
      if (!part.added) {
        part.value.forEach(token => {
          if (token.startsWith('<') && token.endsWith('>')) {
            left += token;
          } else {
            if (part.removed && token.trim()) {
              left += `<span class="bg-red-500/30 text-red-700 line-through rounded px-1">${token}</span>`;
            } else {
              left += token;
            }
          }
        });
      }

      // Build Right HTML (New Version)
      if (!part.removed) {
        part.value.forEach(token => {
          if (token.startsWith('<') && token.endsWith('>')) {
            right += token;
          } else {
            if (part.added && token.trim()) {
              right += `<span class="bg-emerald-500/30 text-emerald-700 rounded px-1">${token}</span>`;
            } else {
              right += token;
            }
          }
        });
      }
    });

    return { leftHtml: left, rightHtml: right };
  }, [oldVer, newVer]);

  // Synced Scrolling
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement | null>) => {
    if (targetRef.current) {
      targetRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
      <div className="flex-none p-4 border-b border-border flex items-center justify-between bg-surface shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground leading-tight">Compară Versiuni</h2>
            <p className="text-xs text-muted-foreground">Trage de slider pentru a naviga prin istoric</p>
          </div>
        </div>
        
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex-none p-6 bg-muted/30 border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button 
            disabled={compareIdx === 0}
            onClick={() => setCompareIdx(p => Math.max(0, p - 1))}
            className="p-2 bg-surface border border-border rounded-lg disabled:opacity-50 hover:bg-muted"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex-1">
            <input 
              type="range" 
              min={0} 
              max={Math.max(0, allVersions.length - 2)} 
              value={compareIdx}
              onChange={(e) => setCompareIdx(parseInt(e.target.value))}
              className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between mt-2 px-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cea mai veche</span>
              <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Mai recent</span>
            </div>
          </div>

          <button 
            disabled={compareIdx >= allVersions.length - 2}
            onClick={() => setCompareIdx(p => Math.min(allVersions.length - 2, p + 1))}
            className="p-2 bg-surface border border-border rounded-lg disabled:opacity-50 hover:bg-muted"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-2 gap-px bg-border">
        <div className="bg-surface flex flex-col h-full min-h-0 tiptap-editor">
          <div className="flex-none p-3 bg-red-500/5 border-b border-red-500/10 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Șters</span>
              <div className="text-sm font-semibold text-foreground mt-1">
                {oldVer && new Date(oldVer.timestamp).toLocaleString('ro-RO', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
            </div>
          </div>
          <div 
            ref={leftScrollRef}
            onScroll={(e) => handleScroll(e, rightScrollRef)}
            className="flex-1 overflow-y-auto p-6 custom-scrollbar text-sm leading-relaxed text-muted-foreground ProseMirror max-w-none"
            dangerouslySetInnerHTML={{ __html: leftHtml }}
          />
        </div>

        <div className="bg-surface flex flex-col h-full relative min-h-0 tiptap-editor">
          <div className="flex-none p-3 bg-emerald-500/5 border-b border-emerald-500/10 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Adăugat</span>
              <div className="text-sm font-semibold text-foreground mt-1 flex items-center gap-2">
                {newVer && new Date(newVer.timestamp).toLocaleString('ro-RO', { dateStyle: 'medium', timeStyle: 'short' })}
                {newVer && (newVer as any).isCurrent && <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">Editor Curent</span>}
              </div>
            </div>
            
            {newVer && !(newVer as any).isCurrent && (
              <button 
                onClick={() => onRestore(newVer as any)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
              >
                <RefreshCw size={14} />
                Restaurează Această Versiune
              </button>
            )}
          </div>
          <div 
            ref={rightScrollRef}
            onScroll={(e) => handleScroll(e, leftScrollRef)}
            className="flex-1 overflow-y-auto p-6 custom-scrollbar text-sm leading-relaxed text-foreground ProseMirror max-w-none"
            dangerouslySetInnerHTML={{ __html: rightHtml }}
          />
        </div>
      </div>
    </div>
  );
}
