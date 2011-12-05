from django.contrib import admin

from models import *
from forms import *

class CustomValueInline(admin.TabularInline):
    model = CustomValue
    template = 'admin_hack/customvalue_tabularinline.html'

class FieldInline(admin.TabularInline):
    model = Field
    extra = 0

class FormModelAdmin(admin.ModelAdmin):
    inlines = (
        FieldInline,
    )

    def get_formsets(self, request, obj=None):
        if obj is not None:
            for i in super(FormModelAdmin, self).get_formsets(request, obj):
                yield i

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            fields = obj.model_admin().get_form(request).base_fields

            # save a 'full' preset with all fields
            if Form.objects.filter(contenttype=obj.contenttype).count() == 0:
                form = Form(name='full', contenttype=obj.contenttype)
                form.save()
                for name, field in fields.items():
                    Field(form=form, name=name).save()

            obj.save()

            for name, field in fields.items():
                Field(form=obj, name=name).save()
        else:
            obj.save()

admin.site.register(AdminHackUserProfile)
admin.site.register(Form, FormModelAdmin)
