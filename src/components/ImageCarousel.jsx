import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const variants = {
  enter: {
    opacity: 0,
    filter: 'blur(10px)',
    scale: 1.05,
  },
  center: {
    zIndex: 1,
    opacity: 1,
    filter: 'blur(0px)',
    scale: 1,
  },
  exit: {
    zIndex: 0,
    opacity: 0,
    filter: 'blur(10px)',
    scale: 0.95,
  }
};

const ImageCarousel = ({ images, aspectRatio }) => {
  const [page, setPage] = useState(0);

  const paginate = (newDirection) => {
    setPage((prevPage) => (prevPage + newDirection + images.length) % images.length);
  };
  
  const goToSlide = (slideIndex) => {
    setPage(slideIndex);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      paginate(1);
    }, 9000);
    return () => clearInterval(interval);
  }, [page]);

  const containerClassName = `relative w-full overflow-hidden flex items-center justify-center${
    aspectRatio ? '' : ' h-[300px] md:h-[500px] lg:h-[600px]'
  }`;
  const containerStyle = aspectRatio ? { aspectRatio: `${aspectRatio} / 1` } : undefined;

  return (
    <div className={containerClassName} style={containerStyle}>
      <AnimatePresence initial={false} mode="wait">
        <motion.img
          key={page}
          src={images[page]}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            opacity: { duration: 1.2 },
            filter: { duration: 1.2 },
            scale: { duration: 1.2 },
          }}
          className="absolute h-full w-full object-cover"
          alt={`Carousel image ${page + 1}`}
        />
      </AnimatePresence>
      <div className="absolute bottom-6 flex justify-center space-x-4 z-10">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={`w-6 h-6 rounded-full transition-all duration-300 border-2 border-black/20 ${i === page ? 'bg-black scale-125' : 'bg-black/50 hover:bg-black/70'}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
