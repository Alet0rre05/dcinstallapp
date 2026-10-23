"""V3.0: datos de la planilla de extintores (marca, año, agente, capacidad, planta, precinto)."""
from django.db import migrations, models

import apps.core.models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_notificacion"),
    ]

    operations = [
        # -- Cliente (y su historial) --
        migrations.AddField(
            model_name="cliente",
            name="planta",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="historicalcliente",
            name="planta",
            field=models.CharField(blank=True, max_length=200),
        ),
        # -- Matafuego (y su historial) --
        migrations.AddField(
            model_name="matafuego",
            name="marca",
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name="matafuego",
            name="anio_fabricacion",
            field=models.PositiveSmallIntegerField(
                blank=True, null=True, validators=[apps.core.models.validar_anio_fabricacion]
            ),
        ),
        migrations.AddField(
            model_name="matafuego",
            name="agente",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name="matafuego",
            name="capacidad",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="historicalmatafuego",
            name="marca",
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name="historicalmatafuego",
            name="anio_fabricacion",
            field=models.PositiveSmallIntegerField(
                blank=True, null=True, validators=[apps.core.models.validar_anio_fabricacion]
            ),
        ),
        migrations.AddField(
            model_name="historicalmatafuego",
            name="agente",
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name="historicalmatafuego",
            name="capacidad",
            field=models.CharField(blank=True, max_length=20),
        ),
        # -- Control: precinto de seguridad (None = sin dato en controles viejos) --
        migrations.AddField(
            model_name="control",
            name="precinto",
            field=models.BooleanField(blank=True, default=None, null=True),
        ),
    ]
