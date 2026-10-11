import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiBaseUrl = env.VITE_API_URL?.trim().replace(/\/+$/, '')
  return {
    plugins: [react()],
    // O leitor é importado ao continuar com a planilha. Prepará-lo ao iniciar
    // evita que a descoberta tardia de dependências recarregue o cadastro.
    optimizeDeps: {
      include: ['xlsx'],
    },
    server: {
      proxy: apiBaseUrl ? {
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
      } : undefined,
    },
  }
})
