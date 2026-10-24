import type { FormReviewData, FormReviewStatus } from '../types/formReview'
import { createReviewDecision } from '../utils/formReview'

export function createFormReviewPreview(status: FormReviewStatus = 'awaiting_review'): FormReviewData {
  const responded = status !== 'awaiting_response'
  return {
    currentManagerId: 7, recipientName: 'Ana Souza', senderName: 'Você', unitName: 'Unidade Sede',
    review: status === 'approved' ? createReviewDecision('approved', 'Você', '', '2026-10-23T14:35:00Z')
      : status === 'rejected' ? createReviewDecision('rejected', 'Você', 'As informações enviadas não comprovam a regularidade da sinalização. O formulário foi encerrado como reprovado.', '2026-10-23T14:35:00Z') : { status },
    form: {
      id: '61000000-0000-4000-8000-000000000001', workspaceId: 1, senderManagerId: 7, managerId: 8,
      title: 'Inspeção de segurança', description: 'Verificação das condições de segurança, sinalização e equipamentos da unidade.',
      nrCode: 23, unitId: 3, dueDate: '2026-10-30', status: responded ? 'CONCLUIDO' : 'PENDENTE',
      createdAt: '2026-10-20T12:00:00Z', updatedAt: '2026-10-23T13:42:00Z', respondedAt: responded ? '2026-10-23T13:42:00Z' : null,
      questions: [
        { id: 1, type: 'alternativa', question: 'As saídas de emergência estão sinalizadas e desobstruídas?', required: true,
          multiple: false, options: [{ id: 1, text: 'Sim, todas estão adequadas', other: false }, { id: 2, text: 'Não, existem irregularidades', other: false }],
          maxFiles: null, maxFileSizeMb: null, answer: responded ? [1] : [] },
        { id: 2, type: 'texto', question: 'Descreva as condições encontradas durante a inspeção.', required: true,
          multiple: null, options: [], maxFiles: null, maxFileSizeMb: null,
          answer: responded ? ['As saídas de emergência estão desobstruídas e os extintores estão dentro da validade. A sinalização foi conferida nas áreas de circulação. Foi identificada a necessidade de reforçar a marcação do piso próxima ao estoque.'] : [] },
        { id: 3, type: 'data', question: 'Em qual data a inspeção foi realizada?', required: true,
          multiple: null, options: [], maxFiles: null, maxFileSizeMb: null, answer: responded ? ['2026-10-23'] : [] },
        { id: 4, type: 'foto', question: 'Anexe os registros da inspeção.', required: false, multiple: null, options: [],
          maxFiles: 3, maxFileSizeMb: 10, answer: responded ? [{ name: 'sinalizacao_area_de_circulacao.jpg' }, { name: 'equipamentos_de_seguranca.jpg' }] : [] },
        { id: 5, type: 'texto', question: 'Deseja acrescentar alguma observação sobre a inspeção?', required: false,
          multiple: null, options: [], maxFiles: null, maxFileSizeMb: null, answer: [] },
      ],
    },
  }
}
