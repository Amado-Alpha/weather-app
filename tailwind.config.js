// tailwind.config.js
module.exports = {
  content: [
    "./index.html", // Include your HTML files
    "./script.js", // Include your JavaScript files if you use Tailwind classes in JS
    "./**/*.html", // Optional: Include all HTML files in subdirectories
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
