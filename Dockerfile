# Etapa 1: Construcción (Builder)
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código y construir
COPY . .
# Expo Router exporta por defecto a la carpeta 'dist' para web
RUN npx expo export -p web

# Etapa 2: Producción (Nginx)
FROM nginx:alpine

# Copiar los archivos estáticos generados en la etapa anterior
COPY --from=builder /app/dist /usr/share/nginx/html
# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]