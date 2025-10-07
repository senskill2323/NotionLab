import MainHeroSection from '@/components/home/MainHeroSection';
import SystemsShowcase from '@/components/home/SystemsShowcase';
import StatsSection from '@/components/home/StatsSection';
import FormationsSection from '@/components/home/FormationsSection';
import SupportSection from '@/components/home/SupportSection';
import PromiseSection from '@/components/home/PromiseSection';
import CozySpaceSection from '@/components/home/CozySpaceSection';
import PersonalQuoteSection from '@/components/home/PersonalQuoteSection';
import FinalCTA from '@/components/home/FinalCTA';
import LaunchCTA from '@/components/home/LaunchCTA';
import TubesCursorSection from '@/components/home/TubesCursorSection';
import MaskRevealScrollSection from '@/components/home/MaskRevealScrollSection';
import Footer from '@/components/Footer';

// Central registry of homepage blocks used by both the public HomePage and admin previews
const homeBlockRegistry = {
  'home.main_hero': MainHeroSection,
  'home.systems_showcase': SystemsShowcase,
  'home.stats': StatsSection,
  'home.formations': FormationsSection,
  'home.support': SupportSection,
  'home.promise': PromiseSection,
  'home.cozy_space': CozySpaceSection,
  'home.personal_quote': PersonalQuoteSection,
  'home.final_cta': FinalCTA,
  'home.launch_cta': LaunchCTA,
  'home.mask_reveal_scroll': MaskRevealScrollSection,
  'home.tubes_cursor': TubesCursorSection,
  // Footer is managed as a regular content block when published
  'global.footer': Footer,
};

export default homeBlockRegistry;
