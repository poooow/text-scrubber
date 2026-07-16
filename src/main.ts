import './style.css'
import TurndownService from 'turndown'

// 1. Elements
const richInput = document.getElementById('rich-input') as HTMLDivElement
const markdownOutput = document.getElementById('markdown-output') as HTMLTextAreaElement
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
  processInput() // re-process the input when settings change
}

// Add listeners to settings
for (const el of Object.values(settings)) {
  el.addEventListener('change', saveSettings)
}
loadSettings()

// 3. Clean MS Word HTML
function cleanMsWordHtml(html: string): string {
  // MS Word injects tons of metadata. We can just use a DOM parser to strip it.
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Remove comments (like <!--[if gte mso 9]>...)
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

  // Remove all style attributes and class attributes if we want it completely clean
  // since Turndown only cares about tags
  const elements = doc.body.getElementsByTagName('*')
  for (let i = 0; i < elements.length; i++) {
    elements[i].removeAttribute('style')
    elements[i].removeAttribute('class')
    elements[i].removeAttribute('id')
    elements[i].removeAttribute('lang')
    
    // MS Word specifically uses o:p tags for paragraphs
    if (elements[i].tagName.toLowerCase() === 'o:p') {
      // Just replace <o:p>...</o:p> with its content or a space
      elements[i].outerHTML = elements[i].innerHTML
    }
  }

  return doc.body.innerHTML
}

// 4. Configure Turndown
function getTurndownService(): TurndownService {
  // We specify headings style etc.
  const td = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced'
  })

  // Apply conditional rules based on settings
  
  // Bold
  if (!settings.bold.checked) {
    td.addRule('removeBold', {
      filter: ['strong', 'b'],
      replacement: function (content) {
        return content
      }
    })
  }

  // Italic
  if (!settings.italic.checked) {
    td.addRule('removeItalic', {
      filter: ['em', 'i'],
      replacement: function (content) {
        return content
      }
    })
  }

  // Links
  if (!settings.links.checked) {
    td.addRule('removeLinks', {
      filter: 'a',
      replacement: function (content) {
        return content
      }
    })
  }

  // Lists
  if (!settings.lists.checked) {
    td.addRule('removeLists', {
      filter: ['ul', 'ol', 'li'],
      replacement: function (content) {
        // Just extract text and add a newline
        return content + '\n'
      }
    })
  }

  // Headings
  if (!settings.headings.checked) {
    td.addRule('removeHeadings', {
      filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      replacement: function (content) {
        return '\n\n' + content + '\n\n'
      }
    })
  }

  // Tables
  if (!settings.tables.checked) {
    td.addRule('removeTables', {
      filter: ['table', 'thead', 'tbody', 'tr', 'td', 'th'],
      replacement: function (content, node) {
        // Basic extraction of text if tables are disabled
        if (node.nodeName === 'TR') return '\n' + content
        if (node.nodeName === 'TD' || node.nodeName === 'TH') return ' ' + content + ' '
        return content
      }
    })
  } else {
    // Add GitHub flavored markdown table support natively if kept
    // We'll implement a basic gfm table rule
    td.addRule('table', {
      filter: 'table',
      replacement: function (content) {
        return '\n\n' + content + '\n\n'
      }
    })
    td.addRule('tableRow', {
      filter: 'tr',
      replacement: function (content, node) {
        let res = ''
        if (node.parentNode?.nodeName === 'THEAD') {
          // generate header separator
          const childCount = node.childNodes.length
          const separator = Array.from({ length: childCount }).map(() => '---').join(' | ')
          res = '\n|' + separator + '|'
        }
        return '|' + content + '\n' + res
      }
    })
    td.addRule('tableCell', {
      filter: ['th', 'td'],
      replacement: function (content) {
        return ' ' + content.trim().replace(/\n/g, ' ') + ' |'
      }
    })
  }

  return td
}

// 5. Process Input
function processInput() {
  const html = richInput.innerHTML
  if (!html.trim()) {
    markdownOutput.value = ''
    return
  }
  
  const cleanedHtml = cleanMsWordHtml(html)
  const td = getTurndownService()
  
  try {
    const markdown = td.turndown(cleanedHtml)
    markdownOutput.value = markdown
  } catch (err) {
    console.error("Chyba při převodu:", err)
    markdownOutput.value = "Chyba při převodu. Zkontrolujte konzoli pro více detailů."
  }
}

// 6. Event Listeners
richInput.addEventListener('input', () => {
  processInput()
})

richInput.addEventListener('paste', (e) => {
  e.preventDefault()
  
  // Try to get HTML payload first
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
  if (!markdownOutput.value) return
  
  try {
    await navigator.clipboard.writeText(markdownOutput.value)
    const originalText = copyBtn.innerText
    copyBtn.innerText = 'Zkopírováno!'
    setTimeout(() => {
      copyBtn.innerText = originalText
    }, 2000)
  } catch (err) {
    console.error('Kopírování selhalo: ', err)
  }
})

// Initial process
processInput()
