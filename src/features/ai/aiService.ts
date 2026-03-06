// Simulated AI service for extracting metadata and technical requirements from Rich Text

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeDocumentContent = async (htmlContent: string, title: string = ''): Promise<{
    metadata: AIMetadata;
    requirements: AITechnicalRequirements;
}> => {
    // Simulate API delay
    await sleep(1500);

    const textContent = (title + ' ' + htmlContent).replace(/<[^>]+>/g, ' ').toLowerCase();

    // Category Detection (New Feature)
    let detectedCategory = 'No clasificado';
    if (textContent.includes('manualidad') || textContent.includes('arte') || textContent.includes('pintura')) {
        detectedCategory = 'Manualidades';
    } else if (textContent.includes('proyecto') || textContent.includes('institucional')) {
        detectedCategory = 'Proyecto Institucional';
    } else if (textContent.includes('programación') || textContent.includes('programacion') || textContent.includes('robot') || textContent.includes('robótica')) {
        detectedCategory = 'Programación y Robótica';
    } else if (textContent.includes('ciudadanía') || textContent.includes('ciudadania') || textContent.includes('redes') || textContent.includes('internet')) {
        detectedCategory = 'Ciudadanía Digital';
    } else if (textContent.includes('cuidado') || textContent.includes('seguridad') || textContent.includes('privacidad')) {
        detectedCategory = 'Cuidado Digital';
    } else if (textContent.includes('alfabetización') || textContent.includes('alfabetizacion') || textContent.includes('lectura') || textContent.includes('escribir')) {
        detectedCategory = 'Alfabetización';
    }

    const metadata: AIMetadata = {
        subject: textContent.includes('electricidad') ? 'Taller de Electricidad' : 'Tema General',
        course: textContent.includes('2do') ? '2do B' : '1er A',
        year: '2026',
        hourlyLoad: textContent.includes('hora') ? '4 Módulos' : '2 Módulos',
        classNumber: textContent.includes('clase 1') ? '1' : '1',
        category: detectedCategory
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
    if (textContent.includes('computadora') || textContent.includes('pc')) {
        requirements.tools.push('Computadora / Notebook');
    }
    if (textContent.includes('robot') || textContent.includes('arduino')) {
        requirements.tools.push('Placa de Desarrollo', 'Sensores');
    }

    // Materials detection
    if (textContent.includes('cable') || textContent.includes('cobre')) {
        requirements.materials.push('Cables unipolares 2.5mm', 'Cinta aisladora');
    }
    if (textContent.includes('enchufe') || textContent.includes('tomacorriente')) {
        requirements.materials.push('Tomacorrientes', 'Fichas macho/hembra');
    }
    if (textContent.includes('papel') || textContent.includes('cartón') || textContent.includes('pegamento')) {
        requirements.materials.push('Cartulina', 'Tijeras', 'Pegamento');
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
