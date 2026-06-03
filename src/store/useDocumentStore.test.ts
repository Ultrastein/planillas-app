import { describe, it, expect, beforeEach } from 'vitest';
import { useDocumentStore } from './useDocumentStore';

describe('useDocumentStore', () => {
    beforeEach(() => {
        useDocumentStore.setState({
            selectedDocId: null,
            selectedDoc: null,
            allDocuments: [],
            editorSelection: null,
            pendingReplacement: null,
            pendingCreateFromAI: null,
            isExpanded: false,
        });
    });

    it('sets selectedDoc correctly', () => {
        const doc = { id: '1', title: 'Test' };
        useDocumentStore.getState().setSelectedDoc(doc);
        expect(useDocumentStore.getState().selectedDoc).toEqual(doc);
    });

    it('sets allDocuments correctly', () => {
        const docs = [{ id: '1' }, { id: '2' }];
        useDocumentStore.getState().setAllDocuments(docs);
        expect(useDocumentStore.getState().allDocuments).toHaveLength(2);
    });

    it('sets editorSelection correctly', () => {
        const sel = { text: 'hola mundo', from: 5, to: 15 };
        useDocumentStore.getState().setEditorSelection(sel);
        expect(useDocumentStore.getState().editorSelection).toEqual(sel);
    });

    it('sets pendingCreateFromAI correctly', () => {
        const payload = { title: 'Nueva Clase', content: '<p>...</p>', metadata: {} };
        useDocumentStore.getState().setPendingCreateFromAI(payload);
        expect(useDocumentStore.getState().pendingCreateFromAI).toEqual(payload);
        useDocumentStore.getState().setPendingCreateFromAI(null);
        expect(useDocumentStore.getState().pendingCreateFromAI).toBeNull();
    });

    it('sets pendingReplacement correctly', () => {
        const replacement = { text: 'texto mejorado', from: 5, to: 20 };
        useDocumentStore.getState().setPendingReplacement(replacement);
        expect(useDocumentStore.getState().pendingReplacement).toEqual(replacement);
        useDocumentStore.getState().setPendingReplacement(null);
        expect(useDocumentStore.getState().pendingReplacement).toBeNull();
    });
});
