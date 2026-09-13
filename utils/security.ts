/**
 * Utilitários de Segurança e Sanitização Defensiva (Hardening Pentest)
 * Sistema Guardião GSD-SP
 */

/**
 * Escapa caracteres HTML perigosos em strings para mitigar Cross-Site Scripting (XSS).
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitiza e valida URLs externas ou imagens, bloqueando protocolos perigosos
 * como javascript:, vbscript: e data:text/html (vetores comuns de XSS/SSRF).
 */
export function sanitizeUrl(url: string | null | undefined, fallback = '/logo_gsd.png'): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();

  // URLs relativas seguras
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  // Data URLs seguras (apenas imagens rasterizadas)
  if (trimmed.startsWith('data:image/png;') || 
      trimmed.startsWith('data:image/jpeg;') || 
      trimmed.startsWith('data:image/webp;')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    // URL inválida
  }

  return fallback;
}

/**
 * Extensões expressamente bloqueadas por risco de execução remota de código ou SVG XSS.
 */
const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'html', 'htm', 'js', 'vbs', 'scr', 'msi', 'com', 'svg'
]);

export interface FileValidationOptions {
  maxSizeMB?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

/**
 * Validação rigorosa no cliente para prevenir DoS por exaustão de memória
 * e upload de arquivos executáveis / maliciosos.
 */
export function validateFileUpload(
  file: File,
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  const maxSizeMB = options.maxSizeMB ?? 10;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (!file) {
    return { valid: false, error: 'Nenhum arquivo fornecido.' };
  }

  // 1. Limite de tamanho
  if (file.size > maxSizeBytes) {
    const actualMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `O arquivo "${file.name}" excede o tamanho máximo permitido de ${maxSizeMB}MB (tamanho atual: ${actualMB}MB).`
    };
  }

  // 2. Extração e validação da extensão
  const fileNameParts = file.name.split('.');
  const ext = fileNameParts.length > 1 ? fileNameParts.pop()?.toLowerCase() || '' : '';

  if (!ext || DANGEROUS_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `A extensão ".${ext || 'desconhecida'}" do arquivo "${file.name}" não é permitida por motivos de segurança.`
    };
  }

  // 3. Validação de extensões permitidas
  if (options.allowedExtensions && options.allowedExtensions.length > 0) {
    const allowed = options.allowedExtensions.map(e => e.toLowerCase().replace(/^\./, ''));
    if (!allowed.includes(ext)) {
      return {
        valid: false,
        error: `O formato ".${ext}" não é suportado. Formatos aceitos: ${allowed.join(', ')}.`
      };
    }
  }

  // 4. Validação de MIME types permitidos
  if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
    const isMimeAllowed = options.allowedMimeTypes.some(mime => {
      if (mime.endsWith('/*')) {
        const prefix = mime.slice(0, -2);
        return file.type.startsWith(prefix);
      }
      return file.type === mime;
    });

    // Se o arquivo tiver tipo definido e não bater com a whitelist
    if (file.type && !isMimeAllowed) {
      return {
        valid: false,
        error: `O tipo de mídia "${file.type}" do arquivo "${file.name}" não é aceito.`
      };
    }
  }

  return { valid: true };
}
