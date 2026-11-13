import hashlib

from django.db import migrations


DOCUMENTOS = {
    "PRIVACIDAD": """## Quién trata tus datos

AJR DATA desarrolla y opera DC INSTALL en la República Argentina. Gestiona las cuentas y la seguridad del servicio. Cada empresa usuaria determina qué datos de clientes, plantas y personal necesita para documentar sus inspecciones y a quién habilita para consultarlos.

## Qué información se utiliza

- **Cuenta comercial.** Nombre, correo electrónico, empresa, rol y clientes asignados permiten identificar al usuario y delimitar su acceso.
- **Inventario.** La empresa registra plantas, ubicaciones, números de serie, códigos QR, vencimientos, inspecciones y tickets de soporte. Quien recibe el QR de un equipo puede consultar su ficha pública reducida.
- **Evidencia de campo.** Un control puede incluir fotografías, firma capturada en pantalla y coordenadas GPS cuando se habilita la ubicación. La firma capturada documenta la intervención; su valor depende del contexto y de los mecanismos de identificación utilizados.
- **Seguridad y auditoría.** Se registran operaciones, fechas, usuarios e información técnica como la dirección IP. Cuando está habilitada la verificación antibots, Cloudflare Turnstile procesa señales técnicas del navegador para evaluar la solicitud.

### Acceso y conservación

La información operativa se comparte con los usuarios autorizados de la organización y los proveedores necesarios para alojamiento, correo y protección del servicio. La app móvil puede guardar copias de trabajo y controles pendientes en el dispositivo para sincronizarlos al recuperar la conexión. La organización debe proteger los equipos y retirar el acceso de quienes dejan de utilizarlos.

Los datos se conservan mientras se necesitan para prestar el servicio, atender solicitudes, acreditar inspecciones o cumplir obligaciones legales. Antes de cargar fotos, ubicaciones o firmas de terceros, la empresa debe informar su finalidad y contar con la autorización o base legal correspondiente.

## Cómo ejercer tus derechos

La Ley 25.326 reconoce el acceso, la rectificación, la actualización y la supresión de datos personales. Podés solicitar estos derechos y formular oposición cuando corresponda, indicando los datos afectados, a través del canal de contacto de AJR DATA o de la empresa que registró la inspección. Podrá requerirse acreditación de identidad para entregar o modificar datos.

El acceso se atiende en diez días corridos; la rectificación, actualización o supresión, en cinco días hábiles. La conservación exigida por ley o los derechos de terceros pueden limitar la supresión. Podés presentar un reclamo ante la [Agencia de Acceso a la Información Pública](https://www.argentina.gob.ar/aaip/datospersonales/derechos).

Consultá la versión publicada en [Documentos legales](/legales) o el [sitio de AJR DATA](https://ajrdata.com.ar).""",
    "TOS": """## Servicio y contratación

AJR DATA opera DC INSTALL en la República Argentina para que empresas habilitadas gestionen inventarios de matafuegos, trazabilidad QR, controles de campo, vencimientos, planillas y reportes. Quien contrata en nombre de una empresa debe contar con facultades suficientes.

## Responsabilidades durante una inspección

- **Empresa.** Verifica las habilitaciones del personal, asigna los permisos que corresponden y revoca las credenciales cuando termina una relación de trabajo.
- **Personal técnico.** Verifica en campo el equipo y sus condiciones. Registra con exactitud fechas, observaciones y evidencias y comprueba la sincronización de controles tomados sin conexión.
- **Usuarios.** Custodian su contraseña, informan accesos indebidos y usan los datos únicamente para los clientes y finalidades autorizados.

Las alertas dependen de las fechas cargadas. La empresa conserva la responsabilidad de programar las inspecciones y cumplir sus obligaciones técnicas. Los reportes de la plataforma sirven de apoyo documental y las habilitaciones y certificaciones proceden de las autoridades o profesionales competentes.

## Propiedad intelectual y responsabilidad

La Ley 11.723 protege el software y su documentación; la Ley 22.362 rige los derechos marcarios aplicables. La licencia se limita al uso contratado. La empresa conserva los derechos que le corresponden sobre los datos aportados. Cada parte responde por sus propios incumplimientos conforme al derecho argentino. Se preservan las garantías y los derechos irrenunciables del consumidor.

## Contrataciones a distancia

Cuando exista una relación de consumo, podés ejercer el derecho de revocación dentro de los diez días corridos desde la celebración del contrato o la entrega del bien, lo que ocurra último, en los términos del artículo 34 de la Ley 24.240 y del artículo 1110 del Código Civil y Comercial. El [Botón de arrepentimiento](/arrepentimiento) permite registrar la solicitud sin iniciar sesión y entrega una constancia.

La Disposición 954/2025 regula el botón y derogó la Resolución 424/2020. La recepción de la solicitud queda registrada en la fecha de presentación. El tratamiento de los datos se describe en la [Política de privacidad](/legales?doc=PRIVACIDAD).""",
    "EULA": """## Alcance de la licencia

AJR DATA concede a la organización contratante una licencia limitada, no exclusiva, intransferible y no sublicenciable para usar DC INSTALL en sus operaciones internas durante la vigencia del servicio. Comprende la aplicación web y la aplicación Android basada en Capacitor, con sus funciones de lectura offline y sincronización.

## Usuarios autorizados

- **ADMIN.** Administra los usuarios y los recursos dentro de su alcance.
- **OFICINA.** Coordina la cartera de clientes y prepara planillas y reportes autorizados.
- **OPERARIO.** Consulta los equipos asignados y registra controles y evidencias de campo.

La organización custodia los dispositivos y gestiona el acceso de su personal. Debe verificar que los controles pendientes se sincronicen antes de borrar datos locales o retirar un dispositivo de servicio.

## Datos, exportación y recuperación

La organización mantiene sus derechos sobre el contenido cargado. Los usuarios habilitados pueden exportar planillas y reportes correspondientes a sus clientes. La papelera prevé un período de recuperación de treinta días para los equipos dados de baja. Los registros de auditoría y los documentos sujetos a conservación legal siguen sus propios plazos.

## Restricciones y terminación

La licencia excluye la reventa, la sublicencia, el acceso a datos de otras organizaciones y la ingeniería inversa, descompilación o elusión de controles, salvo en los casos permitidos por la legislación aplicable. Se preservan las licencias de los componentes de terceros. La titularidad del software y sus marcas se rige por las leyes 11.723 y 22.362.

Al finalizar el servicio, la empresa debe coordinar la exportación de los datos que necesite conservar y retirar los accesos de su personal. Rige el derecho argentino, con las garantías imperativas que correspondan. Esta licencia se complementa con los [Términos de uso](/legales?doc=TOS) y la [Política de privacidad](/legales?doc=PRIVACIDAD).""",
}


def publicar_documentos(apps, schema_editor):
    documentos = apps.get_model("core", "LegalDocument").objects.using(schema_editor.connection.alias)
    for tipo, contenido in DOCUMENTOS.items():
        if documentos.filter(document_type=tipo, is_active=True).exists():
            continue
        documentos.get_or_create(
            document_type=tipo, version="1.0",
            defaults={"content": contenido, "is_active": True,
                      "content_sha256": hashlib.sha256(contenido.encode("utf-8")).hexdigest()},
        )


class Migration(migrations.Migration):
    dependencies = [("core", "0008_solicitud_arrepentimiento")]
    operations = [migrations.RunPython(publicar_documentos, migrations.RunPython.noop)]
