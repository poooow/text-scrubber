import './style.css'

// 1. Elements
const richInput = document.getElementById('rich-input') as HTMLDivElement
const htmlOutput = document.getElementById('html-output') as HTMLDivElement
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement

// Settings elements
const settings = {
  bold: document.getElementById('setting-bold') as HTMLInputElement,
  italic: document.getElementById('setting-italic') as HTMLInputElement,
  links: document.getElementById('setting-links') as HTMLInputElement,
  lists: document.getElementById('setting-lists') as HTMLInputElement,
  headings: document.getElementById('setting-headings') as HTMLInputElement,
  tables: document.getElementById('setting-tables') as HTMLInputElement,
  colors: document.getElementById('setting-colors') as HTMLInputElement,
  fonts: document.getElementById('setting-fonts') as HTMLInputElement,
  alignment: document.getElementById('setting-alignment') as HTMLInputElement,
}

// 2. LocalStorage for Settings
const SETTINGS_KEY = 'text-scrubber-settings'

function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      for (const [key, el] of Object.entries(settings)) {
        if (typeof parsed[key] === 'boolean') {
          el.checked = parsed[key]
        }
      }
    } catch (e) {
      console.error('Chyba při načítání nastavení', e)
    }
  }
}

function saveSettings() {
  const current: Record<string, boolean> = {}
  for (const [key, el] of Object.entries(settings)) {
    current[key] = el.checked
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(current))
  processInput()
}

for (const el of Object.values(settings)) {
  el.addEventListener('change', saveSettings)
}
loadSettings()

// Helper to unwrap an element (replace element with its children)
function unwrap(el: Element) {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el)
  }
  parent.removeChild(el)
}

// 3. Clean HTML Logic
function cleanMsWordHtml(html: string): string {
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
    if (!settings.alignment.checked) {
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
        
        if (settings.colors.checked && (prop === 'color' || prop === 'background' || prop === 'background-color')) {
          newStyles.push(`${prop}: ${val}`)
        }
        if (settings.fonts.checked && (prop === 'font-family' || prop === 'font-size' || prop === 'font-weight' || prop === 'font-style')) {
          newStyles.push(`${prop}: ${val}`)
        }
        if (settings.alignment.checked && prop === 'text-align') {
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
    if (!settings.bold.checked && (tagName === 'b' || tagName === 'strong')) {
      unwrap(el)
      continue
    }

    // Italic
    if (!settings.italic.checked && (tagName === 'i' || tagName === 'em')) {
      unwrap(el)
      continue
    }

    // Links
    if (!settings.links.checked && tagName === 'a') {
      unwrap(el)
      continue
    }

    // Lists (We convert lists to paragraphs if lists are disabled)
    if (!settings.lists.checked && (tagName === 'ul' || tagName === 'ol')) {
      unwrap(el)
      continue
    }
    if (!settings.lists.checked && tagName === 'li') {
      const p = doc.createElement('p')
      p.innerHTML = el.innerHTML
      el.parentNode?.replaceChild(p, el)
      continue
    }

    // Headings (convert to paragraph if disabled)
    if (!settings.headings.checked && /^h[1-6]$/.test(tagName)) {
      const p = doc.createElement('p')
      p.innerHTML = el.innerHTML
      el.parentNode?.replaceChild(p, el)
      continue
    }

    // Tables (extract all cells as paragraphs if disabled)
    if (!settings.tables.checked) {
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

// 4. Process Input
function processInput() {
  const html = richInput.innerHTML
  if (!html.trim()) {
    htmlOutput.innerHTML = ''
    return
  }
  
  try {
    const cleanedHtml = cleanMsWordHtml(html)
    htmlOutput.innerHTML = cleanedHtml
  } catch (err) {
    console.error("Chyba při čištění:", err)
    htmlOutput.innerHTML = "<span style='color:red;'>Chyba při čištění. Zkontrolujte konzoli.</span>"
  }
}

// 5. Event Listeners
richInput.addEventListener('input', () => {
  processInput()
})

richInput.addEventListener('paste', (e) => {
  e.preventDefault()
  const html = e.clipboardData?.getData('text/html')
  const text = e.clipboardData?.getData('text/plain')
  
  if (html) {
    document.execCommand('insertHTML', false, html)
  } else if (text) {
    document.execCommand('insertText', false, text)
  }
})

clearBtn.addEventListener('click', () => {
  richInput.innerHTML = ''
  processInput()
})

copyBtn.addEventListener('click', async () => {
  const cleanHtml = htmlOutput.innerHTML
  if (!cleanHtml) return
  
  try {
    // Copy as rich text (text/html) and plain text fallback
    const blobHtml = new Blob([cleanHtml], { type: 'text/html' })
    const blobText = new Blob([htmlOutput.innerText], { type: 'text/plain' })
    
    const data = [new ClipboardItem({
      'text/html': blobHtml,
      'text/plain': blobText
    })]
    
    await navigator.clipboard.write(data)
    
    const originalText = copyBtn.innerText
    copyBtn.innerText = 'Zkopírováno!'
    setTimeout(() => {
      copyBtn.innerText = originalText
    }, 2000)
  } catch (err) {
    console.error('Kopírování selhalo: ', err)
    alert('Kopírování selhalo. Váš prohlížeč možná nepodporuje Clipboard API.')
  }
})

// Initial process
processInput()
