export function animateRemoval(element: HTMLElement | null, onFinish: () => void, collapseGridGap = false) {
  if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    onFinish()
    return
  }

  const bounds = element.getBoundingClientRect()
  const styles = window.getComputedStyle(element)
  const parentStyles = element.parentElement ? window.getComputedStyle(element.parentElement) : null
  const gridGap = Number.parseFloat(parentStyles?.rowGap ?? '') || 0
  const finalMarginBottom = collapseGridGap && gridGap > 0 ? `${-gridGap}px` : styles.marginBottom

  element.dataset.removing = 'true'
  element.inert = true
  element.setAttribute('aria-hidden', 'true')
  element.style.overflow = 'hidden'

  const animation = element.animate(
    [
      { height: `${bounds.height}px`, marginTop: styles.marginTop, marginBottom: styles.marginBottom, opacity: 1 },
      { height: '0px', marginTop: '0px', marginBottom: finalMarginBottom, opacity: 0 },
    ],
    { duration: 240, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'forwards' },
  )
  animation.onfinish = onFinish
}
