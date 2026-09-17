import type { Document } from '../types/document';

/**
 * Crea un `Document` completo de prueba, con valores por defecto razonables,
 * permitiendo sobreescribir sólo los campos que le interesan a cada test.
 */
export function makeDocument(overrides: Partial<Document> = {}): Document {
    return {
        id: 'doc-1',
        title: 'Clase de prueba',
        author_id: 'user-1',
        author_name: 'Prof. Test',
        author_role: 'titular',
        created_at: '2026-01-01T00:00:00.000Z',
        file_type: 'editor',
        file_url: null,
        content: '<p>Contenido de prueba</p>',
        status: 'active',
        delete_reason: null,
        curso: null,
        grado: null,
        anio: null,
        carga_horaria: null,
        tematica: null,
        num_clase: null,
        recursos: null,
        etiquetas: null,
        next_class_id: null,
        ...overrides,
    };
}
