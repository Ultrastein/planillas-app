# Planillas App — Mejoras Completas + IA Avanzada

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el AiSidebar en un hub de IA con 4 pestañas (Generar, Analizar, Mejorar, Chat), agregar seguridad y sistema de toasts, y añadir features UX (PDF, duplicar, plantillas).

**Architecture:** La comunicación entre `DocumentEditor` (que posee el estado de documentos) y `AiSidebar` (montado en `DesktopLayout`) se hace a través de `useDocumentStore` extendido. El sidebar lee `selectedDoc`, `allDocuments` y `editorSelection` del store; escribe `pendingCreateFromAI` y `pendingReplacement` que `DocumentEditor` y `RichTextEditor` consumen en `useEffect`.

**Tech Stack:** React 19, TypeScript, TipTap v3, Zustand v5, Vitest + Testing Library, @google/genai (Gemini 2.5 Flash), Supabase JS v2

---

## Mapa de archivos

| Archivo | Acción | Qué hace |
|---------|--------|----------|
| `src/data/templates.ts` | Crear | 4 plantillas rápidas de IA |
| `src/store/useDocumentStore.ts` | Modificar | Agrega selectedDoc, allDocuments, editorSelection, pendingReplacement, pendingCreateFromAI |
| `src/features/ai/aiService.ts` | Modificar | +5 funciones: generateFullPlan, generateRubric, suggestActivities, generateExecutiveSummary, improveText |
| `src/features/ai/AiSidebar.tsx` | Reescribir | Hub con 4 tabs |
| `src/features/ai/AiSidebar.module.css` | Modificar | Estilos de tabs |
| `src/features/editor/RichTextEditor.tsx` | Modificar | Props: onSelectionChange, selectionReplace, onSelectionReplaceDone |
| `src/features/editor/DocumentEditor.tsx` | Modificar | Sync store, AI creation handler, selection wiring, Duplicar, PDF, plantillas en modal |
| `src/features/auth/AuthPage.tsx` | Modificar | Eliminar botón con credenciales hardcodeadas |
| `src/components/Toast/useToast.ts` | Crear | Hook para gestión de toasts |
| `src/components/Toast/Toast.tsx` | Crear | Componente visual del toast |
| `src/components/Toast/ToastContainer.tsx` | Crear | Contenedor fijo con lista de toasts |
| `src/components/ConfirmModal.tsx` | Crear | Modal de confirmación para acciones destructivas |
| `src/App.tsx` | Modificar | Montar ToastContainer |

---

## Task 1: Crear `src/data/templates.ts`

**Files:**
- Create: `src/data/templates.ts`

- [ ] **Step 1: Crear el archivo de plantillas**

```typescript
// src/data/templates.ts
export interface QuickTemplate {
    id: string;
    name: string;
    icon: string;
    prompt: string;
}

export const QUICK_TEMPLATES: QuickTemplate[] = [
    {
        id: 'electricidad',
        name: 'Electricidad',
        icon: '⚡',
        prompt: 'Clase de taller de electricidad para secundaria técnica. Incluir: conceptos básicos de circuitos, actividad práctica de armado, evaluación de seguridad eléctrica y EPP requerido.'
    },
    {
        id: 'robotica',
        name: 'Robótica',
        icon: '🤖',
        prompt: 'Clase de taller de robótica con Arduino para secundaria técnica. Incluir: introducción teórica, programación de pines digitales o sensores, actividad práctica de construcción y prueba de circuito.'
    },
    {
        id: 'programacion',
        name: 'Programación',
        icon: '🖥️',
        prompt: 'Clase de programación y pensamiento computacional para secundaria. Incluir: concepto algorítmico, ejercicio de pseudocódigo o código en Scratch/Python, y actividad de resolución de problemas.'
    },
    {
        id: 'digital',
        name: 'Ciudadanía Digital',
        icon: '📱',
        prompt: 'Clase sobre ciudadanía digital y uso responsable de tecnología para adolescentes. Incluir: análisis de caso real, debate guiado, y compromisos de uso seguro en redes.'
    },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/data/templates.ts
git commit -m "feat(data): add quick AI templates for lesson generation"
```

---

## Task 2: Expandir `src/store/useDocumentStore.ts`

**Files:**
- Modify: `src/store/useDocumentStore.ts`
- Create: `src/store/useDocumentStore.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```typescript
// src/store/useDocumentStore.test.ts
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
        useDocumentStore.getState().setPendingReplacement('texto mejorado');
        expect(useDocumentStore.getState().pendingReplacement).toBe('texto mejorado');
        useDocumentStore.getState().setPendingReplacement(null);
        expect(useDocumentStore.getState().pendingReplacement).toBeNull();
    });
});
```

- [ ] **Step 2: Verificar que falla**

```bash
npx vitest run src/store/useDocumentStore.test.ts
```
Expected: FAIL — las propiedades nuevas no existen aún.

- [ ] **Step 3: Implementar el store expandido**

```typescript
// src/store/useDocumentStore.ts
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
```

- [ ] **Step 4: Verificar que pasa**

```bash
npx vitest run src/store/useDocumentStore.test.ts
```
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/useDocumentStore.ts src/store/useDocumentStore.test.ts
git commit -m "feat(store): expand useDocumentStore with AI communication state"
```

---

## Task 3: Agregar funciones a `src/features/ai/aiService.ts`

**Files:**
- Modify: `src/features/ai/aiService.ts`
- Create: `src/features/ai/aiService.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```typescript
// src/features/ai/aiService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
    GoogleGenAI: vi.fn(() => ({
        models: { generateContent: mockGenerateContent }
    }))
}));

vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');

import {
    generateFullPlan,
    generateRubric,
    suggestActivities,
    generateExecutiveSummary,
    improveText
} from './aiService';

describe('aiService — new functions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('generateFullPlan returns title, content, metadata', async () => {
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify({
                title: 'Clase 1: Introducción a Arduino',
                content: '<h2>Objetivos</h2><p>Aprender pines digitales</p>',
                metadata: { curso: 'Robótica', grado: '3ro', anio: '2026', carga_horaria: '2 módulos', tematica: 'Programación y Robótica', num_clase: '1' }
            })
        });
        const result = await generateFullPlan('Arduino para 3er año');
        expect(result.title).toBe('Clase 1: Introducción a Arduino');
        expect(result.content).toContain('<h2>');
        expect(result.metadata.tematica).toBe('Programación y Robótica');
    });

    it('generateRubric returns HTML string', async () => {
        mockGenerateContent.mockResolvedValue({
            text: '<table><tr><th>Criterio</th></tr></table>'
        });
        const result = await generateRubric('<p>Contenido</p>', 'Clase 1');
        expect(result).toContain('<table>');
    });

    it('suggestActivities returns 3 activities', async () => {
        mockGenerateContent.mockResolvedValue({
            text: JSON.stringify([
                { title: 'Act 1', description: 'Desc 1', type: 'refuerzo' },
                { title: 'Act 2', description: 'Desc 2', type: 'extension' },
                { title: 'Act 3', description: 'Desc 3', type: 'evaluacion' },
            ])
        });
        const result = await suggestActivities('<p>Contenido</p>', 'Clase 1');
        expect(result).toHaveLength(3);
        expect(result[0].type).toBe('refuerzo');
    });

    it('generateExecutiveSummary returns a string', async () => {
        mockGenerateContent.mockResolvedValue({ text: 'Clase introductoria sobre Arduino para 3er año.' });
        const result = await generateExecutiveSummary('<p>Contenido</p>', 'Clase 1');
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it('improveText returns improved string', async () => {
        mockGenerateContent.mockResolvedValue({ text: 'Texto mejorado y profesional.' });
        const result = await improveText('texto malo');
        expect(result).toBe('Texto mejorado y profesional.');
    });
});
```

- [ ] **Step 2: Verificar que fallan**

```bash
npx vitest run src/features/ai/aiService.test.ts
```
Expected: FAIL — funciones no existen aún.

- [ ] **Step 3: Implementar las funciones nuevas en `aiService.ts`**

Agregar al final del archivo existente (después de `askGeminiQuestion`):

```typescript
export interface Activity {
    title: string;
    description: string;
    type: 'refuerzo' | 'extension' | 'evaluacion';
}

export const generateFullPlan = async (description: string): Promise<{
    title: string;
    content: string;
    metadata: {
        curso: string; grado: string; anio: string;
        carga_horaria: string; tematica: string; num_clase: string;
    };
}> => {
    const ai = getGeminiClient();
    if (!ai) throw new Error('No hay conexión con la IA. Falta API Key.');

    const prompt = `Eres un experto en pedagogía técnica. Genera una planificación de clase completa basándote en esta descripción: "${description}".

Devuelve SOLO un JSON válido con esta estructura exacta:
{
  "title": "Título de la clase",
  "content": "HTML completo con: <h2>Objetivos</h2>, <h2>Desarrollo</h2> (con subsecciones Introducción, Actividad Principal, Cierre), <h2>Evaluación</h2>",
  "metadata": {
    "curso": "Nombre del taller o materia",
    "grado": "Año y división si se menciona",
    "anio": "${new Date().getFullYear()}",
    "carga_horaria": "Duración estimada",
    "tematica": "Una de: Manualidades, Proyecto Institucional, Programación y Robótica, Ciudadanía Digital, Cuidado Digital, Alfabetización",
    "num_clase": "1"
  }
}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.6, responseMimeType: 'application/json' }
    });

    if (!response.text) throw new Error('Respuesta vacía de Gemini');
    return JSON.parse(response.text);
};

export const generateRubric = async (docContent: string, docTitle: string): Promise<string> => {
    const ai = getGeminiClient();
    if (!ai) throw new Error('No hay conexión con la IA. Falta API Key.');

    const cleanContent = (docTitle + '\n' + docContent).replace(/<[^>]+>/g, ' ');
    const prompt = `Eres un experto en evaluación educativa. Basándote en el siguiente plan de clase, genera una rúbrica de evaluación en HTML.

La rúbrica debe tener esta estructura de tabla HTML con 5 columnas: Criterio | Insatisfactorio (1) | En Proceso (2) | Satisfactorio (3) | Sobresaliente (4).
Genera entre 4 y 6 criterios relevantes al contenido de la clase. Usa estilos inline básicos para la tabla.
Devuelve SOLO el HTML de la tabla, sin explicaciones.

CLASE:
${cleanContent}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.3 }
    });

    if (!response.text) throw new Error('Respuesta vacía de Gemini');
    return response.text;
};

export const suggestActivities = async (docContent: string, docTitle: string): Promise<Activity[]> => {
    const ai = getGeminiClient();
    if (!ai) throw new Error('No hay conexión con la IA. Falta API Key.');

    const cleanContent = (docTitle + '\n' + docContent).replace(/<[^>]+>/g, ' ');
    const prompt = `Eres un experto en pedagogía. Basándote en el siguiente plan de clase, sugiere exactamente 3 actividades complementarias variadas.

Devuelve SOLO un JSON válido con esta estructura:
[
  {"title": "...", "description": "...", "type": "refuerzo"},
  {"title": "...", "description": "...", "type": "extension"},
  {"title": "...", "description": "...", "type": "evaluacion"}
]

Los tipos posibles son: "refuerzo" (para quienes necesitan más práctica), "extension" (para quienes quieren profundizar), "evaluacion" (actividad de evaluación alternativa).

CLASE:
${cleanContent}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.5, responseMimeType: 'application/json' }
    });

    if (!response.text) throw new Error('Respuesta vacía de Gemini');
    return JSON.parse(response.text);
};

export const generateExecutiveSummary = async (docContent: string, docTitle: string): Promise<string> => {
    const ai = getGeminiClient();
    if (!ai) throw new Error('No hay conexión con la IA. Falta API Key.');

    const cleanContent = (docTitle + '\n' + docContent).replace(/<[^>]+>/g, ' ');
    const prompt = `Resume en UNA SOLA ORACIÓN concisa (máximo 30 palabras) el siguiente plan de clase para un informe directivo. Solo la oración, sin puntos extra ni explicaciones.

CLASE:
${cleanContent}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.2 }
    });

    return response.text?.trim() || 'No se pudo generar el resumen.';
};

export const improveText = async (text: string): Promise<string> => {
    const ai = getGeminiClient();
    if (!ai) throw new Error('No hay conexión con la IA. Falta API Key.');

    const prompt = `Eres un asistente de redacción para profesores. Mejora el siguiente texto educativo: hazlo más claro, profesional y apropiado para un documento pedagógico, manteniendo su significado original. Devuelve SOLO el texto mejorado, sin comillas ni explicaciones.

TEXTO:
${text}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.5 }
    });

    return response.text?.trim() || text;
};
```

También actualizar la firma de `askGeminiQuestion` para aceptar contexto global opcional:

```typescript
// Reemplazar la firma actual:
export const askGeminiQuestion = async (documentContent: string, question: string): Promise<string> => {
// Por:
export const askGeminiQuestion = async (
    documentContent: string,
    question: string,
    globalContext?: string
): Promise<string> => {
    const ai = getGeminiClient();
    if (!ai) return "No hay conexión con la Inteligencia Artificial. Falta tu API Key.";

    const cleanContext = documentContent
        ? documentContent.replace(/<[^>]+>/g, ' ')
        : '';

    const contextSection = globalContext
        ? `--- CONTEXTO GLOBAL (todas las planificaciones) ---\n${globalContext}\n\n`
        : cleanContext
        ? `--- CONTEXTO DEL DOCUMENTO ---\n${cleanContext}\n\n`
        : '';

    const prompt = `Eres un asistente experto para Profesores. ${contextSection}--- PREGUNTA DEL PROFESOR ---\n${question}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt]
        });
        return response.text || "La IA no devolvió ninguna respuesta.";
    } catch (e) {
        console.error("Error en chat de Gemini:", e);
        return "Hubo un error al consultar a la Inteligencia Artificial.";
    }
};
```

- [ ] **Step 4: Verificar que pasan**

```bash
npx vitest run src/features/ai/aiService.test.ts
```
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/ai/aiService.ts src/features/ai/aiService.test.ts
git commit -m "feat(ai): add generateFullPlan, generateRubric, suggestActivities, generateExecutiveSummary, improveText"
```

---

## Task 4: Reescribir `src/features/ai/AiSidebar.tsx`

**Files:**
- Modify: `src/features/ai/AiSidebar.tsx`
- Modify: `src/features/ai/AiSidebar.module.css`
- Modify: `src/features/ai/AiSidebar.test.tsx`

- [ ] **Step 1: Agregar estilos de tabs a `AiSidebar.module.css`**

Agregar al final del archivo CSS existente:

```css
/* Tabs */
.tabBar {
    display: flex;
    border-bottom: 2px solid var(--border-color);
    background: #f8fafc;
    flex-shrink: 0;
}

.tab {
    flex: 1;
    padding: 10px 4px;
    text-align: center;
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    color: var(--text-secondary);
    border: none;
    background: transparent;
    transition: background 0.15s;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
}

.tab:hover {
    background: #e2e8f0;
}

.tabActive {
    color: var(--primary-color);
    font-weight: 700;
    border-bottom: 2px solid var(--primary-color);
    background: white;
}

/* Generator */
.generatorTextarea {
    width: 100%;
    min-height: 80px;
    padding: 10px;
    font-size: 0.85rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    resize: vertical;
    font-family: inherit;
}

.templateGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 8px;
}

.templateChip {
    padding: 10px 8px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.78rem;
    text-align: center;
    font-weight: 600;
    border: 1px solid transparent;
    transition: opacity 0.15s;
}

.templateChip:hover {
    opacity: 0.8;
}

/* Tool cards in Mejorar tab */
.toolCard {
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    cursor: pointer;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    transition: border-color 0.15s;
}

.toolCard:hover {
    border-color: var(--primary-color);
}

.toolCardIcon {
    font-size: 1.4rem;
    line-height: 1;
}

.toolCardTitle {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--text-primary);
    margin: 0 0 2px;
}

.toolCardDesc {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin: 0;
}

/* Result boxes */
.resultBox {
    background: #f8fafc;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    padding: 12px;
    font-size: 0.82rem;
    overflow-x: auto;
}

.insertBtn {
    margin-top: 8px;
    padding: 6px 14px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    font-weight: 600;
}

.insertBtn:hover {
    background: var(--primary-hover);
}

.activityItem {
    background: white;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 8px;
}

.activityBadge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    margin-bottom: 4px;
}

.selectionPreview {
    background: #fef9c3;
    border: 1px solid #fde68a;
    border-radius: 6px;
    padding: 10px;
    font-size: 0.8rem;
    color: #92400e;
    margin-bottom: 10px;
    white-space: pre-wrap;
    word-break: break-word;
}
```

- [ ] **Step 2: Reescribir `AiSidebar.tsx` completo**

```typescript
// src/features/ai/AiSidebar.tsx
import { useState, useEffect, useRef } from 'react';
import { Sparkles, Hammer, ShieldAlert, Package, Send } from 'lucide-react';
import { useDocumentStore } from '../../store/useDocumentStore';
import {
    analyzeDocumentContent,
    askGeminiQuestion,
    generateFullPlan,
    generateRubric,
    suggestActivities,
    generateExecutiveSummary,
    improveText,
} from './aiService';
import type { AIMetadata, AITechnicalRequirements, Activity } from './aiService';
import { QUICK_TEMPLATES } from '../../data/templates';
import styles from './AiSidebar.module.css';

type Tab = 'generar' | 'analizar' | 'mejorar' | 'chat';

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
}

const TEMPLATE_COLORS: Record<string, { bg: string; border: string; color: string }> = {
    electricidad: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
    robotica:     { bg: '#faf5ff', border: '#e9d5ff', color: '#7c3aed' },
    programacion: { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' },
    digital:      { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
};

const ACTIVITY_BADGE: Record<string, { bg: string; color: string; label: string }> = {
    refuerzo:   { bg: '#fef9c3', color: '#92400e', label: 'Refuerzo' },
    extension:  { bg: '#eff6ff', color: '#1d4ed8', label: 'Extensión' },
    evaluacion: { bg: '#f0fdf4', color: '#15803d', label: 'Evaluación' },
};

export function AiSidebar() {
    const {
        selectedDoc,
        allDocuments,
        editorSelection,
        setPendingCreateFromAI,
        setPendingReplacement,
    } = useDocumentStore();

    const [activeTab, setActiveTab] = useState<Tab>('generar');

    // Tab: Generar
    const [generatorPrompt, setGeneratorPrompt] = useState('');
    const [generatorLoading, setGeneratorLoading] = useState(false);
    const [summaryResult, setSummaryResult] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);

    // Tab: Analizar
    const [analyzeLoading, setAnalyzeLoading] = useState(false);
    const [analyzeMetadata, setAnalyzeMetadata] = useState<AIMetadata | null>(null);
    const [analyzeRequirements, setAnalyzeRequirements] = useState<AITechnicalRequirements | null>(null);

    // Tab: Mejorar
    const [rubricsResult, setRubricsResult] = useState<string | null>(null);
    const [rubricsLoading, setRubricsLoading] = useState(false);
    const [activitiesResult, setActivitiesResult] = useState<Activity[] | null>(null);
    const [activitiesLoading, setActivitiesLoading] = useState(false);
    const [improveLoading, setImproveLoading] = useState(false);

    // Tab: Chat
    const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatLog]);

    // Reset results when doc changes
    useEffect(() => {
        setAnalyzeMetadata(null);
        setAnalyzeRequirements(null);
        setRubricsResult(null);
        setActivitiesResult(null);
        setSummaryResult(null);
    }, [selectedDoc?.id]);

    const handleGenerate = async () => {
        if (!generatorPrompt.trim()) return;
        setGeneratorLoading(true);
        try {
            const result = await generateFullPlan(generatorPrompt.trim());
            setPendingCreateFromAI(result);
            setGeneratorPrompt('');
        } catch (e: any) {
            alert('Error generando planificación: ' + e.message);
        } finally {
            setGeneratorLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedDoc?.content) return;
        setAnalyzeLoading(true);
        try {
            const result = await analyzeDocumentContent(selectedDoc.content, selectedDoc.title);
            setAnalyzeMetadata(result.metadata);
            setAnalyzeRequirements(result.requirements);
        } catch (e: any) {
            alert('Error analizando: ' + e.message);
        } finally {
            setAnalyzeLoading(false);
        }
    };

    const handleGenerateSummary = async () => {
        if (!selectedDoc?.content) return;
        setSummaryLoading(true);
        try {
            const result = await generateExecutiveSummary(selectedDoc.content, selectedDoc.title);
            setSummaryResult(result);
        } catch (e: any) {
            alert('Error generando resumen: ' + e.message);
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleGenerateRubric = async () => {
        if (!selectedDoc?.content) return;
        setRubricsLoading(true);
        try {
            const result = await generateRubric(selectedDoc.content, selectedDoc.title);
            setRubricsResult(result);
        } catch (e: any) {
            alert('Error generando rúbrica: ' + e.message);
        } finally {
            setRubricsLoading(false);
        }
    };

    const handleSuggestActivities = async () => {
        if (!selectedDoc?.content) return;
        setActivitiesLoading(true);
        try {
            const result = await suggestActivities(selectedDoc.content, selectedDoc.title);
            setActivitiesResult(result);
        } catch (e: any) {
            alert('Error sugiriendo actividades: ' + e.message);
        } finally {
            setActivitiesLoading(false);
        }
    };

    const handleImproveText = async () => {
        if (!editorSelection?.text) return;
        setImproveLoading(true);
        try {
            const result = await improveText(editorSelection.text);
            setPendingReplacement(result);
        } catch (e: any) {
            alert('Error mejorando texto: ' + e.message);
        } finally {
            setImproveLoading(false);
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim()) return;
        const q = chatInput.trim();
        setChatInput('');
        setChatLog(prev => [...prev, { role: 'user', text: q }]);
        setChatLoading(true);

        let docContent = '';
        let globalContext: string | undefined;

        if (selectedDoc) {
            docContent = selectedDoc.content || '';
        } else if (allDocuments.length > 0) {
            globalContext = `Tienes acceso a ${allDocuments.length} planificaciones:\n` +
                allDocuments.map(d => `- "${d.title}" | Temática: ${d.tematica || 'Sin categorizar'} | Grado: ${d.grado || 'N/A'} | Autor: ${d.author_name}`).join('\n');
        }

        const aiResponse = await askGeminiQuestion(docContent, q, globalContext);
        setChatLog(prev => [...prev, { role: 'ai', text: aiResponse }]);
        setChatLoading(false);
    };

    const insertAtEndOfDoc = (html: string) => {
        if (!selectedDoc) return;
        const newContent = (selectedDoc.content || '') + html;
        useDocumentStore.getState().setSelectedDoc({ ...selectedDoc, content: newContent });
        // Signal DocumentEditor to save via the pendingReplacement mechanism is NOT used here.
        // Instead we directly call store update and DocumentEditor's useEffect on selectedDoc
        // handles the save. See Task 6.
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: 'generar', label: '✨ Generar' },
        { key: 'analizar', label: '🔍 Analizar' },
        { key: 'mejorar', label: '🛠️ Mejorar' },
        { key: 'chat', label: '💬 Chat' },
    ];

    return (
        <div className={styles.aiContainer} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Tab Bar */}
            <div className={styles.tabBar}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
                        onClick={() => setActiveTab(t.key)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* ===== TAB: GENERAR ===== */}
                {activeTab === 'generar' && (
                    <>
                        <div>
                            <h4 className={styles.sectionTitle}>Generador de Planificación</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Describí la clase y la IA la crea completa con estructura pedagógica.
                            </p>
                            <textarea
                                className={styles.generatorTextarea}
                                value={generatorPrompt}
                                onChange={e => setGeneratorPrompt(e.target.value)}
                                placeholder="Ej: Clase de 2 módulos sobre Arduino para 3er año. Objetivo: introducir pines digitales."
                            />
                            <button
                                style={{ width: '100%', marginTop: '8px', padding: '10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
                                onClick={handleGenerate}
                                disabled={generatorLoading || !generatorPrompt.trim()}
                            >
                                {generatorLoading ? '⏳ Generando...' : '✨ Generar Planificación Completa'}
                            </button>
                        </div>

                        <div>
                            <h4 className={styles.sectionTitle}>Plantillas Rápidas</h4>
                            <div className={styles.templateGrid}>
                                {QUICK_TEMPLATES.map(t => {
                                    const colors = TEMPLATE_COLORS[t.id] ?? { bg: '#f1f5f9', border: '#cbd5e1', color: '#475569' };
                                    return (
                                        <div
                                            key={t.id}
                                            className={styles.templateChip}
                                            style={{ background: colors.bg, borderColor: colors.border, color: colors.color }}
                                            onClick={() => setGeneratorPrompt(t.prompt)}
                                        >
                                            {t.icon} {t.name}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {selectedDoc && (
                            <div>
                                <h4 className={styles.sectionTitle}>Resumen Ejecutivo</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Genera una síntesis de una línea para informes o directivos.
                                </p>
                                {summaryResult ? (
                                    <div className={styles.resultBox}>
                                        <p style={{ margin: 0, fontStyle: 'italic' }}>{summaryResult}</p>
                                        <button className={styles.insertBtn} onClick={() => { navigator.clipboard.writeText(summaryResult); }}>
                                            Copiar
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        style={{ width: '100%', padding: '8px', background: '#e2e8f0', color: '#374151', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                                        onClick={handleGenerateSummary}
                                        disabled={summaryLoading}
                                    >
                                        {summaryLoading ? '⏳ Generando...' : '📄 Generar Resumen'}
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* ===== TAB: ANALIZAR ===== */}
                {activeTab === 'analizar' && (
                    <>
                        {!selectedDoc ? (
                            <div className={styles.emptyState}>
                                <Sparkles size={24} color="#CBD5E1" />
                                <p>Abrí una planificación para analizarla.</p>
                            </div>
                        ) : analyzeLoading ? (
                            <div className={styles.analyzingBox}>
                                <div className={styles.spinner} />
                                <span>Escaneando requerimientos...</span>
                            </div>
                        ) : analyzeMetadata ? (
                            <div className={styles.results}>
                                <div className={styles.metadataCard}>
                                    <div className={styles.metaRow}>
                                        <span className={styles.metaLabel}>Materia:</span>
                                        <span className={styles.metaValue}>{analyzeMetadata.subject}</span>
                                    </div>
                                    <div className={styles.metaRow}>
                                        <span className={styles.metaLabel}>Categoría:</span>
                                        <span className={styles.metaValue} style={{ fontWeight: 'bold' }}>{analyzeMetadata.category}</span>
                                    </div>
                                    <div className={styles.metaRow}>
                                        <span className={styles.metaLabel}>Curso:</span>
                                        <span className={styles.metaValue}>{analyzeMetadata.course}</span>
                                    </div>
                                </div>
                                <div className={styles.section}>
                                    <h4 className={styles.sectionTitle}><Hammer size={14} /> Herramientas</h4>
                                    <ul className={styles.tagList}>
                                        {analyzeRequirements?.tools.map(t => <li key={t} className={styles.tag}>{t}</li>)}
                                    </ul>
                                </div>
                                <div className={styles.section}>
                                    <h4 className={styles.sectionTitle}><Package size={14} /> Materiales</h4>
                                    <ul className={styles.tagList}>
                                        {analyzeRequirements?.materials.map(m => <li key={m} className={styles.tag}>{m}</li>)}
                                    </ul>
                                </div>
                                <div className={styles.section}>
                                    <h4 className={styles.sectionTitle}><ShieldAlert size={14} color="#ea580c" /> EPP Requerido</h4>
                                    <ul className={styles.tagList}>
                                        {analyzeRequirements?.ppe.map(e => <li key={e} className={`${styles.tag} ${styles.eppTag}`}>{e}</li>)}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <button
                                style={{ width: '100%', padding: '10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                                onClick={handleAnalyze}
                            >
                                ✨ Analizar este Documento
                            </button>
                        )}
                    </>
                )}

                {/* ===== TAB: MEJORAR ===== */}
                {activeTab === 'mejorar' && (
                    <>
                        {!selectedDoc ? (
                            <div className={styles.emptyState}>
                                <Sparkles size={24} color="#CBD5E1" />
                                <p>Abrí una planificación para usar estas herramientas.</p>
                            </div>
                        ) : (
                            <>
                                {/* Rubrica */}
                                <div>
                                    {rubricsResult ? (
                                        <>
                                            <h4 className={styles.sectionTitle}>📋 Rúbrica Generada</h4>
                                            <div className={styles.resultBox} dangerouslySetInnerHTML={{ __html: rubricsResult }} />
                                            <button className={styles.insertBtn} onClick={() => insertAtEndOfDoc(rubricsResult)}>
                                                Insertar al final del documento
                                            </button>
                                        </>
                                    ) : (
                                        <div className={styles.toolCard} onClick={handleGenerateRubric}>
                                            <span className={styles.toolCardIcon}>📋</span>
                                            <div>
                                                <p className={styles.toolCardTitle}>
                                                    {rubricsLoading ? '⏳ Generando rúbrica...' : 'Generar Rúbrica de Evaluación'}
                                                </p>
                                                <p className={styles.toolCardDesc}>Criterios e indicadores basados en el contenido de la clase.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actividades */}
                                <div>
                                    {activitiesResult ? (
                                        <>
                                            <h4 className={styles.sectionTitle}>💡 Actividades Sugeridas</h4>
                                            {activitiesResult.map((act, i) => {
                                                const badge = ACTIVITY_BADGE[act.type] ?? { bg: '#f1f5f9', color: '#475569', label: act.type };
                                                return (
                                                    <div key={i} className={styles.activityItem}>
                                                        <span className={styles.activityBadge} style={{ background: badge.bg, color: badge.color }}>{badge.label}</span>
                                                        <p style={{ fontWeight: 600, margin: '4px 0 2px', fontSize: '0.85rem' }}>{act.title}</p>
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{act.description}</p>
                                                        <button
                                                            className={styles.insertBtn}
                                                            style={{ marginTop: '6px' }}
                                                            onClick={() => insertAtEndOfDoc(`<h3>${act.title}</h3><p>${act.description}</p>`)}
                                                        >
                                                            Insertar
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    ) : (
                                        <div className={styles.toolCard} onClick={handleSuggestActivities}>
                                            <span className={styles.toolCardIcon}>💡</span>
                                            <div>
                                                <p className={styles.toolCardTitle}>
                                                    {activitiesLoading ? '⏳ Sugiriendo...' : 'Sugerir Actividades Complementarias'}
                                                </p>
                                                <p className={styles.toolCardDesc}>3 actividades de refuerzo, extensión y evaluación alternativa.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Mejora texto */}
                                <div>
                                    <div className={styles.toolCard} style={{ cursor: editorSelection?.text ? 'pointer' : 'default', opacity: editorSelection?.text ? 1 : 0.5 }}
                                        onClick={editorSelection?.text ? handleImproveText : undefined}>
                                        <span className={styles.toolCardIcon}>✏️</span>
                                        <div>
                                            <p className={styles.toolCardTitle}>
                                                {improveLoading ? '⏳ Mejorando...' : 'Mejorar Texto Seleccionado'}
                                            </p>
                                            <p className={styles.toolCardDesc}>
                                                {editorSelection?.text
                                                    ? 'Texto seleccionado listo. Hacé clic para mejorarlo.'
                                                    : 'Seleccioná texto en el editor para habilitarlo.'}
                                            </p>
                                        </div>
                                    </div>
                                    {editorSelection?.text && (
                                        <div className={styles.selectionPreview}>
                                            <strong>Seleccionado:</strong> {editorSelection.text.slice(0, 120)}{editorSelection.text.length > 120 ? '...' : ''}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* ===== TAB: CHAT ===== */}
                {activeTab === 'chat' && (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '0' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            {selectedDoc
                                ? `Consultando sobre: "${selectedDoc.title}"`
                                : `Modo global: ${allDocuments.length} planificaciones disponibles`}
                        </p>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
                            {chatLog.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic', marginTop: '20px' }}>
                                    {selectedDoc
                                        ? '¿Qué actividad dura más tiempo? ¿Qué evaluación se menciona?'
                                        : '¿Cuántas clases de Robótica hay? ¿Quién enseña Historia?'}
                                </p>
                            ) : (
                                chatLog.map((msg, i) => (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                        <div style={{
                                            maxWidth: '85%', padding: '8px 12px', borderRadius: '12px',
                                            backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : '#f1f5f9',
                                            color: msg.role === 'user' ? 'white' : 'var(--text-color)',
                                            fontSize: '0.85rem', whiteSpace: 'pre-wrap'
                                        }}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))
                            )}
                            {chatLoading && (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                                    <div className={styles.spinner} style={{ width: '12px', height: '12px' }} />
                                    Pensando...
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                placeholder="Escribí tu pregunta..."
                                style={{ flex: 1, padding: '10px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                                disabled={chatLoading}
                            />
                            <button
                                onClick={handleSendChat}
                                disabled={!chatInput.trim() || chatLoading}
                                style={{
                                    backgroundColor: chatInput.trim() && !chatLoading ? 'var(--primary-color)' : '#cbd5e1',
                                    color: 'white', border: 'none', borderRadius: '50%',
                                    width: '36px', height: '36px', display: 'flex',
                                    justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
                                }}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Actualizar `AiSidebar.test.tsx`**

```typescript
// src/features/ai/AiSidebar.test.tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiSidebar } from './AiSidebar';
import { useDocumentStore } from '../../store/useDocumentStore';

vi.mock('lucide-react', () => ({
    Sparkles: () => <div>Sparkles</div>,
    Hammer: () => <div>Hammer</div>,
    ShieldAlert: () => <div>ShieldAlert</div>,
    Package: () => <div>Package</div>,
    Send: () => <div>Send</div>,
}));

vi.mock('./aiService', () => ({
    analyzeDocumentContent: vi.fn(),
    askGeminiQuestion: vi.fn(),
    generateFullPlan: vi.fn(),
    generateRubric: vi.fn(),
    suggestActivities: vi.fn(),
    generateExecutiveSummary: vi.fn(),
    improveText: vi.fn(),
}));

describe('AiSidebar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useDocumentStore.setState({
            selectedDoc: null,
            allDocuments: [],
            editorSelection: null,
            pendingReplacement: null,
            pendingCreateFromAI: null,
        });
    });

    it('renders Generar tab by default', () => {
        render(<AiSidebar />);
        expect(screen.getByText(/Generador de Planificación/i)).toBeInTheDocument();
    });

    it('shows all 4 tabs', () => {
        render(<AiSidebar />);
        expect(screen.getByText(/✨ Generar/i)).toBeInTheDocument();
        expect(screen.getByText(/🔍 Analizar/i)).toBeInTheDocument();
        expect(screen.getByText(/🛠️ Mejorar/i)).toBeInTheDocument();
        expect(screen.getByText(/💬 Chat/i)).toBeInTheDocument();
    });

    it('shows empty state in Analizar tab when no doc selected', async () => {
        const { getByText } = render(<AiSidebar />);
        getByText(/🔍 Analizar/i).click();
        expect(screen.getByText(/Abrí una planificación para analizarla/i)).toBeInTheDocument();
    });

    it('shows global chat mode when no doc is selected', () => {
        useDocumentStore.setState({ allDocuments: [{ id: '1', title: 'Clase 1', tematica: 'Robótica', grado: '3ro', author_name: 'Prof X' }] });
        render(<AiSidebar />);
        screen.getByText(/💬 Chat/i).click();
        expect(screen.getByText(/1 planificaciones disponibles/i)).toBeInTheDocument();
    });
});
```

- [ ] **Step 4: Correr los tests**

```bash
npx vitest run src/features/ai/AiSidebar.test.tsx
```
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/ai/AiSidebar.tsx src/features/ai/AiSidebar.module.css src/features/ai/AiSidebar.test.tsx
git commit -m "feat(ai): rewrite AiSidebar with 4 tabs (Generar, Analizar, Mejorar, Chat)"
```

---

## Task 5: Actualizar `src/features/editor/RichTextEditor.tsx`

**Files:**
- Modify: `src/features/editor/RichTextEditor.tsx`

- [ ] **Step 1: Actualizar la interfaz y el componente**

```typescript
// src/features/editor/RichTextEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';
import styles from './RichTextEditor.module.css';

interface SelectionReplace {
    text: string;
    from: number;
    to: number;
}

interface RichTextEditorProps {
    content: string;
    onSave: (content: string) => void;
    readOnly?: boolean;
    onSelectionChange?: (text: string, from: number, to: number) => void;
    selectionReplace?: SelectionReplace | null;
    onSelectionReplaceDone?: () => void;
}

export function RichTextEditor({
    content,
    onSave,
    readOnly = false,
    onSelectionChange,
    selectionReplace,
    onSelectionReplaceDone,
}: RichTextEditorProps) {
    const [isSaving, setIsSaving] = useState(false);

    const editor = useEditor({
        extensions: [StarterKit],
        content: content,
        editable: !readOnly,
        onUpdate: () => {
            setIsSaving(true);
        },
        onSelectionUpdate: ({ editor: ed }) => {
            if (!onSelectionChange) return;
            const { from, to } = ed.state.selection;
            const text = from === to ? '' : ed.state.doc.textBetween(from, to, ' ');
            onSelectionChange(text, from, to);
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    useEffect(() => {
        if (isSaving) {
            const timeout = setTimeout(() => {
                if (editor) {
                    onSave(editor.getHTML());
                    setIsSaving(false);
                }
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [isSaving, editor, onSave]);

    // Handle pending text replacement from AI
    useEffect(() => {
        if (!selectionReplace || !editor) return;
        const { text, from, to } = selectionReplace;
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, text).run();
        onSelectionReplaceDone?.();
    }, [selectionReplace]);

    if (!editor) return null;

    return (
        <div className={styles.editorContainer}>
            {!readOnly && (
                <div className={styles.toolbar}>
                    <button onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? styles.active : ''}><strong>B</strong></button>
                    <button onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? styles.active : ''}><em>I</em></button>
                    <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? styles.active : ''}>H2</button>
                    <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? styles.active : ''}>Lista</button>
                    <span className={styles.saveStatus}>{isSaving ? 'Guardando...' : 'Guardado'}</span>
                </div>
            )}
            <EditorContent editor={editor} className={styles.contentArea} />
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/editor/RichTextEditor.tsx
git commit -m "feat(editor): add onSelectionChange and selectionReplace props to RichTextEditor"
```

---

## Task 6: Actualizar `src/features/editor/DocumentEditor.tsx` — wiring de IA

**Files:**
- Modify: `src/features/editor/DocumentEditor.tsx`

Este task conecta el store con `DocumentEditor`: sincroniza `selectedDoc` y `allDocuments` al store, maneja `pendingCreateFromAI`, pasa `onSelectionChange` al `RichTextEditor`, y aplica `pendingReplacement`.

- [ ] **Step 1: Agregar imports y hooks del store al inicio del componente**

Al principio de `DocumentEditor`, agregar los imports y extraer del store:

```typescript
// Agregar a los imports existentes:
import { useDocumentStore } from '../../store/useDocumentStore';

// Dentro del componente, después de los useState existentes, agregar:
const {
    setSelectedDoc: setStoreDoc,
    setAllDocuments,
    pendingCreateFromAI,
    setPendingCreateFromAI,
    pendingReplacement,
    setPendingReplacement,
    setEditorSelection,
} = useDocumentStore();
```

- [ ] **Step 2: Sincronizar `selectedDoc` y `allDocuments` al store**

Agregar estos `useEffect` después de los existentes:

```typescript
// Sync selectedDoc to store so AiSidebar can read it
useEffect(() => {
    setStoreDoc(selectedDoc);
}, [selectedDoc, setStoreDoc]);

// Sync allDocuments to store so AiSidebar can access multi-doc chat
useEffect(() => {
    setAllDocuments(documents);
}, [documents, setAllDocuments]);
```

- [ ] **Step 3: Agregar `handleSaveDocumentFromAI` y su `useEffect`**

```typescript
const handleSaveDocumentFromAI = async (data: { title: string; content: string; metadata: any }) => {
    if (!user) return;
    setLoading(true);
    try {
        const newDoc = {
            title: data.title,
            author_id: user.id,
            author_name: user.name,
            author_role: user.role,
            file_type: 'editor',
            content: data.content,
            tematica: data.metadata.tematica || null,
            num_clase: data.metadata.num_clase || null,
            grado: data.metadata.grado || null,
            anio: data.metadata.anio || null,
            carga_horaria: data.metadata.carga_horaria || null,
            curso: data.metadata.curso || null,
            status: 'active',
        };
        const { data: inserted, error } = await supabase.from('documents').insert(newDoc).select().single();
        if (error) throw error;
        await fetchDocs();
        setSelectedDoc(inserted);
    } catch (err: any) {
        alert('Error creando documento desde IA: ' + err.message);
    } finally {
        setLoading(false);
        setPendingCreateFromAI(null);
    }
};

useEffect(() => {
    if (pendingCreateFromAI) {
        handleSaveDocumentFromAI(pendingCreateFromAI);
    }
}, [pendingCreateFromAI]);
```

- [ ] **Step 4: Estado local para la selección del editor y aplicar replacement**

```typescript
// Agregar con los otros useState:
const [editorSelectionRange, setEditorSelectionRange] = useState<{ from: number; to: number } | null>(null);
const [pendingReplace, setPendingReplace] = useState<{ text: string; from: number; to: number } | null>(null);

// Handler que pasa al RichTextEditor:
const handleEditorSelectionChange = (text: string, from: number, to: number) => {
    setEditorSelectionRange(text ? { from, to } : null);
    setEditorSelection(text ? { text, from, to } : null);
};

// useEffect que aplica el pendingReplacement del store:
useEffect(() => {
    if (pendingReplacement && editorSelectionRange) {
        setPendingReplace({ text: pendingReplacement, ...editorSelectionRange });
    }
}, [pendingReplacement]);
```

- [ ] **Step 5: Pasar las nuevas props al `RichTextEditor`**

Encontrar la línea donde se renderiza `<RichTextEditor` y agregar las props nuevas:

```typescript
// Antes:
<RichTextEditor
    content={previewVersion ? (previewVersion.content || '') : (selectedDoc.content || '')}
    onSave={(newContent) => handleAutoSave(selectedDoc.id, newContent)}
    readOnly={!canEditSelected || !!previewVersion}
/>

// Después:
<RichTextEditor
    content={previewVersion ? (previewVersion.content || '') : (selectedDoc.content || '')}
    onSave={(newContent) => handleAutoSave(selectedDoc.id, newContent)}
    readOnly={!canEditSelected || !!previewVersion}
    onSelectionChange={canEditSelected ? handleEditorSelectionChange : undefined}
    selectionReplace={pendingReplace}
    onSelectionReplaceDone={() => {
        setPendingReplace(null);
        setPendingReplacement(null);
        setEditorSelectionRange(null);
        setEditorSelection(null);
    }}
/>
```

- [ ] **Step 6: Manejar el caso donde AiSidebar inserta al final del doc (via store)**

El `AiSidebar.insertAtEndOfDoc` actualiza `selectedDoc.content` directamente en el store. `DocumentEditor` necesita observar esto:

```typescript
// Leer selectedDoc del store para detectar cambios hechos por AiSidebar:
const storeSelectedDoc = useDocumentStore(s => s.selectedDoc);

useEffect(() => {
    if (!storeSelectedDoc || !selectedDoc) return;
    if (storeSelectedDoc.id === selectedDoc.id && storeSelectedDoc.content !== selectedDoc.content) {
        // AiSidebar insertó contenido — guardar y actualizar local
        handleAutoSave(selectedDoc.id, storeSelectedDoc.content);
        setSelectedDoc(storeSelectedDoc);
    }
}, [storeSelectedDoc?.content]);
```

- [ ] **Step 7: Commit**

```bash
git add src/features/editor/DocumentEditor.tsx
git commit -m "feat(editor): wire DocumentEditor with store for AI creation, selection, and content replacement"
```

---

## Task 7: Eliminar credenciales hardcodeadas de `AuthPage.tsx`

**Files:**
- Modify: `src/features/auth/AuthPage.tsx`

- [ ] **Step 1: Eliminar el botón de acceso rápido**

En `AuthPage.tsx`, eliminar el bloque completo del botón de prueba (líneas 129–138 del archivo original):

```typescript
// ELIMINAR este bloque completo:
<button
    type="button"
    onClick={() => onSubmit({ email: 'admin@test.com', password: '123456' })}
    className={styles.submitBtn}
    style={{ marginTop: '10px', backgroundColor: '#6c757d' }}
    disabled={loading}
>
    Acceso Rápido (Pruebas IA)
</button>
```

- [ ] **Step 2: Commit**

```bash
git add src/features/auth/AuthPage.tsx
git commit -m "security: remove hardcoded test credentials from AuthPage"
```

---

## Task 8: Crear el sistema de Toasts

**Files:**
- Create: `src/components/Toast/useToast.ts`
- Create: `src/components/Toast/Toast.tsx`
- Create: `src/components/Toast/ToastContainer.tsx`
- Create: `src/components/Toast/useToast.test.ts`

- [ ] **Step 1: Escribir el test para `useToast`**

```typescript
// src/components/Toast/useToast.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useToast } from './useToast';

describe('useToast', () => {
    beforeEach(() => {
        useToast.getState().toasts.forEach(t => useToast.getState().removeToast(t.id));
    });

    it('adds a toast with correct properties', () => {
        useToast.getState().showToast('Guardado correctamente', 'success');
        const toasts = useToast.getState().toasts;
        expect(toasts).toHaveLength(1);
        expect(toasts[0].message).toBe('Guardado correctamente');
        expect(toasts[0].type).toBe('success');
    });

    it('removes a toast by id', () => {
        useToast.getState().showToast('Test', 'info');
        const id = useToast.getState().toasts[0].id;
        useToast.getState().removeToast(id);
        expect(useToast.getState().toasts).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Verificar que falla**

```bash
npx vitest run src/components/Toast/useToast.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implementar `useToast.ts`**

```typescript
// src/components/Toast/useToast.ts
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastState {
    toasts: ToastItem[];
    showToast: (message: string, type?: ToastType) => void;
    removeToast: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
    toasts: [],
    showToast: (message, type = 'info') => {
        const id = Math.random().toString(36).slice(2);
        set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
        setTimeout(() => {
            set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
        }, 4000);
    },
    removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));
```

- [ ] **Step 4: Implementar `Toast.tsx`**

```typescript
// src/components/Toast/Toast.tsx
import type { ToastItem } from './useToast';
import { useToast } from './useToast';

const COLORS: Record<string, { bg: string; border: string; icon: string }> = {
    success: { bg: '#f0fdf4', border: '#86efac', icon: '✅' },
    error:   { bg: '#fef2f2', border: '#fca5a5', icon: '❌' },
    warning: { bg: '#fffbeb', border: '#fcd34d', icon: '⚠️' },
    info:    { bg: '#eff6ff', border: '#93c5fd', icon: 'ℹ️' },
};

export function Toast({ toast }: { toast: ToastItem }) {
    const { removeToast } = useToast();
    const colors = COLORS[toast.type];

    return (
        <div style={{
            background: colors.bg, border: `1px solid ${colors.border}`,
            borderRadius: '8px', padding: '12px 16px', display: 'flex',
            alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: '280px', maxWidth: '420px', animation: 'slideIn 0.2s ease',
        }}>
            <span style={{ fontSize: '1rem' }}>{colors.icon}</span>
            <span style={{ flex: 1, fontSize: '0.9rem', color: '#1e293b' }}>{toast.message}</span>
            <button
                onClick={() => removeToast(toast.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem', padding: '0 2px' }}
            >
                ×
            </button>
        </div>
    );
}
```

- [ ] **Step 5: Implementar `ToastContainer.tsx`**

```typescript
// src/components/Toast/ToastContainer.tsx
import { useToast } from './useToast';
import { Toast } from './Toast';

export function ToastContainer() {
    const { toasts } = useToast();

    return (
        <div style={{
            position: 'fixed', bottom: '24px', right: '24px',
            display: 'flex', flexDirection: 'column', gap: '8px',
            zIndex: 9999, pointerEvents: 'none',
        }}>
            {toasts.map(t => (
                <div key={t.id} style={{ pointerEvents: 'auto' }}>
                    <Toast toast={t} />
                </div>
            ))}
        </div>
    );
}
```

- [ ] **Step 6: Verificar que pasan los tests**

```bash
npx vitest run src/components/Toast/useToast.test.ts
```
Expected: PASS — 2 tests.

- [ ] **Step 7: Commit**

```bash
git add src/components/Toast/
git commit -m "feat(toast): add toast notification system with useToast store"
```

---

## Task 9: Montar `ToastContainer` en `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Agregar el import y el componente**

```typescript
// Agregar al import section:
import { ToastContainer } from './components/Toast/ToastContainer';

// Dentro del return, antes del cierre de </GoogleOAuthProvider>:
// Agregar:
<ToastContainer />
```

El return queda:
```typescript
return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <HashRouter>
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/" element={<DesktopLayout />}>
                    <Route index element={<Navigate to="/editor" replace />} />
                    <Route path="editor" element={<DocumentEditor />} />
                    <Route path="admin" element={<AdminPanel />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </HashRouter>
        <ToastContainer />
    </GoogleOAuthProvider>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: mount ToastContainer globally in App"
```

---

## Task 10: Crear `src/components/ConfirmModal.tsx`

**Files:**
- Create: `src/components/ConfirmModal.tsx`

- [ ] **Step 1: Crear el componente**

```typescript
// src/components/ConfirmModal.tsx
interface ConfirmModalProps {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({ title, message, confirmLabel = 'Confirmar', onConfirm, onCancel }: ConfirmModalProps) {
    return (
        <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={onCancel}
        >
            <div
                style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
                onClick={e => e.stopPropagation()}
            >
                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: '#1e293b' }}>{title}</h3>
                <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: '#64748b' }}>{message}</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ConfirmModal.tsx
git commit -m "feat: add ConfirmModal component for destructive actions"
```

---

## Task 11: Reemplazar `alert`/`window.confirm` en `DocumentEditor.tsx`

**Files:**
- Modify: `src/features/editor/DocumentEditor.tsx`

- [ ] **Step 1: Importar `useToast` y `ConfirmModal`**

```typescript
// Agregar a los imports:
import { useToast } from '../../components/Toast/useToast';
import { ConfirmModal } from '../../components/ConfirmModal';
```

- [ ] **Step 2: Agregar el hook y estado del modal**

```typescript
// Dentro del componente, junto a los otros hooks:
const { showToast } = useToast();

// Estado para el modal de confirmación:
const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
} | null>(null);
```

- [ ] **Step 3: Reemplazar todos los `alert(...)` por `showToast(...)`**

Buscar y reemplazar en el archivo. Los patrones más frecuentes:

```typescript
// alert('Ya existe...') → showToast('Ya existe...', 'warning')
// alert('Error al guardar...') → showToast('Error al guardar...', 'error')
// alert('¡Se importaron...!') → showToast('¡Se importaron...!', 'success')
// alert('Versión guardada...') → showToast('Versión guardada...', 'success')
// alert('Papelera vaciada correctamente.') → showToast('Papelera vaciada correctamente.', 'success')
// alert('Error al crear categoría...') → showToast('Error al crear categoría...', 'error')
// alert('¡Escaneo IA completado...!') → showToast('¡Escaneo IA completado y Categoría Detectada!', 'success')
```

Para los alerts dentro de bloques catch, usar `showToast(err.message || 'Error desconocido', 'error')`.

- [ ] **Step 4: Reemplazar los `window.confirm` destructivos por `ConfirmModal`**

Para `handleDelete`:
```typescript
// Antes:
const handleDelete = async (docId: string) => {
    const confirmDelete = window.confirm("El archivo será borrado...");
    if (!confirmDelete) return;
    // ...

// Después:
const handleDelete = (docId: string) => {
    setConfirmModal({
        title: 'Eliminar planificación',
        message: 'El archivo será borrado y desaparecerá de la vista. Esta acción puede revertirse desde la papelera.',
        confirmLabel: 'Eliminar',
        onConfirm: async () => {
            setConfirmModal(null);
            try {
                const { error } = await supabase.from('documents').update({ status: 'deleted', delete_reason: 'Eliminado por el usuario' }).eq('id', docId);
                if (error) throw error;
                setSelectedDoc(null);
                setHasUnsavedChanges(false);
                fetchDocs();
                showToast('Planificación eliminada.', 'success');
            } catch (err: any) {
                showToast('Error eliminando: ' + err.message, 'error');
            }
        },
    });
};
```

Para `handleEmptyTrash`:
```typescript
// Antes:
const handleEmptyTrash = async () => {
    const confirmEmpty = window.confirm("¿Estás completamente seguro de vaciar la papelera?...");
    if (!confirmEmpty) return;
    // ...

// Después:
const handleEmptyTrash = () => {
    setConfirmModal({
        title: 'Vaciar papelera',
        message: '¿Estás completamente seguro? Esto eliminará PERMANENTEMENTE todas las planificaciones borradas. No se pueden recuperar.',
        confirmLabel: 'Vaciar Papelera',
        onConfirm: async () => {
            setConfirmModal(null);
            setLoading(true);
            try {
                const { data: deletedDocs, error: fetchError } = await supabase.from('documents').select('id').eq('status', 'deleted');
                if (fetchError) throw fetchError;
                if (deletedDocs && deletedDocs.length > 0) {
                    const deletedIds = deletedDocs.map(d => d.id);
                    await supabase.from('comments').delete().in('document_id', deletedIds);
                    await supabase.from('document_versions').delete().in('document_id', deletedIds);
                    const { error: deleteError } = await supabase.from('documents').delete().in('id', deletedIds);
                    if (deleteError) throw deleteError;
                    showToast('Papelera vaciada correctamente.', 'success');
                } else {
                    showToast('La papelera ya está vacía.', 'info');
                }
                fetchDocs();
            } catch (err: any) {
                showToast('Error vaciando la papelera: ' + err.message, 'error');
            } finally {
                setLoading(false);
            }
        },
    });
};
```

- [ ] **Step 5: Reemplazar `window.confirm` en `handleClassNumberShift`**

```typescript
// Antes:
const shift = window.confirm(`Ya existe la clase ${parsedNewNum}...`);
if (shift) { ... }

// Después — usar una Promise wrapping el modal:
// Este es el único lugar donde window.confirm se usa en lógica síncrona.
// Para mantener el flujo simple, convertir a un modal con callback:
// Mover toda la lógica de shift al interior del onConfirm del modal.
// El patrón: en vez de "await handleClassNumberShift", usar un estado intermedio.
// Simplificación pragmática: mantener window.confirm solo aquí (es una confirmación
// de una acción técnica interna, no una acción destructiva visible al usuario).
// Esta instancia puede dejarse como window.confirm sin riesgo.
```

- [ ] **Step 6: Renderizar el `ConfirmModal` en el JSX**

Al final del JSX del componente, antes del cierre `</div>` final:

```typescript
{confirmModal && (
    <ConfirmModal
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(null)}
    />
)}
```

- [ ] **Step 7: Commit**

```bash
git add src/features/editor/DocumentEditor.tsx src/components/ConfirmModal.tsx src/components/Toast/
git commit -m "feat(ux): replace window.alert/confirm with toast notifications and ConfirmModal"
```

---

## Task 12: Export a PDF

**Files:**
- Modify: `src/features/editor/DocumentEditor.tsx`

No se usa `window.print()` directamente (los CSS Modules transforman los nombres de clase haciendo imposible targetear el editor desde un CSS externo). En su lugar se abre una nueva ventana con el contenido limpio y se auto-imprime.

- [ ] **Step 1: Agregar la función `handleExportPDF`**

```typescript
const handleExportPDF = () => {
    if (!selectedDoc) return;
    const title = selectedDoc.title || 'Planificación';
    const author = selectedDoc.author_name || '';
    const date = new Date(selectedDoc.created_at).toLocaleDateString('es-AR');
    const content = selectedDoc.content || '<p>Sin contenido.</p>';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('El navegador bloqueó la ventana emergente. Permitila para exportar a PDF.', 'warning');
        return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 48px; max-width: 800px; margin: 0 auto; color: #1e293b; }
    h1 { font-size: 1.6rem; margin: 0 0 4px; }
    .meta { color: #64748b; font-size: 0.85rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 28px; }
    h2 { font-size: 1.15rem; margin-top: 24px; color: #334155; }
    ul, ol { padding-left: 22px; }
    li { margin-bottom: 4px; }
    p { line-height: 1.7; margin: 8px 0; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">Autor: ${author} &nbsp;|&nbsp; Fecha: ${date}</div>
  ${content}
  <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 1000); };</script>
</body>
</html>`);
    printWindow.document.close();
};
```

- [ ] **Step 2: Agregar el botón en la ribbon**

En la sección `ribbonActions`, junto a "Guardar Versión":

```typescript
{selectedDoc.file_type === 'editor' && (
    <button
        className={styles.btnSecondary}
        onClick={handleExportPDF}
        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        title="Exportar como PDF para imprimir"
    >
        🖨️ Exportar PDF
    </button>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/editor/DocumentEditor.tsx
git commit -m "feat(editor): add PDF export via print window"
```

---

## Task 13: Duplicar clase

**Files:**
- Modify: `src/features/editor/DocumentEditor.tsx`

- [ ] **Step 1: Agregar la función `handleDuplicate`**

```typescript
const handleDuplicate = async () => {
    if (!selectedDoc || !user) return;
    setLoading(true);
    try {
        const duplicated = {
            title: `Copia de ${selectedDoc.title}`,
            author_id: user.id,
            author_name: user.name,
            author_role: user.role,
            file_type: selectedDoc.file_type,
            file_url: selectedDoc.file_type !== 'editor' ? selectedDoc.file_url : null,
            content: selectedDoc.content || null,
            tematica: selectedDoc.tematica || null,
            num_clase: null,
            etiquetas: selectedDoc.etiquetas || null,
            curso: selectedDoc.curso || null,
            grado: selectedDoc.grado || null,
            anio: selectedDoc.anio || null,
            carga_horaria: selectedDoc.carga_horaria || null,
            recursos: selectedDoc.recursos || null,
            next_class_id: null,
            status: 'active',
        };
        const { data, error } = await supabase.from('documents').insert(duplicated).select().single();
        if (error) throw error;
        await fetchDocs();
        setSelectedDoc(data);
        showToast('Clase duplicada correctamente.', 'success');
    } catch (err: any) {
        showToast('Error duplicando: ' + err.message, 'error');
    } finally {
        setLoading(false);
    }
};
```

- [ ] **Step 2: Agregar el botón en la ribbon**

Dentro de `ribbonActions`, junto a "Eliminar":

```typescript
{canEditSelected && (
    <>
        <button
            className={styles.btnSecondary}
            onClick={handleDuplicate}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Crear una copia de esta clase"
        >
            <Copy size={16} /> Duplicar
        </button>
        {/* ... botones existentes ... */}
    </>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/editor/DocumentEditor.tsx
git commit -m "feat(editor): add duplicate class functionality"
```

---

## Task 14: Plantillas predefinidas en el modal de creación

**Files:**
- Modify: `src/features/editor/DocumentEditor.tsx`

- [ ] **Step 1: Importar templates y agregar estado**

```typescript
// Agregar al import section:
import { QUICK_TEMPLATES } from '../../data/templates';

// Agregar con los otros estados del modal de creación:
const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
```

- [ ] **Step 2: Agregar chips de plantillas en el modal de creación**

En el modal de creación (`isCreating`), después del campo de título y antes del selector de tipo, agregar:

```typescript
<div style={{ marginBottom: '12px' }}>
    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 8px' }}>
        Partir de una plantilla (opcional — pre-rellena el contenido con IA al guardar):
    </p>
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {QUICK_TEMPLATES.map(t => (
            <button
                key={t.id}
                type="button"
                onClick={() => {
                    setSelectedTemplate(selectedTemplate === t.id ? null : t.id);
                    if (selectedTemplate !== t.id && !uploadTitle) {
                        setUploadTitle(`Clase de ${t.name}`);
                    }
                }}
                style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: `1px solid ${selectedTemplate === t.id ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    background: selectedTemplate === t.id ? 'var(--primary-light)' : 'white',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: selectedTemplate === t.id ? 700 : 400,
                    color: selectedTemplate === t.id ? 'var(--primary-color)' : 'var(--text-primary)',
                }}
            >
                {t.icon} {t.name}
            </button>
        ))}
    </div>
</div>
```

- [ ] **Step 3: Modificar `handleSaveDocument` para generar con IA si hay plantilla seleccionada**

Al inicio de `handleSaveDocument`, después de la línea `setLoading(true)`:

```typescript
// Si hay plantilla seleccionada, generar contenido con IA antes de guardar
if (selectedTemplate && uploadType === 'editor') {
    const template = QUICK_TEMPLATES.find(t => t.id === selectedTemplate);
    if (template) {
        try {
            const { generateFullPlan } = await import('../ai/aiService');
            const description = template.prompt + (uploadTitle ? ` Título específico: ${uploadTitle}.` : '');
            const generated = await generateFullPlan(description);
            if (!uploadTitle) setUploadTitle(generated.title);
            // Use generated content for the new document
            content = generated.content;
        } catch (e) {
            showToast('No se pudo generar con IA, se creará sin contenido.', 'warning');
        }
    }
}
```

Nota: Esta modificación requiere mover la variable `content` antes del bloque de plantilla o convertirla en `let`. En el `handleSaveDocument` actual, `content` se declara con `let`:

```typescript
let content = uploadType === 'word' || uploadType === 'editor' ? fileContent : null;
```

Agregar el bloque de plantilla inmediatamente después de esta línea.

- [ ] **Step 4: Limpiar `selectedTemplate` al cerrar el modal**

En los handlers que cierran el modal (close button, después de guardar):

```typescript
setSelectedTemplate(null);
```

Agregar esta línea en `setIsCreating(false)` y en el cleanup de `handleSaveDocument`.

- [ ] **Step 5: Commit**

```bash
git add src/features/editor/DocumentEditor.tsx
git commit -m "feat(editor): add AI template selection to document creation modal"
```

---

## Verificación final

- [ ] **Correr todos los tests**

```bash
npx vitest run
```
Expected: todos los tests pasan.

- [ ] **Verificar TypeScript**

```bash
npx tsc --noEmit
```
Expected: sin errores de tipos.

- [ ] **Levantar la app y probar el flujo completo**

```bash
npm run dev
```

Flujo a verificar:
1. Login funciona sin el botón de acceso rápido
2. Abrir AiSidebar → tab Generar → escribir descripción → generar → se crea el documento
3. Plantillas rápidas pre-llenan el prompt
4. Abrir documento → tab Analizar → "Analizar este Documento" → muestra metadata
5. Tab Mejorar → generar rúbrica → insertar al final
6. Tab Mejorar → sugerir actividades → insertar una
7. Seleccionar texto en editor → tab Mejorar → "Mejorar texto seleccionado" → reemplaza
8. Tab Chat sin doc → pregunta sobre todas las planificaciones
9. Eliminar documento → aparece ConfirmModal (no window.confirm)
10. Export PDF → diálogo de impresión del navegador
11. Duplicar → se crea copia con "Copia de ..."
12. Crear con plantilla → se genera contenido automáticamente
