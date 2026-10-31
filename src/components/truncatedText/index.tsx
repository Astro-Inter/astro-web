import { getPopupDuration } from '../../utils/popupMotion'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface TruncatedTextProps {
  children: string
  truncate?: boolean
  focusParent?: boolean
  nativeEllipsis?: boolean
  maxLines?: number
  hoverDelay?: number
}

function TruncatedText({ children, truncate = true, focusParent = false, nativeEllipsis = false, maxLines = 1, hoverDelay = 0 }: TruncatedTextProps) {
  const tooltipId = useId()
  const elementRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const [displayText, setDisplayText] = useState(children)
  const [truncated, setTruncated] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0, zoom: 1 })
  const [tooltipHost, setTooltipHost] = useState<HTMLDialogElement | null>(null)
  const [tooltipMounted, setTooltipMounted] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const hideTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showTooltipFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    let active = true

    const resetTooltip = () => {
      if (showTooltipTimeoutRef.current) clearTimeout(showTooltipTimeoutRef.current)
      showTooltipTimeoutRef.current = null
      if (hideTooltipTimeoutRef.current) clearTimeout(hideTooltipTimeoutRef.current)
      if (showTooltipFrameRef.current) cancelAnimationFrame(showTooltipFrameRef.current)
      setTooltipVisible(false)
      setTooltipMounted(false)
    }

    const update = () => {
      if (!active) return
      if (!truncate) {
        setDisplayText(children)
        setTruncated(false)
        resetTooltip()
        return
      }
      const width = element.clientWidth
      if (nativeEllipsis || maxLines > 1) {
        const overflow = width > 0 && (maxLines > 1
          ? element.scrollHeight > element.clientHeight + 1
          : element.scrollWidth > width + 1)
        setTruncated(overflow)
        if (!overflow) resetTooltip()
        return
      }
      const context = document.createElement('canvas').getContext('2d')
      if (!context || width <= 0) return

      context.font = getComputedStyle(element).font
      if (context.measureText(children).width <= width) {
        setDisplayText(children)
        setTruncated(false)
        resetTooltip()
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
    void document.fonts?.ready.then(update)
    document.fonts?.addEventListener('loadingdone', update)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(element)
    window.addEventListener('resize', update)
    return () => { active = false; if (showTooltipTimeoutRef.current) clearTimeout(showTooltipTimeoutRef.current); observer?.disconnect(); window.removeEventListener('resize', update); document.fonts?.removeEventListener('loadingdone', update) }
  }, [children, maxLines, nativeEllipsis, truncate])

  const updateTooltipPosition = useCallback(() => {
    const element = elementRef.current
    if (!element) return

    const bounds = element.getBoundingClientRect()
    const tooltipBounds = maxLines > 1 ? tooltipRef.current?.getBoundingClientRect() : undefined
    const maxWidth = tooltipBounds?.width || Math.min(512, window.innerWidth - 16)
    const left = Math.max(8, Math.min(bounds.left, window.innerWidth - maxWidth - 8))
    const estimatedHeight = tooltipBounds?.height || 64
    const top = bounds.bottom + 8 + estimatedHeight <= window.innerHeight
      ? bounds.bottom + 8
      : Math.max(8, bounds.top - estimatedHeight - 8)

    const dialog = element.closest('dialog')
    setTooltipHost(dialog)
    setTooltipPosition({ left, top, zoom: dialog ? 1 / (Number(getComputedStyle(dialog).zoom) || 1) : 1 })
  }, [maxLines])

  useLayoutEffect(() => {
    if (maxLines > 1 && tooltipMounted) updateTooltipPosition()
  }, [maxLines, tooltipMounted, updateTooltipPosition])

  const showTooltip = useCallback(() => {
    if (showTooltipTimeoutRef.current) clearTimeout(showTooltipTimeoutRef.current)
    showTooltipTimeoutRef.current = null
    if (!truncated) return
    if (hideTooltipTimeoutRef.current) clearTimeout(hideTooltipTimeoutRef.current)
    updateTooltipPosition()
    setTooltipMounted(true)
    if (showTooltipFrameRef.current) cancelAnimationFrame(showTooltipFrameRef.current)
    showTooltipFrameRef.current = requestAnimationFrame(() => {
      showTooltipFrameRef.current = requestAnimationFrame(() => setTooltipVisible(true))
    })
  }, [truncated, updateTooltipPosition])

  const scheduleTooltip = useCallback(() => {
    if (!truncated) return
    if (tooltipMounted || hoverDelay <= 0) {
      showTooltip()
      return
    }
    if (showTooltipTimeoutRef.current) clearTimeout(showTooltipTimeoutRef.current)
    showTooltipTimeoutRef.current = setTimeout(showTooltip, hoverDelay)
  }, [hoverDelay, showTooltip, tooltipMounted, truncated])

  const hideTooltip = useCallback(() => {
    if (showTooltipTimeoutRef.current) clearTimeout(showTooltipTimeoutRef.current)
    showTooltipTimeoutRef.current = null
    if (!tooltipMounted) return
    if (showTooltipFrameRef.current) cancelAnimationFrame(showTooltipFrameRef.current)
    if (hideTooltipTimeoutRef.current) clearTimeout(hideTooltipTimeoutRef.current)
    hideTooltipTimeoutRef.current = setTimeout(() => {
      setTooltipVisible(false)
      hideTooltipTimeoutRef.current = setTimeout(() => setTooltipMounted(false), getPopupDuration('popover'))
    }, 140)
  }, [tooltipMounted])

  useEffect(() => {
    if (!focusParent) return
    const parent = elementRef.current?.closest('button')
    parent?.addEventListener('focus', showTooltip)
    parent?.addEventListener('blur', hideTooltip)
    return () => { parent?.removeEventListener('focus', showTooltip); parent?.removeEventListener('blur', hideTooltip) }
  }, [focusParent, hideTooltip, showTooltip])

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
  }, [tooltipVisible, updateTooltipPosition])

  useEffect(() => {
    if (!tooltipMounted) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      if (hideTooltipTimeoutRef.current) clearTimeout(hideTooltipTimeoutRef.current)
      setTooltipVisible(false)
      setTooltipMounted(false)
    }
    document.addEventListener('keydown', closeOnEscape, true)
    return () => document.removeEventListener('keydown', closeOnEscape, true)
  }, [tooltipMounted])

  useEffect(() => () => {
    if (showTooltipTimeoutRef.current) clearTimeout(showTooltipTimeoutRef.current)
    if (hideTooltipTimeoutRef.current) clearTimeout(hideTooltipTimeoutRef.current)
    if (showTooltipFrameRef.current) cancelAnimationFrame(showTooltipFrameRef.current)
  }, [])

  const tooltip = truncated && tooltipMounted && typeof document !== 'undefined'
    ? createPortal(<span className={`astro-truncated-tooltip${maxLines > 1 ? ' astro-truncated-tooltip--multiline' : ''}${tooltipVisible ? ' astro-truncated-tooltip--visible' : ''}`} id={tooltipId} onMouseEnter={showTooltip} onMouseLeave={hideTooltip} popover="manual" ref={element => { tooltipRef.current = element; if (element?.showPopover && !element.matches(':popover-open')) element.showPopover() }} role="tooltip" style={{ right: 'auto', bottom: 'auto', margin: 0, left: tooltipPosition.left, top: tooltipPosition.top, zoom: tooltipPosition.zoom }}>{children}</span>, tooltipHost ?? document.body)
    : null

  return <>
    <span
      aria-describedby={truncated && tooltipMounted ? tooltipId : undefined}
      tabIndex={truncated && !focusParent ? 0 : undefined}
      className={`astro-truncated-text${truncate && maxLines > 1 ? ' astro-truncated-text--multiline' : ''}`}
      style={truncate && maxLines > 1 ? { WebkitLineClamp: maxLines } : undefined}
      data-truncated={truncated}
      ref={elementRef}
      onBlur={hideTooltip}
      onFocus={showTooltip}
      onMouseEnter={scheduleTooltip}
      onMouseLeave={() => {
        if (showTooltipTimeoutRef.current) clearTimeout(showTooltipTimeoutRef.current)
        showTooltipTimeoutRef.current = null
        const focusTarget = focusParent ? elementRef.current?.closest('button') : elementRef.current
        if (document.activeElement !== focusTarget) hideTooltip()
      }}
    >{nativeEllipsis || maxLines > 1 || !truncated ? children : <><span aria-hidden="true">{displayText}...</span><span className="sr-only">{children}</span></>}</span>
    {tooltip}
  </>
}

export default TruncatedText
