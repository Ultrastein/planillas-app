import { create } from 'zustand';

interface DocumentState {
    selectedDocId: string | null;
    setSelectedDocId: (id: string | null) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
    selectedDocId: null,
    setSelectedDocId: (id) => set({ selectedDocId: id }),
}));
