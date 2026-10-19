import type { Dispatch, SetStateAction } from 'react'
import { BUTTONS } from '../../gtm/buttons'
import type { CreateFormValues, FormEditorOptions, FormSelectOption } from '../../types/forms'
import ToolbarSelect from '../toolbarSelect'
import FormDatePicker from '../formDatePicker'
import CompactPurpleButton from '../compactPurpleButton'
import AstroIcon from '../astroIcon'

interface FormInformationFieldsProps {
  errors?: Record<string, string>
  prefix: string; values: CreateFormValues; setValues: Dispatch<SetStateAction<CreateFormValues>>
  options: FormEditorOptions; onDeadlineValidityChange: (valid: boolean) => void
  onRetryManagers: () => void
}
function selectable(options: FormSelectOption[], selected: string, label: string): FormSelectOption[] {
  return [{ value: '', label, tone: 'muted' }, ...options,
    ...(selected && !options.some(option => option.value === selected) ? [{ value: selected, label: `ID ${selected} (seleção salva; confira a disponibilidade)` }] : [])]
}
export default function FormInformationFields({ errors = {}, prefix, values, setValues, options, onDeadlineValidityChange, onRetryManagers }: FormInformationFieldsProps) {
  const nrError = errors.nr || (values.nr && !options.nrs.some(nr => nr.value === values.nr) ? 'A NR salva não está disponível no catálogo de empresa. Selecione uma NR de empresa ou remova o vínculo.' : undefined)
  const fieldError = (field: string) => errors[field] && <p className="login-field-error" id={`${prefix}-${field}-error`} role="alert">{errors[field]}</p>
  const change = (field: keyof Omit<CreateFormValues, 'questions'>, value: string) => setValues(current => ({ ...current, [field]: value }))
  return <>
    <div className="create-forms-field"><label htmlFor={`${prefix}-name`}>Nome do formulário</label><input aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${prefix}-name-error` : undefined} id={`${prefix}-name`} placeholder="Digite o nome do formulário" maxLength={100} onChange={e => change('name', e.target.value)} value={values.name} />{fieldError('name')}</div>
    <div className="create-forms-field"><label htmlFor={`${prefix}-description`}>Descrição do formulário</label><input aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? `${prefix}-description-error` : undefined} id={`${prefix}-description`} placeholder="Digite a descrição do formulário" maxLength={240} onChange={e => change('description', e.target.value)} value={values.description} />{fieldError('description')}</div>
    <div className="create-forms-field">
      <span className="create-forms-label">Gestor destinatário</span>
      {options.managersLoading ? <div aria-busy="true"><span className="sr-only" role="status">Carregando gestores</span><span aria-hidden="true" className="api-skeleton api-skeleton-control" /></div> : <ToolbarSelect trackingAction={BUTTONS.comuns.gestor} className="create-forms-select" id={`${prefix}-manager`} error={errors.manager} label="Gestor destinatário"
        disabled={!!options.managersError || options.managersLoading}
        onValueChange={value => change('manager', value)}
        options={[{ value: '', label: 'Selecione o gestor', tone: 'muted' },
          ...options.managers.filter(manager => manager.value !== options.currentManagerId)]}
        value={options.managers.some(manager => manager.value === values.manager && manager.value !== options.currentManagerId) ? values.manager : ''} />}
      {fieldError('manager')}
      {options.managersError ? <div className="forms-recipients-feedback" role="alert">
        <p>{options.managersError}</p>
        <CompactPurpleButton auto variant="outline" disabled={options.managersLoading} onClick={onRetryManagers}><AstroIcon name="reload" />Tentar novamente</CompactPurpleButton>
      </div> : !options.managersLoading && options.managers.length === 0 && <p role="status">Nenhum outro gestor ativo disponível para receber o formulário.</p>}
    </div>
    <div className="create-forms-field"><span className="create-forms-label">NR (opcional)</span><ToolbarSelect trackingAction={BUTTONS.comuns.nr} className="create-forms-select" id={`${prefix}-nr`} error={nrError} label="NR (opcional)" onValueChange={value => change('nr', value)} options={[{ value: '', label: 'Selecionar a NR', tone: 'muted' }, ...options.nrs]} value={options.nrs.some(nr => nr.value === values.nr) ? values.nr : ''} />
      {nrError && <p className="login-field-error" id={`${prefix}-nr-error`} role="alert">{nrError}</p>}
    </div>
    <div className="create-forms-field"><span className="create-forms-label">Unidade (opcional)</span><ToolbarSelect trackingAction={BUTTONS.comuns.unidade} className="create-forms-select" id={`${prefix}-unit`} error={errors.unit} label="Unidade (opcional)" onValueChange={value => change('unit', value)} options={selectable(options.units, values.unit, 'Selecionar a unidade')} value={values.unit} />{fieldError('unit')}</div>
    <div className="create-forms-field"><label htmlFor={`${prefix}-deadline`}>Data limite (opcional)</label><FormDatePicker error={errors.deadline} id={`${prefix}-deadline`} label="Data limite" onValidityChange={onDeadlineValidityChange} onChange={value => change('deadline', value)} value={values.deadline} /></div>
  </>
}
