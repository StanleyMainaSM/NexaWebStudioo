import { useSyncExternalStore } from 'react';
import type { Template } from './types';
import { initialTemplates } from './lib/template-data';

type AppState = { templates: Template[]; favorites: string[]; currentTemplate: Template | null; addTemplate: (template: Template) => void; setCurrentTemplate: (template: Template | null) => void; toggleFavorite: (id: string) => void; updateTemplateTheme: (themeUpdates: Partial<Template['theme']>) => void; updateSectionContent: (sectionId: string, contentUpdates: any) => void };
let state: AppState = { templates: initialTemplates, favorites: [], currentTemplate: null, addTemplate: (template) => setState((s) => ({ templates: [template, ...s.templates] })), setCurrentTemplate: (template) => setState(() => ({ currentTemplate: template })), toggleFavorite: (id) => setState((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((fid) => fid !== id) : [...s.favorites, id] })), updateTemplateTheme: (themeUpdates) => setState((s) => { if (!s.currentTemplate) return s; const updated = { ...s.currentTemplate, theme: { ...s.currentTemplate.theme, ...themeUpdates } }; return { ...s, currentTemplate: updated, templates: s.templates.map((t) => t.id === updated.id ? updated : t) }; }), updateSectionContent: (sectionId, contentUpdates) => setState((s) => { if (!s.currentTemplate) return s; const updated = { ...s.currentTemplate, sections: s.currentTemplate.sections.map((sec) => sec.id === sectionId ? { ...sec, content: { ...sec.content, ...contentUpdates } } : sec) }; return { ...s, currentTemplate: updated, templates: s.templates.map((t) => t.id === updated.id ? updated : t) }; }) };
const listeners = new Set<() => void>();
function setState(updater: (current: AppState) => Partial<AppState>) { state = { ...state, ...updater(state) }; if (typeof window !== 'undefined') localStorage.setItem('avelixa-template-studio-v1', JSON.stringify({ templates: state.templates, favorites: state.favorites })); listeners.forEach((listener) => listener()); }
if (typeof window !== 'undefined') { try { const saved = JSON.parse(localStorage.getItem('avelixa-template-studio-v1') || 'null'); if (saved?.templates) state.templates = saved.templates; if (Array.isArray(saved?.favorites)) state.favorites = saved.favorites; } catch {} }
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
const getSnapshot = () => state;
export function useAppStore(): AppState;
export function useAppStore<T>(selector: (state: AppState) => T): T;
export function useAppStore<T>(selector?: (state: AppState) => T) { return useSyncExternalStore(subscribe, () => selector ? selector(state) : state, () => selector ? selector(state) : state); }
