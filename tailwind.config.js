/** Ersetzt den frueheren Inline-Block `tailwind.config = {...}` aus dem <head>.
 *  Nach jeder Aenderung an HTML/JS neu bauen:  npm run build:css           */
module.exports = {
  /* Unterordner MUESSEN mit drin sein. Stand vorher nur './*.html', wodurch
     knowledgebase/ und features/ beim Purgen unsichtbar waren — dort benutzte
     Utility-Klassen waeren stillschweigend aus dem Stylesheet geflogen.
     node_modules ist ausgeschlossen, sonst durchsucht der Build tausende
     Fremddateien. */
  content: ['./**/*.html', './js/**/*.js', '!./node_modules/**'],
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
