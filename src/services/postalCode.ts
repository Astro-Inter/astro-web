import type { PostalAddress } from '../types/address'

export async function lookupPostalCode(cep: string, signal?: AbortSignal): Promise<PostalAddress> {
  try {
    const digits = cep.replace(/\D/g, '')
    if (!/^\d{8}$/.test(digits)) throw new Error('Informe um CEP com oito dígitos.')
    const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000)
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: requestSignal })
    if (!response.ok) throw new Error('A consulta de CEP está indisponível. Preencha o endereço manualmente ou tente novamente.')
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null) throw new Error('A consulta de CEP retornou uma resposta inválida. Preencha o endereço manualmente.')
    if ('erro' in body && (body.erro === true || body.erro === 'true')) throw new Error('CEP não encontrado. Confira o CEP ou preencha o endereço manualmente.')
    if (!('uf' in body) || typeof body.uf !== 'string' || !/^[A-Z]{2}$/.test(body.uf)
        || !('localidade' in body) || typeof body.localidade !== 'string' || !body.localidade.trim()) {
      throw new Error('A consulta de CEP retornou uma resposta inválida. Preencha o endereço manualmente.')
    }
    return {
      state: body.uf, city: body.localidade.trim(),
      neighborhood: 'bairro' in body && typeof body.bairro === 'string' ? body.bairro.trim() : '',
      street: 'logradouro' in body && typeof body.logradouro === 'string' ? body.logradouro.trim() : '',
    }
  } catch (error: unknown) {
    if (signal?.aborted) throw error
    if (error instanceof TypeError || (error instanceof Error && ['TimeoutError', 'SyntaxError'].includes(error.name))) {
      throw new Error('Não foi possível consultar o CEP. Preencha o endereço manualmente ou tente novamente.', { cause: error })
    }
    throw error
  }
}
