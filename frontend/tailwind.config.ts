import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Safety net
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        insta: {
          bg: '#000000',
          surface: '#121212',
          stroke: '#262626',
          blue: '#3797EF',
          red: '#ED4956',
        }
      },
    },
  },
  plugins: [],
};
export default config;