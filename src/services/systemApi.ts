export function getSystemApiBaseUrl(): string {
  const apiBaseUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')
  if (!apiBaseUrl) throw new Error('A URL da API principal não está configurada.')
  // No desenvolvimento, o Vite encaminha a chamada ao backend pelo mesmo
  // domínio da página, evitando o preflight CORS bloqueado pela API atual.
  return import.meta.env.DEV ? '/api' : apiBaseUrl
}
