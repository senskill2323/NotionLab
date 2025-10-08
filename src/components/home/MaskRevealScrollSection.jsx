import React, { useEffect, useMemo, useRef } from 'react';
import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import './MaskRevealScrollSection.css';

const DEFAULT_MASK_GRADIENT = 'linear-gradient(125deg, #EDF9FF 0%, #FFE8DB 100%)';

export const DEFAULT_MASK_REVEAL_CONTENT = {
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
};

let scrollTriggerRegistered = false;
const ensureScrollTrigger = () => {
  if (!scrollTriggerRegistered && typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    scrollTriggerRegistered = true;
  }
};

const MaskRevealScrollSection = ({ content = {}, isPreview = false }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    ensureScrollTrigger();
  }, []);

  const data = useMemo(() => {
    const items =
      Array.isArray(content.items) && content.items.length > 0
        ? content.items
        : DEFAULT_MASK_REVEAL_CONTENT.items;
    const images =
      Array.isArray(content.images) && content.images.length > 0
        ? content.images
        : DEFAULT_MASK_REVEAL_CONTENT.images;
    const backgroundColors =
      Array.isArray(content.backgroundColors) && content.backgroundColors.length > 0
        ? content.backgroundColors
        : DEFAULT_MASK_REVEAL_CONTENT.backgroundColors;

    const useDefaultBackground = content.useDefaultBackground !== false;
    const backgroundMode = content.backgroundMode || (content.backgroundImage ? 'image' : content.backgroundGradient ? 'gradient' : 'color');
    const backgroundGradient = content.backgroundGradient || DEFAULT_MASK_GRADIENT;
    const backgroundImage = content.backgroundImage || '';
    const backgroundColor =
      content.backgroundColor ||
      content.baseBackgroundColor ||
      DEFAULT_MASK_REVEAL_CONTENT.backgroundColor;

    const baseBackgroundColor = useDefaultBackground
      ? content.baseBackgroundColor || backgroundColor || DEFAULT_MASK_REVEAL_CONTENT.baseBackgroundColor
      : backgroundMode === 'color'
        ? backgroundColor
        : content.baseBackgroundColor || backgroundColors[0] || DEFAULT_MASK_REVEAL_CONTENT.baseBackgroundColor;

    return {
      ...DEFAULT_MASK_REVEAL_CONTENT,
      ...content,
      items,
      images,
      backgroundColors,
      backgroundMode,
      backgroundGradient,
      backgroundImage,
      backgroundColor,
      useDefaultBackground,
      baseBackgroundColor,
    };
  }, [content]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    ensureScrollTrigger();

    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const {
      backgroundColors,
      baseBackgroundColor,
      backgroundMode,
      backgroundGradient,
      backgroundImage,
      backgroundColor,
      useDefaultBackground,
    } = data;
    const targetBackgroundElement = !useDefaultBackground || isPreview ? container : document.body;
    const shouldControlBodyBackground = !isPreview && useDefaultBackground;
    const originalBodyBackground = shouldControlBodyBackground ? document.body.style.backgroundColor : null;

    if (useDefaultBackground) {
      container.style.backgroundImage = '';
      container.style.backgroundSize = '';
      container.style.backgroundRepeat = '';
      container.style.backgroundPosition = '';
      if (isPreview) {
        container.style.backgroundColor = baseBackgroundColor;
      } else {
        container.style.backgroundColor = '';
        document.body.style.backgroundColor = baseBackgroundColor;
      }
    } else {
      const resolvedBaseColor = backgroundMode === 'color' ? (backgroundColor || baseBackgroundColor) : baseBackgroundColor;
      container.style.backgroundColor = resolvedBaseColor;
      container.style.backgroundImage = '';
      container.style.backgroundSize = '';
      container.style.backgroundRepeat = '';
      container.style.backgroundPosition = '';
      if (backgroundMode === 'gradient' && backgroundGradient) {
        container.style.backgroundImage = backgroundGradient;
        container.style.backgroundSize = 'cover';
      } else if (backgroundMode === 'image' && backgroundImage) {
        container.style.backgroundImage = `url(${backgroundImage})`;
        container.style.backgroundSize = 'cover';
        container.style.backgroundRepeat = 'no-repeat';
        container.style.backgroundPosition = 'center';
      }
    }

    let lenisInstance = null;
    let animationFrameId = null;

    if (!isPreview) {
      lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        gestureDirection: 'vertical',
        smoothTouch: true,
        touchMultiplier: 2,
      });

      const raf = (time) => {
        lenisInstance?.raf(time);
        ScrollTrigger.update();
        animationFrameId = window.requestAnimationFrame(raf);
      };

      animationFrameId = window.requestAnimationFrame(raf);
    }

    const rightWrappers = container.querySelectorAll('.mask-arch__right .mask-img-wrapper');
    rightWrappers.forEach((element) => {
      const order = element.getAttribute('data-index');
      if (order !== null) {
        element.style.zIndex = order;
      }
    });

    const leftItems = container.querySelectorAll('.mask-arch__left .mask-arch__info');

    const applyLayout = () => {
      const matchesMobile = window.matchMedia('(max-width: 768px)').matches;

      if (matchesMobile) {
        leftItems.forEach((item, index) => {
          item.style.order = String(index * 2);
        });
        rightWrappers.forEach((item, index) => {
          item.style.order = String(index * 2 + 1);
        });
      } else {
        leftItems.forEach((item) => {
          item.style.order = '';
        });
        rightWrappers.forEach((item) => {
          item.style.order = '';
        });
      }
    };

    applyLayout();

    let resizeTimeoutId;
    const handleResize = () => {
      window.clearTimeout(resizeTimeoutId);
      resizeTimeoutId = window.setTimeout(() => {
        applyLayout();
        ScrollTrigger.refresh();
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    const mm = gsap.matchMedia();
    const images = gsap.utils.toArray(container.querySelectorAll('.mask-img-wrapper img'));

    mm.add('(min-width: 769px)', () => {
      if (!images.length) {
        return undefined;
      }

      const archElement = container.querySelector('.mask-arch');

      const mainTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: archElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      });

      gsap.set(images, {
        clipPath: 'inset(0)',
        objectPosition: '50% 50%',
        scale: 1,
      });

      images.forEach((currentImage, index) => {
        if (!images[index + 1]) {
          return;
        }

        const backgroundColor =
          backgroundColors[index] ||
          backgroundColors[backgroundColors.length - 1] ||
          baseBackgroundColor;

        const sectionTimeline = gsap.timeline();

        sectionTimeline
          .to(
            targetBackgroundElement,
            {
              backgroundColor,
              duration: 1.5,
              ease: 'power2.inOut',
            },
            0,
          )
          .to(
            currentImage,
            {
              clipPath: 'inset(0px 0px 100%)',
              duration: 1.5,
              ease: 'none',
            },
            0,
          );

        mainTimeline.add(sectionTimeline);
      });

      return () => {
        mainTimeline.scrollTrigger?.kill();
        mainTimeline.kill();
      };
    });

    mm.add('(max-width: 768px)', () => {
      if (!images.length) {
        return undefined;
      }

      gsap.set(images, {
        yPercent: 10,
        willChange: 'transform',
      });

      const timelines = images.map((image, index) => {
        const backgroundColor =
          backgroundColors[index] ||
          backgroundColors[backgroundColors.length - 1] ||
          baseBackgroundColor;

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: image,
            start: 'top-=70% top+=50%',
            end: 'bottom+=200% bottom',
            scrub: true,
          },
        });

        timeline
          .to(image, {
            yPercent: -10,
            duration: 5,
            ease: 'none',
          })
          .to(
            targetBackgroundElement,
            {
              backgroundColor,
              duration: 1.5,
              ease: 'power2.inOut',
            },
            0,
          );

        return timeline;
      });

      return () => {
        timelines.forEach((timeline) => {
          timeline.scrollTrigger?.kill();
          timeline.kill();
        });
      };
    });

    ScrollTrigger.refresh();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutId) {
        window.clearTimeout(resizeTimeoutId);
      }
      mm.revert();

      if (!isPreview) {
        if (animationFrameId) {
          window.cancelAnimationFrame(animationFrameId);
        }
        lenisInstance?.destroy();
        if (shouldControlBodyBackground && originalBodyBackground !== null) {
          document.body.style.backgroundColor = originalBodyBackground;
        }
      }
      if (container) {
        container.style.backgroundColor = '';
        container.style.backgroundImage = '';
        container.style.backgroundSize = '';
        container.style.backgroundRepeat = '';
        container.style.backgroundPosition = '';
      }
    };
  }, [data, isPreview]);

  return (
    <section className="mask-reveal-scroll" ref={containerRef}>
      <div className="mask-container">
        <div className="mask-spacer" />

        <div className="mask-arch">
          <div className="mask-arch__left">
            {data.items.map((item, index) => {
              const linkBackground = item.link?.backgroundColor || '#D5FF37';
              const linkHref = item.link?.href || '#';
              const linkLabel = item.link?.label || '';

              return (
                <div
                  key={item.id || `mask-arch-${index}`}
                  className="mask-arch__info"
                  id={item.id || undefined}
                >
                  <div className="mask-content">
                    {item.title ? <h2 className="mask-header">{item.title}</h2> : null}
                    {item.description ? <p className="mask-desc">{item.description}</p> : null}
                    {linkLabel ? (
                      <a className="mask-link" href={linkHref} style={{ backgroundColor: linkBackground }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="none">
                          <path
                            fill="#121212"
                            d="M5 2c0 1.105-1.895 2-3 2a2 2 0 1 1 0-4c1.105 0 3 .895 3 2ZM11 3.5c0 1.105-.895 3-2 3s-2-1.895-2-3a2 2 0 1 1 4 0ZM6 9a2 2 0 1 1-4 0c0-1.105.895-3 2-3s2 1.895 2 3Z"
                          />
                        </svg>
                        <span>{linkLabel}</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mask-arch__right">
            {data.images.map((image, index) => {
              const orderValue =
                typeof image.order === 'number' ? String(image.order) : String(data.images.length - index);
              return (
                <div
                  key={image.id || `mask-image-${index}`}
                  className="mask-img-wrapper"
                  data-index={orderValue}
                >
                  <img src={image.src} alt={image.alt || ''} loading="lazy" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="mask-spacer" />
      </div>
    </section>
  );
};

export default MaskRevealScrollSection;
