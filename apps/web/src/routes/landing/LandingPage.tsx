import './landing.css';
import { useReveal } from './useReveal';
import { LandingNav } from './sections/LandingNav';
import { Hero } from './sections/Hero';
import { ProblemSection } from './sections/ProblemSection';
import { FlowSection } from './sections/FlowSection';
import { ModulesSection } from './sections/ModulesSection';
import { RolesSection } from './sections/RolesSection';
import { LandingFooter } from './sections/LandingFooter';

/** Public marketing landing page that composes every section under `.bp-landing`. */
export function LandingPage() {
  useReveal();

  return (
    <div className="bp-landing">
      <LandingNav />
      <Hero />
      <div className="wrap">
        <div className="divider" />
      </div>
      <ProblemSection />
      <FlowSection />
      <ModulesSection />
      <RolesSection />
      <LandingFooter />
    </div>
  );
}
