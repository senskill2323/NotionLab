import CozySpaceSection from '@/components/home/CozySpaceSection';
import FinalCTA from '@/components/home/FinalCTA';
import FormationsSection from '@/components/home/FormationsSection';
import LaunchCTA from '@/components/home/LaunchCTA';
import MainHeroSection from '@/components/home/MainHeroSection';
import MaskRevealScrollSection from '@/components/home/MaskRevealScrollSection';
import PersonalQuoteSection from '@/components/home/PersonalQuoteSection';
import PromiseSection from '@/components/home/PromiseSection';
import StatsSection from '@/components/home/StatsSection';
import SupportSection from '@/components/home/SupportSection';
import SystemsShowcase from '@/components/home/SystemsShowcase';
import TubesCursorSection from '@/components/home/TubesCursorSection';
import Footer from '@/components/Footer';
import {
  clone,
  ensureArray,
  ensureBoolean,
  ensureNumber,
  ensureString,
  sanitizeTubesTitles,
  DEFAULT_TUBES_TITLES,
  DEFAULT_MASK_REVEAL_CONTENT,
} from './layoutRegistry.shared';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const createPreview = (component, mapProps) =>
  component
    ? {
        component,
        mapProps,
      }
    : undefined;

const createDefinition = ({
  id,
  label,
  blockType = 'dynamic',
  defaults,
  normalize,
  serialize,
  deserialize,
  preview,
}) => {
  const resolveDefaults = () =>
    clone(typeof defaults === 'function' ? defaults() : defaults);

  const runNormalize = (value, fallback) =>
    normalize
      ? normalize(value ?? {}, fallback ?? resolveDefaults())
      : Object.assign(resolveDefaults(), clone(value ?? {}));

  const runSerialize = (value) =>
    serialize
      ? serialize(value ?? {}, resolveDefaults())
      : runNormalize(value, resolveDefaults());

  const runDeserialize = (value, fallback) =>
    deserialize
      ? deserialize(value ?? {}, fallback ?? resolveDefaults())
      : runNormalize(value, fallback ?? resolveDefaults());

  return {
    id,
    label,
    blockType,
    getDefaultState: resolveDefaults,
    serialize: runSerialize,
    deserialize: runDeserialize,
    preview,
  };
};

const MAIN_HERO_DEFAULTS = Object.freeze({
  imageUrl: '',
  overlayOpacity: 0.35,
});

const normalizeMainHero = (value = {}, fallback = MAIN_HERO_DEFAULTS) => ({
  imageUrl: ensureString(value.imageUrl, fallback.imageUrl),
  overlayOpacity: clamp(
    ensureNumber(value.overlayOpacity, fallback.overlayOpacity),
    0,
    1,
  ),
});

const SYSTEMS_SHOWCASE_DEFAULTS = Object.freeze({
  title: 'Découvrez mes systèmes',
  titleSuffix: '',
  images: [],
  buttonText: 'Faites un tour du propriétaire',
  buttonLink: '/mes-systemes',
});

const normalizeSystemsShowcase = (value = {}, fallback = SYSTEMS_SHOWCASE_DEFAULTS) => {
  const images = ensureArray(value.images, fallback.images)
    .map((img) => {
      if (typeof img === 'string') {
        const trimmed = img.trim();
        if (!trimmed || trimmed.toLowerCase() === '[object object]') {
          return '';
        }
        return trimmed;
      }
      if (img && typeof img === 'object') {
        const legacyUrl =
          img.url ??
          img.src ??
          img.href ??
          img.imageUrl ??
          img.publicUrl ??
          img.path ??
          null;
        if (typeof legacyUrl === 'string') {
          const normalized = legacyUrl.trim();
          return normalized.toLowerCase() === '[object object]' ? '' : normalized;
        }
        return '';
      }
      const fallback = ensureString(img, '').trim();
      return fallback.toLowerCase() === '[object object]' ? '' : fallback;
    })
    .filter(Boolean)
    .slice(0, 4);

  return {
    title: ensureString(value.title, fallback.title),
    titleSuffix: ensureString(value.titleSuffix, fallback.titleSuffix),
    images,
    buttonText: ensureString(value.buttonText, fallback.buttonText),
    buttonLink: ensureString(value.buttonLink, fallback.buttonLink),
  };
};

const COZY_SPACE_DEFAULTS = Object.freeze({
  badgeText: 'Votre Espace Privilégié',
  badgeIcon: 'Sparkles',
  showBadge: true,
  title: 'Installez-vous confortablement dans votre espace de formation',
  description:
    "J'ai mis le paquet sur votre espace personnel. Contrairement à d'autres plateformes, ici, tout est pensé pour être une extension de votre propre espace de travail. C'est un lieu pour apprendre, expérimenter et interagir, sans jamais vous sentir perdu.",
  imageUrl: 'https://images.unsplash.com/photo-1590177600178-c2597bd63ea7',
  imageAlt:
    "Un espace de travail moderne et confortable avec un ordinateur portable ouvert sur une application de formation",
  showCta: false,
  ctaText: 'Découvrir maintenant',
  ctaUrl: '#',
  useDefaultBackground: true,
  backgroundColor: '#1f2937',
});

const normalizeCozySpace = (value = {}, fallback = COZY_SPACE_DEFAULTS) => ({
  badgeText: ensureString(value.badgeText, fallback.badgeText),
  badgeIcon: ensureString(value.badgeIcon, fallback.badgeIcon),
  showBadge: ensureBoolean(
    value.showBadge,
    fallback.showBadge,
  ),
  title: ensureString(value.title, fallback.title),
  description: ensureString(value.description, fallback.description),
  imageUrl: ensureString(value.imageUrl, fallback.imageUrl),
  imageAlt: ensureString(value.imageAlt, fallback.imageAlt),
  showCta: ensureBoolean(value.showCta, fallback.showCta),
  ctaText: ensureString(value.ctaText, fallback.ctaText),
  ctaUrl: ensureString(value.ctaUrl, fallback.ctaUrl),
  useDefaultBackground: ensureBoolean(
    value.useDefaultBackground,
    fallback.useDefaultBackground,
  ),
  backgroundColor: ensureString(value.backgroundColor, fallback.backgroundColor),
});

const PROMISE_DEFAULTS = Object.freeze({
  title: 'Ma promesse,',
  titleSuffix: 'simple.',
  items: [
    {
      icon: 'Users',
      title: 'La passion avant-tout',
      text:
        "Je suis juste un passionné de systèmes, et un passionné de Notion. Je suis bon pédagogue, et j'ai faim de vous apprendre !",
    },
    {
      icon: 'CalendarDays',
      title: 'Premier rendez-vous gratuit',
      text:
        "Lancez-vous : aujourd'hui je suis seul, demain l'équipe grandit – mon envie ? Vous former. Le labo est prêt à accueillir des modérateurs et d'autres experts Notion comme moi.",
    },
    {
      icon: 'Zap',
      title: 'Support Notion éclair ?',
      text:
        "Décrivez votre souci, je réponds dans la journée. Assignez votre demande à un ticket, un message ou même au forum ! Vous aurez de quoi venir trouver les réponses !",
    },
  ],
  showCta: false,
  ctaText: 'Découvrir maintenant',
  ctaUrl: '#',
  useBackgroundImage: false,
  backgroundImage: '',
  useDefaultBackground: true,
  backgroundColor: '',
  backgroundOpacity: 0.5,
});

const buildPromiseItems = (items, fallbackItems) => {
  const source = ensureArray(items, fallbackItems);
  if (!source.length) {
    return clone(fallbackItems);
  }
  return source.map((item, index) => {
    const ref = fallbackItems[index % fallbackItems.length] || fallbackItems[0];
    return {
      icon: ensureString(item.icon, ref.icon),
      title: ensureString(item.title ?? item.heading, ref.title),
      text: ensureString(item.text ?? item.description, ref.text),
    };
  });
};

const buildPromiseState = (value = {}, fallback = PROMISE_DEFAULTS) => ({
    title: ensureString(value.title ?? value.pr_title, fallback.title),
    titleSuffix: ensureString(
      value.titleSuffix ?? value.pr_titleSuffix,
      fallback.titleSuffix,
    ),
    items: buildPromiseItems(
      value.items ?? value.pr_items,
      fallback.items,
    ),
    showCta: ensureBoolean(
      value.showCta ?? value.pr_showCta,
      fallback.showCta,
    ),
    ctaText: ensureString(value.ctaText ?? value.pr_ctaText, fallback.ctaText),
    ctaUrl: ensureString(value.ctaUrl ?? value.pr_ctaUrl, fallback.ctaUrl),
    useBackgroundImage: ensureBoolean(
      value.useBackgroundImage ?? value.pr_useBackgroundImage,
      fallback.useBackgroundImage,
    ),
    backgroundImage: ensureString(
      value.backgroundImage ?? value.pr_backgroundImage,
      fallback.backgroundImage,
    ),
    useDefaultBackground: ensureBoolean(
      value.useDefaultBackground ?? value.pr_useDefaultBackground,
      fallback.useDefaultBackground,
    ),
    backgroundColor: ensureString(
      value.backgroundColor ?? value.pr_backgroundColor,
      fallback.backgroundColor,
    ),
    backgroundOpacity: clamp(
      ensureNumber(
        value.backgroundOpacity ?? value.pr_backgroundOpacity,
        fallback.backgroundOpacity,
      ),
      0,
      1,
    ),
  });

const serializePromise = (value = {}, fallback = PROMISE_DEFAULTS) => {
  const base = buildPromiseState(value, fallback);
  return {
    ...base,
    pr_title: base.title,
    pr_titleSuffix: base.titleSuffix,
    pr_items: base.items.map((item) => ({
      ...item,
      description: item.text,
    })),
    pr_showCta: base.showCta,
    pr_ctaText: base.ctaText,
    pr_ctaUrl: base.ctaUrl,
    pr_useBackgroundImage: base.useBackgroundImage,
    pr_backgroundImage: base.backgroundImage,
    pr_useDefaultBackground: base.useDefaultBackground,
    pr_backgroundColor: base.backgroundColor,
    pr_backgroundOpacity: base.backgroundOpacity,
  };
};

const PERSONAL_QUOTE_DEFAULTS = Object.freeze({
  quoteText:
    "Cela fait une quinzaine d'années que je teste ce type d'outils – c'est mon métier. Mais depuis six ans, pas une seconde l'envie de quitter Notion. Aujourd'hui, je me lance, j'aimerais vous le présenter 🤩",
  showCta: false,
  ctaText: 'En savoir plus',
  ctaUrl: '#',
  useDefaultBackground: true,
  backgroundColor: '#000000',
});

const normalizePersonalQuote = (
  value = {},
  fallback = PERSONAL_QUOTE_DEFAULTS,
) => ({
  quoteText: ensureString(
    value.quoteText ??
      [value.quoteLine1, value.quoteLine2].filter(Boolean).join(' '),
    fallback.quoteText,
  ),
  showCta: ensureBoolean(value.showCta, fallback.showCta),
  ctaText: ensureString(value.ctaText, fallback.ctaText),
  ctaUrl: ensureString(value.ctaUrl, fallback.ctaUrl),
  useDefaultBackground: ensureBoolean(
    value.useDefaultBackground,
    fallback.useDefaultBackground,
  ),
  backgroundColor: ensureString(value.backgroundColor, fallback.backgroundColor),
});

const FINAL_CTA_DEFAULTS = Object.freeze({
  title: 'Boostons vraiment votre productivité ensemble ?',
  description:
    "Rejoignez des milliers d'utilisateurs qui ont déjà révolutionné leur organisation avec Notion. Économisez du temps et de l'énergie en recevant au minimum des astuces pour commencer proprement sur Notion.",
  buttonText: 'Commencer maintenant',
  buttonLink: '/formations',
});

const normalizeFinalCta = (value = {}, fallback = FINAL_CTA_DEFAULTS) => ({
  title: ensureString(value.title, fallback.title),
  description: ensureString(value.description, fallback.description),
  buttonText: ensureString(value.buttonText, fallback.buttonText),
  buttonLink: ensureString(value.buttonLink, fallback.buttonLink),
});

const LAUNCH_CTA_DEFAULTS = Object.freeze({
  displayDate: '',
  heading:
    "Je démarre mon activité et j'ai faim de vous présenter mon outil !",
  subText:
    "Alors s'il vous plaît, n'hésitez pas, faites quelques heures de formation, contactez-moi !",
  buttonText: 'Contactez-moi !',
  buttonLink: '/contact',
  showCta: true,
  iconName: 'Heart',
  useDefaultBackground: true,
  backgroundColor: '#f97316',
  useDefaultGradient: true,
  backgroundGradient: '',
});

const normalizeLaunchCta = (value = {}, fallback = LAUNCH_CTA_DEFAULTS) => ({
  displayDate: ensureString(value.displayDate, fallback.displayDate),
  heading: ensureString(value.heading, fallback.heading),
  subText: ensureString(value.subText, fallback.subText),
  buttonText: ensureString(value.buttonText, fallback.buttonText),
  buttonLink: ensureString(value.buttonLink, fallback.buttonLink),
  showCta: ensureBoolean(value.showCta, fallback.showCta),
  iconName: ensureString(value.iconName, fallback.iconName),
  useDefaultBackground: ensureBoolean(
    value.useDefaultBackground,
    fallback.useDefaultBackground,
  ),
  backgroundColor: ensureString(value.backgroundColor, fallback.backgroundColor),
  useDefaultGradient: ensureBoolean(
    value.useDefaultGradient,
    fallback.useDefaultGradient,
  ),
  backgroundGradient: ensureString(
    value.backgroundGradient,
    fallback.backgroundGradient,
  ),
});

const SUPPORT_DEFAULTS = Object.freeze({
  badgeLabel: 'Votre Bouée de Sauvetage Notion',
  title: 'Ne restez jamais bloqué.',
  subtitle:
    "Le vrai « plus » de mon projet, c'est un système qui vous aide ! Vous avez une ligne directe avec un expert Notion, et j'espère à la longue, plusieurs passionnés qui me rejoindront.",
  imageUrl:
    'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/capture-daa-c-cran-2025-08-24-235707-02xTj.png',
  imageAlt: 'Un expert Notion souriant, prêt à vous accompagner',
});

const normalizeSupport = (value = {}, fallback = SUPPORT_DEFAULTS) => ({
  badgeLabel: ensureString(value.badgeLabel, fallback.badgeLabel),
  title: ensureString(value.title, fallback.title),
  subtitle: ensureString(value.subtitle, fallback.subtitle),
  imageUrl: ensureString(value.imageUrl, fallback.imageUrl),
  imageAlt: ensureString(value.imageAlt, fallback.imageAlt),
});

const STATS_DEFAULTS = Object.freeze({
  title: "La force d'une communauté",
  subtitle:
    "Rejoignez une communauté grandissante et profitez d'un catalogue de formations riche et évolutif.",
});

const normalizeStats = (value = {}, fallback = STATS_DEFAULTS) => ({
  title: ensureString(value.title, fallback.title),
  subtitle: ensureString(value.subtitle, fallback.subtitle),
});

const FORMATIONS_DEFAULTS = Object.freeze({
  title: 'Mes ',
  titleSuffix: 'formations',
  subtitle:
    "Choisissez la formation qui correspond à votre niveau et vos objectifs. Chaque formation est conçue pour vous faire progresser rapidement.",
  backgroundImageUrl:
    'https://images.unsplash.com/photo-1687754946970-5ff99224bd70',
});

const normalizeFormations = (value = {}, fallback = FORMATIONS_DEFAULTS) => ({
  title: ensureString(value.title, fallback.title),
  titleSuffix: ensureString(value.titleSuffix, fallback.titleSuffix),
  subtitle: ensureString(value.subtitle, fallback.subtitle),
  backgroundImageUrl: ensureString(
    value.backgroundImageUrl,
    fallback.backgroundImageUrl,
  ),
});

const normalizeMaskReveal = (
  value = {},
  fallback = DEFAULT_MASK_REVEAL_CONTENT,
) => {
  const base = {
    ...clone(fallback),
    ...clone(value),
  };

  return {
    baseBackgroundColor: ensureString(
      base.baseBackgroundColor,
      fallback.baseBackgroundColor,
    ),
    backgroundColor: ensureString(
      base.backgroundColor,
      fallback.backgroundColor,
    ),
    backgroundGradient: ensureString(
      base.backgroundGradient,
      fallback.backgroundGradient,
    ),
    backgroundImage: ensureString(base.backgroundImage, fallback.backgroundImage),
    backgroundMode: ensureString(base.backgroundMode, fallback.backgroundMode),
    useDefaultBackground: ensureBoolean(
      base.useDefaultBackground,
      fallback.useDefaultBackground,
    ),
    backgroundColors: clone(ensureArray(base.backgroundColors, fallback.backgroundColors)),
    items: clone(ensureArray(base.items, fallback.items)),
    images: clone(ensureArray(base.images, fallback.images)),
  };
};

const FOOTER_DEFAULTS = Object.freeze({
  logoUrl:
    'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/logo_clair-U67WQ.png',
  address: '1315 La Sarraz, Suisse',
  email: 'Vallottonyann@gmail.com',
  phone: '079 576 52 24',
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1151.3494205839254!2d6.516213008580243!3d46.658642866494915!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x478dcb21dc82f31b%3A0x4d82dcf171487de7!2sLa%20Sarraz!5e0!3m2!1sfr!2sch!4v1757538158313!5m2!1sfr!2sch',
  mapLink: 'https://www.google.com/maps/place/La+Sarraz/@46.658643,6.516213,17z',
});

const normalizeFooter = (value = {}, fallback = FOOTER_DEFAULTS) => ({
  logoUrl: ensureString(value.logoUrl, fallback.logoUrl),
  address: ensureString(value.address, fallback.address),
  email: ensureString(value.email, fallback.email),
  phone: ensureString(value.phone, fallback.phone),
  mapEmbedUrl: ensureString(value.mapEmbedUrl, fallback.mapEmbedUrl),
  mapLink: ensureString(value.mapLink, fallback.mapLink),
});

const HTML_DEFAULT = Object.freeze({
  html: '<section class="p-8">Personnalisez votre section HTML ici</section>',
});

const normalizeHtmlLayout = (value = {}, fallback = HTML_DEFAULT) => ({
  html: ensureString(value.html ?? value, fallback.html),
});

const LAYOUT_DEFINITIONS = {
  'home.main_hero': createDefinition({
    id: 'home.main_hero',
    label: 'Accueil • Héro principal',
    defaults: MAIN_HERO_DEFAULTS,
    normalize: normalizeMainHero,
    preview: createPreview(MainHeroSection),
  }),
  'home.systems_showcase': createDefinition({
    id: 'home.systems_showcase',
    label: 'Accueil • Vitrine systèmes',
    defaults: SYSTEMS_SHOWCASE_DEFAULTS,
    normalize: normalizeSystemsShowcase,
    preview: createPreview(SystemsShowcase),
  }),
  'home.cozy_space': createDefinition({
    id: 'home.cozy_space',
    label: 'Accueil • Espace douillet',
    defaults: COZY_SPACE_DEFAULTS,
    normalize: normalizeCozySpace,
    preview: createPreview(CozySpaceSection),
  }),
  'home.promise': createDefinition({
    id: 'home.promise',
    label: 'Accueil • Promesse',
    defaults: PROMISE_DEFAULTS,
    serialize: serializePromise,
    deserialize: buildPromiseState,
    preview: createPreview(PromiseSection),
  }),
  'home.personal_quote': createDefinition({
    id: 'home.personal_quote',
    label: 'Accueil • Citation personnelle',
    defaults: PERSONAL_QUOTE_DEFAULTS,
    normalize: normalizePersonalQuote,
    preview: createPreview(PersonalQuoteSection),
  }),
  'home.final_cta': createDefinition({
    id: 'home.final_cta',
    label: 'Accueil • Appel à l’action final',
    defaults: FINAL_CTA_DEFAULTS,
    normalize: normalizeFinalCta,
    preview: createPreview(FinalCTA),
  }),
  'home.launch_cta': createDefinition({
    id: 'home.launch_cta',
    label: 'Accueil • CTA de lancement',
    defaults: LAUNCH_CTA_DEFAULTS,
    normalize: normalizeLaunchCta,
    preview: createPreview(LaunchCTA),
  }),
  'home.support': createDefinition({
    id: 'home.support',
    label: 'Accueil • Support',
    defaults: SUPPORT_DEFAULTS,
    normalize: normalizeSupport,
    preview: createPreview(SupportSection),
  }),
  'home.stats': createDefinition({
    id: 'home.stats',
    label: 'Accueil • Statistiques',
    defaults: STATS_DEFAULTS,
    normalize: normalizeStats,
    preview: createPreview(StatsSection),
  }),
  'home.formations': createDefinition({
    id: 'home.formations',
    label: 'Accueil • Formations',
    defaults: FORMATIONS_DEFAULTS,
    normalize: normalizeFormations,
    preview: createPreview(FormationsSection),
  }),
  'home.mask_reveal_scroll': createDefinition({
    id: 'home.mask_reveal_scroll',
    label: 'Accueil • Masque révélateur',
    defaults: DEFAULT_MASK_REVEAL_CONTENT,
    normalize: normalizeMaskReveal,
    preview: createPreview(MaskRevealScrollSection, (content, context = {}) => ({
      content,
      isPreview: context.previewMode !== 'live',
    })),
  }),
  'home.tubes_cursor': createDefinition({
    id: 'home.tubes_cursor',
    label: 'Accueil • Tubes interactifs',
    defaults: DEFAULT_TUBES_TITLES,
    normalize: (value) => sanitizeTubesTitles(value),
    preview: createPreview(TubesCursorSection, (content, context = {}) => ({
      content,
      isPreview: context.previewMode !== 'live',
    })),
  }),
  'global.footer': createDefinition({
    id: 'global.footer',
    label: 'Global • Pied de page',
    defaults: FOOTER_DEFAULTS,
    normalize: normalizeFooter,
    preview: createPreview(Footer, (content, context = {}) => ({
      content,
      isPreview: context.previewMode !== 'live',
    })),
  }),
  'home.header': createDefinition({
    id: 'home.header',
    label: 'Accueil • En-tête HTML',
    blockType: 'html',
    defaults: HTML_DEFAULT,
    normalize: normalizeHtmlLayout,
  }),
};

export const getLayoutDefinition = (layout) =>
  LAYOUT_DEFINITIONS[layout] ?? null;

export const getLayoutKeys = () => Object.keys(LAYOUT_DEFINITIONS);

export const getDefaultEditorState = (layout) => {
  const definition = getLayoutDefinition(layout);
  return definition ? definition.getDefaultState() : {};
};

export const serializeLayoutContent = (layout, state) => {
  const definition = getLayoutDefinition(layout);
  if (!definition) {
    return clone(state ?? {});
  }
  return definition.serialize(state);
};

export const deserializeLayoutContent = (layout, content) => {
  const definition = getLayoutDefinition(layout);
  if (!definition) {
    return clone(content ?? {});
  }
  return definition.deserialize(content);
};

export const getLayoutPreviewProps = (layout, state, context = {}) => {
  const definition = getLayoutDefinition(layout);
  if (!definition?.preview?.component) return null;

  const serialized = definition.serialize(state);
  const { component, mapProps } = definition.preview;
  const props = mapProps
    ? mapProps(serialized, context)
    : {
        content: serialized,
        isPreview: context.previewMode !== 'live',
        previewMode: context.previewMode,
      };

  return {
    component,
    props,
  };
};
