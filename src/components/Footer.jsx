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
                <iframe width="100%" height="170" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src="https://www.openstreetmap.org/export/embed.html?bbox=6.510,46.655,6.516,46.659&layer=mapnik&marker=46.657,6.513" className="filter dark:invert dark:grayscale"></iframe>
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