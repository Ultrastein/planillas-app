// Supabase Edge Function: admin-actions
//
// Centraliza las operaciones administrativas que antes se hacían desde el
// cliente con la Service Role Key (src/lib/supabaseAdmin.ts, ya eliminado).
// La Service Role Key SOLO se usa acá, del lado del servidor, y nunca llega
// al bundle del navegador.
//
// Requiere `verify_jwt: true` (configurado en el deploy), por lo que
// Supabase ya valida la firma del JWT antes de invocar el handler; acá
// además verificamos que el usuario autenticado tenga role = 'admin' en
// public.users antes de permitir cualquier acción.
//
// Acciones soportadas (body: { action: string, payload: {...} }):
//   - create_user:    crea un usuario en auth.users + fija su rol en public.users
//   - reset_password: fuerza la contraseña de otro usuario (auth.users)

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Role = 'admin' | 'titular' | 'colaborador';

interface CreateUserPayload {
    email: string;
    password: string;
    name: string;
    role: Role;
}

interface ResetPasswordPayload {
    target_user_id: string;
    new_password: string;
}

function jsonResponse(body: unknown, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}

function errorResponse(message: string, status: number): Response {
    return jsonResponse({ error: message }, status);
}

/** Cliente server-side con la Service Role Key. Nunca se expone al cliente. */
function getServiceClient(): SupabaseClient {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Faltan variables de entorno SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en la Edge Function.');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

/** Valida el JWT recibido y devuelve el id del usuario autenticado, o null. */
async function getAuthenticatedUserId(req: Request, serviceClient: SupabaseClient): Promise<string | null> {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader) return null;

    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return null;

    // getUser con la service key + el JWT del caller valida el token contra
    // GoTrue sin necesitar el anon key ni recrear otro cliente.
    const { data, error } = await serviceClient.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
}

async function isAdmin(serviceClient: SupabaseClient, userId: string): Promise<boolean> {
    const { data, error } = await serviceClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    if (error || !data) return false;
    return data.role === 'admin';
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

async function handleCreateUser(serviceClient: SupabaseClient, payload: Partial<CreateUserPayload>): Promise<Response> {
    const { email, password, name, role } = payload;

    if (!isNonEmptyString(email) || !isNonEmptyString(password) || !isNonEmptyString(name)) {
        return errorResponse('Faltan datos: email, password y name son obligatorios.', 400);
    }
    if (role !== 'admin' && role !== 'titular' && role !== 'colaborador') {
        return errorResponse('El rol debe ser admin, titular o colaborador.', 400);
    }

    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
    });

    if (authError) {
        return errorResponse(authError.message, 400);
    }
    if (!authData.user) {
        return errorResponse('No se pudo crear el usuario en auth.', 500);
    }

    // El trigger handle_new_user() ya insertó la fila en public.users con
    // role = 'colaborador' por defecto; acá fijamos el rol elegido.
    const { error: dbError } = await serviceClient
        .from('users')
        .update({ role })
        .eq('id', authData.user.id);

    if (dbError) {
        return errorResponse(`Usuario creado, pero falló al fijar el rol: ${dbError.message}`, 500);
    }

    return jsonResponse({ user: { id: authData.user.id, email: authData.user.email } }, 200);
}

async function handleResetPassword(serviceClient: SupabaseClient, payload: Partial<ResetPasswordPayload>): Promise<Response> {
    const { target_user_id, new_password } = payload;

    if (!isNonEmptyString(target_user_id) || !isNonEmptyString(new_password)) {
        return errorResponse('Faltan datos: target_user_id y new_password son obligatorios.', 400);
    }

    const { error } = await serviceClient.auth.admin.updateUserById(target_user_id, {
        password: new_password,
    });

    if (error) {
        return errorResponse(error.message, 400);
    }

    return jsonResponse({ success: true }, 200);
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    if (req.method !== 'POST') {
        return errorResponse('Método no permitido, usá POST.', 405);
    }

    let serviceClient: SupabaseClient;
    try {
        serviceClient = getServiceClient();
    } catch (err) {
        console.error('admin-actions config error:', err);
        return errorResponse('Error de configuración del servidor.', 500);
    }

    const userId = await getAuthenticatedUserId(req, serviceClient);
    if (!userId) {
        return errorResponse('No autenticado.', 401);
    }

    const admin = await isAdmin(serviceClient, userId);
    if (!admin) {
        return errorResponse('No tenés permisos de administrador para realizar esta acción.', 403);
    }

    let body: { action?: string; payload?: Record<string, unknown> };
    try {
        body = await req.json();
    } catch {
        return errorResponse('Body inválido, se esperaba JSON.', 400);
    }

    const { action, payload } = body;
    if (!isNonEmptyString(action)) {
        return errorResponse('Falta la acción a ejecutar.', 400);
    }

    try {
        switch (action) {
            case 'create_user':
                return await handleCreateUser(serviceClient, (payload ?? {}) as Partial<CreateUserPayload>);
            case 'reset_password':
                return await handleResetPassword(serviceClient, (payload ?? {}) as Partial<ResetPasswordPayload>);
            default:
                return errorResponse(`Acción desconocida: ${action}`, 400);
        }
    } catch (err) {
        console.error('admin-actions unhandled error:', err);
        const message = err instanceof Error ? err.message : 'Error inesperado.';
        return errorResponse(message, 500);
    }
});
