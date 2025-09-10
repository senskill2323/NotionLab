import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, ChevronRight } from 'lucide-react';
const Footer = () => {
  const links = [{
    label: 'Accueil',
    path: '/'
  }, {
    label: 'Formations',
    path: '/formations'
  }, {
    label: 'Qui suis-je ?',
    path: '/qui-suis-je'
  }, {
    label: 'Life OS system',
    path: '/mes-systemes'
  }, {
    label: 'Contact',
    path: '/contact'
  }, {
    label: 'Espace Client',
    path: '/connexion'
  }];
  return <footer className="bg-background/80 glass-effect border-t border-border/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* About Section */}
          <div className="md:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <img src="https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/logo_clair-U67WQ.png" alt="NotionLab Logo" className="h-[11.2px]" />
            </Link>
            <p className="text-muted-foreground text-sm">
              Formations et systèmes Notion sur-mesure pour transformer votre productivité.
            </p>
          </div>

          {/* Links Section */}
          <div>
            <p className="text-lg font-semibold mb-4">Liens Rapides</p>
            <ul className="space-y-2">
              {links.map(link => <li key={link.path}>
                  <Link to={link.path} className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                    <ChevronRight className="w-4 h-4 mr-1" />
                    {link.label}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <p className="text-lg font-semibold mb-4">Contact</p>
            <ul className="space-y-3">
              <li className="flex items-start text-sm">
                <MapPin className="w-4 h-4 mr-3 mt-1 flex-shrink-0 text-primary" />
                <span className="text-muted-foreground">1315 La Sarraz, Suisse</span>
              </li>
              <li className="flex items-center text-sm">
                <Mail className="w-4 h-4 mr-3 flex-shrink-0 text-primary" />
                <a href="mailto:Vallottonyann@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">
                  Vallottonyann@gmail.com
                </a>
              </li>
              <li className="flex items-center text-sm">
                <Phone className="w-4 h-4 mr-3 flex-shrink-0 text-primary" />
                <a href="tel:0795765224" className="text-muted-foreground hover:text-primary transition-colors">
                  079 576 52 24
                </a>
              </li>
            </ul>
          </div>
          
          {/* Map Section */}
          <div>
             <p className="text-lg font-semibold mb-4">Localisation</p>
             <div className="rounded-lg overflow-hidden border border-border">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1151.3494205839254!2d6.516213008580243!3d46.658642866494915!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x478dcb21dc82f31b%3A0x4d82dcf171487de7!2sLa%20Sarraz!5e0!3m2!1sfr!2sch!4v1757538158313!5m2!1sfr!2sch"
                  width="100%"
                  height="170"
                  frameBorder="0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Google Maps - La Sarraz"
                ></iframe>
                <a
                  href="https://www.google.com/maps/place/La+Sarraz/@46.658643,6.516213,17z"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-primary/70 hover:text-primary text-center py-2"
                >
                  Ouvrir dans Google Maps
                </a>
             </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} NotionLab. Tous droits réservés.</p>
        </div>
      </div>
    </footer>;
};
export default Footer;