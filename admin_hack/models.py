from django.core import urlresolvers
from django.contrib import admin
from django.db import models
from django.utils.translation import ugettext as _
from django.db.models import signals
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes import generic

from autoslug import AutoSlugField
from annoying.fields import AutoOneToOneField

__all__ = ['CustomValue', 'AdminHackUserProfile', 'FormForModel', 'Form', 'Field']

def clean_customvalues(sender, instance=None, **kwargs):
    if not hasattr(instance, 'customvalue_set'):
        return
    
    instance.customvalue_set.all().delete()
signals.pre_delete.connect(clean_customvalues)

KIND_CHOICES = (
    ('int', _('integer')),
    ('float', _('decimal number')),
    ('char', _('short text')),
    ('text', _('text')),
    ('datetime', _('date and time')),
    ('date', _('date only')),
    ('time', _('time only')),
    ('image', _('image')),
    ('file', _('file')),
)

class CustomValue(models.Model):
    name = models.CharField(max_length=100)
    slug = AutoSlugField(populate_from='name')

    kind = models.CharField(choices=KIND_CHOICES, max_length=10)

    int_value = models.IntegerField(null=True, blank=True)
    float_value = models.FloatField(null=True, blank=True)
    char_value = models.CharField(max_length=255, null=True, blank=True)
    text_value = models.TextField(null=True, blank=True)
    datetime_value = models.DateTimeField(null=True, blank=True)
    date_value = models.DateField(null=True, blank=True)
    time_value = models.TimeField(null=True, blank=True)
    image_value = models.ImageField(null=True, blank=True, 
        upload_to='custom_value_images')
    file_value = models.FileField(null=True, blank=True,
        upload_to='custom_value_files')

    def save(self, *args, **kwargs):
        if not self.kind:
            raise Exception('CustomValue *needs* a kind')
        
        super(CustomValue, self).save(*args, **kwargs)
    
    @property
    def value(self):
        return getattr(self, self.kind + '_value')

    def __unicode__(self):
        return u'%s' % self.value

    class Meta:
        ordering = ('name',)

class AdminHackUserProfile(models.Model):
    user = AutoOneToOneField('auth.user', primary_key=True)
    forms = models.ManyToManyField('Form', null=True, blank=True)

    def to_dict(self):
        return {
            'forms': [f.to_dict() for f in self.forms.all()],
            'pk': self.pk,
        }

class FormForModel(models.Model):
    content_type = models.ForeignKey(ContentType)
    object_id = models.PositiveIntegerField()
    content_object = generic.GenericForeignKey('content_type', 'object_id')

    form = models.ForeignKey('Form')

    def __unicode__(self):
        return u'%s %s' % (self.form, self.content_object)

class Form(models.Model):
    contenttype = models.ForeignKey('contenttypes.contenttype', 
        verbose_name=_('form'), 
        help_text=_('you are about to configure a form preset for this type'))
    name = models.CharField(max_length=100, verbose_name=_('preset name'),
        help_text=_('the name of the preset you are about to configure'))

    def __unicode__(self):
        return self.name

    @classmethod
    def is_enabled_on(self, model):
        for f in model._meta.fields:
            try:
                if f.rel.to == Form:
                    return True
            except:
                continue

    def model_admin(self, site=admin.site):
        model = self.contenttype.model_class()
        return site._registry[model]

    class Meta:
        unique_together = (
            ('name', 'contenttype'),
        )

    def to_dict(self):
        return {
            'name': self.name,
            'pk': self.pk,
            'contenttype': {
                'pk': self.contenttype.pk,
            },
            'field_set': [f.to_dict() for f in self.field_set.all()],
        }

    def from_dict(self, data):
        self.name = data['name']
        self.contenttype_id = data['contenttype']['pk']

        self.field_set.all().delete()
        for field_dict in data['field_set']:
            field = self.field_set.create(name=field_dict['name'], 
                kind=field_dict.get('kind', None), order=field_dict['order'], 
                fieldset=field_dict.get('fieldset', None))

class Field(models.Model):
    form = models.ForeignKey('Form')
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)
    kind = models.CharField(choices=KIND_CHOICES, max_length=10, null=True, blank=True)
    fieldset = models.CharField(max_length=100, null=True, blank=True)

    def __unicode__(self):
        if self.fieldset:
            return u'%s: %s' % (self.name, self.fieldset)
        else:
            return self.name

    class Meta:
        ordering = ('order',)

    def to_dict(self):
        if not self.kind:
            try:
                self.kind = CustomValue.objects.filter(name=self.name)[0].kind
            except:
                pass
        return {
            'pk': self.pk,
            'name': self.name,
            'kind': self.kind,
            'order': self.order,
            'fieldset': self.fieldset,
        }
