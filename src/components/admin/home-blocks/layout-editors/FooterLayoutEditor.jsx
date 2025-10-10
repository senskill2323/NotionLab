import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { createInputChangeHandler } from './shared';

const FooterLayoutEditor = ({ value, onChange }) => {
  const handleChange = createInputChangeHandler(value, onChange);

  return (
    <div className="space-y-4">
      <div>
        <Label>Logo (URL)</Label>
        <Input value={value.logoUrl} onChange={handleChange('logoUrl')} />
      </div>
      <div>
        <Label>Adresse</Label>
        <Input value={value.address} onChange={handleChange('address')} />
      </div>
      <div>
        <Label>Email</Label>
        <Input value={value.email} onChange={handleChange('email')} />
      </div>
      <div>
        <Label>Téléphone</Label>
        <Input value={value.phone} onChange={handleChange('phone')} />
      </div>
      <div>
        <Label>URL embed Google Maps</Label>
        <Input value={value.mapEmbedUrl} onChange={handleChange('mapEmbedUrl')} />
      </div>
      <div>
        <Label>Lien Google Maps</Label>
        <Input value={value.mapLink} onChange={handleChange('mapLink')} />
      </div>
    </div>
  );
};

export default FooterLayoutEditor;
