# Confirmação de identidade

A confirmação reautentica a conta Firebase atual com e-mail e senha, usando EmailAuthProvider.credential e reauthenticateWithCredential. Não inicia uma sessão diferente.

## Organização do código

- src/services/identityConfirmation.ts: valida a sessão esperada, chama o SDK Firebase e traduz erros em mensagens públicas.
- src/hooks/usePasswordConfirmation.ts: controla o formulário, bloqueia envios simultâneos e descarta respostas após cancelamento, desmontagem ou troca de usuário.
- src/types/identityConfirmation.ts: tipos do estado e do controlador.
- src/components/passwordConfirmationForm/index.tsx: campo, visibilidade da senha, loading e mensagens acessíveis.
- src/components/passwordConfirmationModal/index.tsx: coordena o hook e libera somente o callback da ação que abriu o modal.
- src/components/replaceAccountFlowModal/index.tsx: reutiliza o formulário na etapa de senha da transferência de responsável.

## Ações integradas

A confirmação é usada antes de ver detalhes ou editar a própria conta, editar gestores e colaboradores, alterar informações da empresa, importar planilha, editar endereços ou pagamentos em configurações de workspace e substituir o gestor responsável.

O callback continua responsável pela ação original, incluindo chamada à API, loading e tratamento de erro. A confirmação não adiciona endpoints nem converte operações demonstrativas em persistência.

## Reutilização

A tela mantém a ação ou o registro pendente e renderiza o modal. O callback não recebe a senha:

    <PasswordConfirmationModal
      key={pendingRecordId}
      onCancel={() => setPendingRecordId(null)}
      onContinue={() => {
        const recordId = pendingRecordId
        setPendingRecordId(null)
        void deleteRecord(recordId)
      }}
    />

Use uma chave que identifique a ação e o recurso quando o modal puder ser substituído enquanto estiver aberto. Para composições próprias, reutilize usePasswordConfirmation e PasswordConfirmationForm, sem duplicar acesso ao Firebase.

O serviço também pode ser aguardado diretamente por um controlador com confirmarIdentidadeDoUsuario(password, user.uid); ele não abre interface.

## Segurança e erros

A senha existe somente no estado transitório do campo e na chamada ao SDK. O estado é limpo no início da tentativa e ao cancelar. A senha não é gravada em storage, contexto global ou logs e não é enviada à API Astro. Não se aplica trim, pois espaços podem fazer parte da senha.

Erros de credencial, limite de tentativas, rede, conta desativada, sessão expirada e provedor sem senha são mapeados para mensagens públicas. O modal permanece aberto e permite nova tentativa com o campo limpo. Durante a validação, campo, visibilidade e envio ficam desabilitados. Cancelar, Escape e clique no backdrop descartam a tentativa; como o SDK não cancela a requisição, uma resposta tardia é ignorada.

Após sucesso, o consumo confere novamente o UID autenticado. A API continua responsável por validar token, perfil, permissão e acesso ao recurso. Se exigir autenticação recente, deve verificar auth_time no token validado pelo servidor.
