# Capa minima de escritura

Objetivo: mantener la UI actual y la lectura publica desde Google Sheets, y cambiar solo el guardado.

## Recomendacion

Usar un endpoint pequeno y estable fuera de Apps Script para:

- crear reservas
- actualizar reservas
- borrar reservas
- crear limpiezas

El calendario seguiria leyendo desde Google Sheets publicado como ahora.

## Opcion recomendada

Cloudflare Worker gratuito como pasarela de escritura.

Ventajas:

- no toca la UI actual
- no depende de POST publico de Apps Script
- no requiere convertir la app a otro backend
- puede seguir escribiendo en el mismo Google Sheet

## Flujo

1. La web envia `POST /reservation` al Worker.
2. El Worker valida el payload.
3. El Worker escribe en Google Sheets usando la API oficial.
4. La web recarga el calendario desde el Sheet publicado.

## Datos que ya tenemos

La web ya puede producir este payload:

```json
{
  "id": "res-123",
  "propertyId": "casona",
  "propertyName": "Casona",
  "start": "2026-06-01",
  "end": "2026-06-03",
  "channel": "Airbnb",
  "guest": "Juan Perez",
  "income": "3000"
}
```

## Lo que falta para implementarlo

1. Crear un servicio minimo de escritura.
2. Compartir el Google Sheet con una cuenta de servicio.
3. Guardar secretos del servicio en el backend.
4. Cambiar `writeAppsScriptUrl` por la URL real del backend.

## Alternativas descartadas

- Apps Script Web App: el POST publico sigue devolviendo 401.
- Google Sheets como interfaz de captura principal: no da la experiencia deseada.

## Alcance siguiente

Si seguimos por esta via, el siguiente bloque de trabajo debe ser solo este:

1. crear endpoint `addReservation`
2. conectarlo con el popup de dia libre
3. recargar calendario desde el Sheet

No hace falta tocar:

- colores
- popup de detalle
- lectura desde CSV publicado
- navegacion entre propiedades
