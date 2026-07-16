import './style.css'
import { initSettings, getSettings } from './settings'
import { cleanMsWordHtml } from './cleaner'

// 1. Elements
const richInput = document.getElementById('rich-input') as HTMLDivElement
const htmlOutput = document.getElementById('html-output') as HTMLDivElement
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement
const settingsContainer = document.getElementById('settings-container') as HTMLDivElement
const settingsCollapseBtn = document.getElementById('settings-collapse-btn') as HTMLElement

// 2. Initialize Settings & Cache
initSettings(processInput)

const savedInput = localStorage.getItem('scrubber-input-cache')
if (savedInput) {
  richInput.innerHTML = savedInput
}

// 3. Process Input
function processInput() {
  const html = richInput.innerHTML
  localStorage.setItem('scrubber-input-cache', html)
  
  if (!html.trim()) {
    htmlOutput.innerHTML = ''
    return
  }
  
  try {
    const cleanedHtml = cleanMsWordHtml(html, getSettings())
    htmlOutput.innerHTML = cleanedHtml
  } catch (err) {
    console.error("Chyba při čištění:", err)
    htmlOutput.innerHTML = "<span style='color:red;'>Chyba při čištění. Zkontrolujte konzoli.</span>"
  }
}

// 4. Event Listeners
const isCollapsed = localStorage.getItem('settings-collapsed') === 'true'
if (isCollapsed && settingsContainer) {
  settingsContainer.classList.add('collapsed')
}

if (settingsCollapseBtn) {
  settingsCollapseBtn.addEventListener('click', () => {
    const willBeCollapsed = !settingsContainer.classList.contains('collapsed')
    settingsContainer.classList.toggle('collapsed', willBeCollapsed)
    localStorage.setItem('settings-collapsed', willBeCollapsed.toString())
  })
}

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
  
  const textSpan = clearBtn.querySelector('.btn-text') as HTMLSpanElement || clearBtn
  const originalText = textSpan.innerText
  textSpan.innerText = 'Vymazáno!'
  clearBtn.classList.add('btn-success')
  setTimeout(() => {
    textSpan.innerText = originalText
    clearBtn.classList.remove('btn-success')
  }, 1500)
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
    
    const textSpan = copyBtn.querySelector('.btn-text') as HTMLSpanElement || copyBtn
    const originalText = textSpan.innerText
    textSpan.innerText = 'Zkopírováno!'
    copyBtn.classList.add('btn-success')
    setTimeout(() => {
      textSpan.innerText = originalText
      copyBtn.classList.remove('btn-success')
    }, 2000)
  } catch (err) {
    console.error('Kopírování selhalo: ', err)
    alert('Kopírování selhalo. Váš prohlížeč možná nepodporuje Clipboard API.')
  }
})

// Initial process
processInput()
