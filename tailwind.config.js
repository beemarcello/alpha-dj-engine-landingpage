/** Ersetzt den frueheren Inline-Block `tailwind.config = {...}` aus dem <head>.
 *  Nach jeder Aenderung an HTML/JS neu bauen:  npm run build:css           */
module.exports = {
  content: ['./*.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        ink: '#000000',
        paper: '#d5d5d4',
        green:  { DEFAULT: '#cff7d7', hot: '#5dff7e' },
        purple: { DEFAULT: '#e6cef9', hot: '#c987fd' },
        red:    { DEFAULT: '#ff5159', hot: '#e2010b' },
        beige:  { DEFAULT: '#ecdfd8', hot: '#f5aa82' }
      },
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        doto: ['Doto', 'ui-monospace', 'monospace']
      }
    }
  }
};
