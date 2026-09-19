import { Fragment, createElement, type ComponentType, type ReactNode } from 'react';
const motionProps = new Set(['initial','animate','exit','transition','whileInView','viewport','whileHover','whileTap','layout','layoutId']);
const motion = new Proxy({} as Record<string, ComponentType<any>>, { get: (_, tag: string) => (props: any) => { const clean = { ...props }; motionProps.forEach((key) => delete clean[key]); return createElement(tag, clean, props.children); } });
export { motion };
export function AnimatePresence({ children, mode: _mode }: { children?: ReactNode; mode?: string }) { return createElement(Fragment, null, children); }
