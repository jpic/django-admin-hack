from django.contrib import admin

from models import *
from forms import *

class CustomValueInline(admin.TabularInline):
    model = CustomValue
    template = 'admin_hack/customvalue_tabularinline.html'

admin.site.register(AdminHackUserProfile)
