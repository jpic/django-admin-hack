from django import template
from django.utils import simplejson
from django.utils.safestring import mark_safe

register = template.Library()

@register.inclusion_tag('admin_hack/change_form_tools.html', takes_context=True)
def admin_hack_change_form_tools(context):
    return context

@register.filter
def as_json(data):
    return mark_safe(simplejson.dumps(data))
