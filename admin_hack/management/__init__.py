from django.db.models.signals import post_syncdb

from admin_hack import models as admin_hack_models
from admin_hack.models import Field

def reset_full_forms(sender, **kwargs):
    Field.objects.filter(form__name='full').delete()
post_syncdb.connect(reset_full_forms, sender=admin_hack_models)
