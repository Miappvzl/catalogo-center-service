/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 🚀 INYECCIÓN: Variables dinámicas para el Storefront
        store: {
          primary: 'var(--store-primary)',
          primaryText: 'var(--store-primary-text)',
          bg: 'var(--store-bg)',
        },
      },
    },
  },
  plugins: [],
}

