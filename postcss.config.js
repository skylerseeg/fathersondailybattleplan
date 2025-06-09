// postcss.config.js
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    tailwindcss,  // Directly reference the imported plugin function
    autoprefixer, // Directly reference the imported plugin function
  ],
};