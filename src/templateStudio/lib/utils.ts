export function cn(...inputs: Array<string | false | null | undefined>) { return inputs.filter(Boolean).join(' '); }
export function generateId() { return Math.random().toString(36).substring(2, 9); }
