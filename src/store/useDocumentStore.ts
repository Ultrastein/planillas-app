import { create } from 'zustand';

interface DocumentState {
    selectedDocId: string | null;
    setSelectedDocId: (id: string | null) => void;
    isExpanded: boolean;
    setIsExpanded: (val: boolean) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
    selectedDocId: null,
    setSelectedDocId: (id) => set({ selectedDocId: id }),
    isExpanded: false,
    setIsExpanded: (val) => set({ isExpanded: val }),
}));
