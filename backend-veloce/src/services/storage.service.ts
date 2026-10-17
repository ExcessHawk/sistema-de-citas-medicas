import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { Response as HttpResponse, type FileResponse } from 'veloce-ts';

/**
 * Archivos de los documentos clínicos.
 *
 * A diferencia de una foto de catálogo, esto no se sirve en abierto: una receta
 * o un análisis pertenecen a una persona. El archivo se entrega por el id del
 * documento, que es lo único que permite comprobar de quién es; la clave sola
 * no dice nada.
 */

/** 5 MiB. Un PDF de laboratorio con imágenes llega a pesar eso. */
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

export interface StoredFile {
  key: string;
  bytes: number;
  contentType: string;
}

export interface StorageProvider {
  readonly name: string;
  put(input: { data: Uint8Array; contentType: string; ext: string }): Promise<StoredFile>;
  serve(key: string, filename: string): Promise<FileResponse | null>;
  delete(key: string): Promise<void>;
  /** Borra lo que no esté en la lista. Lo usa el reinicio de la demostración. */
  clearExcept(keys: Iterable<string>): Promise<number>;
}

export class UploadRejectedError extends Error {}

/**
 * Qué se acepta, reconocido por los primeros bytes y no por el nombre ni por el
 * `Content-Type`, que los escribe el cliente.
 *
 * SVG queda fuera a propósito: es un documento que admite `<script>`. El PDF
 * también puede traer JavaScript, pero se entrega como descarga y con el tipo
 * fijo, así que el navegador no lo abre en el origen de la aplicación.
 */
const FIRMAS: Array<{ contentType: string; ext: string; test: (b: Uint8Array) => boolean }> = [
  {
    contentType: 'application/pdf',
    ext: 'pdf',
    test: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  },
  {
    contentType: 'image/jpeg',
    ext: 'jpg',
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    contentType: 'image/png',
    ext: 'png',
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    contentType: 'image/webp',
    ext: 'webp',
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export function sniff(data: Uint8Array): { contentType: string; ext: string } | null {
  if (data.length < 12) return null;
  const firma = FIRMAS.find((f) => f.test(data));
  return firma ? { contentType: firma.contentType, ext: firma.ext } : null;
}

/** Solo las claves que genera este servicio. Corta el paso a `../`. */
const CLAVE_VALIDA = /^[0-9a-f]{32}\.(pdf|jpg|png|webp)$/;

export function claveValida(key: string): boolean {
  return CLAVE_VALIDA.test(key);
}

/** Un nombre de descarga sin comillas ni saltos: va dentro de una cabecera. */
function nombreSeguro(nombre: string, ext: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .trim()
    .slice(0, 80);
  const base = limpio || 'documento';
  return base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`;
}

export class LocalDiskStorage implements StorageProvider {
  readonly name = 'local-disk';
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = resolve(dir);
  }

  private ruta(key: string): string {
    if (!claveValida(key)) throw new UploadRejectedError('Clave de archivo inválida');
    return join(this.dir, key);
  }

  async put(input: { data: Uint8Array; contentType: string; ext: string }): Promise<StoredFile> {
    if (input.data.byteLength > DOCUMENT_MAX_BYTES) {
      throw new UploadRejectedError('El archivo pesa más de lo permitido');
    }
    await mkdir(this.dir, { recursive: true });
    const key = `${randomUUID().replace(/-/g, '')}.${input.ext}`;
    await writeFile(this.ruta(key), input.data);
    return { key, bytes: input.data.byteLength, contentType: input.contentType };
  }

  async serve(key: string, filename: string): Promise<FileResponse | null> {
    if (!claveValida(key)) return null;
    try {
      if (!(await stat(this.ruta(key))).isFile()) return null;
    } catch {
      return null;
    }
    const ext = key.slice(key.lastIndexOf('.') + 1);
    const firma = FIRMAS.find((f) => f.ext === ext);
    // `fileFrom` ancla la lectura al directorio; salirse lo corta el framework.
    return HttpResponse.fileFrom(this.dir, key, {
      contentType: firma?.contentType ?? 'application/octet-stream',
      filename: nombreSeguro(filename, ext),
    });
  }

  async delete(key: string): Promise<void> {
    if (!claveValida(key)) return;
    await rm(this.ruta(key), { force: true });
  }

  async clearExcept(keys: Iterable<string>): Promise<number> {
    const vivas = new Set(keys);
    let archivos: string[];
    try {
      archivos = await readdir(this.dir);
    } catch {
      return 0;
    }
    const sobran = archivos.filter((n) => claveValida(n) && !vivas.has(n));
    await Promise.all(sobran.map((n) => rm(join(this.dir, n), { force: true })));
    return sobran.length;
  }
}

export function createStorageProvider(): StorageProvider {
  return new LocalDiskStorage(process.env.UPLOADS_DIR ?? './data/uploads');
}
