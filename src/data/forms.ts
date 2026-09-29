import type { FormSummary } from '../types/forms'

export const formStatusLabels = { pending: 'Pendente', completed: 'Concluído', draft: 'Rascunho' }

export const mockForms: FormSummary[] = [
  { id: 'clima', name: 'Pesquisa de clima', description: 'Avaliação do ambiente organizacional e satisfação da equipe.', questionCount: 12, status: 'pending', icon: 'document', color: 'purple' },
  { id: 'checklist-seguranca', name: 'Check-list', description: 'Verificação de conformidade com normas e procedimentos de segurança.', questionCount: 18, status: 'completed', icon: 'calendar', color: 'pink' },
  { id: 'avaliacao', name: 'Avaliação', description: 'Feedback sobre os treinamentos realizados pela empresa.', questionCount: 10, status: 'pending', icon: 'feedback', color: 'blue' },
  { id: 'checklist-rascunho', name: 'Check-list', description: 'Verificação de conformidade com normas e procedimentos de segurança.', questionCount: 15, status: 'draft', icon: 'person-outline', color: 'green' },
  { id: 'inspecao', name: 'Inspeção de segurança', description: 'Identificação de riscos e ações preventivas no local de trabalho.', questionCount: 4, status: 'pending', icon: 'document', color: 'purple' },
  { id: 'integracao', name: 'Integração de colaboradores', description: 'Avaliação do processo de integração dos novos colaboradores.', questionCount: 8, status: 'completed', icon: 'person-outline', color: 'green' },
  { id: 'satisfacao', name: 'Pesquisa de satisfação', description: 'Feedback da equipe sobre as ações e os serviços oferecidos pela empresa.', questionCount: 10, status: 'pending', icon: 'feedback', color: 'blue' },
  { id: 'equipamentos', name: 'Check-list de equipamentos', description: 'Verificação das condições dos equipamentos e dos itens de proteção.', questionCount: 6, status: 'draft', icon: 'calendar', color: 'pink' },
]
