// Tipos centrales del modelo de "Documento" (planificación de clase).
// Reflejan fielmente las columnas de la tabla `public.documents` definida
// en supabase_schema.sql.

export type DocumentFileType = 'pdf' | 'word' | 'gdoc' | 'editor';

export type DocumentStatus = 'active' | 'deleted';

export type UserRole = 'admin' | 'titular' | 'colaborador';

/**
 * Representa una fila completa de la tabla `documents` tal como la
 * devuelve Supabase (por ejemplo, el resultado de un `select('*')`).
 */
export interface Document {
    id: string;
    title: string;
    author_id: string;
    author_name: string;
    author_role: UserRole | string;
    created_at: string;
    file_type: DocumentFileType;
    file_url: string | null;
    content: string | null;
    status: DocumentStatus;
    delete_reason: string | null;
    curso: string | null;
    grado: string | null;
    anio: string | null;
    carga_horaria: string | null;
    tematica: string | null;
    num_clase: string | null;
    recursos: string | null;
    etiquetas: string | null;
    next_class_id: string | null;
}

/**
 * Payload para crear un documento nuevo: `id` y `created_at` los genera
 * la base de datos, y el resto de los campos opcionales pueden omitirse
 * (quedan `null`/default en Supabase).
 */
export type NewDocument = Pick<Document, 'title' | 'author_id' | 'author_name' | 'author_role' | 'file_type' | 'status'> &
    Partial<Omit<Document, 'id' | 'created_at' | 'title' | 'author_id' | 'author_name' | 'author_role' | 'file_type' | 'status'>>;

/**
 * Payload para actualizaciones parciales (`.update({...})`) de un documento existente.
 */
export type DocumentUpdate = Partial<Omit<Document, 'id'>>;

/** Fila de la tabla `public.comments`, asociada a un documento. */
export interface DocumentComment {
    id: string;
    document_id: string;
    author_id: string;
    author_name: string;
    text: string;
    created_at: string;
}
