from django import template
from django.utils import simplejson
from django.utils.safestring import mark_safe
from django.contrib.contenttypes.models import ContentType
from django.forms import Select

from admin_hack.models import Form, FormForModel, KIND_CHOICES

register = template.Library()

@register.inclusion_tag('admin_hack/change_form_tools.html', takes_context=True)
def admin_hack_change_form_tools(context):
    ctype_id = context.get('content_type_id', False)

    if ctype_id:
        ctype = ContentType.objects.get_for_id(ctype_id)
        forms = Form.objects.filter(contenttype=ctype).select_related()
        forms_dict = [f.to_dict() for f in forms]
        forms_pks = [f.pk for f in forms]

        kind_select = Select(choices=KIND_CHOICES).render(
            'admin_hack_create_field_kind', None)

        context.update({
            'content_type_id': ctype_id,
            'forms_pks': mark_safe(simplejson.dumps(forms_pks)),
            'kind_select': mark_safe(kind_select),
            'forms_dicts': mark_safe(simplejson.dumps(forms_dict)),
        })

    return context

@register.filter
def as_json(data):
    return mark_safe(simplejson.dumps(data))
