// Forma del archivo public/data/balance.json.
// Aquí solo hay tipos y una revisión básica: los números viven en el JSON.
import type { DefLogro } from "./logros";
import type { PlantillaMision } from "./misiones";

export interface TipoObjeto {
  id: string;
  nombre: string;
  r: number;
  valor: number;
  /** Ancho de la sombra respecto al radio (por defecto 1). El robot es más largo. */
  sombraAncho?: number;
}

export interface Zona {
  id: string;
  nombre: string;
  /** Nombre de la imagen del suelo en assets/img/ (sin .png). */
  suelo: string;
  /** Todo lo que se traga en esta zona vale esto veces más. */
  multiplicadorValor: number;
  /** Ids de los 8 objetos de la zona, de chico a grande. */
  objetos: string[];
  /** Id del jefe de la zona. */
  jefe: string;
}

export type IdEspecial = "dorado" | "pesado" | "bomba";

export type IdMejora = "pull" | "force" | "size" | "spawn" | "value" | "combo" | "gravity" | "drone";
export const IDS_MEJORA: IdMejora[] = ["pull", "force", "size", "spawn", "value", "combo", "gravity", "drone"];

export interface Mejora {
  id: IdMejora;
  nombre: string;
  max: number;
  base: number;
  mult: number;
}

// Un efecto es lineal (base + nivel*porNivel) o exponencial (max(minimo, base*factor^nivel))
export interface FormulaEfecto {
  base: number;
  porNivel?: number;
  factorPorNivel?: number;
  minimo?: number;
}

export interface Efecto extends FormulaEfecto {
  mejora: IdMejora;
}

export type IdPermanente = "valorPerm" | "inicio" | "comboPerm" | "raros" | "dronPerm" | "offline";

/** Mejora permanente (se compra con materia oscura y no se pierde al colapsar). */
export interface Permanente {
  id: IdPermanente;
  nombre: string;
  max: number;
  base: number;
  mult: number;
}

export interface EfectoPermanente extends FormulaEfecto {
  permanente: IdPermanente;
}

export type IdEfectoPermanente =
  | "multiplicadorPermanente"
  | "monedasIniciales"
  | "comboExtra"
  | "doradoExtra"
  | "dronInicial"
  | "horasOfflineExtra";

export type IdEfecto =
  | "radioAtraccion"
  | "fuerza"
  | "radioHoyo"
  | "velocidadCaptura"
  | "maxObjetos"
  | "intervaloAparicion"
  | "multiplicadorValor"
  | "ventanaCombo"
  | "gravedadPasiva"
  | "intervaloDron";

export type IdSonido = "ambiente" | "tragar" | "moneda" | "comprar" | "desbloquear";
export const IDS_SONIDO: IdSonido[] = ["ambiente", "tragar", "moneda", "comprar", "desbloquear"];

export interface SonidoEvento {
  archivo: IdSonido;
  tono: number;
  /** Se multiplica por el volumen del archivo. */
  volumen: number;
}

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
  combo: { mostrarDesde: number; multiplicadorPorCombo: number; multiplicadorMaximo: number };
  tiros: {
    rapidezMinima: number;
    carambola: { nombre: string; bonus: number };
    lejos: { nombre: string; bonus: number; distancia: number };
    directo: { nombre: string; bonus: number; segundos: number };
  };
  objetos: TipoObjeto[];
  zonas: Zona[];
  dron: {
    orbita: number;
    giroOrbita: number;
    tamano: number;
    vueloSegundos: number;
    extraVelocidad: number;
    velocidadMaxima: number;
  };
  offline: { eficiencia: number; horasMaximas: number; minimoSegundos: number };
  album: { bonusPorZona: number };
  colapso: { divisor: number; exponente: number; minimo: number };
  logros: DefLogro[];
  permanentes: Permanente[];
  efectosPermanentes: Record<IdEfectoPermanente, EfectoPermanente>;
  misiones: { activas: number; premioBase: number; plantillas: PlantillaMision[] };
  hambre: {
    meta: number;
    crecePorJefe: number;
    colorVacio: string;
    colorLleno: string;
    grosor: number;
    /** Radio del anillo = radio del hoyo × distancia. */
    distancia: number;
  };
  especiales: {
    dorado: { probabilidad: number; multiplicador: number; color: string };
    pesado: { probabilidad: number; multiplicador: number; peso: number; radioMinimo: number; color: string };
    bomba: { probabilidad: number; objeto: string; radioEfecto: number; impulso: number };
  };
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
    /** Sonidos de eventos nuevos que reusan un archivo con otro tono: { archivo, tono, volumen } */
    eventos: Record<string, SonidoEvento>;
  };
  visual: {
    /** Cuánto se ve inclinado el hoyo: 1 = desde arriba (círculo), 0.75 = un poco de lado (óvalo). */
    inclinacion: number;
    /** Qué tan hondo se ve el pozo por dentro (veces el radio del hoyo). */
    profundidad: number;
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
    halo: {
      color: string;
      opacidad: number;
      borde: string;
      bordeOpacidad: number;
      bordeGrosor: number;
      /** Borde punteado: largo de cada trazo y del espacio, en px. */
      trazo: number;
      hueco: number;
    };
    /** Brillo que pulsa alrededor del hoyo (un color por capa). tamano = diámetro / radio del hoyo. */
    brillo: { colores: string[]; tamano: number; opacidad: number; pulso: number };
    /** Chispas que caen en espiral y ráfaga al tragar. */
    chispas: {
      maximo: number;
      probabilidad: number;
      velocidad: number;
      giroBase: number;
      giroCerca: number;
      colores: string[];
      largo: number;
      grosor: number;
      rafaga: number;
      rafagaVelocidad: number;
      rafagaSegundos: number;
    };
    /** Piso que se retuerce y se hunde: radio = veces el radio del hoyo. */
    distorsion: { radio: number; giro: number; hundimiento: number; oscurecer: number };
    /** Capa de luz: cálida a la izquierda, fría a la derecha, viñeta en las orillas. */
    luz: { calida: string; fria: string; opacidadLados: number; vineta: string; opacidadVineta: number };
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
  if (!Array.isArray(b?.zonas) || b.zonas.length === 0) errores.push("zonas vacío");
  else
    for (const z of b.zonas) {
      for (const id of [...z.objetos, z.jefe]) {
        if (!b.objetos?.some((o) => o.id === id)) errores.push(`zona ${z.id}: no existe el objeto ${id}`);
      }
    }
  for (const id of IDS_SONIDO) {
    if (typeof b?.sonido?.volumen?.[id] !== "number") errores.push(`sonido.volumen.${id}`);
  }
  return errores;
}
