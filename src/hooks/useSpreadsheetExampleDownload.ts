import { useEffect, useRef, useState } from 'react'
import { createSpreadsheetExampleBlob, type DownloadableSpreadsheetExample } from '../utils/spreadsheetExample'

export function useSpreadsheetExampleDownload(example: DownloadableSpreadsheetExample) {
  const [state, setState] = useState({ pending: false, error: '' })
  const busy = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  async function download() {
    if (busy.current) return
    busy.current = true
    setState({ pending: true, error: '' })
    try {
      const blob = await createSpreadsheetExampleBlob(example)
      if (!mounted.current) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'modelo-planilha-astro.xlsx'
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      if (mounted.current) setState({ pending: false, error: 'Não foi possível baixar o modelo. Tente novamente.' })
    } finally {
      busy.current = false
      if (mounted.current) setState(current => ({ ...current, pending: false }))
    }
  }
  return { ...state, download }
}
