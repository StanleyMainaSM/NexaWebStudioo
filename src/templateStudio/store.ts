import { useSyncExternalStore } from 'react';
import type { Template } from './types';
import { initialTemplates } from './lib/template-data';

type AppState = { templates: Template[]; favorites: string[]; currentTemplate: Template | null; creationProjectId: string | null; addTemplate: (template: Template) => void; setCurrentTemplate: (template: Template | null) => void; setCreationProjectId: (id: string | null) => void; toggleFavorite: (id: string) => void; updateTemplateTheme: (themeUpdates: Partial<Template['theme']>) => void; updateSectionContent: (sectionId: string, contentUpdates: any) => void };
let state: AppState = { templates: initialTemplates, favorites: [], currentTemplate: null, creationProjectId: null, addTemplate: (template) => setState((s) => ({ templates: [template, ...s.templates] })), setCurrentTemplate: (template) => setState(() => ({ currentTemplate: template })), setCreationProjectId: (id) => setState(() => ({ creationProjectId: id })), toggleFavorite: (id) => setState((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((fid) => fid !== id) : [...s.favorites, id] })), updateTemplateTheme: (themeUpdates) => setState((s) => { if (!s.currentTemplate) return s; const updated = { ...s.currentTemplate, theme: { ...s.currentTemplate.theme, ...themeUpdates } }; return { ...s, currentTemplate: updated, templates: s.templates.map((t) => t.id === updated.id ? updated : t) }; }), updateSectionContent: (sectionId, contentUpdates) => setState((s) => { if (!s.currentTemplate) return s; const updated = { ...s.currentTemplate, sections: s.currentTemplate.sections.map((sec) => sec.id === sectionId ? { ...sec, content: { ...sec.content, ...contentUpdates } } : sec) }; return { ...s, currentTemplate: updated, templates: s.templates.map((t) => t.id === updated.id ? updated : t) }; }) };
const listeners = new Set<() => void>();
function setState(updater: (current: AppState) => Partial<AppState>) { state = { ...state, ...updater(state) };  listeners.forEach((listener) => listener()); }

const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
export function useAppStore(): AppState;
export function useAppStore<T>(selector: (state: AppState) => T): T;
export function useAppStore<T>(selector?: (state: AppState) => T) { return useSyncExternalStore(subscribe, () => selector ? selector(state) : state, () => selector ? selector(state) : state); }
