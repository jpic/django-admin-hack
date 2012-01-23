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
        self.field_delimiter = ';'

    def load(self, upload, max_rows=None):
        model_class = upload.template.contenttype.model_class()
        
        f = open(upload.upload.path, 'rb')
        reader = csv.reader(f, delimiter=str(self.field_delimiter))

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
                if isinstance(value, str):
                    value = unicode(value, 'utf-8').strip()
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

        if len(action) == 0 or action[0] == '#' or action[0] == '$' or not value:
            return

        def get_date_value(value):
            m = re.match(r'^(?P<day>[0-9]{1,2})/(?P<month>[0-9]{1,2})/(?P<year>[0-9]{4})$', value)
            if m:
                return '%s-%s-%s' % (
                    m.group('year'), m.group('month'), m.group('day'))

            m = re.match(r'^(?P<year>[0-9]{4})$', value)
            if m:
                return '%s-01-01' % value
            return value

        if 'int_value' in action:
            value = int(value.replace(',', '.'))
        elif 'float_value' in action:
            value = float(value.replace(',', '.'))
        elif 'date_value' in action:
            value = get_date_value(value)

        def get_or_create(model, kwargs):
            print kwargs

            try:
                return model.objects.get(**kwargs)
            except model.DoesNotExist:
                pass

            instance = model(**kwargs)
            instance.save()
            return instance

        def save_once(model):
            """
            The deal with this method is that we try to save the later
            possible, hoping that the required fields have value before m2m
            relation fields are processed.

            We use _saved because we cannot rely on the id which might be set.
            """
            if not getattr(model, '_saved', False):
                model.save()
                model._saved = True

        def reverse_fk_get_or_create(model, attribute, kwargs):
            save_once(model)
            try:
                return getattr(model, attribute).get(**kwargs)
            except getattr(model, attribute).model.DoesNotExist:
                pass
            
            instance = getattr(model, attribute).create(**kwargs)
            instance.save()
            return instance

        print action, value

        if '.' in action:
            parts = action.split('.')

            try:
                field = model._meta.get_field(parts[0])

            except models.FieldDoesNotExist:
                if parts[1] not in kind_choices:
                    raise Exception(
                        'Field %s does not exist, or second part not in kind_choices (%s)' % (
                        action, kind_choices))
                else:
                    customvalue = reverse_fk_get_or_create(model, 'customvalue_set', 
                        {'name': parts[0]})
                    setattr(customvalue, parts[1], value)
                    customvalue.save()

            else:
                if isinstance(field, models.DateField):
                    value = get_date_value(value)

                if field.rel:
                    relation = get_or_create(field.rel.to, {parts[1]: value})

                if isinstance(field, models.ForeignKey):
                    setattr(model, parts[0], relation)
                elif isinstance(field, models.ManyToManyField):
                    # instance needs to have a primary key value before a
                    # many-to-many relationship can be used
                    save_once(model)
                    getattr(model, parts[0]).add(relation)
                else:
                    raise NotImplementedError(
                        'Only FK and M2M are supported, or maybe the field %s is not a relation ?' % action)

        else:
            field = model._meta.get_field(action)
            if isinstance(field, models.DateField):
                value = get_date_value(value)
            elif isinstance(field, models.CharField):
                if field.max_length < len(value):
                    raise Exception('Column to small:' + field.name)

            setattr(model, action, value)

    def configuration_form(self, request):
        if '_field_delimiter' in request.POST.keys():
            self.field_delimiter = request.POST['_field_delimiter']
        else:
            self.field_delimiter = ';'

        delimiter = self.field_delimiter
        if self.field_delimiter == 'TAB':
            self.field_delimiter = "\t"

        reader = unicode_csv_reader(request.POST['upload_sample'].split("\n"),
            skipinitialspace=True, delimiter=str(self.field_delimiter))
        rows = [row for row in reader]

        if '_parser_action' in request.POST.keys():
            self.actions = request.POST.getlist('_parser_action')
        elif self.actions in (None, [u'']):
            self.actions = ['' for x in rows[0]]

        context = {
            'rows': rows,
            'actions': self.actions,
            'delimiter': delimiter,
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
