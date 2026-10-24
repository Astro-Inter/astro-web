// Catálogo das telas. name vai para nome_tela; o contexto escolhido vai para contexto_tela.
export const SCREENS = {
  "cadastro": {
    "name": "cadastro",
    "context": {
      "principal": "principal",
      "pagamento": "pagamento",
      "codigo": "codigo",
      "sucesso": "sucesso"
    }
  },
  "workspace": {
    "name": "workspace",
    "context": {
      "principal": "principal",
      "dados": "dados_cadastrais",
      "documento": "documento",
      "endereco": "endereco",
      "resumo": "resumo"
    }
  },
  "erros": {
    "name": "erro",
    "context": {
      "encontro": "pageNotFound",
      "inativo": "usuario_inativo",
      "cadastro": "cadastro_workspace"
    }
  },
  "home": {
    "name": "home",
    "context": {
      "home": "home",
      "dashboard": "dashboard"
    }
  },
  "gestores": {
    "name": "gestor",
    "context": {
      "gestor": "gestor"
    }
  },
  "colaboradores": {
    "name": "colaboradores",
    "context": "colaboradores"
  },
  "conformidade": {
    "name": "conformidade",
    "context": "conformidade"
  },
  "unidade": {
    "name": "unidade",
    "context": "unidade"
  },
  "cargo": {
    "name": "cargo",
    "context": "cargo"
  },
  "formulario": {
    "name": "formulario",
    "context": {
      "principal": "principal",
      "criar": "criar_formulario",
      "editar": "editar_formulario",
      "respostas": "respostas_formulario"
    }
  },
  "evento": {
    "name": "evento",
    "context": {
      "calendario": "calendario"
    }
  },
  "configuracoes": {
    "name": "configuracoes",
    "context": {
      "principal": "principal",
      "dados": "dados_cadastrais",
      "documento": "documento",
      "endereco": "endereco",
      "context": "conta"
    }
  }
} as const
