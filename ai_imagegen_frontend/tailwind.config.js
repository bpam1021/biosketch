/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{ts,tsx}",
        "./src/admin/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [require('@tailwindcss/typography')],
}

const plugin = require('tailwindcss/plugin');

module.exports = {
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
  ],
}