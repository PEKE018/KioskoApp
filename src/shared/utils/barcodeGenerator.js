"use strict";
/**
 * Utilidad para generar códigos de barras internos
 * para productos sin código de barras (artesanales, comidas, etc.)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInternalBarcode = generateInternalBarcode;
exports.isInternalBarcode = isInternalBarcode;
exports.getCategoryPrefix = getCategoryPrefix;
exports.getAvailablePrefixes = getAvailablePrefixes;
// Prefijos por tipo de categoría
const CATEGORY_PREFIXES = {
    artesanal: 'ART',
    artesanales: 'ART',
    comida: 'COM',
    comidas: 'COM',
    caramelo: 'CAR',
    caramelos: 'CAR',
    golosina: 'GOL',
    golosinas: 'GOL',
    bijouterie: 'BIJ',
    bijoutería: 'BIJ',
    accesorios: 'ACC',
    bebida: 'BEB',
    bebidas: 'BEB',
    snack: 'SNK',
    snacks: 'SNK',
    limpieza: 'LIM',
    fiambre: 'FIA',
    fiambres: 'FIA',
    lacteos: 'LAC',
    lácteos: 'LAC',
    panaderia: 'PAN',
    panadería: 'PAN',
    verduleria: 'VER',
    verdulería: 'VER',
    frutas: 'FRU',
    kiosco: 'KIO',
    varios: 'VAR',
};
const DEFAULT_PREFIX = 'INT';
/**
 * Genera un código interno único para productos sin código de barras
 * Formato: XXX-XXXXXXXX (prefijo + timestamp en base36 + random)
 *
 * @param categoryName - Nombre de la categoría para determinar el prefijo
 * @returns Código de barras generado (ej: "COM-M5K2F3AB")
 */
function generateInternalBarcode(categoryName) {
    const prefix = categoryName
        ? (CATEGORY_PREFIXES[categoryName.toLowerCase().trim()] || DEFAULT_PREFIX)
        : DEFAULT_PREFIX;
    // Timestamp en base36 (más corto) + 2 caracteres random para unicidad
    const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `${prefix}-${timestamp}${random}`;
}
/**
 * Verifica si un código de barras fue generado internamente por el sistema
 *
 * @param barcode - Código a verificar
 * @returns true si es un código interno
 */
function isInternalBarcode(barcode) {
    if (!barcode)
        return false;
    const allPrefixes = [...new Set([...Object.values(CATEGORY_PREFIXES), DEFAULT_PREFIX])];
    return allPrefixes.some(prefix => barcode.startsWith(`${prefix}-`));
}
/**
 * Obtiene el prefijo para una categoría dada
 *
 * @param categoryName - Nombre de la categoría
 * @returns Prefijo de 3 letras
 */
function getCategoryPrefix(categoryName) {
    return CATEGORY_PREFIXES[categoryName.toLowerCase().trim()] || DEFAULT_PREFIX;
}
/**
 * Lista de todos los prefijos disponibles (para referencia)
 */
function getAvailablePrefixes() {
    return { ...CATEGORY_PREFIXES, default: DEFAULT_PREFIX };
}
