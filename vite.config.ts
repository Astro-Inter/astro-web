import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiBaseUrl = env.VITE_API_URL?.trim().replace(/\/+$/, '')
  const passwordResetTarget = env.VITE_PASSWORD_RESET_API_URL?.trim().replace(/\/+$/, '')
  const dashboardTarget = env.VITE_DASHBOARD_API_PROXY_URL?.trim() || env.VITE_DASHBOARD_API_URL?.trim() || 'https://astro-dashboard-api.app-4str0.workers.dev'
  return {
    plugins: [react()],
    worker: { format: 'es' },
    // O leitor é importado ao continuar com a planilha. Prepará-lo ao iniciar
    // evita que a descoberta tardia de dependências recarregue o cadastro.
    optimizeDeps: {
      include: ['xlsx'],
    },
    server: {
      proxy: {
        ...(passwordResetTarget ? {
          '/password-reset-api': {
            target: passwordResetTarget,
            changeOrigin: true,
            rewrite: path => path.replace(/^\/password-reset-api(?=\/|$)/, ''),
            // Apenas no Vite: produção chama o Worker diretamente com CORS.
            configure: proxy => { proxy.on('proxyReq', request => request.removeHeader('origin')) },
          },
        } : {}),
        '/dashboard-api': {
          target: dashboardTarget,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/dashboard-api(?=\/|$)/, ''),
          configure: proxy => { proxy.on('proxyReq', request => request.removeHeader('origin')) },
        },
        ...(apiBaseUrl ? {
        '/api': {
          target: apiBaseUrl,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api(?=\/|$)/, ''),
          configure: proxy => {
            proxy.on('proxyReq', proxyRequest => {
              // O proxy faz a chamada de servidor para servidor. Encaminhar
              // a origem local faria a API rejeitar também o POST.
              proxyRequest.removeHeader('origin')
            })
          },
        },
        } : {}),
      },
    },
  }
})
