/**
 * Dimensions d'une image depuis ses seuls premiers octets.
 *
 * Aucune dépendance : les trois formats acceptés par le téléversement
 * (`ALLOWED_IMAGE_TYPES` de src/lib/storage.ts) annoncent leur taille dans
 * l'en-tête, donc quelques kilo-octets suffisent. C'est ce qui permet au script
 * de rattrapage de mesurer des centaines de photos sans les télécharger.
 */

/** @typedef {{ width: number, height: number, format: string }} Dimensions */

/** @returns {Dimensions | null} */
export function imageSize(buffer) {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return png(b) ?? jpeg(b) ?? webp(b) ?? null;
}

// ------------------------------------------------------------------------ PNG

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function png(b) {
  if (b.length < 24 || !b.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  // Le premier chunk est toujours IHDR : largeur puis hauteur, en gros-boutien.
  if (b.subarray(12, 16).toString("ascii") !== "IHDR") return null;
  return {
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20),
    format: "png",
  };
}

// ----------------------------------------------------------------------- JPEG

/**
 * Marqueurs « Start Of Frame » qui portent les dimensions.
 * Les trous (C4, C8, CC) sont des tables de Huffman et d'arithmétique, pas des
 * cadres : les inclure ferait lire des octets qui ne sont pas une taille.
 */
const SOF = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;

  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) {
      i += 1; // octet de bourrage entre segments
      continue;
    }
    const marker = b[i + 1];

    // D0-D9 et 01 n'ont pas de charge utile : pas de longueur à lire.
    if ((marker >= 0xd0 && marker <= 0xd9) || marker === 0x01) {
      i += 2;
      continue;
    }

    const length = b.readUInt16BE(i + 2);
    if (length < 2) return null;

    if (SOF.has(marker)) {
      // i+2 longueur (2), i+4 précision (1), i+5 hauteur (2), i+7 largeur (2)
      return {
        height: b.readUInt16BE(i + 5),
        width: b.readUInt16BE(i + 7),
        format: "jpeg",
      };
    }

    i += 2 + length;
  }
  return null;
}

// ----------------------------------------------------------------------- WebP

function webp(b) {
  if (
    b.length < 30 ||
    b.subarray(0, 4).toString("ascii") !== "RIFF" ||
    b.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    return null;
  }

  const chunk = b.subarray(12, 16).toString("ascii");

  // WebP simple, avec pertes : en-tête VP8 puis un bitstream keyframe.
  if (chunk === "VP8 ") {
    // 20-22 : tag de cadre (3 octets), 23-25 : signature 9d 01 2a
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return {
      width: b.readUInt16LE(26) & 0x3fff,
      height: b.readUInt16LE(28) & 0x3fff,
      format: "webp",
    };
  }

  // WebP sans perte : 14 bits de largeur puis 14 bits de hauteur, moins un.
  if (chunk === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const bits = b.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
      format: "webp",
    };
  }

  // WebP étendu (transparence, animation) : dimensions de la toile sur
  // 24 bits chacune, moins un. C'est ce que produit la plupart des encodeurs
  // dès qu'il y a un canal alpha.
  if (chunk === "VP8X") {
    return {
      width: (b[24] | (b[25] << 8) | (b[26] << 16)) + 1,
      height: (b[27] | (b[28] << 8) | (b[29] << 16)) + 1,
      format: "webp",
    };
  }

  return null;
}
