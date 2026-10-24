# Aplicación Android DC INSTALL

El cliente Android usa Capacitor con la interfaz React empaquetada dentro del APK. Después de iniciar sesión y elegir **Preparar offline**, quedan guardados en el teléfono los clientes asignados, sus matafuegos y el historial de controles. Se pueden escanear QR/códigos de barras y guardar controles, fotos, firmas y GPS sin conexión; al recuperar internet, la cola se sincroniza. Los datos offline pertenecen al usuario que los descargó.

## Requisitos para compilar

- Android Studio con Android SDK Platform 36 y Build Tools instalados.
- JDK 21 seleccionado en Android Studio (Capacitor Android usa Java 21).
- Node.js 20 o superior y npm.
- El backend Django desplegado y accesible por HTTPS.

## Generar APK de prueba instalable

Desde la carpeta `frontend` en Windows PowerShell:

```powershell
Copy-Item .env.android.example .env.local
npm ci
npm run android:apk
```

El APK debug queda en `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. Se puede instalar en Android habilitando la instalación desde esa fuente. Para compilar desde Android Studio, abrir la carpeta `frontend/android`, esperar la sincronización de Gradle y usar **Build > Build APK(s)**.

## Backend y avisos

El valor inicial de `VITE_API_URL` apunta al servicio de Render definido en `render.yaml`: `https://dcinstall-api.onrender.com/api`. Si el backend usa otro dominio, cambiarlo en `frontend/.env.local` antes de compilar el APK.

El backend debe desplegarse con la migración nueva (`python manage.py migrate`). Render ejecuta `escalar_controles_vencidos` cada día a las 09:00 de Argentina y genera notificaciones para ADMIN/OFICINA responsables cuando hay más de 30 días sin control. Si se configuran las variables SMTP del cron (`EMAIL_HOST`, usuario, contraseña y remitente), también envía email. Se pueden ajustar `ESCALADA_CONTROL_DIAS` y `CONTROL_BLOQUEO_MESES`; los valores predeterminados son 30 días y 6 meses.

El escáner requiere Android 8.0 o posterior (API 26). La app solicita cámara y ubicación en el primer uso. La ubicación se guarda como evidencia; para detectar controles fuera de zona hacen falta coordenadas de cada sede, que este proyecto todavía no tiene configuradas.
