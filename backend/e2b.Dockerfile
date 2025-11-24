FROM e2bdev/code-interpreter:latest 

# Set working directory
WORKDIR /home/user

# Install common build tools and dependencies
# User projects will be uploaded separately and installed in their own directories
RUN npm install -g npm@latest

# The base image already has Node.js and npm
# User projects will be created in subdirectories like /home/user/${projectName}
# and will run their own npm install && npm run dev commands
#
# NOTE: All projects (React, Vue, Svelte, Next.js, Angular, Nuxt, Remix) use Vite as the build tool
# Vite will be installed locally in each project via npm install (from package.json)
# Standard dev command for all projects: npm run dev -- --host 0.0.0.0 --port 5175