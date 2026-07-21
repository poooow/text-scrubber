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

  const blocksToSplit = Array.from(body.querySelectorAll("p, div"));
  for (const originalBlock of blocksToSplit) {
    let block: Element | null = originalBlock;
    while (block) {
      const childNodes = Array.from(block.childNodes);
      const brIndex = childNodes.findIndex(
        (child) =>
          child.nodeType === Node.ELEMENT_NODE &&
          (child as Element).tagName.toLowerCase() === "br",
      );

      if (brIndex === -1) break;

      const blockTagName = (block as HTMLElement).tagName.toLowerCase();
      const newBlock: HTMLElement = doc.createElement(blockTagName);
      for (const nodeAfterBr of childNodes.slice(brIndex + 1)) {
        newBlock.appendChild(nodeAfterBr);
      }

      childNodes[brIndex].parentNode?.removeChild(childNodes[brIndex]);
      block.parentNode?.insertBefore(newBlock, block.nextSibling);
      block = newBlock;
    }
  }

  const blocksInOrder = Array.from(
    body.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6, ul, ol, table"),
  );
  const bulletRegex = /^\s*([•·\-*])[\s\xA0]+/s;
  const orderedMarkerPattern =
    "(?:\\d+(?:\\.\\d+)*[.)]|[a-zA-Z][.)]|[ivxlcdmIVXLCDM]+[.)])";
  const orderedRegex = new RegExp(
    `^\\s*(${orderedMarkerPattern})[\\s\\xA0]+`,
    "s",
  );

  let currentList: HTMLUListElement | HTMLOListElement | null = null;
  let currentListType: "ul" | "ol" | null = null;

  for (let i = 0; i < blocksInOrder.length; i++) {
    const block = blocksInOrder[i];
    const blockTag = block.tagName.toLowerCase();
    if (blockTag !== "p" && blockTag !== "div") {
      currentList = null;
      currentListType = null;
      continue;
    }

    const p = block as HTMLParagraphElement;
    if (p.closest("ul, ol")) {
      currentList = null;
      currentListType = null;
      continue;
    }

    const text = p.textContent || "";
    const bulletMatch = text.match(bulletRegex);
    const orderedMatch = text.match(orderedRegex);
    const markerRegex = bulletMatch
      ? /^\s*([•·\-*])/
      : orderedMatch
        ? new RegExp(`^\\s*(${orderedMarkerPattern})`)
        : null;
    const nextListType: "ul" | "ol" | null = bulletMatch
      ? "ul"
      : orderedMatch
        ? "ol"
        : null;

    if (nextListType && markerRegex) {
      const treeWalker = doc.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
      let currentNode = treeWalker.nextNode();
      let markerRemoved = false;
      let spaceRemoved = false;

      while (currentNode) {
        const nodeText = currentNode.nodeValue || "";
        if (!markerRemoved) {
          const markerMatch = nodeText.match(markerRegex);
          if (markerMatch) {
            currentNode.nodeValue = nodeText.replace(markerRegex, "");
            markerRemoved = true;
            spaceRemoved = true;
          } else if (nodeText.trim().length > 0) {
            break;
          }
        } else if (!spaceRemoved) {
          const spaceMatch = nodeText.match(/^[\s\xA0]+/);
          if (spaceMatch) {
            currentNode.nodeValue = nodeText.replace(/^[\s\xA0]+/, "");
            spaceRemoved = true;
          } else if (nodeText.trim().length > 0) {
            spaceRemoved = true;
          }
        } else {
          break;
        }
        currentNode = treeWalker.nextNode();
      }

      if (!currentList || currentListType !== nextListType) {
        currentList = doc.createElement(nextListType);
        currentListType = nextListType;
        p.parentNode?.insertBefore(currentList, p);
      }
      const li = doc.createElement("li");
      while (p.firstChild) {
        li.appendChild(p.firstChild);
      }
      currentList.appendChild(li);
      p.parentNode?.removeChild(p);
    } else {
      currentList = null;
      currentListType = null;
    }
  }
}
