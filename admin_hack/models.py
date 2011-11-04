from django.contrib import admin
from django.db import models
from django.utils.translation import ugettext as _
from django.db.models import signals
from annoying.fields import AutoOneToOneField

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

    def to_dict(self):
        return {
            'name': self.name,
            'pk': self.pk,
            'contenttype': {
                'pk': self.contenttype.pk,
            },
            'field_set': [f.to_dict() for f in self.field_set.all()]
        }

class Field(models.Model):
    form = models.ForeignKey('Form')
    name = models.CharField(max_length=100)

    def to_dict(self):
        return {
            'pk': self.pk,
            'name': self.name,
        }
