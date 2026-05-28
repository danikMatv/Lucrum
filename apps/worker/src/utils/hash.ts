const PBKDF2_ITERATIONS = 100_000
const HASH_LENGTH_BITS = 256

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

const base64ToBytes = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

const constantTimeEqual = (left: Uint8Array, right: Uint8Array) => {
  if (left.length !== right.length) {
    return false
  }

  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index]
  }
  return diff === 0
}

const derivePasswordHash = async (password: string, salt: Uint8Array, iterations: number) => {
  const encodedPassword = new TextEncoder().encode(password)
  const key = await crypto.subtle.importKey('raw', encodedPassword, 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    key,
    HASH_LENGTH_BITS,
  )
  return new Uint8Array(bits)
}

export const hashPassword = async (password: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derivePasswordHash(password, salt, PBKDF2_ITERATIONS)
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`
}

export const verifyPassword = async (password: string, storedHash: string) => {
  const [algorithm, iterationsValue, saltValue, hashValue] = storedHash.split('$')
  if (algorithm !== 'pbkdf2' || !iterationsValue || !saltValue || !hashValue) {
    return false
  }

  const iterations = Number(iterationsValue)
  if (!Number.isInteger(iterations) || iterations <= 0) {
    return false
  }

  const salt = base64ToBytes(saltValue)
  const expectedHash = base64ToBytes(hashValue)
  const actualHash = await derivePasswordHash(password, salt, iterations)
  return constantTimeEqual(actualHash, expectedHash)
}
