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

export const askGeminiQuestion = async (documentContent: string, question: string): Promise<string> => {
    const ai = getGeminiClient();
    if (!ai) return "No hay conexión con la Inteligencia Artificial. Falta tu API Key.";

    // Remove HTML tags for token saving
    const cleanContext = documentContent.replace(/<[^>]+>/g, ' ');

    const prompt = `
Eres un asistente experto para Profesores. Se te dará el contenido de una clase planificada y luego una pregunta al respecto.
Responde de forma concisa, educada, y muy útil, basándote UNICAMENTE en el contenido del documento.
No alucines clases que no están en el texto.
    
--- CONTEXTO DEL DOCUMENTO ---
${cleanContext}

--- PREGUNTA DEL PROFESOR ---
${question}
    `;

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
