// Nombres fijos de los assets (ver LEEME.txt). Si reemplazas un archivo con el mismo nombre, se usa solo.

/** Imágenes fijas en assets/img/<nombre>.png (los suelos de cada zona salen de balance.json → zonas). */
export const IMAGENES = ["hoyo_borde", "hoyo_remolino", "hoyo_nucleo", "moneda", "materia", "dron"] as const;

/** Clave de textura de un objeto (assets/img/objetos/<id>.png): "obj_tornillo", "obj_robot"... */
export const texturaObjeto = (id: string) => `obj_${id}`;
