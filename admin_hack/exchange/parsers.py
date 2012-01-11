import re
import csv

from django.db import models
from django import shortcuts
from django import http

from admin_hack.models import CustomValue, KIND_CHOICES
from models import *

class ImageArchiveProcessor(object):
    def load(self, upload):
        pass

class CsvParser(object):
    def __init__(self):
        self.actions = None
        self.field_delimiter = ','

    def load(self, upload, max_rows=None):
        model_class = upload.template.contenttype.model_class()
        
        f = open(upload.upload.path, 'rb')
        print 'delim', self.field_delimiter
        reader = csv.reader(f, delimiter=self.field_delimiter)

        row_count = 0
        for row in reader:
            i = 0
            model = None
            for action in self.actions:
                if action and action[0] == '$':
                    try:
                        model = model_class.objects.get(**{action[1:]: row[i]})
                        model._saved = True
                    except model_class.DoesNotExist:
                        model = model_class(**{action[1:]: row[i]})
                        model._saved = False
                    break
                i += 1
            
            i = 0
            for action in self.actions:
                value = row[i]
                self.execute(model, action, value)
                i += 1

            model.save()

            row_count += 1
            if row_count == max_rows:
                break

        f.close()

    def execute(self, model, action, value):
        kind_choices = [x + '_value' for x, y in KIND_CHOICES]
        action = action.strip()

        if len(action) == 0 or action[0] == '#' or not value:
            return

        m = re.match(r'^(?P<day>[0-9]{1,2})/(?P<month>[0-9]{1,2})/(?P<year>[0-9]{4})$', value)
        if m:
            value = '%s-%s-%s' % (
                m.group('year'), m.group('month'), m.group('day'))

        if 'int_value' in action:
            value = int(value.replace(',', '.'))
        elif 'float_value' in action:
            value = float(value.replace(',', '.'))

        print action, value

        if '.' in action:
            parts = action.split('.')
            try:
                field = model._meta.get_field(parts[0])
                try:
                    relation = field.rel.to.objects.get(**{parts[1]: value})
                except field.rel.to.DoesNotExist:
                    relation = field.rel.to(**{parts[1]: value})
                    relation.save()
                #relation, c = field.rel.to.objects.get_or_create(**{parts[1]:value})
                if isinstance(field, models.ForeignKey):
                    setattr(model, parts[0], relation)
                elif isinstance(field, models.ManyToManyField):
                    # instance needs to have a primary key value before a
                    # many-to-many relationship can be used
                    if not model._saved:
                        model.save()
                        model._saved = True
                    getattr(model, parts[0]).add(relation)
            except models.FieldDoesNotExist:
                if parts[1] not in kind_choices:
                    raise
                if not model._saved:
                    model.save()
                    model._saved = True
                try:
                    v = model.customvalue_set.get(name=parts[0])
                except CustomValue.DoesNotExist:
                    v = model.customvalue_set.create(name=parts[0])
                #v, c = model.customvalue_set.get_or_create(name=parts[0])
                setattr(v, parts[1], value)
                v.save()
        else:
            setattr(model, action, value)

    def configuration_form(self, request):
        reader = unicode_csv_reader(request.POST['upload_sample'].split("\n"),
            skipinitialspace=True)
        rows = [row for row in reader]

        if '_parser_action' in request.POST.keys():
            self.actions = request.POST.getlist('_parser_action')
        elif self.actions is None:
            self.actions = ['' for x in rows[0]]

        if '_field_delimiter' in request.POST.keys():
            self.field_delimiter = request.POST['_field_delimiter']
        else:
            self.field_delimiter = ';'

        context = {
            'rows': rows,
            'actions': self.actions,
        }

        return shortcuts.render(request, 
            'exchange/parsers/csv_parser/configuration_form.html',
            context)

# from http://docs.python.org/library/csv.html#csv-examples
def unicode_csv_reader(unicode_csv_data, dialect=csv.excel, **kwargs):
    # csv.py doesn't do Unicode; encode temporarily as UTF-8:
    csv_reader = csv.reader(utf_8_encoder(unicode_csv_data),
                            dialect=dialect, **kwargs)
    for row in csv_reader:
        # decode UTF-8 back to Unicode, cell by cell:
        yield [unicode(cell, 'utf-8') for cell in row]

def utf_8_encoder(unicode_csv_data):
    for line in unicode_csv_data:
        yield line.encode('utf-8')
