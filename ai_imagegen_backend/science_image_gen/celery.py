import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'science_image_gen.settings')

app = Celery('science_image_gen')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()