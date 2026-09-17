import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentEditor } from './DocumentEditor';
import { useAuthStore } from '../../store/useAuthStore';
import { useDocumentStore } from '../../store/useDocumentStore';
import { useCategoryStore } from '../../store/useCategoryStore';
import { supabase } from '../../lib/supabase';
import { makeDocument } from '../../test/fixtures';

// Mock Lucide icons to avoid jsdom render issues with SVG
vi.mock('lucide-react', () => ({
    Folder: () => <div>Folder</div>,
    FolderOpen: () => <div>FolderOpen</div>,
    Plus: () => <div>Plus</div>,
    FileText: () => <div>FileText</div>,
    Search: () => <div>Search</div>,
    X: () => <div>X</div>,
    ArrowLeft: () => <div>ArrowLeft</div>,
    Maximize2: () => <div>Maximize2</div>,
    Minimize2: () => <div>Minimize2</div>,
    Copy: () => <div>Copy</div>,
    Check: () => <div>Check</div>,
}));

// Mock RichTextEditor — its tiptap internals aren't the focus of this test.
vi.mock('./RichTextEditor', () => ({
    RichTextEditor: ({ content }: { content: string }) => <div data-testid="rich-text-editor">{content}</div>,
}));

const TITULAR_PROFILE = { id: 'user-1', email: 'prof@edu.ar', name: 'Prof. Test', role: 'titular' as const, auth_provider: 'local' };

function mockDocumentsTable(docs = [makeDocument({ id: 'doc-1', title: 'Clase 1' }), makeDocument({ id: 'doc-2', title: 'Clase 2' })]) {
    const createdDoc = makeDocument({ id: 'doc-new', title: 'Clase Nueva' });
    const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => Promise.resolve({ data: docs, error: null })),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => Promise.resolve({ data: createdDoc, error: null })),
    };
    return { builder, createdDoc };
}

function mockCommentsTable() {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
}

function mockCategoriesTable() {
    return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [{ id: 'cat-1', name: 'Robótica' }], error: null }),
    };
}

describe('DocumentEditor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.setState({ profile: TITULAR_PROFILE, user: null, isLoading: false });
        useDocumentStore.setState({
            selectedDocId: null,
            selectedDoc: null,
            allDocuments: [],
            editorSelection: null,
            pendingReplacement: null,
            pendingCreateFromAI: null,
            isExpanded: false,
        });
        useCategoryStore.setState({ categories: [], loading: false, error: null });
    });

    it('lists documents fetched from Supabase', async () => {
        const { builder } = mockDocumentsTable();
        const categoriesBuilder = mockCategoriesTable();
        supabase.from = vi.fn().mockImplementation((table: string) => {
            if (table === 'documents') return builder;
            if (table === 'thematic_categories') return categoriesBuilder;
            if (table === 'comments') return mockCommentsTable();
            throw new Error(`Unexpected table: ${table}`);
        });

        render(<DocumentEditor />);

        await waitFor(() => {
            expect(screen.getByText('Clase 1')).toBeInTheDocument();
            expect(screen.getByText('Clase 2')).toBeInTheDocument();
        });
    });

    it('selects a document when its card is clicked and shows the viewer', async () => {
        const { builder } = mockDocumentsTable();
        const categoriesBuilder = mockCategoriesTable();
        supabase.from = vi.fn().mockImplementation((table: string) => {
            if (table === 'documents') return builder;
            if (table === 'thematic_categories') return categoriesBuilder;
            if (table === 'comments') return mockCommentsTable();
            throw new Error(`Unexpected table: ${table}`);
        });

        render(<DocumentEditor />);

        await waitFor(() => expect(screen.getByText('Clase 1')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Clase 1'));

        await waitFor(() => {
            expect(useDocumentStore.getState().selectedDoc?.title).toBe('Clase 1');
        });
        expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    });

    it('creates a new document from the creation modal', async () => {
        const { builder, createdDoc } = mockDocumentsTable();
        const categoriesBuilder = mockCategoriesTable();
        supabase.from = vi.fn().mockImplementation((table: string) => {
            if (table === 'documents') return builder;
            if (table === 'thematic_categories') return categoriesBuilder;
            if (table === 'comments') return mockCommentsTable();
            throw new Error(`Unexpected table: ${table}`);
        });

        render(<DocumentEditor />);

        await waitFor(() => expect(screen.getByText('Clase 1')).toBeInTheDocument());

        fireEvent.click(screen.getByText('+ Nueva Clase'));

        const titleInput = screen.getByPlaceholderText('Título de la clase o material');
        fireEvent.change(titleInput, { target: { value: 'Clase Nueva' } });

        fireEvent.click(screen.getByText('Crear y Publicar'));

        await waitFor(() => {
            expect(builder.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Clase Nueva',
                    author_id: TITULAR_PROFILE.id,
                    author_name: TITULAR_PROFILE.name,
                    status: 'active',
                })
            );
        });

        await waitFor(() => {
            expect(useDocumentStore.getState().selectedDoc?.id).toBe(createdDoc.id);
        });
    });
});
