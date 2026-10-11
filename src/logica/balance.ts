// Forma del archivo public/data/balance.json.
// Aquí solo hay tipos y una revisión básica: los números viven en el JSON.

export interface TipoObjeto {
  id: string;
  nombre: string;
  r: number;
  valor: number;
  /** Ancho de la sombra respecto al radio (por defecto 1). El auto es más largo. */
  sombraAncho?: number;
}

export type IdMejora = "pull" | "force" | "size" | "spawn" | "value";
export const IDS_MEJORA: IdMejora[] = ["pull", "force", "size", "spawn", "value"];

export interface Mejora {
  id: IdMejora;
  nombre: string;
  max: number;
  base: number;
  mult: number;
}

// Un efecto es lineal (base + nivel*porNivel) o exponencial (max(minimo, base*factor^nivel))
export interface Efecto {
  mejora: IdMejora;
  base: number;
  porNivel?: number;
  factorPorNivel?: number;
  minimo?: number;
}

export type IdEfecto =
  | "radioAtraccion"
  | "fuerza"
  | "radioHoyo"
  | "velocidadCaptura"
  | "maxObjetos"
  | "intervaloAparicion"
  | "multiplicadorValor";

export type IdSonido = "ambiente" | "tragar" | "moneda" | "comprar" | "desbloquear";
export const IDS_SONIDO: IdSonido[] = ["ambiente", "tragar", "moneda", "comprar", "desbloquear"];

export interface Balance {
  mundo: {
    ancho: number;
    alto: number;
    hoyo: { x: number; y: number };
    rozamiento: number;
    rebote: number;
    dtMaximo: number;
  };
  lanzamiento: {
    velocidadMaxima: number;
    ventanaMs: number;
    puntosRastro: number;
    dtMinimo: number;
    margenAgarre: number;
    escalaAgarrado: number;
  };
  atraccion: { fuerzaMinimaFraccion: number };
  captura: {
    margenRadioObjeto: number;
    caidaSegundos: number;
    caidaAcercamiento: number;
    caidaGiro: number;
  };
  combo: { ventanaSegundos: number; mostrarDesde: number };
  objetos: TipoObjeto[];
  desbloqueo: { fraccionRadioHoyo: number };
  aparicion: {
    iniciales: number;
    pesoBase: number;
    pesoPorIndice: number;
    distanciaHoyoMaxima: number;
    margenHoyo: number;
    separacion: number;
    margenBorde: number;
    intentos: number;
    velocidadCrecer: number;
  };
  mejoras: Mejora[];
  efectos: Record<IdEfecto, Efecto>;
  sonido: {
    general: number;
    volumen: Record<IdSonido, number>;
    tragar: {
      tonoBase: number;
      tonoPorTamano: number;
      volumenBase: number;
      volumenPorTamano: number;
      radioReferencia: number;
    };
    moneda: { semitonosMaximo: number };
  };
  visual: {
    objetoImagenPx: number;
    objetoCirculoPx: number;
    hoyoBorde: number;
    hoyoRemolino: number;
    hoyoNucleo: number;
    giroRemolino: number;
    giroPorVelocidad: number;
    suavizadoHoyo: number;
    monedaPopup: number;
    popupSegundos: number;
    popupSubida: number;
    sombra: { dx: number; dy: number; alto: number; color: string; opacidad: number };
    halo: { color: string; opacidad: number; borde: string; bordeOpacidad: number; bordeGrosor: number };
    polvo: {
      maximo: number;
      probabilidad: number;
      velocidad: number;
      giroBase: number;
      giroCerca: number;
      color: string;
      opacidad: number;
      radio: number;
    };
    lineaAgarre: { color: string; opacidad: number; grosor: number; trazo: number; hueco: number };
  };
}

/** Revisa lo mínimo para avisar pronto si el JSON quedó mal escrito. Devuelve la lista de problemas. */
export function revisarBalance(b: Balance): string[] {
  const errores: string[] = [];
  if (!b?.mundo || !(b.mundo.ancho > 0) || !(b.mundo.alto > 0)) errores.push("mundo.ancho/alto");
  if (!Array.isArray(b?.objetos) || b.objetos.length === 0) errores.push("objetos vacío");
  else
    b.objetos.forEach((o, i) => {
      if (!o.id || !(o.r > 0) || !(o.valor >= 0)) errores.push(`objetos[${i}]`);
    });
  for (const id of IDS_MEJORA) {
    if (!b?.mejoras?.some((m) => m.id === id)) errores.push(`falta mejora ${id}`);
  }
  if (b?.efectos) {
    for (const [nombre, ef] of Object.entries(b.efectos)) {
      if (!IDS_MEJORA.includes(ef.mejora)) errores.push(`efectos.${nombre}.mejora`);
      if (ef.porNivel === undefined && ef.factorPorNivel === undefined) errores.push(`efectos.${nombre} sin porNivel ni factorPorNivel`);
    }
  } else errores.push("falta efectos");
  for (const id of IDS_SONIDO) {
    if (typeof b?.sonido?.volumen?.[id] !== "number") errores.push(`sonido.volumen.${id}`);
  }
  return errores;
}
