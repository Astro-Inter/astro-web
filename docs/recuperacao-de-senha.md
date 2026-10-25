# Recuperação de senha — SCRUM-625

O fluxo usa o microsserviço https://github.com/Astro-Inter/astro-password-reset. Configure VITE_PASSWORD_RESET_API_URL com a URL real retornada pelo deploy Cloudflare, também nas variables do GitHub Actions. Em desenvolvimento use http://127.0.0.1:8787 e inclua a origem e porta do Vite no ALLOWED_ORIGINS do Worker. Sem URL configurada a interface informa indisponibilidade, sem simular sucesso.

POST /auth/forgot-password recebe {email}. A mensagem não confirma se uma conta existe. POST /auth/reset-password recebe {oobCode,newPassword}, sem e-mail. Somente success:true em resposta HTTP de sucesso abre /passwordChanged. Os erros seguros do backend são mapeados para mensagens locais; o corpo bruto não aparece na UI. A validação reutiliza a política atual Astro (8–128 caracteres, maiúscula, minúscula e número); Firebase pode exigir requisitos adicionais e continua sendo a autoridade final.

A rota /replacePassword exige mode=resetPassword e um único oobCode não vazio. O bootstrap passwordResetLink captura o código em memória e limpa a query antes do tracking. Não persiste o código; atualizar a página exige reabrir o link original. GTM fica desabilitado na sessão iniciada por essa rota e referrer é no-referrer. continueUrl e apiKey da URL não selecionam destinos ou projeto Firebase.

No Firebase Console, configure a Custom Email Action URL para https://astro-inter.github.io/astro-web/replacePassword e autorize o domínio astro-inter.github.io. A URL é global aos templates do projeto segundo a documentação Firebase: inventarie os demais fluxos antes de ativá-la. Esta implementação rejeita modos diferentes de resetPassword, sem consumir os respectivos códigos. Não mude a URL global em produção até garantir os outros fluxos. O Worker não configura o Console e continueUrl não substitui essa configuração.

O workflow Pages injeta a variável de API e cria entradas estáticas para replacePassword e passwordChanged, além do fallback 404 existente. Após publicar, verificar as duas rotas diretamente e confirmar que o redirect de diretório do Pages preserva a query. O servidor Vite local não prova esse comportamento do host publicado.

## Evidências

- Build TypeScript/Vite aprovado; 391 testes aprovados, incluindo oito testes de recuperação com Firebase/API simulados.
- Integração local do serviço real do Web com o handler do Worker aprovada para envio, confirmação e código expirado, sem e-mails reais.
- Navegador local: ausência de código bloqueia formulário, link funciona com Tab/Enter, envio vazio mostra erro e ausência da URL do Worker mostra indisponibilidade. Link fictício tem query removida e apresenta formulário. Link secundário revisado com espaçamento, alinhamento central e foco visível.
- Nenhum teste com credenciais/códigos reais ou alteração de senha real foi executado. Firebase Console, deploy Worker e validação final no Pages estão pendentes.

## Critérios DAD aplicáveis

M01/M02: arquivos novos em src são somente TypeScript, página preservada em pasta/index.tsx; CSS em styles. M03–M05: apresentação reutilizada, contratos tipados e fetch somente no serviço. M06/M07: estado agrupado e cancelamento no cleanup com dependências explícitas. M10: rotas e Link/useNavigate existentes preservados. M12: loading, erro e sucesso cobertos no DOM. E07/E08: conteúdo interpolado e validação em utils. E03 parcial: cancelamento existe no hook, mas o retorno é inferido; não há auditoria global deste extra.

M11 parcial: labels, alertas, foco e Tab/Enter conferidos no fluxo; a cor do novo link tem contraste acima de 4,5:1 no fundo, mas a tela mantém cores preexistentes que exigem auditoria completa. M13 pendente para esta alteração até publicar e verificar Pages. M14 não foi auditado no projeto inteiro; os commits desta demanda usam datas reais e intervalo mínimo de cinco minutos. E04 e demais extras globais não foram reavaliados. Não se declara conformidade global por esta entrega.
