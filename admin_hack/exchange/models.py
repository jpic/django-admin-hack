from django.db import models
from django.core import urlresolvers
from django.utils.translation import ugettext_lazy as _

from picklefield.fields import PickledObjectField

from utils import *
from settings import *

class Upload(models.Model):
    name = models.CharField(max_length=100, unique=True)
    creation_datetime = models.DateTimeField(auto_now_add=True)
    modification_datetime = models.DateTimeField(auto_now=True)
    creation_user = models.ForeignKey('auth.user')
    upload = models.FileField(upload_to='csv')
    template = models.ForeignKey('Template', null=True, blank=True)

    class Meta:
        ordering = ('name',)

    def __unicode__(self):
        return self.name

    def load(self, max_rows=None):
        self.template.parser.load(self, max_rows)

class Process(models.Model):
    upload = models.ForeignKey('Upload')
    template = models.ForeignKey('Template')
    creation_datetime = models.DateTimeField(auto_now_add=True)
    end_datetime = models.DateTimeField(null=True, blank=True)
    rows = PickledObjectField(null=True, blank=True)
    interrupted = models.BooleanField(verbose_name=_(u'process was manually interrputed'))

    class Meta:
        ordering = ('-creation_datetime',)

    def get_absolute_url(self):
        return urlresolvers.reverse('yourlabs_exchange_process_detail',
            args=(self.pk,))

class Error(models.Model):
    import_process = models.ForeignKey('Process')
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    exception = PickledObjectField(null=True, blank=True)
    row = PickledObjectField(null=True, blank=True)
    row_number = models.IntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ('row_number',)

class Template(models.Model):
    name = models.CharField(max_length=100, unique=True)
    creation_datetime = models.DateTimeField(auto_now_add=True)
    modification_datetime = models.DateTimeField(auto_now=True)
    creation_user = models.ForeignKey('auth.user')
    
    contenttype = models.ForeignKey('contenttypes.contenttype', 
        verbose_name=_('database table'), 
        help_text=_('you are about to configure a form preset for this type'))
    upload_sample = models.TextField(null=True, blank=True,
        help_text=_('A sample upload for which this template should work'))
    parser_class = models.CharField(max_length=150, 
        choices=EXCHANGE_PARSER_CHOICES)
    parser = PickledObjectField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        if getattr(self, 'parser', None) is None:
            cls = get_class(self.parser_class)
            self.parser = cls()
        return super(Template, self).save(*args, **kwargs)

    class Meta:
        ordering = ('name',)

    def __unicode__(self):
        return self.name
