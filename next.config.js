/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Your Vercel rewrites in vercel.json will still largely apply 
  // for requests that the middleware passes through.
  // If you were to fully adopt Next.js for all routing, 
  // you might move some of that logic here.
};

module.exports = nextConfig; 
