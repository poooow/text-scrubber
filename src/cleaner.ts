import type { ScrubberSettings } from './settings'
import { detectAndConvertLists } from './list-detector'
import { unwrap } from './dom-utils'

export function cleanMsWordHtml(html: string, settings: ScrubberSettings): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Remove comments
  const removeComments = (node: Node) => {
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const child = node.childNodes[i]
      if (child.nodeType === Node.COMMENT_NODE) {
        node.removeChild(child)
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        removeComments(child)
      }
    }
  }
  removeComments(doc.body)

  // Remove all visual/styling attributes
  const elements = doc.body.getElementsByTagName('*')
  // We iterate backwards when modifying collections or unwrapping
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i]
    
    // Always strip these
    el.removeAttribute('class')
    el.removeAttribute('id')
    el.removeAttribute('lang')
    el.removeAttribute('dir')
    if (!settings.alignment) {
      el.removeAttribute('align')
    }
    
    // Process style attribute conditionally
    const styleStr = el.getAttribute('style')
    if (styleStr) {
      const newStyles: string[] = []
      const styles = styleStr.split(';').map(s => s.trim()).filter(Boolean)
      for (const s of styles) {
        const parts = s.split(':')
        if (parts.length < 2) continue
        const prop = parts[0].trim().toLowerCase()
        const val = parts.slice(1).join(':').trim()
        
        if (settings.colors && (prop === 'color' || prop === 'background' || prop === 'background-color')) {
          newStyles.push(`${prop}: ${val}`)
        }
        if (settings.fonts && (prop === 'font-family' || prop === 'font-size' || prop === 'font-weight' || prop === 'font-style')) {
          newStyles.push(`${prop}: ${val}`)
        }
        if (settings.alignment && prop === 'text-align') {
          newStyles.push(`${prop}: ${val}`)
        }
      }
      
      if (newStyles.length > 0) {
        el.setAttribute('style', newStyles.join('; '))
      } else {
        el.removeAttribute('style')
      }
    }
    
    const tagName = el.tagName.toLowerCase()

    // MS Word specifically uses o:p tags
    if (tagName === 'o:p') {
      unwrap(el)
      continue
    }
    
    // Empty paragraphs from word
    if (tagName === 'p' && el.innerHTML.trim() === '&nbsp;') {
      el.innerHTML = ''
    }

    // Apply conditional unwrapping based on settings

    // Bold
    if (!settings.bold && (tagName === 'b' || tagName === 'strong')) {
      unwrap(el)
      continue
    }

    // Italic
    if (!settings.italic && (tagName === 'i' || tagName === 'em')) {
      unwrap(el)
      continue
    }

    // Links
    if (!settings.links && tagName === 'a') {
      unwrap(el)
      continue
    }

    // Lists (We convert lists to paragraphs if lists are disabled)
    if (!settings.lists && (tagName === 'ul' || tagName === 'ol')) {
      unwrap(el)
      continue
    }
    if (!settings.lists && tagName === 'li') {
      const p = doc.createElement('p')
      p.innerHTML = el.innerHTML
      el.parentNode?.replaceChild(p, el)
      continue
    }

    // Headings (convert to paragraph if disabled)
    if (!settings.headings && /^h[1-6]$/.test(tagName)) {
      const p = doc.createElement('p')
      p.innerHTML = el.innerHTML
      el.parentNode?.replaceChild(p, el)
      continue
    }

    // Tables (extract all cells as paragraphs if disabled)
    if (!settings.tables) {
      if (tagName === 'table' || tagName === 'tbody' || tagName === 'thead' || tagName === 'tr') {
        unwrap(el)
        continue
      }
      if (tagName === 'td' || tagName === 'th') {
        const p = doc.createElement('p')
        p.innerHTML = el.innerHTML
        el.parentNode?.replaceChild(p, el)
        continue
      }
    }
  }

  if (settings.detectLists) {
    detectAndConvertLists(doc.body, doc)
  }

  // Remove empty inline tags that might have been left behind
  const inlineTags = ['b', 'strong', 'i', 'em', 'span', 'a']
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i]
    if (inlineTags.includes(el.tagName.toLowerCase()) && el.innerHTML.trim() === '') {
      el.parentNode?.removeChild(el)
    }
    // Unwrap meaningless spans
    if (el.tagName.toLowerCase() === 'span' && el.attributes.length === 0) {
      unwrap(el)
    }
  }

  return doc.body.innerHTML
}
