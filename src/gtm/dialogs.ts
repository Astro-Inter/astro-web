// Catálogo fornecido para dialogs. Use name para identificar a janela e buttons para identificar sua ação.
// Exemplo: DIALOGS.gestores.convidar.buttons.convidar resulta em "convidar".
export const DIALOGS = {
  gestores: {
    convidar: {
      name: "convidar_gestor",
      buttons: {
        cancelar: "cancelar",
        convidar: "convidar"
      }
    },

    informacoes: {
      name: "informacoes_gestor",
      buttons: {
        voltar: "voltar"
      }
    },

    editar: {
      name: "editar_gestor",
      buttons: {
        cancelar: "cancelar",
        salvarAlteracoes: "salvar_alteracoes"
      }
    },

    confirmarAlteracoes: {
      name: "confirmar_alteracoes_gestor",
      buttons: {
        cancelar: "cancelar",
        salvar: "salvar"
      }
    },

    confirmarInativacao: {
      name: "confirmar_inativacao_gestor",
      buttons: {
        cancelar: "cancelar",
        inativar: "inativar"
      }
    },

    menuAcoes: {
      name: "acoes_gestor",
      buttons: {
        informacoes: "informacoes",
        editar: "editar",
        inativar: "inativar"
      }
    }
  },

  colaboradores: {
    adicionar: {
      name: "adicionar_colaborador",
      buttons: {
        cancelar: "cancelar",
        adicionar: "adicionar"
      }
    },

    informacoes: {
      name: "informacoes_colaborador",
      buttons: {
        voltar: "voltar"
      }
    },

    editar: {
      name: "editar_colaborador",
      buttons: {
        cancelar: "cancelar",
        salvarAlteracoes: "salvar_alteracoes"
      }
    },

    confirmarAlteracoes: {
      name: "confirmar_alteracoes_colaborador",
      buttons: {
        cancelar: "cancelar",
        salvar: "salvar"
      }
    },

    menuAcoes: {
      name: "acoes_colaborador",
      buttons: {
        informacoes: "informacoes",
        editar: "editar",
        inativar: "inativar"
      }
    }
  },

  conformidade: {
    adicionarPlanilha: {
      name: "adicionar_conformidades",
      buttons: {
        adicionarManualmente: "adicionar_manualmente",
        selecionarArquivo: "selecionar_arquivo",
        comoImportar: "como_importar_planilha",
        cancelar: "cancelar",
        adicionar: "adicionar"
      }
    },

    instrucoesImportacao: {
      name: "instrucoes_importacao_conformidades",
      buttons: {
        entendi: "entendi"
      }
    },

    adicionarManualmente: {
      name: "adicionar_conformidade",
      buttons: {
        cancelar: "cancelar",
        adicionar: "adicionar"
      }
    },

    editar: {
      name: "editar_conformidade",
      buttons: {
        cancelar: "cancelar",
        salvarAlteracoes: "salvar_alteracoes"
      }
    },

    filtros: {
      name: "filtros_conformidade",
      buttons: {
        limpar: "limpar_filtros",
        aplicar: "aplicar_filtros"
      }
    },

    confirmarAlteracoes: {
      name: "confirmar_alteracoes_conformidade",
      buttons: {
        cancelar: "cancelar",
        salvar: "salvar"
      }
    },

    confirmarNaoAplicavel: {
      name: "confirmar_conformidade_nao_aplicavel",
      buttons: {
        cancelar: "cancelar",
        tornarNaoAplicavel: "tornar_nao_aplicavel"
      }
    },

    menuAcoes: {
      name: "acoes_conformidade",
      buttons: {
        editar: "editar",
        tornarNaoAplicavel: "tornar_nao_aplicavel"
      }
    }
  },

  unidade: {
    visualizarNrs: {
      name: "nrs_unidade",
      buttons: {
        editar: "editar_nrs",
        voltar: "voltar"
      }
    },

    editarNrs: {
      name: "editar_nrs_unidade",
      buttons: {
        cancelar: "cancelar",
        salvar: "salvar"
      }
    },

    confirmarAlteracoesNrs: {
      name: "confirmar_alteracoes_nrs_unidade",
      buttons: {
        cancelar: "cancelar",
        salvar: "salvar"
      }
    },

    informacoesNr: {
      name: "informacoes_nr",
      buttons: {}
    },

    confirmarInativacao: {
      name: "confirmar_inativacao_unidade",
      buttons: {
        cancelar: "cancelar",
        inativar: "inativar"
      }
    }
  },

  cargo: {},

  formulario: {
    confirmarInativacao: {
      name: "confirmar_inativacao_formulario",
      buttons: {}
    },

    menuAcoes: {
      name: "acoes_formulario",
      buttons: {}
    },

    confirmarExclusaoPergunta: {
      name: "confirmar_exclusao_pergunta",
      buttons: {}
    },

    menuAcoesPergunta: {
      name: "acoes_pergunta",
      buttons: {}
    },

    selecionarTipoPergunta: {
      name: "selecionar_tipo_pergunta",
      buttons: {}
    }
  },

  evento: {
    informacoes: {
      name: "informacoes_evento",
      buttons: {}
    },

    menuAcoes: {
      name: "acoes_evento",
      buttons: {}
    },

    selecionarColaboradores: {
      name: "selecionar_colaboradores_evento",
      buttons: {}
    },

    organizarEquipes: {
      name: "organizar_equipes_evento",
      buttons: {}
    },

    definirQuantidadeEquipes: {
      name: "definir_quantidade_equipes_evento",
      buttons: {}
    },

    editarEquipes: {
      name: "editar_equipes_evento",
      buttons: {}
    },

    configuracoes: {
      name: "configuracoes_evento",
      buttons: {}
    },

    detalhes: {
      name: "detalhes_evento",
      buttons: {}
    },

    confirmarInativacao: {
      name: "confirmar_inativacao_evento",
      buttons: {}
    }
  },

  configuracoes: {
    confirmarSenha: {
      name: "confirmar_senha",
      buttons: {
        cancelar: "cancelar",
        continuar: "continuar"
      }
    },

    informacoesConta: {
      name: "informacoes_conta",
      buttons: {
        voltar: "voltar"
      }
    },

    editarConta: {
      name: "editar_conta",
      buttons: {
        cancelar: "cancelar",
        salvarAlteracoes: "salvar_alteracoes"
      }
    },

    confirmarAlteracoesConta: {
      name: "confirmar_alteracoes_conta",
      buttons: {
        cancelar: "cancelar",
        salvar: "salvar"
      }
    }
  }
} as const

// Nomes oficiais mais as janelas existentes no frontend atualizado.
export const DIALOG_NAMES = {
  "acoes_cargo": "acoes_cargo",
  "acoes_colaborador": "acoes_colaborador",
  "acoes_conformidade": "acoes_conformidade",
  "acoes_evento": "acoes_evento",
  "acoes_formulario": "acoes_formulario",
  "acoes_gestor": "acoes_gestor",
  "acoes_pergunta": "acoes_pergunta",
  "acoes_unidade": "acoes_unidade",
  "adicionar_cargo": "adicionar_cargo",
  "adicionar_colaborador": "adicionar_colaborador",
  "adicionar_conformidade": "adicionar_conformidade",
  "adicionar_conformidades": "adicionar_conformidades",
  "codigo_enviado": "codigo_enviado",
  "colaboradores_grupo_evento": "colaboradores_grupo_evento",
  "configuracoes_evento": "configuracoes_evento",
  "confirmar_adicao_colaboradores": "confirmar_adicao_colaboradores",
  "confirmar_alteracoes_cargo": "confirmar_alteracoes_cargo",
  "confirmar_alteracoes_colaborador": "confirmar_alteracoes_colaborador",
  "confirmar_alteracoes_conformidade": "confirmar_alteracoes_conformidade",
  "confirmar_alteracoes_conta": "confirmar_alteracoes_conta",
  "confirmar_alteracoes_dados_empresa": "confirmar_alteracoes_dados_empresa",
  "confirmar_alteracoes_endereco": "confirmar_alteracoes_endereco",
  "confirmar_alteracoes_evento": "confirmar_alteracoes_evento",
  "confirmar_alteracoes_formulario": "confirmar_alteracoes_formulario",
  "confirmar_alteracoes_gestor": "confirmar_alteracoes_gestor",
  "confirmar_alteracoes_nrs_cargo": "confirmar_alteracoes_nrs_cargo",
  "confirmar_alteracoes_nrs_unidade": "confirmar_alteracoes_nrs_unidade",
  "confirmar_alteracoes_pagamento": "confirmar_alteracoes_pagamento",
  "confirmar_conformidade_nao_aplicavel": "confirmar_conformidade_nao_aplicavel",
  "confirmar_exclusao_formulario": "confirmar_exclusao_formulario",
  "confirmar_exclusao_pergunta": "confirmar_exclusao_pergunta",
  "confirmar_inativacao_cargo": "confirmar_inativacao_cargo",
  "confirmar_inativacao_colaborador": "confirmar_inativacao_colaborador",
  "confirmar_inativacao_evento": "confirmar_inativacao_evento",
  "confirmar_inativacao_formulario": "confirmar_inativacao_formulario",
  "confirmar_inativacao_gestor": "confirmar_inativacao_gestor",
  "confirmar_inativacao_unidade": "confirmar_inativacao_unidade",
  "confirmar_logout": "confirmar_logout",
  "confirmar_senha": "confirmar_senha",
  "confirmar_substituicao_gestor": "confirmar_substituicao_gestor",
  "convidar_gestor": "convidar_gestor",
  "definir_quantidade_equipes_evento": "definir_quantidade_equipes_evento",
  "descartar_alteracoes_configuracoes": "descartar_alteracoes_configuracoes",
  "descartar_alteracoes_formulario": "descartar_alteracoes_formulario",
  "detalhes_evento": "detalhes_evento",
  "editar_cargo": "editar_cargo",
  "editar_colaborador": "editar_colaborador",
  "editar_conformidade": "editar_conformidade",
  "editar_conta": "editar_conta",
  "editar_equipes_evento": "editar_equipes_evento",
  "editar_gestor": "editar_gestor",
  "editar_nrs_cargo": "editar_nrs_cargo",
  "editar_nrs_unidade": "editar_nrs_unidade",
  "email_ausente_planilha": "email_ausente_planilha",
  "explicacao_pagamento": "explicacao_pagamento",
  "filtros_conformidade": "filtros_conformidade",
  "informacoes_colaborador": "informacoes_colaborador",
  "informacoes_conta": "informacoes_conta",
  "informacoes_evento": "informacoes_evento",
  "informacoes_gestor": "informacoes_gestor",
  "informacoes_nr": "informacoes_nr",
  "instrucoes_importacao_conformidades": "instrucoes_importacao_conformidades",
  "nrs_cargo": "nrs_cargo",
  "nrs_unidade": "nrs_unidade",
  "organizar_equipes_evento": "organizar_equipes_evento",
  "selecionar_colaboradores_evento": "selecionar_colaboradores_evento",
  "selecionar_gestor_workspace": "selecionar_gestor_workspace",
  "selecionar_tipo_pergunta": "selecionar_tipo_pergunta"
} as const
