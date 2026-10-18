import type { Dispatch, SetStateAction } from 'react'
import { BUTTONS } from '../../gtm/buttons'
import type { CreateFormValues, FormEditorOptions, FormSelectOption } from '../../types/forms'
import ToolbarSelect from '../toolbarSelect'
import FormDatePicker from '../formDatePicker'
import CompactPurpleButton from '../compactPurpleButton'
import AstroIcon from '../astroIcon'

interface FormInformationFieldsProps {
  prefix: string; values: CreateFormValues; setValues: Dispatch<SetStateAction<CreateFormValues>>
  options: FormEditorOptions; onDeadlineValidityChange: (valid: boolean) => void
  onRetryManagers: () => void
}
function selectable(options: FormSelectOption[], selected: string, label: string): FormSelectOption[] {
  return [{ value: '', label, tone: 'muted' }, ...options,
    ...(selected && !options.some(option => option.value === selected) ? [{ value: selected, label: `ID ${selected} (seleção salva; confira a disponibilidade)` }] : [])]
}
export default function FormInformationFields({ prefix, values, setValues, options, onDeadlineValidityChange, onRetryManagers }: FormInformationFieldsProps) {
  const change = (field: keyof Omit<CreateFormValues, 'questions'>, value: string) => setValues(current => ({ ...current, [field]: value }))
  return <>
    <div className="create-forms-field"><label htmlFor={`${prefix}-name`}>Nome do formulário</label><input id={`${prefix}-name`} maxLength={100} onChange={e => change('name', e.target.value)} value={values.name} /></div>
    <div className="create-forms-field"><label htmlFor={`${prefix}-description`}>Descrição do formulário</label><input id={`${prefix}-description`} maxLength={240} onChange={e => change('description', e.target.value)} value={values.description} /></div>
    <div className="create-forms-field">
      <span className="create-forms-label">Gestor destinatário</span>
      <ToolbarSelect trackingAction={BUTTONS.comuns.gestor} className="create-forms-select" label="Gestor destinatário"
        disabled={!!options.managersError || options.managersLoading}
        onValueChange={value => change('manager', value)}
        options={[{ value: '', label: options.managersLoading ? 'Carregando gestores...' : 'Selecione o gestor', tone: 'muted' },
          ...options.managers.filter(manager => manager.value !== options.currentManagerId)]}
        value={options.managers.some(manager => manager.value === values.manager && manager.value !== options.currentManagerId) ? values.manager : ''} />
      {options.managersError ? <div className="forms-recipients-feedback" role="alert">
        <p>{options.managersError}</p>
        <CompactPurpleButton auto variant="outline" disabled={options.managersLoading} onClick={onRetryManagers}><AstroIcon name="reload" />Tentar novamente</CompactPurpleButton>
      </div> : !options.managersLoading && options.managers.length === 0 && <p role="status">Nenhum outro gestor ativo disponível para receber o formulário.</p>}
    </div>
    <div className="create-forms-field"><span className="create-forms-label">NR (opcional)</span><ToolbarSelect trackingAction={BUTTONS.comuns.nr} className="create-forms-select" label="NR (opcional)" onValueChange={value => change('nr', value)} options={[{ value: '', label: 'Selecionar a NR', tone: 'muted' }, ...options.nrs]} value={options.nrs.some(nr => nr.value === values.nr) ? values.nr : ''} />
      {values.nr && !options.nrs.some(nr => nr.value === values.nr) && <p role="alert">A NR salva não está disponível no catálogo de empresa. Selecione uma NR de empresa ou remova o vínculo.</p>}
    </div>
    <div className="create-forms-field"><span className="create-forms-label">Unidade (opcional)</span><ToolbarSelect trackingAction={BUTTONS.comuns.unidade} className="create-forms-select" label="Unidade (opcional)" onValueChange={value => change('unit', value)} options={selectable(options.units, values.unit, 'Selecionar a unidade')} value={values.unit} /></div>
    <div className="create-forms-field"><label htmlFor={`${prefix}-deadline`}>Data limite (opcional)</label><FormDatePicker id={`${prefix}-deadline`} label="Data limite" onValidityChange={onDeadlineValidityChange} onChange={value => change('deadline', value)} value={values.deadline} /></div>
  </>
}
