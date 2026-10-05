import type { Manager } from '../types/manager'

export const managerUnits = ['Matriz', 'Filial 1', 'Filial 2', 'Filial 3']

export const mockManagers: Manager[] = [
  { id: 'kirk-hammett', name: 'Kirk Hammett', email: 'kirk.hamett@gmail.com.br', unit: 'Matriz', active: true, cpf: '123.456.789-00', position: 'Gerente', modality: 'Presencial' },
  { id: 'pedro-silva', name: 'Pedro Silva', email: 'pedro.silva@gmail.com.br', unit: 'Matriz', active: true, cpf: '234.493.842-17', position: 'Analista de dados', modality: 'Remoto' },
  { id: 'luana-souza', name: 'Luana Souza', email: 'luana.souza@gmail.com.br', unit: 'Filial 2', active: false, cpf: '345.530.895-34', position: 'Coordenador', modality: 'Híbrido' },
  { id: 'antonio-umbelino', name: 'Antonio Umbelino', email: 'antonio.umbelino@gmail.com.br', unit: 'Filial 2', active: false, cpf: '456.567.948-51', position: 'Diretor', modality: 'Presencial' },
  { id: 'maria-paula', name: 'Maria Paula', email: 'maria.paula@gmail.com.br', unit: 'Matriz', active: true, cpf: '567.604.001-68', position: 'Supervisor', modality: 'Remoto' },
  { id: 'carla-mendes', name: 'Carla Mendes', email: 'carla.mendes@gmail.com.br', unit: 'Filial 1', active: true, cpf: '678.641.054-85', position: 'Gerente', modality: 'Híbrido' },
  { id: 'rafael-costa', name: 'Rafael Costa', email: 'rafael.costa@gmail.com.br', unit: 'Filial 3', active: true, cpf: '789.678.107-02', position: 'Analista de dados', modality: 'Presencial' },
  { id: 'juliana-ribeiro', name: 'Juliana Ribeiro', email: 'juliana.ribeiro@gmail.com.br', unit: 'Matriz', active: false, cpf: '900.715.160-19', position: 'Coordenador', modality: 'Remoto' },
  { id: 'bruno-almeida', name: 'Bruno Almeida', email: 'bruno.almeida@gmail.com.br', unit: 'Filial 1', active: true, cpf: '011.752.213-36', position: 'Diretor', modality: 'Híbrido' },
  { id: 'fernanda-lima', name: 'Fernanda Lima', email: 'fernanda.lima@gmail.com.br', unit: 'Filial 2', active: true, cpf: '122.789.266-53', position: 'Supervisor', modality: 'Presencial' },
  { id: 'gustavo-pereira', name: 'Gustavo Pereira', email: 'gustavo.pereira@gmail.com.br', unit: 'Filial 3', active: false, cpf: '233.826.319-70', position: 'Gerente', modality: 'Remoto' },
  { id: 'beatriz-santos', name: 'Beatriz Santos', email: 'beatriz.santos@gmail.com.br', unit: 'Matriz', active: true, cpf: '344.863.372-87', position: 'Analista de dados', modality: 'Híbrido' },
  { id: 'lucas-oliveira', name: 'Lucas Oliveira', email: 'lucas.oliveira@gmail.com.br', unit: 'Filial 1', active: true, cpf: '455.900.425-04', position: 'Coordenador', modality: 'Presencial' },
  { id: 'camila-rocha', name: 'Camila Rocha', email: 'camila.rocha@gmail.com.br', unit: 'Filial 2', active: false, cpf: '566.937.478-21', position: 'Diretor', modality: 'Remoto' },
  { id: 'thiago-martins', name: 'Thiago Martins', email: 'thiago.martins@gmail.com.br', unit: 'Filial 3', active: true, cpf: '677.974.531-38', position: 'Supervisor', modality: 'Híbrido' },
  { id: 'patricia-gomes', name: 'Patrícia Gomes', email: 'patricia.gomes@gmail.com.br', unit: 'Matriz', active: true, cpf: '788.011.584-55', position: 'Gerente', modality: 'Presencial' },
]
