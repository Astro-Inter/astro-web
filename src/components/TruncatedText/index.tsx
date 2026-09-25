import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface TruncatedTextProps {
  children: string
}

function TruncatedText({ children }: TruncatedTextProps) {
  const elementRef = useRef<HTMLSpanElement>(null)
  const [displayText, setDisplayText] = useState(children)
  const [truncated, setTruncated] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 })
  const [tooltipMounted, setTooltipMounted] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const hideTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showTooltipFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const update = () => {
      const width = element.clientWidth
      const context = document.createElement('canvas').getContext('2d')
      if (!context || width <= 0) return

      context.font = getComputedStyle(element).font
      if (context.measureText(children).width <= width) {
        setDisplayText(children)
        setTruncated(false)
        return
      }

      let low = 0
      let high = children.length
      let best = ''
      while (low <= high) {
        const middle = Math.floor((low + high) / 2)
        const candidate = children.slice(0, middle).trimEnd()
        if (context.measureText(`${candidate}...`).width <= width) {
          best = candidate
          low = middle + 1
        } else {
          high = middle - 1
        }
      }

      setDisplayText(best)
      setTruncated(true)
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [children])

  function updateTooltipPosition() {
    const element = elementRef.current
    if (!element) return

    const bounds = element.getBoundingClientRect()
    const maxWidth = Math.min(512, window.innerWidth - 16)
    const left = Math.max(8, Math.min(bounds.left, window.innerWidth - maxWidth - 8))
    const estimatedHeight = 64
    const top = bounds.bottom + 8 + estimatedHeight <= window.innerHeight
      ? bounds.bottom + 8
      : Math.max(8, bounds.top - estimatedHeight - 8)

    setTooltipPosition({ left, top })
  }

  function showTooltip() {
    if (!truncated) return
    if (hideTooltipTimeoutRef.current) clearTimeout(hideTooltipTimeoutRef.current)
    updateTooltipPosition()
    setTooltipMounted(true)
    if (showTooltipFrameRef.current) cancelAnimationFrame(showTooltipFrameRef.current)
    showTooltipFrameRef.current = requestAnimationFrame(() => {
      showTooltipFrameRef.current = requestAnimationFrame(() => setTooltipVisible(true))
    })
  }

  function hideTooltip() {
    if (!tooltipMounted) return
    if (showTooltipFrameRef.current) cancelAnimationFrame(showTooltipFrameRef.current)
    setTooltipVisible(false)
    if (hideTooltipTimeoutRef.current) clearTimeout(hideTooltipTimeoutRef.current)
    hideTooltipTimeoutRef.current = setTimeout(() => setTooltipMounted(false), 140)
  }

  useEffect(() => {
    if (!tooltipVisible) return

    updateTooltipPosition()
    const reposition = () => updateTooltipPosition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [tooltipVisible])

  useEffect(() => () => {
    if (hideTooltipTimeoutRef.current) clearTimeout(hideTooltipTimeoutRef.current)
    if (showTooltipFrameRef.current) cancelAnimationFrame(showTooltipFrameRef.current)
  }, [])

  const tooltip = tooltipMounted && truncated && typeof document !== 'undefined'
    ? createPortal(<span className={`astro-truncated-tooltip${tooltipVisible ? ' astro-truncated-tooltip--visible' : ''}`} role="tooltip" style={{ left: tooltipPosition.left, top: tooltipPosition.top }}>{children}</span>, document.body)
    : null

  return <>
    <span
      aria-label={children}
      className="astro-truncated-text"
      data-truncated={truncated}
      ref={elementRef}
      onBlur={hideTooltip}
      onFocus={showTooltip}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >{displayText}{truncated ? '...' : ''}</span>
    {tooltip}
  </>
}

export default TruncatedText
