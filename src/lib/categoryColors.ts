export interface CategoryColor {
    bg: string;
    fg: string;
    dot: string;
}

const UNCATEGORIZED: CategoryColor = { bg: '#EEF1F3', fg: '#3E4C57', dot: '#8CA0AC' };

// Colors from the redesign for the team's current folders
const KNOWN: Record<string, CategoryColor> = {
    'alfabetización': { bg: '#FFF1D6', fg: '#7A4A00', dot: '#F2A93B' },
    'ciudadanía digital': { bg: '#E7EAFF', fg: '#3A3F9E', dot: '#7C83F0' },
    'programación y robótica': { bg: '#DDF2F5', fg: '#125A67', dot: '#39B0C4' },
};

const PALETTE: CategoryColor[] = [
    { bg: '#DDF2F5', fg: '#125A67', dot: '#39B0C4' },
    { bg: '#FFF1D6', fg: '#7A4A00', dot: '#F2A93B' },
    { bg: '#E7EAFF', fg: '#3A3F9E', dot: '#7C83F0' },
    { bg: '#FCE7F0', fg: '#8A1F4C', dot: '#E46A9C' },
    { bg: '#E3F4E8', fg: '#1F6B3A', dot: '#4CB872' },
    { bg: '#FDE9DD', fg: '#8A3A0F', dot: '#EE8A4F' },
];

// Stable color per category name, so a folder keeps its color across sessions
export function getCategoryColor(name?: string | null): CategoryColor {
    if (!name || name === 'Sin Categorizar') return UNCATEGORIZED;
    const known = KNOWN[name.trim().toLowerCase()];
    if (known) return known;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) | 0;
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
}
