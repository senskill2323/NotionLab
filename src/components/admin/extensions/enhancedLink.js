import Link from '@tiptap/extension-link';
import { mergeAttributes } from '@tiptap/core';

export const BUTTON_VARIANTS = {
  primary: {
    label: 'Bouton principal',
    className: 'nl-email-btn nl-email-btn--primary',
    style:
      'display:inline-block;background:#111827;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;',
  },
  secondary: {
    label: 'Bouton secondaire',
    className: 'nl-email-btn nl-email-btn--secondary',
    style:
      'display:inline-block;background:#FFFFFF;color:#111827;padding:14px 28px;border:1px solid #111827;border-radius:8px;text-decoration:none;font-weight:600;',
  },
};

export const sanitizeVariantKey = (variant) => {
  if (!variant) return null;
  const key = String(variant).toLowerCase();
  return BUTTON_VARIANTS[key] ? key : null;
};

export const EnhancedLink = Link.extend({
  name: 'link',

  addOptions() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      defaultVariant: 'primary',
      buttonVariants: BUTTON_VARIANTS,
    };
  },

  addAttributes() {
    const parent = this.parent?.() ?? {};
    return {
      ...parent,
      'data-cta-variant': {
        default: null,
        parseHTML: (element) => sanitizeVariantKey(element.getAttribute('data-cta-variant')),
        renderHTML: (attributes) => {
          const variant = sanitizeVariantKey(attributes['data-cta-variant']);
          return variant ? { 'data-cta-variant': variant } : {};
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = { ...HTMLAttributes };
    const variant =
      sanitizeVariantKey(attrs['data-cta-variant']) ??
      sanitizeVariantKey(attrs.variant) ??
      sanitizeVariantKey(this.options.defaultVariant);

    delete attrs.variant;

    if (variant) {
      const config = this.options.buttonVariants?.[variant];
      attrs['data-cta-variant'] = variant;
      if (config?.className) {
        attrs.class = config.className;
      } else {
        delete attrs.class;
      }
      if (config?.style) {
        attrs.style = config.style;
      } else {
        delete attrs.style;
      }
    } else {
      delete attrs['data-cta-variant'];
    }

    return ['a', mergeAttributes(this.options.HTMLAttributes, attrs), 0];
  },
});

export const CTA_VARIANT_OPTIONS = Object.entries(BUTTON_VARIANTS).map(([key, value]) => ({
  value: key,
  label: value.label,
}));
