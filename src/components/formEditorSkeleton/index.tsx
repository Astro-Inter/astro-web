import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'

interface FormEditorSkeletonProps { editing?: boolean }

function FormEditorSkeleton({ editing = false }: FormEditorSkeletonProps) {
  return <div className="api-loading form-editor-skeleton" aria-busy="true">
    <span className="sr-only" role="status">{editing ? 'Carregando formulário' : 'Carregando opções do formulário'}</span>
    <section className="create-forms-card">
      <h2>{editing ? 'Informações do formulário' : 'Informações iniciais'}</h2>
      {['Nome do formulário', 'Descrição do formulário', 'Gestor destinatário', 'NR (opcional)', 'Unidade (opcional)', 'Data limite (opcional)'].map(label =>
        <div className="create-forms-field" key={label}><span className="create-forms-label">{label}</span><span aria-hidden="true" className="api-skeleton api-skeleton-control" /></div>)}
    </section>
    <div className="create-forms-footer">
      <button disabled className="create-forms-add-question" type="button"><AstroIcon className="create-forms-add-question-icon" name="plus-square" />Adicionar pergunta</button>
      <PurpleButton disabled><AstroIcon name="file-plus" />{editing ? 'Salvar alterações' : 'Criar formulário'}</PurpleButton>
    </div>
  </div>
}

export default FormEditorSkeleton
