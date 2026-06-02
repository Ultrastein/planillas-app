import { create } from 'zustand';

interface PendingCreateFromAI {
    title: string;
    content: string;
    metadata: {
        curso?: string;
        grado?: string;
        anio?: string;
        carga_horaria?: string;
        tematica?: string;
        num_clase?: string;
    };
}

interface EditorSelection {
    text: string;
    from: number;
    to: number;
}

interface DocumentState {
    selectedDocId: string | null;
    setSelectedDocId: (id: string | null) => void;
    selectedDoc: any | null;
    setSelectedDoc: (doc: any | null) => void;
    allDocuments: any[];
    setAllDocuments: (docs: any[]) => void;
    editorSelection: EditorSelection | null;
    setEditorSelection: (sel: EditorSelection | null) => void;
    pendingReplacement: string | null;
    setPendingReplacement: (text: string | null) => void;
    pendingCreateFromAI: PendingCreateFromAI | null;
    setPendingCreateFromAI: (data: PendingCreateFromAI | null) => void;
    isExpanded: boolean;
    setIsExpanded: (val: boolean) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
    selectedDocId: null,
    setSelectedDocId: (id) => set({ selectedDocId: id }),
    selectedDoc: null,
    setSelectedDoc: (doc) => set({ selectedDoc: doc }),
    allDocuments: [],
    setAllDocuments: (docs) => set({ allDocuments: docs }),
    editorSelection: null,
    setEditorSelection: (sel) => set({ editorSelection: sel }),
    pendingReplacement: null,
    setPendingReplacement: (text) => set({ pendingReplacement: text }),
    pendingCreateFromAI: null,
    setPendingCreateFromAI: (data) => set({ pendingCreateFromAI: data }),
    isExpanded: false,
    setIsExpanded: (val) => set({ isExpanded: val }),
}));
