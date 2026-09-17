/**
 * Extrae un mensaje legible de un error de tipo `unknown` (lo que Supabase,
 * fetch y JS en general lanzan en un `catch`), evitando el uso de `any`.
 */
export function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
        return (err as { message: string }).message;
    }
    return 'Error desconocido';
}
