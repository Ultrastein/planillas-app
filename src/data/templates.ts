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
