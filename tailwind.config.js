/** @type {import('tailwindcss').Config} */
    module.exports = {
      darkMode: ["class"],
      content: [
        './pages/**/*.{js,jsx}',
        './components/**/*.{js,jsx}',
        './app/**/*.{js,jsx}',
        './src/**/*.{js,jsx}',
      ],
      theme: {
        container: {
          center: true,
          padding: "2rem",
          screens: {
            "2xl": "1400px",
          },
        },
        extend: {
          colors: {
            border: "hsl(var(--colors-border))",
            input: "hsl(var(--colors-input))",
            ring: "hsl(var(--colors-ring))",
            background: "hsl(var(--colors-background))",
            foreground: "hsl(var(--colors-foreground))",
            primary: {
              DEFAULT: "hsl(var(--colors-primary))",
              foreground: "hsl(var(--colors-primary-foreground))",
            },
            secondary: {
              DEFAULT: "hsl(var(--colors-secondary))",
              foreground: "hsl(var(--colors-secondary-foreground))",
            },
            destructive: {
              DEFAULT: "hsl(var(--colors-destructive))",
              foreground: "hsl(var(--colors-destructive-foreground))",
            },
            muted: {
              DEFAULT: "hsl(var(--colors-muted))",
              foreground: "hsl(var(--colors-muted-foreground))",
            },
            accent: {
              DEFAULT: "hsl(var(--colors-accent))",
              foreground: "hsl(var(--colors-accent-foreground))",
            },
            popover: {
              DEFAULT: "hsl(var(--colors-popover))",
              foreground: "hsl(var(--colors-popover-foreground))",
            },
            card: {
              DEFAULT: "hsl(var(--colors-card))",
              foreground: "hsl(var(--colors-card-foreground))",
            },
          },
          borderRadius: {
            lg: "var(--radius)",
            md: "calc(var(--radius) - 2px)",
            sm: "calc(var(--radius) - 4px)",
          },
          keyframes: {
            "accordion-down": {
              from: { height: 0 },
              to: { height: "var(--radix-accordion-content-height)" },
            },
            "accordion-up": {
              from: { height: "var(--radix-accordion-content-height)" },
              to: { height: 0 },
            },
          },
          animation: {
            "accordion-down": "accordion-down 0.2s ease-out",
            "accordion-up": "accordion-up 0.2s ease-out",
          },
          typography: ({ theme }) => ({
            DEFAULT: {
              css: {
                '--tw-prose-body': 'hsl(var(--colors-foreground))',
                '--tw-prose-headings': 'hsl(var(--colors-foreground))',
                '--tw-prose-lead': 'hsl(var(--colors-muted-foreground))',
                '--tw-prose-links': 'hsl(var(--colors-primary))',
                '--tw-prose-bold': 'hsl(var(--colors-foreground))',
                '--tw-prose-counters': 'hsl(var(--colors-muted-foreground))',
                '--tw-prose-bullets': 'hsl(var(--colors-border))',
                '--tw-prose-hr': 'hsl(var(--colors-border))',
                '--tw-prose-quotes': 'hsl(var(--colors-foreground))',
                '--tw-prose-quote-borders': 'hsl(var(--colors-border))',
                '--tw-prose-captions': 'hsl(var(--colors-muted-foreground))',
                '--tw-prose-code': 'hsl(var(--colors-foreground))',
                '--tw-prose-pre-code': 'hsl(var(--colors-muted))',
                '--tw-prose-pre-bg': 'hsl(var(--colors-muted-foreground))',
                '--tw-prose-th-borders': 'hsl(var(--colors-border))',
                '--tw-prose-td-borders': 'hsl(var(--colors-border))',
                '--tw-prose-invert-body': 'hsl(var(--colors-foreground))',
                '--tw-prose-invert-headings': 'hsl(var(--colors-foreground))',
                '--tw-prose-invert-lead': 'hsl(var(--colors-muted-foreground))',
                '--tw-prose-invert-links': 'hsl(var(--colors-primary))',
                '--tw-prose-invert-bold': 'hsl(var(--colors-foreground))',
                '--tw-prose-invert-counters': 'hsl(var(--colors-muted-foreground))',
                '--tw-prose-invert-bullets': 'hsl(var(--colors-border))',
                '--tw-prose-invert-hr': 'hsl(var(--colors-border))',
                '--tw-prose-invert-quotes': 'hsl(var(--colors-foreground))',
                '--tw-prose-invert-quote-borders': 'hsl(var(--colors-border))',
                '--tw-prose-invert-captions': 'hsl(var(--colors-muted-foreground))',
                '--tw-prose-invert-code': 'hsl(var(--colors-foreground))',
                '--tw-prose-invert-pre-code': 'hsl(var(--colors-muted))',
                '--tw-prose-invert-pre-bg': 'hsl(var(--colors-muted-foreground))',
                '--tw-prose-invert-th-borders': 'hsl(var(--colors-border))',
                '--tw-prose-invert-td-borders': 'hsl(var(--colors-border))',
              },
            },
          }),
        },
      },
      plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
    }