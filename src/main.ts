import './style.css'
import { initSettings, getSettings } from './settings'
import { cleanMsWordHtml } from './cleaner'

// 1. Elements
const richInput = document.getElementById('rich-input') as HTMLDivElement
const htmlOutput = document.getElementById('html-output') as HTMLDivElement
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement

// 2. Initialize Settings
initSettings(processInput)

// 3. Process Input
function processInput() {
  const html = richInput.innerHTML
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
