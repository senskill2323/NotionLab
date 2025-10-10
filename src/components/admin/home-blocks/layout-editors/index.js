
import CozySpaceLayoutEditor from './CozySpaceLayoutEditor';
import MainHeroLayoutEditor from './MainHeroLayoutEditor';
import SystemsShowcaseLayoutEditor from './SystemsShowcaseLayoutEditor';
import FullpageWideImageLayoutEditor from './FullpageWideImageLayoutEditor';
import StatsLayoutEditor from './StatsLayoutEditor';
import FormationsLayoutEditor from './FormationsLayoutEditor';
import SupportLayoutEditor from './SupportLayoutEditor';
import PromiseLayoutEditor from './PromiseLayoutEditor';
import PersonalQuoteLayoutEditor from './PersonalQuoteLayoutEditor';
import FinalCtaLayoutEditor from './FinalCtaLayoutEditor';
import LaunchCtaLayoutEditor from './LaunchCtaLayoutEditor';
import MaskRevealLayoutEditor from './MaskRevealLayoutEditor';
import GoogleReviewsLayoutEditor from './GoogleReviewsLayoutEditor';
import TubesCursorLayoutEditor from './TubesCursorLayoutEditor';
import FooterLayoutEditor from './FooterLayoutEditor';
import HtmlLayoutEditor from './HtmlLayoutEditor';

const layoutEditorMap = {
  'home.cozy_space': CozySpaceLayoutEditor,
  'home.main_hero': MainHeroLayoutEditor,
  'home.systems_showcase': SystemsShowcaseLayoutEditor,
  'home.fullpage_wideimage': FullpageWideImageLayoutEditor,
  'home.stats': StatsLayoutEditor,
  'home.formations': FormationsLayoutEditor,
  'home.support': SupportLayoutEditor,
  'home.promise': PromiseLayoutEditor,
  'home.personal_quote': PersonalQuoteLayoutEditor,
  'home.final_cta': FinalCtaLayoutEditor,
  'home.launch_cta': LaunchCtaLayoutEditor,
  'home.mask_reveal_scroll': MaskRevealLayoutEditor,
  'home.google_reviews': GoogleReviewsLayoutEditor,
  'home.tubes_cursor': TubesCursorLayoutEditor,
  'global.footer': FooterLayoutEditor,
  'home.header': HtmlLayoutEditor,
};

export default layoutEditorMap;
