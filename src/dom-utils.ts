/**
 * Helper to unwrap an element (replace element with its children)
 */
export function unwrap(el: Element) {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el)
  }
  parent.removeChild(el)
}
