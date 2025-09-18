import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Inline plugin to ensure standard + vendor pairs exist in the same rule
// - Ensures -webkit-backdrop-filter/backdrop-filter counterparts exist
// - Ensures text-size-adjust and -webkit-text-size-adjust both exist
// - Ensures -webkit-appearance/appearance pair exists
// - Reorders vendor-prefixed prop before the standard one for the pairs above
const fixCompatPlugin = () => ({
  postcssPlugin: 'fix-compat-textsize-backdrop',
  Once(root) {
    root.walkRules((rule) => {
      // text-size-adjust
      let hasWebkitTsa = false;
      let hasStdTsa = false;
      let tsaWebkitValue = '100%';
      let tsaStdValue = '100%';
      const tsaDecls = [];

      let valBackdrop = null;
      let valBackdropWebkit = null;
      const backdropDecls = [];

      // appearance
      let hasWebkitAppearance = false;
      let hasStdAppearance = false;
      let valWebkitAppearance = '';
      let valAppearance = '';
      const appearanceDecls = [];

      rule.walkDecls((decl) => {
        if (decl.prop === '-webkit-text-size-adjust') {
          hasWebkitTsa = true;
          tsaWebkitValue = decl.value;
          tsaDecls.push(decl);
        }
        if (decl.prop === 'text-size-adjust') {
          hasStdTsa = true;
          tsaStdValue = decl.value;
          tsaDecls.push(decl);
        }
        if (decl.prop === 'backdrop-filter') {
          valBackdrop = decl.value;
          backdropDecls.push(decl);
        }
        if (decl.prop === '-webkit-backdrop-filter') {
          valBackdropWebkit = decl.value;
          backdropDecls.push(decl);
        }
        if (decl.prop === '-webkit-appearance') {
          hasWebkitAppearance = true;
          valWebkitAppearance = decl.value;
          appearanceDecls.push(decl);
        }
        if (decl.prop === 'appearance') {
          hasStdAppearance = true;
          valAppearance = decl.value;
          appearanceDecls.push(decl);
        }
      });

      // text-size-adjust: ensure both exist and order vendor first
      if (hasWebkitTsa || hasStdTsa) {
        if (!hasWebkitTsa) tsaWebkitValue = tsaStdValue;
        if (!hasStdTsa) tsaStdValue = tsaWebkitValue;
        tsaDecls.forEach((d) => d.remove());
        rule.append({ prop: '-webkit-text-size-adjust', value: tsaWebkitValue });
        rule.append({ prop: 'text-size-adjust', value: tsaStdValue });
      }

      // backdrop-filter: ensure both exist and order vendor first
      if (valBackdrop || valBackdropWebkit) {
        if (!valBackdropWebkit) valBackdropWebkit = valBackdrop;
        if (!valBackdrop) valBackdrop = valBackdropWebkit;
        backdropDecls.forEach((d) => d.remove());
        rule.append({ prop: '-webkit-backdrop-filter', value: valBackdropWebkit });
        rule.append({ prop: 'backdrop-filter', value: valBackdrop });
      }

      // appearance: ensure both exist and order vendor first
      if (hasWebkitAppearance || hasStdAppearance) {
        if (!hasWebkitAppearance) valWebkitAppearance = valAppearance;
        if (!hasStdAppearance) valAppearance = valWebkitAppearance;
        appearanceDecls.forEach((d) => d.remove());
        rule.append({ prop: '-webkit-appearance', value: valWebkitAppearance });
        rule.append({ prop: 'appearance', value: valAppearance });
      }
    });
  },
});
fixCompatPlugin.postcss = true;

export default {
  plugins: [
    tailwindcss(),
    autoprefixer(),
    fixCompatPlugin(),
  ],
};