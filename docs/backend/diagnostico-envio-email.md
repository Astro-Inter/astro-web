# Diagnóstico do envio de e-mail

Consulta em 12/10/2026:

- `POST /add-manager-email` está acessível: uma solicitação de diagnóstico com corpo vazio recebeu HTTP 400, sem inserir e-mail na fila.
- `astro-email-worker/.github/workflows/email-workers.yml` consta como `disabled_manually` na API do GitHub.
- Última execução registrada desse workflow: 01/10/2026, concluída com sucesso, ID `36879251372`.
- O usuário recebeu mensagens após essa data; portanto, a desativação isoladamente não confirma a origem da falha atual. Pode existir execução manual local ou outro serviço consumindo a fila.
- Nenhuma solicitação real de e-mail, execução do worker ou reativação foi realizada neste diagnóstico.

O workflow consome as filas de workspace e colaboradores. Confirmar qual consumidor a equipe usa antes de reativá-lo, pois processos diferentes podem disparar mensagens e substituir chaves. Para identificar a falha do consumidor ativo, conferir seus logs de conexão Redis, retirada da fila, SMTP e reinserção em caso de falha. A resposta 204 da API confirma somente a inclusão na fila; não comprova entrega. O popup foi ajustado para apresentar a solicitação recebida.

## Reativação autorizada

Em 12/10/2026, após autorização explícita do usuário para enviar os e-mails pendentes das duas filas, o workflow foi reativado e executado manualmente. Execução `38291539005`, concluída com sucesso em 20 segundos. O agendamento voltou ao estado `active`. Conclusão do worker não comprova recebimento na caixa de entrada de cada destinatário.

## Conferência após atualizar a main do frontend

- Main do frontend integrada: `781bd06517b55767bf4e080fa49e8cee27d09f25`, preservando as mudanças locais do cadastro. As novidades são Home, unidades e confirmação de identidade; não alteram o transporte de e-mails.
- A segunda execução manual autorizada, `38292195406`, registrou dois envios de workspace e fila vazia, sem erro do worker.
- A execução automática `38329772860` terminou com sucesso, mas registrou zero envios de workspace e fila vazia.
- API e worker usam o nome de fila `processamento:email:workspace`. Isso não confirma que usam a mesma instância Redis; as credenciais não foram consultadas.
- A main da API consultada (`5c21a4d4c239e6c9c875bc0ac254bc2972087781`) continua apenas executando RPUSH ao solicitar código. Não dispara o worker após o enfileiramento.
- A configuração de transporte SMTP descarta a resposta detalhada de `sendMail`; os logs não permitem associar cada envio a um destinatário nem comprovar entrega na caixa postal.

Nenhuma nova execução ou e-mail de teste foi disparado nessa conferência. Ainda não está identificada a causa específica do reenvio não recebido. Para fechar o diagnóstico, correlacionar a solicitação real (HTTP 204 e e-mail informado), a mesma instância Redis, o consumo do item e a aceitação SMTP, com dados sensíveis protegidos. Não concluir entrega nem chave inválida a partir apenas do sucesso do job.
