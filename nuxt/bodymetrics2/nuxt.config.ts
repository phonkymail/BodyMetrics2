export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  app: {
    head: {
      script: [
        { src: 'https://unpkg.com/mqtt/dist/mqtt.min.js', defer: true },
      ],
    },
  },

  vite: {
    optimizeDeps: {
      include: ['face-api.js']
    }
  },


  modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt'],
  tailwindcss: {},

  devServer: {
    https: {
      key: './key.pem',
      cert: './cert.pem',
    },
    port: 3000,
    host: '0.0.0.0',
  },

  // ✅ Runtime config til .env-variabler
  runtimeConfig: {
    MONGO_URI: process.env.MONGO_URI,
    mongoDb: process.env.MONGO_DB,
    jwtSecret: process.env.JWT_SECRET, // 👈 tilføjet for JWT login
    public: {}
  },


  
})
