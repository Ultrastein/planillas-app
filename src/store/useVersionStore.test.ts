import { describe, it, expect, beforeEach } from 'vitest';
import { useVersionStore } from './useVersionStore';
import type { DocumentVersion } from './useVersionStore';

const makeVersion = (overrides: Partial<DocumentVersion> = {}): DocumentVersion => ({
    id: 'v1',
    document_id: 'doc-1',
    content: '<p>Versión 1</p>',
    author_id: 'user-1',
    author_name: 'Prof. Test',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
});

describe('useVersionStore', () => {
    beforeEach(() => {
        useVersionStore.setState({ versions: [], previewVersion: null, isLoading: false });
    });

    it('sets versions correctly', () => {
        const versions = [makeVersion({ id: 'v1' }), makeVersion({ id: 'v2' })];
        useVersionStore.getState().setVersions(versions);
        expect(useVersionStore.getState().versions).toEqual(versions);
    });

    it('sets previewVersion correctly', () => {
        const version = makeVersion();
        useVersionStore.getState().setPreviewVersion(version);
        expect(useVersionStore.getState().previewVersion).toEqual(version);

        useVersionStore.getState().setPreviewVersion(null);
        expect(useVersionStore.getState().previewVersion).toBeNull();
    });

    it('addVersion prepends the new version to the list', () => {
        const first = makeVersion({ id: 'v1' });
        const second = makeVersion({ id: 'v2' });
        useVersionStore.getState().setVersions([first]);

        useVersionStore.getState().addVersion(second);

        expect(useVersionStore.getState().versions).toEqual([second, first]);
    });

    it('sets loading correctly', () => {
        useVersionStore.getState().setLoading(true);
        expect(useVersionStore.getState().isLoading).toBe(true);
    });
});
