// Catálogo de listas/showcases. name identifica a lista; cada valor em items identifica um item clicado.
// Exemplo: sidebar.items.gestores resulta em showcase_click = "gestores".
export const SHOWCASES = {
  "compartilhado": {
    "principal": {
      "sidebar": {
        "name": "sidebar",
        "items": {
          "home": "home",
          "gestores": "gestores",
          "colaboradores": "colaboradores",
          "conformidade": "conformidade",
          "unidades": "unidades",
          "cargos": "cargos",
          "formularios": "formularios",
          "eventos": "eventos",
          "configuracoes": "configuracoes",
          "conta": "conta"
        }
      }
    }
  },
  "home": {
    "dialog": {
      "notificacoes": {
        "name": "notificacoes",
        "items": {
          "pendenciaTreinamento": "pendencia_de_treinamento",
          "eventoAgendado": "evento_agendado",
          "conformidade": "conformidade"
        }
      }
    }
  },
  "gestores": {
    "principal": {
      "tabela": {
        "name": "lista_gestores"
      }
    }
  },
  "colaboradores": {
    "principal": {
      "tabela": {
        "name": "lista_colaboradores"
      }
    }
  },
  "conformidade": {
    "principal": {
      "tabela": {
        "name": "lista_conformidades"
      }
    }
  },
  "unidade": {
    "principal": {
      "tabela": {
        "name": "lista_unidades"
      }
    },
    "dialog": {
      "lista": {
        "name": "lista_dialog_unidade"
      }
    }
  },
  "evento": {
    "dialog": {
      "lista": {
        "name": "lista_dialog_evento"
      }
    }
  },
  "cargo": {
    "dialog": {
      "lista": {
        "name": "lista_dialog_cargo"
      }
    }
  }
} as const

export const SHOWCASE_NAMES = {
  "calendario_eventos": "calendario_eventos",
  "lista_cargos": "lista_cargos",
  "lista_colaboradores": "lista_colaboradores",
  "lista_conformidades": "lista_conformidades",
  "lista_dialog_cargo": "lista_dialog_cargo",
  "lista_dialog_evento": "lista_dialog_evento",
  "lista_dialog_unidade": "lista_dialog_unidade",
  "lista_formularios": "lista_formularios",
  "lista_gestores": "lista_gestores",
  "lista_unidades": "lista_unidades",
  "notificacoes": "notificacoes",
  "sidebar": "sidebar"
} as const

export const SIDEBAR_ITEMS: Record<string, string> = {
  '/mainHomeScreen': 'home', '/mainManagerScreen': 'gestores', '/mainEmployeerScreen': 'colaboradores',
  '/mainConformityScreen': 'conformidade', '/mainUnitScreen': 'unidades', '/mainPositionScreen': 'cargos',
  '/mainFormScreen': 'formularios', '/mainEventScreen': 'eventos', '/mainWorkspaceSettingsScreen': 'configuracoes',
  '/mainAccountScreen': 'conta',
}
export const NOTIFICATION_ITEMS = { training: 'pendencia_de_treinamento', event: 'evento_agendado', compliance: 'conformidade' } as const
