# Cargos e identidade autenticada — SCRUM-495

As sete chamadas em src/services/roles.ts usam exclusivamente o token Firebase
no header Authorization: Bearer. Não enviam firebaseUid no corpo nem firebase_uid
na query. Isso também vale para os seletores de cargos usados por gestores,
colaboradores e unidades, que reutilizam listRoles.

- GET /roles, /roles/{id}/nrs e /roles/{id}/nrs/options: sem query de identidade.
- POST /roles e PUT /roles/{id}: corpo com name e status.
- PATCH /roles/{id}/status: sem corpo e sem Content-Type JSON.
- POST /roles/{id}/nrs: corpo com nrs, mantendo nr e active em cada item.

Requisições mantêm tratamento de erros e AbortSignal. Se o cancelamento ocorrer
enquanto o token está sendo obtido, o fetch não é iniciado. A identidade e o
workspace efetivos são conferidos na API. Publique a API atualizada antes do web,
pois a versão anterior da API exigia UID nos parâmetros de entrada.
