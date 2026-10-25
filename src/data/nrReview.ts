import type { NrDocument } from '../types/nrReview'

const base: NrDocument = {
  _id: 20,
  nome: 'Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis',
  aplicabilidade: 'Aplica-se às atividades de extração, produção, armazenamento, transferência, manuseio e manipulação de inflamáveis e líquidos combustíveis. A análise das instalações deve considerar os processos, as características dos produtos e os riscos aos trabalhadores e às comunidades próximas.\n\nA organização deve avaliar cada instalação e manter procedimentos compatíveis com suas condições operacionais, incluindo manutenção, inspeção e resposta a emergências.',
  descricao: 'Estabelece requisitos para a gestão da segurança e saúde no trabalho contra os fatores de risco de acidentes provenientes das atividades com inflamáveis e combustíveis.\n\nAbrange o projeto das instalações, a análise de riscos, os procedimentos operacionais, a capacitação dos trabalhadores e a prevenção e controle de vazamentos, derramamentos, incêndios e explosões. Os documentos e procedimentos precisam estar disponíveis para consulta durante a revisão humana.',
  objetivo: 'Prevenir acidentes e proteger a saúde e a integridade dos trabalhadores por meio da identificação de perigos, avaliação de riscos e adoção de medidas de prevenção.',
  revogada: false, tempo_reciclagem_meses: 12, ultima_atualizacao: '27/01/2025',
  usabilidade: 'Colaborador', data_criacao: '2026-10-24T12:00:00.000Z',
}

export const pendingNrExamples: readonly NrDocument[] = [
  base,
  { ...base, _id: 1, nome: 'Disposições Gerais e Gerenciamento de Riscos Ocupacionais', usabilidade: 'Empresa', ultima_atualizacao: '26/05/2025', objetivo: 'Definir disposições gerais e diretrizes para o gerenciamento de riscos ocupacionais nas organizações.' },
  { ...base, _id: 2, nome: 'Inspeção Prévia', revogada: true, usabilidade: 'Empresa', ultima_atualizacao: '30/07/2019', descricao: 'Exemplo demonstrativo de norma revogada. A condição de revogação deve ser conferida na fonte oficial antes de qualquer decisão.' },
  { ...base, _id: 6, nome: 'Equipamento de Proteção Individual', ultima_atualizacao: '05/08/2022' },
  { ...base, _id: 10, nome: 'Segurança em Instalações e Serviços em Eletricidade', tempo_reciclagem_meses: 24, ultima_atualizacao: '30/07/2019' },
  { ...base, _id: 35, nome: 'Trabalho em Altura', tempo_reciclagem_meses: 24, ultima_atualizacao: '20/12/2022' },
]

export const approvedNrExamples: readonly NrDocument[] = [
  { ...base, nome: 'Segurança com Inflamáveis e Combustíveis', descricao: 'Define requisitos de prevenção de acidentes nas atividades com inflamáveis e combustíveis.', objetivo: 'Proteger os trabalhadores contra riscos de incêndios e explosões.', aplicabilidade: 'Instalações com atividades de armazenamento e manuseio de inflamáveis.', tempo_reciclagem_meses: 24, usabilidade: 'Empresa', ultima_atualizacao: '10/12/2019' },
  { ...pendingNrExamples[2], revogada: false, ultima_atualizacao: '01/01/2018' },
]
