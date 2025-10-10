import React from 'react';
import { motion } from 'framer-motion';

export const DEFAULT_WIDE_IMAGE_URL =
  'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/4b9378a927cc2b60cd474d6d2e76f8e6.png';
const IMAGE_ASPECT_RATIO = 3.357142857142857;

const FullpageWideImage = ({ content = {} }) => {
  const imageUrl =
    typeof content.imageUrl === 'string' && content.imageUrl.trim()
      ? content.imageUrl.trim()
      : DEFAULT_WIDE_IMAGE_URL;
  const imageAlt = content.imageAlt || 'Illustration large';

  return (
    <section className="w-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8 }}
      >
        <div
          className="relative w-full bg-muted"
          style={{ paddingBottom: `${100 / IMAGE_ASPECT_RATIO}%` }}
        >
          <img
            src={imageUrl}
            alt={imageAlt}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </motion.div>
    </section>
  );
};

export default FullpageWideImage;
