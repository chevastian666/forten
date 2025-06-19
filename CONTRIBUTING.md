# 🚀 Guía de Contribución - FORTEN CRM

## 📋 Flujo de trabajo Git

Este proyecto utiliza un flujo de trabajo Git con las siguientes ramas:

### 🌿 Ramas principales

- **`main`**: Rama estable con código listo para producción (releases)
- **`develop`**: Rama de desarrollo activo donde se integran las nuevas características

### 🔄 Flujo de trabajo

1. **Nunca hacer commits directamente en `main`**
   - La rama `main` solo recibe merges desde `develop` cuando hay un release

2. **Todo el desarrollo se hace en `develop` o ramas feature**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nueva-funcionalidad
   ```

3. **Crear Pull Requests hacia `develop`**
   ```bash
   git add .
   git commit -m "feat: descripción de la nueva funcionalidad"
   git push origin feature/nueva-funcionalidad
   ```

4. **Releases a `main`**
   - Solo cuando el código en `develop` está estable y probado
   - Se hace merge de `develop` a `main`
   - Se crea un tag de versión

### 📝 Convenciones de commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bugs
- `docs:` Cambios en documentación
- `style:` Cambios de formato (no afectan funcionalidad)
- `refactor:` Refactorización de código
- `test:` Agregar o modificar tests
- `chore:` Tareas de mantenimiento

### 🏷️ Versionado

Seguimos [Semantic Versioning](https://semver.org/):
- MAJOR.MINOR.PATCH (ej: 1.0.0)
- MAJOR: Cambios incompatibles
- MINOR: Nueva funcionalidad compatible
- PATCH: Correcciones de bugs

### 🔧 Comandos útiles

```bash
# Actualizar develop local
git checkout develop
git pull origin develop

# Crear nueva feature
git checkout -b feature/mi-feature

# Mergear develop en tu rama (mantenerla actualizada)
git merge develop

# Ver estado de las ramas
git branch -a

# Cambiar entre ramas
git checkout nombre-rama
```

## 🛠️ Configuración del entorno de desarrollo

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/chevastian666/forten.git
   cd forten
   git checkout develop
   ```

2. **Instalar dependencias**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   npm install
   
   # Frontend
   cd ../frontend
   cp .env.example .env
   npm install
   ```

3. **Iniciar desarrollo**
   ```bash
   # Backend (terminal 1)
   cd backend
   npm run dev
   
   # Frontend (terminal 2)
   cd frontend
   npm start
   ```

## 📦 Estructura del proyecto

```
forten/
├── backend/          # API REST (Node.js + Express)
├── frontend/         # UI (React + TypeScript)
├── .gitignore       # Archivos ignorados por git
├── README.md        # Documentación principal
└── CONTRIBUTING.md  # Esta guía
```

## 🤝 Proceso de contribución

1. Fork el repositorio
2. Crear una rama desde `develop`
3. Hacer commits siguiendo las convenciones
4. Push a tu fork
5. Crear Pull Request hacia `develop`
6. Esperar revisión y merge

## 📞 Contacto

Para dudas o sugerencias sobre el proceso de desarrollo, crear un issue en GitHub.