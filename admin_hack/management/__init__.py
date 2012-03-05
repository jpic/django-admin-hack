from django.core.management.sql import emit_post_sync_signal

from ..models import Field

def reset_full_forms(sender, **kwargs):
    Field.objects.filter(form__name='full').delete()
emit_post_sync_signal.connect(reset_full_forms)
