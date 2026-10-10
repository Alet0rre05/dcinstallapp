import { QRCodeSVG } from "qrcode.react";
import { urlQR } from "./publicUrl.js";

export { urlQR };

/**
 * Único lugar donde se dibuja el QR de un matafuego (pantalla y etiquetas).
 * level="H": corrección de errores ~30 %, el QR se lee aun con la etiqueta algo dañada.
 * marginSize: zona de silencio en módulos (el estándar pide 4; en etiquetas el resto lo da el papel blanco).
 * Sin logo dentro del QR: un logo tapa módulos y le resta tolerancia al daño.
 */
export default function QRMatafuego({ token, size = 160, marginSize = 2, className, style }) {
  return (
    <QRCodeSVG
      value={urlQR(token)}
      size={size}
      level="H"
      marginSize={marginSize}
      bgColor="#ffffff"
      fgColor="#000000"
      className={className}
      style={style}
    />
  );
}
