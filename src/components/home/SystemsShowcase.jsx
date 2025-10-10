import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import ImageCarousel from '@/components/ImageCarousel';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const defaultCarouselImages = [
  'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/4b9378a927cc2b60cd474d6d2e76f8e6.png',
  'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/efa638b85ff0afb61bd0d102973a387b.png',
  'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/4a8d451b030981196eee43f1b1179dd0.png'
];

const SystemsShowcase = ({ content = {} }) => {
  const title = content.title || '';
  const titleSuffix = content.titleSuffix || '';
  const safeSuffix = (titleSuffix || '').trim();

  const images = Array.isArray(content.images) && content.images.length > 0
    ? content.images
    : defaultCarouselImages;
  const buttonText = content.buttonText || 'Faites un tour du propriétaire';
  const buttonLink = content.buttonLink || '/mes-systemes';
  const shouldShowButton =
    typeof content.showButton === 'boolean' ? content.showButton : true;

  return (
  <>
    <section className="py-10 bg-background/70">
      <div className="container mx-auto px-4 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true, amount: 0.5 }} 
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {title}
            {safeSuffix ? ' ' : ''}
            {safeSuffix ? <span className="gradient-text">{safeSuffix}</span> : null}
          </h2>
        </motion.div>
      </div>
    </section>

    <section className="w-full overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 50 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true, amount: 0.3 }} 
        transition={{ duration: 0.8 }}
      >
        <ImageCarousel images={images} aspectRatio={3.357142857142857} />
      </motion.div>
    </section>

    {shouldShowButton ? (
      <section className="py-10 bg-background/70">
        <div className="container mx-auto px-4 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, amount: 0.5 }} 
            transition={{ duration: 0.8 }}
          >
            <Link to={buttonLink}>
              <Button size="xl" className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105 text-xl py-8 px-10 font-extrabold">
                {buttonText}
                <ArrowRight className="ml-3 w-7 h-7" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    ) : null}
  </>
  );
};

export default SystemsShowcase;
