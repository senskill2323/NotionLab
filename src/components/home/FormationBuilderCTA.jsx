import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const DEFAULT_BACKGROUND = 'linear-gradient(90deg, #7c3aed 0%, #4f46e5 100%)';
const DEFAULT_HEADLINE =
  'Connectez-vous pour acceder au builder de formation et selectionnez vos modules';
const DEFAULT_BUTTON = 'Connectez-vous pour acceder au Builder';
const DEFAULT_LINK = '/inscription';

const FormationBuilderCTA = ({
  headline = DEFAULT_HEADLINE,
  buttonLabel = DEFAULT_BUTTON,
  buttonLink = DEFAULT_LINK,
  backgroundColor = DEFAULT_BACKGROUND,
}) => {
  const resolvedBackground =
    backgroundColor && backgroundColor.trim().length > 0
      ? backgroundColor
      : DEFAULT_BACKGROUND;
  const resolvedLink =
    buttonLink && buttonLink.trim().length > 0 ? buttonLink : DEFAULT_LINK;

  return (
    <section
      className="py-10 md:py-12 text-white text-center rounded-lg shadow-lg"
      style={{ background: resolvedBackground }}
    >
      <div className="container mx-auto px-4">
        <motion.p
          initial={{
            opacity: 0,
            y: 30,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.8,
            ease: 'easeOut',
            delay: 0.2,
          }}
          viewport={{
            once: true,
            amount: 0.5,
          }}
          className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto"
        >
          {headline}
        </motion.p>
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.8,
          }}
          whileInView={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: 0.8,
            ease: 'easeOut',
            delay: 0.4,
          }}
          viewport={{
            once: true,
            amount: 0.5,
          }}
        >
          <Link to={resolvedLink}>
            <Button
              size="lg"
              className="bg-white text-purple-700 font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              {buttonLabel}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default FormationBuilderCTA;
