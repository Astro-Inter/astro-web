import PurpleButton from '../purpleButton'
import AnalyticsPreviewPlaceholder from '../analyticsPreviewPlaceholder'
import TruncatedText from '../truncatedText'

interface AnalyticsEditorSkeletonProps { title: string }
function Field({ label }: { label: string }) {
  return <div className="create-forms-field analytics-editor-field"><span className="create-forms-label">{label}</span><span className="api-skeleton api-skeleton-control" /></div>
}
export default function AnalyticsEditorSkeleton({ title }: AnalyticsEditorSkeletonProps) {
  return <div className="analytics-editor-layout analytics-editor-layout--catalog">
    <div className="analytics-editor-form">
      <div className="create-forms-field"><span className="create-forms-label">Nome do gráfico</span><span className="analytics-editor-loading-name">{title || 'Digite o nome do gráfico'}</span></div>
      <Field label="Base de dados" />
      <div className="analytics-metric-fields"><Field label="Informação" /><Field label="O que deseja calcular?" /><span className="analytics-field-help">Sobre esta informação</span></div>
      <Field label="Organizar por" />
      <span className="analytics-advanced">Opções avançadas</span>
      <Field label="Tipo de gráfico" />
    </div>
    <div className="analytics-editor-preview analytics-editor-preview--catalog analytics-editor-preview--empty">
      <h3><TruncatedText nativeEllipsis maxLines={2}>{`Prévia · ${title || 'Meu gráfico'}`}</TruncatedText></h3>
      <p className="analytics-calculation-summary"><span className="api-skeleton analytics-skeleton-description" /></p>
      <AnalyticsPreviewPlaceholder />
      <PurpleButton type="button" className="analytics-secondary" disabled>Gerar prévia</PurpleButton>
    </div>
  </div>
}
