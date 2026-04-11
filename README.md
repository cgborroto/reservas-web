# Control de Reservas

Web estática para visualizar reservas por propiedad en un calendario mensual.

## Archivos

- `index.html`: estructura principal de la página.
- `styles.css`: estilos del panel y del calendario.
- `app.js`: datos de propiedades, reservas, limpiezas y lógica del calendario.

## Cómo usar

1. Abre `index.html` en tu navegador.
2. En la columna izquierda cambia entre propiedades.
3. Usa `Anterior` y `Siguiente` para moverte entre meses.

## Cómo capturar tus datos

Edita el arreglo `properties` dentro de `app.js`.

Cada propiedad tiene este formato:

```js
{
  id: "casa",
  name: "Casa",
  reservations: [
    { start: "2026-03-02", end: "2026-03-05", channel: "Airbnb", guest: "Laura" }
  ],
  cleaningDays: ["2026-03-06"]
}
```

## Canales disponibles

- `Airbnb`
- `Booking`
- `Vrbo`
- `Directo`

## Colores

- Verde: libre
- Gris: limpieza
- Rojo: Airbnb
- Azul: Booking
- Morado: Vrbo
- Dorado: Directo

## Siguiente paso recomendado

La siguiente mejora natural es conectar esto a un archivo editable tipo JSON, Google Sheets o una base de datos para no capturar reservas a mano.

## Usar Google Sheets

La app actual usa un acceso simple: lee el calendario desde un Google Sheet publicado y no depende de login con Google ni de Apps Script.

### 1. Publica tu hoja

En Google Sheets:

1. `Archivo > Compartir > Publicar en la web`
2. Publica todo el documento
3. Copia el ID del documento

Ejemplo:

```txt
https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit#gid=0
```

### 2. Activa la configuración en `app.js`

Busca este bloque:

```js
const googleSheetsConfig = {
  enabled: false,
  spreadsheetId: "PEGA_AQUI_EL_ID_DE_TU_GOOGLE_SHEET",
  appsScriptUrl: "PEGA_AQUI_LA_URL_DEL_WEB_APP_DE_APPS_SCRIPT",
  mode: "sample",
};
```

Cámbialo a:

```js
const googleSheetsConfig = {
  enabled: true,
  spreadsheetId: "TU_ID_REAL",
  sheets: {
    properties: "propiedades",
    reservations: "reservas",
    cleaning: "limpieza",
  },
};
```

### 3. Estructura de las hojas

Hoja `propiedades`:

```csv
id,name
casa,Casona
departamento-1,Departamento 1
departamento-2,Departamento 2
departamento-3,Departamento 3
chicxulub,Chicxulub
```

Hoja `reservas`:

```csv
id,property_id,start,end,channel,guest,income
res-1,casona,2026-03-02,2026-03-05,Airbnb,Laura,4800
res-2,departamento-1,2026-03-11,2026-03-16,Booking,Pedro,5900
res-3,chicxulub,2026-03-27,2026-03-31,Directo,Marco,6100
```

Hoja `limpieza`:

```csv
property_id,date
casa,2026-03-06
departamento-1,2026-03-17
chicxulub,2026-03-19
```

## iPhone y PC

Sí, esto se puede usar desde ambos. Para eso conviene publicarlo como sitio web.

Las opciones más simples son:

- GitHub Pages
- Netlify
- Vercel

Si lo publicas, ella podrá abrir la misma liga desde iPhone o desde PC y ver siempre la versión actualizada.

## Contraseña simple

La página tiene una protección básica en el navegador. La contraseña actual está en `app.js`:

```js
const accessConfig = {
  password: "reservas2026",
  storageKey: "reservas-web-access-ok",
};
```

Esto evita accesos casuales, pero no reemplaza seguridad real de servidor.

## Captura manual de reservas

La página ya incluye dos formularios:

- `Registrar reserva`
- `Registrar limpieza`

La reserva también guarda:

- `ingreso`

Si `Google Sheets` está desactivado, esos formularios actualizan solo la sesión actual del navegador.

Si `Google Sheets` y `Apps Script` están activos, los formularios guardan en la hoja y luego recargan el calendario. Esa es la opción correcta para que iPhone y PC compartan la misma información.

## Popup con detalle, edición y borrado

Si ella toca un día reservado:

- se abre un popup con nombre, tipo de huesped, fecha de entrada y salida
- puede editar esos datos
- puede borrar la reserva

Eso funciona en PC y en iPhone.

## Configurar Apps Script

Dentro de esta carpeta ya te dejé una plantilla en:

- `google-apps-script/Code.gs`

### Pasos

1. Abre tu Google Sheet
2. Entra a `Extensiones > Apps Script`
3. Reemplaza el contenido por el archivo `Code.gs`
4. Guarda el proyecto
5. Ve a `Implementar > Nueva implementación`
6. Elige `Aplicación web`
7. Ejecutar como: `Tú`
8. Quién tiene acceso: `Cualquiera`
9. Copia la URL generada y pégala en `appsScriptUrl` dentro de `app.js`

## Acceso simple

La app queda como visor compartido:

- carga datos desde Google Sheets publicado
- no pide login
- no guarda cambios remotos desde los formularios

Si en el futuro quieres volver a edición compartida en línea, hará falta añadir otro backend.

## Siguiente paso real

La UI del calendario ya sirve para capturar reservas desde un día libre, pero la escritura remota por Apps Script quedó bloqueada.

La pieza pendiente ya no es el calendario sino la pasarela de escritura. Hay una propuesta concreta en:

- `WRITE_BACKEND_PLAN.md`

## Despliegue recomendado

Para iPhone y PC, hospeda la carpeta `reservas-web` en un sitio con HTTPS:

- GitHub Pages
- Netlify
- Vercel

La app privada con Google Login necesita HTTPS para funcionar bien.

## GitHub Pages

Sí, pueden alojarla en GitHub Pages.

Flujo recomendado:

1. Crear un repositorio en GitHub
2. Subir la carpeta `reservas-web`
3. Activar `Settings > Pages`
4. Publicar desde la rama principal
5. Usar la URL pública de GitHub Pages

Con eso la página abre en iPhone y PC con HTTPS, que es justo lo que necesita el login de Google.

## Estructura final recomendada

- `propiedades`: catálogo de propiedades
- `reservas`: capturas nuevas y existentes
- `limpieza`: días de limpieza

Con eso ella puede registrar cada reserva con nombre, canal, fecha de entrada y salida, y consultar el calendario desde cualquier dispositivo.
