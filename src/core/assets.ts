// Nombres fijos de los assets (ver LEEME.txt). Si reemplazas un archivo con el mismo nombre, se usa solo.

/** Imágenes en assets/img/<nombre>.png */
export const IMAGENES = ["suelo", "hoyo_borde", "hoyo_remolino", "hoyo_nucleo", "moneda"] as const;

/** Clave de textura de un objeto (assets/img/objetos/<id>.png): "obj_piedra", "obj_auto"... */
export const texturaObjeto = (id: string) => `obj_${id}`;
