interface FieldProps { label: string }

function Field({ label }: FieldProps) {
  return <div className="create-forms-field analytics-editor-field"><span className="create-forms-label">{label}</span><span className="api-skeleton api-skeleton-control" /></div>
}

export default Field
