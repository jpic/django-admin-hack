from django.core import urlresolvers
from django.contrib import admin
from django.db import models
from django.utils.translation import ugettext as _
from django.db.models import signals

from autoslug import AutoSlugField
from annoying.fields import AutoOneToOneField

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

    @property
    def value(self):
        for k, v in KIND_CHOICES:
            val = getattr(self, k + '_value', None)
            if val is not None:
                return val

    def __unicode__(self):
        return self.value

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
    
class Form(models.Model):
    contenttype = models.ForeignKey('contenttypes.contenttype', 
        verbose_name=_('form'), 
        help_text=_('you are about to configure a form preset for this type'))
    name = models.CharField(max_length=100, verbose_name=_('preset name'),
        help_text=_('the name of the preset you are about to configure'))

    def __unicode__(self):
        return self.name

    def model_admin(self, site=admin.site):
        model = self.contenttype.model_class()
        return site._registry[model]

    class Meta:
        unique_together = (
            ('name', 'contenttype'),
        )

    def get_absolute_url(self):
        return urlresolvers.reverse('admin:admin_hack_form_change', 
            args=(self.pk,))

    def to_dict(self):
        return {
            'name': self.name,
            'pk': self.pk,
            'contenttype': {
                'pk': self.contenttype.pk,
            },
            'field_set': [f.to_dict() for f in self.field_set.all()],
            'absolute_url': self.get_absolute_url(),
        }

class Field(models.Model):
    form = models.ForeignKey('Form')
    name = models.CharField(max_length=100)

    def to_dict(self):
        return {
            'pk': self.pk,
            'name': self.name,
        }
