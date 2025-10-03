import React, { useEffect, useRef } from 'react';

const safeString = (value) => (value == null ? '' : String(value));

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

const generateRandomColors = (count) => (
  Array.from({ length: count }, () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`)
);

const TubesCursorSection = ({ content = {}, isPreview = false }) => {
  const canvasRef = useRef(null);
  const effectRef = useRef(null);
  const clickHandlerRef = useRef(null);

  const { title1, title2, title3 } = sanitizeTubesTitles(content);

  useEffect(() => {
    let isCancelled = false;

    const initEffect = async () => {
      if (!canvasRef.current || typeof window === 'undefined') return;

      try {
        const module = await import('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js');
        if (isCancelled) return;

        const TubesCursorFactory = module.default || module;
        const instance = TubesCursorFactory(canvasRef.current, {
          tubes: {
            colors: ['#f967fb', '#53bc28', '#6958d5'],
            lights: {
              intensity: 200,
              colors: ['#83f36e', '#fe8a2e', '#ff008a', '#60aed5'],
            },
          },
        });

        effectRef.current = instance;

        const handleClick = () => {
          if (!effectRef.current) return;
          const colors = generateRandomColors(3);
          const lightColors = generateRandomColors(4);
          try {
            effectRef.current.tubes.setColors(colors);
            effectRef.current.tubes.setLightsColors(lightColors);
          } catch (error) {
            console.warn('Tubes cursor update failed:', error);
          }
        };

        clickHandlerRef.current = handleClick;
        if (!isPreview) {
          canvasRef.current.parentElement?.addEventListener('click', handleClick);
        }
      } catch (error) {
        console.error('Failed to load TubesCursor effect:', error);
      }
    };

    initEffect();

    return () => {
      isCancelled = true;
      if (clickHandlerRef.current && canvasRef.current?.parentElement) {
        canvasRef.current.parentElement.removeEventListener('click', clickHandlerRef.current);
      }
      if (effectRef.current?.dispose) {
        try {
          effectRef.current.dispose();
        } catch (error) {
          console.warn('Error disposing TubesCursor effect:', error);
        }
      }
      effectRef.current = null;
      clickHandlerRef.current = null;
    };
  }, [isPreview]);

  return (
    <section className="relative flex h-[600px] w-full items-center justify-center overflow-hidden bg-black md:h-[720px]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
        <h1 className="text-5xl font-extrabold uppercase tracking-[0.2em] text-white drop-shadow-2xl sm:text-6xl md:text-7xl">
          {title1}
        </h1>
        <h2 className="text-4xl font-semibold uppercase text-white drop-shadow-xl sm:text-5xl md:text-6xl">
          {title2}
        </h2>
        <p className="text-lg font-medium text-white drop-shadow-lg sm:text-xl md:text-2xl">
          {title3}
        </p>
        {!isPreview && (
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-white/70">
            Clique pour changer les couleurs
          </p>
        )}
      </div>
    </section>
  );
};

export default TubesCursorSection;
