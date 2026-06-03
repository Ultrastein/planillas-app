import { GoogleGenAI } from '@google/genai';

export interface AIMetadata {
    subject: string;
    course: string;
    year: string;
    hourlyLoad: string;
    classNumber: string;
    category: string;
}

export interface AITechnicalRequirements {
    tools: string[];
    materials: string[];
    ppe: string[]; // Personal Protective Equipment
}

const getGeminiClient = () => {
    // In Vite, environment variables are prefixed with VITE_
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("VITE_GEMINI_API_KEY no está configurada. La IA no funcionará correctamente.");
        return null;
    }
    return new GoogleGenAI({ apiKey: apiKey });
};

export const analyzeDocumentContent = async (htmlContent: string, title: string = ''): Promise<{
    metadata: AIMetadata;
    requirements: AITechnicalRequirements;
}> => {

    const ai = getGeminiClient();

    // Fallback if no API key is present (Safety measure)
    if (!ai) {
        return {
            metadata: {
                subject: 'Falta configurar API Key',
                course: 'Sin Curso',
                year: new Date().getFullYear().toString(),
                hourlyLoad: 'Sin Asignar',
                classNumber: '1',
                category: 'Sin Categorizar'
            },
            requirements: {
                tools: ['Necesitas añadir VITE_GEMINI_API_KEY en .env'],
                materials: ['Falta API Key'],
                ppe: ['Falta API Key']
            }
        }
    }

    const textContent = (title + '\n\n' + htmlContent).replace(/<[^>]+>/g, ' ');

    const systemPrompt = `
Eres un asistente experto en analizar planes de estudio y planillas de profesores técnicos y de talleres.
Se te dará el contenido extraído de un documento de clase. Tu objetivo es leer el documento y extraer estrictamente la siguiente metadata en formato JSON (y nada mas que JSON):

"metadata":
- subject: La temática o título del taller (EJ: "Taller de Electricidad") 
- course: A qué curso o año va dirigido si lo menciona (Ej: "2do B")
- year: Año del ciclo lectivo (Ej: "2026")
- hourlyLoad: Carga horaria que se requiera para la clase (Ej: "2 Modulos" o "4 horas cátedra")
- classNumber: El número de la clase planificada en texto (Ej: "1", "3", o "Clase 4")
- category: A cual de estas SEIS únicas categorías cerradas pertenece más fielmente: "Manualidades", "Proyecto Institucional", "Programación y Robótica", "Ciudadanía Digital", "Cuidado Digital", "Alfabetización". Si no encaja en ninguna porque es totalmente distinta, devuélve "Sin Categorizar".

"requirements":
- tools: Un array de strings con las "Herramientas" (Ej: Pinzas, Computadoras, Destornillador)
- materials: Un array de strings de "Insumos" o "Materiales" gastables (Ej: Pegamento, Cables, Leds)
- ppe: (Equipo de Protección Personal) Un array con elementos de seguridad física o digital mencionados sugeridos.

Formato EXACTO Requerido:
{
  "metadata": {"subject": "string", "course": "string", "year": "string", "hourlyLoad": "string", "classNumber": "string", "category": "string"},
  "requirements": {"tools": ["string"], "materials": ["string"], "ppe": ["string"]}
}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + '\n\n---\nDOCUMENTO A ANALIZAR:\n' + textContent }] }
            ],
            config: {
                temperature: 0.1, // Keep it deterministic
                responseMimeType: 'application/json', // Force JSON structure physically
            }
        });

        // The text is guaranteed to be JSON due to the mimeType configuration
        const dataText = response.text;

        if (!dataText) throw new Error("Respuesta vacía de Gemini");

        const parsedData = JSON.parse(dataText);

        // Return strict type casting
        return {
            metadata: parsedData.metadata || {
                subject: 'Desconocido', course: 'N/A', year: 'N/A', hourlyLoad: 'N/A', classNumber: 'N/A', category: 'Sin Categorizar'
            },
            requirements: parsedData.requirements || {
                tools: [], materials: [], ppe: []
            }
        };

    } catch (e) {
        console.error("Error consultando Gemini AI:", e);
        // Soft fallback
        throw new Error("No se pudo analizar el documento con IA en este momento.");
    }
};

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
    try {
        return JSON.parse(response.text);
    } catch {
        throw new Error('La IA devolvió un formato inválido. Intentá nuevamente.');
    }
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
    try {
        return JSON.parse(response.text);
    } catch {
        throw new Error('La IA devolvió un formato inválido. Intentá nuevamente.');
    }
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
