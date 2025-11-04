FROM e2bdev/code-interpreter:latest 

# Set working directory
WORKDIR /home/user

# Install Vite (React template) and TailwindCSS
RUN npm create vite@latest . -- --template react && \
    npm install

RUN echo "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({\n  plugins: [react()],\n  server: {\n    host: '0.0.0.0',\n    port: 5173,\n    strictPort: true,\n    allowedHosts: ['.e2b.app'],\n    hmr: {\n      clientPort: 443\n    }\n  }\n})" > vite.config.js