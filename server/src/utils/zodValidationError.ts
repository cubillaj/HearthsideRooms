export const validationMessage = (error: unknown) => {
    const valMes = Object.values(error as Record<string, unknown>).flat() || 'Invalid data'

    const message = Array.isArray(valMes) ? valMes.join(', ') : String(valMes)
    return message
}