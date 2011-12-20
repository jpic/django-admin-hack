from django.conf import settings
from django.utils.translation import ugettext as _
from django.core import urlresolvers
from django import http

def enable_custom_values(model, field_name=None):
      #File "/srv/art/art_env/src/admin-hack/admin_hack/__init__.py", line 10, in enable_custom_values
      #models.ForeignKey(model, null=True, blank=True).contribute_to_class(
      #AttributeError: 'module' object has no attribute 'ForeignKey'
    from django.db import models

    if field_name is None:
        field_name = model._meta.module_name.lower()

    models.ForeignKey(model, null=True, blank=True).contribute_to_class(
        models.get_model('admin_hack', 'CustomValue'), field_name)

def admin_export(modeladmin, request, queryset):
    url = urlresolvers.reverse('admin_hack_export')
    url += '?app=%s&model=%s' % (queryset.model._meta.app_label, 
        queryset.model._meta.module_name)
    for item in queryset:
        url += '&pk=%s' % (item.pk)
    return http.HttpResponseRedirect(url)
admin_export.short_description = _(u'Export selected items to CSV')

def patch_admin(site, admin_hack_prefix='/admin_hack/'):
    for model, options in site._registry.items():
        # smelly code, obfuscation over metaclass FTW
        media = options.media
        media.add_js(['%shack.js' % admin_hack_prefix])
        media.add_css({
            'all': [settings.STATIC_URL + 'admin_hack/style.css']
        })
        options.__class__.media = media

        #options.__class__.actions.append(admin_export)
