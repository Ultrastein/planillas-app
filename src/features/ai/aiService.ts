// Simulated AI service for extracting metadata and technical requirements from Rich Text

export interface AIMetadata {
    subject: string;
    course: string;
    year: string;
    hourlyLoad: string;
    classNumber: string;
}

export interface AITechnicalRequirements {
    tools: string[];
    materials: string[];
    ppe: string[]; // Personal Protective Equipment
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeDocumentContent = async (htmlContent: string): Promise<{
    metadata: AIMetadata;
    requirements: AITechnicalRequirements;
}> => {
    // Simulate API delay
    await sleep(1500);

    const textContent = htmlContent.replace(/<[^>]+>/g, ' ').toLowerCase();

    // Mock extraction logic based on keywords
    const metadata: AIMetadata = {
        subject: textContent.includes('electricidad') ? 'Taller de Electricidad' : 'Desconocida',
        course: textContent.includes('2do') ? '2do B' : '1er A',
        year: '2026',
        hourlyLoad: textContent.includes('hora') ? '4 Módulos' : '2 Módulos',
        classNumber: textContent.includes('clase 1') ? '1' : 'Autodetectado',
    };

    const requirements: AITechnicalRequirements = {
        tools: [],
        materials: [],
        ppe: []
    };

    // Tools detection
    if (textContent.includes('pinza') || textContent.includes('alicate')) {
        requirements.tools.push('Pinzas de electricista', 'Alicates', 'Destornillador Phillips');
    }
    if (textContent.includes('multímetro') || textContent.includes('tester')) {
        requirements.tools.push('Multímetro Digital');
    }

    // Materials detection
    if (textContent.includes('cable') || textContent.includes('cobre')) {
        requirements.materials.push('Cables unipolares 2.5mm', 'Cinta aisladora');
    }
    if (textContent.includes('enchufe') || textContent.includes('tomacorriente')) {
        requirements.materials.push('Tomacorrientes', 'Fichas macho/hembra');
    }

    // PPE detection
    if (textContent.includes('220v') || textContent.includes('tensión') || textContent.includes('electricidad')) {
        requirements.ppe.push('Gafas de seguridad', 'Calzado dieléctrico');
    }
    if (textContent.includes('soldar') || textContent.includes('estaño')) {
        requirements.ppe.push('Extractor de humo', 'Gafas de protección');
    }

    // Fallbacks if nothing detected
    if (requirements.tools.length === 0) requirements.tools.push('Detectando...');
    if (requirements.materials.length === 0) requirements.materials.push('Detectando...');
    if (requirements.ppe.length === 0) requirements.ppe.push('Revisar protocolos');

    return { metadata, requirements };
};
