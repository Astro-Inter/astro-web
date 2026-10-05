import type { Manager } from '../types/manager'

export const managerUnits = ['Matriz', 'Filial 1', 'Filial 2', 'Filial 3']

export const mockManagers: Manager[] = [
  { id: 'kirk-hammett', name: 'Kirk Hammett', email: 'kirk.hamett@gmail.com.br', unit: 'Matriz', active: true },
  { id: 'pedro-silva', name: 'Pedro Silva', email: 'pedro.silva@gmail.com.br', unit: 'Matriz', active: true },
  { id: 'luana-souza', name: 'Luana Souza', email: 'luana.souza@gmail.com.br', unit: 'Filial 2', active: false },
  { id: 'antonio-umbelino', name: 'Antonio Umbelino', email: 'antonio.umbelino@gmail.com.br', unit: 'Filial 2', active: false },
  { id: 'maria-paula', name: 'Maria Paula', email: 'maria.paula@gmail.com.br', unit: 'Matriz', active: true },
  { id: 'carla-mendes', name: 'Carla Mendes', email: 'carla.mendes@gmail.com.br', unit: 'Filial 1', active: true },
  { id: 'rafael-costa', name: 'Rafael Costa', email: 'rafael.costa@gmail.com.br', unit: 'Filial 3', active: true },
  { id: 'juliana-ribeiro', name: 'Juliana Ribeiro', email: 'juliana.ribeiro@gmail.com.br', unit: 'Matriz', active: false },
  { id: 'bruno-almeida', name: 'Bruno Almeida', email: 'bruno.almeida@gmail.com.br', unit: 'Filial 1', active: true },
  { id: 'fernanda-lima', name: 'Fernanda Lima', email: 'fernanda.lima@gmail.com.br', unit: 'Filial 2', active: true },
  { id: 'gustavo-pereira', name: 'Gustavo Pereira', email: 'gustavo.pereira@gmail.com.br', unit: 'Filial 3', active: false },
  { id: 'beatriz-santos', name: 'Beatriz Santos', email: 'beatriz.santos@gmail.com.br', unit: 'Matriz', active: true },
  { id: 'lucas-oliveira', name: 'Lucas Oliveira', email: 'lucas.oliveira@gmail.com.br', unit: 'Filial 1', active: true },
  { id: 'camila-rocha', name: 'Camila Rocha', email: 'camila.rocha@gmail.com.br', unit: 'Filial 2', active: false },
  { id: 'thiago-martins', name: 'Thiago Martins', email: 'thiago.martins@gmail.com.br', unit: 'Filial 3', active: true },
  { id: 'patricia-gomes', name: 'Patrícia Gomes', email: 'patricia.gomes@gmail.com.br', unit: 'Matriz', active: true },
]
