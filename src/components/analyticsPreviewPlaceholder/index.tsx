export default function AnalyticsPreviewPlaceholder() {
  return <div className="analytics-preview-placeholder">
    <svg className="analytics-preview-placeholder-chart" aria-hidden="true" viewBox="0 0 112 76" fill="none">
      <path d="M12 18H100M12 38H100M12 58H100" stroke="currentColor" strokeOpacity=".16" strokeDasharray="3 5" />
      <rect x="22" y="36" width="16" height="28" rx="4" fill="currentColor" opacity=".4" />
      <rect x="48" y="20" width="16" height="44" rx="4" fill="currentColor" opacity=".65" />
      <rect x="74" y="8" width="16" height="56" rx="4" fill="currentColor" />
      <path d="M12 69H100" stroke="currentColor" strokeOpacity=".3" strokeLinecap="round" />
    </svg>
    <strong>Confira a prévia</strong>
    <p>Configure os campos e gere uma prévia dos resultados.</p>
  </div>
}
