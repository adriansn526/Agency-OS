import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Node as ProsemirrorNode } from '@tiptap/pm/model'

export interface ReadabilityOptions {
  active: boolean
}

export const ReadabilityExtension = Extension.create<ReadabilityOptions>({
  name: 'readability',

  addOptions() {
    return {
      active: false,
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('readability'),
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, oldState) => {
            if (!this.options.active) {
              return DecorationSet.empty
            }
            
            // Only recompute if doc changed or plugin was just activated
            if (!tr.docChanged && !tr.getMeta('readability-toggled')) {
              return oldState.map(tr.mapping, tr.doc)
            }

            const decorations: Decoration[] = []
            
            tr.doc.descendants((node: ProsemirrorNode, pos: number) => {
              if (node.isTextblock) {
                const text = node.textContent
                // Simple sentence splitting (rough approximation)
                // Using regex that captures trailing spaces to keep positions accurate
                const sentenceRegex = /[^.!?]+[.!?]*\s*/g
                let match
                let currentPos = pos + 1
                
                while ((match = sentenceRegex.exec(text)) !== null) {
                  const sentence = match[0]
                  const wordsCount = sentence.split(/\s+/).filter(w => w.trim().length > 0).length
                  const sentenceLength = sentence.length
                  
                  if (wordsCount >= 20) {
                    let className = 'bg-yellow-200/50 border-b border-yellow-400'
                    if (wordsCount >= 30) {
                      className = 'bg-red-200/50 border-b border-red-400'
                    }
                    
                    decorations.push(
                      Decoration.inline(currentPos, currentPos + sentenceLength, {
                        class: className,
                        title: `${wordsCount} cuvinte - propoziție greu de citit`
                      })
                    )
                  }
                  currentPos += sentenceLength
                }
              }
            })

            return DecorationSet.create(tr.doc, decorations)
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})
