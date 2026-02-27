import { create } from 'zustand';

export interface DocumentVersion {
    id: string;
    document_id: string;
    content: string; // HTML or JSON
    author_id: string;
    author_name: string;
    created_at: string;
}

interface VersionState {
    versions: DocumentVersion[];
    previewVersion: DocumentVersion | null; // If null, we are editing the CURRENT document
    isLoading: boolean;
    setVersions: (versions: DocumentVersion[]) => void;
    setPreviewVersion: (version: DocumentVersion | null) => void;
    addVersion: (version: DocumentVersion) => void;
    setLoading: (loading: boolean) => void;
}

export const useVersionStore = create<VersionState>((set) => ({
    versions: [],
    previewVersion: null,
    isLoading: false,
    setVersions: (versions) => set({ versions }),
    setPreviewVersion: (previewVersion) => set({ previewVersion }),
    addVersion: (version) => set((state) => ({ versions: [version, ...state.versions] })),
    setLoading: (isLoading) => set({ isLoading }),
}));
