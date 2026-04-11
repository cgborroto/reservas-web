# Write Backend

Backend minimo para conservar la UI actual y escribir en Google Sheets.

## Idea

- la web sigue leyendo desde Google Sheets publicado
- este Worker solo escribe
- `app.js` ya puede hablar con este backend usando `action`

## Variables necesarias

Secretos:

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`

Variables normales:

- `ALLOWED_ORIGIN`
- `RESERVATIONS_SHEET_NAME`
- `CLEANING_SHEET_NAME`

## Preparacion de Google

1. Crear una cuenta de servicio en Google Cloud.
2. Activar Google Sheets API.
3. Descargar la clave JSON.
4. Compartir el Google Sheet con el correo de la cuenta de servicio como editor.

## Despliegue en Cloudflare Workers

1. Copiar `wrangler.toml.example` a `wrangler.toml`.
2. Ajustar `ALLOWED_ORIGIN`.
3. Crear secretos:

```bash
wrangler secret put GOOGLE_CLIENT_EMAIL
wrangler secret put GOOGLE_PRIVATE_KEY
wrangler secret put GOOGLE_SHEET_ID
```

4. Publicar:

```bash
wrangler deploy
```

## Acciones soportadas

- `addReservation`
- `addCleaning`
- `updateReservation`
- `deleteReservation`

## Conectar con la web

Pegar la URL desplegada del Worker en:

- `googleSheetsConfig.writeAppsScriptUrl` dentro de `app.js`

Aunque el nombre diga `writeAppsScriptUrl`, el frontend acepta cualquier endpoint HTTPS compatible con ese payload.
