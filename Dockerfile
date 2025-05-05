# Usar la imagen base de Node.js
FROM node:16

# Crear y establecer el directorio de trabajo en el contenedor
WORKDIR /app

# Copiar el package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos de la aplicación
COPY . .

# Exponer el puerto que la aplicación usará
EXPOSE 8080

# Comando para ejecutar la aplicación
CMD ["npm", "start"]
