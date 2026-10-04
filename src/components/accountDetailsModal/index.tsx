import { useEffect, useRef, useState } from 'react'
import type { AccountProfile } from '../../types/account'
import AccountProfileHeader from '../accountProfileHeader'
import AppModal from '../appModal'
import ConfirmationModal from '../confirmationModal'
import FormField from '../formField'
import PasswordField from '../passwordField'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

interface AccountDetailsModalProps {
  mode: 'view' | 'edit'
  profile: AccountProfile
  onCancel: () => void
  onSave: (profile: AccountProfile) => void
}

const unitOptions = ['Matriz, Campinas', 'Matriz', 'Campinas'].map(label => ({ label, value: label }))
const modalityOptions = ['Presencial', 'Híbrido', 'Remoto'].map(label => ({ label, value: label }))

function AccountDetailsModal({ mode, profile, onCancel, onSave }: AccountDetailsModalProps) {
  const editable = mode === 'edit'
  const [form, setForm] = useState({ ...profile, password: 'astro-demo', passwordVisible: false })
  const [confirming, setConfirming] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const savedRef = useRef(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const photoUrlsRef = useRef<string[]>([])
  const savedPhotoRef = useRef<string | undefined>(undefined)

  useEffect(() => () => {
    for (const url of photoUrlsRef.current) {
      if (url !== savedPhotoRef.current) URL.revokeObjectURL(url)
    }
  }, [])

  return (
    <>
    <AppModal className="account-details-modal editAccountModalWeb" dimmed={confirming || finishing} open={!finishing} onClose={() => {
      if (savedRef.current) {
        const { name, email, cpf, units, position, modality, photoUrl } = form
        savedPhotoRef.current = photoUrl
        onSave({ name, email, cpf, units, position, modality, photoUrl })
      } else onCancel()
    }} preservePageScroll title={editable ? 'Altere suas informações' : 'Veja suas informações'}>
      {dismiss => <>
        <form className="account-details-form" noValidate onSubmit={event => { event.preventDefault(); setConfirming(true) }}>
          <AccountProfileHeader editable={editable} onEditPhoto={() => photoInputRef.current?.click()} profile={form} />
          {editable && <><label hidden htmlFor="account-photo-file">Selecionar foto do perfil</label><input accept="image/*" className="account-photo-input" id="account-photo-file" onChange={event => {
            const file = event.target.files?.[0]
            if (file?.type.startsWith('image/')) {
              const photoUrl = URL.createObjectURL(file)
              photoUrlsRef.current.push(photoUrl)
              setForm(current => ({ ...current, photoUrl }))
            }
          }} ref={photoInputRef} type="file" /></>}
          <div className="account-details-grid">
            <FormField id="account-detail-name" label="Nome" onChange={event => setForm(current => ({ ...current, name: event.target.value }))} readOnly={!editable} value={form.name} />
            <FormField id="account-detail-cpf" label="CPF" onChange={event => setForm(current => ({ ...current, cpf: event.target.value }))} readOnly={!editable} value={form.cpf} />
            <FormField id="account-detail-email" label="E-mail" onChange={event => setForm(current => ({ ...current, email: event.target.value }))} readOnly={!editable} type="email" value={form.email} />
            <PasswordField autoComplete="off" id="account-detail-password" label="Senha" onChange={password => setForm(current => ({ ...current, password }))} onToggleVisibility={() => setForm(current => ({ ...current, passwordVisible: !current.passwordVisible }))} placeholder="Insira a senha" readOnly={!editable} value={form.password} visible={form.passwordVisible} />
            {editable ? <div className="field-group"><label htmlFor="account-detail-units">Unidades</label><ToolbarSelect className="account-field-select" id="account-detail-units" label="Unidades" onValueChange={units => setForm(current => ({ ...current, units }))} options={unitOptions} searchable={false} value={form.units} /></div> : <FormField id="account-detail-units" label="Unidades" readOnly value={form.units} />}
            <FormField id="account-detail-position" label="Cargo" readOnly value={form.position} />
            {editable ? <div className="field-group"><label htmlFor="account-detail-modality">Modalidade</label><ToolbarSelect className="account-field-select" id="account-detail-modality" label="Modalidade" onValueChange={modality => setForm(current => ({ ...current, modality }))} options={modalityOptions} searchable={false} value={form.modality} /></div> : <FormField id="account-detail-modality" label="Modalidade" readOnly value={form.modality} />}
          </div>
          <div className="astro-modal-actions">
            <button className="astro-modal-cancel" onClick={dismiss} type="button">{editable ? 'Cancelar' : 'Voltar'}</button>
            {editable && <PurpleButton type="submit">Salvar alterações</PurpleButton>}
          </div>
        </form>
      </>}
    </AppModal>
    {confirming && <ConfirmationModal className="replaceAccountModalWeb" confirmLabel="Salvar" onCancel={() => setConfirming(false)} onConfirm={() => null} onConfirmed={() => {
      savedRef.current = true
      setConfirming(false)
      setFinishing(true)
    }} preservePageScroll title="Tem certeza de que deseja alterar as informações da sua conta?" />}
    </>
  )
}

export default AccountDetailsModal
