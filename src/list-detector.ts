export function detectAndConvertLists(body: HTMLElement, doc: Document) {
  let currentP: HTMLParagraphElement | null = null
  const nodes = Array.from(body.childNodes)
  for (const node of nodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      const tagName = el.tagName.toLowerCase()
      if (['p', 'div', 'ul', 'ol', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
        currentP = null
        continue
      }
    }
    
    if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
      if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim() && !currentP) {
        continue
      }
      if (!currentP) {
        currentP = doc.createElement('p')
        node.parentNode?.insertBefore(currentP, node)
      }
      currentP.appendChild(node)
    }
  }

  const brs = Array.from(body.querySelectorAll('p br, div br'))
  for (const br of brs) {
    const block = br.closest('p, div')
    if (!block) continue
    
    const range = doc.createRange()
    range.setStartAfter(br)
    range.setEndAfter(block.lastChild || block)
    
    const content = range.extractContents()
    br.parentNode?.removeChild(br)
    
    const newBlock = doc.createElement(block.tagName)
    newBlock.appendChild(content)
    
    block.parentNode?.insertBefore(newBlock, block.nextSibling)
  }

  const paragraphs = Array.from(body.querySelectorAll('p, div'))
  const bulletRegex = /^\s*([•·\-*])[\s\xA0]+(.*)/s
  
  let currentList: HTMLUListElement | null = null
  
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i]
    const text = p.textContent || ''
    const match = text.match(bulletRegex)
    
    if (match) {
      const treeWalker = doc.createTreeWalker(p, NodeFilter.SHOW_TEXT, null)
      let currentNode = treeWalker.nextNode()
      let bulletRemoved = false
      let spaceRemoved = false

      while (currentNode) {
        const nodeText = currentNode.nodeValue || ''
        if (!bulletRemoved) {
          const bulletMatch = nodeText.match(/^\s*([•·\-*])/)
          if (bulletMatch) {
            currentNode.nodeValue = nodeText.replace(/^\s*[•·\-*]/, '')
            bulletRemoved = true
            
            const afterBulletText = currentNode.nodeValue
            const spaceMatch = afterBulletText.match(/^[\s\xA0]+/)
            if (spaceMatch) {
              currentNode.nodeValue = afterBulletText.replace(/^[\s\xA0]+/, '')
              spaceRemoved = true
            }
          } else if (nodeText.trim().length > 0) {
            break
          }
        } else if (!spaceRemoved) {
          const spaceMatch = nodeText.match(/^[\s\xA0]+/)
          if (spaceMatch) {
            currentNode.nodeValue = nodeText.replace(/^[\s\xA0]+/, '')
            spaceRemoved = true
          } else if (nodeText.trim().length > 0) {
            spaceRemoved = true
          }
        } else {
          break
        }
        currentNode = treeWalker.nextNode()
      }
      
      if (!currentList) {
        currentList = doc.createElement('ul')
        p.parentNode?.insertBefore(currentList, p)
      }
      const li = doc.createElement('li')
      while (p.firstChild) {
        li.appendChild(p.firstChild)
      }
      currentList.appendChild(li)
      p.parentNode?.removeChild(p)
    } else {
      currentList = null
    }
  }
}
