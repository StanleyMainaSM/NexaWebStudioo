import { Routes, Route, Navigate } from 'react-router-dom';
import Nav from './components/Nav';
import Footer from './components/Footer';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import Home from './templateStudio/pages/Home';
import Wizard from './templateStudio/pages/Wizard';
import Gallery from './templateStudio/pages/Gallery';
import Preview from './templateStudio/pages/Preview';
import Favorites from './templateStudio/pages/Favorites';
import './templateStudio.css';

export default function TemplateStudioApp({ publicShell = false }: { publicShell?: boolean }) {
  const studio = <div className="template-studio min-h-screen bg-white"><Routes><Route index element={<Home />} /><Route path="wizard" element={<Wizard />} /><Route path="gallery" element={<Gallery />} /><Route path="favorites" element={<Favorites />} /><Route path="preview" element={<Preview />} /><Route path="*" element={<Navigate to="." replace />} /></Routes></div>;
  if (!publicShell) return studio;
  return <div className="relative min-h-screen bg-ink-950 overflow-x-hidden"><Nav /><main>{studio}</main><Footer /><FloatingWhatsApp /></div>;
}
