const hasStructuredClone = typeof structuredClone === 'function';

export const clone = (value) => {
  if (value == null) return value;
  if (hasStructuredClone) {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const safeString = (value) => (value == null ? '' : String(value));

export const ensureString = (value, fallback = '') =>
  value == null ? fallback : String(value);

export const ensureNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const ensureBoolean = (value, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;

export const ensureArray = (value, fallback = []) =>
  Array.isArray(value) ? value : clone(fallback);

export const DEFAULT_TUBES_TITLES = Object.freeze({
  title1: 'Tubes',
  title2: 'Cursor',
  title3: 'WebGPU / WebGL',
});

export const sanitizeTubesTitles = (titles = {}) => ({
  title1: safeString(titles.title1).trim() || DEFAULT_TUBES_TITLES.title1,
  title2: safeString(titles.title2).trim() || DEFAULT_TUBES_TITLES.title2,
  title3: safeString(titles.title3).trim() || DEFAULT_TUBES_TITLES.title3,
});

export const DEFAULT_MASK_GRADIENT =
  'linear-gradient(125deg, #EDF9FF 0%, #FFE8DB 100%)';

export const DEFAULT_MASK_REVEAL_CONTENT = Object.freeze({
  baseBackgroundColor: '#f9ffe7',
  backgroundColor: '#f9ffe7',
  backgroundGradient: DEFAULT_MASK_GRADIENT,
  backgroundImage: '',
  backgroundMode: 'color',
  useDefaultBackground: true,
  backgroundColors: ['#EDF9FF', '#FFECF2', '#FFE8DB'],
  items: [
    {
      id: 'green-arch',
      title: 'Green Cityscape',
      description:
        'Vibrant streets with vertical gardens and solar buildings. This oasis thrives on renewable energy, smart transport, and green spaces for biodiversity.',
      link: {
        label: 'Learn More',
        href: '#',
        backgroundColor: '#D5FF37',
      },
    },
    {
      id: 'blue-arch',
      title: 'Blue Urban Oasis',
      description:
        'Avenues with azure facades and eco-structures. This hub uses clean energy, smart transit, and parks for urban wildlife.',
      link: {
        label: 'Learn More',
        href: '#',
        backgroundColor: '#7DD6FF',
      },
    },
    {
      id: 'pink-arch',
      title: 'Fluid Architecture',
      description:
        'Desert refuge with fluid architecture and glowing interiors. This sanctuary harnesses solar power, sustainable design, and natural harmony for resilient living.',
      link: {
        label: 'Learn More',
        href: '#',
        backgroundColor: '#FFA0B0',
      },
    },
    {
      id: 'orange-arch',
      title: 'Martian Arches',
      description:
        'Ethereal structures arc over tranquil waters, bathed in the glow of a setting Martian sun. This desolate beauty showcases the stark, captivating landscape of the red planet.',
      link: {
        label: 'Learn More',
        href: '#',
        backgroundColor: '#FFA17B',
      },
    },
  ],
  images: [
    {
      id: 'green-image',
      src: 'https://res.cloudinary.com/dbsuruevi/image/upload/v1757093052/cu8978xjlsjjpjk52ta0.webp',
      alt: 'Green Architecture',
      order: 4,
    },
    {
      id: 'blue-image',
      src: 'https://res.cloudinary.com/dbsuruevi/image/upload/v1757093053/trh7c8ufv1dqfrofdytd.webp',
      alt: 'Blue Architecture',
      order: 3,
    },
    {
      id: 'pink-image',
      src: 'https://res.cloudinary.com/dbsuruevi/image/upload/v1757093052/aw6qwur0pggp5r03whjq.webp',
      alt: 'Pink Architecture',
      order: 2,
    },
    {
      id: 'orange-image',
      src: 'https://res.cloudinary.com/dbsuruevi/image/upload/v1757093053/sqwn8u84zd1besgl0zpd.webp',
      alt: 'Orange Architecture',
      order: 1,
    },
  ],
});
