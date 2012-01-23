from django import template
from django.utils import simplejson
from django.utils.safestring import mark_safe
from django.contrib.contenttypes.models import ContentType

from admin_hack.models import Form, FormForModel

register = template.Library()

@register.inclusion_tag('admin_hack/change_form_tools.html', takes_context=True)
def admin_hack_change_form_tools(context):
    if context.get('content_type_id', False):
        ctype = ContentType.objects.get_for_id(context['content_type_id'])

        for f in ctype.model_class()._meta.fields:
            try:
                if f.rel.to == Form:
                    context['change_view'] = True
            except:
                continue

        if not context.get('change_view', False):
            return {}

        context['contenttype'] = ctype
        forms = context['forms'] = Form.objects.filter(contenttype=ctype
            ).select_related()
            
        forms_dict = context['forms_dict'] = [f.to_dict() for f in forms]

        original = context.get('original', False)
        if original:
            try:
                context['form_for_model'] = FormForModel.objects.get(content_type=ctype,
                    object_id=original.pk)
            except FormForModel.DoesNotExist:
                pass

    return context

@register.filter
def as_json(data):
    return mark_safe(simplejson.dumps(data))
