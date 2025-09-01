import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
const usInfluencers = [{
  name: 'The Life OS',
  imageUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/life-os-dashboard-RftsI.png'
}, {
  name: 'Thomas Frank',
  imageUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/thomas-frank-logo-wV35a.png'
}, {
  name: 'Easlo',
  imageUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/easlo-logo-g3j2d.png'
}, {
  name: 'Cozi Family Organizer',
  imageUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/cozi-logo-v23j1.png'
}, {
  name: 'Franklin Covey',
  imageUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/franklin-covey-logo-k2j3d.png'
}, {
  name: 'Full Focus Planner',
  imageUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/full-focus-planner-logo-m2j3d.png'
}, {
  name: 'Notion Business System',
  imageUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/notion-business-system-logo-p2j3d.png'
}, {
  name: 'Small Business OS',
  imageUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/small-business-os-logo-q2j3d.png'
}, {
  name: 'Notion4Management',
  imageUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/notion4management-logo-r2j3d.png'
}, {
  name: 'NotionApps',
  imageUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/notion-apps-logo-s2j3d.png'
}];
const InspirationSection = () => <section className="py-20 bg-background/70">
    <div className="container mx-auto px-4">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <motion.div className="order-2 lg:order-1" initial={{
        opacity: 0,
        scale: 0.8
      }} whileInView={{
        opacity: 1,
        scale: 1
      }} viewport={{
        once: true,
        amount: 0.5
      }} transition={{
        duration: 0.8,
        delay: 0.2
      }}>
          <div className="grid grid-cols-2 gap-4">
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            duration: 0.5,
            delay: 0.3
          }}>
              <Card className="glass-effect p-4 flex items-center gap-4 hover:border-primary transition-all duration-300 h-full">
                <div className="w-8 h-8 flex-shrink-0">
                  <img alt="The Life OS logo" class="w-full h-full object-contain rounded-sm" src="https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/life-os-dashboard-ZF811.png" />
                </div>
                <span className="font-medium text-sm">The Life OS</span>
              </Card>
            </motion.div>
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            duration: 0.5,
            delay: 0.4
          }}>
              <Card className="glass-effect p-4 flex items-center gap-4 hover:border-primary transition-all duration-300 h-full">
                <div className="w-8 h-8 flex-shrink-0">
                  <img alt="Thomas Frank logo" class="w-full h-full object-contain rounded-sm" src="https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/thomasfrank-3WCn3.png" />
                </div>
                <span className="font-medium text-sm">Thomas Frank</span>
              </Card>
            </motion.div>
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            duration: 0.5,
            delay: 0.5
          }}>
              <Card className="glass-effect p-4 flex items-center gap-4 hover:border-primary transition-all duration-300 h-full">
                <div className="w-8 h-8 flex-shrink-0">
                  <img alt="Easlo logo" class="w-full h-full object-contain rounded-sm" src="https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/easlo-z2LDE.png" />
                </div>
                <span className="font-medium text-sm">Easlo</span>
              </Card>
            </motion.div>
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            duration: 0.5,
            delay: 0.6
          }}>
              <Card className="glass-effect p-4 flex items-center gap-4 hover:border-primary transition-all duration-300 h-full">
                <div className="w-8 h-8 flex-shrink-0">
                  <img alt="Cozi Family Organizer logo" class="w-full h-full object-contain rounded-sm" src="https://images.unsplash.com/photo-1695648443061-a14bc74bf29d" />
                </div>
                <span className="font-medium text-sm">Reverse Entropy</span>
              </Card>
            </motion.div>
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            duration: 0.5,
            delay: 0.7
          }}>
              <Card className="glass-effect p-4 flex items-center gap-4 hover:border-primary transition-all duration-300 h-full">
                <div className="w-8 h-8 flex-shrink-0">
                  <img alt="Franklin Covey logo" class="w-full h-full object-contain rounded-sm" src="https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/franklincovey-QlZHZ.png" />
                </div>
                <span className="font-medium text-sm">Franklin Covey</span>
              </Card>
            </motion.div>
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            duration: 0.5,
            delay: 0.8
          }}>
              <Card className="glass-effect p-4 flex items-center gap-4 hover:border-primary transition-all duration-300 h-full">
                <div className="w-8 h-8 flex-shrink-0">
                  <img alt="Full Focus Planner logo" class="w-full h-full object-contain rounded-sm" src="https://images.unsplash.com/photo-1496660879542-a78ca4fc8b0c" />
                </div>
                <span className="font-medium text-sm">Full Focus Planner</span>
              </Card>
            </motion.div>
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            duration: 0.5,
            delay: 0.9
          }}>
              <Card className="glass-effect p-4 flex items-center gap-4 hover:border-primary transition-all duration-300 h-full">
                <div className="w-8 h-8 flex-shrink-0">
                  <img alt="Notion Business System logo" class="w-full h-full object-contain rounded-sm" src="https://images.unsplash.com/photo-1658383178431-42985646a636" />
                </div>
                <span className="font-medium text-sm">Notion Business System</span>
              </Card>
            </motion.div>
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            duration: 0.5,
            delay: 1.0
          }}>
              <Card className="glass-effect p-4 flex items-center gap-4 hover:border-primary transition-all duration-300 h-full">
                <div className="w-8 h-8 flex-shrink-0">
                  <img alt="Small Business OS logo" class="w-full h-full object-contain rounded-sm" src="https://images.unsplash.com/photo-1658383178431-42985646a636" />
                </div>
                <span className="font-medium text-sm">Small Business OS</span>
              </Card>
            </motion.div>
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            duration: 0.5,
            delay: 1.1
          }}>
              <Card className="glass-effect p-4 flex items-center gap-4 hover:border-primary transition-all duration-300 h-full">
                <div className="w-8 h-8 flex-shrink-0">
                  <img alt="Notion4Management logo" class="w-full h-full object-contain rounded-sm" src="https://images.unsplash.com/photo-1642310290559-53902b3b0f2e" />
                </div>
                <span className="font-medium text-sm">Notion4Management</span>
              </Card>
            </motion.div>
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true,
            amount: 0.5
          }} transition={{
            duration: 0.5,
            delay: 1.2
          }}>
              <Card className="glass-effect p-4 flex items-center gap-4 hover:border-primary transition-all duration-300 h-full">
                <div className="w-8 h-8 flex-shrink-0">
                  <img alt="NotionApps logo" class="w-full h-full object-contain rounded-sm" src="https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/notionapps-kGuPT.png" />
                </div>
                <span className="font-medium text-sm">NotionApps</span>
              </Card>
            </motion.div>
          </div>
        </motion.div>
        <motion.div className="order-1 lg:order-2" initial={{
        opacity: 0,
        x: 50
      }} whileInView={{
        opacity: 1,
        x: 0
      }} viewport={{
        once: true,
        amount: 0.5
      }} transition={{
        duration: 0.8
      }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Une <span className="gradient-text">vague</span> qui vient des <span className="gradient-text">USA</span>
          </h2>
          <div className="text-lg text-foreground/90 space-y-6">
            <p>
              Aux États-Unis, les "systèmes de vie" et "second cerveaux" sont plus qu'une tendance, c'est une véritable révolution de la productivité. Des créateurs comme Thomas Frank ou Easlo inspirent des millions de personnes à organiser leur vie avec des outils comme Notion.
            </p>
            <p>
              En Europe et en francophonie, cette vague arrive plus doucement. Nous avons une chance unique de nous approprier ces méthodes incroyables et de les adapter à notre culture, avec une longueur d'avance.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  </section>;
export default InspirationSection;