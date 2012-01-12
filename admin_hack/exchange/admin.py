from django.contrib import admin
from django.utils.translation import ugettext_lazy as _
from django.utils import simplejson

from tasks import *
from models import *

class UploadAdmin(admin.ModelAdmin):
    fields = (
        'name',
        'upload',
        'template',
    )

    list_display = (
        'name',
        'creation_user',
        'creation_datetime',
        'modification_datetime',
    )

    def load_data(modeladmin, request, queryset):
        for obj in queryset:
            upload_import.async(obj.pk)
    load_data.short_description = _('Launch data import in background')

    actions = [
        load_data,
    ]

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.creation_user = request.user
        obj.save()

admin.site.register(Upload, UploadAdmin)

class TemplateAdmin(admin.ModelAdmin):
    exclude = (
        'creation_user',
    )

    list_display = (
        'name',
        'creation_user',
        'creation_datetime',
        'modification_datetime',
    )

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.creation_user = request.user
        obj.save()
    
    def change_view(self, request, object_id, extra_context=None):
        obj = Template.objects.get(pk=object_id)
        field_names = []
        fields = [x for x in obj.contenttype.model_class()._meta.fields]
        fields += [x for x in obj.contenttype.model_class()._meta.many_to_many]

        for field in fields:
            if not getattr(field, 'rel', None):
                field_names.append(field.name)
            else:
                for rel_field in field.rel.to._meta.fields:
                    if rel_field.name in ('lft', 'parent', 'rght', 'tree_id', 'level'):
                        continue
                    if getattr(rel_field, 'rel', False):
                        continue
                    field_names.append('%s.%s' % (field.name, rel_field.name))

        # for debugging purposes:
        field_names.sort()
        extra_context = {
            'field_names': field_names,
            'field_names_json': simplejson.dumps(field_names),
        }
        return super(TemplateAdmin, self).change_view(request, object_id,
            extra_context=extra_context)
admin.site.register(Template, TemplateAdmin)
