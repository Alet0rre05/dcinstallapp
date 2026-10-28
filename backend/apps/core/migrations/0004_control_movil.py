"""Evidencias, geolocalización e idempotencia para controles móviles."""
import uuid
from django.db import migrations, models


def rellenar_claves(apps, schema_editor):
    Control = apps.get_model("core", "Control")
    for control in Control.objects.filter(idempotency_key__isnull=True).iterator():
        Control.objects.filter(pk=control.pk).update(idempotency_key=uuid.uuid4())


class Migration(migrations.Migration):
    dependencies = [("core", "0003_v30_planilla_extintores")]
    operations = [
        migrations.AddField(model_name="control", name="foto_data", field=models.TextField(blank=True)),
        migrations.AddField(model_name="control", name="firma_data", field=models.TextField(blank=True)),
        migrations.AddField(model_name="control", name="gps_latitud", field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
        migrations.AddField(model_name="control", name="gps_longitud", field=models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
        migrations.AddField(model_name="control", name="idempotency_key", field=models.UUIDField(blank=True, editable=False, null=True)),
        migrations.RunPython(rellenar_claves, migrations.RunPython.noop),
        migrations.AlterField(model_name="control", name="idempotency_key", field=models.UUIDField(blank=True, default=uuid.uuid4, editable=False, null=True, unique=True)),
    ]

