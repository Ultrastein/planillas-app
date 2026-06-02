# Planillas App — Mejoras Completas + IA Avanzada

**Fecha:** 2026-06-02  
**Proyecto:** TecnoKids — Gestión de Planificaciones Docentes  
**Alcance:** 3 fases: IA avanzada → Seguridad/Refactor → UX features

---

## Contexto

La app actual gestiona planificaciones docentes con editor rico, carpetas por temática, encadenado de clases, historial de versiones y un `AiSidebar` que analiza el documento abierto y permite chatear con él usando Gemini. El `DocumentEditor.tsx` (~1450 líneas) es el componente central.

El objetivo es convertir la IA en un verdadero asistente docente, limpiar deuda técnica puntual y agregar features UX de productividad.

---

## Orden de implementación

| Fase | Prioridad | Qué incluye |
|------|-----------|-------------|
| 1° | IA avanzada | AiSidebar hub, generador, rúbrica, actividades, resumen, mejora texto, chat multi-doc |
| 2° | Salud del código | Eliminar credenciales hardcodeadas, toast system, confirmaciones propias |
| 3° | UX features | Export PDF, duplicar clase, plantillas predefinidas |

---

## Fase 1 — IA Avanzada

### AiSidebar: arquitectura con pestañas

El `AiSidebar.tsx` actual se expande en un hub con 4 pestañas:

| Tab | Contenido |
|-----|-----------|
| ✨ Generar | Generador de planificación + plantillas rápidas + resumen ejecutivo |
| 🔍 Analizar | Comportamiento actual (análisis de metadata + herramientas/materiales/EPP) |
| 🛠️ Mejorar | Rúbrica, actividades complementarias, mejora de texto seleccionado |
| 💬 Chat | Chat actual + modo multi-documento |

**Props que recibe `AiSidebar`:**
- `selectedDoc: any | null` — documento actualmente abierto
- `allDocuments: any[]` — todos los documentos para el chat multi-doc
- `onCreateDocument(title: string, content: string, metadata: Partial<DocMetadata>): void` — callback para crear un doc desde el generador sin acoplarse al store

**Estado nuevo en `AiSidebar`:**
```ts
activeTab: 'generar' | 'analizar' | 'mejorar' | 'chat'
generatorPrompt: string
generatorLoading: boolean
rubricsResult: string | null       // HTML de tabla de rúbrica
activitiesResult: Activity[] | null
summaryResult: string | null
selectedTextImproveResult: string | null
```

### Funciones nuevas en `aiService.ts`

```ts
generateFullPlan(description: string): Promise<{
  title: string;
  content: string;     // HTML estructurado con objetivos, desarrollo, evaluación
  metadata: {
    curso: string; grado: string; anio: string;
    carga_horaria: string; tematica: string; num_clase: string;
  };
}>

generateRubric(docContent: string, docTitle: string): Promise<string>
// Retorna HTML de tabla con columnas: Criterio | Insatisfactorio | En proceso | Satisfactorio | Sobresaliente

suggestActivities(docContent: string, docTitle: string): Promise<Activity[]>
// Activity = { title: string; description: string; type: 'refuerzo'|'extension'|'evaluacion' }

generateExecutiveSummary(docContent: string, docTitle: string): Promise<string>
// Una oración de resumen para informes

askGeminiQuestion(
  documentContent: string,
  question: string,
  globalContext?: string   // nuevo parámetro opcional: resumen de todos los docs
): Promise<string>
```

Todos usan `gemini-2.5-flash` con `temperature: 0.4` (algo más creativo que el análisis pero aún determinístico).

### Tab Generar — flujo

1. Docente escribe descripción libre en textarea, o clickea una plantilla rápida
2. Click "✨ Generar Planificación Completa"
3. Loading state en el sidebar ("Generando...")
4. `generateFullPlan()` retorna `{ title, content, metadata }`
5. Se llama `onCreateDocument(title, content, metadata)` → el `DocumentEditor` inserta el doc en Supabase y navega a él
6. La pestaña cambia a "Analizar" automáticamente para que el docente vea el resultado

### Plantillas rápidas

Definidas en `src/data/templates.ts`:

```ts
export const QUICK_TEMPLATES = [
  {
    id: 'electricidad', name: 'Electricidad', icon: '⚡',
    prompt: 'Clase de taller de electricidad para secundaria técnica. Incluir: conceptos básicos de circuitos, actividad práctica de armado, evaluación de seguridad eléctrica y EPP requerido.'
  },
  {
    id: 'robotica', name: 'Robótica', icon: '🤖',
    prompt: 'Clase de taller de robótica con Arduino para secundaria técnica. Incluir: introducción teórica, programación de pines digitales o sensores, actividad práctica de construcción y prueba de circuito.'
  },
  {
    id: 'programacion', name: 'Programación', icon: '🖥️',
    prompt: 'Clase de programación y pensamiento computacional para secundaria. Incluir: concepto algorítmico, ejercicio de pseudocódigo o código en Scratch/Python, y actividad de resolución de problemas.'
  },
  {
    id: 'digital', name: 'Ciudadanía Digital', icon: '📱',
    prompt: 'Clase sobre ciudadanía digital y uso responsable de tecnología para adolescentes. Incluir: análisis de caso real, debate guiado, y compromisos de uso seguro en redes.'
  },
]
```

Clickear una plantilla pre-llena el `generatorPrompt` con su prompt base. El docente puede editarlo antes de generar.

### Tab Mejorar — flujo de cada herramienta

**Rúbrica:**
1. Click "Generar Rúbrica"
2. `generateRubric(selectedDoc.content, selectedDoc.title)`
3. Se muestra la tabla HTML en el sidebar
4. Botón "Insertar al final del documento" → `handleAutoSave` con el contenido original + rúbrica appended

**Actividades:**
1. Click "Sugerir Actividades"
2. `suggestActivities(...)` retorna 3 objetos `Activity`
3. Se listan en el sidebar con badge de tipo (refuerzo/extensión/evaluación)
4. Cada una tiene botón "Insertar" → inserta esa actividad al final del documento

**Mejora de texto seleccionado:**
1. `RichTextEditor` expone una prop `onSelectionChange(selectedText: string)` que se dispara cada vez que cambia la selección en TipTap (via el evento `selectionUpdate` del editor)
2. `DocumentEditor` pasa este texto seleccionado como prop `selectedText` al `AiSidebar`
3. El sidebar muestra un preview del texto cuando `selectedText` es no vacío
4. Click "Mejorar texto seleccionado" → llama a Gemini con ese texto
5. El resultado se devuelve via un callback `onImprovedText(improved: string)` hacia `DocumentEditor`
6. `DocumentEditor` usa la API de TipTap (`editor.commands.insertContentAt` sobre el rango de la selección guardada) para reemplazar el texto original

### Tab Chat — modo multi-documento

- Si `selectedDoc !== null`: comportamiento actual (contexto = contenido del doc)
- Si `selectedDoc === null` (vista grilla): el contexto enviado a Gemini es un resumen de todos los documentos:
  ```
  Tienes acceso a {N} planificaciones: [título - temática - grado - autor, ...]
  ```
- El placeholder del input cambia según el modo: "¿Qué querés saber sobre esta clase?" vs "¿Qué querés saber sobre todas las planificaciones?"

---

## Fase 2 — Seguridad y Toasts

### Eliminar credenciales hardcodeadas

En `AuthPage.tsx`, remover el botón "Acceso Rápido (Pruebas IA)" que contiene `admin@test.com` / `123456` hardcodeados. Esto solo debe existir en entornos de desarrollo local con variables de entorno, no en código fuente.

### Sistema de Toasts

Crear `src/components/Toast/`:
- `Toast.tsx` — componente visual (éxito/error/warning/info, auto-dismiss en 4s)
- `useToast.ts` — hook con `showToast(message, type)`, gestiona una cola de toasts
- `ToastContainer.tsx` — renderiza la cola, posicionado fixed en esquina inferior derecha

El `ToastContainer` se monta en `App.tsx`. Todos los `alert(...)` y confirmaciones no-destructivas en `DocumentEditor.tsx` (~15 instancias) se reemplazan por `showToast(...)`.

### Confirmaciones destructivas

Las acciones "Eliminar documento" y "Vaciar papelera" usan un `ConfirmModal` propio en lugar de `window.confirm`. El modal tiene título, descripción del riesgo, y botones "Cancelar" / "Confirmar (rojo)".

---

## Fase 3 — Features UX

### Exportar a PDF

Botón "Exportar PDF" en la ribbon del documento (solo para `file_type === 'editor'`).

Implementación: `window.print()` con estilos CSS `@media print` que:
- Ocultan sidebar de metadata, navbar, ribbon de acciones, panel de comentarios
- Muestran solo el contenido del editor a ancho completo
- Agregan el título del documento como header de impresión

Sin dependencias externas (no jsPDF). Funciona en todos los navegadores modernos.

### Duplicar Clase

Botón "Duplicar" en la ribbon (visible solo para usuarios con permiso de creación).

Flujo:
1. Click → crea un nuevo documento en Supabase con los mismos campos excepto:
   - `title`: `"Copia de [título original]"`
   - `author_id/name/role`: el usuario actual (no el autor original)
   - `created_at`: ahora
   - `next_class_id`: null (no hereda el encadenado)
2. Navega al nuevo documento

### Plantillas predefinidas

Las mismas 4 plantillas de `QUICK_TEMPLATES` del tab "Generar" del sidebar. Reutilizan el mismo array exportado desde `src/data/templates.ts`.

Al crear una clase nueva (modal de creación), se agrega una sección opcional "Partir de una plantilla" que muestra los 4 chips. Seleccionar uno pre-llena el campo de descripción en el modal pero no genera automáticamente — el docente hace click en "Crear y Publicar" como siempre, y el contenido inicial se genera via IA.

---

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/features/ai/aiService.ts` | +4 funciones nuevas, parámetro opcional en `askGeminiQuestion` |
| `src/features/ai/AiSidebar.tsx` | Reescritura completa con pestañas |
| `src/features/ai/AiSidebar.module.css` | Estilos para tabs y nuevas secciones |
| `src/features/auth/AuthPage.tsx` | Eliminar botón de acceso rápido |
| `src/features/editor/DocumentEditor.tsx` | Prop `onCreateDocument` al sidebar, botones PDF/Duplicar, integrar toasts, ConfirmModal, pasar `selectedText` y `onImprovedText` |
| `src/features/editor/RichTextEditor.tsx` | Nueva prop `onSelectionChange(text: string)` vía evento `selectionUpdate` de TipTap |
| `src/data/templates.ts` | Nuevo archivo — 4 plantillas |
| `src/components/Toast/Toast.tsx` | Nuevo |
| `src/components/Toast/useToast.ts` | Nuevo |
| `src/components/Toast/ToastContainer.tsx` | Nuevo |
| `src/components/ConfirmModal.tsx` | Nuevo |
| `src/App.tsx` | Montar `ToastContainer` |

---

## Decisiones de diseño

- **No se agrega dependencia `jsPDF`** — `window.print()` es suficiente y evita bundle overhead
- **Plantillas son prompts, no contenido fijo** — genera contenido fresco cada vez, más útil que un template estático
- **La mejora de texto usa el evento `selectionUpdate` de TipTap** — `RichTextEditor` expone `onSelectionChange` prop; el reemplazo usa `editor.commands.insertContentAt` con el rango guardado, que es la forma correcta con TipTap y evita conflictos con su DOM virtual
- **El chat multi-doc usa resumen comprimido** — no se envía contenido completo de todos los docs a Gemini (ahorra tokens)
- **`onCreateDocument` como callback** — desacopla el generador del store de documentos; el DocumentEditor sigue siendo el dueño del estado
