# Confirmação de identidade — SCRUM-516

A confirmação usa a conta atual do Firebase, com `EmailAuthProvider.credential(user.email, password)` e `reauthenticateWithCredential(user, credential)`, conforme a [documentação oficial](https://firebase.google.com/docs/auth/web/manage-users#re-authenticate_a_user). Não executa um novo login comum.

## Organização

- `src/services/identityConfirmation.ts`: valida a sessão esperada, reautentica e traduz erros do Firebase em mensagens públicas.
- `src/hooks/usePasswordConfirmation.ts`: mantém o estado temporário do formulário, impede envios simultâneos e descarta respostas após cancelamento, desmontagem ou troca de usuário.
- `src/types/identityConfirmation.ts`: contratos do estado e controlador.
- `src/components/passwordConfirmationForm/index.tsx`: campo, visibilidade da senha, carregamento e erros acessíveis; não acessa serviços.
- `src/components/passwordConfirmationModal/index.tsx`: usa o hook e libera uma única vez o callback que originou o modal, após o sucesso e o fechamento animado.
- `src/components/replaceAccountFlowModal/index.tsx`: reutiliza o mesmo hook/formulário na etapa de senha da transferência.

## Telas integradas

Todos os usos do modal de senha existente estão integrados: informações da empresa, planilha empresarial, endereços das unidades e pagamentos em configurações de workspace; ver tudo e editar em configurações de conta; editar gestores e colaboradores; substituir o gestor do workspace.

A confirmação protege a continuação que já estava associada a cada modal. Ela não adiciona endpoints nem transforma operações demonstrativas em persistência real. Outras ações que não possuíam esse modal continuam com seu fluxo existente.

## Reutilizar antes de uma ação

Uma tela precisa apenas manter a ação/recurso pendente e renderizar o modal. O callback não recebe a senha:

```tsx
{pendingRecordId && (
  <PasswordConfirmationModal
    className="record-password-modal"
    key={pendingRecordId}
    onCancel={() => setPendingRecordId(null)}
    onContinue={() => {
      const recordId = pendingRecordId
      setPendingRecordId(null)
      void deleteRecord(recordId) // operação da tela, com seu loading/erro
    }}
  />
)}
```

Use uma `key` que identifique a ação e o recurso quando o modal puder ser substituído enquanto aberto. Cada instância guarda o callback inicial e a conta que solicitou a ação. Uma confirmação não fica disponível para outras ações ou modais futuros. Para composições próprias de diálogo, reutilize `usePasswordConfirmation` e `PasswordConfirmationForm` como no fluxo de transferência, sem repetir o acesso ao Firebase.

O serviço também pode ser aguardado por outro controlador: `await confirmarIdentidadeDoUsuario(password, user.uid)`. Ele não abre um modal; o hook e os componentes cuidam da interface, do cancelamento e da continuação.

## Segurança e erros

A senha existe somente no estado transitório do campo e na chamada ao SDK; o estado é limpo já no início da tentativa e ao cancelar. Não é gravada em storage, context global, logs ou enviada à API própria. Não é normalizada com `trim`, pois espaços podem fazer parte da senha. O limite de 128 caracteres acompanha o campo/login atual do projeto.

Senha errada e credencial inválida, excesso de tentativas, falta de rede, conta desativada, sessão expirada, provedor sem senha e erros desconhecidos possuem mensagens apropriadas. Erros originais do SDK não são expostos nem anexados às mensagens públicas. Um erro mantém o modal aberto, bloqueia a continuação e permite tentar novamente com o campo vazio.

Durante a validação, campo, visibilidade e envio ficam desabilitados; Cancelar, Escape e clique no backdrop descartam a tentativa. O SDK não oferece cancelamento dessa requisição: a resposta tardia é ignorada e não libera a ação. Após sucesso, o formulário bloqueia novos envios enquanto o modal fecha. O consumo final confere novamente o UID autenticado.

A reautenticação é uma confirmação adicional no frontend. O backend deve continuar validando o token, a role/permissão e o acesso ao recurso; o usuário conhecer a própria senha não lhe concede permissões. Se a API exigir autenticação recente, deve validar também a idade de `auth_time` no token verificado pelo servidor. Nunca confie em um booleano enviado pelo cliente para autorizar uma operação.

## Verificar

Os testes automatizados usam Firebase simulado e verificam o serviço, o controlador, a ligação do modal e o HTML do formulário. Não utilizam uma conta real.

Para testar no Firebase configurado: entrar com e-mail/senha, abrir cada ação integrada, confirmar senha errada (sem continuação e campo limpo), confirmar senha correta (somente ação solicitada), cancelar antes e durante a validação, pressionar Enter/clique repetidamente, simular falha de rede e repetir a ação (uma nova confirmação deve ser exigida). Conferir no navegador que a requisição da senha vai ao Firebase e não à API do sistema. Testar também teclado, Escape, foco ao fechar e mensagens de erro/carregamento.

## Critérios DAD aplicáveis à alteração

- M03–M05 atendidos nesta alteração: apresentação no formulário, estado no hook, Firebase no serviço, contratos tipados e retorno assíncrono explícito. O build verifica os tipos.
- M06–M07 atendidos: estado do formulário agrupado e atualizado sem mutação; efeitos têm dependências e limpeza para descartar respostas após desmontagem.
- M12 atendido: carregamento, sucesso e erro estão no DOM e são verificados pelos testes do formulário.
- M11 parcial: label/input, botões, erros com `role="alert"` e feedback com `role="status"` verificados no HTML. Teclado, foco e contraste na interface renderizada aguardam teste manual; não foi usado leitor de tela.
- M13–M14 não avaliados nesta verificação funcional: esses critérios globais dependem do deploy e do histórico do projeto.
