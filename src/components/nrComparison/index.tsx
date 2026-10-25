import { useState } from 'react'
import type { NrDocument } from '../../types/nrReview'
import { formatNrField, nrReviewFields, nrTextDifference } from '../../utils/nrReview'

interface NrComparisonProps { pending: NrDocument; approved: NrDocument | null; comparing?: boolean }
const comparisonFields = nrReviewFields.filter(([field]) => field !== 'ultima_atualizacao')

export default function NrComparison({ pending, approved, comparing = true }: NrComparisonProps) {
  const previous = comparing ? approved : null
  const [onlyChanged, setOnlyChanged] = useState(false)
  const changedCount = approved ? comparisonFields.filter(([field]) => approved[field] !== pending[field]).length : 0
  const fields = previous ? comparisonFields.filter(([field]) => !onlyChanged || previous[field] !== pending[field]) : comparisonFields.filter(([field]) => ['descricao', 'objetivo', 'aplicabilidade'].includes(field))
  return <section aria-labelledby="nr-comparison-title" className="nr-review-content">
    <h2 id="nr-comparison-title">{previous ? 'Comparação com o catálogo aprovado' : 'Conteúdo para revisão'}</h2>
    {previous && <>
      <div className="nr-comparison-controls">
        <p role="status">{changedCount} de {comparisonFields.length} campos alterados</p>
        <label><input type="checkbox" checked={onlyChanged} onChange={event => setOnlyChanged(event.target.checked)} />Mostrar apenas alterações</label>
      </div>
      <p className="nr-review-comparison-help"><span className="nr-comparison-legend nr-comparison-legend--before">Trecho anterior</span><span className="nr-comparison-legend nr-comparison-legend--after">Trecho atualizado</span></p>
    </>}
    {!approved && <p>Nova NR: não existe versão aprovada anterior no catálogo.</p>}
    <div className={`nr-review-comparison-sheet${previous ? '' : ' nr-review-comparison-sheet--new'}`}>
    {previous && <div className="nr-review-version-headings" aria-hidden="true"><span>Versão aprovada atual</span><span>Análise pendente de revisão</span></div>}
    <div className="nr-review-fields-grid">
    {fields.map(([field, label]) => {
      const changed = previous !== null && previous[field] !== pending[field]
      const longField = ['nome', 'descricao', 'objetivo', 'aplicabilidade'].includes(field)
      const difference = previous && changed && longField ? nrTextDifference(formatNrField(previous, field), formatNrField(pending, field)) : null
      return <article key={field} className={`nr-review-field${longField ? ' nr-review-field--wide' : ' nr-review-field--compact'}${changed ? ' nr-review-field--changed' : ''}`}>
        <h3>{label}{previous && <span className={`nr-review-change${changed ? ' nr-review-change--changed' : ''}`}>{changed ? 'Alterado' : 'Sem alteração'}</span>}</h3>
        {previous && !changed ? <div className="nr-comparison-unchanged"><p>{formatNrField(pending, field)}</p></div> : <div className={previous ? 'nr-review-compare' : 'nr-review-reading'}>
          {previous && <div><h4>{longField ? 'Versão aprovada atual' : 'Atual'}</h4><p>{difference ? <>{difference.before[0]}{difference.before[1] && <del className="nr-comparison-removed">{difference.before[1]}</del>}{difference.before[2]}</> : formatNrField(previous, field)}</p></div>}
          <div>{previous && <h4>{longField ? 'Análise pendente de revisão' : 'Pendente'}</h4>}<p>{difference ? <>{difference.after[0]}{difference.after[1] && <mark className="nr-comparison-added">{difference.after[1]}</mark>}{difference.after[2]}</> : formatNrField(pending, field)}</p></div>
        </div>}
      </article>
    })}
    </div>
    {previous && onlyChanged && changedCount === 0 && <p className="nr-comparison-empty" role="status">Nenhuma alteração em relação ao catálogo aprovado. Desmarque o filtro para consultar todos os campos.</p>}
    </div>
  </section>
}
