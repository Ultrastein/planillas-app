// Shared type for rows of `public.documents` (see supabase_schema.sql).
export type DocumentFileType = 'pdf' | 'word' | 'gdoc' | 'editor';
export type DocumentStatus = 'active' | 'deleted';

export interface Document {
    id: string;
    title: string;
    author_id: string;
    author_name: string;
    author_role: string;
    created_at: string;
    file_type: DocumentFileType;
    file_url: string | null;
    content: string | null;
    status: DocumentStatus;
    delete_reason: string | null;
    curso?: string | null;
    grado?: string | null;
    anio?: string | null;
    carga_horaria?: string | null;
    tematica?: string | null;
    num_clase?: string | null;
    recursos?: string | null;
    etiquetas?: string | null;
    next_class_id?: string | null;
}
